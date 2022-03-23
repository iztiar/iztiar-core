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
            label: 'return the status of this coreController service',
            fn: coreController._izStatus
        },
        'iz.stop': {
            label: 'stop this coreController service',
            fn: coreController._izStop,
            end: true
        }
    };

    // returns the full status of the server
    static _izStatus( self, reply ){
        return self.publiableStatus()
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

    // when this feature has started
    _started = null;

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

        //Interface.extends( this, exports.baseProvider, api, card );
        Msg.debug( 'coreController instanciation' );

        // must implement the IFeatureProvider
        //  should implement that first so that we can install the engineApi and the featureCard as soon as possible
        Interface.add( this, exports.IFeatureProvider, {
            forkable: this.ifeatureproviderForkable,
            killed: this.ifeatureproviderKilled,
            start: this.ifeatureproviderStart,
            status: this.ifeatureproviderStatus,
            stop: this.ifeatureproviderStop
        });
        this.IFeatureProvider.api( api );
        this.IFeatureProvider.feature( card );

        let _promise = this._fillConfig()
            .then(() => {
                // add this rather sooner, so that other interfaces may take advantage of it
                Interface.add( this, exports.ICapability );
                this.ICapability.add(
                    'checkableStatus', ( o ) => { return o.checkableStatus(); }
                );
                this.ICapability.add(
                    'controller', ( o ) => { return Promise.resolve( o.IRunFile.get( o.IFeatureProvider.feature().name(), 'helloMessage' )); }
                );
                this.ICapability.add(
                    'helloMessage', ( o, cap ) => { return Promise.resolve( o.IRunFile.get( o.IFeatureProvider.feature().name(), cap )); }
                );
                return Interface.fillConfig( this, 'ICapability' );
            })
            .then(() => {
                Interface.add( this, exports.IForkable, {
                    _terminate: this.iforkableTerminate
                });
                return Interface.fillConfig( this, 'IForkable' );
            })
            .then(() => {
                Interface.add( this, exports.IMqttClient, {
                    _status: this._imqttclientStatus
                });
                return Interface.fillConfig( this, 'IMqttClient' );
            })
            .then(() => {
                Interface.add( this, exports.IRunFile, {
                    runDir: this.irunfileRunDir
                });
                return Interface.fillConfig( this, 'IRunFile' );
            })
            .then(() => {
                Interface.add( this, exports.ITcpServer, {
                    _listening: this.itcpserverListening,
                    _verbs: this.itcpserverVerbs
                });
                return Interface.fillConfig( this, 'ITcpServer' );
            })
            .then(() => { return Promise.resolve( this ); });

        return _promise;
    }

    /*
     * @param {engineApi} api the engine API as described in engine-api.schema.json
     * @param {featureCard} card a description of this feature
     * @returns {Promise} which resolves to the filled feature part configuration
     * 
     * Nothing to do here, but give a chance to IFeatureProvider...
     */
    _fillConfig(){
        if( !this.IFeatureProvider ){
            throw new Error( 'IFeatureProvider is expected to have been instanciated before calling this function' );
        }
        const feature = this.IFeatureProvider.feature();
        Msg.debug( 'coreController.fillConfig()' );
        let _filled = { ...feature.config() };
        return Promise.resolve( feature.config( this.IFeatureProvider.fillConfig( _filled )));
    }

    /*
     * @returns {Boolean} true if the process must be forked
     * [-implementation Api-]
     */
    ifeatureproviderForkable(){
        Msg.debug( 'coreController.ifeatureproviderForkable()' );
        return true;
    }

    /*
     * If the service had to be SIGKILL'ed to be stoppped, then gives it an opportunity to make some cleanup
     * [-implementation Api-]
     */
    ifeatureproviderKilled(){
        Msg.debug( 'coreController.ifeatureproviderKilled()' );
        this.IRunFile.remove( this.IFeatureProvider.feature().name());
    }

    /*
     * @param {String} name the name of the feature
     * @param {Callback|null} cb the funtion to be called on IPC messages reception (only relevant if a process is forked)
     * @param {String[]} args arguments list (only relevant if a process is forked)
     * @returns {Promise}
     *  - which never resolves in the forked process (server hosting) so never let the program exits
     *  - which resolves to the forked child process in the main process
     * [-implementation Api-]
     */
    ifeatureproviderStart( name, cb, args ){
        const exports = this.IFeatureProvider.api().exports();
        const _forked = exports.IForkable.forkedProcess();
        Msg.debug( 'coreController.ifeatureproviderStart()', 'forkedProcess='+_forked );
        if( _forked ){
            const featCard = this.IFeatureProvider.feature();
            return Promise.resolve( true )
                .then(() => { this.ITcpServer.create( featCard.config().ITcpServer.port ); })
                .then(() => { exports.Msg.debug( 'coreController.ifeatureproviderStart() tcpServer created' ); })
                .then(() => { this.IMqttClient.advertise( featCard.config().IMqttClient ); })
                .then(() => { return new Promise(() => {}); });
        } else {
            return Promise.resolve( exports.IForkable.fork( name, cb, args ));
        }
    }

    /*
     * Get the status of the service
     * @returns {Promise} which resolves the a status object
     * [-implementation Api-]
     */
    ifeatureproviderStatus(){
        Msg.debug( 'coreController.ifeatureproviderStatus()' );
        this.IFeatureProvider.api().exports().utils.tcpRequest( this.IFeatureProvider.feature().config().ITcpServer.port, 'iz.status' )
            .then(( answer ) => {
                Msg.debug( 'coreController.ifeatureproviderStatus()', 'receives answer to \'iz.status\'', answer );
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
    ifeatureproviderStop(){
        Msg.debug( 'coreController.ifeatureproviderStop()' );
        this.IFeatureProvider.api().exports().utils.tcpRequest( this.IFeatureProvider.feature().config().ITcpServer.port, 'iz.stop' )
            .then(( answer ) => {
                Msg.debug( 'coreController.ifeatureproviderStop()', 'receives answer to \'iz.stop\'', answer );
            }, ( failure ) => {
                // an error message is already sent by the called self.api().exports().utils.tcpRequest()
                //  what more to do ??
                //Msg.error( 'TCP error on iz.stop command:', failure );
            });
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
        return this.publiableStatus().then(( res ) => {
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
        return this.IFeatureProvider.api().config().runDir();
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
        const featCard = this.IFeatureProvider.feature();
        const _name = featCard.name();
        const _port = featCard.config().ITcpServer.port;
        let _msg = 'Hello, I am \''+_name+'\' '+featCard.class();
        _msg += ', running with pid '+process.pid+ ', listening on port '+_port;
        const Checkable = this.IFeatureProvider.api().exports().Checkable;
        let st = new Checkable();
        st.pids = [ process.pid ];
        st.ports = [ _port ];
        let status = {};
        status[_name] = {
            module: featCard.module(),
            class: featCard.class(),
            ... st,
            event: 'startup',
            helloMessage: _msg,
            status: 'running'
        };
        //console.log( 'itcpserverListening() status', status );
        this.IRunFile.set( _name, status );
        this.IForkable.advertiseParent( status );
    }

    /*
     * Internal stats have been modified
     * @param {Object} status of the ITcpServer
     * [-implementation Api-]
     * Note:
     *  As of v0.x, ITcpServer stats are preferably published in the MQTT alive message.
     *  Keep the runfile as light as possible.
     */
    /*
    itcpserverStatsUpdated( status ){
        Msg.debug( 'coreController.itcpserverStatsUpdated()' );
        const _name = this.IFeatureProvider.feature().name();
        this.IRunFile.set([ _name, 'ITcpServer' ], status );
    }
    */

    /*
     * @returns {Object[]} the list of implemented commands provided by the interface implementation
     *  cf. tcp-server-command.schema.json
     * [-implementation Api-]
     */
    itcpserverVerbs(){
        return coreController.verbs;
    }

    /*
     * @returns {Promise} which must resolve to an object conform to check-status.schema.json
     * [-implementation Api-]
     */
    checkableStatus(){
        Msg.debug( 'coreController.checkableStatus()' );
        const _name = this.IFeatureProvider.feature().name();
        const _json = this.IRunFile.jsonByName( _name );
        const Checkable = this.IFeatureProvider.api().exports().Checkable;
        let o = new Checkable();
        if( _json && _json[_name] ){
            o.pids = _json[_name].pids;
            o.ports = _json[_name].ports;
            o.startable = o.pids.length === 0 && o.ports.length === 0;
        } else {
            o.startable = true;
        }
        return Promise.resolve( o );
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
    publiableStatus(){
        const featApi = this.IFeatureProvider.api();
        const featCard = this.IFeatureProvider.feature();
        const _serviceName = featCard.name();
        Msg.debug( 'coreController.publiableStatus()', 'serviceName='+_serviceName );
        const self = this;
        let status = {};
        // run-status.schema.json
        const _runStatus = function(){
            return new Promise(( resolve, reject ) => {
                if( !self._started ) self._started = featApi.exports().utils.now();
                const o = {
                    module: featCard.module(),
                    class: featCard.class(),
                    pids: [ process.pid ],
                    ports: [ featCard.config().ITcpServer.port ],
                    runfile: self.IRunFile.runFile( _serviceName ),
                    started: self._started
                };
                Msg.debug( 'coreController.publiableStatus()', 'runStatus', o );
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
                    Msg.debug( 'coreController.publiableStatus()', 'pidUsage', o );
                    status.pidUsage = { ...o };
                    return Promise.resolve( status );
                });
        };
        return Promise.resolve( true )
            .then(() => { return _runStatus(); })
            .then(() => { return _pidPromise(); })
            .then(() => { return this.IStatus ? this.IStatus.run( status ) : status; })
            .then(( res ) => {
                let featureStatus = {};
                featureStatus[_serviceName] = res;
                //console.log( 'coreController.publiableStatus() featureStatus', featureStatus );
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
        const exports = this.IFeatureProvider.api().exports();
        Msg.debug( 'coreController.terminate()' );
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

        const _name = this.IFeatureProvider.feature().name();
        const _module = this.IFeatureProvider.feature().module();
        const _class = this.IFeatureProvider.feature().class();
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
                    cb({ name:_name, module:_module, class:_class, pid:process.pid, port:self.IFeatureProvider.feature().config().ITcpServer.port });
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
