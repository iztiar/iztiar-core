/*
 * cli-list-installed.js
 *
 *  Display the list of installed plugins, along with their associated target module.
 *  Returns a Promise resolved with the array of the corresponding PackageJson objects.
 */
import path from 'path';

import { IMsg, coreApplication, PackageJson, utils } from './imports.js';

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
    
    let result = {};

    // a promise which resolves with a list of path to plugins which belongs to the Iztiar family
    //  (minus this one)
    const _scanPromise = function( app ){
        return new Promise(( resolve, reject ) => {
            const parentDir = path.dirname( app.getPackage().getDir());
            result.name = app.getPackage().getName();
            const regex = [
                new RegExp( '^[^\.]' ),
                new RegExp( '^'+coreApplication.const.commonName+'-' ),
                new RegExp( '^(?!'+result.name+'$)' )
            ];
            result.scanned = utils.dirScanSync( parentDir, { type:'d', regex:regex });
            //console.log( result.scanned );
            result.packages = {};
            result.pckArray = [];
            resolve( result );
        });
    };

    // a promise which resolves with the PackageJson object of a module
    //  and whether the module targets this one
    const _targetPromise = function( dir ){
        return new Promise(( resolve, reject ) => {
            //console.log( 'evaluating', dir );
            const pck = new PackageJson( dir );
            const name = pck.getName();
            result.packages[name] = { package: pck };
            const iztiar = pck.getIztiar();
            result.packages[name].target = iztiar && iztiar.targets ? iztiar.targets : '';
            //console.log( result.packages );
            resolve( result );
        });
    };

    const _resultPromise = function(){
        return new Promise(( resolve, reject ) => {
            let _count = 0;
            Object.keys( result.packages ).every(( name ) => {
                const pck = result.packages[name].package;
                let _res = {
                    name: name,
                    version: pck.getVersion(),
                    description: pck.getDescription(),
                    target: result.packages[name].target
                };
                result.pckArray.push( _res );
                _count += 1;
                return true;
            })
            IMsg.tabular( result.pckArray, { prefix:'  ' });
            IMsg.out( _count+' found installed modules targeting '+coreApplication.const.displayName+' family' );
            app.setConsoleLevel( _origLevel );
            resolve( result.pckArray );
        });
    };

    let _promise = Promise.resolve( true )
        .then(() => { return _scanPromise( app )})
        .then(( res ) => {
            let _p = Promise.resolve( true );
            res.scanned.every(( dir ) => {
                //console.log( 'dir='+dir );
                _p = _p.then(() => { return _targetPromise( dir )});
                return true;
            });
            return _p;
        })
        .then(() => { return _resultPromise()});

    return _promise;
}
