/*
 * IPluginManager interface
 */
import path from 'path';

import { coreApplication, coreService, PackageJson, utils } from './index.js';

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
     * @returns {coreService|null} the named service
     */
    byName( app, name ){
        let found = null;
        const services = this.enabled( app, this.installed( app ));
        services.every(( s ) => {
            if( s.name() === name ){
                found = s;
            }
            return found === null;
        })
        return found;
    }

    /**
     * @param {coreApplication} app
     * @param {PackageJson[]} installed the installed Iztiar modules
     * @returns {coreService[]} the array of enabled services which target this one
     * [-public API-]
     */
    enabled( app, installed ){
        let result = [];
        const thisFullName = app.package().getFullName();
        const thisShortName = app.package().getName();
        const appPlugins = app.config().plugins;
        installed.every(( pck ) => {
            const group = pck.getIztiar();
            if( group.target === thisFullName || group.target === thisShortName ){
                let _found = [];
                Object.keys( appPlugins ).every(( id ) => {
                    const enabled = appPlugins[id].enabled || true;
                    if( enabled && ( appPlugins[id].module === pck.getFullName() || appPlugins[id].module === pck.getName())){
                        result.push( new coreService( id, appPlugins[id], pck ));
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
        const parentDir = path.dirname( app.package().getDir());
        //const pckName = app.package().getName();
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
