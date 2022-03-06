/*
 * cli-list-enabled.js
 *
 *  Display the list of enabled plugins which target this module.
 *  Returns a Promise resolved with the array of the corresponding PackageJson objects.
 */
import path from 'path';
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
            //console.log( 'org', _org, 'name', _name );
            result.installed.every(( it ) => {
                if( it.enabled && _allowed.includes( it.target )){
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
