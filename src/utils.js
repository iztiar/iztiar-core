/*
 * utils.js
 */
import fs from 'fs';
import path from 'path';

import { IMsg } from './imports.js';

export const utils = {
    /**
     * Scans the specified directory for subdirectories which match the specified array of regexs
     * @param {string} dir the directory to be scanned
     * @param {Object} options options to filter the search
     *  type: d|f returns only directories or files, defaulting to all
     *  regex: an array of regex the entry basename must match, defaulting to all
     * @returns {Array} an array of the full pathnames of entries which match
     * @throws {Error}
     */
     dirScanSync: function( dir, options={} ){
        IMsg.debug( 'utils.dirScanSync()', 'dir='+dir );
        if( !dir || typeof dir !== 'string' || !dir.length || dir === '/' || dir.startsWith( '/dev' )){
            throw new Error( 'utils.dirScanSync(): dir='+dir+': invalid start directory' );
        }
        let _regex = options.regex || [];
        if( !Array.isArray( _regex )){
            _regex = [options.regex];
        }
        let _matchedEntries = [];
        let _type = options.type || null;
        fs.readdirSync( dir, { withFileTypes: true }).every(( ent ) => {
            //console.log( 'try to match by type', ent.name, ent.isDirectory(), ent.isFile());
            if(( _type === 'd' && !ent.isDirectory()) || ( _type === 'f' && !ent.isFile())){
                return true;
            }
            //console.log( 'try to match by name', ent.name );
            let _matched = true;
            _regex.every(( r ) => {
                //console.log( ent.name, r.toString());
                if( !ent.name.match( r )){
                    _matched = false;
                    return false;
                }
                return true;
            });
            if( !_matched ){
                return true;
            }
            _matchedEntries.push( path.join( dir, ent.name ));
            return true;
        });
        IMsg.debug( 'found ', _matchedEntries, '(count='+_matchedEntries.length+')' );
        return _matchedEntries;
    },

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
