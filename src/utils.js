/*
 * utils.js
 */
import deepEqual from 'deepequal';
import deepCopy from 'deepcopy';
import fs from 'fs';
import net from 'net';
import path from 'path';
import ps from 'ps';

import { Msg } from './index.js';

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
        Msg.debug( 'utils.dirScanSync()', 'dir='+dir );
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
        Msg.debug( 'found ', _matchedEntries, '(count='+_matchedEntries.length+')' );
        return _matchedEntries;
    },

    /**
     * @param {String} fname the full pathname to be tested
     * @returns {Boolean}
     */
    fileExistsSync: function( fname ){
        const exists = fs.existsSync( fname );
        Msg.debug( 'utils.fileExistsSync()', 'fname='+fname, exists ? 'exists':'doesn\' exist' );
        return fs.existsSync( fname );
    },

    /**
     * @param {Object} obj the object to filter Buffer from
     * @returns {Object} a deep copy of obj, without any Buffer data
     */
    filterBuffer: function( obj ){
        const debug = false;
        // recursive filtering function
        const _rfn = function( o ){
            if( debug ) Msg.debug( 'filterBuffer() typeof o='+typeof o );
            if( typeof o === 'object' ){
                Object.keys( o ).every(( k ) => {
                    if( o[k] instanceof Buffer ){
                        o[k] = { type:'Buffer' };
                    } else if( typeof o[k] === 'object' ){
                        return _rfn( o[k] );
                    }
                    return true;
                });
            }
            return o;
        };
        return _rfn( deepCopy( obj ));
    },

    /**
     * @param {integer} stamp the timestamp as a long integer
     * @returns {String} the timestamp as 'yyyy-mm-dd hh:mi:ss.sss'
     */
    humanStamp: function( stamp ){
        const date = new Date( stamp );
        const year = ( '0000'+date.getFullYear()).slice( -4 );
        const mm = 1+date.getMonth();
        const month = ( '00'+mm).slice( -2 );
        const day = ( '00'+date.getDate()).slice( -2 );
        const hours = ( '00'+date.getHours()).slice( -2 );
        const mins = ( '00'+date.getMinutes()).slice( -2 );
        const secs = ( '00'+date.getSeconds()).slice( -2 );
        const millis = ( '000'+date.getMilliseconds()).slice( -3 );
        return year+'-'+month+'-'+day+' '+hours+':'+mins+':'+secs+'.'+millis;
    },

    /**
     * @param {integer} pid the PID of the process to check
     * @returns {Promise} which will will resolves with [{ pid, user, time, etime }], or false
     */
    isAlivePid: function( pid ){
        Msg.debug( 'utils.isAlivePid()', 'pid='+pid );
        return new Promise(( resolve, reject ) => {
            ps({ pid:pid, fields:[ 'pid','user','time','etime' ]})
                .then(( res ) => {
                    Msg.debug( 'utils.isAlivePid()', 'pid='+pid, 'resolved with res', res );
                    resolve( res.length === 1 ? res : false );
                }, ( rej ) => {
                    Msg.debug( 'utils.isAlivePid()', 'pid='+pid, 'rejected by ps, resolving falsy' );
                    resolve( false );
                })
                .catch(( e ) => {
                    Msg.error( 'utils.isAlivePid()', 'pid='+pid, 'catched exception', e.name, e.message, 'resolving falsy' );
                    resolve( false );
                });
        });
    },

    /**
     * @param {integer} port the port of a TCP server
     * @returns {Promise} which will will resolves with { iz.ack } or false
     */
    isAlivePort: function( port ){
        Msg.debug( 'utils.isAlivePort()', 'port='+port );
        return new Promise(( resolve, reject ) => {
            utils.tcpRequest( port, 'iz.ping' )
                .then(( res ) => {
                    Msg.debug( 'utils.isAlivePort()', 'port='+port, 'resolved with res', res );
                    resolve( res );
                }, ( rej ) => {
                    Msg.debug( 'utils.isAlivePort()', 'port='+port, 'rejected, resolving falsy' );
                    resolve( false );
                })
                .catch(( e ) => {
                    Msg.error( 'utils.isAlivePort()', 'port='+port, 'resolving falsy', e.name, e.message );
                    resolve( false );
                });
        });
    },

    /**
     * https://stackoverflow.com/questions/14636536/how-to-check-if-a-variable-is-an-integer-in-javascript
     * @param {*} value the value to test
     * @returns {true|false}
     */
    isInt: function( value ){
        if( isNaN( value )){
            return false;
        }
        var x = parseFloat( value );
        return( x | 0 ) === x;
    },

    /**
     * synchronously read a JSON file
     * @param {String} fname the full pathname of the file to be read
     * @returns {JSON|null} the object (may be empty) or null if ENOENT error
     * @throws {coreError}, unless ENOENT which is sent to coreLogger
     */
    jsonReadFileSync: function( fname, options={} ){
        Msg.debug( 'utils.jsonReadFileSync()', 'fname='+fname );
        let _json = null;
        try {
            _json = JSON.parse( fs.readFileSync( fname, { encoding: 'utf8' }));
            Msg.debug( 'utils.jsonReadFileSync()', fname, _json );
        } catch( e ){
            if( e.code === 'ENOENT' ){
                Msg.debug( 'utils.jsonReadFileSync()', fname+': file not found or not readable' );
                _json = null;
            } else {
                throw e;
            }
        }
        return _json;
    },

    /**
     * synchronously remove a key from JSON file
     * @param {string} fname the full pathname of the file
     * @param {string} key the first-level key to be removed
     * @param {Boolean} deleteEmpty whether to delete the empty file
     * @returns {JSON} the new JSON content
     * Note:
     *  When removing the last key, we rather unlink the file to not leave an empty file in the run dir.
     */
    jsonRemoveKeySync: function( fname, key, deleteEmpty=true ){
        Msg.debug( 'utils.jsonRemoveKeySync()', 'fname='+fname, 'key='+key, 'deleteEmpty='+deleteEmpty );
        let _json = utils.jsonReadFileSync( fname ) || {};
        const _orig = { ..._json };
        delete _json[key];
        if( deleteEmpty && ( !_json || !Object.keys( _json ).length )){
            utils.unlink( fname );
            _json = null;
        } else {
            utils.jsonWriteFileSync( fname, _json, _orig );
        }
        return _json;
    },

    /**
     * synchronously writes the given non-null object into path
     *  if the orig object is provided (not null nor undefined), then it is compared with the found file
     *  to make sure if has not been updated since the program has read the file
     * @param {string} fname the full pathname of the file
     * @param {Object} obj the data to be written, expected JSON
     * @param {Object} orig the original data read from this file, to be compared with data which will be read in the disk
     *  ti make sure there has been no modification of the file by another process
     * @returns {Object} the written data
     * @throws {Error}
     */
    jsonWriteFileSync: function( fname, obj, orig ){
        Msg.debug( 'utils.jsonWriteFileSync()', 'fname='+fname, obj, orig );
        let e = utils.makeFnameDirExists( fname );
        if( e ){
            Msg.error( 'utils.jsonWriteFileSync().makeFnameDirExists()', e.name, e.message );
            throw new Error( e );
        }
        // if an original object is provided, then try to make sure the current file is unchanged
        if( orig ){
            const current = utils.jsonReadFileSync( fname ) || {};
            if( !deepEqual( orig, current )){
                const _msg = 'utils.jsonWriteFileSync() fname '+fname+' has changed on the disk, refusing the update';
                Msg.error( _msg );
                Msg.debug( 'orig', orig );
                Msg.debug( 'current', current );
                throw new Error( _msg );
            }
        }
        // at last actually writes the content
        //  hoping for no race conditions between these two blocks of code
        try {
            fs.writeFileSync( fname, JSON.stringify( obj ));
        } catch( e ){
            Msg.error( 'utils.jsonWriteFileSync().writeFileSync()', e.name, e.message );
            throw new Error( e );
        }
        return obj;
    },

    /**
     * make sure the target directory exists
     * @param {string} dir the full pathanme of the directory
     * @throws {Error}
     */
    makeDirExists: function( dir ){
        Msg.debug( 'utils.makeDirExists()', 'dir='+dir );
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
     * @returns {String} the current timestamp as 'yyyy-mm-dd hh:mi:ss.sss'
     */
    now: function(){
        return utils.humanStamp( Date.now());
    },

    /**
     * Sends a request to a server, expecting a single JSON as an answer.
     * @param {integer} port the TCP port to request (on locahost)
     * @param {string} command a command to send
     * @returns {Promise} which will resolves with the received answer, or rejects with the catched or received error
     */
    tcpRequest: function( port, command ){
        Msg.debug( 'utils.tcpRequest()', 'port='+port, 'command='+command );
        return new Promise(( resolve, reject ) => {
            try {
                const client = net.createConnection({ port:port, family:4 }, () => {
                    client.write( command+'\r\n' );
                });
                client.on( 'data', ( data ) => {
                    const _bufferStr = new Buffer.from( data ).toString();
                    const _json = JSON.parse( _bufferStr );
                    // doesn't keep the connection opened as this function is a one-shot
                    client.end();
                    Msg.debug( 'utils.tcpRequest() resolves with', _json );
                    resolve( _json );
                });
                client.on( 'error', ( e ) => {
                    Msg.error( 'utils.tcpRequest().on(\'error\') ', e.name, e.code, e.message );
                    reject( e.code );
                });
                //client.on( 'end', ( m ) => {
                //    Msg.debug( 'utils.tcpRequest().on(\'end\'): client connection ended', m );
                //    resolve( true );
                //});
            } catch( e ){
                Msg.error( 'utils.tcpRequest().catch()', e.name, e.message );
                reject( e.message );
            }
        });
    },

    /**
     * Delete a file from the filesystem
     * @param {string} fname the full pathname of the file to delete
     * @throws {Error}
     */
    unlink: function( fname ){
        Msg.debug( 'utils.unlink()', 'fname='+fname );
        try {
            fs.unlinkSync( fname );
        } catch( e ){
            if( e.code === 'ENOENT' ){
                Msg.debug( 'utils.unlink()', fname+': file doesn\'t exist' );
            } else {
                throw e;
            }
        }
    },

    /**
     * @param {*} result the result to be used as final resolution value
     * @param {Promise} promiseFn the test Promise, which eventually resolves to true (condition is met) or false (timed out)
     * @param {*} promiseParms an object to be passed to promiseFn as arguments
     * @param {integer} timeout the timeout (ms) to be waited for the promiseFn be resolved
     * @returns {Promise} a resolved promise, with result value
     */
    waitFor: function( result, promiseFn, promiseParms, timeout ){
        Msg.debug( 'utils.waitFor() timeout='+timeout );
        let _end = Date.now()+timeout;
        return new Promise(( outResolve, reject ) => {
            const _outerTest = function(){
                return new Promise(( inResolve, reject ) => {
                    const _innerTest = function(){
                        promiseFn( promiseParms )
                            .then(( res ) => {
                                if( res ){
                                    Msg.debug( 'utils.waitFor() resolves to true' );
                                    inResolve( true );
                                } else if( Date.now() > _end ){
                                    Msg.debug( 'utils.waitFor() timed out, resolves to false' );
                                    inResolve( false );
                                } else {
                                    setTimeout( _innerTest, 10 );
                                }
                            })
                            .catch(( e ) => {
                                    Msg.error( 'utils.waitFor().catch()', e.name, e.message );
                                    inResolve( true );
                            });
                    };
                    _innerTest();
                })
            };
            _outerTest()
                .then(( res ) => {
                    result.waitFor = res;
                    outResolve( result );
                });
        });
    }
}
