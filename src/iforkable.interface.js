/*
 * IForkable interface
 *
 *  May be implemented by any class which want to be forked (i.e. act as a daemon).
 */
import cp from 'child_process';

import { Msg } from './index.js';

export class IForkable {

    static c = {
        forkable: 'iztiar-bc05bf55-4313-49d7-ab9d-106c93c335eb'
    };

    constructor(){
        Msg.debug( 'IForkable instanciation' );

        // install signal handlers
        const self = this;
        process.on( 'SIGUSR1', () => {
            Msg.debug( 'USR1 signal handler' );
        });

        process.on( 'SIGUSR2', () => {
            Msg.debug( 'USR2 signal handler' );
        });

        process.on( 'SIGTERM', () => {
            Msg.debug( 'process receives SIGTERM signal' );
            self._terminate();
        });

        process.on( 'SIGHUP', () => {
            Msg.debug( 'HUP signal handler' );
        });

        process.on( 'SIGQUIT', () => {
            Msg.debug( 'QUIT signal handler' );
        });
    }

    /* *** ***************************************************************************************
       *** The implementation API, i.e; the functions the implementation may want to implement ***
       *** *************************************************************************************** */

    /**
     * @returns {String} the name of the environment variable which, if set, holds the qualifier of the forked process
     * [-implementation Api-]
     */
    static _forkedVar(){
        return IForkable.c.forkable;
    }

    /**
     * Terminates the child process
     * @returns {Promise} which resolves when the process is actually about to terminate (only waiting for this Promise)
     * [-implementation Api-]
     */
    _terminate(){
        return Promise.resolve( true );
    }

    /* *** ***************************************************************************************
       *** The public API, i.e; the API anyone may call to access the interface service        ***
       *** *************************************************************************************** */

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
        Msg.debug( 'IForkable::fork() about to fork '+forkable );
        const _path = process.argv[1];
        let _args = args ? [ ...args ] : [ ...process.argv ];
        _args.shift();
        _args.shift();
        Msg.debug( 'IForkable::fork()', 'forking with path='+_path, 'args', _args );
        let _env = { ...process.env };
        _env[IForkable._forkedVar()] = forkable; // this says to the child that it has been forked
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
        //console.log( 'IForkable._forkedVar', IForkable._forkedVar());
        const _var = IForkable._forkedVar();
        return _var ? process.env[_var] : null;
    }

    /**
     * Send an IPC message to the parent when this (child process) service is ready
     * @param {string} message a Hello message to be written in the logfile
     * @param {*} data to be send to the parent, for example the current status of the server
     * @throw {Error}
     */
    advertiseParent( message, data={} ){
        let _procName = IForkable.forkedProcess();
        Msg.debug( _procName+' advertising parent', 'message='+message, data );
        // unfortunately this try/catch doesn't handle Error [ERR_IPC_CHANNEL_CLOSED]: Channel closed
        //  triggered by process.send() in coreController/coreBroker processes when the parent has already terminated
        try {
            let _msg = { ...data };
            //console.log( 'data', data );
            _msg[_procName].event = 'startup';
            _msg[_procName].helloMessage = message;
            //console.log( '_msg', _msg );
            process.send( _msg );
            Msg.info( 'IForkable.advertiseParent() sends', _msg );
        } catch( e ){
            Msg.error( e.name, e.message );
        }
    }
}
