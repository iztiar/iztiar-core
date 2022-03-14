/*
 * cli-list-installed.js
 *
 *  Display the list of installed plugins, along with their associated target module.
 *  Returns a Promise resolved with the array of the corresponding PackageJson objects.
 */
import { cliApplication, Logger, Msg  } from './index.js';

/**
 * @param {coreApi} api a coreApi instance
 * @param {Object} options 
 *  consoleLevel: defaulting to NORMAL
 * @returns {Promise} which resolves to an array of the PackageJson objects for the installed Iztiar modules
 */
export function cliListInstalled( api, options={} ){

    const _origLevel = Msg.consoleLevel();
    const _consoleLevel = Object.keys( options ).includes( 'consoleLevel' ) ? options.consoleLevel : _origLevel;
    if( _consoleLevel !== _origLevel ) Msg.consoleLevel( _consoleLevel );

    Msg.out( 'Listing installed Iztiar modules' );
    Msg.verbose( 'An Iztiar module is identified by its name; its target is qualified from package.json \'iztiar\' group' );
    
    const installedModules = api.pluginManager().getInstalled( api);

    let displayedMods = [];
    installedModules.every(( pck ) => {
        const group = pck.getIztiar() || {};
        displayedMods.push({
            module: pck.getName(),
            version: pck.getVersion(),
            description: pck.getDescription(),
            target: group.target || ''
        });
        return true;
    });
    if( displayedMods.length ){
        Msg.tabular( displayedMods, { prefix:'  ' });
    }
    const _msg = 'Found '+displayedMods.length+' installed module(s) targeting '+cliApplication.const.displayName+' family';
    Msg.out( _msg );
    Logger.info( _msg );

    if( _consoleLevel !== _origLevel ) Msg.consoleLevel( _origLevel );

    return Promise.resolve( installedModules );
}
