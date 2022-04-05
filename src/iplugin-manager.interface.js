/*
 * IPluginManager interface
 */
import path from 'path';

import { featureCard, featureProvider, Msg, PackageJson, utils } from './index.js';

export class IPluginManager {

    // cache of installed plugins: index is plugin name, data is plugin json package
    _installed = {};

    /* *** ***************************************************************************************
       *** The implementation API, i.e; the functions the implementation may want to implement ***
       *** *************************************************************************************** */

    /* *** ***************************************************************************************
       *** The public API, i.e; the API anyone may call to access the interface service        ***
       *** *************************************************************************************** */

    /**
     * @param {coreApi} api a coreApi instance
     * @param {String} name the name of the searched feature
     * @returns {featureCard|null} the named service
     * [-public API-]
     */
    byName( api, name ){
        const _config = api.config();
        if( !Object.keys( _config.features()).includes( name )){
            Msg.error( 'feature not found in the application configuration', Object.keys( _config.features()));
            return null;
        }
        const _feats = _config.features();
        if( !Object.keys( _feats[name] ).length ){
            Msg.error( 'feature is found, but not configured' );
            return null;
        }
        if( !Object.keys( _feats[name] ).includes( 'module' )){
            Msg.error( 'module property is mandatory, not found' );
            return null;
        }
        if( _feats[name].module === 'core' ){
            Msg.debug( 'module=\'core\'' );
            return new featureCard( name, _feats[name], null );
        }
        if( !Object.keys( this._installed ).includes( _feats[name].module )){
            Msg.error( 'module is not installed: '+_feats[name].module );
            return null;
        }
        return new featureCard( name, _feats[name], this._installed[_feats[name].module] );
    }

    /**
     * @param {coreConfig} config the filled application configuration
     * @param {PackageJson} packet the package.json of this main '@iztiar/iztiar-core' module
     * @param {String} name the name of the searched feature
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
     * @param {featureProvider} provider the implementation instance
     * @param {String} name the searched add-on feature
     * @param {Object} conf the configuration of the searched add-on
     *  If unset, then the full filled configuration is returned by the promise
     * @returns {Promise} which resolves to the filled configuration of the add-on or null
     * [-public API-]
     */
    getAddonConfig( provider, name, conf ){
        if( !Object.keys( conf ).includes( 'module' )){
            Msg.error( 'IPluginManager.getAddonConfig() '+name+' configuration doesn\'t include module' );
            return Promise.resolve( null );
        }
        const _installed = this.getInstalled();
        if( !Object.keys( _installed ).includes( conf.module )){
            Msg.error( 'IPluginManager.getAddonConfig() module '+conf.module+' is not installed' );
            return Promise.resolve( null );
        }
        const api = provider.api();
        const feature = provider.feature();
        const _addonFeature = new featureCard( feature.name()+'/'+name, conf, _installed[conf.module] );
        let _promise = _addonFeature.initialize( api, provider )
            .then(( _addonProvider ) => {
                if( _addonProvider && _addonProvider instanceof featureProvider ){
                    return _addonFeature.config();
                } else {
                    Msg.error( 'IPluginManager.getAddonConfig() unable to initialize the add-on feature' );
                    return null;
                }
            });
        return _promise;
    }

    /**
     * @param {coreApi} api a coreApi instance
     * @param {String} name the searched feature
     * @param {String|null} iface the searched interface name in the searched feature
     * @returns {Promise} which resolves to the filled configuration of iface in the named feature or null
     * [-public API-]
     */
    getConfig( api, name, iface=null ){
        const _config = api.config();
        let _promise = Promise.resolve( null );
        if( !Object.keys( _config.features()).includes( name )){
            Msg.error( 'IPluginManager.getConfig() feature not found in the application configuration', Object.keys( _config.features()));
            return _promise;
        }
        const _feats = _config.features();
        if( !Object.keys( _feats[name] ).includes( 'module' )){
            Msg.error( 'IPluginManager.getConfig() feature doesn\'t exhibit module property' );
            return _promise;
        }
        const _installed = this.getInstalled();
        if( !Object.keys( _installed ).includes( _feats[name].module )){
            Msg.error( 'IPluginManager.getConfig() module '+_feats[name].module+' is not installed' );
            return _promise;
        }
        const _feat = new featureCard( name, _feats[name], _installed[_feats[name].module] );
        _promise = _feat.initialize( api )
            .then(( _provider ) => {
                if( _provider && _provider instanceof featureProvider ){
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
     * @returns {PackageJson[]} the array of installed modules of our Iztiar family (including this one)
     * [-public API-]
     */
    getInstalled(){
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
     * @param {String} module the name of the searched module in the feature configuration
     * @returns {PackageJson|null} the PackageJson instance for the (installed) module
     * @throws {Error}
     * [-public API-]
     */
    getPackageExt( packet, module ){
        let pck = null;
        const _words = module.split( '/' );
        const _short = _words.length > 1 ? _words[1] : _words[0];
        const dir = path.join( path.dirname( packet.getDir()), _short );
        const fname = path.join( dir, 'package.json' );
        return new PackageJson( dir );
    }

    /**
     * @param {coreApi} api a coreApi instance
     * @returns {PackageJson[]} the array of installed modules of our Iztiar family (including this one)
     *  Rationale:
     *  - the package should be named '@iztiar/iztiar-xxxxxxxxxx'
     *    as a consequence, the npm package manager will install it besides of this '@iztiar/iztiar-core' module
     * [-public API-]
     */
    loadInstalled( api ){
        if( Object.keys( this._installed ).length ){
            Msg.debug( 'IPluginManager.loadInstalled() reusing already cached installed plugins' );
            return( this._installed );
        }
        Msg.debug( 'IPluginManager.loadInstalled() searching for installed plugins' );
        const parentDir = path.dirname( api.packet().getDir());
        const regex = [
            new RegExp( '^[^\.]' ),
            new RegExp( '^'+api.commonName()+'-' )
        ];
        utils.dirScanSync( parentDir, { type:'d', regex:regex }).every(( p ) => {
            const _pck = new PackageJson( p );
            this._installed[_pck.getName()] = _pck;
            return true;
        });
        return this._installed;
    }
}
