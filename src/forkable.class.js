/*
 * coreForkable interface
 */
import cp from 'child_process';

import { Msg } from './index.js';

export class coreForkable {

    static c = {
        forkable: 'iztiar-bc05bf55-4313-49d7-ab9d-106c93c335eb',
        stop: {
            command: 'iz.stop.forwarded'
        }
    };

    static s = {
        STARTING: 'starting',
        RUNNING: 'running',
        STOPPING: 'stopping'
    };

    /**
     * @returns {String} the name of the environment variable which, if set, holds the qualifier of the forked process
     */
    static _forkedVar(){
        return coreForkable.c.forkable;
    }

    /**
     * Fork this process
     *  actually re-running our same CLI command in a child dedicated environment
     * @param {string} forkable the forkable to fork
     * @param {Callback} ipcCallback a ( child, messageData ) callback to be triggered when receiving IPC messages
     * @param {string[]} args the command-line arguments to be considered, defaulting to process.argv
     * @returns {ChidlProcess} the forked child process
     * 
     * Note:
     *  Node.js sets up a communication channel between the parent process and the forked child process.
     *  child.send( message ) is received on the callback below.
     *  Unfortunately this means that the parent has to stay running. which is not what we want
     *  (at least in the main-vs-coreController relation case).
     *  So, the IPC channel is only used for advertising the parent of the startup event.
     * 
     * Note:
     *  Execute in parent process.
     */
    static fork( forkable, ipcCallback, args ){
        Msg.debug( 'coreForkable::fork() about to fork '+forkable );
        const _path = process.argv[1];
        let _args = args ? [ ...args ] : [ ...process.argv ];
        _args.shift();
        _args.shift();
        Msg.debug( 'coreForkable::fork()', 'forking with path='+_path, 'args', _args );
        let _env = { ...process.env };
        _env[coreForkable._forkedVar()] = forkable; // this says to the child that it has been forked
        let _options = {
            detached: true,
            env: _env
        };

        let child = cp.fork( _path, _args, _options );

        child.on( 'message', ( messageData ) => {
            ipcCallback( child, messageData );
        });

        return child;
    }

    /**
     * @returns {String|null} the qualifier of the forked process
     */
    static forkedProcess(){
        //console.log( 'coreForkable._forkedVar', coreForkable._forkedVar());
        const _var = coreForkable._forkedVar();
        return _var ? process.env[_var] : null;
    }

    // construction
    _api = null;
    _status = null;

    /**
     * @param {coreApi} api the core API as described in core-api.schema.json
     * @param {coreService} service
     * @returns {coreForkable}
     */
     constructor( api ){
        Msg.debug( 'coreForkable instanciation' );
        //console.log( api );
        this._api = api;
        return this;
    }

    /**
     * Send an IPC message to the parent when this (child process) server is ready
     * @param {integer} port the TCP port number the server is listening to
     * @param {string} message a Hello message to be written in the logfile
     * @param {*} data to be send to the parent, for example the current status of the server
     * @throw {Error}
     */
    advertiseParent( port, message, data ){
        if( this._status !== coreForkable.s.STOPPING ){
            let _procName = coreForkable.forkedProcess();
            Msg.debug( _procName+' advertising parent' );
            // unfortunately this try/catch doesn't handle Error [ERR_IPC_CHANNEL_CLOSED]: Channel closed
            //  triggered by process.send() in coreController/coreBroker processes when the parent has already terminated
            try {
                let _msg = { ...data };
                //console.log( 'data', data );
                _msg[_procName].event = 'startup';
                _msg[_procName].status = this.runningStatus( coreForkable.s.RUNNING );
                _msg[_procName].helloMessage = message;
                //console.log( '_msg', _msg );
                process.send( _msg );
                Msg.info( 'coreForkable.advertiseParent() sends', _msg );
            } catch( e ){
                Msg.error( e.name, e.message );
            }
        }
    }

    /**
     * @returns {coreApi} the whole core API object provided by the core at initialization time
     */
    api(){
        return this._api;
    }

    /**
     * @returns {coreConfig} the app configuration provided by the core at initialization time
     */
    coreConfig(){
        return this._api.coreConfig();
    }

    /**
     * An error handler for implementation classes
     * @param {Error} e exception on TCP server listening
     * (child process)
     */
    errorHandler( e ){
        Msg.debug( 'coreForkable:errorHandler() entering...' );
        if( e.stack ){
            Msg.error( 'coreForkable:errorHandler()', e.name, e.message );
        }
        // for now, do not terminate on ECONNRESET
        //if( e.code === 'ECONNRESET' ){
        //    return;
        //}
        // not very sure this is good idea !?
        if( this._sceStatus !== coreForkable.s.STOPPING ){
            Msg.info( 'auto-killing on '+e.code+' error' );
            this._sceStatus = coreForkable.s.STOPPING;
            process.kill( process.pid, 'SIGTERM' );
            //process.kill( process.pid, 'SIGKILL' ); // if previous is not enough ?
        }
    }

    /**
     * Identifies the command received on the TCP communication port
     * @param {string} cmd the received string command, maybe with space-delimited parameters
     * @param {Object} refs the commands known by the derived class (typically coreController)
     * @returns {Object}
     *  command the identified command
     *  args    the arguments found after the command in the input string
     *  object  the object found in 'refs'
     * @throws {Error}
     */
    findExecuter( cmd, refs, cb ){
        //msg.debug( 'cmd', cmd );
        //msg.debug( 'refs', refs );
        //msg.debug( 'refs.keys', Object.keys( refs ));
        if( !cmd || typeof cmd !== 'string' || !cmd.length ){
            throw new Error( 'coreForkable.findExecuter() unset command' );
        }
        const _words = cmd.split( ' ' );
        //msg.debug( 'words', _words );
        if( !Object.keys( refs ).includes( _words[0] )){
            throw new Error( 'coreForkable.findExecuter() unknown command '+_words[0] );
        }
        const _cmd = _words[0];
        const _ocmd = refs[_cmd];
        if( !_ocmd || !_ocmd.fn || typeof _ocmd.fn !== 'function' ){
            throw new Error( 'coreForkable.findExecuter() command not (or not enough) defined \''+_cmd+'\'' );
        }
        _words.splice( 0, 1 );
        return { command:_cmd, args:_words, object:_ocmd };
    }

    /**
     * Getter/Setter
     * @param {string} status the runtime status of the server
     * @returns the runtime status of the server
     */
    runningStatus( status ){
        if( status && typeof status === 'string' && status.length ){
            this._status = status;
        }
        //Msg.debug( 'status='+status, 'returning '+this._status );
        return this._status;
    }

    /**
     * @returns {coreService}
     */
    service(){
        return this._api.service();
    }
}
