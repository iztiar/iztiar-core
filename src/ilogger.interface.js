/*
 * ILogger interface
 *
 *  Writes messages into the log file depending of their severity level vs. the requested log level.
 *  See IMsg interface for a service which both writes to the console and to the log file.
 *
 * Rationale
 *  Log level (resp. console level) is used to indicate the importance of the logged message.
 * 
 *  According to man syslog(2), conventional meaning of the log level is as follows:
 *    Kernel constant   Level value   Meaning
 *    KERN_EMERG             0        System is unusable
 *    KERN_ALERT             1        Action must be taken immediately
 *    KERN_CRIT              2        Critical conditions
 *    KERN_ERR               3        Error conditions
 *    KERN_WARNING           4        Warning conditions
 *    KERN_NOTICE            5        Normal but significant condition
 *    KERN_INFO              6        Informational
 *    KERN_DEBUG             7        Debug-level messages
 *
 *  According to Pino API, the default logging methods are trace, debug, info, warn, error, and fatal.
 *
 *  We so choose to have following mapping:
 * 
 *    Kernel constant    Pino method                                             ILogger  level  IMsg      comment
 *    ---------------    -----------                                             -------  -----  --------  -----------
 *                                                                                          0              fully quiet
 *    KERN_EMERG         fatal()     -> ignored here, assimilated to error()
 *    KERN_ALERT                     -> ignored here, assimilated to error()
 *    KERN_CRIT                      -> ignored here, assimilated to error()
 *    KERN_ERR           error()                                                 error()    1    error()
 *    KERN_WARNING       warn()                                                  warn()     2    warn()
 *    KERN_NOTICE                    -> ignored here, assimilated to info()
 *    KERN_INFO          info()                                                             3    out()     normal
 *                                                                               info()     4    info()
 *                                                                                          5    verbose()
 *    KERN_DEBUG         debug()                                                 debug()    6    debug()
 *                      trace()     -> ignored here, assimilated to debug()
 */
import chalk from 'chalk';
import pino from 'pino';

import { coreForkable, LogLevel, utils } from './index.js';

export class ILogger {

    static defaults = {
        fname: '/dev/null',
        level: 'INFO'
    };

    static const = null;

    _logOptions = null;
    _logger = null;

    // injects an 'origin' prefix at the start of logged messages
    static _emitter(){
        return coreForkable.forkedProcess() || 'main';
    }

    _iloggerLog(){
        // ILogger log LogLevel object
        const _logLevel = arguments[0];
        delete arguments[0];

        //console.log( 'ILogger.log() app-requested log level', ILogger._singleton._logLevel());
        //console.log( 'ILogger.log() app-configured log filename', ILogger._singleton._logFname());
        //console.log( arguments );

        if( this._logger ){
            // check that the level is allowed for the current transport
            //  may be overriden with IZTIAR_DEBUG
            if( !this._logger.isLevelEnabled( _logLevel.label()) && process.env.IZTIAR_DEBUG && process.env.IZTIAR_DEBUG.includes( 'logLevel' )){
                console.log(( _logLevel.color())( ILogger._emitter(), '(not allowed log level)', ...arguments ));
            } else {
                this._logger[_logLevel.label()]([ ILogger._emitter(), ...arguments ]);
                //_logger[_lower]( color( [ _emitter(), ...arguments ]));
            }

        // before any logger be instanciated, one can still log the main CLI process to the console
        } else if( !coreForkable.forkedProcess() && process.env.IZTIAR_DEBUG && process.env.IZTIAR_DEBUG.includes( 'preCore' )){
            console.log(( _logLevel.color())( ILogger._emitter(), ...arguments ));
        }
    }

    constructor(){
        if( !ILogger.const ){
            ILogger.const = {
                QUIET: new LogLevel( 0, 'quiet' ),
                ERROR: new LogLevel( 10, 'error', chalk.red ),
                WARN: new LogLevel( 20, 'warn', chalk.yellow ),
                NORMAL: new LogLevel( 30, 'normal' ),
                INFO: new LogLevel( 40, 'info', chalk.hex( '#00ffff' )),
                VERBOSE: new LogLevel( 50, 'verbose', chalk.hex( '#3399ff' )),
                DEBUG: new LogLevel( 60, 'debug', chalk.hex( '#0000ff' ))
            };
        }
        return this;
    }
    
    /* *** ***************************************************************************************
       *** The implementation API, i.e; the functions the implementation may want to implement ***
       *** *************************************************************************************** */

    /**
     * @returns {String} the application name
     * [-implementation Api-]
     */
    _logAppname(){
        return null;
    }

    /**
     * @returns {String} the requested log level (defaulting to 'INFO')
     * [-implementation Api-]
     */
    _logLevel(){
        return ILogger.defaults.level;
    }

    /**
     * @returns {String} the full log file pathname
     * [-implementation Api-]
     */
    _logFname(){
        return ILogger.defaults.fname;
    }

    /* *** ***************************************************************************************
       *** The public API, i.e; the API anyone may call to access the interface service        ***
       *** *************************************************************************************** */

    /**
     * [-public API-]
     */
    error(){
        this._iloggerLog( ILogger.const.ERROR, ...arguments );
    }

    /**
     * [-public API-]
     */
    warn(){
        this._iloggerLog( ILogger.const.WARN, ...arguments );
    }

    /**
     * [-public API-]
     */
    info(){
        this._iloggerLog( ILogger.const.INFO, ...arguments );
    }

    /**
     * [-public API-]
     */
    debug(){
        this._iloggerLog( ILogger.const.DEBUG, ...arguments );
    }

    /**
     * @returns {String} the log filename
     * [-public API-]
     */
    logFname(){
        return this._logFname();
    }

    /**
     * Initialize the log implentation
     * @throws {Error} when trying to startup() more than once
     * [-public API-]
     */
    startup(){
        if( this._logger ){
            throw new Error( 'ILogger: trying to startup() more than once' );
        }
        this._logOptions = {
            name: this._logAppname(),
            level: ILogger.const[this._logLevel()].label()
        };
        utils.makeFnameDirExists( this._logFname());
        //console.log( ILogger );
        this._logger = pino( this._logOptions, pino.destination( this._logFname()));
    }
}
