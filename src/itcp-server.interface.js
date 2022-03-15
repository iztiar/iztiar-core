/*
 * ITcpServer interface
 *
 *  A service which implements this ITcpServer interface (aka a TCP server) should be able to handle
 *  'iz.ping', 'iz.status', and 'iz.stop' commands.
 */
import net from 'net';

import { Msg, utils } from './index.js';

export class ITcpServer {

    static s = {
        STARTING: 'starting',
        RUNNING: 'running',
        STOPPING: 'stopping',
        STOPPED: 'stopped'
    };

    _status = null;
    _tcpServer = null;
    _port = 0;
    _inConnCount = 0;
    _inClosedCount = 0;
    _inMsgCount = 0;
    _inBytesCount = 0;
    _outConnCount = 0;
    _outMsgCount = 0;
    _outBytesCount = 0;

    constructor(){
        Msg.debug( 'ITcpServer instanciation' );
        this._status = ITcpServer.s.STOPPED;
        return this;
    }

    /* *** ***************************************************************************************
       *** The implementation API, i.e; the functions the implementation may want to implement ***
       *** *************************************************************************************** */

    /**
     * Execute a received commands and replies with an answer
     * @param {String[]} words the received command and its arguments
     * @param {Object} client the client connection
     * @returns {Boolean} true if we knew the command and (at least tried to) execute it
     * [-implementation Api-]
     */
    _execute( words, client ){
        return false;
    }

    /**
     * What to do when this ITcpServer is ready listening ?
     * [-implementation Api-]
     */
    _listening(){
        Msg.debug( 'ITcpServer._listening()' );
    }

    /**
     * Internal stats have been modified
     * [-implementation Api-]
     */
    _statsUpdated(){
        Msg.debug( 'ITcpServer.statsUpdated()' );
    }

    /* *** ***************************************************************************************
       *** The public API, i.e; the API anyone may call to access the interface service        ***
       *** *************************************************************************************** */

    /**
     * 
     * @param {Object} client the client connection
     * @param {Object} obj the object to send to the client as an answer
     * @param {Boolean} close whether to close the client connection
     * [-Public API-]
     */
    answer( client, obj, close=false ){
        const _msg = JSON.stringify( obj )+'\r\n';
        client.write( _msg );
        Msg.info( 'server answers to new incoming connection with', obj );
        this._outMsgCount += 1;
        this._outBytesCount += _msg.length;
        if( close ){
            client.end();
        }
        this.statsUpdated();
    }

    /**
     * @returns {Promise} which resolves when the server is actually listening
     * Note:
     *  The caller should take care of never terminating its process if it wants keep this ITcpServer alive.
     *  This may be obtained by returning iself a Promise which never resolves: return new Promise(() => {});
     * [-public API-]
     */
    create( port ){
        Msg.debug( 'ITcpServer.create()' );
        this.status( ITcpServer.s.STARTING );
        this._port = port;
        const self = this;

        this._tcpServer = net.createServer(( c ) => {
            self._inConnCount += 1;
            Msg.debug( 'ITcpServer new incoming connection', 'inConnCount='+self._inConnCount, 'inCloseCount='+self._inClosedCount );

            // refuse all connections if the server is not 'running'
            if( self.status().status !== ITcpServer.s.RUNNING ){
                const _res = { answer:'temporarily refusing connections', reason:self.status().status, timestamp:utils.now()};
                self.answer( c, _res, true );
                self.statsUpdated();
            }

            c.on( 'data', ( data ) => {
                //console.log( data );
                const _bufferStr = new Buffer.from( data ).toString().replace( '\r\n', '' );
                self._inMsgCount += 1;
                self._inBytesCount += _bufferStr.length+2;
                Msg.info( 'server receives \''+_bufferStr+'\' request' );
                const _words = _bufferStr.split( /\s+/ );

                try {
                    if( !self._execute( _words, c )){
                        Msg.error( 'ITcpServer.create() unknown command', _words[0] );
                        c.end();
                    }
                } catch( e ){
                    Msg.error( 'ITcpServer.create().execute()', e.name, e.message );
                    c.end();
                }

                self.statsUpdated();
            })

            .on( 'close', () => {
                self._inClosedCount += 1;
                Msg.debug( 'ITcpServer.create() closing', self._inConnCount, self._inClosedCount );
                self.statsUpdated();
            })

            .on( 'error', ( e ) => {
                self.errorHandler( e );
            });
        });
        Msg.debug( 'ITcpServer.create() tcpServer created' );

        return new Promise(( resolve, reject ) => {
            self._tcpServer.listen( port, '0.0.0.0', () => {
                self.status( ITcpServer.s.RUNNING );
                self._listening();
                resolve( true );
            });
        });
    }

