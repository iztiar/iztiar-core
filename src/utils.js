/*
 * utils.js
 */
import fs from 'fs';
import path from 'path';

import { IMsg } from './imports.js';

export const utils = {
    /**
     * make sure the target directory exists
     * @param {string} dir the full pathanme of the directory
     * @throws {Error}
     */
     makeDirExists: function( dir ){
        IMsg.debug( 'utils.makeDirExists()', 'dir='+dir );
        // make sure the target directory exists
        fs.mkdirSync( dir, { recursive: true });
    },

    /**
     * make sure the target directory of the filename exists
     * @param {string} fname the full pathanme of the file
     */
    makeFnameDirExists: function( fname ){
        utils.makeDirExists( path.dirname( fname ));
    },

    /**
     * synchronously read a JSON file
     * @returns {JSON|null} the object (may be empty) or null if ENOENT error
     * @throws {coreError}, unless ENOENT which is sent to coreLogger
     * Note:
     *  As this function is called very early in the program, it cannot makes use of msg() helpers.
     */
    jsonReadFileSync: function( fname ){
        IMsg.debug( 'utils.jsonReadFileSync()', 'fname='+fname );
        let _json = null;
        try {
            _json = JSON.parse( fs.readFileSync( fname, { encoding: 'utf8' }));
        } catch( e ){
            if( e.code !== 'ENOENT' ){
                throw new Error( e );
            }
            IMsg.debug( 'utils.jsonReadFileSync()', fname+': file not found or not readable' );
            _json = null;
        }
        return _json;
    }
}
