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
    
    let pckArray = [];
    app.IPluginByPath.installed( app ).every(( pck ) => {
        const group = pck.getIztiar() || {};
        pckArray.push({
            name: pck.getFullName(),
            version: pck.getVersion(),
            description: pck.getDescription(),
            target: group.target || '',
            enabled: group.enabled || true
        });
        return true;
    });

    IMsg.tabular( pckArray, { prefix:'  ' });
    IMsg.out( pckArray.length+' found installed module(s) targeting '+coreApplication.const.displayName+' family' );

    app.setConsoleLevel( _origLevel );

    return Promise.resolve( pckArray );
}
