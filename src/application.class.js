/*
 * coreApplication singleton
 */
import path from 'path';

import { ICmdline, ILogger, IMsg, IPluginManager, IRunnable, coreConfig, Interface, PackageJson } from './index.js';

export class coreApplication {

    static _singleton = null;

    static const = {
        commonName: 'iztiar',
        displayName: 'Iztiar',
        copyrightColor: 'yellowBright'
    };

    // the PackageJson object which describes the '@iztiar/iztiar-core' module
    _package = null;

    // the coreConfig object which describes the filled-up application configuration file
    _config = null;

    /**
     * @param title the title of the process (replacing 'node')
     */
     constructor( title ){
        if( coreApplication._singleton ){
            return coreApplication._singleton;
        }
        //console.log( 'coreApplication instanciation' );

        Interface.add( this, ICmdline, {
            _commands: this.icmdlineCommands,
            _options: this.icmdlineOptions,
            _texts: this.icmdlineTexts,
            _version: this.icmdlineVersion
        });

        Interface.add( this, IMsg, {
            _consoleLevel: this.imsgConsoleLevel,
            _logAppname: this.iloggerAppname,
            _logFname: this.iloggerFname,
            _logLevel: this.iloggerLevel
        });

        Interface.add( this, IPluginManager );

        Interface.add( this, IRunnable, {
            _copyrightColor: coreApplication.irunnableCopyrightColor,
            _copyrightText: coreApplication.irunnableCopyrightText
        });

        process.title = title;

        // this coreApplication class definition is stored in /src subdirectory of the module root
        this.package( new PackageJson( path.dirname( path.dirname( new URL( import.meta.url ).pathname ))));

        coreApplication._singleton = this;
        return coreApplication._singleton;
    }

    /*
     * @returns {Object[]} the list of commands
     * <-ICmdline implementation->
     */
    icmdlineCommands(){
        return [
            { name: 'start', description: 'start the named service' },
            { name: 'stop', description: 'stop the named service' },
            { name: 'status', description: 'display the status of named service' },
            { name: 'restart', description: 'restart the named service' },
            { name: 'list-installed', description: 'list installed plugins' },
            { name: 'list-enabled', description: 'list targeted enabled services' }
        ];
    }

    /*
     * @returns {Object[]} the list of options
     * <-ICmdline implementation->
     */
    icmdlineOptions(){
        //console.log( 'coreApplication.icmdlineOptions()' );
        return [
            [ '-s|--storage-dir <dir>', 'path to storage directory', coreConfig.getDefaultStorageDir() ],
            [ '-S|--service <name>', 'name of the service', coreConfig.getDefaultServiceName() ],
            [ '-L|--log-level <level>', 'logging level', coreConfig.getDefaultLogLevel() ],
            [ '-C|--console-level <level>', 'console verbosity', coreConfig.getDefaultConsoleLevel() ]
        ];
    }

    /*
     * @returns {Object} the keyed object of pre- and post- texts
     * <-ICmdline implementation->
     */
    icmdlineTexts(){
        let _afterAllText = '\n Please note that one, and only one, command should be specified.';
        _afterAllText += '\n As of the current version, other, surnumerous, commands will just be ignored.';
        _afterAllText += '\n It is probable that a next major version will consider that as a runtime error.';
        _afterAllText += '\n';
        return {
            afterAll : _afterAllText
        };
    }

    /*
     * @returns {String} the version number of the implementor
     * <-ICmdline implementation->
     */
    icmdlineVersion(){
        return this.package().getVersion();
    }

    /*
     * @returns {String} the application name
     * <-IMsg (ILogger-derived) implementation->
     */
    iloggerAppname(){
        return coreApplication.const.commonName;
    }

    /*
     * @returns {String|null} the full log file pathname
     * <-IMsg (ILogger-derived) implementation->
     */
    iloggerFname(){
        const config = this.config();
        return config ? path.join( config.logDir(), coreApplication.const.commonName+'.log' ) : null;
    }

    /*
     * @returns {String|null} the current log level (defaulting to 'INFO')
     * <-IMsg (ILogger-derived) implementation->
     */
    iloggerLevel(){
        const config = this.config();
        return config ? config.logLevel() : null;
    }

    /*
     * Getter/Setter
     * @param {String} level the desired console (uppercase) level
     * @returns {String|null} the current console level (defaulting to 'NORMAL')
     * <-IMsg implementation->
     */
    imsgConsoleLevel( level ){
        const config = this.config();
        return config ? config.consoleLevel( level ) : null;
    }

    /*
     * @returns {string} the color of the copyright message
     * <-IRunnable implementation->
     */
    static irunnableCopyrightColor(){
        return coreApplication.const.copyrightColor;
    }

    /*
     * @returns {string} the copyright message of the application
     * <-IRunnable implementation->
     */
    static irunnableCopyrightText(){
        let _text = coreApplication.const.displayName+' v '+this.package().getVersion();
        _text += '\nCopyright (@) 2020,2021,2022 TheDreamTeam&Consorts (and may the force be with us;))';
        return _text;
    }

    /**
     * Getter/Setter
     * The setter is called as soon as command-line options have been parsed in order to get the storage directory.
     * @param {Object} options the command-line option values
     * @returns {coreConfig} the application configuration instance
     */
    config( options ){
        if( options ){
            this._config = new coreConfig( options );
        }
        return this._config;
    }

    /**
     * Getter/Setter
     * @param {PackageJson} pck the object which describes the '@iztoar/iztiar-core' module
     * @returns {PackageJson} the object which describes the '@iztoar/iztiar-core' module
     */
    package( pck ){
        if( pck ){
            this._package = pck;
        }
        return this._package;
    }
}
