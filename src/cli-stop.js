/*
 * cli-stop.js
 *
 *  Stop the named service.
 * 
 *  Returns a Promise which eventually resolves with the service status.
 */
import chalk from 'chalk';
import ps from 'ps';

import { IServiceable, Msg, utils } from './index.js';

/**
 * Stop the named service
 * @param {coreApi} api a coreApi instance
 * @param {String} name the service name to be started
 * @param {Object} options 
 *  consoleLevel {String} defaulting to current level
 * @returns {Promise} which resolves to the service status
 */
export function cliStop( api, name, options={} ){

    const _origLevel = Msg.consoleLevel();
    const _consoleLevel = Object.keys( options ).includes( 'consoleLevel' ) ? options.consoleLevel : _origLevel;
    if( _consoleLevel !== _origLevel ) Msg.consoleLevel( _consoleLevel );

    Msg.out( 'Stopping \''+name+'\' service' );
    let result = {};

    // service.Initialize() must resolve with a IServiceable instance
    const _checkInitialize = function( res ){
        return IServiceable.isIServiceable( res )
            .then(( success ) => { result.iServiceable = success ?  { ...res } : null; });
    };

    // featureCard.status() promise resolves as { reasons, startable, pids, ports, status }
    //  we are only interested here to the 'startable' attribute which is only true if the JSON runfile is empty or not present
    const _checkStatus = function( res, expected ){
        if( res.iServiceable && ( !res.status || !res.status.startable )){
            Msg.debug( 'cliStop()._checkStatus()', 'expected='+expected );
            const _name = service.name();
            return service.status()
                .then(( status ) => {
                    return new Promise(( resolve, reject ) => {
                        if( expected ){
                            if( status.startable ){
                                Msg.out( chalk.green( 'Service is not running (fine). Gracefully exiting' ));
                                result.stoppable = false;

                            } else if( status.reasons.length === 0 ){
                                Msg.info( 'Service \''+_name+'\' is running, is stoppable (fine)' );
                                result.stoppable = true;

                            } else {
                                Msg.warn( 'Service is said running, but exhibits', status.reasons.length,'error message(s):' );
                                status.reasons.every(( m ) => {
                                    Msg.warn( ' '+m );
                                    return true;
                                })
                                result.stoppable = true;
                            }
                        } else {
                            if( status.startable ){
                                Msg.out( chalk.green( 'Service(s) \''+_name+'\' successfully stopped.' ));
                            } else {
                                Msg.warn( 'Unable to stop the service:' );
                                status.reasons.every(( m ) => {
                                    Msg.warn( ' '+m );
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
            Msg.debug( 'cliStop()._checkStatus() not run', 'iServiceable='+res.iServiceable, 'status='+res.status, 'startable='+res.status.startable );
            return Promise.resolve( result );
        }
    };

    // stop the service if needed
    const _stopService = function(){
        //console.log( result );
        if( result.iServiceable && result.stoppable ){
            Msg.debug( 'cliStop()._stopService()' );
            return service.stop().then(() => { return Promise.resolve( result ); });
        } else {
            Msg.debug( 'cliStop()._stopService() not run', 'iServiceable='+result.iServiceable, 'stoppable='+result.stoppable );
            return Promise.resolve( result );
        }
    };

    // returns a Promise which resolves to true when the provided pids list no more exist at all
    //  i.e. when ps returns zero process
    const _countProcesses = function( pids ){
        //console.log( result );
        if( result.iServiceable && result.stoppable ){
            Msg.debug( 'cliStop()._countProcesses()', 'pids='+pids );
            return new Promise(( resolve, reject ) => {
                if( pids.length ){
                    ps({ pid: pids })
                        .then(( success ) => {
                            Msg.debug( 'cliStop().countProcesses() ps resolves with', success );
                            resolve( success.length === 0 );
                        }, ( failure ) => {
                            Msg.debug( 'cliStop().countProcesses() ps failure', failure );
                            resolve( failure.length === 0 );
                        });
                } else {
                    resolve( true );
                }
            });
        } else {
            Msg.debug( 'cliStop()._countProcesses() not run', 'iServiceable='+result.iServiceable, 'stoppable='+result.stoppable );
            return Promise.resolve( true );
        }
    };

    // if the timeout has expired, then sends a SIGKILL signal to the pids
    const _checkTimeout = function( result, pids ){
        //console.log( result );
        if( result.iServiceable && result.stoppable ){
            Msg.debug( 'cliStop()._checkTimeout()', 'pids='+pids );
            return new Promise(( resolve, reject ) => {
                if( !result.waitFor && pids.length ){
                    pids.every(( p ) => {
                        Msg.verbose( 'cliStop().checkTimeout() killing process', p );
                        process.kill( p, 'SIGKILL' );
                        return true;
                    })
                    result.iServiceable.killed();
                    resolve( result );
                } else {
                    resolve( result );
                }
            });
        } else {
            Msg.debug( 'cliStop()._checkTimeout() not run', 'iServiceable='+result.iServiceable, 'stoppable='+result.stoppable );
            return Promise.resolve( result );
        }
    };

    const service = api.pluginManager().byName( api, name );
    let _promise = Promise.resolve( true );
    if( service ){
        _promise = _promise
            .then(() => { return service.initialize( api ); })
            .then(( res ) => { return _checkInitialize( res ); })
            .then(() => { return _checkStatus( result, true ); })
            .then(() => { return _stopService(); })
            .then(() => { return utils.waitFor( result, _countProcesses, result.status.pids, 5*1000 ); })
            .then(() => { return _checkTimeout( result, result.status.pids ); })
            .then(() => { return _checkStatus( result, false ); })
            .then(() => {
                if( _consoleLevel !== _origLevel ) Msg.consoleLevel( _origLevel );
                return Promise.resolve( result );
            });
    }

    return _promise;
}
