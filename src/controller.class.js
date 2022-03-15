/*
 * coreController class
 */
import pidUsage from 'pidusage';

import { Msg } from './index.js';

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
            fn: coreController._izHelp,
            endConnection: false
        },
        'iz.ping': {
            label: 'ping the service',
            fn: coreController._izPing,
            endConnection: false
        },
        'iz.status': {
            label: 'returns the status of this coreController service',
            fn: coreController._izStatus,
            endConnection: false
        },
        'iz.stop': {
            label: 'stop this coreController service',
            fn: coreController._izStop,
            endConnection: true
        }
    };

    /**
     * Defaults
     */
    static d = {
        listenPort: 24001,
        alivePeriod: 60*1000
    };

    //  returns the list of available commands
    static _izHelp( self, reply ){
        reply.answer = coreController.c;
        return Promise.resolve( reply );
    }

    // ping -> ack: the port is alive
    static _izPing( self, reply ){
        reply.answer = 'iz.ack';
        return Promise.resolve( reply );
    }

    // returns the full status of the server
    static _izStatus( self, reply ){
        return self.status()
            .then(( status ) => {
                reply.answer = status;
                return Promise.resolve( reply );
            });
    }

    // terminate the server and its relatives (broker, managed, plugins)
    static _izStop( self, reply ){
        self.terminate( reply.args, ( res ) => {
            reply.answer = res;
            Msg.debug( 'coreController.izStop()', 'replying with', reply );
            return Promise.resolve( reply );
        });
    }

    /**
     * The provided capabilities
     */
    static caps = {
        'checkStatus': function( o ){
            return o._checkStatus();
        },
        'helloMessage': function( o, cap ){
            return o.IRunFile.get( o.feature().name(), cap );
        }
    };

    // when stopping, the port to which answer and forward the received messages
    _forwardPort = 0;

    /**
     * @param {engineApi} api the engine API as described in engine-api.schema.json
     * @param {featureCard} card a description of this feature
     * @returns {Promise} which resolves to a new coreController
     */
    constructor( api, card ){
        const exports = api.exports();
        const Interface = exports.Interface;

        Interface.extends( this, exports.baseService, api, card );
        Msg.debug( 'coreController instanciation' );

        Interface.add( this, exports.IForkable, {
            _terminate: this.iforkableTerminate
        });

        Interface.add( this, exports.IMqttClient, {
            _capabilities: this._capabilities,
            _class: this._class,
            _module: this.feature().module,
            _name: this._name
        });

        Interface.add( this, exports.IRunFile, {
            runDir: this.irunfileRunDir
        });

        Interface.add( this, exports.IServiceable, {
            capabilities: this._capabilities,
            class: this.iserviceableClass,
            config: this.iserviceableConfig,
            get: this.iserviceableGet,
            killed: this.iserviceableKilled,
            start: this.iserviceableStart,
            status: this.iserviceableStatus,
            stop: this.iserviceableStop
        });

        Interface.add( this, exports.ITcpServer, {
            _execute: this.itcpserverExecute,
            _listening: this.itcpserverListening,
            _statsUpdated: this.itcpserverStatsUpdated
        });

        // unable to handle SIGKILL signal: Error: uv_signal_start EINVAL
        //process.on( 'SIGKILL', () => {
        //    Msg.debug( 'server receives KILL signal' );
        //    self.IRunFile.remove( self.name());
        //});

        let _promise = Promise.resolve( true )
            .then(() => { return this._filledConfig(); })
            .then(( o ) => { this.config( o ); })
            .then(() => { return Promise.resolve( this ); });
    
        return _promise;
    }

    /*
     * @returns {String[]} the array of service capabilities
     * [-implementation Api-]
     */
    _capabilities(){
        return Object.keys( coreController.caps );
    }

    /*
     * @returns {Promise} which must resolve to an object conform to check-status.schema.json
     * [-implementation Api-]
     */
    _checkStatus(){
        Msg.debug( 'coreController._checkStatus()' );
        const _name = this.feature().name();
        const _json = this.IRunFile.jsonByName( _name );
        let o = { startable: false, reasons: [], pids: [], ports: [] };
        if( _json && _json[_name] ){
            o.pids = [ ..._json[_name].pids ];
            o.ports = [ _json[_name].listenPort ];
            o.startable = o.pids.length === 0 && o.ports.length === 0;
        } else {
            o.startable = true;
        }
        return Promise.resolve( o );
    }

    _class(){
        return this.constructor.name;
    }

    /*
     * @returns {Promise} which resolves to the filled (runtime) configuration for this service
     */
    _filledConfig(){
        Msg.debug( 'coreController.filledConfig()' );
        let _config = this.feature().config();
        let _filled = { ..._config };
        _filled.featuredConfig = {};
        if( !_filled.module ){
            throw new Error( 'coreController.filledConfig() module not found in plugin configuration' );
        }
        if( !_filled.class ){
            throw new Error( 'coreController.filledConfig() class not found in plugin configuration' );
        }
        if( !_filled.listenPort ){
            _filled.listenPort = coreController.d.listenPort;
        }
        let _feat = null;
        // if there is no messaging group, then the controller will not connect to the MQTT bus (which would be bad)
        //  the feature should be preferred - not mandatory and no default
        //  host and port are possible too - not mandatory either and no defaults
        //  if only a port is specified, then we default to localhost
        if( Object.keys( _filled ).includes( 'messaging' )){
            if( !_filled.messaging.alivePeriod ){
                _filled.messaging.alivePeriod = coreController.d.alivePeriod;
            }
            if( Object.keys( _filled.messaging ).includes( 'feature' )){
                _feat = this.api().pluginManager().byNameExt( this.api().config(), this.api().packet(), _filled.messaging.feature );
                if( !_feat ){
                    Msg.error( 'coreController.filledConfig() feature not found:', _filled.messaging.feature );
                }

            } else if( Object.keys( _filled.messaging ).includes( 'port' )){
                if( !_filled.messaging.host ){
                    _filled.messaging.host = 'localhost';
                }
            }
        }
        let _promise = Promise.resolve( true );
        if( _feat ){
            _promise = _promise
                .then(() => { return _feat.initialize( this.api()); })
                .then(( iServiceable ) => {
                    if( iServiceable && iServiceable instanceof this.api().exports().IServiceable ){
                        return iServiceable.config();
                    }
                })
                .then(( conf ) => {
                    if( conf && conf.messaging ){
                        _filled.featuredConfig[_filled.messaging.feature] = conf.messaging;
                        _filled.messaging.host = conf.messaging.host || 'localhost'; 
                        _filled.messaging.port = conf.messaging.port;
                    }
                })
        }
        _promise = _promise
            .then(() => { return Promise.resolve( _filled ); });

        return _promise;
    }

    // for whatever reason, this doesn't work the same than module() function fromIMqttClient point of view
    _name(){
        return this.feature().name();
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
        return this.api().config().runDir();
    }

    /*
     * @returns {String} the type of the feature, not an identifier, rather a qualifier
     *  For example, the implementation class name is a good choice
     * [-implementation Api-]
     */
    iserviceableClass(){
        Msg.debug( 'coreController.iserviceableClass()' );
        return this._class();
    }

    /*
     * @returns {Object} the filled configuration for the feature
     * [-implementation Api-]
     */
    iserviceableConfig(){
        Msg.debug( 'coreController.iserviceableConfig()' );
        return this.config();
    }

    /*
     * @param {String} cap the desired capability name
     * @returns {Object} the capability characterics 
     * [-implementation Api-]
     */
    iserviceableGet( cap ){
        Msg.debug( 'coreController.iserviceableGet() cap='+cap );
        if( Object.keys( coreController.caps ).includes( cap )){
            return coreController.caps[cap]( this, cap );
        } else {
            Msg.error( 'coreController unknown capability \''+cap+'\'' );
            return null;
        }
    }

    /*
     * If the service had to be SIGKILL'ed to be stoppped, then gives it an opportunity to make some cleanup
     * [-implementation Api-]
     */
    iserviceableKilled(){
        Msg.debug( 'coreController.iserviceableKilled()' );
        this.IRunFile.remove( this.feature().name());
    }

    /*
     * Start the service
     * @returns {Promise} which never resolves
     * [-implementation Api-]
     */
    iserviceableStart(){
        Msg.debug( 'coreController.iserviceableStart()', 'forkedProcess='+this.api().exports().IForkable.forkedProcess());
        const config = this.config();
        return Promise.resolve( true )
            .then(() => {
                if( Object.keys( config ).includes( 'listenPort' ) && config.listenPort > 0 ){
                    this.ITcpServer.create( config.listenPort );
                }
            })
            .then(() => { Msg.debug( 'coreController.iserviceableStart() tcpServer created' ); })
            .then(() => {
                if( Object.keys( config ).includes( 'messaging' )){
                    this.IMqttClient.advertise( config.messaging );
                }
            })
            .then(() => { return new Promise(() => {}); });
    }

    /*
     * Get the status of the service
     * @returns {Promise} which resolves the a status object
     * [-implementation Api-]
     */
    iserviceableStatus(){
        Msg.debug( 'coreController.iserviceableStatus()' );
        this.api().exports().utils.tcpRequest( this.config().listenPort, 'iz.status' )
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
        this.api().exports().utils.tcpRequest( this.config().listenPort, 'iz.stop' )
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
        const _name = this.feature().name();
        let _msg = 'Hello, I am \''+_name+'\' '+this.constructor.name;
        _msg += ', running with pid '+process.pid+ ', listening on port '+this.config().listenPort;
        this.status().then(( status ) => {
            status[_name].event = 'startup';
            status[_name].helloMessage = _msg;
            status[_name].status = this.ITcpServer.status().status;
            self.IRunFile.set( _name, status );
            self.IForkable.advertiseParent( status );
        });
    }

    /*
     * Internal stats have been modified
     * [-implementation Api-]
     */
    itcpserverStatsUpdated(){
        Msg.debug( 'coreController.itcpserverStatsUpdated()' );
        const _name = this.feature().name();
        const _status = this.ITcpServer.status();
        this.IRunFile.set([ _name, 'ITcpServer' ], _status );
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
        const _serviceName = this.feature().name();
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
                    module: self.feature().module(),
                    class: self._class(),
                    pids: [ process.pid ],
                    ports: [ self.config().listenPort ],
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
                    listenPort: self.config().listenPort,
                    messaging: self._messaging | '',
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
                    version: self.api().packet().getVersion()
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

        const _name = this.feature().name();
        const _module = this.feature().module();
        const _class = this._class();
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
                    cb({ name:_name, module:_module, class:_class, pid:process.pid, port:self.config().listenPort });
                }
                return self.ITcpServer.terminate();
            })
            .then(() => {
                self.IMqttClient.terminate();
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
