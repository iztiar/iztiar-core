/*
 * IForkable interface
 *
 *  May be implemented by any class which want to be forked (i.e. act as a daemon).
 *  Provides the ad-hoc v_start(), v_status() and v_stop() methods.
 */
import cp from 'child_process';

import { Msg } from './index.js';

export class IForkable {

    static c = {
        forkable: 'iztiar-bc05bf55-4313-49d7-ab9d-106c93c335eb'
    };

    /**
     * @returns {String} the name of the environment variable which, if set, holds the qualifier of the forked process
     * [-implementation Api-]
     */
    static _forkedVar(){
        return IForkable.c.forkable;
    }

    _instance = null;

    constructor( instance ){
        Msg.debug( 'IForkable instanciation' );
        this._instance = instance;

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
            this._instance.terminate();
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
     * Start the service (and just that)
     * @param {String} name the name of the feature
     * @param {Callback|null} cb the funtion to be called on IPC messages reception (only relevant if a process is forked)
     * @param {String[]} args arguments list (only relevant if a process is forked)
     * @returns {Promise}
     * Notes:
     *  - If the service must start in its own process, then the calling application must have taken care of forking the ad-hoc
     *    process before calling this method.
     *  - This method is not expected to check that the service is not running before to start, and not expected either to check
     *    that the service is rightly running after that.
     * @returns {Promise}
     * [-implementation Api-]
     */
    v_start(){
        Msg.verbose( 'IForkable.v_start()' );
        return Promise.resolve( false );
    }

    /**
     * Returns the status of the detached process
     * @returns {Promise} which resolves to the status
     * [-implementation Api-]
     */
    v_status(){
        Msg.verbose( 'IForkable.v_status()' );
        return Promise.resolve( false );
    }

    /**
     * Terminates the detached process
     * @returns {Promise} which resolves when the process has acknowledged the request
     * [-implementation Api-]
     */
    v_stop(){
        Msg.verbose( 'IForkable.v_stop()' );
        return Promise.resolve( false );
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
        Msg.verbose( 'IForkable::fork()', 'forking with path='+_path, 'args', _args );
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
     * Send an IPC message to the parent when this (child process) service is initPost
     * @param {*} data to be send to the parent, for example the current status of the server
     * @throw {Error}
     */
    advertiseParent( data ){
        Msg.verbose( 'IForkable.advertiseParent() with', data );
        // note that this try/catch doesn't handle Error [ERR_IPC_CHANNEL_CLOSED]: Channel closed
        //  triggered by process.send() in coreController/coreBroker processes when the parent has already terminated
        try {
            process.send( data );
        } catch( e ){
            Msg.error( e.name, e.message );
        }
    }
}
