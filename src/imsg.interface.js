/*
 * IMsg interface
 *
 *  Manage both console output and file logging.
 *  See ILogger interface for a full description of console and log levels.
 *  See also ILogger interface for a rationale about the '_instance' static data.
 */
import { ILogger, coreForkable } from './index.js';

export class IMsg extends ILogger {

    static defaults = {
        level: 'NORMAL'
    };

    static _instance = null;

    static _staticLog(){
        // doesn't do anything before instanciation
        if( !IMsg._instance ){
            return;
        }
        IMsg._instance._imsgLog( ...arguments );
    }

    _imsgLog(){
        // the current console level label for the instance
        //  may be null before configuration
        //  else get the corresponding current console LogLevel object
        const _level = IMsg._instance._consoleLevel();
        if( !_level ){
            return;
        }
        if( !ILogger.const[_level] ){
            throw new Error( 'IMsg unknown console level: \''+_level+'\'' );
        }
        const _consoleLevel = ILogger.const[_level];

        // the requested console LogLevel object for this message
        const _messageLevel = arguments[0];

        // compute the ILogger log level from the console level
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

        // color of the console message is taken from the LogLevel objects instanciated in ILogger
        const color = _messageLevel.color();

        // remove the console level from the list of arguments
        let _args = [ ...arguments ];
        _args.splice( 0, 1 );

        // log to the file if not prevented from
        if( _logLevel ){
            super[_logLevel]( ..._args );
        }

        // log to the console if not prevented from
        //console.log( '_singleton.consoleLevel='+_singleton._messageLevel, '_messageLevel='+_messageLevel, 'Iztiar.c.verbose[_messageLevel]='+Iztiar.c.verbose[_messageLevel] );
        //console.log( 'message console level', _messageLevel );
        //console.log( 'app requested console level', ILogger.const[IMsg._singleton._messageLevel()] );

        if( !coreForkable.forkedProcess() && _consoleLevel.level() >= _messageLevel.level()){
            if( color ){
                console.log( color( ..._args ));
            } else {
                console.log( ..._args );
            }
        }
    }

    /**
     * Constructor
     * @returns {IMsg}
     */
    constructor(){
        super();
        IMsg._instance = this;
        return this;
    }

    /* *** ***************************************************************************************
       *** The implementation API, i.e; the functions the implementation may want to implement ***
       *** *************************************************************************************** */

    /**
     * Getter/Setter
     * @param {String} level the desired console (uppercase) level
     * @returns {String} the current console level (defaulting to 'NORMAL')
     * [-implementation Api-]
     */
    _consoleLevel(){
        console.log( 'IMsg._consoleLevel()', arguments );
        return IMsg.defaults.level;
    }

    /* *** ***************************************************************************************
       *** The public API, i.e; the API anyone may call to access the interface service        ***
       *** *************************************************************************************** */

    /**
     * [-public API-]
     */
    static error(){
        IMsg._staticLog( ILogger.const.ERROR, ...arguments );
    }

    /**
     * [-public API-]
     */
    static warn(){
        IMsg._staticLog( ILogger.const.WARN, ...arguments );
    }

    /**
     * [-public API-]
     */
    static out(){
        IMsg._staticLog( ILogger.const.NORMAL, ...arguments );
    }

    /**
     * [-public API-]
     */
    static info(){
        IMsg._staticLog( ILogger.const.INFO, ...arguments );
    }

    /**
     * A pass-through direct to ILogger
     * [-public API-]
     */
    logInfo(){
        super.info( ...arguments );
    }

    /**
     * [-public API-]
     */
    static verbose(){
        IMsg._staticLog( ILogger.const.VERBOSE, ...arguments );
    }

    /**
     * [-public API-]
     */
    static debug(){
        IMsg._staticLog( ILogger.const.DEBUG, '(debug)', ...arguments );
    }
    debug(){
        this._imsgLog( ILogger.const.DEBUG, '(debug)', ...arguments );
    }

    /**
     * Getter/Setter
     * @param {String} level the desired (temporary) console level
     * [-public API-]
     */
    consoleLevel( level ){
        return this._consoleLevel( level );
    }

    /**
     * Writes a first line in the log
     * @param {String} action the requested identified action
     * [-public API-]
     */
    startup( action ){
        super.startup();
        super.info( 'program invoked with args', process.argv );
        super.info( 'command-line arguments successfully parsed: identified action \''+action+'\'');
    }

    /**
     * Tabular output
     * Doesn't manage logger neither color, so rather to be used in place of IMsg.out()
     * @param {Array} theArray an array of objects
     * @param {Object} options
     *  prefix {String}
     */
    tabular( theArray, options={} ){

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
        IMsg.out( _line );
        // underlined headers
        _line = _prefix;
        _columns.every(( col ) => {
            _line = _tabular_betweencols( _line, _prefix );
            _line = _tabular_fixedchar( _line, col.size, '-' );
            return true;
        });
        IMsg.out( _line );
        // each item
        theArray.every(( it ) => {
            _line = _prefix;
            _columns.every(( col ) => {
                _line = _tabular_betweencols( _line, _prefix );
                _line = _tabular_fixedsize( _line, col.size, it[col.name] );
                return true;
            });
            IMsg.out( _line );
            return true;
        });
    }
}
