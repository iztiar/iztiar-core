/*
 * ICmdline interface
 */
import { Command, Option } from 'commander';

let _singleton = null;

function _initialize_interface(){
    // define command-line options
    _singleton = new Command()
        .name( Iztiar.c.app.name )

        .option( '-l|--loglevel <level>', 'logging level', coreConfig.getDefaultLoglevel())
        .option( '-s|--storage <path>', 'path to storage directory', coreConfig.getDefaultStorageDir())
        .option( '-n|--name <name>', 'the name of this controller', coreConfig.getDefaultControllerName())
        .option( '-u|--user <user>', 'the account to create which will manage the controllers', coreConfig.getDefaultAccountName())
        .option( '--uid <uid>', 'the UID of the user', coreConfig.getDefaultAccountUid())
        .option( '--gid <gid>', 'the GID of the user', coreConfig.getDefaultAccountGid())
        .option( '-S|--stop-port <port>', 'the listening port of the CLI stop command', coreConfig.getDefaultAppStopPort())
        .option( '-c|--controller-port <port>', 'the listening port of the controller', coreConfig.getDefaultControllerPort())
        .option( '-m|--manager <name>', 'name of the manager controller if any', coreConfig.getDefaultManagerName())
        .option( '-b|--broker-port <port>', 'the communication port of the message broker', coreConfig.getDefaultBrokerControllerPort())
        .option( '-B|--messaging-port <port>', 'the messaging port of the message broker', coreConfig.getDefaultBrokerMessagingPort())
        .option( '-f|--force-stop', 'force the stop of the running services (and the cleanup of the run files)', coreConfig.getDefaultForceStop())
        .option( '-v|--verbose [level]', '(incremental) run verbosely', _parseVerbosity, coreConfig.getDefaultVerbose())

        .addOption( new Option( '--no-messaging-bus', 'doesn\'t start the messaging bus' ).default( coreConfig.getDefaultBrokerEnabled(), 'start them at the same time'))

        .version( corePackage.getVersion(), '-V|--version', 'output the current version, gracefully exiting' )
    ;
  
    // define sub-commands (start, stop, and so on)
    //  unfortunatly, the action handler is called before all command-line options have been parsed
    subs.every(( s ) => {
        const name = s.name;
        _command
            .command( s.name )
            .description( s.description )
            .action(( opts, commander ) => {
                _subFound[name] = true;
                _subCount += 1;
            });
        //if( s.hidden ){
        //    _command.command( s.name ).hideHelp();
        //}
        _subFound[name] = false;
        return true;
    });
}

export class ICmdline {

    static _init_instance(){

        _singleton = new Command().name( ICmdline.icmdlineName());

        _texts = ICmdline.icmdlineTexts();
        Object.keys( _texts ).every(( k ) => {
            _singleton.addHelptext( k, _texts[k] );
            return true;
        });
    }

    /* ***
       *** The implementation API, i.e; the functions the implementation may want to implement
       *** */

    /**
     * @returns {String} the name of the application
     */
    static icmdlineName(){
        return '';
    }

    /**
     * @returns {Object[]} the list of options
     */
    static icmdlineOptions(){
        return [];
    }

    /**
     * @returns {Object} the keyed object of pre- and post- texts
     * Keys may be 'beforeAll', 'before', 'after' or 'afterAll'.
     */
    static icmdlineTexts(){
        return {};
    }

    /**
     * Define the command-line arguments, their default value, the help message and so on
     * [-implementation Api-]
     */

    /* ***
       *** The public API, i.e; the API anyone may call to get the interface service
       *** */

    /**
     * Parse the command-line arguments
     * [-public API-]
     */
    static parseArgs(){
        if( !_singleton ){
            _init_instance();
        }
    }
}
