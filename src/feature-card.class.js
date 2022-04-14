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

import { IForkable, coreApi, Checkable, coreController, engineApi, featureProvider, Msg, utils } from './index.js';

export class featureCard {

    // the (sub-)features specified in a feature configuration
    //  we record here all *initialized* featureCard's
    static _initializedFeatures = {};
    static _initializedAddons = {};

    // from constructor
    _name = null;
    _config = null;
    _package = null;

    // got from initialization() from the module
    _featureProvider = null;

    /**
     * @param {String} name the feature name
     * @returns {featureCard|null} the already initialized feature
     */
    static byName( name ){
        if( Object.keys( featureCard._initializedFeatures ).includes( name )){
            return featureCard._initializedFeatures[name];
        }
        return null;
    }

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
        Msg.debug( 'featureCard.constructor()', 'name='+name, 'config', config, 'packet', packet );

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
     * Getter/Setter
     * @param {String} name the class known for this feature
     * @returns {String}
     * Note:
     *  The class name is the name which identifies the feature from the module point of view
     *  (where the feature name idenfifies this instance of the feature from the application point of view).
     *  Though it is free, it should be chosen carefully as it also will be the identifier used by third
     *  party add-ons to address the feature. As a general rule, the implementation class name seems to be
     *  a rather good choice.
     *  Whether the class is required depends of the providing module itself:
     *  - if 'core', the class is required when configuring a feature from the '@iztiar/iztiar-core' core module
     *  - other (external) modules may have their own rule
     *  In other words, depending of the module rules, the class may or may not be specified in the application
     *  configuration file (for now, only 'core' requires that the class be specified).
     *  Before the plugin be initialized, the featureCard.class() method returns the class read
     *  from the application configuration file. The featureProvider base class will take care of setting
     *  here the actual runtime class name.
     */
    class( name ){
        if( name && typeof name === 'string' && name.length ){
            this.config().class = name;
        }
        return this.config().class;
    }

