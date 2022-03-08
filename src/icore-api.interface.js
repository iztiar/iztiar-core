/*
 * ICoreApi interface
 *
 *  This interface is designed to provide a plugin the minimum set of resources it may need.
 *  It is first implemented by the main program, and the instance is passed to each and every service instance.
 */
import { coreConfig } from './index.js';

export class ICoreApi {

    // the PackageJson object which describes the '@iztiar/iztiar-core' module
    _package = null;

    // the coreConfig object which describes the application configuration file
    _config = null;

    constructor(){
        return this;
    }

    /* *** ***************************************************************************************
       *** The implementation API, i.e; the functions the implementation may want to implement ***
       *** *************************************************************************************** */

    /* *** ***************************************************************************************
       *** The public API, i.e; the API anyone may call to access the interface service        ***
       *** *************************************************************************************** */

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
     * @param {PackageJson} pck the object which describes the '@iztoar/iztiar-core' module
     * @returns {PackageJson} the object which describes the '@iztoar/iztiar-core' module
     */
    package( pck ){
        if( pck ){
            this._package = pck;
        }
        return this._package;
    }

}
