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
 *  Returns a Promise resolved with the array of the corresponding Plugin objects.
 */
import { ILogger, IMsg, coreApplication } from './index.js';

import { cliListInstalled } from './cli-list-installed.js';

/**
 * 
 * @param {coreApplication} app the application
 * @param {Object} options 
 *  consoleLevel: defaulting to NORMAL
 * @returns 
 */
export function cliListEnabled( app, options={} ){

    const _origLevel = app.IMsg.consoleLevel();
    const _consoleLevel = Object.keys( options ).includes( 'consoleLevel' ) ? options.consoleLevel : _origLevel;
    if( _consoleLevel !== _origLevel ) app.IMsg.consoleLevel( _consoleLevel );

    IMsg.out( 'Listing enabled Iztiar services for this module' );
    IMsg.verbose( 'An Iztiar module is identified by its name; its target is qualified from package.json \'iztiar\' group' );
    
    const _promise = cliListInstalled( app, { consoleLevel:'QUIET' })
        .then(( res ) => {
            const services = app.IPluginManager.enabled( app, res );
            let sceDisplay = [];
            services.every(( s ) => {
                const conf = s.config();
                const enabled = conf.enabled || true;   // is always true here
                const pck = s.package();
                const group = pck ? pck.getIztiar() : null;
                sceDisplay.push({
                    name: s.name(),
                    module: pck ? pck.getFullName() : 'core',
                    version: pck ? pck.getVersion() : '',
                    description: pck ? pck.getDescription() : '',
                    enabled: enabled ? 'true':'false',
                    target: group ? group.target : ''
                });
                return true;
            });
            if( sceDisplay.length ){
                app.IMsg.tabular( sceDisplay, { prefix:'  ' });
            }
            const _msg = 'Found '+sceDisplay.length+' enabled plugin(s) targeting \''+app.ICoreApi.package().getFullName()+'\'';
            IMsg.out( _msg );
            ILogger.info( _msg );

            if( _consoleLevel !== _origLevel ) app.IMsg.consoleLevel( _origLevel );
            return Promise.resolve( services );
        });

    return _promise;
}
