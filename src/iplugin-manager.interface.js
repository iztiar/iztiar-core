/*
 * IPluginManager interface
 */
import path from 'path';

import { coreApplication, PackageJson, utils } from './imports.js';

export class IPluginManager {

    /* *** ***************************************************************************************
       *** The implementation API, i.e; the functions the implementation may want to implement ***
       *** *************************************************************************************** */

    /* *** ***************************************************************************************
       *** The public API, i.e; the API anyone may call to access the interface service        ***
       *** *************************************************************************************** */

    /**
     * @param {PackageJson[]} plugins the selected plugins
     * @returns {PackageJson[]} the array to be displayed
     * [-public API-]
     */
    display( plugins ){
        let _displayArray = [];
        plugins.every(( pck ) => {
            const group = pck.getIztiar() || {};
            _displayArray.push({
                name: pck.getFullName(),
                version: pck.getVersion(),
                description: pck.getDescription(),
                target: group.target || '',
                enabled: group.enabled || true
            });
            return true;
        });
        return _displayArray;
    }

    /**
     * @param {coreApplication} app
     * @param {PackageJson[]} installed the installed Iztiar modules
     * @returns {PackageJson[]} the array of enabled plugins which target this one
     * [-public API-]
     */
    enabled( app, installed ){
        let result = [];
        const thisFullName = app.getPackage().getFullName();
        const thisShortName = app.getPackage().getName();
        const appPlugins = app.config().plugins;
        installed.every(( pck ) => {
            const group = pck.getIztiar();
            if( group.target === thisFullName || group.target === thisShortName ){
                let _found = null;
                Object.keys( appPlugins ).every(( id ) => {
                    const enabled = appPlugins[id].enabled || true;
                    if( enabled && ( appPlugins[id].module === pck.getFullName() || appPlugins[id].module === pck.getName())){
                        _found = pck;
                    }
                    return _found === null;
                });
                if( _found ){
                    result.push( _found );
                }
            }
            return true;
        });
        return result;
    }

    /**
     * @param {coreApplication} app
     * @returns {PackageJson[]} the array of installed modules of our Iztiar family
     * [-public API-]
     */
    installed( app ){
        const parentDir = path.dirname( app.getPackage().getDir());
        //const pckName = app.getPackage().getName();
        //  new RegExp( '^(?!'+pckName+'$)' )
        const regex = [
            new RegExp( '^[^\.]' ),
            new RegExp( '^'+coreApplication.const.commonName+'-' )
        ];
        let result = [];
        utils.dirScanSync( parentDir, { type:'d', regex:regex }).every(( p ) => {
            result.push( new PackageJson( p ));
            return true;
        });
        return result;
    }
}
