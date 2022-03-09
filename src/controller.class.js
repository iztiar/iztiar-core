/*
 * coreController class
 */
import net from 'net';
import pidUsage from 'pidusage';

import { IRunFile, IServiceable, ILogger, IMsg, Interface, coreConfig, coreForkable } from './index.js';

// cb is to be called with the result
//  the connexion will be closed after execution of the callback - only one answer is allowed
//
//  returns the list of available commands
function _izHelp( self, words, cb ){
    cb( coreController.c );
}

// ping -> ack: the port is alive
function _izPing( self, words, cb ){
    cb({ 'iz.ping': 'iz.ack' });
}

// returns the full status of the server
function _izStatus( self, words, cb ){
    self.getStatus().then(( status ) => { cb( status ); });
}

// terminate the server and its relatives (broker, managed, plugins)
//  the cb is called with a '<name> <forkable> terminated with code <code>' message
function _izStop( self, words, cb ){
    self.startupTerminate( words, cb );
}

export class coreController extends coreForkable {

    /**
     * The commands which can be received by the coreController via the TCP communication port
     * - keys are the commands
     *   > label {string} a short help message
     *   > fn: {Function} the execution function (cf. above)
     */
     static c = {
        'iz.help': {
            label: 'returns the list of known commands',
            fn: _izHelp
        },
        'iz.ping': {
            label: 'ping the service',
            fn: _izPing
        },
        'iz.status': {
            label: 'returns the status of this coreController service',
            fn: _izStatus
        },
        'iz.stop': {
            label: 'stop this coreController service',
            fn: _izStop
        }
    };

    /**
     * Default ports number
     */
    static p = {
        listen: 24001,
        forward: 24002
    };

    // the communication TCP server
    _tcpServer = null;
    _tcpPort = 0;

    // when stopping, the port to which forward the received messages
    _forwardPort = 0;

    /**
     * @param {ICoreApi} api 
     * @param {coreService} service
     * @returns {coreController}
     */
    constructor( api, service ){
        super( api, service );
        IMsg.debug( 'coreController instanciation' );

        Interface.add( this, IRunFile );

        Interface.add( this, IServiceable, {
            expectedPids: this.iserviceableExpectedPids,
            expectedPorts: this.iserviceableExpectedPorts,
            onStartupConfirmed: this.iserviceableOnStartupConfirmed,
            start: this.iserviceableStart
        });

        // install signal handlers
        const self = this;
        process.on( 'SIGUSR1', () => {
            IMsg.debug( 'USR1 signal handler' );
        });

        process.on( 'SIGUSR2', () => {
            IMsg.debug( 'USR2 signal handler' );
        });

        process.on( 'SIGTERM', () => {
            IMsg.debug( 'receives SIGTERM signal' );
            self.terminate();
        });

        process.on( 'SIGHUP', () => {
            IMsg.debug( 'HUP signal handler' );
        });

        process.on( 'SIGQUIT', () => {
            IMsg.debug( 'QUIT signal handler' );
        });

        return this;
    }

    /*
     * @returns {Promise} which resolves to an array of the PIDs of running processes (if apply)
     * [-implementation Api-]
     */
    iserviceableExpectedPids(){
        return Promise.resolve( IRunFile.pids( this.api().config(), this.service().name()));
    }

    /*
     * @returns {Promise} which resolves to an array of the opened TCP ports (if apply)
     * [-implementation Api-]
     */
    iserviceableExpectedPorts(){
        return Promise.resolve( IRunFile.ports( this.api().config(), this.service().name()));
    }

    /*
     * Take advantage of this event to create the runfile
     * @param {Object} data the data transmitted via IPC on startup: here the full status
     * [-implementation Api-]
     */
    iserviceableOnStartupConfirmed( data ){
        const name = Object.keys( data )[0];
        IRunFile.set( this.api().config(), name, data );
    }

    /*
     * @returns {Promise}
     * [-implementation Api-]
     */
    iserviceableStart(){
        IMsg.debug( 'coreController.iserviceableStart()', coreForkable.forkedProcess());
        const self = this;
        self.runningStatus( coreForkable.s.STARTING );

        this._tcpServer = net.createServer(( c ) => {
            IMsg.debug( 'coreController::iserviceableStart() incoming connection' );
            //console.log( c );
            c.on( 'data', ( data ) => {
                //console.log( data );
                const _bufferStr = new Buffer.from( data ).toString().replace( '\r\n', '' );
                IMsg.info( 'server receives \''+_bufferStr+'\' request' );
                const _words = _bufferStr.split( ' ' );
                if( _words[0] === coreForkable.c.stop.command ){
                    if( this._forwardPort ){
                        utils.tcpRequest( this._forwardPort, _bufferStr )
                            .then(( res ) => {
                                c.write( JSON.stringify( res ));
                                IMsg.info( 'server answers to \''+_bufferStr+'\' with', res );
                                c.end();
                            })
                    } else {
                        IMsg.error( 'coreController.iserviceableStart().on(\''+coreForkable.c.stop.command+'\') unexpected forwardPort='+this._forwardPort );
                    }
                } else {
                    try {
                        const _ocmd = this.execute( _bufferStr, coreController.c, ( res ) => {
                            c.write( JSON.stringify( res )+'\r\n' );
                            IMsg.info( 'server answers to \''+_bufferStr+'\' with', res );
                            // doesn't end the client connection, letting the client close it itself
                            //c.end();
                        });
                    } catch( e ){
                        IMsg.error( 'coreController.iserviceableStart().execute()', e.name, e.message );
                        c.end();
                    }
                }
            })
            .on( 'error', ( e ) => {
                this.errorHandler( e );
            });
        });
        IMsg.debug( 'coreController::iserviceableStart() tcpServer created' );

        this._tcpPort = this.service().config().listenPort || coreController.p.listen;

        const _listenPromise = function(){
            return new Promise(( resolve, reject ) => {
                self._tcpServer.listen( self._tcpPort, '0.0.0.0', () => {
                    let _msg = 'Hello, I am '+self.service().name()+' '+self.constructor.name;
                    _msg += ', running with pid '+process.pid+ ', listening on port '+self._tcpPort;
                    self.getStatus()
                        .then(( status ) => {
                            self.advertiseParent( self._tcpPort, _msg, status );
                        });
                });
            });
        };
        return _listenPromise();
    }

