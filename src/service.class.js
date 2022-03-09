/*
 * coreService class
 *
 *  A coreService acts as a proxy to an Iztiar module which:
 *  - provides a named service
 *  - is configured and not disabled in the main application configuration file
 *  - is installed.
 */
import path from 'path';

import { IMsg, IServiceable, coreController, utils } from './index.js';

export class coreService {

    // from constructor
    _name = null;
    _config = null;
    _package = null;

    // provided by initialization() to the plugin
    _api = null;

    // got from initoalization() from the plugin
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

    api(){
        return this._api;
    }

    class(){
        return this.config().class || ( this._iServiceable ? this._iServiceable.class() : '(undefined class)' );
    }

    config(){
        return this._config;
    }

    /**
     * dynamically load and initialize the default function of the plugin
     * @param {ICoreApi} api an instance of the ICoreApi interface
     * @returns {Promise} which resolves to the IServiceable which must be returned by the default function
     * @throws {Error} if IServiceable is not set
     */
    initialize( api ){
        this._api = api;
        const self = this;
        const pck = self.package();
        let _promise = Promise.resolve( true );

        // external package to be dynamically imported
        // the package must define a default export which must be a function which must return a IServiceable instance
        if( pck ){
            const _importPromise = function(){
                return new Promise(( resolve, reject ) => {
                    const main = path.join( pck.getDir(), pck.getMain());
                    import( main ).then(( res ) => {
                        if( typeof res.default === 'function' ){
                            return resolve( self._iServiceable = res.default( api, self ));
                        } else {
                            return reject( 'coreService.initialize() \''+this.name()+'\' doesn\' export a default function' );
                        }
                    });
                });
            }
            _promise = _promise.then(() => { return _importPromise(); });

        // the service is expected to be provided by core
        } else if( self.config().module === 'core' ){
            const _class = self.config().class;
            if( _class === 'coreController' ){
                //console.log( new coreController( api, self ));
                _promise = _promise.then(() => {
                    return Promise.resolve( self._iServiceable = new coreController( api, self ).IServiceable );
                });
            } else {
                _promise = _promise.then(() => {
                    return Promise.reject( 'coreService.initialize() unknown class \''+self.config().class+'\'' );
                });
            }
        // or we don't know where to get the service from
        } else {
            _promise = _promise.then(() => {
                return Promise.reject( 'coreService.initialize() unknown module \''+self.config().module+'\'' );
            });
        }
        // at the end, either we have rejected the promise, ot it must be resolved with a IServiceable
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
     *  May be null before initialization
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
     *  consoleLevel {String}
     * @returns {Promise} which eventually resolves to an Object
     *  reasons: []               array of error messages (one per found error), length=0 means that service is full ok, up and running
     *  startable: true|false     whether the service could be started, i.e. only if the runfile is empty or not present
     *  pids.requested: []        array of requested pids
     *  pids.alive: []            array of alive pids
     *  ports.requested: []       array of requested TCP ports number
     *  ports.alive: []           array of alive ports
     *  status: JSON object       full status returned by the service
     * @throws {Error}
     */
    status( options={} ){
        const self = this;

        // the returned object which will resolve the promise
        let result = {
            reasons: [],
            startable: true,
            pids: {
                requested: [],
                alive: []
            },
            ports: {
                requested: [],
                alive: []
            },
            status:{}
        };

        //  using promises here happens to be rather conterproductive as the functions are already mainly used inside of Promises
        const _cinfo = function(){
            IMsg.info( '  ', ...arguments );
        }
        const _cerr = function(){
            result.reasons.push( ...arguments );
            Object.values( arguments ).every(( m ) => { IMsg.error( '  '+m )});
        }

        // ask the service for its pids to be checked, resolving with result
        const _pidsListPromise = function(){
            return new Promise(( resolve, reject ) => {
                if( self._iServiceable.expectedPids && typeof self._iServiceable.expectedPids === 'function' ){
                    self._iServiceable.expectedPids().then(( res ) => {
                        _cinfo( 'Expected PIDs', res, '('+res.length+')' );
                        result.pids.requested = [ ...res ];
                        resolve( result );
                    });
                } else {
                    resolve( result );
                }
            });
        };

        // check if this pid is alive, resolving with true|false
        const _pidAlivePromise = function( pid ){
            return new Promise(( resolve, reject ) => {
                utils.isAlivePid( pid )
                    .then(( res ) => {
                        if( res ){
                            result.pids.alive.push( pid );
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

        // ask the service for its ports to be checked, resolving with result
        const _portsListPromise = function(){
            return new Promise(( resolve, reject ) => {
                if( self._iServiceable.expectedPorts && typeof self._iServiceable.expectedPorts === 'function' ){
                    self._iServiceable.expectedPorts().then(( res ) => {
                            _cinfo( 'Expected opened ports', res, '('+res.length+')' );
                            result.ports.requested = [ ...res ];
                            resolve( result );
                        });
                } else {
                    resolve( result );
                }
            });
        };

        // ping this port, resolving with true|false
        const _portPingPromise = function( port ){
            return new Promise(( resolve, reject ) => {
                utils.isAlivePort( port )
                    .then(( res ) => {
                        if( res ){
                            result.ports.alive.push( port );
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
        const _portStatusPromise = function( port ){
            if( !result.ports.alive.includes( port )){
                IMsg.warn( 'status not requested as port didn\'t answered to previous ping' );
                return Promise.resolve( false );
            } else {
                return new Promise(( resolve, reject ) => {
                    utils.tcpRequest( port, 'iz.status' )
                        .then(( res ) => {
                            let _answeredName = null;
                            let _answeredPid = 0;
                            let _answeredManager = null;
                            let _errs = 0;
                            if( res ){
                                /*
                                _answeredName = Object.keys( res )[0];
                                _answeredPid = res[_answeredName].pid;
                                _answeredManager = res[_answeredName].manager;
                                if( _answeredName !== forkable ){
                                    _errs += 1;
                                    _cerr( 'statusOf answers from '+_answeredName+' while '+forkable+' was expected' );
                                }
                                if( _answeredName === Iztiar.c.forkable.BROKER && _answeredManager !== name ){
                                    _errs += 1;
                                    _cerr( 'statusOf answers with \''+_answeredManager+'\' manager while \''+name+'\' was expected' );
                                }
                                if( _answeredPid !== _runProcs[forkable].pid ){
                                    _errs += 1;
                                    _cerr( 'statusOf answers from pid='+_answeredPid+' while pid='+_runProcs[forkable].pid+' was expected' );
                                }
                                if( _errs ){
                                    resolve( false );
                                } else {
                                    _checkResult.status[forkable] = res[_answeredName];
                                    //console.log( res[_answeredName] );
                                    const _child = Object.keys( res )[0];
                                    const _local = { forkable:_answeredName, pid:res[_answeredName].pid, manager:_answeredManager };
                                    _cinfo( '  statusOf answers', verbose ? res[_answeredName] : _local );
                                    resolve( true );
                                }
                                */
                                _cinfo( 'statusOf answers', res );
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
        promise = promise.then(() => { return _pidsListPromise() });
        promise = promise.then(() => {
            result.pids.requested.every(( pid ) => {
                promise = promise.then(() => { return _pidAlivePromise( pid )});
                return true;
            });
        });
        promise = promise.then(() => { return _portsListPromise() });
        promise = promise.then(() => {
            result.ports.requested.every(( port ) => {
                promise = promise.then(() => { return _portPingPromise( port )});
                promise = promise.then(() => { return _portStatusPromise( port )});
                return true;
            });
        });
        // after our own cheks, ask the service itself
        if( this._iServiceable && this._iServiceable.status && typeof this._iServiceable.status === 'function' ){
            promise = promise.then(() => { return this._iServiceable.status( this.api(), result ) });
        }
        promise = promise.then(() => { return Promise.resolve( result )});
        return promise;
    }

    /**
     * @returns {Promise} which resolves to the stop result
     * @throws {Error}
     * Note:
     *  In order to stop any service, one should first check that it is actually running, actually try yo stop it,
     *  and then check that it no more runs and is gracefully stopped.
     *  This function ONLY takes care of the actual stop.
     *  It is up to the caller to begin with a first check, and end with a later check.
     */
    stop(){
        let promise = Promise.resolve( true )

        if( this._iServiceable && this._iServiceable.stop && typeof this._iServiceable.stop === 'function' ){
            promise = promise.then(() => { return this._iServiceable.stop( this.api()) });
        }
        promise = promise
            .then(( res ) => { return Promise.resolve( res )});

        return promise;
    }
}
