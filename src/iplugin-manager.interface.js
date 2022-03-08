/*
 * IPluginManager interface
 */
import path from 'path';
import { IMsg } from './imsg.interface.js';

import { coreApplication, coreService, PackageJson, utils } from './index.js';

export class IPluginManager {

    /* *** ***************************************************************************************
       *** The implementation API, i.e; the functions the implementation may want to implement ***
       *** *************************************************************************************** */

    /* *** ***************************************************************************************
       *** The public API, i.e; the API anyone may call to access the interface service        ***
       *** *************************************************************************************** */

    /**
     * @param {ICoreApi} api
     * @param {String} name the name of the instance of the plugin
     * @returns {coreService|null} the named service
     */
    byName( api, name ){
        let found = null;
        const services = this.enabled( api, this.installed( api ));
        services.every(( s ) => {
            if( s.name() === name ){
                found = s;
            }
            return found === null;
        })
        return found;
    }

    /**
     * @param {ICoreApi} api
     * @param {PackageJson[]} installed the installed Iztiar modules
     * @returns {coreService[]} the array of enabled services which target this one
     * [-public API-]
     */
    /*
    enabled( api, installed ){
        let result = [];
        const thisFullName = api.package().getFullName();
        const thisShortName = api.package().getName();
        const appPlugins = api.config().plugins();
        // filter the found installed plugins to select those which are configured to provide a service
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
        // among the configured services, also select those which are provided by the core itself
        Object.keys( appPlugins ).every(( id ) => {
            const enabled = appPlugins[id].enabled || true;
            if( enabled && appPlugins[id].module === 'core' ){
                result.push( new coreService( id, appPlugins[id] ));
            }
            return true;
        });
        return result;
    }
    */

    /**
     * @param {ICoreApi} api
     * @returns {coreService[]} the array of enabled services which target this one
     * [-public API-]
     */
    getEnabled( api ){
        let result = [];
        const appPlugins = api.config().plugins();
        const thisFullName = api.package().getFullName();
        const thisShortName = api.package().getName();
        let _found = [];
        // examine the configured services to select a) installed modules b) core services
        Object.keys( appPlugins ).every(( id ) => {
            const enabled = appPlugins[id].enabled || true;
            if( enabled ){
                if( appPlugins[id].module === 'core' ){
                    result.push( new coreService( id, appPlugins[id] ));
                } else if( _found.includes( appPlugins[id].module )){
                    result.push( new coreService( id, appPlugins[id] ));
                } else {
                    const pck = this.getPackage( api, appPlugins[id].module );
                    if( pck ){
                        const group = pck.getIztiar() || {};
                        const target = group.target || null;
                        if( target ){
                            if( target == thisFullName || target === thisShortName ){
                                result.push( new coreService( id, appPlugins[id], pck ));
                                _found.push( appPlugins[id].module );
                            }
                        }
                    }
                }
            }
            return true;
        });
        return result;
    }

    /**
     * @param {ICoreApi} api
     * @returns {PackageJson[]} the array of installed modules of our Iztiar family (including this one)
     * [-public API-]
     */
    getInstalled( api ){
        const parentDir = path.dirname( api.package().getDir());
        //const pckName = app.ICoreApi.package().getName();
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

    /**
     * @param {ICoreApi} api
     * @param {String} name
     * @returns {PackageJson|null} the PackageJson instance for the (installed) module
     * [-public API-]
     */
    getPackage( api, name ){
        let pck = null;
        const _words = name.split( '/' );
        const _short = _words.length > 1 ? _words[1] : _words[0];
        const dir = path.join( path.dirname( api.package().getDir()), _short );
        const fname = path.join( dir, 'package.json' );
        if( utils.fileExistsSync( fname )){
            pck = new PackageJson( dir );
        }
        return pck;
    }
}
