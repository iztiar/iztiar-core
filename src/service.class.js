/*
 * coreService class
 *
 *  A coreService acts as a proxy to an Iztiar module which:
 *  - provides a named service
 *  - is configured and not disabled in the main application configuration file
 *  - is installed.
 */
import path from 'path';

import { IMsg, IServiceable, coreApi, coreController, utils } from './index.js';

export class coreService {

    // from constructor
    _name = null;
    _config = null;
    _package = null;

    // got from initialization() from the plugin
    _iServiceable = null;

    /**
     * Constructor
     * @param {String} name the service name
     * @param {Object} config the part of the application configuration file which describes this service
     * @param {PackageJson|null} pck the providing module, null for the core itself
     * @returns 
     */
    constructor( name, config, pck ){
        this._name = name;
        this._config = config;
        this._package = pck;
        return this;
    }

    class(){
        return this.config().class || ( this._iServiceable ? this._iServiceable.class() : '(undefined class)' );
    }

    config(){
        return this._config;
    }

    /**
     * dynamically load and initialize the default function of the plugin
     * @param {coreApplication} app the application
     *  At the time, only core package and core config are set
     *  We complete here with this service and
     * @returns {Promise} which resolves to the IServiceable which must be returned by the default function
     * @throws {Error} if IServiceable is not set
     */
    initialize( app ){
        IMsg.verbose( 'coreService.initialize()', 'name='+this._name );
        const self = this;
        const pck = self.package();

        // cf. core-api.schema.json
        let api = new coreApi();
        api.corePackage( app.package());
        api.coreConfig( app.config());
        api.IMsg( app.IMsg );
        api.service( self );

        // import all what this @iztiar/iztiar-core exports
        const _corePromise = function( corePackage ){
            const _coreExports = path.join( corePackage.getDir(), corePackage.getMain());
            return import( _coreExports );
        };

        // build a full Api
        const _apiPromise = function( coreExports ){
            return new Promise(( resolve, reject ) => {
                api.exports( coreExports );
                //console.log( new api.exports.coreForkable() );
                resolve( api );
            });
        };

        let _promise = Promise.resolve( true )
            .then(() => { return _corePromise( app.package()); })
            .then(( coreExports ) => { return _apiPromise( coreExports ); });

        // external package to be dynamically imported
        // the package must define a default export which must be a function which must return a IServiceable instance
        if( pck ){
            const _importPromise = function( api ){
                return new Promise(( resolve, reject ) => {
                    const main = path.join( pck.getDir(), pck.getMain());
                    import( main ).then(( res ) => {
                        if( typeof res.default === 'function' ){
                            return resolve( self._iServiceable = res.default( api ));
                        } else {
                            return reject( 'coreService.initialize() \''+this.name()+'\' doesn\'t export a default function' );
                        }
                    });
                });
            }
            _promise = _promise.then(( api ) => { return _importPromise( api ); });

        // the service is expected to be provided by core
        } else if( self.config().module === 'core' ){
            const _class = self.config().class;
            switch( _class ){
                case 'coreController':
                    _promise = _promise.then(( api ) => {
                        return Promise.resolve( self._iServiceable = new coreController( api ).IServiceable );
                    });
                    break;
                default:
                    _promise = _promise.then(() => {
                        return Promise.reject( 'coreService.initialize() unknown class \''+self.config().class+'\'' );
                    });
                    break;
            }

        // or we don't know where to get the service from
        } else {
            _promise = _promise.then(() => {
                return Promise.reject( 'coreService.initialize() unknown module \''+self.config().module+'\'' );
            });
        }

        // at the end, either we have rejected the promise, or it must be resolved with a IServiceable
        _promise = _promise.then(( success ) => {
            if( success && success instanceof IServiceable ){
                return Promise.resolve( success );
            } else {
                return Promise.reject( 'IServiceable expected, '+success+' received: rejected' );
            }
        });
        return _promise;
    }

    isForkable(){
        const _forkable = this._iServiceable.isForkable();
        IMsg.debug( 'coreService.isForkable()', 'name='+this.name(), 'forkable='+_forkable );
        return _forkable;
    }

    /**
     * @returns {IServiceable} the instance of the interface provided by the service
     *  Null before initialization
     */
    iServiceable(){
        return this._iServiceable;
    }

    module(){
        return this.config().module;
    }

    name(){
        return this._name;
    }

    package(){
        return this._package;
    }

