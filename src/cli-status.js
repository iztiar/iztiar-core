/*
 * cli-status.js
 *
 *  Returns the status of the named service.
 * 
 *  Returns a Promise which eventually resolves with the service status.
 */
import chalk from 'chalk';

import { IMsg } from './index.js';

/**
 * Get the status of the named service
 * @param {coreApplication} app the application
 * @param {String} name the service name to be started
 * @param {Object} options 
 *  consoleLevel {String} defaulting to current level
 * @returns {Promise} which resolves to the service status
 */
export function cliStatus( app, name, options={} ){

    const _origLevel = app.IMsg.consoleLevel();
    const _consoleLevel = Object.keys( options ).includes( 'consoleLevel' ) ? options.consoleLevel : _origLevel;
    if( _consoleLevel !== _origLevel ) app.IMsg.consoleLevel( _consoleLevel );

    IMsg.out( 'Getting the status of \''+name+'\' service' );

    const service = app.IPluginManager.byName( app.ICoreApi, name );
    let _promise = Promise.resolve( true );

    if( service ){
        _promise = _promise
            .then(() => { return service.initialize( app.ICoreApi ); })
            .then(( res ) => { return service.status(); })
            .then(( res ) => {

                if( res.reasons.length  ){
                    IMsg.warn( '\''+name+'\' service exhibits', res.reasons.length, 'error message(s)' );
                    IMsg.warn( ' You may want use --force-stop option to remove the falsy \''+name+'\' from your run directory' );
                    process.exitCode += 1;

                } else if( !res.pids.requested.length && !res.ports.requested.length ){
                    let _msg = 'Service \''+name+'\' doesn\'t run';
                    if( res.startable ){
                        _msg += ', is startable (fine)';
                    }
                    IMsg.out( _msg );

                } else {
                    IMsg.out( chalk.green( 'Service \''+name+'\' is confirmed up and running' ));
                }

                if( _consoleLevel !== _origLevel ) app.IMsg.consoleLevel( _origLevel );
                return Promise.resolve( res );
            })
    }

    return _promise;
}
