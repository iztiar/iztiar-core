/*
 * cli-list-installed.js
 *
 *  Display the list of installed plugins, along with their associated target module.
 *  Returns a Promise resolved with the array of the corresponding PackageJson objects.
 */
import { ILogger, IMsg, coreApplication } from './index.js';

/**
 * 
 * @param {coreApplication} app the application
 * @param {Object} options 
 *  consoleLevel: defaulting to NORMAL
 * @returns {Promise} which resolves to an array of the PackageJson objects for the installed Iztiar modules
 */
export function cliListInstalled( app, options={} ){

    const _origLevel = app.IMsg.consoleLevel();
    const _consoleLevel = Object.keys( options ).includes( 'consoleLevel' ) ? options.consoleLevel : _origLevel;
    if( _consoleLevel !== _origLevel ) app.IMsg.consoleLevel( _consoleLevel );

    IMsg.out( 'Listing installed Iztiar modules' );
    IMsg.verbose( 'An Iztiar module is identified by its name; its target is qualified from package.json \'iztiar\' group' );
    
    const pckInstalled = app.IPluginManager.getInstalled( app );

    let pckDisplay = [];
    pckInstalled.every(( pck ) => {
        const group = pck.getIztiar() || {};
        pckDisplay.push({
            module: pck.getFullName(),
            version: pck.getVersion(),
            description: pck.getDescription(),
            target: group.target || ''
        });
        return true;
    });
    if( pckDisplay.length ){
        app.IMsg.tabular( pckDisplay, { prefix:'  ' });
    }
    const _msg = 'Found '+pckDisplay.length+' installed module(s) targeting '+coreApplication.const.displayName+' family';
    IMsg.out( _msg );
    ILogger.info( _msg );

    if( _consoleLevel !== _origLevel ) app.IMsg.consoleLevel( _origLevel );

    return Promise.resolve( pckInstalled );
}
