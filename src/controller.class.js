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
    _tcpPort = null;
    _startResolve = null;

    // when stopping, the port to which forward the received messages
    _forwardPort = null;

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
                self._startResolve = resolve;
            });
        };
        return _listenPromise();
    }

    /**
     * @returns {Promise} which resolves to a status Object
     * Note:
     *  Status is sent first to the parent when advertising it of the good startup,
     *  and then as the answer to each 'iz.status' received command.
     */
    getStatus(){
        const self = this;
        let status = {};
        const _firstPromise = function(){
            return new Promise(( resolve, reject ) => {
                status[self.service().name()] = {
                    // this process
                    mdule: 'core',
                    class: self.constructor.name,
                    pid: process.pid,
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
}
