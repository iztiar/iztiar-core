/*
 * cli-status.js
 *
 *  Returns the status of the named service.
 * 
 *  Returns a Promise which eventually resolves with the service status.
 */
import { IMsg } from './index.js';

/**
 * Get the status of the named service
 * @param {coreApplication} app the application
 * @param {String} name the service name to be started
 * @param {Object} options 
 *  consoleLevel: defaulting to NORMAL
 * @returns {Promise} which resolves to the service status
 */
export function cliStatus( app, name, options={} ){

    const _origLevel = app.IMsg.consoleLevel();
    const _consoleLevel = Object.keys( options ).includes( 'consoleLevel' ) ? options.consoleLevel : _origLevel;
    if( _consoleLevel !== _origLevel ) app.IMsg.consoleLevel( _consoleLevel );

    IMsg.out( 'Getting the status of '+name+' service' );

    const service = app.IPluginManager.byName( app, name );
    let _promise = Promise.resolve( true );

    if( service ){
        _promise = _promise
            .then(() => { return service.initialize( app.ICoreApi ); })
            .then(( res ) => { return service.status(); })
            .then(( res ) => {
                if( _consoleLevel !== _origLevel ) app.IMsg.consoleLevel( _origLevel );
                return Promise.resolve( res );
            })
    }

    return _promise;
}
