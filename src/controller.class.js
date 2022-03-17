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
    static verbs = {
        'iz.status': {
            label: 'returns the status of this coreController service',
            fn: coreController._izStatus
        },
        'iz.stop': {
            label: 'stop this coreController service',
            fn: coreController._izStop,
            end: true
        }
    };

    /**
     * Defaults
     */
    static d = {
        listenPort: 24001,
        alivePeriod: 60*1000
    };

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

        // first interface to be added, so that other interfaces may take advantage of that
        Interface.add( this, exports.ICapability );

        this.ICapability.add(
            'checkStatus', ( o ) => { return o._checkStatus(); }
        );
        this.ICapability.add(
            'controller', ( o ) => { return Promise.resolve( o.IRunFile.get( o.feature().name(), 'helloMessage' )); }
        );
        this.ICapability.add(
            'helloMessage', ( o, cap ) => { return Promise.resolve( o.IRunFile.get( o.feature().name(), cap )); }
        );

        Interface.add( this, exports.IForkable, {
            _terminate: this.iforkableTerminate
        });

        Interface.add( this, exports.IMqttClient, {
            _class: this._class,
            _module: this.feature().module,
            _name: this._name,
            _status: this._imqttclientStatus
        });

        Interface.add( this, exports.IRunFile, {
            runDir: this.irunfileRunDir
        });

        Interface.add( this, exports.IServiceable, {
            class: this.iserviceableClass,
            config: this.iserviceableConfig,
            killed: this.iserviceableKilled,
            start: this.iserviceableStart,
            status: this.iserviceableStatus,
            stop: this.iserviceableStop
        });

        Interface.add( this, exports.ITcpServer, {
            _listening: this.itcpserverListening,
            _statsUpdated: this.itcpserverStatsUpdated,
            _verbs: this.itcpserverVerbs
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
     * @returns {Promise} which must resolve to an object conform to check-status.schema.json
     * [-implementation Api-]
     */
    _checkStatus(){
        Msg.debug( 'coreController._checkStatus()' );
        const _name = this.feature().name();
        const _json = this.IRunFile.jsonByName( _name );
        const Checkable = this.api().exports().Checkable;
        let o = new Checkable();
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

    /**
     * @returns {Promise} which resolves to the status of the service
     * we want here remove the first key because it is useless as part of the topic
     * [-implementation Api-]
     */
    _imqttclientStatus(){
        return this.status().then(( res ) => {
            const name = Object.keys( res )[0];
            return res[name];
        });
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
     * What to do when this ITcpServer is ready listening ?
     *  -> write the runfile before advertising parent to prevent a race condition when writing the file
     *  -> send the current service status
     * @param {Object} tcpServerStatus
     * [-implementation Api-]
     */
    itcpserverListening( tcpServerStatus ){
        Msg.debug( 'coreController.itcpserverListening()' );
        const self = this;
        const _name = this.feature().name();
        let _msg = 'Hello, I am \''+_name+'\' '+this._class();
        _msg += ', running with pid '+process.pid+ ', listening on port '+this.config().listenPort;
        this.status().then(( status ) => {
            status[_name].event = 'startup';
            status[_name].helloMessage = _msg;
            status[_name].status = 'running';
            //console.log( 'itcpserverListening() status', status );
            self.IRunFile.set( _name, status );
            self.IForkable.advertiseParent( status );
        });
    }

    /*
     * Internal stats have been modified
     * @param {Object} status of the ITcpServer
     * [-implementation Api-]
     */
    itcpserverStatsUpdated( status ){
        Msg.debug( 'coreController.itcpserverStatsUpdated()' );
        const _name = this.feature().name();
        this.IRunFile.set([ _name, 'ITcpServer' ], status );
    }

    /*
     * @returns {Object[]} the list of implemented commands provided by the interface implementation
     *  cf. tcp-server-command.schema.json
     * [-implementation Api-]
     */
    itcpserverVerbs(){
        return coreController.verbs;
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
        // run-status.schema.json
        const _runStatus = function(){
            return new Promise(( resolve, reject ) => {
                const o = {
                    module: self.feature().module(),
                    class: self._class(),
                    pids: [ process.pid ],
                    ports: [ self.config().listenPort ],
                    //status: status[_serviceName].ITcpServer.status
                };
                Msg.debug( 'coreController.status()', 'runStatus', o );
                status = { ...status, ...o };
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
                status = { ...status, ...o };
                resolve( status );
            });
        };
        // pidUsage
        const _pidPromise = function(){
            return pidUsage( process.pid )
                .then(( res ) => {
                    const o = {
                        cpu: res.cpu,
                        memory: res.memory,
                        ctime: res.ctime,
                        elapsed: res.elapsed
                    };
                    Msg.debug( 'coreController.status()', 'pidUsage', o );
                    status.pidUsage = { ...o };
                    return Promise.resolve( status );
                });
        };
        return Promise.resolve( true )
            .then(() => { return _runStatus(); })
            .then(() => { return _thisStatus(); })
            .then(() => { return _pidPromise(); })
            .then(() => { return this.IStatus ? this.IStatus.run( status ) : status; })
            .then(( res ) => {
                let featureStatus = {};
                featureStatus[_serviceName] = res;
                //console.log( 'coreController.status() featureStatus', featureStatus );
                return Promise.resolve( featureStatus );
            });
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
        const exports = this.api().exports();
        exports.Msg.debug( 'coreController.terminate()' );
        this.ITcpServer.status().then(( res ) => {
            if( res.status === exports.ITcpServer.s.STOPPING ){
                exports.Msg.debug( 'coreController.terminate() returning as currently stopping' );
                return Promise.resolve( true );
            }
            if( res.status === exports.ITcpServer.s.STOPPED ){
                exports.Msg.debug( 'coreController.terminate() returning as already stopped' );
                return Promise.resolve( true );
            }
        });

        const _name = this.feature().name();
        const _module = this.feature().module();
        const _class = this._class();
        this._forwardPort = args && args[0] && exports.utils.isInt( args[0] ) ? args[0] : 0;

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
                exports.Msg.info( _name+' coreController terminating with code '+process.exitCode );
                return Promise.resolve( true)
                //process.exit();
            });

        return _promise;
    }
}
