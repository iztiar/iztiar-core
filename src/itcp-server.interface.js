/*
 * ITcpServer interface
 *
 *  A service which implements this ITcpServer interface (aka a TCP server) should be able to handle
 *  'iz.status' and 'iz.stop' commands.
 * 
 *  This interface natively handles and answers to 'iz.ping' commands.
 */
import net from 'net';

import { Msg, utils } from './index.js';

export class ITcpServer {

    static d = {
        port: 24001
    };

    static s = {
        STARTING: 'starting',
        RUNNING: 'running',
        STOPPING: 'stopping',
        STOPPED: 'stopped'
    };

    static verbs = {
        'iz.capability': {
            label: 'invoke the named capability (as first argument)',
            fn: ITcpServer._izCapability
        },
        'iz.help': {
            label: 'return the list of known commands',
            fn: ITcpServer._izHelp
        },
        'iz.ping': {
            label: 'ping the service',
            fn: ITcpServer._izPing
        }
    };

    // invoke a capability
    static _izCapability( instance, reply ){
        let _promise = Promise.resolve( true );
        if( instance.ICapability ){
            if( reply.args.length ){
                _promise = _promise
                    .then(() => { return instance.ICapability.invoke( reply.args[0] ); })
                    .then(( res ) => { reply.answer = res; });
            } else {
                _promise = _promise
                    .then(() => { reply.answer = instance.ICapability.get(); });
            }
        } else {
            _promise = _promise
                .then(() => { reply.answer = 'Error: instance doesn\'t implement ICapability interface'; });
        }
        _promise = _promise.then(() => { return Promise.resolve( reply ); });
        return _promise;
    }

    // display the list of known verbs
    static _izHelp( instance, reply ){
        reply.answer = instance.ITcpServer._availableVerbs;
        return Promise.resolve( reply );
    }

    // ping -> ack: the port is alive
    static _izPing( instance, reply ){
        reply.answer = 'iz.ack';
        return Promise.resolve( reply );
    }

    _instance = null;
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

    _availableVerbs = {
        ...ITcpServer.verbs
    };

    /**
     * Constructor
     * @param {*} instance the implementation instance
     * @returns {ITcpServer}
     */
    constructor( instance ){
        const exports = instance.api().exports();
        const Interface = exports.Interface;
        const Msg = exports.Msg;

        Msg.debug( 'ITcpServer instanciation' );
        this._instance = instance;
        this._status = ITcpServer.s.STOPPED;

        // add a 'tcpServer' capability to the implementation
        exports.ICapability.add( instance, 'tcpServer', this.status );

        // define a new status part for the tcp server
        exports.IStatus.add( instance, this._statusPart );

        // define a new checkable event
        exports.ICheckable.add( instance, this._newCheckable );

        return this;
    }

    // @param {featureProvider} instance actually the derived class (e.g. coreController)
    // @returns {Checkable} adapted to current ITcpServer
    //  note that this is only useful in the forked process
    _newCheckable( instance ){
        const Checkable = instance.api().exports().Checkable;
        let res = new Checkable();
        if( instance.ITcpServer._port ){
            res.startable = false;
            res.ports = [ instance.ITcpServer._port ];
        }
        return Promise.resolve( res );
    }

    // @returns {Promise} which resolves to the status part for the ITcpServer
    _statusPart( instance ){
        Msg.debug( 'ITcpServer.statusPart()', 'instance '+( instance ? 'set':'unset' ));
        const self = instance ? instance.ITcpServer : this;
        const o = {
            ITcpServer: {
                status: self._status,
                port: self._port,
                in: {
                    opened: self._inConnCount,
                    closed: self._inClosedCount,
                    msg: self._inMsgCount,
                    bytes: self._inBytesCount
                },
                out: {
                    opened: self._outConnCount,
                    closed: 'unset',
                    msg: self._outMsgCount,
                    bytes: self._outBytesCount
                }
            }
        };
        //Msg.debug( 'ITcpServer.status()', o );
        return Promise.resolve( o );
    }

    /* *** ***************************************************************************************
       *** The implementation API, i.e; the functions the implementation may want to implement ***
       *** *************************************************************************************** */

    /**
     * What to do when this ITcpServer is initPost listening ?
     * @param {Object} status of the ITcpServer
     * [-implementation Api-]
     */
    v_listening( status ){
        Msg.debug( 'ITcpServer.v_listening()' );
    }

