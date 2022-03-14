/*
 * coreApi class
 *
 *  A coreApi object is instanciated at application startup.
 *  It holds some globally useable datas, and will be later part of the engineApi object.
 */
import { IPluginManager, coreConfig, PackageJson } from './index.js';

export class coreApi {

    // the common name of the application
    _cname = null;

    // the coreConfig object from the application configuration file
    //  this object is filled for application configuration data
    //  but left unchanged, as read from configuration, for features
    _config = null;

    // the PackageJson object which describes the '@iztiar/iztiar-core' application module
    _package = null;

    // the IPluginManager interface instance
    _pluginManager = null;

    /**
     * Getter/Setter
     * @param {String} o the common name of the application
     * @returns {String}
     */
    commonName( o ){
        if( o && typeof o === 'string' && o.length ){
            this._cname = o;
        }
        return this._cname;
    }

    /**
     * Getter/Setter
     * The setter is called as soon as command-line options have been parsed in order to get the storage directory.
     * @param {Object} options the command-line option values
     * @returns {coreConfig} the application configuration instance
     */
    config( options ){
        if( options ){
            this._config = new coreConfig( options );
        }
        return this._config;
    }

    /**
     * Getter/Setter
     * @param {PackageJson} o the PackageJson object which describes the '@iztiar/iztiar-core' module
     * @returns {PackageJson}
     */
    packet( o ){
        if( o && o instanceof PackageJson ){
            this._package = o;
        }
        return this._package;
    }

    /**
     * Getter/Setter
     * @param {IPluginManager} o the IPluginManager interface as instanciated by the core applcation
     * @returns {IPluginManager}
     */
    pluginManager( o ){
        if( o && o instanceof IPluginManager ){
            this._pluginManager = o;
        }
        return this._pluginManager;
    }
}
