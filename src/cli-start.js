/*
 * cli-start.js
 *
 *  Start the named feature.
 * 
 *  Returns a Promise which eventually resolves with the feature status.
 */
import chalk from 'chalk';

import { IForkable, IServiceable, featureCard, Msg, utils } from './index.js';

/**
 * Start the named feature
 * @param {coreApi} api a coreApi instance
 * @param {String} name the feature name to be started
 * @param {Object} options 
 *  consoleLevel {String} defaulting to current level
 *  args {String[]} arguments to pass to forked process, defaulting to process.argv
 * @returns {Promise} which resolves to the feature status
 */
export function cliStart( api, name, options={} ){
    Msg.verbose( 'cliStart()', 'coreApi:', api, 'name='+name, 'options:', options );

    const _origLevel = Msg.consoleLevel();
    const _consoleLevel = Object.keys( options ).includes( 'consoleLevel' ) ? options.consoleLevel : _origLevel;
    if( _consoleLevel !== _origLevel ) Msg.consoleLevel( _consoleLevel );

    const _args = Object.keys( options ).includes( 'args' ) ? options.args : process.argv;

    const feature = api.pluginManager().byName( api, name );

    if( !feature || !( feature instanceof featureCard )){
        Msg.error( 'cliStart() unknown feature: \''+name+'\'' );
        process.exitCode += 1;
        return Promise.resolve( false );
    }

    let result = {};

    const STAT = 'CheckStatus';
    const START = 'ForkOrStart';
    const KILL = 'KillProcess';
    const END = 'End'

    let _promise = Promise.resolve( true )
        .then(() => { return feature.initialize( api ); })
        .then(( iServiceable ) => {
            if( iServiceable && iServiceable instanceof IServiceable ){
                Msg.verbose( name+' iServiceable sucessfully initialized' );
                result.next = STAT;
            } else {
                Msg.verbose( name+' initialization failed' );
                result.next = END;
            }
        });

    if( IForkable.forkedProcess()){
        _promise = _promise
            .then(() => { return feature.start(); });

    } else {
        Msg.out( 'Starting \''+name+'\' feature' );

        // coreService.status() promise resolves as { reasons, startable, pids, ports, status }
        //  we are only interested here to the 'startable' attribute which is only true if the JSON runfile is empty or not present
        const _checkStatus = function( res, expected ){
            Msg.debug( 'cliStart()._checkStatus()', 'next='+res.next, 'expected='+expected );
            if( res.next === STAT ){
                const _name = feature.name();
                return feature.status()
                    .then(( status ) => {
                        return new Promise(( resolve, reject ) => {
                            if( expected ){
                                if( status.startable ){
                                    Msg.error( 'Unable to start the feature' );
                                    res.next = END;
                                    process.exitCode += 1;

                                } else if( status.reasons.length > 0 ){
                                    Msg.warn( 'Service is said started, but exhibits', status.reasons.length,'error message(s)' );
                                    status.reasons.every(( m ) => {
                                        Msg.warn( ' '+m );
                                        return true;
                                    })
                                    res.next = KILL;
                                    process.exitCode += 1;

                                } else {
                                    res.started = true;
                                    Msg.out( chalk.green( 'Service(s) \''+_name+'\' successfully started' ));
                                    const hello = feature.iServiceable().get( 'helloMessage' );
                                    if( hello ){
                                        hello.then(( res ) => { Msg.out( chalk.green( 'Greetings message is « '+res+' »' )); });
                                    }
                                    res.next = END;
                                }
                            } else {
                                if( status.startable ){
                                    Msg.info( 'Service is not already running, is startable (fine)' );
                                    res.next = START;

                                } else if( status.reasons.length === 0 ){
                                    Msg.out( chalk.green( 'Service \''+_name+'\' is already running (fine). Gracefully exiting.' ));
                                    res.next = END;

                                } else {
                                    Msg.warn( 'Service is said running, but exhibits', status.reasons.length,'error message(s), is not startable' );
                                    status.reasons.every(( m ) => {
                                        Msg.warn( ' '+m );
                                        return true;
                                    })
                                    res.next = KILL;
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
            Msg.debug( 'cliStart()._forkOrStart()', 'next='+res.next );
            if( res.next === START ){
                return new Promise(( resolve, reject ) => {
                    if( feature.isForkable()){
                        res.child = IForkable.fork( feature.name(), _ipcCallback, _args );
                        resolve( res );
                    } else {
                        feature.start().then(() => { return Promise.resolve( res ); });
                    }
                    res.ipcStartupReceived = false;
                });
            } else {
                return Promise.resolve( res );
            }
        };

        // + (main) MYNAME coreController successfully startup, listening on port 24001
        // + (MYNAME coreController) MYNAME-managed coreBroker successfully startup, listening on port 24002 (message bus on port 24003)
        // + (MYNAME coreController) ANOTHER (MYNAME-managed) coreController successfully startup, listening on port 24001
        // + (MYNAME coreController) ANOTHER-managed coreBroker successfully startup, listening on port 24001 (message bus on port 24003)
        const _ipcToConsole = function( ipcMessage ){
            //console.log( ipcMessage );
            const _name = Object.keys( ipcMessage )[0];
            const _runStatus = ipcMessage[_name];
            let _msg = '';
            if( _runStatus.event === 'startup' ){
                _msg += '(main)';
                _msg += ' \''+_name+'\'';
                _msg += ' '+( _runStatus.class || '(undefined class)' );
                _msg += ' successfully startup, listening on port(s) '+_runStatus.ports.join( ',' );
            } else {
                _msg += 'unmanaged received event \''+_runStatus.event+'\'';
            }
            Msg.info( _msg );
        };

        const _ipcCallback = function( child, ipcMessage ){
            Msg.debug( '_ipcCallback()', ipcMessage );
            _ipcToConsole( ipcMessage );
            result.ipcStartupReceived = true;
        };

        // wait until having received the IPC message
        const _waitIpc = function( res ){
            if( res.next === START ){
                return new Promise(( resolve, reject ) => {
                    resolve( res.ipcStartupReceived );
                });
            } else {
                return Promise.resolve( true );
            }
        }

        // emit a warning if we didn't have received the IPC startup message
        const _checkTimeout = function( res ){
            Msg.debug( 'cliStart()._checkTimeout()', 'next='+res.next );
            if( res.next === START ){
                if( !res.waitFor ){
                    Msg.warn( 'Timeout expired before the reception of the startup IPC message' );
                }
                res.next = STAT;
            }
            return Promise.resolve( res );
        }

        // kill the child pid if the startup is not ok
        const _killIfNeeded = function( res ){
            Msg.debug( 'cliStart()._killIfNeeded()', 'next='+res.next );
            if( res.next === KILL ){
                if( result.child ){
                    Msg.verbose( 'cliStart().killIfNeeded() killing process', result.child.pid );
                    process.kill( result.child.pid, 'SIGKILL' );
                    feature.iServiceable().killed();
                }
            }
            return Promise.resolve( res );
        }

        _promise = _promise
            .then(() => { return _checkStatus( result, false ); })
            .then(() => { return _forkOrStart( result ); })
            .then(() => { return utils.waitFor( result, _waitIpc, result, 5*1000 ); })
            .then(() => { return _checkTimeout( result ); })
            .then(() => { return _checkStatus( result, true ); })
            .then(() => { return _killIfNeeded( result ); });
    }

    // in all cases, restore the original console level
    _promise = _promise
        .then(() => {
            if( _consoleLevel !== _origLevel ) Msg.consoleLevel( _origLevel );
            return Promise.resolve( result );
        });

    return _promise;
}
