/*
 * Msg interface
 *
 *  Manage both console output and file logging.
 *  See Logger interface for a full description of console and log levels.
 *  See also Logger interface for a rationale about the '_instance' static data.
 */
import { Logger } from './index.js';

export class Msg extends Logger {

    static defaults = {
        level: 'NORMAL'
    };

    static _consoleLevel = null;
    static _process = null;

    static _log(){
        // the requested console LogLevel object for this message
        const _messageLevel = arguments[0];

        // remove the console level from the list of arguments
        let _args = [ ...arguments ];
        _args.splice( 0, 1 );

        // compute the Logger log level from the console level
        //  this is a lowercase label which happens to also be the static function name
        let _logLevel;
        switch( _messageLevel.label()){
            case 'normal':
                _logLevel = null;
                break;
            case 'verbose':
                _logLevel = 'debug';
                break;
            default:
                _logLevel = _messageLevel.label();
                break;
        }

        // sends all to Logger
        //  before the configuration has been setup, it is able to take care of loggin 'preCore' to the console
        if( _logLevel ){
            Logger[_logLevel]( ..._args );
        }

        // the current console level label for the instance
        //  may be null before configuration
        //  else get the corresponding current console LogLevel object
        if( Msg._consoleLevel ){
            if( !Logger.const[Msg._consoleLevel] ){
                throw new Error( 'Msg unknown console level: \''+Msg._consoleLevel+'\'' );
            }
            const _consoleLevelObj = Logger.const[Msg._consoleLevel];

            // color of the console message is taken from the LogLevel objects instanciated in Logger
            const color = _messageLevel.color();

            // log to the console if not prevented from
            //console.log( '_singleton.consoleLevel='+_singleton._messageLevel, '_messageLevel='+_messageLevel, 'Iztiar.c.verbose[_messageLevel]='+Iztiar.c.verbose[_messageLevel] );
            //console.log( 'message console level', _messageLevel );
            //console.log( 'app requested console level', Logger.const[Msg._singleton._messageLevel()] );

            if( !Msg._process && _consoleLevelObj.level() >= _messageLevel.level()){
                if( color ){
                    console.log( color( ..._args ));
                } else {
                    console.log( ..._args );
                }
            }
        }
    }

    /* *** ***************************************************************************************
       *** The public API, i.e; the API anyone may call to access the interface service        ***
       *** *************************************************************************************** */

    static error(){
        Msg._log( Logger.const.ERROR, ...arguments );
    }

    static warn(){
        Msg._log( Logger.const.WARN, ...arguments );
    }

    static out(){
        Msg._log( Logger.const.NORMAL, ...arguments );
    }

    static info(){
        Msg._log( Logger.const.INFO, ...arguments );
    }

    static verbose(){
        Msg._log( Logger.const.VERBOSE, ...arguments );
    }

    static debug(){
        Msg._log( Logger.const.DEBUG, '(debug)', ...arguments );
    }

    /**
     * Getter/Setter
     * @param {String} level the desired (maybe temporary) console level
     */
    static consoleLevel( level ){
        if( level && typeof level === 'string' && level.length ){
            Msg._consoleLevel = level.toUpperCase();
        }
        return Msg._consoleLevel;
    }

    /**
     * Early initialization
     */
    static init(){
        super.init();
    }

    /**
     * Writes a first line in the log
     * @param {String} action the requested identified action
     * @param {Object} options
     *  appname {String} the application name
     *  fname {String|null} the full pathname to the log file, defaulting to /dev/null
     *  level {String|null} the desired log level, defaulting to 'INFO'
     *  process {String|null}, defaulting to 'main'
     *  console {String|null} the desired consolde verbosity level, defaulting to 'NORMAL'
     */
    static startup( action, options ){
        Msg.consoleLevel( options.console || Msg.defaults.level );
        Msg._process = options.process;
        Logger.startup( options );
        Logger.info( 'program invoked with args', process.argv );
        Logger.info( 'command-line arguments successfully parsed: identified action \''+action+'\'');
    }

    /**
     * Tabular output
     * Doesn't manage logger neither color, so rather to be used in place of Msg.out()
     * @param {Array} theArray an array of objects
     * @param {Object} options
     *  prefix {String}
     */
    static tabular( theArray, options={} ){

        const _tabular_betweencols = function( instr, prefix ){
            if( instr !== prefix ){
                instr += '  ';
            }
            return instr;
        };
    
        const _tabular_fixedchar = function( instr, size, ch ){
            for( let i=0 ; i<size ; ++i ){
                instr += ch;
            }
            return instr;
        };
    
        const _tabular_fixedsize = function( instr, size, str ){
            if( size < str.length ){
                instr += str.substring( 0, size-1 );
            } else {
                instr += str;
                for( let i=0 ; i<size-str.length ; ++i ){
                    instr += ' ';
                }
            }
            return instr;
        };
    
        let _columns = [];
        let _prefix = options.prefix || '';
        Object.keys( theArray[0] ).every(( k ) => {
            _columns.push({ name:k, size: k.length });
            return true;
        });
        theArray.every(( it ) => {
            _columns.every(( col ) => {
                if( it[col.name].length > col.size ){
                    col.size = it[col.name].length;
                }
                return true;
            })
            return true;
        });
        // header
        let _line = _prefix;
        _columns.every(( col ) => {
            _line = _tabular_betweencols( _line, _prefix );
            //console.log( col );
            _line = _tabular_fixedsize( _line, col.size, col.name );
            return true;
        });
        Msg.out( _line );
        // underlined headers
        _line = _prefix;
        _columns.every(( col ) => {
            _line = _tabular_betweencols( _line, _prefix );
            _line = _tabular_fixedchar( _line, col.size, '-' );
            return true;
        });
        Msg.out( _line );
        // each item
        theArray.every(( it ) => {
            _line = _prefix;
            _columns.every(( col ) => {
                _line = _tabular_betweencols( _line, _prefix );
                _line = _tabular_fixedsize( _line, col.size, it[col.name] );
                return true;
            });
            Msg.out( _line );
            return true;
        });
    }
}
