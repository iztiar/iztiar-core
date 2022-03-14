/*
 * IPluginManager interface
 */
import path from 'path';

import { cliApplication, coreService, PackageJson, utils } from './index.js';

export class IPluginManager {

    /* *** ***************************************************************************************
       *** The implementation API, i.e; the functions the implementation may want to implement ***
       *** *************************************************************************************** */

    /* *** ***************************************************************************************
       *** The public API, i.e; the API anyone may call to access the interface service        ***
       *** *************************************************************************************** */

    /**
     * @param {coreApi} api a coreApi instance
     * @param {String} name the name of the instance of the plugin
     * @returns {coreService|null} the named service
     */
    byName( api, name ){
        return this.byNameExt( api.config(), api.packet(), name );
    }

    /**
     * @param {coreConfig} config the filled application configuration
     * @param {PackageJson} packet the package.json of the main '@iztiar/iztiar-core' module
     * @param {String} name the name of the instance of the plugin
     * @returns {coreService|null} the named service
     */
    byNameExt( config, packet, name ){
        let found = null;
        const services = this.getEnabledExt( config, packet );
        services.every(( s ) => {
            if( s.name() === name ){
                found = s;
            }
            return found === null;
        })
        return found;
    }

    /**
     * @param {coreApi} api a coreApi instance
     * @returns {coreService[]} the array of enabled services which target this one
     * [-public API-]
     */
    getEnabled( api ){
        return this.getEnabledExt( api.config(), api.packet());
    }

    /**
     * @param {coreConfig} config the filled application configuration
     * @param {PackageJson} packet the package.json of the main '@iztiar/iztiar-core' module
     * @returns {coreService[]} the array of enabled services which target this one
     * [-public API-]
     */
    getEnabledExt( config, packet ){
        let result = [];
        const appPlugins = config.plugins();
        const thisName = packet.getName();
        const thisShortName = packet.getShortName();
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
                    const pck = this.getPackageExt( packet, appPlugins[id].module );
                    if( pck ){
                        const group = pck.getIztiar() || {};
                        const target = group.target || null;
                        if( target ){
                            if( target == thisName || target === thisShortName ){
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
     * @param {coreApi} api a coreApi instance
     * @returns {PackageJson[]} the array of installed modules of our Iztiar family (including this one)
     * [-public API-]
     */
    getInstalled( api ){
        const parentDir = path.dirname( api.packet().getDir());
        //const pckName = app.ICore.package().getShortName();
        //  new RegExp( '^(?!'+pckName+'$)' )
        const regex = [
            new RegExp( '^[^\.]' ),
            new RegExp( '^'+cliApplication.const.commonName+'-' )
        ];
        let result = [];
        utils.dirScanSync( parentDir, { type:'d', regex:regex }).every(( p ) => {
            result.push( new PackageJson( p ));
            return true;
        });
        return result;
    }

    /**
     * @param {coreApi} api a coreApi instance
     * @param {String} name
     * @returns {PackageJson|null} the PackageJson instance for the (installed) module
     * [-public API-]
     */
    getPackage( api, name ){
        return this.getPackageExt( api.packet(), name );
    }

    /**
     * @param {PackageJson} packet the package.json of the main '@iztiar/iztiar-core' module
     * @param {String} name
     * @returns {PackageJson|null} the PackageJson instance for the (installed) module
     * [-public API-]
     */
    getPackageExt( packet, name ){
        let pck = null;
        const _words = name.split( '/' );
        const _short = _words.length > 1 ? _words[1] : _words[0];
        const dir = path.join( path.dirname( packet.getDir()), _short );
        const fname = path.join( dir, 'package.json' );
        if( utils.fileExistsSync( fname )){
            pck = new PackageJson( dir );
        }
        return pck;
    }
}
