/*
 * ICmdline interface
 */
import { Command } from 'commander';

export class ICmdline {

    _command = null;
    _subFound = {};
    _subCount = 0;

    constructor(){
        return this;
    }

    // private initialization
    _initializer(){
        if( this._command ){
            return;
        }

        this._command = new Command();

        // application name
        this._command.name( this._name());

        // help text
        const _texts = this._texts();
        Object.keys( _texts ).every(( k ) => {
            this._command.addHelpText( k, _texts[k] );
            return true;
        });

        // options
        const _options = this._options();
        //console.log( _options );
        for( let i=0 ; i<_options.length ; ++i ){
            //console.log( _options[i] );
            this._command.option( ..._options[i] );
        }

        // commands
        //  note that the action handler is called before all command-line options have been parsed
        const _commands = this._commands();
        _commands.every(( it ) => {
            const name = it.name;
            this._command
                .command( name )
                .description( it.description )
                .action(( opts, commander ) => {
                    this._subFound[name] = true;
                    this._subCount += 1;
                });
            this._subFound[name] = false;
            return true;
        });

        // version specific option
        const _version = this._version();
        if( _version ){
            this._command.version( _version, '-V|--version', 'output the current version, gracefully exiting' );
        }
    }

    /* *** ***************************************************************************************
       *** The implementation API, i.e; the functions the implementation may want to implement ***
       *** *************************************************************************************** */

    /**
     * @returns {Object[]} the list of commands
     * [-implementation Api-]
     */
    _commands(){
        return [];
    }

    /**
     * @returns {String} the name of the application, defaulting to the process title
     * [-implementation Api-]
     */
    _name(){
        return process.title;
    }

    /**
     * @returns {Object[]} the list of options
     * [-implementation Api-]
     */
    _options(){
        //console.log( 'ICmdline._options()' );
        return [];
    }

    /**
     * @returns {Object} the keyed object of pre- and post- texts
     * Keys may be 'beforeAll', 'before', 'after' or 'afterAll'.
     * [-implementation Api-]
     */
    _texts(){
        return {};
    }

    /**
     * @returns {String} the version number of the implementor
     * [-implementation Api-]
     */
    _version(){
        return '';
    }

    /* *** ***************************************************************************************
       *** The public API, i.e; the API anyone may call to access the interface service        ***
       *** *************************************************************************************** */

    /**
     * @returns {String|null} the requested command
     * @throws {Error}
     * [-public API-]
     */
    getAction(){
        if( !this._command ){
            throw new Error( 'ICmdline: trying to get command while command-line has not been parsed' );
        }
        let ret = null;
        if( this._subCount === 0 ){
            throw new Error( 'ICmdline: no identified command' );
        } else if( this._subCount === 1 ){
            Object.keys( this._subFound ).every(( k ) => {
                if( this._subFound[k] ){
                    ret = k;
                    return false; // stop iteration
                }
                return true;
            })
        } else {
            throw new Error( 'ICmdline: too many specified commands, aborting' );
        }
        return ret;
    }

    /**
     * @returns {Object[]} the command-line option values
     * @throws {Error}
     * [-public API-]
     */
    getOptions(){
        //console.log( 'ICmdline.getOptions()' );
        if( !this._command ){
            throw new Error( 'ICmdline: trying to get option values while command-line has not been parsed' );
        }
        return this._command.opts();
    }

    /**
     * Parse the command-line arguments
     * [-public API-]
     */
    parseArgs(){
        //console.log( 'ICmdline.parseArgs()' );
        if( !this._command ){
            this._initializer();
        }
        this._command.parse( process.argv );
    }
}
