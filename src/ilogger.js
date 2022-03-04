/*
 * ILogger interface
 *
 * Log levels are used to indicate the importance of the logged message.
 * Iztiar associates a distinct color to every of these levels.
 * 
 * According to man syslog(2), conventional meaning of the log level is as follows:
 *   Kernel constant   Level value   Meaning
 *   KERN_EMERG             0        System is unusable
 *   KERN_ALERT             1        Action must be taken immediately
 *   KERN_CRIT              2        Critical conditions
 *   KERN_ERR               3        Error conditions
 *   KERN_WARNING           4        Warning conditions
 *   KERN_NOTICE            5        Normal but significant condition
 *   KERN_INFO              6        Informational
 *   KERN_DEBUG             7        Debug-level messages
 *
 * According to Pino API, the default logging methods are trace, debug, info, warn, error, and fatal.
 *
 * We so choose to have following mapping:
 * 
 *   Kernel constant    Pino method                                             ILogger  console           msg
 *   ---------------    -----------                                             -------  -------           --------
 *                                                                                         0 fully quiet
 *   KERN_EMERG         fatal()     -> ignored here, assimilated to error()
 *   KERN_ALERT                     -> ignored here, assimilated to error()
 *   KERN_CRIT                      -> ignored here, assimilated to error()
 *   KERN_ERR           error()                                                 error()    1               error()
 *   KERN_WARNING       warn()                                                  warn()     2               warn()
 *   KERN_NOTICE                    -> ignored here, assimilated to info()
 *   KERN_INFO          info()                                                             3 normal        out()
 *                                                                              info()     4               info()
 *                                                                                         5               verbose()
 *   KERN_DEBUG         debug()                                                 debug()    6               debug()
 *                      trace()     -> ignored here, assimilated to debug()
 *
 * Messages with DEBUG level are only displayed if explicitly enabled.
 */
import chalk from 'chalk';

function _log(){

}

export class ILogger {

    static l = {
        ERROR: 'error',
        WARN: 'warn',
        INFO: 'info',
        DEBUG: 'debug'
    };

    static error(){
        _log( ILogger.l.ERROR, chalk.red, ...arguments );
    }

    static warn(){
        _log( ILogger.l.WARN, chalk.yellow, ...arguments );
    }

    static info(){
        _log( ILogger.l.INFO, chalk.green, ...arguments );
    }

    static debug(){
        _log( ILogger.l.DEBUG, chalk.blue, ...arguments );
    }
}
