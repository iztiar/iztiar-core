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

    IMsg.out( 'Listing enabled Iztiar modules' );
    IMsg.verbose( 'An Iztiar module is identified by its name; its target is qualified from package.json \'iztiar\' group' );
    
    let result = {};

    // a promise which resolves with the list of (candidates) installed plugins
    const _installedPromise = function(){
        return cliListInstalled( app, { consoleLevel:'QUIET' });
    };

    // a promise which resolves with the list of PackageJson enabled objects which target this module
    //  the target may be specified as '@organization/package' or just as 'package'
    const _enabledPromise = function( res ){
        return new Promise(( resolve, reject ) => {
            result.installed = [ ...res ];
            result.enabled = [];
            const _org = '@'+coreApplication.const.commonName;
            const _name = app.getPackage().getName();
            result.target = _org+'/'+_name;
            const _allowed = [
                result.target,
                _name
            ];
            const _configured = app.config().plugins;
            //console.log( 'org', _org, 'name', _name );
            // for each found installed plugin, do we have a non-disabled entry in the config ?
            // the name may be specified either as '@organization/package' or just as 'package'
            result.installed.every(( it ) => {
                const _itw = it.name.split( '/' );
                const _itorg = _itw.length === 1 ? '' : _itw[0].substring( 1 );
                const _itname = _itw.length === 1 ? _itw[0] : _itw[1];
                if( it.enabled && _allowed.includes( it.target )){
                    let _found = null;
                    _configured.every(( o ) => {
                        const _pwords = o.name.split( '/' );
                        const _porg = _pwords.length === 1 ? '' : _pwords[0].substring( 1 );
                        const _pname = _pwords.length === 1 ? _pwords[0] : _pwords[1];
                        return true;
                    });
                    result.enabled.push( it );
                }
                return true;
            });
            resolve( result );
        });
    };

    // resulting promise
    const _resultPromise = function(){
        return new Promise(( resolve, reject ) => {
            IMsg.tabular( result.enabled, { prefix:'  ' });
            IMsg.out( result.enabled.length+' found enabled module(s) targeting \''+result.target+'\'' );
            app.setConsoleLevel( _origLevel );
            resolve( result.enabled );
        });
    };

    let _promise = Promise.resolve( true )
        .then(() => { return _installedPromise()})
        .then(( res ) => { return _enabledPromise( res ) })
        .then(() => { return _resultPromise()});

    return _promise;
}