    /**
     * @returns {Promise} which resolves to the startup result
     * @throws {Error}
     * Note:
     *  In order to start any service, one should first check that it doesn't already run, actually try yo start it,
     *  and then check that it gracefully runs.
     *  This function ONLY takes care of the actual startup.
     *  It is up to the caller to begin with a first check, and end with a later check.
     * Note:
     *  If the service says it is forkable, then the main application takes care of forking a new process
     *  before trying to start the service. We may so execute here in a child forked process
     */
    start(){
        IMsg.verbose( 'coreService.start()', 'name='+this._name );
        let promise = Promise.resolve( true )

        if( this._iServiceable && this._iServiceable.start && typeof this._iServiceable.start === 'function' ){
            promise = promise.then(() => { return this._iServiceable.start(); });
        }
        promise = promise
            .then(( res ) => { return Promise.resolve( res )});

        return promise;
    }

    /**
     * @param {Object} options
     *  -
     * @returns {Promise} which eventually resolves to an Object
     *  // the check-status.schema.json content
     *  reasons: []               array of error messages (one per found error), length=0 means that service is full ok, up and running
     *  startable: true|false     whether the service could be started, i.e. only if the runfile is empty or not present
     *  pids: []                  array of requested pids
     *  ports: []                 array of requested TCP ports number
     *  // other content from this function
     *  alive.pids: []            array of alive pids
     *  alive.ports: []           array of alive ports
     *  status: JSON object       full status returned by the service
     * @throws {Error}
     */
    status( options={} ){
        IMsg.verbose( 'coreService.status()', 'name='+this._name );
        const self = this;

        // the returned object which will resolve the promise
        let result = {};

        // using promises here happens to be rather conterproductive as the functions are already mainly used inside of Promises
        const _cinfo = function(){
            IMsg.info( ...arguments );
        }
        const _cerr = function(){
            result.reasons.push( ...arguments );
            IMsg.info( ...arguments );
        }

        // first ask the IServiceable to provide its own status check (must conform to check-status.schema.json)
        const _serviceablePromise = function(){
            //console.log( self._iServiceable );
            return self._iServiceable.getCheckStatus()
                .then(( res ) => {
                    result = { ...res };
                    result.alive = {
                        pids: [],
                        ports: []
                    };
                    return Promise.resolve( result );
                });
        }

        // check if this pid is alive, resolving with true|false
        const _pidAlivePromise = function( pid ){
            IMsg.verbose( 'coreService.status()._pidAlivePromise()', 'pid='+pid );
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
            IMsg.verbose( 'coreService.status()._portPingPromise()', 'port='+port );
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

        // request the service for its status, resolving with the status or false
        //  the returned status is expected to be conform to run-status.schema.json
        const _portStatusPromise = function( port ){
            if( !result.alive.ports.includes( port )){
                _cinfo( 'status not requested as port didn\'t answered to previous ping' );
                return Promise.resolve( false );
            } else {
                return new Promise(( resolve, reject ) => {
                    utils.tcpRequest( port, 'iz.status' )
                        .then(( res ) => {
                            let _answeredName = null;
                            let _answeredPids = [];
                            let _answeredClass = null;
                            let _errs = 0;
                            if( res ){
                                _answeredName = Object.keys( res.answer )[0];
                                _answeredPids = [ ...res.answer[_answeredName].pids ];
                                _answeredClass = res.answer[_answeredName].class;
                                // check the answered service name
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
                                    const _local = { service:_answeredName, pids:_answeredPids, class:_answeredClass };
                                    _cinfo( 'statusOf answers', _local );
                                    resolve( true );
                                }
                            } else {
                                _cerr( 'statusOf request rejected' );
                                resolve( false );
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
        promise = promise.then(() => { return _serviceablePromise() });
        promise = promise.then(() => {
            let subProms = Promise.resolve( true );
            result.pids.every(( pid ) => {
                IMsg.debug( 'coreService.status() has to check for pid='+pid );
                subProms = subProms.then(() => { return _pidAlivePromise( pid )});
                return true;
            });
            result.ports.every(( port ) => {
                IMsg.debug( 'coreService.status() has to check for port='+port );
                subProms = subProms.then(() => { return _portPingPromise( port )});
                subProms = subProms.then(() => { return _portStatusPromise( port )});
                return true;
            });
            return subProms;
        });
        // after our own cheks, ask the service itself
        if( this._iServiceable && this._iServiceable.status && typeof this._iServiceable.status === 'function' ){
            promise = promise.then(() => { return this._iServiceable.status(); });
        }
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
        let promise = Promise.resolve( true )

        if( this._iServiceable && this._iServiceable.stop && typeof this._iServiceable.stop === 'function' ){
            promise = promise.then(() => { return this._iServiceable.stop(); });
        }
        promise = promise
            .then(( res ) => { return Promise.resolve( res )});

        return promise;
    }
}