    /**
     * Getter/Setter
     * @param {Object} conf the feature configuration
     *  - either the part of the application configuration which describes this feature (from construction time
     *      of this instance until the feature plugin is initialized)
     *  - or the filled configuration built at plugin initialization time
     * @returns {Object} the current feature configuration
     */
    config( conf ){
        if( conf && Object.keys( conf ).length && typeof conf === 'object' ){
            Msg.debug( 'featureCard.config()', 'name='+this._name, conf );
            this._config = conf;
        }
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
     * @param {Object} instance the implementation instance when initializing an add-on
     * @returns {Promise} which resolves to the IFeatureProvider which must be returned by the default function
     * @throws {Error} if IFeatureProvider is not set
     */
    initialize( core, instance=null ){
        const _name = this.name();
        const _module = this.module();
        // first search in our cache
        if( Object.keys( featureCard._initializedFeatures ).includes( _name )){
            Msg.verbose( 'featureCard.initialize() '+_name+' already initialized' );
            return Promise.resolve( featureCard._initializedFeatures[_name].provider());
        }
        // else initialize the feature
        Msg.verbose( 'featureCard.initialize()', 'initializing '+_name, 'module='+_module );
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
            .then(( _coreExports ) => {
                // when we have imported all from the previous full core import, the we are able to complete the engineApi
                api.exports( _coreExports );
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
                    //Msg.debug( 'featureCard.initialize()', _name, 'about to call default', extImported );
                    if( typeof extImported.default === 'function' ){
                        return extImported.default( api, self, instance )
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
                        .then(( o ) => { return self._featureProvider = o; });
                default:
                    // this is a configuration error rather a runtime one
                    throw new Error( 'featureCard.initialize()', _name, 'unknown class \''+_class+'\'' );
            }
        };

        if( _module === 'core' ){
            _promise = _promise.then(() => { return _importFromCore(); });
        } else {
            _promise = _promise.then(() => { return _importFromExternal( _module ); });
        }

        // at the end, either we have rejected the promise, or it must be resolved with a IFeatureProvider
        //  each add-on is initialized during the main hosting feature initialization process
        //  keeping a trace of these add-ons let us advertise them at the end of the main initialization
        _promise = _promise.then(( res ) => {
            Msg.debug( 'featureCard.initialize()', _name, 'result:', res );
            Msg.debug( 'featureCard.initialize()', _name, 'config:', this.config());
            if( res && res instanceof featureProvider ){
                Msg.debug( 'adding '+_name+' to featureCard._initializedFeatures' );
                featureCard._initializedFeatures[_name] = this;
                if( instance ){
                    Msg.debug( 'adding '+_name+' to featureCard._initializedAddons' );
                    featureCard._initializedAddons[_name] = this;
                } else {
                    // advertise the add-ons of *this* feature (plus the main feature itself)
                    Object.keys( featureCard._initializedAddons ).every(( name ) => {
                        const _short = name.split( '/' )[0];
                        if( _short === _name ){
                            featureCard._initializedAddons[name].provider().initPost();
                        }
                        return true;
                    });
                    this.provider().initPost();
                }
                return Promise.resolve( res );
            } else {
                throw new Error( _name, 'featureProvider expected, '+res+' received: rejected' );
            }
        });

        return _promise;
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
     * @returns {featureProvider} the instance of the interface provided by the feature
     *  Null before initialization
     */
    provider(){
        return this._featureProvider;
    }

    /**
     * @param {Callback|null} cb the funtion to be called on IPC messages reception (only relevant if a process is forked)
     * @param {String[]} args arguments list (only relevant if a process is forked)
     * @returns {Promise} which may:
     *  - resolve to the child process (the featureProvider has forked),
     *  - never resolve (the featureProvider has started a daemon and doesn't want the program exit)
     *  - be rejected (a runtime condition has been detected)
     *  - resolve to another startup result...
     */
    start( cb, args ){
        const _name = this.name();
        Msg.verbose( 'featureCard.start()', 'name='+_name );
        if( !this.enabled()){
            return Promise.reject( new Error( 'Feature is disabled' ));
        }
        if( IForkable.forkedProcess()){
            const _title = process.title + '/' + _name;
            process.title = _title;
        }
        let _promise = Promise.resolve( true )
        if( this._featureProvider.IForkable ){
            _promise = _promise.then(() => { return this._featureProvider.IForkable.v_start( _name, cb, args ); });
            _promise = _promise.then(() => { return this._featureProvider.startPost(); });
        } else {
            _promise = _promise.then(() => { return this._featureProvider.start( _name, cb, args ); });
            _promise = _promise.then(() => { return this._featureProvider.startPost(); });
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
     *  This method takes advantage of the 'checkableStatus' capability.
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
        result.reasons = [];
        result.alive = { pids:[], ports:[] };

        // using promises here happens to be rather conterproductive as the functions are already mainly used inside of Promises
        const _cinfo = function(){
            Msg.info( ...arguments );
        }
        const _cerr = function(){
            result.reasons.push( ...arguments );
            Msg.info( ...arguments );
        }

        // first ask the featureProvider to provide its own status check (must conform to check-status.schema.json)
        const _checkablePromise = function(){
            return self.provider().getCheckable()
                .then(( res ) => {
                    if( res ){
                        //console.log( 'getCheckable', res );
                        result.merge( res );
                    }
                    return Promise.resolve( result );
                });
        };

        // also try the corresponding capability
        const _serviceablePromise = function(){
            const p = self.provider().getCapability( 'checkableStatus' );
            if( p && p instanceof Promise ){
                return p.then(( res ) => {
                    if( res ){
                        //console.log( 'checkStatus res', res );
                        result.merge( res );
                        //console.log( 'checkStatus merged', result );
                    }
                    return Promise.resolve( result );
                });
            } else {
                return Promise.resolve( result );
            }
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
                            if( !res || Object.keys( res ).includes( 'reasons' ) || typeof res.answer !== 'object' ){
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
        Msg.verbose( 'featureCard.stop()', 'name='+this.name());
        let _promise = Promise.resolve( true );
        if( this._featureProvider.IForkable ){
            _promise = _promise.then(() => { return this._featureProvider.IForkable.v_stop(); });
        } else {
            _promise = _promise.then(() => { return this._featureProvider.stop(); });
        }
        return _promise;
    }
}
