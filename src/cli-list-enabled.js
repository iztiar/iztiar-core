/*
 * cli-list-enabled.js
 *
 *  Display the list of enabled (loadable and startable) plugins which target this module.
 * 
 *  As a reminder, in order to be startable, a module must:
 *  - have a package.json file (as each and every ESM) whose:
 *      > 'name' value starts with 'iztiar-'
 *      > has a 'iztiar' group, with
 *          >> a 'targets' key which addresses this module, both '@iztiar/iztiar-core' or 'iztiar-core' being allowed
 *  - have an entry by its name in the 'plugins' array of the iztiar.json application configuration file, with keys:
 *      > the 'name' of the module
 *      > maybe an 'enabled' key, whose value resolves to true
 * 
 *  Returns a Promise resolved with the array of the corresponding Plugin objects.
 */
import { cliApplication, Logger, Msg } from './index.js';

/**
 * @param {coreApi} api a coreApi instance
 * @param {Object} options 
 *  consoleLevel: defaulting to NORMAL
 * @returns {Promise} which resolves to an array of featureCard enabled services
 */
export function cliListEnabled( api, options={} ){

    const _origLevel = Msg.consoleLevel();
    const _consoleLevel = Object.keys( options ).includes( 'consoleLevel' ) ? options.consoleLevel : _origLevel;
    if( _consoleLevel !== _origLevel ) Msg.consoleLevel( _consoleLevel );

    Msg.out( 'Listing enabled Iztiar services for this module' );
    Msg.verbose( 'An Iztiar module is identified by its name; its target(s) is(are) qualified from package.json \'iztiar\' group' );
    
    const features = api.pluginManager().getEnabled( api );
    let displayedCards = [];

    features.every(( c ) => {
        let pck = c.packet();
        if( !pck ){
            pck = api.packet();
        }
        displayedCards.push({
            name: c.name(),
            module: c.module(),
            version: pck.getVersion(),
            description: pck.getDescription(),
            enabled: c.enabled() ? 'true':'false'
        });
        return true;
    });

    if( displayedCards.length ){
        Msg.tabular( displayedCards, { prefix:'  ' });
    }
    const _msg = 'Found '+features.length+' enabled feature(s)';
    Msg.out( _msg );
    Logger.info( _msg );

    if( _consoleLevel !== _origLevel ) Msg.consoleLevel( _origLevel );
    return Promise.resolve( features );
}
