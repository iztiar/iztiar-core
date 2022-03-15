/*
 * IPluginManager interface
 */
import path from 'path';

import { featureCard, PackageJson, utils } from './index.js';

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
     * @returns {featureCard|null} the named service
     * [-public API-]
     */
    byName( api, name ){
        return this.byNameExt( api.config(), api.packet(), name );
    }

    /**
     * @param {coreConfig} config the filled application configuration
     * @param {PackageJson} packet the package.json of the main '@iztiar/iztiar-core' module
     * @param {String} name the name of the instance of the plugin
     * @returns {featureCard|null} the named service
     * [-public API-]
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
     * @returns {featureCard[]} the array of enabled services which target this one
     * [-public API-]
     */
    getEnabled( api ){
        return this.getEnabledExt( api.config(), api.packet());
    }

    /**
     * @param {coreConfig} config the filled application configuration
     * @param {PackageJson} packet the package.json of this main '@iztiar/iztiar-core' module
     * @param {String[]} targeting a list of desired targets (all if empty)
     * @returns {featureCard[]} the array of enabled services
     * [-public API-]
     */
    getEnabledExt( config, packet, targeting=[] ){
        let result = [];
        const configuredFeats = config.features();
        const thisName = packet.getName();
        const thisShortName = packet.getShortName();
        let _found = [];
        // examine the configured features to select a) installed modules b) core services
        Object.keys( configuredFeats ).every(( id ) => {
            const enabled = configuredFeats[id].enabled || true;
            if( enabled ){
                if( configuredFeats[id].module === 'core' ){
                    result.push( new featureCard( id, configuredFeats[id] ));
                } else if( _found.includes( configuredFeats[id].module )){
                    result.push( new featureCard( id, configuredFeats[id] ));
                } else {
                    const pck = this.getPackageExt( packet, configuredFeats[id].module );
                    if( pck ){
                        const pckGroup = pck.getIztiar() || {};
                        const pckTarget = pckGroup.target || null;
                        if( pckTarget ){
                            result.push( new featureCard( id, configuredFeats[id], pck ));
                            _found.push( configuredFeats[id].module );
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
     *  Rationale:
     *  - the package should be named '@iztiar/iztiar-xxxxxxxxxx'
     *    as a consequence, the npm package manager will install it besides of this '@iztiar/iztiar-core' module
     * [-public API-]
     */
    getInstalled( api ){
        const parentDir = path.dirname( api.packet().getDir());
        const regex = [
            new RegExp( '^[^\.]' ),
            new RegExp( '^'+api.commonName()+'-' )
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
     * @param {PackageJson} packet the package.json of this '@iztiar/iztiar-core' module
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
