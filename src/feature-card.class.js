/*
 * featureCard class
 *
 *  The featureCard object is built:
 *  - from the (unfilled) configuration for this feature
 *  - from the package.json of the external module (unless module is 'core').
 *
 *  A featureCard acts as a proxy to an Iztiar plugin which:
 *  - provides one or more named feature(s)
 *  - is configured and not disabled in the main application configuration file
 *  - is installed.
 */
import path from 'path';

import { IForkable, IFeatureProvider, coreApi, Checkable, coreController, engineApi, Msg, utils } from './index.js';

export class featureCard {

    // from constructor
    _name = null;
    _config = null;
    _package = null;

    // got from initialization() from the module
    _featureProvider = null;

    /**
     * Constructor
     * @param {String} name the feature name
     * @param {Object} config the (unfilled) part of the application configuration file which describes this feature
     * @param {PackageJson|null} packet the providing module, null for the core itself
     * @returns {featureCard}
     * @throws {Error}
     */
    constructor( name, config, packet=null ){
        //console.log( 'featureCard constructor', 'name='+name, config );

        if( !name || typeof name !== 'string' || !name.length ){
            throw new Error( 'featureCard(): feature name is not set');
        }
        if( !Object.keys( config ).length ){
            throw new Error( 'featureCard(): feature is not configured');
        }
        if( !Object.keys( config ).includes( 'module' ) || typeof config.module !== 'string' || !config.module.length ){
            throw new Error( 'featureCard(): feature module is not set');
        }
        if( config.module === 'core' && ( !config.class || typeof config.class !== 'string' || !config.class.length )){
            throw new Error( 'featureCard(): feature class is not set though this is mandatory for \'core\' features' );
        }

        this._name = name;
        this._config = config;
        this._package = packet;

        return this;
    }

    /**
     * @returns {String} the class known for this feature
     *  Whether the class is required depends of the providing module itself:
     *  - if 'core', the class is required when configuring a feature from the '@iztiar/iztiar-core' core module
     *  - other (external) modules may have their own rule
     *  Before the module is featureCard.initialized(), we only have access to the configured class;
     *  as seen above, this may or may not be set.
     *  After the initialization, we have access to the actual, runtime, class, which will be returned first.
     */
    class(){
        return this._featureProvider ? this._featureProvider._class() : ( this.config().class ? this.config().class : '(undefined class)' );
    }

    /**
     * @returns {Object} the part of the application configuration which describes this feature
     */
    config(){
        return this._config;
    }

    /**
     * @returns {Boolean} whether the feature is enabled or not
     */
    enabled(){
        return Object.keys( this._config ).includes( 'enabled' ) ? this._config.enabled : true;
    }

    /**
     * dynamically load and initialize the default function of the module
     * @param {coreApi} core a coreApi instance
     * @returns {Promise} which resolves to the IFeatureProvider which must be returned by the default function
     * @throws {Error} if IFeatureProvider is not set
     */
    initialize( core ){
        const _name = this.name();
        Msg.verbose( 'featureCard.initialize()', _name );
        const self = this;

        // cf. engine-api.schema.json
        let api = new engineApi( core );

        let _promise = Promise.resolve( true )
            .then(() => {
                // import all what this '@iztiar/iztiar-core' says having to exports
                const _corePacket = core.packet();
                const _coreMain = path.join( _corePacket.getDir(), _corePacket.getMain());
                return import( _coreMain );
            })
            .then(( coreExports ) => {
                // when we have imported all from the previous full core import, the we are able to complete the engineApi
                api.exports( coreExports );
                return api;
            });

        // import the external ESM module
        //  and tries to initialize it
        const _importFromExternal = function( module ){
            Msg.debug( 'featureCard.initialize()', _name,'_importFromExternal()', 'module='+module );
            const _extPackage = self.packet();
            const _extMain = path.join( _extPackage.getDir(), _extPackage.getMain());
            return import( _extMain )
                .then(( extImported ) => {
                    if( typeof extImported.default === 'function' ){
                        return extImported.default( api, self )
                    } else {
                        throw new Error( 'featureCard.initialize()', _name, 'doesn\'t export a default function' );
                    }
                })
                .then(( o ) => { return self._featureProvider = o; });
            };

        // or import the requested class from 'core' module
        //  and tries to initialize it
        const _importFromCore = function(){
            const _class = self.class();
            Msg.debug( 'featureCard.initialize()', _name,'_importFromCore()', 'class='+_class );
            switch( _class ){
                case 'coreController':
                    return new coreController( api, self )
                        .then(( o ) => { return self._featureProvider = o.IFeatureProvider; });
                default:
                    // this is a configuration error rather a runtime one
                    throw new Error( 'featureCard.initialize()', _name, 'unknown class \''+_class+'\'' );
            }
        };

        const _module = this.module();
        Msg.debug( 'featureCard.initialize()', _name, ' module='+_module );
        if( _module === 'core' ){
            _promise = _promise.then(() => { return _importFromCore(); });
        } else {
            _promise = _promise.then(() => { return _importFromExternal( _module ); });
        }

        // at the end, either we have rejected the promise, or it must be resolved with a IFeatureProvider
        _promise = _promise.then(( res ) => {
            Msg.debug( 'featureCard.initialize()', _name, 'result:', res );
            if( res && res instanceof IFeatureProvider ){
                return Promise.resolve( res );
            } else {
                throw new Error( _name, 'IFeatureProvider expected, '+res+' received: rejected' );
            }
        });

        return _promise;
    }

