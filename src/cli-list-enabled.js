/*
 * cli-list-enabled.js
 *
 *  Display the list of enabled (loadable and startable) plugins which target this module.
 * 
 *  As a reminder, in order to be startable, a module must:
 *  - have a package.json file (as each and every ESM) whose:
 *      > 'name' value starts with 'iztiar-'
 *      > has a 'iztiar' group, with
 *          >> a 'target' key which addresses this module, both '@iztiar/iztiar-core' or 'iztiar-core' being allowed
 *  - have an entry by its name in the 'plugins' array of the iztiar.json application configuration file, with keys:
 *      > the 'name' of the module
 *      > maybe an 'enabled' key, whose value resolves to true
 * 
 *  Returns a Promise resolved with the array of the corresponding PackageJson objects.
 */
import { cliListInstalled } from './cli-list-installed.js';

import { IMsg, coreApplication, PackageJson, utils } from './imports.js';

/**
 * 
 * @param {coreApplication} app the application
 * @param {Object} options 
 *  consoleLevel: defaulting to NORMAL
 * @returns 
 */
export function cliListEnabled( app, options={} ){

    const _origLevel = IMsg.consoleLevel();
    const _consoleLevel = Object.keys( options ).includes( 'consoleLevel' ) ? options.consoleLevel : _origLevel;
    app.setConsoleLevel( _consoleLevel );

    IMsg.out( 'Listing enabled Iztiar plugins for this module' );
    IMsg.verbose( 'An Iztiar module is identified by its name; its target is qualified from package.json \'iztiar\' group' );
    
    const _promise = cliListInstalled( app, { consoleLevel:'QUIET' })
        .then(( res ) => {
            const pckArray = app.IPluginManager.enabled( app, res );
            const pckDisplay = app.IPluginManager.display( pckArray );

            if( pckDisplay.length ){
                IMsg.tabular( pckDisplay, { prefix:'  ' });
            }
            IMsg.out( 'Found '+pckDisplay.length+' enabled plugin(s) targeting \''+app.getPackage().getFullName()+'\'' );

            app.setConsoleLevel( _origLevel );
            return Promise.resolve( pckArray );
        });

    return _promise;
}
