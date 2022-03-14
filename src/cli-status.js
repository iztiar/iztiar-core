/*
 * cli-status.js
 * 
 *  Returns a Promise which eventually resolves with the service status.
 */
import chalk from 'chalk';

import { IServiceable, Msg } from './index.js';

/**
 * Get the status of the named service
 * @param {coreApi} api a coreApi instance
 * @param {String} name the service name to be started
 * @param {Object} options 
 *  consoleLevel {String} defaulting to current level
 * @returns {Promise} which resolves to the service status
 */
export function cliStatus( api, name, options={} ){

    const _origLevel = Msg.consoleLevel();
    const _consoleLevel = Object.keys( options ).includes( 'consoleLevel' ) ? options.consoleLevel : _origLevel;
    if( _consoleLevel !== _origLevel ) Msg.consoleLevel( _consoleLevel );

    Msg.out( 'Getting the status of \''+name+'\' service' );

    const service = api.pluginManager().byName( api, name );
    let _promise = Promise.resolve( true );
    let result = {};

    // service.Initialize() must resolve with a IServiceable instance
    const _checkInitialize = function( res ){
        return IServiceable.successfullyInitialized( res )
            .then(( success ) => { result.iServiceable = success ?  { ...res } : null; });
    };

    if( service ){
        _promise = _promise
            .then(() => { return service.initialize( api ); })
            .then(( res ) => { return _checkInitialize( res ); })
            .then(( res ) => { return service.status(); })
            .then(( res ) => {

                if( res.startable ){
                    Msg.out( 'Service doesn\'t run, is startable' );
                
                } else if( res.reasons.length  ){
                    Msg.warn( '\''+name+'\' service is said running, but exhibits', res.reasons.length, 'error message(s)' );
                    Msg.warn( ' You may want use --force-stop option to remove the falsy \''+name+'\' from your run directory' );
                    process.exitCode += 1;

                } else {
                    Msg.out( chalk.green( 'Service \''+name+'\' is confirmed up and running' ));
                    const hello = result.iServiceable.helloMessage();
                    if( hello ){
                        Msg.out( chalk.green( 'Greetings message is « '+hello+' »' ));
                    }
                }

                if( _consoleLevel !== _origLevel ) Msg.consoleLevel( _origLevel );
                return Promise.resolve( res );
            })
    }

    return _promise;
}
