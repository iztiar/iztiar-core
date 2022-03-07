/*
 * cli-list-installed.js
 *
 *  Display the list of installed plugins, along with their associated target module.
 *  Returns a Promise resolved with the array of the corresponding PackageJson objects.
 */
import path from 'path';

import { IMsg, coreApplication } from './imports.js';

/**
 * 
 * @param {coreApplication} app the application
 * @param {Object} options 
 *  consoleLevel: defaulting to NORMAL
 * @returns 
 */
export function cliListInstalled( app, options={} ){

    const _origLevel = IMsg.consoleLevel();
    const _consoleLevel = Object.keys( options ).includes( 'consoleLevel' ) ? options.consoleLevel : _origLevel;
    app.setConsoleLevel( _consoleLevel );

    IMsg.out( 'Listing installed Iztiar modules' );
    IMsg.verbose( 'An Iztiar module is identified by its name; its target is qualified from package.json \'iztiar\' group' );
    
    const pckArray = app.IPluginManager.installed( app );
    const pckDisplay = app.IPluginManager.display( pckArray );

    if( pckDisplay.length ){
        IMsg.tabular( pckDisplay, { prefix:'  ' });
    }
    IMsg.out( 'Found '+pckDisplay.length+' installed module(s) targeting '+coreApplication.const.displayName+' family' );

    app.setConsoleLevel( _origLevel );

    return Promise.resolve( pckArray );
}
