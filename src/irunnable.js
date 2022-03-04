/*
 * IRunnable interface
 */
import chalk from 'chalk';

export class IRunnable {

    /* *** ***************************************************************************************
       *** The implementation API, i.e; the functions the implementation may want to implement ***
       *** *************************************************************************************** */

    /**
     * @returns {String} the color to be used when printing the copyright message on the console
     * [-implementation Api-]
     */
    _copyrightColor(){
        return 'white';
    }

    /**
     * @returns {String} the text to be used as a copyright message
     * [-implementation Api-]
     */
    _copyrightText(){
        return 'IRunnable:copyrightText()';
    }

    /**
     * @returns {String} the name of the environment variable which, if set, holds the qualifier of the forked process
     * [-implementation Api-]
     */
    _forkedVar(){
        return '';
    }

    /**
     * parse command-line arguments
     * [-implementation Api-]
     */
    _parseArgs(){
        return null;
    }

    /* *** ***************************************************************************************
       *** The public API, i.e; the API anyone may call to access the interface service        ***
       *** *************************************************************************************** */

    /**
     * print a copyright message on the console
     * [-public API-]
     */
     displayCopyright(){
        const _color = this._copyrightColor();
        const _text = this._copyrightText();
        if( _color && _text ){
            console.log( chalk[_color].bold( _text ));
        }
    }

    /**
     * @returns {String|null} the qualifier of the forked process
     * [-public API-]
     */
    forkedQualifier(){
        const _var = this._forkedVar();
        return _var ? process.env[_var] : null;
    }

    /**
     * Run the application
     * [-public API-]
     */
    run(){
        console.log( 'IRunnable.run()' );

        // unless we are running in a forked process, display a copyright message on the console
        if( !this.forkedQualifier()){
            this.displayCopyright();
        }

        // Due to well-known chicken-and-egg problem, we have to first parse the command-line options.
        //  This will define our <storageDir>, which also define the <logDir> and the <configDir>.
        //  So we will be able to load application configuration, and then initialize our logger...
        try {
            this._parseArgs();
            //appConfig = coreConfig.getAppFilledConfig();
            //msg.init( Iztiar.c.app.name, appConfig );
            //coreCmdline.startupLog();
        } catch( e ){
            //msg.error( 'cli-runner', e.name, e.message );
            //process.exitCode += 1;
        }
    }
}
