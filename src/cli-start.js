/*
 * cli-start.js
 *
 *  Start the named service.
 * 
 *  Returns a Promise which eventually resolves with the service status.
 */
import chalk from 'chalk';

import { IMsg, IServiceable, coreForkable, utils } from './index.js';

/**
 * Start the named service
 * @param {coreApplication} app the application
 * @param {String} name the service name to be started
 * @param {Object} options 
 *  consoleLevel {String} defaulting to current level
 *  args {String[]} arguments to pass to forked process, defaulting to process.argv
 * @returns {Promise} which resolves to the service status
 */
export function cliStart( app, name, options={} ){

    const _origLevel = app.IMsg.consoleLevel();
    const _consoleLevel = Object.keys( options ).includes( 'consoleLevel' ) ? options.consoleLevel : _origLevel;
    if( _consoleLevel !== _origLevel ) app.IMsg.consoleLevel( _consoleLevel );

    const _args = Object.keys( options ).includes( 'args' ) ? options.args : process.argv;

    const service = app.IPluginManager.byName( app.ICore, name );
    let _promise = Promise.resolve( true );

    if( service ){
        _promise = _promise.then(() => { return service.initialize( app.ICore ); });

        if( !coreForkable.forkedProcess()){

            IMsg.out( 'Starting \''+name+'\' service' );
            let ipcStartupReceived = false;
            let result = {};

            // service.Initialize() must resolve with a IServiceable instance
            const _checkInitialize = function( res ){
                return new Promise(( resolve, reject ) => {
                    if( res && res instanceof IServiceable ){
                        result.iServiceable = { ...res };
                    } else {
                        result.iServiceable = null;
                    }
                    resolve( result );
                });
            };

            // coreService.status() promise resolves as { reasons, startable, pids, ports, status }
            //  we are only interested here to the 'startable' attribute which is only true if the JSON runfile is empty or not present
            const _checkStatus = function( res, expected ){
                if( res.iServiceable && ( !res.status || res.status.startable )){
                    const _name = service.name();
                    return service.status()
                        .then(( status ) => {
                            return new Promise(( resolve, reject ) => {
                                if( expected ){
                                    if( status.startable ){
                                        IMsg.error( 'Unable to start the service' );
                                    } else {
                                        IMsg.out( chalk.green( 'Service(s) \''+_name+'\' successfully started' ));
                                    }
                                } else {
                                    if( status.startable ){
                                        IMsg.info( 'Service is not already running, is startable (fine)' );
                                    } else if( status.reasons.length === 0 ){
                                        IMsg.out( chalk.green( 'Service \''+_name+'\' is already running (fine). Gracefully exiting.' ));
                                    } else {
                                        IMsg.warn( 'Service is said running, but exhibits', status.reasons.length,'error message(s), is not startable' );
                                        status.reasons.every(( m ) => {
                                            IMsg.warn( ' '+m );
                                            return true;
                                        })
                                    }
                                }
                                res.status = { ...status };
                                resolve( res );
                            });
                        });
                } else {
                    return Promise.resolve( res );
                }
            };

            // resolves to the child process or to the startup result
            const _forkOrStart = function( res ){
                if( res.iServiceable && res.status.startable ){
                    return new Promise(( resolve, reject ) => {
                        if( service.isForkable()){
                            res.child = coreForkable.fork( service.name(), _ipcCallback, _args );
                            resolve( res );
                        } else {
                            service.start().then(() => { return Promise.resolve( res ); });
                        }
                    });
                } else {
                    return Promise.resolve( res );
                }
            };

            // + (main) MYNAME coreController successfully startup, listening on port 24001
            // + (MYNAME coreController) MYNAME-managed coreBroker successfully startup, listening on port 24002 (message bus on port 24003)
            // + (MYNAME coreController) ANOTHER (MYNAME-managed) coreController successfully startup, listening on port 24001
            // + (MYNAME coreController) ANOTHER-managed coreBroker successfully startup, listening on port 24001 (message bus on port 24003)
            const _ipcToConsole = function( messageData ){
                const _name = Object.keys( messageData )[0];
                const _runStatus = messageData[_name];
                let _msg = '';
                if( _runStatus.event === 'startup' ){
                    _msg += '(main)';
                    _msg += ' \''+_name+'\'';
                    _msg += ' '+( _runStatus.class || '(undefined class)' );
                    _msg += ' successfully startup, listening on port '+_runStatus.ports.join( ',' );
                } else {
                    _msg += 'unmanaged received event \''+_runStatus.event+'\'';
                }
                IMsg.info( _msg );
            };

            const _ipcCallback = function( child, message ){
                IMsg.debug( '_ipcCallback()', message );
                _ipcToConsole( message );
                service.iServiceable().onStartupConfirmed( message );
                ipcStartupReceived = true;
            };

            // wait until having received the IPC message
            const _waitIpc = function( res ){
                if( res.iServiceable && res.status.startable ){
                    return new Promise(( resolve, reject ) => {
                        resolve( ipcStartupReceived );
                    });
                } else {
                    return Promise.resolve( true );
                }
            }

            // emit a warning if we didn't have received the IPC startup message
            const _checkTimeout = function( res ){
                if( res.iServiceable && res.status.startable ){
                    if( !res.waitFor ){
                        IMsg.warn( 'Timeout expired before the reception of the startup IPC message' );
                    }
                }
                return Promise.resolve( res );
            }

            _promise = _promise
                .then(( res ) => { return _checkInitialize( res ); })
                .then(() => { return _checkStatus( result, false ); })
                .then(() => { return _forkOrStart( result ); })
                .then(() => { return utils.waitFor( result, _waitIpc, result, 5*1000 ); })
                .then(() => { return _checkTimeout( result ); })
                .then(() => { return _checkStatus( result, true ); })
                .then(() => {
                    if( _consoleLevel !== _origLevel ) app.IMsg.consoleLevel( _origLevel );
                    return Promise.resolve( result );
                });

        } else {
            _promise = _promise
                .then(() => { return service.start(); })
                .then(() => {
                    if( _consoleLevel !== _origLevel ) app.IMsg.consoleLevel( _origLevel );
                    return Promise.resolve( result );
                });
        }
    }

    return _promise;
}
