/*
 * coreApplication singleton
 */
import path from 'path';

import {
    ICmdline, IForkable, ILogger, IMsg, IPluginManager, IRunnable, IServiceManager,
    coreConfig, Interface, PackageJson
} from './imports.js';

export class coreApplication {

    static _singleton = null;

    static const = {
        commonName: 'iztiar',
        displayName: 'Iztiar',
        copyrightColor: 'yellowBright',
        forkable: 'iztiar-bc05bf55-4313-49d7-ab9d-106c93c335eb'
    };

    _package = null;
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

        Interface.add( this, IForkable, {
            _forkedVar: coreApplication.iforkableForkedVar
        });

        Interface.add( this, IMsg, {
            _consoleLevel: this.imsgConsoleLevel,
            _logAppname: this.imsgLogAppname,
            _logFname: this.imsgLogFname,
            _logLevel: this.imsgLogLevel
        });

        Interface.add( this, IPluginManager );

        Interface.add( this, IRunnable, {
            _copyrightColor: coreApplication.irunnableCopyrightColor,
            _copyrightText: coreApplication.irunnableCopyrightText
        });

        Interface.add( this, IServiceManager );

        process.title = title;

        // this coreApplication class definition is in /src subdirectory of the module root
        this._package = new PackageJson( path.dirname( path.dirname( new URL( import.meta.url ).pathname )));

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
        return this._package.getVersion();
    }

    /*
     * the environment variable name which, if set, holds the name/content/qualifier of the forked process
     * <-IForkable implementation->
     */
    static iforkableForkedVar(){
        //console.log( 'coreApplication.iforkableForkedVar()' );
        return coreApplication.const.forkable;
    }

    /*
     * Getter/Setter
     * @param {String} level the desired console (uppercase) level
     * @returns {String} the current console level (defaulting to 'NORMAL')
     * <-IMsg implementation->
     */
    imsgConsoleLevel(){
        const level = this._config ? this.config().core.consoleLevel.toUpperCase() : ILogger.defaults.consoleLevel;
        //console.log( 'coreApplication.imsgConsoleLevel()', level );
        return level;
    }

    /*
     * the application name
     * <-IMsg (ILogger-derived) implementation->
     */
    imsgLogAppname(){
        return coreApplication.const.commonName;
    }

    /*
     * the requested log filename
     * <-IMsg (ILogger-derived) implementation->
     */
    imsgLogFname(){
        return this._config ? path.join( this.config().core.logDir, coreApplication.const.commonName+'.log' ) : ILogger.defaults.logFname;
    }

    /*
     * the requested log level
     * <-IMsg (ILogger-derived) implementation->
     */
    imsgLogLevel(){
        return this._config ? this.config().core.logLevel.toUpperCase() : ILogger.defaults.logLevel;
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
        let _text = coreApplication.const.displayName+' v '+this._package.getVersion();
        _text += '\nCopyright (@) 2020,2021,2022 TheDreamTeam&Consorts (and may the force be with us;))';
        return _text;
    }

    /**
     * Getter/Setter
     * @param {Object} options the command-line option values
     */
    config( options ){
        if( options ){
            this._config = new coreConfig( options );
        }
        return this._config.filledConfig();
    }

    /**
     * @returns {Object} the package.json of the application
     */
    getPackage(){
        return this._package;
    }

    /**
     * @param {*} level the desired console level
     */
    setConsoleLevel( level ){
        if( level && typeof level === 'string' && level.length && this._config ){
            //console.log( 'setting consoleLevel to', level );
            this.config().core.consoleLevel = level.toUpperCase();
        }
    }
}
