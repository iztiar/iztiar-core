/*
 * IRunFile interface
 */
import path from 'path';

import { utils } from './index.js';

export class IRunFile {

    /* *** ***************************************************************************************
       *** The implementation API, i.e; the functions the implementation may want to implement ***
       *** *************************************************************************************** */

    /* *** ***************************************************************************************
       *** The public API, i.e; the API anyone may call to access the interface service        ***
       *** *************************************************************************************** */

    /**
     * @param {coreConfig} appConfig the filled application configuration
     * @param {string} name the name of the controller
     * @returns {JSON} the content of the run file, or null
     */
    static jsonByName( appConfig, name ){
        return utils.jsonReadFileSync( IRunFile.runFile( appConfig, name ));
    }

    /**
     * @param {coreConfig} appConfig the filled application configuration
     * @param {string} name the name of the controller service
     * @returns {string} the full pathname of the JSON run file for this controller service
     * @throws {Error} if name is empty, null or undefined
     */
    static runFile( appConfig, name ){
        if( !name || typeof name !== 'string' || !name.length ){
            throw new Error( 'IRunFile.runFile() name is unset' );
        }
        return path.join( appConfig.runDir, name+'.json' )
    }
}
