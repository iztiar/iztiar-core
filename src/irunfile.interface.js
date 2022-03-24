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
import deepcopy from 'deepcopy';
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
    v_runDir(){
        return null;
    }

    /* *** ***************************************************************************************
       *** The public API, i.e; the API anyone may call to access the interface service        ***
       *** *************************************************************************************** */

    /**
     * @param {string} name the name of the service
     * @param {string} key the desired (second-level) key
     * @returns {Object|null} the content of the specified key
     */
    get( name, key ){
        const _json = this.jsonByName( name );
        return _json && _json[name][key] ? _json[name][key] : null;
    }

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
        return path.join( this.v_runDir(), name+'.json' )
    }

    /**
     * Set the all or part of the content of a JSON runfile
     * @param {string|string[]} names the array of the keys to address the to-be-updated part
     * @param {Object} data the data to set
     * @returns {Object} the new full JSON content
     * @throws {Error} (but not ENOENT, this being already handled)
     */
    set( names, data ){
        Msg.debug( 'IRunFile.set()', 'names', names, 'data', data );
        let _names = [ ...names ];
        if( !Array.isArray( names )) _names = [ names ];
        let _written = null;
        const _fname = this.runFile( _names[0] );
        const _orig = this.jsonByFilename( _fname ) || {};
        let _fullpart = deepcopy( _orig );
        if( _names.length === 1 ){
            _fullpart = data;
        } else {
            if( Object.keys( _orig ).length > 0 && Object.keys( _orig )[0] !== _names[0] ){
                throw new Error( 'IRunFile.set() expecting top key=\''+_names[0]+'\', found=\''+Object.keys( _orig )[0]+'\'' );
            }
            if( _names.length === 2 ){
                _fullpart[_names[0]][_names[1]] = data;
            } else {
                throw new Error( 'IRunFile.set() only updates two levels at the moment, found '+_names.length );
            }
        }
        _written = utils.jsonWriteFileSync( _fname, _fullpart, _orig );
        return _written;
    }
}
