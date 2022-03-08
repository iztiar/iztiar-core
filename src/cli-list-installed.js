/*
 * cli-list-installed.js
 *
 *  Display the list of installed plugins, along with their associated target module.
 *  Returns a Promise resolved with the array of the corresponding PackageJson objects.
 */
import { ILogger } from './ilogger.interface.js';
import { IMsg, coreApplication } from './index.js';

/**
 * 
 * @param {coreApplication} app the application
 * @param {Object} options 
 *  consoleLevel: defaulting to NORMAL
 * @returns 
 */
export function cliListInstalled( app, options={} ){

    const _origLevel = app.IMsg.consoleLevel();
    const _consoleLevel = Object.keys( options ).includes( 'consoleLevel' ) ? options.consoleLevel : _origLevel;
    app.setConsoleLevel( _consoleLevel );

    IMsg.out( 'Listing installed Iztiar modules' );
    IMsg.verbose( 'An Iztiar module is identified by its name; its target is qualified from package.json \'iztiar\' group' );
    
    const pckInstalled = app.IPluginManager.installed( app );

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

    app.setConsoleLevel( _origLevel );

    return Promise.resolve( pckInstalled );
}
