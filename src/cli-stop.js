/*
 * cli-stop.js
 *
 *  Stop the named service.
 * 
 *  Returns a Promise which eventually resolves with the service status.
 */
import chalk from 'chalk';
import ps from 'ps';

import { IMsg, IServiceable, utils } from './index.js';

/**
 * Stop the named service
 * @param {coreApplication} app the application
 * @param {String} name the service name to be started
 * @param {Object} options 
 *  consoleLevel {String} defaulting to current level
 * @returns {Promise} which resolves to the service status
 */
export function cliStop( app, name, options={} ){

    const _origLevel = app.IMsg.consoleLevel();
    const _consoleLevel = Object.keys( options ).includes( 'consoleLevel' ) ? options.consoleLevel : _origLevel;
    if( _consoleLevel !== _origLevel ) app.IMsg.consoleLevel( _consoleLevel );

    IMsg.out( 'Stopping \''+name+'\' service' );
    let result = {};

    // service.Initialize() must resolve with a IServiceable instance
    const _checkInitialize = function( res ){
        IMsg.debug( 'cliStop()._checkInitialize()' );
        return new Promise(( resolve, reject ) => {
            if( res && res instanceof IServiceable ){
                result.iServiceable = { ...res };
                IMsg.verbose( 'cliStop() iServiceable instance successfully checked' );
            } else {
                result.iServiceable = null;
                IMsg.verbose( 'cliStop() iServiceable instance is null: erroneous service initialization' );
            }
            resolve( result );
        });
    };

    // coreService.status() promise resolves as { reasons, startable, pids, ports, status }
    //  we are only interested here to the 'startable' attribute which is only true if the JSON runfile is empty or not present
    const _checkStatus = function( res, expected ){
        if( res.iServiceable && ( !res.status || !res.status.startable )){
            IMsg.debug( 'cliStop()._checkStatus()', 'expected='+expected );
            const _name = service.name();
            return service.status()
                .then(( status ) => {
                    return new Promise(( resolve, reject ) => {
                        if( expected ){
                            if( status.startable ){
                                IMsg.out( chalk.green( 'Service is not running (fine). Gracefully exiting' ));
                                result.stoppable = false;

                            } else if( status.reasons.length === 0 ){
                                IMsg.info( 'Service \''+_name+'\' is running, is stoppable (fine)' );
                                result.stoppable = true;

                            } else {
                                IMsg.warn( 'Service is said running, but exhibits', status.reasons.length,'error message(s):' );
                                status.reasons.every(( m ) => {
                                    IMsg.warn( ' '+m );
                                    return true;
                                })
                                result.stoppable = true;
                            }
                        } else {
                            if( status.startable ){
                                IMsg.out( chalk.green( 'Service(s) \''+_name+'\' successfully stopped.' ));
                            } else {
                                IMsg.warn( 'Unable to stop the service:' );
                                status.reasons.every(( m ) => {
                                    IMsg.warn( ' '+m );
                                    return true;
                                });
                                process.exitCode += 1;
                            }
                        }
                        result.status = { ...status };
                        resolve( result );
                    });
                });
        } else {
            IMsg.debug( 'cliStop()._checkStatus() not run', 'iServiceable='+res.iServiceable, 'status='+res.status, 'startable='+res.status.startable );
            return Promise.resolve( result );
        }
    };

    // stop the service if needed
    const _stopService = function(){
        //console.log( result );
        if( result.iServiceable && result.stoppable ){
            IMsg.debug( 'cliStop()._stopService()' );
            return service.stop().then(() => { return Promise.resolve( result ); });
        } else {
            IMsg.debug( 'cliStop()._stopService() not run', 'iServiceable='+result.iServiceable, 'stoppable='+result.stoppable );
            return Promise.resolve( result );
        }
    };

    // returns a Promise which resolves to true when the provided pids list no more exist at all
    //  i.e. when ps returns zero process
    const _countProcesses = function( pids ){
        //console.log( result );
        if( result.iServiceable && result.stoppable ){
            IMsg.debug( 'cliStop()._countProcesses()', 'pids='+pids );
            return new Promise(( resolve, reject ) => {
                if( pids.length ){
                    ps({ pid: pids })
                        .then(( success ) => {
                            IMsg.debug( 'cliStop().countProcesses() ps resolves with', success );
                            resolve( success.length === 0 );
                        }, ( failure ) => {
                            IMsg.debug( 'cliStop().countProcesses() ps failure', failure );
                            resolve( failure.length === 0 );
                        });
                } else {
                    resolve( true );
                }
            });
        } else {
            IMsg.debug( 'cliStop()._countProcesses() not run', 'iServiceable='+result.iServiceable, 'stoppable='+result.stoppable );
            return Promise.resolve( true );
        }
    };

    // if the timeout has expired, then sends a SIGKILL signal to the pids
    const _checkTimeout = function( result, pids ){
        //console.log( result );
        if( result.iServiceable && result.stoppable ){
            IMsg.debug( 'cliStop()._checkTimeout()', 'pids='+pids );
            return new Promise(( resolve, reject ) => {
                if( !result.waitFor && pids.length ){
                    pids.every(( p ) => {
                        IMsg.verbose( 'cliStop()._checkTimeout() killing process', p );
                        process.kill( p, 'SIGKILL' );
                        result.iServiceable.cleanupAfterKill();
                        return true;
                    })
                    resolve( result );
                } else {
                    resolve( result );
                }
            });
        } else {
            IMsg.debug( 'cliStop()._checkTimeout() not run', 'iServiceable='+result.iServiceable, 'stoppable='+result.stoppable );
            return Promise.resolve( result );
        }
    };

    const service = app.IPluginManager.byName( app, name );
    let _promise = Promise.resolve( true );
    if( service ){
        _promise = _promise
            .then(() => { return service.initialize( app ); })
            .then(( res ) => { return _checkInitialize( res ); })
            .then(() => { return _checkStatus( result, true ); })
            .then(() => { return _stopService(); })
            .then(() => { return utils.waitFor( result, _countProcesses, result.status.pids, 5*1000 ); })
            .then(() => { return _checkTimeout( result, result.status.pids ); })
            .then(() => { return _checkStatus( result, false ); })
            .then(() => {
                if( _consoleLevel !== _origLevel ) app.IMsg.consoleLevel( _origLevel );
                return Promise.resolve( result );
            });
    }

    return _promise;
}
