/*
 * coreService class
 *
 *  A coreService acts as a proxy to an Iztiar module which:
 *  - provides a named service
 *  - is configured and not disabled in the main application configuration file
 *  - is installed.
 */
import path from 'path';

import { IMsg, coreController, utils } from './index.js';

export class coreService {

    // from constructor
    _name = null;
    _config = null;
    _package = null;

    // initialization
    _api = null;

    // from service
    _defaultFn = null;
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

    config(){
        return this._config;
    }

    /**
     * dynamically load and initialize the default function of the plugin
     * @param {ICoreApi} api an instance of the ICoreApi interface
     * @returns {Promise} which resolves to the IServiceable which must be returned by the default function
     */
    initialize( api ){
        this._api = api;
        const pck = this.package();
        if( pck ){
            const main = path.join( this.package().getDir(), this.package().getMain());
            return import( main ).then(( res ) => {
                this._defaultFn = res.default;
                if( typeof this._defaultFn === 'function' ){
                    return Promise.resolve( this._iServiceable = this._defaultFn( api, this ));
                } else {
                    return Promise.reject( 'coreService.initialize() \''+this.name()+'\' doesn\' export a default function' );
                }
            });
        } else if( this.config().module === 'core' ){
            switch( this.config().class ){
                case 'coreController':
                    return Promise.resolve( this._iServiceable = new coreController( api, this ).IServiceable );
                default:
                    return Promise.reject( 'coreService.initialize() unknown class \''+this.config().class+'\'' );
            }
        } else {
            return Promise.reject( 'coreService.initialize() unknown module \''+this.config().module+'\'' );
        }
    }

    name(){
        return this._name;
    }

    package(){
        return this._package;
    }

    /**
     * @returns {Promise} which resolves to the service status
     * @throws {Error}
     */
    start(){
        if( !this._iServiceable ){
            throw new Error( 'dynamically loaded plugin initialization didn\'t provide anything' );
        }
        if( !this._iServiceable.start || typeof this._iServiceable.start !== 'function' ){
            throw new Error( 'dynamically loaded plugin doesn\'t provide start() command' );
        }
        this._iServiceable.start( this._iServiceable );
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
        promise = promise.then(() => { return Promise.resolve( result )});
        return promise;
    }

    /**
     * @returns {Promise} which resolves to the service status
     * @throws {Error}
     */
    stop(){
        if( !this._iServiceable ){
            throw new Error( 'dynamically loaded plugin initialization didn\'t provide anything' );
        }
        if( !this._iServiceable.stop || typeof this._iServiceable.stop !== 'function' ){
            throw new Error( 'dynamically loaded plugin doesn\'t provide stop() command' );
        }
        this._iServiceable.stop();
    }
}