    /**
     * @returns {Promise} which resolves to a status Object
     * Note:
     *  The object returned by this function (aka the 'status' object) is used not only as the answer
     *  to any 'iz.status' TCP request, but also:
     *  - at startup, when advertising the main process, to display the startup message on the console
     *  - after startup, to write into the IRunFile.
     *  A minimum of structure is so required:
     *  a)  this is a one-key-top-level object, where the key is the service name
     *  b)  minimal content is:
     *      - class: the class/type of the provided service
     *      - pids: an array of running pids
     *      - ports: an array of opened TCP ports
     *      - status: the running status of the service
     */
    getStatus(){
        const self = this;
        let status = {};
        const _firstPromise = function(){
            return new Promise(( resolve, reject ) => {
                status[self.service().name()] = {
                    // this process
                    module: 'core',
                    class: self.constructor.name,
                    pids: [ process.pid ],
                    ports: [ self._tcpPort ],
                    listenPort: self._tcpPort,
                    forwardPort: self._forwardPort,
                    status: self.runningStatus(),
                    // running environment
                    environment: {
                        IZTIAR_DEBUG: process.env.IZTIAR_DEBUG || '(undefined)',
                        IZTIAR_ENV: process.env.IZTIAR_ENV || '(undefined)',
                        NODE_ENV: process.env.NODE_ENV || '(undefined)'
                    },
                    // general runtime constants
                    logfile: ILogger.logFname(),
                    runfile: IRunFile.runFile( self.api().config(), self.service().name()),
                    storageDir: coreConfig.storageDir(),
                    version: self.api().package().getVersion()
                };
                if( self._forwardPort ){
                    status[self.service().name()].ports.push( self._forwardPort );
                }
                resolve( status );
            });
        };
        const _pidPromise = function( firstRes ){
            return new Promise(( resolve, reject ) => {
                pidUsage( process.pid )
                    .then(( pidRes ) => {
                        status[self.service().name()].pidUsage = {
                            cpu: pidRes.cpu,
                            memory: pidRes.memory,
                            ctime: pidRes.ctime,
                            elapsed: pidRes.elapsed
                        };
                        resolve( status );
                    });
            });
        };
        return Promise.resolve( true )
            .then(() => { return _firstPromise(); })
            .then(() => { return _pidPromise(); });
    }

    /**
     * terminate the server
     * Does its best to advertise the main process of what it will do
     * (but be conscious that it will also close the connection rather soon)
     * @param {string[]|null} words the parameters transmitted after the 'iz.stop' command
     * @param {Callback|null} cb a (e,res) form callback called when all is terminated
     */
    terminate( words, cb ){
        IMsg.debug( 'coreController.terminate() entering' );
        const self = this;
        const _name = this.service().name();
        this._forwardPort = words && words[0] && utils.isInt( words[0] ) ? words[0] : 0;

        // remove our key from JSON runfile as soon as we become Stopping..
        this.runningStatus( coreForkable.s.STOPPING );
        IRunFile.remove( this.api().config(), _name );

        // closing the TCP server
        //  in order the TCP server be closeable, the current connection has to be ended itself
        //  which is done by calling cb()

        let _promise = Promise.resolve( true );

        if( self._tcpServer ){
            const _closeServer = function(){
                return new Promise(( resolve, reject ) => {
                    if( cb && typeof cb === 'function' ){ 
                        cb({ name:_name, class:self.constructor.name, pid:process.pid, port:this._tcpPort });
                    }
                    self._tcpServer.close(() => {
                        IMsg.debug( 'coreController.terminate() this._tcpServer is closed' );
                        resolve( true );
                    });
                });
            };
            _promise = _promise
                .then(() => { return _closeServer(); })
                .then(() => {
                    IMsg.info( _name+' coreController terminating with code '+process.exitCode );
                    //process.exit();
                });
        } else {
            IMsg.warn( 'this._tcpServer is not set!' );
        }
    }
}
