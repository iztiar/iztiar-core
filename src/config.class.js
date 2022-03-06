/*
 * coreConfig
 *
 *  The strategy is that each and every plugin:
 *  - should store its own configuration in <storageDir>/config/ directory
 *  - is responsible for the management of its own settings.
 * 
 *  This coreConfig class:
 *  - manages the application settings in <storageDir>/config/iztiar.json
 *  - stores these application settings in _filled.core
 *  - is able to provide to the plugins a set of useful primitives.
 * 
 *  Application stored configuration
 *  - logLevel {string} the log level, may be overriden in the command-line
 *  - consoleLevel {string} the console verbosity, may be overriden in the command-line
 * 
 *  Application runtime configuration, available from getAppFilledConfig()
 *  - logLevel {string} the log level (from configuration+command-line)
 *  - consoleLevel {string} the console verbosity (from configuration+command-line)
 *  - storageDir {string} the full pathname of the storage directory (from command-line)
 *  - configDir {string}
 *  - logDir {string}
 *  - runDir {string}
 * 
 *  Not yet a Logger at instanciation time, but command-line has been successfullly parsed.
 */
import path from 'path';

import { ILogger, coreApplication, utils } from './imports.js';

export class coreConfig {

    static _storageDir = null;

    static _c = {
        configDir: 'config',
        logDir: 'log',
        runDir: 'run'
    }

    _options = null;
    _json = null;
    _filled = null;

    /**
     * @returns {String} the default verbosity level
     */
    static getDefaultConsoleLevel(){
        return ILogger.defaults.consoleLevel;
    }

    /**
     * @returns {String} the default log level of the application
     */
    static getDefaultLogLevel(){
        return ILogger.defaults.logLevel;
    }

    /**
     * @returns {String} the default name of the service
     */
    static getDefaultServiceName(){
        return 'default';
    }

    /**
     * @returns {String} the default storage dir
     */
    static getDefaultStorageDir(){
        return path.join( '/var/lib', coreApplication.const.commonName );
    }

    /**
     * Getter/Setter
     * @param {string} dir the storage directory
     * @returns {string} the runtime storage directory
     */
    static storageDir( dir ){
        if( dir && typeof dir === 'string' && dir.length ){
            coreConfig._storageDir = dir;
        }
        return coreConfig._storageDir;
    }

    /**
     * @param {Object} options the command-line option values
     */
    constructor( options ){

        coreConfig.storageDir( options.storageDir );

        this._options = options;

        const _configFname = path.join( options.storageDir, coreConfig._c.configDir, coreApplication.const.commonName+'.json' );
        this._json = utils.jsonReadFileSync( _configFname );

        return this;
    }

    /**
     * @param {Object} options the command-line option values
     * @returns {Object} the filled application configuration
     */
    filledConfig(){
        if( !this._filled ){
            this._filled = { core: null };
            this._filled.core = { ...this._json };
            // console level
            if( !this._json || !this._json.consoleLevel || this._options.consoleLevel !== coreConfig.getDefaultConsoleLevel()){
                this._filled.core.consoleLevel = this._options.consoleLevel;
            }
            // log level
            if( !this._json || !this._json.logLevel || this._options.logLevel !== coreConfig.getDefaultLogLevel()){
                this._filled.core.logLevel = this._options.logLevel;
            }
            this._filled.core.logLevel = this._filled.core.logLevel.toLowerCase();
            // storage dir
            this._filled.core.storageDir = coreConfig.storageDir();
            // config dir
            this._filled.core.configDir = path.join( coreConfig.storageDir(), coreConfig._c.configDir );
            // log dir
            this._filled.core.logDir = path.join( coreConfig.storageDir(), coreConfig._c.logDir );
            // run dir
            this._filled.core.runDir = path.join( coreConfig.storageDir(), coreConfig._c.runDir );
            //console.log( this._filled );
        }
        return this._filled;
    }
}
