/*
 * coreController class
 */
import net from 'net';
import pidUsage from 'pidusage';

import { IMsg } from './index.js';

// cb is to be called with the result
//  the connexion will be closed after execution of the callback - only one answer is allowed
//
//  returns the list of available commands
function _izHelp( self, cmd, words, cb ){
    cb({
        command: cmd,
        arguments: words,
        timestamp: self.api().exports().utils.now(),
        answer: coreController.c
    });
}

// ping -> ack: the port is alive
function _izPing( self, cmd, words, cb ){
    cb({
        command: cmd,
        arguments: words,
        timestamp: self.api().exports().utils.now(),
        answer: 'iz.ack'
    });
}

// returns the full status of the server
function _izStatus( self, cmd, words, cb ){
    self.getStatus().then(( status ) => { cb({
        command: cmd,
        arguments: words,
        timestamp: self.api().exports().utils.now(),
        answer: status
        });
    });
}

// terminate the server and its relatives (broker, managed, plugins)
//  the cb is called with a '<name> <forkable> terminated with code <code>' message
function _izStop( self, cmd, words, cb ){
    self.terminate( words, cb );
}

export class coreController {

    /**
     * The commands which can be received by the coreController via the TCP communication port
     * - keys are the commands
     *   > label {string} a short help message
     *   > fn {Function} the execution function (cf. above)
     *   > endConnection {Boolean} whether the server should close the client connection
     *      alternative being to wait for the client closes itself its own connection
     */
     static c = {
        'iz.help': {
            label: 'returns the list of known commands',
            fn: _izHelp,
            endConnection: false
        },
        'iz.ping': {
            label: 'ping the service',
            fn: _izPing,
            endConnection: false
        },
        'iz.status': {
            label: 'returns the status of this coreController service',
            fn: _izStatus,
            endConnection: false
        },
        'iz.stop': {
            label: 'stop this coreController service',
            fn: _izStop,
            endConnection: true
        }
    };

    /**
     * Defaults
     */
    static d = {
        listenPort: 24001,
        messagingHost: 'localhost',
        messagingPort: 24003
    };

    // the communication TCP server
    _tcpServer = null;
    _tcpPort = 0;

    // the messaging bus
    _messagingHost = null;
    _messagingPort = 0;

    // when stopping, the port to which answer and forward the received messages
    _forwardPort = 0;

    /**
     * @param {coreApi} api the core API as described in core-api.schema.json
     * @param {coreService} service
     * @returns {coreController}
     */
    constructor( api ){
        api.exports().Interface.extends( this, api.exports().coreForkable, api );
        IMsg.debug( 'coreController instanciation' );

        //console.log( this );
        //console.log( Object.getPrototypeOf( this ));
        //console.log( this.api());

        api.exports().Interface.add( this, api.exports().IRunFile, {
            runDir: this.irunfileRunDir
        });

        api.exports().Interface.add( this, api.exports().IServiceable, {
            cleanupAfterKill: this.iserviceableCleanupAfterKill,
            getCheckStatus: this.iserviceableGetCheckStatus,
            onStartupConfirmed: this.iserviceableOnStartupConfirmed,
            start: this.iserviceableStart,
            stop: this.iserviceableStop
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
            IMsg.debug( 'server receives SIGTERM signal' );
            self.terminate();
        });

        process.on( 'SIGHUP', () => {
            IMsg.debug( 'HUP signal handler' );
        });

        process.on( 'SIGQUIT', () => {
            IMsg.debug( 'QUIT signal handler' );
        });

        // unable to handle SIGKILL signal: Error: uv_signal_start EINVAL
        //process.on( 'SIGKILL', () => {
        //    IMsg.debug( 'server receives KILL signal' );
        //    self.IRunFile.remove( self.name());
        //});

        // must be determined at construction time to be available when initializing IServiceable instance
        this._tcpPort = this.service().config().listenPort || coreController.d.listenPort;
        this._messagingHost = this.service().config().messagingHost || coreController.d.messagingHost;
        this._messagingPort = this.service().config().messagingPort || coreController.d.messagingPort;

        return this;
    }

    /*
     * @returns {String} the full pathname of the run directory
     * [-implementation Api-]
     */
    irunfileRunDir(){
        IMsg.debug( 'coreController.irunfileRunDir()' );
        return this.coreConfig().runDir();
    }

    /*
     * If the service had to be SIGKILL'ed to be stoppped, then gives it an opportunity to make some cleanup
     * [-implementation Api-]
     */
    iserviceableCleanupAfterKill(){
        IMsg.debug( 'coreController.iserviceableCleanupAfterKill()' );
        this.IRunFile.remove( this.service().name());
    }

