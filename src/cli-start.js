/*
 * cli-start.js
 *
 *  Start the named service.
 * 
 *  Returns a Promise which eventually resolves with the service status.
 */
import { IMsg, coreApplication } from './imports.js';

/**
 * Start the named service
 * @param {coreApplication} app the application
 * @param {String} name the service name to be started
 * @param {Object} options 
 *  consoleLevel: defaulting to NORMAL
 * @returns {Promise} which resolves to the service status
 */
export function cliStart( app, name, options={} ){

    const _origLevel = IMsg.consoleLevel();
    const _consoleLevel = Object.keys( options ).includes( 'consoleLevel' ) ? options.consoleLevel : _origLevel;
    app.setConsoleLevel( _consoleLevel );

    IMsg.out( 'Starting '+name+' service' );

    const service = app.IPluginManager.byName( app, name );
    let _promise = Promise.resolve( true );
    if( service ){
        _promise = _promise
            .then(() => { return service.initialize( app ) })
            .then(( res ) => { return service.start() })
    }

    return _promise;
}
