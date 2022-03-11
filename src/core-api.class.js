/*
 * coreApi class
 */
import { IMsg, coreConfig, coreService, PackageJson } from './index.js';

export class coreApi {

    /*
     * object instances coming from the coreApplication
     */
    // the PackageJson object which describes the '@iztiar/iztiar-core' module
    _package = null;

    // the coreConfig object from the application configuration file
    _config = null;

    // the IMsg interface instance
    _imsg = null;

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
    coreConfig( o ){
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
    corePackage( o ){
        if( o && o instanceof PackageJson ){
            this._package = o;
        }
        return this._package;
    }

    /**
     * Getter/Setter
     * @param {*} o the IMsg interface instance
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
     * @param {IMsg} o the IMsg interface instance
     * @returns {IMsg}
     */
    IMsg( o ){
        if( o && o instanceof IMsg ){
            this._imsg = o;
        }
        return this._imsg;
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

    /**
     * Getter/Setter
     * @param {coreConfig} o the coreConfig object from the service
     * @returns {coreConfig}
     */
    serviceConfig( o ){
        if( o && o instanceof coreConfig ){
            this._service.config( o );
        }
        return this._service.config();
    }

    /**
     * Getter/Setter
     * @param {PackageJson} o the PackageJson object which describes the plugin
     * @returns {PackageJson}
     */
    servicePackage( o ){
        if( o && o instanceof PackageJson ){
            this._service.package( o );
        }
        return this._service.package();
    }
}
