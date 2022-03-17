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

    const _addDisplayed = function( pck, target, i ){
        displayedMods.push({
            module: i ? '' : pck.getName(),
            version: i ? '' : pck.getVersion(),
            description: i ? '' : pck.getDescription(),
            targets: target || ''
        });
    };

    installedModules.every(( pck ) => {
        const group = pck.getIztiar() || {};
        const targets = group && group.targets ? group.targets : [];
        if( targets.length ){
            for( let i=0 ; i<targets.length ; ++i ){
                _addDisplayed( pck, targets[i], i );
            }
        } else {
            _addDisplayed( pck );
        }
        return true;
    });

    if( displayedMods.length ){
        Msg.tabular( displayedMods, { prefix:'  ' });
    }
    const _msg = 'Found '+installedModules.length+' installed module(s) targeting '+cliApplication.const.displayName+' family';
    Msg.out( _msg );
    Logger.info( _msg );

    if( _consoleLevel !== _origLevel ) Msg.consoleLevel( _origLevel );

    return Promise.resolve( installedModules );
}
