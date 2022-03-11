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

import { Msg, utils } from './index.js';

export class IRunFile {

    /* *** ***************************************************************************************
       *** The implementation API, i.e; the functions the implementation may want to implement ***
       *** *************************************************************************************** */

    /**
     * @returns {String} the full pathname of the run directory
     * [-implementation Api-]
     */
    runDir(){
        return null;
    }

    /* *** ***************************************************************************************
       *** The public API, i.e; the API anyone may call to access the interface service        ***
       *** *************************************************************************************** */

    /**
     * @param {string} name the name of the service
     * @returns {Object} the content of the run file, or null
     * @throws {Error}
     */
    jsonByName( name ){
        const _fname = this.runFile( name );
        return this.jsonByFilename( _fname );
    }

    /**
     * @param {string} fname the full filename of the runfile
     * @returns {Object} the content of the run file, or null
     * @throws {Error}
     */
    jsonByFilename( fname ){
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
     * @param {string} name the name of the service
     * @returns {JSON|null} the new JSON content after this deletion
     * @throws Error (but not ENOENT, this being already handled)
     */
    remove( name ){
        Msg.debug( 'IRunFile.remove()', 'name='+name );
        return utils.jsonRemoveKeySync( this.runFile( name ), name );
    }

    /**
     * @param {string} name the name of the controller service
     * @returns {string} the full pathname of the JSON run file for this controller service
     * @throws {Error} if name is empty, null or undefined
     */
    runFile( name ){
        if( !name || typeof name !== 'string' || !name.length ){
            throw new Error( 'IRunFile.runFile() name is unset' );
        }
        return path.join( this.runDir(), name+'.json' )
    }

    /**
     * Set the content of a forkable in the JSON runfile
     * @param {string} name the name of the service
     * @param {Object} data the minimal object (aka data interface) to set
     *  pids {Integer[]} list of running pids
     *  ports {Integer[]} list of opened ports
     * @returns {Object} the updated JSON content
     * @throws Error (but not ENOENT, this being already handled)
     */
    set( name, data ){
        Msg.debug( 'IRunFile.set()', 'name='+name, 'data='+data );
        let _written = null;
        const _fname = this.runFile( name );
        const _orig = this.jsonByFilename( _fname );
        _written = utils.jsonWriteFileSync( _fname, data, _orig );
        return _written;
    }
}
