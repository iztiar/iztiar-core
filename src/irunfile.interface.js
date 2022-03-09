/*
 * IRunFile interface
 *
 *  Manage the runfile, which is expected to be:
 *      <service_name>
 *          <module|core>
 *          <class>
 *          <content>
 *          pids []
 *          ports []
 */
import path from 'path';

import { IMsg, utils } from './index.js';

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
        if( _json && _json.name ){
            _pids = _json[_json.name].pids || [];
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
        if( _json && _json.name ){
            _ports = _json[_json.name].ports || [];
        }
        return _ports;
    }

    /* *** ***************************************************************************************
       *** The public API, i.e; the API anyone may call to access the interface service        ***
       *** *************************************************************************************** */

    /**
     * @param {coreConfig} appConfig the filled application configuration
     * @param {string} name the name of the service
     * @returns {Object} the content of the run file, or null
     * @throws {Error}
     */
    static jsonByName( appConfig, name ){
        const _fname = IRunFile.runFile( appConfig, name );
        return IRunFile.jsonByFilename( _fname );
    }

    /**
     * @param {string} fname the full filename of the runfile
     * @returns {Object} the content of the run file, or null
     * @throws {Error}
     */
    static jsonByFilename( fname ){
        const _json = utils.jsonReadFileSync( fname );
        if( _json && Object.keys( _json ).length ){
            // one key at level 1: service name
            if( Object.keys( _json ).length !== 1 ){
                throw new Error( 'IRunFile.jsonByName() expected one key at level one, found '+Object.keys( _json ));
            }
            _json.name = Object.keys( _json )[0];
        }
        return _json;
    }

    /**
     * Remove a service and its content from a JSON runfile
     * This mainly occurs when the server is being shutting down
     * @param {coreConfig} appConfig the filled application configuration
     * @param {string} name the name of the service
     * @returns {JSON|null} the new JSON content after this deletion
     * @throws Error (but not ENOENT, this being already handled)
     */
    static remove( appConfig, name ){
        IMsg.debug( 'IRunFile.remove()', 'name='+name );
        return utils.jsonRemoveKeySync( IRunFile.runFile( appConfig, name ), name );
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

    /**
     * Set the content of a forkable in the JSON runfile
     * @param {coreConfig} appConfig the filled application configuration
     * @param {string} name the name of the service
     * @param {Object} data the minimal object (aka data interface) to set
     *  pids {Integer[]} list of running pids
     *  ports {Integer[]} list of opened ports
     * @returns {Object} the updated JSON content
     * @throws Error (but not ENOENT, this being already handled)
     */
    static set( appConfig, name, data ){
        IMsg.debug( 'IRunFile.set()', 'name='+name, 'data='+data );
        let _written = null;
        const _fname = IRunFile.runFile( appConfig, name );
        const _orig = IRunFile.jsonByFilename( _fname );
        _written = utils.jsonWriteFileSync( _fname, data, _orig );
        return _written;
    }
}
