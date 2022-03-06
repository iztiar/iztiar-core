/*
 * IMsg interface
 *
 *  Manage both console output and file logging.
 *  See ILogger interface for a full description of console and log levels.
 */
import { IForkable, ILogger } from './imports.js';

export class IMsg extends ILogger {

    static _singleton = null;

    constructor(){
        if( IMsg._singleton ){
            return IMsg._singleton;
        }
        super();
        IMsg._singleton = this;
        return IMsg._singleton;
    }

    static _log(){
        //console.log( 'IMsg._log()', arguments );

        // IMsg console LogLevel object
        const _consoleLevel = arguments[0];

        // compute the ILogger log level from the console level
        //  this is a lowercase label which happens to also be the static function name
        let _logLevel;
        switch( _consoleLevel.label()){
            case 'normal':
                _logLevel = null;
                break;
            case 'verbose':
                _logLevel = 'info';
                break;
            default:
                _logLevel = _consoleLevel.label();
                break;
        }

        // color of the console message is taken from the LogLevel objects instanciated in ILogger
        const color = _consoleLevel.color();

        // remove the console level from the list of arguments
        let _args = [ ...arguments ];
        _args.splice( 0, 1 );

        // log to the file if not prevented from
        if( _logLevel ){
            ILogger[_logLevel]( ..._args );
        }

        // log to the console if not prevented from
        //console.log( '_singleton.consoleLevel='+_singleton._consoleLevel, '_consoleLevel='+_consoleLevel, 'Iztiar.c.verbose[_consoleLevel]='+Iztiar.c.verbose[_consoleLevel] );
        //console.log( 'message console level', _consoleLevel );
        //console.log( 'app requested console level', ILogger.const[IMsg._singleton._consoleLevel()] );

        if( !IForkable.processQualifier() && ILogger.const[IMsg._singleton._consoleLevel()].level() >= _consoleLevel.level()){
            if( color ){
                console.log( color( ..._args ));
            } else {
                console.log( ..._args );
            }
        }
    }

    /* *** ***************************************************************************************
       *** The implementation API, i.e; the functions the implementation may want to implement ***
       *** *************************************************************************************** */

    /**
     * @returns {String} the requested console level (defaulting to 'NORMAL')
     * [-implementation Api-]
     */
    _consoleLevel(){
        return ILogger.defaults.consoleLevel;
    }

    /* *** ***************************************************************************************
       *** The public API, i.e; the API anyone may call to access the interface service        ***
       *** *************************************************************************************** */

    /**
     * [-public API-]
     */
    static error(){
        IMsg._log( ILogger.const.ERROR, ...arguments );
    }

    /**
     * [-public API-]
     */
    static warn(){
        IMsg._log( ILogger.const.WARN, ...arguments );
    }

    /**
     * [-public API-]
     */
    static out(){
        IMsg._log( ILogger.const.NORMAL, ...arguments );
    }

    /**
     * [-public API-]
     */
    static info(){
        IMsg._log( ILogger.const.INFO, ...arguments );
    }

    /**
     * [-public API-]
     */
    static verbose(){
        IMsg._log( ILogger.const.VERBOSE, ...arguments );
    }

    /**
     * [-public API-]
     */
    static debug(){
        IMsg._log( ILogger.const.DEBUG, '(debug)', ...arguments );
    }

    /**
     * Writes a first line in the log
     * @param {String} action the requested identified action
     * [-public API-]
     */
    static startup( action ){
        ILogger.startup();
        ILogger.info( 'program invoked with args', process.argv );
        ILogger.info( 'command-line arguments successfully parsed: identified action \''+action+'\'');
    }
}
