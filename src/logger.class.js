/*
 * Logger interface
 *
 *  Writes messages into the log file depending of their severity level vs. the requested log level.
 *  See Msg interface for a service which both writes to the console and to the log file.
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
 *    Kernel constant    Pino method                                             Logger  level  Msg      comment
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

import { LogLevel, utils } from './index.js';

export class Logger {

    static defaults = {
        fname: '/dev/null',
        level: 'INFO',
        process: 'main'
    };

    // initialized at first call
    static const = null;

    // initialized at startup()
    static _logProcess = null;
    static _logOptions = null;
    static _logInstance = null;
    static _logFname = null;

    // injects an 'origin' prefix at the start of logged messages
    static _emitter(){
        return Logger._logProcess || Logger.defaults.process;
    }

    static _log(){
        // message requester LogLevel object
        const _messageLogLevel = arguments[0];
        delete arguments[0];

        //console.log( 'Logger.log() app-requested log level', Logger._singleton._messageLogLevel());
        //console.log( 'Logger.log() app-configured log filename', Logger._singleton._logFname());
        //console.log( arguments );

        if( Logger._logInstance ){
            // check that the level is allowed for the current transport
            //  may be overriden with IZTIAR_DEBUG
            if( !Logger._logInstance.isLevelEnabled( _messageLogLevel.label()) && process.env.IZTIAR_DEBUG && process.env.IZTIAR_DEBUG.includes( 'logLevel' )){
                console.log(( _messageLogLevel.color())( Logger._emitter(), '(not allowed log level)', ...arguments ));
            } else {
                Logger._logInstance[_messageLogLevel.label()]([ Logger._emitter(), ...arguments ]);
                //_logInstance[_lower]( color( [ _emitter(), ...arguments ]));
            }

        // before any logger be instanciated, one can still log the main CLI process to the console
        } else if( !Logger._logProcess && process.env.IZTIAR_DEBUG && process.env.IZTIAR_DEBUG.includes( 'preCore' )){
            console.log(( _messageLogLevel.color())( Logger._emitter(), ...arguments ));
        }
    }

    /* *** ***************************************************************************************
       *** The public API, i.e; the API anyone may call to access the interface service        ***
       *** *************************************************************************************** */

    static error(){
        Logger._log( Logger.const.ERROR, ...arguments );
    }

    static warn(){
        Logger._log( Logger.const.WARN, ...arguments );
    }

    static info(){
        Logger._log( Logger.const.INFO, ...arguments );
    }

    static debug(){
        Logger._log( Logger.const.DEBUG, ...arguments );
    }

    // these methods defined to satisfy fastify prerequisites
    //  https://www.fastify.io/docs/latest/Reference/Server/#logger
    static fatal(){
        Logger._log( Logger.const.ERROR, ...arguments );
    }

    static trace(){
        Logger._log( Logger.const.DEBUG, ...arguments );
    }

    static child(){
        const child = Object.create( this );
        child.pino = pino.child( ...arguments );
        return child;
    }

    /**
     * Early initialization
     * Define the needed constants
     */
    static init(){
        if( !Logger.const ){
            Logger.const = {
                QUIET: new LogLevel( 0, 'quiet' ),
                ERROR: new LogLevel( 10, 'error', chalk.red ),
                WARN: new LogLevel( 20, 'warn', chalk.yellow ),
                NORMAL: new LogLevel( 30, 'normal' ),
                INFO: new LogLevel( 40, 'info', chalk.hex( '#00ffff' )),
                VERBOSE: new LogLevel( 50, 'verbose', chalk.hex( '#3399ff' )),
                DEBUG: new LogLevel( 60, 'debug', chalk.hex( '#0000ff' ))
            };
        }
    }

    /**
     * @returns {String} the log full pathname
     */
    static logFname(){
        return Logger._logFname;
    }

    /**
     * @returns {pino} the pino instance
     */
    static logInstance(){
        return Logger._logInstance;
    }

    /**
     * Initialize the log implentation
     * @param {Object} options
     *  appname {String} the application name
     *  fname {String|null} the full pathname to the log file, defaulting to /dev/null
     *  level {String|null} the desired log level, defaulting to 'INFO'
     *  process {String|null}, defaulting to 'main'
     * @throws {Error} when trying to startup() more than once
     * [-public API-]
     */
    static startup( options={} ){
        //console.log( options );
        if( Logger._logInstance ){
            throw new Error( 'Logger: trying to startup() more than once' );
        }
        Logger._logProcess = options.process;
        const _level = options.level || Logger.defaults.level;
        Logger._logOptions = {
            name: options.appname,
            level: Logger.const[_level].label()
        };
        Logger._logFname = options.fname || Logger.defaults.fname;
        utils.makeFnameDirExists( Logger._logFname );
        //console.log( Logger );
        Logger._logInstance = pino( Logger._logOptions, pino.destination( Logger._logFname ));
    }
}
