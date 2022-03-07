/*
 * IPluginManager interface
 */
import path from 'path';

import { coreApplication, corePlugin, PackageJson, utils } from './imports.js';

export class IPluginManager {

    /* *** ***************************************************************************************
       *** The implementation API, i.e; the functions the implementation may want to implement ***
       *** *************************************************************************************** */

    /* *** ***************************************************************************************
       *** The public API, i.e; the API anyone may call to access the interface service        ***
       *** *************************************************************************************** */

    /**
     * @param {coreApplication} app 
     * @param {String} name the name of the instance of the plugin
     * @returns {corePlugin|null} the named plugin
     *  config: the configuration read from the main configuration file
     *  package: the PackageJson object
     */
    byName( app, name ){
        let found = null;
        const plugins = this.enabled( app, this.installed( app ));
        plugins.every(( p ) => {
            if( p.name() === name ){
                found = p;
            }
            return found === null;
        })
        return found;
    }

    /**
     * @param {coreApplication} app
     * @param {PackageJson[]} installed the installed Iztiar modules
     * @returns {corePlugin[]} the array of enabled plugins which target this one
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
                let _found = [];
                Object.keys( appPlugins ).every(( id ) => {
                    const enabled = appPlugins[id].enabled || true;
                    if( enabled && ( appPlugins[id].module === pck.getFullName() || appPlugins[id].module === pck.getName())){
                        result.push( new corePlugin( id, appPlugins[id], pck ));
                    }
                    return true;
                });
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
