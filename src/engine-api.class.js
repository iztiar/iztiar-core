/*
 * coreApi class
 */
import { IPluginManager, coreConfig, coreService, PackageJson } from './index.js';

export class featApi {

    /*
     * object instances coming from the cliApplication
     */
    // the PackageJson object which describes the '@iztiar/iztiar-core' module
    _package = null;

    // the coreConfig object from the application configuration file
    _config = null;

    // the IPluginManager interface as instanciated by the core applcation
    _pluginManager = null;

    /*
     * all the definitions exported by the '@iztiar/iztiar-core' module
     *  gathered from [package.json].main (src/index.js)
     */
    _exports = null;

    /*
     * the coreService itself from '@iztiar/iztiar-core' point of view
     */
    _service = null;

    /**
     * Getter/Setter
     * @param {coreConfig} o the coreConfig object from the application configuration file
     * @returns {coreConfig}
     */
    config( o ){
        if( o && o instanceof coreConfig ){
            this._config = o;
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

    /**
     * Getter/Setter
     * @param {*} o the Msg interface instance
     * @returns {*}
     */
    exports( o ){
        if( o ){
            this._exports = o;
        }
        return this._exports;
    }

    /**
     * Getter/Setter
     * @param {coreService} o the coreService for this plugin
     * @returns {coreService}
     */
    service( o ){
        if( o && o instanceof coreService ){
            this._service = o;
        }
        return this._service;
    }
}
