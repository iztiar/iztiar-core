/*
 * utils.js
 */
import fs from 'fs';
import net from 'net';
import path from 'path';
import ps from 'ps';

import { IMsg } from './index.js';

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
     * @param {integer} pid the PID of the process to check
     * @returns {Promise} which will will resolves with [{ pid, user, time, etime }], or false
     */
    isAlivePid: function( pid ){
        IMsg.debug( 'utils.isAlivePid()', 'pid='+pid );
        return new Promise(( resolve, reject ) => {
            ps({ pid:pid, fields:[ 'pid','user','time','etime' ]})
                .then(( res ) => {
                    IMsg.debug( 'utils.isAlivePid()', 'pid='+pid, 'resolved with res', res );
                    resolve( res.length === 1 ? res : false );
                }, ( rej ) => {
                    IMsg.debug( 'utils.isAlivePid()', 'pid='+pid, 'rejected, resolving falsy' );
                    resolve( false );
                })
                .catch(( e ) => {
                    IMsg.error( 'utils.isAlivePid()', 'pid='+pid, 'resolving falsy', e.name, e.message );
                    resolve( false );
                });
        });
    },

    /**
     * @param {integer} port the port of a TCP server
     * @returns {Promise} which will will resolves with { iz.ack } or false
     */
    isAlivePort: function( port ){
        IMsg.debug( 'utils.isAlivePort()', 'port='+port );
        return new Promise(( resolve, reject ) => {
            utils.tcpRequest( port, 'iz.ping' )
                .then(( res ) => {
                    IMsg.debug( 'utils.isAlivePort()', 'port='+port, 'resolved with res', res );
                    resolve( res );
                }, ( rej ) => {
                    IMsg.debug( 'utils.isAlivePort()', 'port='+port, 'rejected, resolving falsy' );
                    resolve( false );
                })
                .catch(( e ) => {
                    IMsg.error( 'utils.isAlivePort()', 'port='+port, 'resolving falsy', e.name, e.message );
                    resolve( false );
                });
        });
    },

    /**
     * synchronously read a JSON file
     * @param {String} fname the full pathname of the file to be read
     * @returns {JSON|null} the object (may be empty) or null if ENOENT error
     * @throws {coreError}, unless ENOENT which is sent to coreLogger
     */
    jsonReadFileSync: function( fname, options={} ){
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
     * Sends a request to a server, expecting a single JSON as an answer.
     * @param {integer} port the TCP port to request (on locahost)
     * @param {string} command a command to send
     * @returns {Promise} which will resolves with the received answer, or rejects with the catched or received error
     */
    tcpRequest: function( port, command ){
        IMsg.debug( 'utils.tcpRequest()', 'port='+port, 'command='+command );
        return new Promise(( resolve, reject ) => {
            try {
                const client = net.createConnection( port, () => {
                    client.write( command );
                });
                client.on( 'data', ( data ) => {
                    const _bufferStr = new Buffer.from( data ).toString();
                    const _json = JSON.parse( _bufferStr );
                    // only the client knows when it has to end the answer channel
                    //client.end();
                    IMsg.debug( 'utils.tcpRequest() resolves with', _json );
                    resolve( _json );
                });
                client.on( 'error', ( e ) => {
                    IMsg.error( 'utils.tcpRequest().on(\'error\') ', e.name, e.code, e.message );
                    reject( e.code );
                });
                client.on( 'end', ( m ) => {
                    IMsg.info( 'utils.tcpRequest().on(\'end\')', m );
                    resolve( true );
                });
            } catch( e ){
                IMsg.error( 'utils.tcpRequest().catch()', e.name, e.message );
                reject( e.message );
            }
        });
    }
}
