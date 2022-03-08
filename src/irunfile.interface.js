/*
 * IRunFile interface
 *
 *  Manage the runfile, which is expected to be:
 *      <service_name>
 *          <module|core>
 *              <class>
 *                  <content>
 *                  pids []
 *                  ports []
 */
import path from 'path';

import { utils } from './index.js';

export class IRunFile {

    /* *** ***************************************************************************************
       *** The implementation API, i.e; the functions the implementation may want to implement ***
       *** *************************************************************************************** */
    
    /**
     * @param {coreConfig} appConfig the filled application configuration
     * @param {string} name the name of the service
     * @returns {Integer[]} the list, maybe empty, of running pids
     */
    static pids( appConfig, name ){
        const _json = IRunFile.jsonByName( appConfig, name );
        let _pids = [];
        if( _json && _json.name && _json.module && _json.class ){
            _pids = _json[_json.name][_json.module][_json.class].pids || [];
        }
        return _pids;
    }

    /**
     * @param {coreConfig} appConfig the filled application configuration
     * @param {string} name the name of the service
     * @returns {Integer[]} the list, maybe empty, of opened ports
     */
    static ports( appConfig, name ){
        const _json = IRunFile.jsonByName( appConfig, name );
        let _ports = [];
        if( _json && _json.name && _json.module && _json.class ){
            _ports = _json[_json.name][_json.module][_json.class].ports || [];
        }
        return _ports;
    }

    /* *** ***************************************************************************************
       *** The public API, i.e; the API anyone may call to access the interface service        ***
       *** *************************************************************************************** */

    /**
     * @param {coreConfig} appConfig the filled application configuration
     * @param {string} name the name of the service
     * @returns {JSON} the content of the run file, or null
     * @throws {Error}
     */
    static jsonByName( appConfig, name ){
        const _json = utils.jsonReadFileSync( IRunFile.runFile( appConfig, name ));
        if( _json && Object.keys( _json ).length ){
            // one key at level 1: service name
            if( Object.keys( _json ).length !== 1 ){
                throw new Error( 'IRunFile.jsonByName() expected one key at level one, found '+Object.keys( _json ).length );
            }
            _json.name = Object.keys( _json )[0];
            // one key at level 2: module (or core)
            if( Object.keys( _json[_json.name] ).length !== 1 ){
                throw new Error( 'IRunFile.jsonByName() expected one key at level two, found '+Object.keys( _json[_json.name] ).length );
            }
            _json.module = Object.keys( _json[_json.name] )[0];
            // one key at level 3: class
            if( Object.keys( _json[_json.name][_json.module] ).length !== 1 ){
                throw new Error( 'IRunFile.jsonByName() expected one key at level three, found '+Object.keys( _json[_json.name][_json.module] ).length );
            }
            _json.class = Object.keys( _json[_json.name][_json.module] )[0];
        }
        return _json;
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
        return path.join( appConfig.runDir(), name+'.json' )
    }
}
