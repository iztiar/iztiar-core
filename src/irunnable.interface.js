/*
 * IRunnable interface
 *
 *  Implemented by coreApplication only, so a singleton.
 */
import chalk from 'chalk';

import { IForkable, IMsg } from './imports.js';

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
        if( !IForkable.processQualifier()){
            const _color = IRunnable._copyrightColor();
            const _text = IRunnable._copyrightText();
            if( _color && _text ){
                console.log( chalk[_color].bold( _text ));
            }
        }
    }

    /**
     * run the requested action
     * @param {String} action the requested action
     * [-public API-]
     */
    run( action ){
        console.log( 'IRunnable.run() action='+action );
        IMsg.startup( action );
        IMsg.debug( 'debug message' );
        IMsg.verbose( 'verbose message' );
        IMsg.info( 'info message' );
        IMsg.out( 'out message' );
        IMsg.warn( 'warn message' );
        IMsg.error( 'error message' );
    }
}