    /*
     * @returns {Promise} which must resolve to an object conform to check-status.schema.json
     * [-implementation Api-]
     */
    iserviceableGetCheckStatus(){
        IMsg.debug( 'coreController.iserviceableGetCheckStatus()' );
        const _name = this.service().name();
        const _json = this.IRunFile.jsonByName( _name );
        let o = { startable: false, reasons: [], pids: [], ports: [] };
        if( _json && _json[_name] ){
            o.pids = [ ... _json[_name].pids ];
            o.ports = [ ... _json[_name].ports ];
            o.startable = o.pids.length === 0 && o.ports.length === 0;
        } else {
            o.startable = true;
        }
        IMsg.debug( 'coreController.iserviceableGetCheckStatus() resolves with', o );
        return Promise.resolve( o );
    }

    /*
     * Take advantage of this event to create the runfile
     * @param {Object} data the data transmitted via IPC on startup: here the full status
     * [-implementation Api-]
     */
    iserviceableOnStartupConfirmed( data ){
        IMsg.debug( 'coreController.iserviceableOnStartupConfirmed()' );
        const name = Object.keys( data )[0];
        this.IRunFile.set( name, data );
    }

    /*
     * @returns {Promise}
     * [-implementation Api-]
     */
    iserviceableStart(){
        IMsg.verbose( 'coreController.iserviceableStart()', 'forkedProcess='+this.api().exports().coreForkable.forkedProcess());
        const self = this;
        self.runningStatus( this.api().exports().coreForkable.s.STARTING );

        this._tcpServer = net.createServer(( c ) => {
            IMsg.debug( 'coreController::iserviceableStart() incoming connection' );

            // refuse all connections if the server is not 'running'
            if( this.runningStatus() !== this.api().exports().coreForkable.s.RUNNING ){
                const _answer = 'temporarily refusing connections';
                const _res = { answer:_answer, reason:this.runningStatus(), timestamp:self.api().exports().utils.now()};
                c.write( JSON.stringify( _res )+'\r\n' );
                IMsg.info( 'server answers to new incoming connection with', _res );
                c.end();
            }
            //console.log( c );
            c.on( 'data', ( data ) => {
                //console.log( data );
                const _bufferStr = new Buffer.from( data ).toString().replace( '\r\n', '' );
                IMsg.info( 'server receives \''+_bufferStr+'\' request' );
                const _words = _bufferStr.split( ' ' );
                if( _words[0] === this.api().exports().coreForkable.c.stop.command ){
                    if( this._forwardPort ){
                        self.api().exports().utils.tcpRequest( this._forwardPort, _bufferStr )
                            .then(( res ) => {
                                c.write( JSON.stringify( res ));
                                IMsg.info( 'server answers to \''+_bufferStr+'\' with', res );
                                c.end();
                            })
                    } else {
                        IMsg.debug = 'coreController.iserviceableStart().on(\''+this.api().exports().coreForkable.c.stop.command+'\') forwardPort is unset';
                    }
                } else {
                    try {
                        const _executer = this.findExecuter( _bufferStr, coreController.c );
                        _executer.object.fn( this, _executer.command, _executer.args, ( res ) => {
                            c.write( JSON.stringify( res )+'\r\n' );
                            IMsg.info( 'server answers to \''+_bufferStr+'\' with', res );
                            if( _executer.object.endConnection ){
                                c.end();
                            }
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

        self._tcpServer.listen( self._tcpPort, '0.0.0.0', () => {
            let _msg = 'Hello, I am '+self.service().name()+' '+self.constructor.name;
            _msg += ', running with pid '+process.pid+ ', listening on port '+self._tcpPort;
            self.getStatus()
                .then(( status ) => {
                    self.advertiseParent( self._tcpPort, _msg, status );
                });
        });

        return new Promise(() => {});   // never resolves
    }

    /*
     * @returns {Promise}
     * [-implementation Api-]
     */
    iserviceableStop(){
        IMsg.debug( 'coreController.iserviceableStop()' );
        this.api().exports().utils.tcpRequest( this._tcpPort, 'iz.stop' )
            .then(( answer ) => {
                IMsg.debug( 'coreController.iserviceableStop()', 'receives answer to \'iz.stop\''+answer );
            }, ( failure ) => {
                // an error message is already sent by the called self.api().exports().utils.tcpRequest()
                //  what more to do ??
                //IMsg.error( 'TCP error on iz.stop command:', failure );
            });
    }

    /**
     * @returns {Promise} which resolves to a status Object
     * Note:
     *  The object returned by this function (aka the 'status' object) is used not only as the answer
     *  to any 'iz.status' TCP request, but also:
     *  - at startup, when advertising the main process, to display the startup message on the console
     *  - after startup, to write into the IRunFile.
     *  A minimum of structure is so required, described in run-status.schema.json.
     */
    getStatus(){
        IMsg.debug( 'coreController.getStatus()' );
        const self = this;
        const _serviceName = this.service().name();
        let status = {};
        status[_serviceName] = {};
        const _runStatus = function(){
            return new Promise(( resolve, reject ) => {
                const o = {
                    module: 'core',
                    class: self.constructor.name,
                    pids: [ process.pid ],
                    ports: [ self._tcpPort ],
                    status: self.runningStatus()
                };
                status[_serviceName] = { ...status[_serviceName], ...o };
                resolve( status );
            });
        };
        const _thisStatus = function(){
            return new Promise(( resolve, reject ) => {
                const o = {
                    listenPort: self._tcpPort,
                    // running environment
                    environment: {
                        IZTIAR_DEBUG: process.env.IZTIAR_DEBUG || '(undefined)',
                        IZTIAR_ENV: process.env.IZTIAR_ENV || '(undefined)',
                        NODE_ENV: process.env.NODE_ENV || '(undefined)'
                    },
                    // general runtime constants
                    logfile: self.api().IMsg().logFname(),
                    runfile: self.IRunFile.runFile( _serviceName ),
                    storageDir: self.api().exports().coreConfig.storageDir(),
                    version: self.api().corePackage().getVersion()
                };
                status[_serviceName] = { ...status[_serviceName], ...o };
                resolve( status );
            });
        };
        const _pidPromise = function( firstRes ){
            return new Promise(( resolve, reject ) => {
                pidUsage( process.pid )
                    .then(( pidRes ) => {
                        const o = {
                            cpu: pidRes.cpu,
                            memory: pidRes.memory,
                            ctime: pidRes.ctime,
                            elapsed: pidRes.elapsed
                        };
                        status[_serviceName] = { ...status[_serviceName], ...o };
                        resolve( status );
                    });
            });
        };
        return Promise.resolve( true )
            .then(() => { return _runStatus(); })
            .then(() => { return _thisStatus(); })
            .then(() => { return _pidPromise(); });
    }

    /**
     * terminate the server
     * Does its best to advertise the main process of what it will do
     * (but be conscious that it will also close the connection rather soon)
     * @param {string[]|null} words the parameters transmitted after the 'iz.stop' command
     * @param {Callback|null} cb a (e,res) form callback called when all is terminated
     * Note:
     *  Receiving 'iz.stop' command calls this terminate() function, which has the side effect of.. terminating!
     *  Which sends a SIGTERM signal to this process, and so triggers the signal handler, which itself re-calls
     *  this terminate() function. So, try to prevent a double execution.
     */
    terminate( words=[], cb=null ){
        IMsg.debug( 'coreController.terminate()' );
        if( this.runningStatus() === this.api().exports().coreForkable.s.STOPPING ){
            IMsg.debug( 'coreController.terminate() returning as already stopping' );
            return;
        }
        const self = this;
        const _name = this.service().name();
        this._forwardPort = words && words[0] && self.api().exports().utils.isInt( words[0] ) ? words[0] : 0;

        // we advertise we are stopping as soon as possible
        this.runningStatus( this.api().exports().coreForkable.s.STOPPING );

        // closing the TCP server
        //  in order the TCP server be closeable, the current connection has to be ended itself
        //  which is done by calling cb()

        let _promise = Promise.resolve( true );

        if( self._tcpServer ){
            const _sendCallback = function(){
                IMsg.debug( 'coreController.terminate() callback-answers to the request' );
                return new Promise(( resolve, reject ) => {
                    if( cb && typeof cb === 'function' ){ 
                        cb({
                            command: 'iz.stop',
                            arguments: words,
                            timestamp: self.api().exports().utils.now(),
                            answer: { name:_name, class:self.constructor.name, pid:process.pid, port:self._tcpPort }
                        });
                        resolve( true );
                    } else {
                        resolve( false );
                    }
                });
            };
            const _closeServer = function(){
                IMsg.debug( 'coreController.terminate() close tcpServer' );
                return new Promise(( resolve, reject ) => {
                    self._tcpServer.close(() => {
                        IMsg.debug( 'coreController.terminate() this._tcpServer is closed' );
                        resolve( true );
                    });
                });
            };
            _promise = _promise
                .then(() => { return _sendCallback(); })
                .then(() => { return _closeServer(); })
                .then(() => {
                    // we auto-remove from runfile as late as possible
                    //  (rationale: no more runfile implies that the service is no more testable and expected to be startable)
                    this.IRunFile.remove( _name );
                    IMsg.info( _name+' coreController terminating with code '+process.exitCode );
                    return Promise.resolve( true );
                    //process.exit();
                });
        } else {
            IMsg.warn( 'this.tcpServer is not set!' );
        }

        return _promise;
    }
}
