/*
 * coreService class
 *
 *  A coreService acts as a proxy to an Iztiar module which:
 *  - provides a named service
 *  - is configured and not disabled in the main application configuration file
 *  - is installed.
 */
import path from 'path';

import { IMsg, utils } from './index.js';

export class coreService {

    // from constructor
    _name = null;
    _config = null;
    _package = null;

    // initialization
    _api = null;

    // from service
    _defaultFn = null;
    _defaultResult = null;

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
     * @param {ICoreApi} api an instance of the ICopeApi interface
     * @returns {Promise} which resolves to the default function
     */
    initialize( api ){
        this._api = api;
        const pck = this.package();
        if( pck ){
            const main = path.join( this.package().getDir(), this.package().getMain());
            return import( main ).then(( res ) => {
                this._defaultFn = res.default;
                this._defaultResult = this._defaultFn( app, this );
                return Promise.resolve( this._defaultFn );
            });
        } else {
            return Promise.resolve( true )
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
        if( !this._defaultResult ){
            throw new Error( 'dynamically loaded plugin initialization didn\'t provide anything' );
        }
        if( !this._defaultResult.start || typeof this._defaultResult.start !== 'function' ){
            throw new Error( 'dynamically loaded plugin doesn\'t provide start() command' );
        }
        this._defaultResult.start( this._defaultResult );
    }

    /**
     * @param {coreConfig} appConfig the filled application configuration
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
    status( appConfig, options={} ){
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
        // the returned promise
        let promise = Promise.resolve( true );

        IMsg.out( 'Examining \''+this.name()+'\' service' );

        //  using promises here happens to be rather conterproductive as the functions are already mainly used inside of Promises
        const _cinfo = function(){
            if( IMsg.consoleLevel() >= Iztiar.c.verbose.INFO ){ console.log( ...arguments )};
        }
        const _cerr = function(){
            result.reasons.push( ...arguments );
            Object.values( arguments ).every(( m ) => { IMsg.error( '  '+m )});
        }

        // ask the service for its pids to be checked, resolving with result
        const _pidsListPromise = function(){
            return new Promise(( resolve, reject ) => {
                if( this._defaultResult.expectedPids && typeof this._defaultResult.expectedPids === 'function' ){
                    this._defaultResult.expectedPids().then(( res ) => {
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
                            _cinfo( '  pid='+pid+' is alive', _local );
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
                if( this._defaultResult.expectedPorts && typeof this._defaultResult.expectedPorts === 'function' ){
                    this._defaultResult.expectedPorts().then(( res ) => {
                            checkResult.ports.requested = [ ...res ];
                            resolve( checkResult );
                        });
                } else {
                    resolve( checkResult );
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
                            _cinfo( '  port='+port+' answers', res );
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

    }

    /**
     * @param {string} name the name of the service controller
     * @param {JSON|null} json the content of the JSON runfile
     * @param {boolean} withConsole whether display the actions to the console, or run in batch mode (no display, default)
     * @returns {Promise} a promise which will eventually resolves with an Object as {}
     * Note:
     *  Most of the done checks are asynchronous, and are so implemented as Promises.
     *  Because we want to be able to use this same function to display the global status to the console,
     *  we have to take care of sequentializing the displays of messages, running checks, and their results.
     *  As a consequence, all actions are implemented as Promises, and dynamically chained here.
     */
     static checkServiceWithJson( name, json, withConsole=false ){
        msg.debug( 'coreForkable.checkServiceWithJson()', 'name='+name );
        const _origLevel = msg.consoleLevel();
        if( !withConsole ){
            msg.consoleLevel( 0 );
        }
        const verbose = _origLevel >= Iztiar.c.verbose.VERBOSE;
        //console.log( 'origLevel='+_origLevel, 'Iztiar.c.verbose.VERBOSE='+Iztiar.c.verbose.VERBOSE, 'verbose='+verbose );


        // if name is invalid, just stop here
        if( name === 'ALL' ){
            _cerr( coreError.e.NAME_ALL_INVALID );
            _checkResult.startable = false;
            _promise = _promise.then(() => { return Promise.resolve( _checkResult )});

        // the runfile content is empty or is not present: the only error case where the service is startable
        } else if( !json || !Object.keys( json ).length ){
            _cerr( coreError.e.RUNFILE_NOTFOUNDOREMPTY );
            _checkResult.startable = true;
            _promise = _promise.then(() => { return Promise.resolve( _checkResult )});

        // else there is some things to check...
        } else {
            _checkResult.startable = false;
            const _processes = coreRunfile.processesFromJson( json );
            //msg.out( _processes );
            // get { errs: [], procs: { forkable: { name, pid, port }}} or error_message_string in processes.errs array
            _processes.errs.every(( m ) => { _cerr( m )});
            const _runProcs = _processes.procs;

            // just display the title for each forkable
            const _displayPromise = function( forkable ){
                return new Promise(( resolve, reject ) => {
                    msg.out( ' '+chalk.blue( forkable ), _runProcs[forkable] );
                    resolve( true );
                });
            };

            // local functions defined here to have access to _runProcs variable

            // let chain and check
            for( const _forkable in _runProcs ){
                //msg.out( _forkable );
                _promise = _promise
                    .then(() => { return _displayPromise( _forkable )})
                    .then(() => { return _pidPromise( _forkable, _runProcs[_forkable].pid )})
                    .then(() => { return _portPromise( _forkable, _runProcs[_forkable].port )})
                    .then(() => { return _statusPromise( _forkable, _runProcs[_forkable].port )});
            }
        }

        _promise = _promise.then(() => {
            msg.consoleLevel( _origLevel );
            return Promise.resolve( _checkResult )
        });

        return _promise;
    }

    /**
     * @returns {Promise} which resolves to the service status
     * @throws {Error}
     */
    stop(){
        if( !this._defaultResult ){
            throw new Error( 'dynamically loaded plugin initialization didn\'t provide anything' );
        }
        if( !this._defaultResult.stop || typeof this._defaultResult.stop !== 'function' ){
            throw new Error( 'dynamically loaded plugin doesn\'t provide stop() command' );
        }
        this._defaultResult.stop();
    }
}