    /**
     * @returns {IFeatureProvider} the instance of the interface provided by the feature
     *  Null before initialization
     */
    iProvider(){
        return this._featureProvider;
    }

    isForkable(){
        const _forkable = this._featureProvider.isForkable();
        Msg.verbose( 'featureCard.isForkable()', 'name='+this.name(), 'forkable='+_forkable );
        return _forkable;
    }

    module(){
        return this.config().module;
    }

    name(){
        return this._name;
    }

    packet(){
        return this._package;
    }

    /**
     * @returns {Promise} which resolves to the startup result, or is rejected
     */
    start(){
        Msg.verbose( 'featureCard.start()', 'name='+this.name());
        if( !this.enabled()){
            return Promise.reject( new Error( 'Feature is disabled' ));
        }

        if( IForkable.forkedProcess()){
            const _title = process.title + '/' + this.name();
            process.title = _title;
        }

        let _promise = Promise.resolve( true )
        if( this._featureProvider && this._featureProvider.start && typeof this._featureProvider.start === 'function' ){
            _promise = _promise.then(() => { return this._featureProvider.start(); });
        }

        return _promise;
    }

    /**
     * @param {Object} options
     *  -
     * @returns {Promise} which eventually resolves to an Object conform to (or extending) run-status.schema.json
     *  // the checkable.schema.json content
     *  reasons: []               array of error messages (one per found error), length=0 means that feature is full ok, up and running
     *  startable: true|false     whether the feature could be started, i.e. only if the runfile is empty or not present
     *  pids: []                  array of requested pids
     *  ports: []                 array of requested TCP ports number
     *  // other content from this function
     *  alive.pids: []            array of alive pids
     *  alive.ports: []           array of alive ports
     *  status: JSON object       full status returned by the feature
     * Note:
     *  This method takes advantage of the 'checkStatus' capability.
     * Note:
     *  As a reminder, if the feature is forkable, then its status cannot be directly requested.
     *  Getting the status from a forkable requires either getting an answer of an ITcpServer, or reading some runfile somewhere.
     * @throws {Error}
     */
    status( options={} ){
        Msg.verbose( 'featureCard.status()', 'name='+this.name());
        const self = this;
        //console.log( this );
        //console.log( this._featureProvider );
        //console.log( self._featureProvider.getCheckStatus );
        //console.log( typeof self._featureProvider.getCheckStatus );

        // the returned object which will resolve the promise
        let result = new Checkable();
        result.alive = { pids:[], ports:[] };

        // using promises here happens to be rather conterproductive as the functions are already mainly used inside of Promises
        const _cinfo = function(){
            Msg.info( ...arguments );
        }
        const _cerr = function(){
            result.reasons.push( ...arguments );
            Msg.info( ...arguments );
        }

        // first ask the IFeatureProvider to provide its own status check (must conform to check-status.schema.json)
        const _checkablePromise = function(){
            return self.iProvider().getCheckable()
                .then(( res ) => {
                    if( res ){
                        //console.log( 'getCheckable', res );
                        result.merge( res );
                    }
                    return Promise.resolve( result );
                });
        };

        // first ask the IFeatureProvider to provide its own status check (must conform to check-status.schema.json)
        const _serviceablePromise = function(){
            return self.iProvider().getCapability( 'checkStatus' )
                .then(( res ) => {
                    if( res ){
                        //console.log( 'checkStatus res', res );
                        result.merge( res );
                        //console.log( 'checkStatus merged', result );
                    }
                    return Promise.resolve( result );
                });
        };

        // check if this pid is alive, resolving with true|false
        const _pidAlivePromise = function( pid ){
            Msg.verbose( 'featureCard.status()._pidAlivePromise()', 'pid='+pid );
            return new Promise(( resolve, reject ) => {
                utils.isAlivePid( pid )
                    .then(( res ) => {
                        if( res ){
                            result.alive.pids.push( pid );
                            const _local = { user:res[0].user, time:res[0].time, elapsed:res[0].elapsed };
                            _cinfo( 'pid='+pid+' is alive', _local );
                            resolve( true );
                        } else {
                            _cerr( 'pid='+pid+' is dead' );
                            resolve( false );
                        }
                    });
            });
        };

        // ping this port, resolving with true|false
        const _portPingPromise = function( port ){
            Msg.verbose( 'featureCard.status()._portPingPromise()', 'port='+port );
            return new Promise(( resolve, reject ) => {
                utils.isAlivePort( port )
                    .then(( res ) => {
                        if( res ){
                            result.alive.ports.push( port );
                            _cinfo( 'port='+port+' answers', res );
                            resolve( true );
                        } else {
                            _cerr( 'port='+port+' doesn\'t answer to ping' );
                            resolve( false );
                        }
                    });
            });
        };

        // request the feature for its status, resolving with the status or false
        //  the returned status is expected to be conform to run-status.schema.json
        const _portStatusPromise = function( port ){
            if( !result.alive.ports.includes( port )){
                _cinfo( 'status not requested as port didn\'t answered to previous ping' );
                return Promise.resolve( false );
            } else {
                return new Promise(( resolve, reject ) => {
                    utils.tcpRequest( port, 'iz.status' )
                        .then(( res ) => {
                            //console.log( 'iz.status returns', res );
                            if( !res || Object.keys( res ).includes( 'reason' ) || typeof res.answer !== 'object' ){
                                _cerr( 'statusOf request rejected', res );
                                resolve( false );
                            } else {
                                let _errs = 0;
                                const _answeredName = Object.keys( res.answer )[0];
                                const _answeredPids = [ ...res.answer[_answeredName].pids ];
                                const _answeredClass = res.answer[_answeredName].class;
                                // check the answered feature name
                                if( _answeredName !== self.name()){
                                    _errs += 1;
                                    _cerr( 'statusOf answers from '+_answeredName+' while '+self.name()+' was expected' );
                                }
                                // at least one of provided pids must be in the alive.pids list
                                let _count = 0;
                                _answeredPids.every(( p ) => {
                                    if( result.alive.pids.includes( p )){
                                        _count += 1;
                                        return false;
                                    }
                                    return true;
                                });
                                if( !_count ){
                                    _errs += 1;
                                    _cerr( 'statusOf answers with pids='+_answeredPids.join(',')+' while pids='+result.alive.pids.join(',')+' was expected' );
                                }
                                //check the answered class (if apply)
                                const _class = self.class();
                                if( _class && _answeredClass !== _class ){
                                    _errs += 1;
                                    _cerr( 'statusOf answers with '+_answeredClass+' class while '+_class+' was expected' );
                                }
                                // resolve depending of errs count
                                if( _errs ){
                                    resolve( false );
                                } else {
                                    result.status = res.answer;
                                    const _local = { feature:_answeredName, pids:_answeredPids, class:_answeredClass };
                                    _cinfo( 'statusOf answers', _local );
                                    resolve( true );
                                }
                            }
                        }, ( rej ) => {
                            _cerr( 'statusOf request rejected' );
                            resolve( false );
                        });
                });
            }
        }

        // let chain and check
        let promise = Promise.resolve( true );
        promise = promise.then(() => { return _checkablePromise() });
        promise = promise.then(() => { return _serviceablePromise() });
        promise = promise.then(() => {
            let subProms = Promise.resolve( true );
            result.pids.every(( pid ) => {
                Msg.debug( 'featureCard.status() has to check for pid='+pid );
                subProms = subProms.then(() => { return _pidAlivePromise( pid )});
                return true;
            });
            result.ports.every(( port ) => {
                Msg.debug( 'featureCard.status() has to check for port='+port );
                subProms = subProms.then(() => { return _portPingPromise( port )});
                subProms = subProms.then(() => { return _portStatusPromise( port )});
                return true;
            });
            return subProms;
        });
        // after our own cheks, ask the service itself
        //  NO: first, the status has already been requested in _portStatusPromise()
        //      second, this would ask the status of the service in *this* process instead of in the forked one...
        //if( this._featureProvider && this._featureProvider.status && typeof this._featureProvider.status === 'function' ){
        //    promise = promise.then(() => { return this._featureProvider.status(); });
        //}
        promise = promise.then(() => { return Promise.resolve( result )});
        return promise;
    }

    /**
     * @returns {Promise} which resolves to the stop result
     * @throws {Error}
     * Note:
     *  In order to stop any service, one should first check that it is actually running, before actually try to stop it,
     *  and then check that it no more runs and is gracefully stopped.
     *  This function ONLY takes care of the actual stop.
     *  It is up to the caller to begin with a first check, and end with a later check.
     */
    stop(){
        Msg.verbose( 'featureCard.stop()' );

        let promise = Promise.resolve( true )

        if( this._featureProvider && this._featureProvider.stop && typeof this._featureProvider.stop === 'function' ){
            promise = promise.then(() => { return this._featureProvider.stop(); });
        }
        promise = promise
            .then(( res ) => { return Promise.resolve( res )});

        return promise;
    }
}
