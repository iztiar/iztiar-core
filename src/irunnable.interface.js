/*
 * IRunnable interface
 *
 *  Implemented by coreApplication only, so a singleton.
 */
import chalk from 'chalk';
import path from 'path';

import { coreForkable, Msg } from './index.js';

import { cliStart } from './cli-start.js';
import { cliStatus } from './cli-status.js';
import { cliStop } from './cli-stop.js';
import { cliListEnabled } from './cli-list-enabled.js';
import { cliListInstalled } from './cli-list-installed.js';

export class IRunnable {

    static _singleton = null;

    constructor(){
        if( IRunnable._singleton ){
            return IRunnable._singleton;
        }
        //console.log( 'IRunnable instanciation' );

        IRunnable._singleton = this;
        return IRunnable._singleton;
    }

    /* *** ***************************************************************************************
       *** The implementation API, i.e; the functions the implementation may want to implement ***
       *** *************************************************************************************** */

    /**
     * @returns {String} the color to be used when printing the copyright message on the console
     * [-implementation Api-]
     */
    static _copyrightColor(){
        return 'white';
    }

    /**
     * @returns {String} the text to be used as a copyright message
     * [-implementation Api-]
     */
    static _copyrightText(){
        return 'IRunnable:copyrightText()';
    }

    /* *** ***************************************************************************************
       *** The public API, i.e; the API anyone may call to access the interface service        ***
       *** *************************************************************************************** */

    /**
     * unless we are running in a forked process, display a copyright message on the console
     * [-public API-]
     */
    displayCopyright(){
        if( !coreForkable.forkedProcess()){
            const _color = IRunnable._copyrightColor();
            const _text = IRunnable._copyrightText();
            if( _color && _text ){
                console.log( chalk[_color].bold( _text ));
            }
        }
    }

    /**
     * run the requested action
     * @param {coreApplication} app the application instance
     *  The action must return a Promise, so that we will wait for its resolution (or rejection)
     *  Exit code must be set by the action in process.exitCode
     * [-public API-]
     */
    run( app ){
        const action = app.ICmdline.getAction();
        Msg.startup( action, {
            appname: app.commonName(),
            fname: path.join( app.config().logDir(), app.commonName()+'.log' ),
            level: app.config().logLevel(),
            process: coreForkable.forkedProcess(),
            console: app.config().consoleLevel()
        });
        //console.log( 'IRunnable.run() action='+action );
        let promise = null;
        process.exitCode = 0;
        try {
            switch( action ){
                case 'start':
                    promise = cliStart( app, app.ICmdline.getOptions().service );
                    break;
                case 'status':
                    promise = cliStatus( app, app.ICmdline.getOptions().service );
                    break;
                case 'stop':
                    promise = cliStop( app, app.ICmdline.getOptions().service );
                    break;
                case 'list-enabled':
                    promise = cliListEnabled( app );
                    break;
                case 'list-installed':
                    promise = cliListInstalled( app );
                    break;
                default:
                    break;
            }
        } catch( e ){
            process.exitCode += 1;
            throw e;
        }
        // Waiting here for the Promise returned by the action be settled, either resolved or rejected.
        // We are prepared to managed both success and failure, but do not modify in either cases the exit code of the process.
        // It is up to the action to compute whether its own code is successful or not.
        if( promise && promise instanceof Promise ){
            promise.then(( successValue ) => {
                Msg.debug( 'IRunnable.run().success with', successValue );
                Msg.verbose( 'Exiting with code', process.exitCode );
                // https://nodejs.org/api/process.html#processexitcode prevents against a direct process.exit() call
                process.exit();

            }, ( failureReason ) => {
                Msg.error( 'IRunnable.run().failure', failureReason );
                Msg.verbose( 'Exiting with code', process.exitCode );
                process.exit();
            });
        }
    }
}