    /**
     * Internal stats have been modified
     * @param {Object} status of the ITcpServer
     * [-implementation Api-]
     */
    v_statsUpdated( status ){
        Msg.debug( 'ITcpServer.v_statsUpdated()' );
    }

    /* *** ***************************************************************************************
       *** The public API, i.e; the API anyone may call to access the interface service        ***
       *** *************************************************************************************** */

    /**
     * Add a verb to the ITcpServer
     * Checks that the ITcpServer is actually implemented, but doesn't try to implement it
     * @param {Object} instance the implementation instance
     * @param {*} args see add() method
     */
    static add(){
        if( arguments.length < 4 ){
            Msg.error( 'ITcpServer.static.add() expects at least ( instance, verb, help, fn ) arguments' );
        } else {
            let _args = [ ...arguments ];
            const instance = _args.splice( 0, 1 )[0];
            if( !instance ){
                Msg.error( 'ITcpServer.static.add() expects at least an instance argument' );
            } else if( !instance.ITcpServer ){
                console.log( instance );
                Msg.error( 'ITcpServer.static.add() instance doesn\'t implement ITcpServer' );
            } else {
                instance.ITcpServer.add( ..._args );
            }
        }
    }

    /**
     * Add a verb to the ITcpServer
     * @param {String} verb the verb, must be unique
     * @param {String} label a short help message
     * @param {Function} fn the function to be called when this verb is invoked
     * @param {Boolean} end whether the connection has to be closed after the answer, defaulting to false
     * @param {*} args arguments provided to the fn funtion after:
     *  - the implementation instance
     *  - the prepared reply (cf. tcp-server-reply.schema.json)
     */
    add(){
        if( arguments.length < 3 ){
            Msg.error( 'ITcpServer.add() expects at least ( verb, help, fn ) arguments' );
        } else {
            let _args = [ ...arguments ];
            const verb = _args.splice( 0, 1 )[0];
            if( Object.keys( this._availableVerbs ).includes( verb )){
                Msg.error( 'ITcpServer.add() verb=\''+verb+'\' already defined' );
            } else {
                const label = _args.splice( 0, 1 )[0];
                const fn = _args.splice( 0, 1 )[0];
                const end = _args.length ? _args.splice( 0, 1 )[0] : false;
                if( fn && typeof fn === 'function' ){
                    this._availableVerbs[verb] = {
                        label: label,
                        fn: fn,
                        end: end,
                        args: _args
                    };
                } else {
                    Msg.error( 'ITcpServer.add() verb=\''+verb+'\' lacks at least a function' );
                }
            }
        }
    }

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
        Msg.info( 'server answers to request with', obj, 'close='+close );
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
     *  This may be obtained by returning a Promise which never resolves: return new Promise(() => {});
     * [-public API-]
     */
    create( port ){
        Msg.debug( 'ITcpServer.create()', 'port='+port );
        this.status( ITcpServer.s.STARTING );
        this._port = port;
        const self = this;

        this._tcpServer = net.createServer(( c ) => {
            self._inConnCount += 1;
            Msg.debug( 'ITcpServer new incoming connection', 'inConnCount='+self._inConnCount, 'inCloseCount='+self._inClosedCount );

            // refuse all connections if the server is not 'running'
            self.status().then(( res ) => {
                if( res.status !== ITcpServer.s.RUNNING ){
                    const _res = { answer:'temporarily refusing connections', status:res.status, timestamp:utils.now() };
                    Msg.debug( 'ITcpServer refuses new connection as status='+res.status+' while expected is '+ITcpServer.s.RUNNING );
                    self.answer( c, _res, true );
                }
            });

            c.on( 'data', ( data ) => {
                //console.log( data );
                const _bufferStr = new Buffer.from( data ).toString().replace( /[\r\n]+/, '' );
                self._inMsgCount += 1;
                self._inBytesCount += _bufferStr.length+2;
                // Ctrl+D aka end_of_stream
                if( _bufferStr == "\u0004" ){
                    Msg.info( 'ITcpServer receives \u0004 = EndOfStream' );
                    c.end();
                } else {
                    const _words = _bufferStr.split( /\s+/ );
                    Msg.info( 'ITcpServer receives \''+_bufferStr+'\' request', 'verb.length='+_words[0].length, 'words.count='+_words.length );
                    try {
                        let _reply = {
                            verb: _words[0],
                            args: [ ..._words ].splice( 1 ),
                            timestamp: utils.now(),
                            answer: null
                        };
                        if( !self.execute( _words, c, _reply, self._availableVerbs )){
                            const _msg = 'ITcpServer error: unknown verb \''+_words[0]+'\'';
                            Msg.error( _msg );
                            _reply.answer = _msg;
                            this.answer( c, _reply, true );
                        }
                    } catch( e ){
                        Msg.error( 'ITcpServer.execute()', e.name, e.message );
                        c.end();
                    }
                }
            })

            .on( 'close', () => {
                self._inClosedCount += 1;
                Msg.debug( 'ITcpServer closing connection', 'inConnCount='+self._inConnCount, 'inCloseCount='+self._inClosedCount );
                self.statsUpdated();
            })

            .on( 'error', ( e ) => {
                self.errorHandler( e );
            });
        });
        Msg.debug( 'ITcpServer.create() tcpServer created' );

        return new Promise(( resolve, reject ) => {
            self._tcpServer.listen( port, '0.0.0.0', () => {
                self.status( ITcpServer.s.RUNNING ).then(( res ) => { self.v_listening( res ); });
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
        //////////// no more terminate on error, just logging it ??
        this.status().then(( res ) => {
            if( res.status !== ITcpServer.s.STOPPING ){
                Msg.info( 'auto-killing on '+e.code+' error' );
                this.status( ITcpServer.s.STOPPING );
                process.kill( process.pid, 'SIGTERM' );
                //process.kill( process.pid, 'SIGKILL' ); // if previous is not enough ?
            }
        });
    }

    /**
     * Execute the command if the verb is found in the provided referentiel
     * @param {String[]} words the received string command and parameters
     * @param {Object} client the client tcp connnection
     * @param {Object} reply the prepared reply
     * @param {Object} ref the known verbs
     * @returns {Boolean} whether the verb has been found (and executed or at least tried to be executed)
     * [-Public API-]
     */
    execute( words, client, reply, ref ){
        const _verb = words[0];
        const _found = Object.keys( ref ).includes( _verb );
        if( _found ){
            if( ref[_verb].fn && typeof ref[_verb].fn === 'function' ){
                const _args = ref[_verb].args ? [ ...ref[_verb].args ] : [];
                ref[_verb].fn( this._instance, reply, ..._args )
                    .then(( res ) => { this.answer( client, res, ref[_verb].end || false ); });
            }
        }
        return _found;
    }

    /**
     * Fill the configuration for this interface
     * @param {Object} conf the full feature configuration
     * @returns {Promise} which resolves to the filled interface configuration
     */
    fillConfig( conf ){
        const exports = this._instance.api().exports();
        exports.Msg.debug( 'ITcpServer.fillConfig()', this._instance.constructor.name );
        let _filled = conf.ITcpServer;
        if( !_filled.port ){
            _filled.port = ITcpServer.d.port;
        }
        return Promise.resolve( _filled );
    }

    /**
     * Internal stats have been modified
     * [-Public API-]
     */
    statsUpdated(){
        this.status().then(( res ) => {
            if( res.status === ITcpServer.s.STOPPING || res.status === ITcpServer.s.STOPPED ){
                Msg.debug( 'ITcpServer.statsUpdated() not triggering event as status is \''+res.status+'\'' );
            } else {
                this.v_statsUpdated( res );
            }
        })
    }

    /**
     * Getter/Setter
     * @param {String} newStatus the status to be set to the ITcpServer
     * @returns {Promise} which resolves to the status of the ITcpServer
     * [-Public API-]
     */
    status( newStatus ){
        Msg.debug( 'ITcpServer.status()', 'status='+this._status, 'newStatus='+newStatus );
        if( newStatus && typeof newStatus === 'string' && newStatus.length && Object.values( ITcpServer.s ).includes( newStatus )){
            this._status = newStatus;
        }       
        return this._statusPart().then(( res ) => { return Promise.resolve( res.ITcpServer ); });
    }

    /**
     * Terminate this ITcpServer
     * @returns {Promise} which resolves when the server is actually closed
     * [-Public API-]
     */
    terminate(){
        Msg.debug( 'ITcpServer.terminate()', this._inConnCount, this._inClosedCount );
        this.status().then(( res ) => {
            if( res.status === ITcpServer.s.STOPPING ){
                Msg.debug( 'ITcpServer.terminate() returning as already stopping' );
                return Promise.resolve( true );
            }
            if( res.status === ITcpServer.s.STOPPED ){
                Msg.debug( 'ITcpServer.terminate() returning as already stopped' );
                return Promise.resolve( true );
            }
        });

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