    /**
     * An error handler for implementation classes
     * @param {Error} e exception on TCP server listening
     * [-Public API-]
     */
    errorHandler( e ){
        Msg.debug( 'ITcpServer:errorHandler()' );
        if( e.stack ){
            Msg.error( 'ITcpServer:errorHandler()', e.name, e.message );
        }
        // for now, do not terminate on ECONNRESET
        //if( e.code === 'ECONNRESET' ){
        //    return;
        //}
        // not very sure this is a good idea !?
        if( this.status().status !== ITcpServer.s.STOPPING ){
            Msg.info( 'auto-killing on '+e.code+' error' );
            this.status( ITcpServer.s.STOPPING );
            process.kill( process.pid, 'SIGTERM' );
            //process.kill( process.pid, 'SIGKILL' ); // if previous is not enough ?
        }
    }

    /**
     * Identifies the command received on the TCP communication port
     * @param {String[]} words the received string command and parameters
     * @param {Object[]} refs the commands known by the derived class
     * @returns {Object|null}
     *  command the identified command
     *  args    the arguments found after the command in the input string
     *  object  the object found in 'refs'
     * [-Public API-]
     */
    findExecuter( words, refs ){
        if( Object.keys( refs ).includes( words[0] ) && refs[words[0]].fn && typeof refs[words[0]].fn === 'function' ){
            const _command = words[0];
            const _args = words.splice( 1 );
            return {
                answer: {
                    command: _command,
                    args: _args,
                    timestamp: utils.now(),
                    answer: null
                },
                obj: refs[_command]
            };
        }
        return null;
    }

    /**
     * Internal stats have been modified
     * [-Public API-]
     */
    statsUpdated(){
        const _status = this.status().status;
        if( _status === ITcpServer.s.STOPPING || _status === ITcpServer.s.STOPPED ){
            Msg.debug( 'ITcpServer.statsUpdated() not triggering event as status is \''+_status+'\'' );
        } else {
            this._statsUpdated();
        }
    }

    /**
     * Getter/Setter
     * @param {String} newStatus the status to be set to the ITcpServer
     * @returns {Object} the status of the ITcpServer
     * [-Public API-]
     */
    status( newStatus ){
        Msg.debug( 'ITcpServer.status()', 'status='+this._status, 'newStatus='+newStatus );
        if( newStatus && typeof newStatus === 'string' && newStatus.length && Object.values( ITcpServer.s ).includes( newStatus )){
            this._status = newStatus;
        }
        const o = {
            status: this._status,
            port: this._port,
            in: {
                opened: this._inConnCount,
                closed: this._inClosedCount,
                msg: this._inMsgCount,
                bytes: this._inBytesCount
            },
            out: {
                opened: this._outConnCount,
                closed: 'unset',
                msg: this._outMsgCount,
                bytes: this._outBytesCount
            }
        };
        //Msg.debug( 'ITcpServer.status()', o );
        return o;
    }

    /**
     * Terminate this ITcpServer
     * @returns {Promise} which resolves when the server is actually closed
     * [-Public API-]
     */
    terminate(){
        Msg.debug( 'ITcpServer.terminate()', this._inConnCount, this._inClosedCount );
        if( this.status().status === ITcpServer.s.STOPPING ){
            Msg.debug( 'ITcpServer.terminate() returning as already stopping' );
            return Promise.resolve( true );
        }
        if( this.status().status === ITcpServer.s.STOPPED ){
            Msg.debug( 'ITcpServer.terminate() returning as already stopped' );
            return Promise.resolve( true );
        }

        // we advertise we are stopping as soon as possible
        this.status( ITcpServer.s.STOPPING );

        // closing the TCP server
        //  in order the TCP server be closeable, the current connection has to be ended itself
        //  which must be done prior to calling this method

        let _promise = Promise.resolve( true );
        const self = this;

        if( this._tcpServer ){
            const _closeServer = function(){
                Msg.debug( 'ITcpServer.terminate() about to close tcpServer' );
                return new Promise(( resolve, reject ) => {
                    self._tcpServer.close(() => {
                        Msg.debug( 'ITcpServer.terminate() tcpServer is closed' );
                        self.status( ITcpServer.s.STOPPED );
                        resolve( true );
                    });
                });
            };
            _promise = _promise.then(() => { return _closeServer(); })

        } else {
            Msg.warn( 'ITcpServer is not set!' );
        }

        return _promise;
    }
}