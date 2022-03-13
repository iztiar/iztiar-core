/*
 * coreController class
 */
import pidUsage from 'pidusage';

import { Msg } from './index.js';

//  returns the list of available commands
function _izHelp( self, reply ){
    reply.answer = coreController.c;
    return Promise.resolve( reply );
}

// ping -> ack: the port is alive
function _izPing( self, reply ){
    reply.answer = 'iz.ack';
    return Promise.resolve( reply );
}

// returns the full status of the server
function _izStatus( self, reply ){
    return self.status()
        .then(( status ) => {
            reply.answer = status;
            return Promise.resolve( reply );
        });
}

// terminate the server and its relatives (broker, managed, plugins)
function _izStop( self, reply ){
    self.terminate( reply.args, ( res ) => {
        reply.answer = res;
        Msg.debug( 'coreController.izStop()', 'replying with', reply );
        return Promise.resolve( reply );
    });
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

    // configuration at construction time
    _tcpPort = 0;
    _messagingHost = null;
    _messagingPort = 0;

    // when stopping, the port to which answer and forward the received messages
    _forwardPort = 0;

    /**
     * @param {coreApi} api the core API as described in core-api.schema.json
     * @returns {coreController}
     */
    constructor( api ){
        api.exports().Interface.extends( this, api.exports().baseService, api );
        Msg.debug( 'coreController instanciation' );

        //console.log( this );
        //console.log( Object.getPrototypeOf( this ));
        //console.log( this.api());

        api.exports().Interface.add( this, api.exports().IForkable, {
            _terminate: this.iforkableTerminate
        });

        api.exports().Interface.add( this, api.exports().IRunFile, {
            runDir: this.irunfileRunDir
        });

        api.exports().Interface.add( this, api.exports().IServiceable, {
            class: this.iserviceableClass,
            cleanupAfterKill: this.iserviceableCleanupAfterKill,
            getCheckStatus: this.iserviceableGetCheckStatus,
            helloMessage: this.iserviceableHelloMessage,
            start: this.iserviceableStart,
            status: this.iserviceableStatus,
            stop: this.iserviceableStop
        });

        api.exports().Interface.add( this, api.exports().ITcpServer, {
            _execute: this.itcpserverExecute,
            _listening: this.itcpserverListening
        });

        // unable to handle SIGKILL signal: Error: uv_signal_start EINVAL
        //process.on( 'SIGKILL', () => {
        //    Msg.debug( 'server receives KILL signal' );
        //    self.IRunFile.remove( self.name());
        //});

        // must be determined at construction time to be available when initializing IServiceable instance
        this._tcpPort = api.service().config().listenPort || coreController.d.listenPort;
        this._messagingHost = api.service().config().messagingHost || coreController.d.messagingHost;
        this._messagingPort = api.service().config().messagingPort || coreController.d.messagingPort;

        return this;
    }

    /*
     * Terminates the child process
     * @returns {Promise} which resolves when the process is actually about to terminate (only waiting for this Promise)
     * [-implementation Api-]
     */
    iforkableTerminate(){
        Msg.debug( 'coreController.iforkableTerminate()' );
        return this.terminate();
    }

    /*
     * @returns {String} the full pathname of the run directory
     * [-implementation Api-]
     */
    irunfileRunDir(){
        Msg.debug( 'coreController.irunfileRunDir()' );
        return this.api().coreConfig().runDir();
    }

    /*
     * @returns {String} the type of the service, not an identifier, rather a qualifier
     *  For example, the implementation class name is a good choice
     * [-implementation Api-]
     */
    iserviceableClass(){
        Msg.debug( 'coreController.iserviceableClass()' );
        return this.constructor.name;
    }

    /*
     * If the service had to be SIGKILL'ed to be stoppped, then gives it an opportunity to make some cleanup
     * [-implementation Api-]
     */
    iserviceableCleanupAfterKill(){
        Msg.debug( 'coreController.iserviceableCleanupAfterKill()' );
        this.IRunFile.remove( this.api().service().name());
    }

    /*
     * @returns {Promise} which must resolve to an object conform to check-status.schema.json
     * [-implementation Api-]
     */
    iserviceableGetCheckStatus(){
        Msg.debug( 'coreController.iserviceableGetCheckStatus()' );
        const _name = this.api().service().name();
        const _json = this.IRunFile.jsonByName( _name );
        let o = { startable: false, reasons: [], pids: [], ports: [] };
        if( _json && _json[_name] ){
            o.pids = [ ..._json[_name].pids ];
            o.ports = [ _json[_name].listenPort ];
            o.startable = o.pids.length === 0 && o.ports.length === 0;
        } else {
            o.startable = true;
        }
        Msg.debug( 'coreController.iserviceableGetCheckStatus() resolves with', o );
        return Promise.resolve( o );
    }

    /*
     * @returns {String} the helloMessage from the runfile (if any)
     * [-implementation Api-]
     */
    iserviceableHelloMessage(){
        const _name = this.api().service().name();
        const _json = this.IRunFile.jsonByName( _name );
        if( _json && _json[_name].helloMessage ){
            return _json[_name].helloMessage;
        }
        return null;
    }

    /*
     * Start the service
     * @returns {Promise} which never resolves
     * [-implementation Api-]
     */
    iserviceableStart(){
        Msg.debug( 'coreController.iserviceableStart()', 'forkedProcess='+this.api().exports().IForkable.forkedProcess());
        return this.ITcpServer.create( this._tcpPort )
            .then(() => {
                Msg.debug( 'coreController.iserviceableStart() tcpServer created' );
                return new Promise(() => {});
            });
    }

    /*
     * Get the status of the service
     * @returns {Promise} which resolves the a status object
     * [-implementation Api-]
     */
    iserviceableStatus(){
        Msg.debug( 'coreController.iserviceableStatus()' );
        this.api().exports().utils.tcpRequest( this._tcpPort, 'iz.status' )
            .then(( answer ) => {
                Msg.debug( 'coreController.iserviceableStatus()', 'receives answer to \'iz.status\'', answer );
            }, ( failure ) => {
                // an error message is already sent by the called self.api().exports().utils.tcpRequest()
                //  what more to do ??
                //Msg.error( 'TCP error on iz.stop command:', failure );
            });
    }

    /*
     * @returns {Promise}
     * [-implementation Api-]
     */
    iserviceableStop(){
        Msg.debug( 'coreController.iserviceableStop()' );
        this.api().exports().utils.tcpRequest( this._tcpPort, 'iz.stop' )
            .then(( answer ) => {
                Msg.debug( 'coreController.iserviceableStop()', 'receives answer to \'iz.stop\'', answer );
            }, ( failure ) => {
                // an error message is already sent by the called self.api().exports().utils.tcpRequest()
                //  what more to do ??
                //Msg.error( 'TCP error on iz.stop command:', failure );
            });
    }

    /*
     * Execute a received commands and replies with an answer
     * @param {String[]} words the received command and its arguments
     * @param {Object} client the client connection
     * @returns {Boolean} true if we knew the command and (at least tried) execute it
     * [-implementation Api-]
     */
    itcpserverExecute( words, client ){
        const self = this;
        let reply = this.ITcpServer.findExecuter( words, coreController.c );
        //console.log( reply );
        if( reply ){
            reply.obj.fn( this, reply.answer )
                .then(( result ) => {
                    self.ITcpServer.answer( client, result, reply.obj.endConnection );
                });
        }
        return reply;
    }

    /*
     * What to do when this ITcpServer is ready listening ?
     *  -> write the runfile before advertising parent to prevent a race condition when writing the file
     *  -> send the current service status
     * [-implementation Api-]
     */
    itcpserverListening(){
        Msg.debug( 'coreController.itcpserverListening()' );
        const self = this;
        const _name = this.api().service().name();
        let _msg = 'Hello, I am \''+_name+'\' '+this.constructor.name;
        _msg += ', running with pid '+process.pid+ ', listening on port '+this._tcpPort;
        this.status().then(( status ) => {
            status[_name].event = 'startup';
            status[_name].helloMessage = _msg;
            status[_name].status = this.ITcpServer.status().status;
            self.IRunFile.set( _name, status );
            self.IForkable.advertiseParent( status );
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
    status(){
        const _serviceName = this.api().service().name();
        Msg.debug( 'coreController.status()', 'serviceName='+_serviceName );
        const self = this;
        let status = {};
        status[_serviceName] = {};
        // ITcpServer
        const _tcpServerPromise = function(){
            return new Promise(( resolve, reject ) => {
                const o = self.ITcpServer.status();
                Msg.debug( 'coreController.status()', 'ITcpServer', o );
                status[_serviceName].ITcpServer = { ...o };
                resolve( status );
            });
        };
        // run-status.schema.json
        const _runStatus = function(){
            return new Promise(( resolve, reject ) => {
                const o = {
                    module: self.api().service().module(),
                    class: self.IServiceable.class(),
                    pids: [ process.pid ],
                    ports: [ self._tcpPort, self._messagingPort ],
                    status: status[_serviceName].ITcpServer.status
                };
                Msg.debug( 'coreController.status()', 'runStatus', o );
                status[_serviceName] = { ...status[_serviceName], ...o };
                resolve( status );
            });
        };
        // coreController
        const _thisStatus = function(){
            return new Promise(( resolve, reject ) => {
                const o = {
                    listenPort: self._tcpPort,
                    messagingHost: self._messagingHost | '',
                    messagingPort: self._messagingPort,
                    // running environment
                    environment: {
                        IZTIAR_DEBUG: process.env.IZTIAR_DEBUG || '(undefined)',
                        IZTIAR_ENV: process.env.IZTIAR_ENV || '(undefined)',
                        NODE_ENV: process.env.NODE_ENV || '(undefined)',
                        forkedProcess: self.api().exports().IForkable.forkedProcess()
                    },
                    // general runtime constants
                    logfile: self.api().exports().Logger.logFname(),
                    runfile: self.IRunFile.runFile( _serviceName ),
                    storageDir: self.api().exports().coreConfig.storageDir(),
                    version: self.api().corePackage().getVersion()
                };
                Msg.debug( 'coreController.status()', 'controllerStatus', o );
                status[_serviceName] = { ...status[_serviceName], ...o };
                resolve( status );
            });
        };
        // pidUsage
        const _pidPromise = function(){
            return pidUsage( process.pid )
                .then(( pidRes ) => {
                    const o = {
                        cpu: pidRes.cpu,
                        memory: pidRes.memory,
                        ctime: pidRes.ctime,
                        elapsed: pidRes.elapsed
                    };
                    Msg.debug( 'coreController.status()', 'pidUsage', o );
                    status[_serviceName].pidUsage = { ...o };
                    return Promise.resolve( status );
                });
        };
        return Promise.resolve( true )
            .then(() => { return _tcpServerPromise(); })
            .then(() => { return _runStatus(); })
            .then(() => { return _thisStatus(); })
            .then(() => { return _pidPromise(); });
    }

    /**
     * terminate the server
     * Does its best to advertise the main process of what it will do
     * (but be conscious that it will also close the connection rather soon)
     * @param {string[]|null} args the parameters transmitted after the 'iz.stop' command
     * @param {Callback} cb the function to be called back to acknowledge the request
     * @returns {Promise} which resolves when the server is terminated
     * Note:
     *  Receiving 'iz.stop' command calls this terminate() function, which has the side effect of.. terminating!
     *  Which sends a SIGTERM signal to this process, and so triggers the signal handler, which itself re-calls
     *  this terminate() function. So, try to prevent a double execution.
     */
    terminate( args=[], cb=null ){
        Msg.debug( 'coreController.terminate()' );
        const _status = this.ITcpServer.status();
        if( _status.status === this.api().exports().ITcpServer.s.STOPPING ){
            Msg.debug( 'coreController.terminate() returning as currently stopping' );
            return Promise.resolve( true );
        }
        if( _status.status === this.api().exports().ITcpServer.s.STOPPED ){
            Msg.debug( 'coreController.terminate() returning as already stopped' );
            return Promise.resolve( true );
        }

        const _name = this.api().service().name();
        const _module = this.api().service().module();
        const _class = this.IServiceable.class();
        this._forwardPort = args && args[0] && self.api().exports().utils.isInt( args[0] ) ? args[0] : 0;

        const self = this;

        //Msg.debug( self.ITcpServer );
        //Msg.debug( 'self.ITcpServer.terminate', typeof self.ITcpServer.terminate );

        // closing the TCP server
        //  in order the TCP server be closeable, the current connection has to be ended itself
        //  which is done by the promise
        let _promise = Promise.resolve( true )
            .then(() => {
                if( cb && typeof cb === 'function' ){
                    cb({ name:_name, module:_module, class:_class, pid:process.pid, port:self._tcpPort });
                }
                return self.ITcpServer.terminate();
            })
            .then(() => {
                // we auto-remove from runfile as late as possible
                //  (rationale: no more runfile implies that the service is no more testable and expected to be startable)
                self.IRunFile.remove( _name );
                Msg.info( _name+' coreController terminating with code '+process.exitCode );
                return Promise.resolve( true)
                //process.exit();
            });

        return _promise;
    }
}
