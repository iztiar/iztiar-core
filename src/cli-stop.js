/*
 * cli-stop.js
 *
 *  Stop the named feature.
 * 
 *  Returns a Promise which eventually resolves with the feature status.
 */
import chalk from 'chalk';
import ps from 'ps';

import { IServiceable, featureCard, Msg, utils } from './index.js';

/**
 * Stop the named feature
 * @param {coreApi} api a coreApi instance
 * @param {String} name the feature name to be stopped
 * @param {Object} options 
 *  consoleLevel {String} defaulting to current level
 * @returns {Promise} which resolves to the feature status
 */
export function cliStop( api, name, options={} ){
    Msg.verbose( 'cliStop()', 'coreApi:', api, 'name='+name, 'options:', options );

    const _origLevel = Msg.consoleLevel();
    const _consoleLevel = Object.keys( options ).includes( 'consoleLevel' ) ? options.consoleLevel : _origLevel;
    if( _consoleLevel !== _origLevel ) Msg.consoleLevel( _consoleLevel );

    const feature = api.pluginManager().byName( api, name );

    if( !feature || !( feature instanceof featureCard )){
        Msg.error( 'cliStop() unknown feature: \''+name+'\'' );
        process.exitCode += 1;
        return Promise.resolve( false );
    }

    Msg.out( 'Stopping \''+name+'\' feature' );
    let result = {};

    const STAT = 'CheckStatus';
    const STOP = 'Stop';
    const KILL = 'KillProcess';
    const END = 'End'

    let _promise = Promise.resolve( true )
        .then(() => { return feature.initialize( api ); })
        .then(( iServiceable ) => {
            if( iServiceable && iServiceable instanceof IServiceable ){
                Msg.verbose( name+': iServiceable sucessfully initialized' );
                result.next = STAT;
            } else {
                Msg.verbose( name+': initialization failed' );
                result.next = END;
            }
        });

    // featureCard.status() promise resolves as { reasons, startable, pids, ports, status }
    //  we are only interested here to the 'startable' attribute which is only true if the JSON runfile is empty or not present
    const _checkStatus = function( res, expected ){
        Msg.debug( 'cliStop()._checkStatus()', 'next='+res.next, 'expected='+expected );
        if( res.next === STAT ){
            const _name = feature.name();
            return feature.status()
                .then(( status ) => {
                    return new Promise(( resolve, reject ) => {
                        if( expected ){
                            if( status.startable ){
                                Msg.out( chalk.green( 'Service is not running (fine). Gracefully exiting' ));
                                result.next = END;

                            } else if( status.reasons.length === 0 ){
                                Msg.info( 'Service \''+_name+'\' is running, is stoppable (fine)' );
                                result.next = STOP;

                            } else {
                                Msg.warn( 'Service is said running, but exhibits', status.reasons.length,'error message(s):' );
                                status.reasons.every(( m ) => {
                                    Msg.warn( ' '+m );
                                    return true;
                                })
                                result.next = STOP;
                            }
                        } else {
                            if( status.startable ){
                                Msg.out( chalk.green( 'Service(s) \''+_name+'\' successfully stopped.' ));
                                res.next = END;

                            } else {
                                Msg.warn( 'Unable to stop the feature:' );
                                status.reasons.every(( m ) => {
                                    Msg.warn( ' '+m );
                                    return true;
                                });
                                res.next = KILL;
                                process.exitCode += 1;
                            }
                        }
                        result.status = { ...status };
                        resolve( result );
                    });
                });
        } else {
            return Promise.resolve( res );
        }
    };

    // stop the feature if needed
    const _stopService = function( res ){
        Msg.debug( 'cliStart()._stopService()', 'next='+res.next );
        if( res.next === STOP ){
            Msg.debug( 'cliStop()._stopService()' );
            return feature.stop().then(() => { return Promise.resolve( res ); });
        } else {
            return Promise.resolve( res );
        }
    };

    // returns a Promise which resolves to true when the provided pids list no more exist at all
    //  i.e. when ps returns zero process
    const _countProcesses = function( pids ){
        //console.log( result );
        Msg.debug( 'cliStop()._countProcesses()', 'next='+result.next, 'pids='+pids );
        if( result.next === STOP ){
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
            return Promise.resolve( true );
        }
    };

    // if the timeout has expired, then sends a SIGKILL signal to the pids
    const _checkTimeout = function( res, pids ){
        Msg.debug( 'cliStart()._checkTimeout()', 'next='+res.next, 'pids:', pids );
        if( res.next === STOP ){
            return new Promise(( resolve, reject ) => {
                if( !res.waitFor && pids.length ){
                    pids.every(( p ) => {
                        Msg.verbose( 'cliStop().checkTimeout() killing process', p );
                        process.kill( p, 'SIGKILL' );
                        return true;
                    })
                    feature.iServiceable().killed();
                    res.next = STAT;
                    resolve( result );
                } else {
                    res.next = STAT;
                    resolve( result );
                }
            });
        } else {
            return Promise.resolve( res );
        }
    };

    _promise = _promise
        .then(() => { return _checkStatus( result, true ); })
        .then(() => { return _stopService( result ); })
        .then(() => { return utils.waitFor( result, _countProcesses, result.status.pids, 5*1000 ); })
        .then(() => { return _checkTimeout( result, result.status.pids ); })
        .then(() => { return _checkStatus( result, false ); })
        .then(() => {
            if( _consoleLevel !== _origLevel ) Msg.consoleLevel( _origLevel );
            return Promise.resolve( result );
        });

    return _promise;
}
