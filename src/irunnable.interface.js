/*
 * IRunnable interface
 *
 *  Implemented by cliApplication only, so a singleton.
 */
import chalk from 'chalk';
import path from 'path';

import { IForkable, Msg } from './index.js';

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
    static v_copyrightColor(){
        return 'white';
    }

    /**
     * @returns {String} the text to be used as a copyright message
     * [-implementation Api-]
     */
    static v_copyrightText(){
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
        if( !IForkable.forkedProcess()){
            const _color = IRunnable.v_copyrightColor();
            const _text = IRunnable.v_copyrightText();
            if( _color && _text ){
                console.log( chalk[_color].bold( _text ));
            }
        }
    }

    /**
     * run the requested action
     * @param {cliApplication} app the application instance
     *  The action must return a Promise, so that we will wait for its resolution (or rejection)
     *  Exit code must be set by the action in process.exitCode
     * [-public API-]
     */
    run( app ){
        const action = app.ICmdline.getAction();
        const core = app.core();
        const config = core.config();
        const common = core.commonName();
        Msg.startup( action, {
            appname: common,
            fname: path.join( config.logDir(), common+'.log' ),
            level: config.logLevel(),
            process: IForkable.forkedProcess(),
            console: config.consoleLevel()
        });
        //console.log( 'IRunnable.run() action='+action );
        let promise = null;
        process.exitCode = 0;
        try {
            switch( action ){
                case 'start':
                    promise = cliStart( core, app.ICmdline.getOptions().service );
                    break;
                case 'status':
                    promise = cliStatus( core, app.ICmdline.getOptions().service );
                    break;
                case 'stop':
                    promise = cliStop( core, app.ICmdline.getOptions().service );
                    break;
                case 'list-enabled':
                    promise = cliListEnabled( core );
                    break;
                case 'list-installed':
                    promise = cliListInstalled( core );
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
