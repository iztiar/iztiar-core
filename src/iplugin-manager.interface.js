/*
 * IPluginManager interface
 */
import path from 'path';

import { IFeatureProvider, featureCard, Msg, PackageJson, utils } from './index.js';

export class IPluginManager {

    // cache of installed plugins
    _installed = [];

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
     * @param {Object} instance the implementation instance
     * @param {String} name the searched add-on feature
     * @param {Object} conf the configuration of the searched add-on
     *  If unset, then the full filled configuration is returned in the promise
     * @returns {Promise} which resolves to the filled configuration of the add-on or null
     * [-public API-]
     */
    getAddonConfig( instance, name, conf ){
        if( !Object.keys( conf ).includes( 'module' )){
            Msg.error( 'IPluginManager.getAddonConfig() '+name+' configuration doesn\'t include module' );
            return Promise.resolve( null );
        }
        let _feat = null;
        const api = instance.IFeatureProvider.api();
        const feature = instance.IFeatureProvider.feature();
        this.getInstalled( api ).every(( pck ) => {
            if( pck.getName() === conf.module ){
                _feat = new featureCard( feature.name()+'/'+name, conf, pck );
                return false;
            }
            return true;
        });
        if( !_feat ){
            Msg.error( 'IPluginManager.getAddonConfig() feature not found:', name );
            return Promise.resolve( null );
        }
        let _promise = _feat.initialize( api, instance )
            .then(( _provider ) => {
                if( _provider && _provider instanceof IFeatureProvider ){
                    return _feat.config();
                } else {
                    Msg.error( 'IPluginManager.getConfig() unable to initialize the feature' );
                    return null;
                }
            });
        return _promise;
    }

    /**
     * @param {coreApi} api a coreApi instance
     * @param {String} name the searched feature
     * @param {String|null} iface the searched interface in the searched feature
     * @returns {Promise} which resolves to the filled configuration of iface in the named feature or null
     * [-public API-]
     */
    getConfig( api, name, iface=null ){
        const _feat = this.byNameExt( api.config(), api.packet(), name );
        if( !_feat ){
            Msg.error( 'IPluginManager.getConfig() feature not found:', name );
            return Promise.resolve( null );
        }
        let _promise = _feat.initialize( api )
            .then(( _provider ) => {
                if( _provider && _provider instanceof IFeatureProvider ){
                    return _provider.feature().config();
                } else {
                    Msg.error( 'IPluginManager.getConfig() unable to initialize the feature' );
                    return null;
                }
            })
            .then(( _conf ) => {
                if( iface ){
                    if( _conf && _conf[iface] ){
                        return( _conf[iface] );
                    } else {
                        Msg.error( 'IPluginManager.getConfig() configuration is empty or doesn\' provider '+iface+' group' );
                        return null;
                    }
                } else {
                    return _conf;
                }
            });
        return _promise;
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
     * @returns {featureCard[]} the array of enabled services
     * [-public API-]
     */
    getEnabledExt( config, packet ){
        let result = [];
        const configuredFeats = config.features();
        let _found = [];
        // examine the configured features to select a) installed modules b) core services
        Object.keys( configuredFeats ).every(( id ) => {
            const enabled = configuredFeats[id].enabled || true;
            if( enabled ){
                if( !Object.keys( configuredFeats[id] ).includes( 'module' )){
                    Msg.error( 'IPluginManager.getEnabled() feature \''+id+'\' doesn\' have a \'module\' key (though mandatory)' );
                } else if( configuredFeats[id].module === 'core' ){
                    result.push( new featureCard( id, configuredFeats[id] ));
                } else if( _found.includes( configuredFeats[id].module )){
                    result.push( new featureCard( id, configuredFeats[id] ));
                } else {
                    const pck = this.getPackageExt( packet, configuredFeats[id].module );
                    if( pck ){
                        result.push( new featureCard( id, configuredFeats[id], pck ));
                        _found.push( configuredFeats[id].module );
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
        if( this._installed.length ){
            Msg.debug( 'IPluginManager.getInstalled() reusing already cached installed plugins' );
            return( this._installed );
        }
        Msg.debug( 'IPluginManager.getInstalled() searching for installed plugins' );
        const parentDir = path.dirname( api.packet().getDir());
        const regex = [
            new RegExp( '^[^\.]' ),
            new RegExp( '^'+api.commonName()+'-' )
        ];
        utils.dirScanSync( parentDir, { type:'d', regex:regex }).every(( p ) => {
            this._installed.push( new PackageJson( p ));
            return true;
        });
        return this._installed;
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
