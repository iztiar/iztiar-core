/*
 * coreConfig
 *
 *  The strategy is that each and every feature:
 *  - should store its own configuration in <storageDir>/config/ directory
 *  - is responsible for the management of its own settings.
 * 
 *  This coreConfig class:
 *  - manages the application settings in <storageDir>/config/iztiar.json
 *  - stores these application settings in _filled.core
 *  - is able to provide to both external modules and internal features a set of useful primitives.
 * 
 *  Application stored configuration
 *  - logLevel {string} the log level, may be overriden in the command-line
 *  - consoleLevel {string} the console verbosity, may be overriden in the command-line
 * 
 *  Application runtime configuration
 *  - logLevel {uppercase.string} the log level (from configuration+command-line)
 *  - consoleLevel {uppercase.string} the console verbosity (from configuration+command-line)
 *  - storageDir {string} the full pathname of the storage directory (from command-line)
 *  - configDir {string}
 *  - logDir {string}
 *  - runDir {string}
 * 
 *  Not yet a Logger at instanciation time, but command-line has been successfullly parsed.
 */
import fs from 'fs';
import path from 'path';

import { cliApplication, Logger, Msg, utils } from './index.js';

export class coreConfig {

    static _c = {
        configDir: 'config',
        logDir: 'logs',
        runDir: 'run'
    }

    _config = null;

    /**
     * @returns {String} the default verbosity level
     */
    static getDefaultConsoleLevel(){
        return Msg.defaults.level;
    }

    /**
     * @returns {String} the default environment
     */
    static getDefaultEnvironment(){
        return 'production';
    }

    /**
     * @returns {String} the default log level of the application
     */
    static getDefaultLogLevel(){
        return Logger.defaults.level;
    }
    /**
     * @returns {String} the default storage dir
     */
    static getDefaultStorageDir(){
        return path.join( '/var/lib', cliApplication.const.commonName );
    }

    /**
     * @param {coreApi} api a core API instance
     */
    constructor( api ){
        const _options = api.cmdLine();
        const _configFname = path.join( api.storageDir(), coreConfig._c.configDir, cliApplication.const.commonName+'.json' );
        this._config = utils.jsonReadFileSync( _configFname );
        this._config.core = this._config.core || {};
        this._config.features = this._config.features || {};
        // core: root CA
        if( this._config.core.rootCA ){
            this._config.core.rootCACert = fs.readFileSync( path.join( api.storageDir(), this._config.core.rootCA ))
        } else {
            throw new Error( 'coreConfig: root CA is not specified' );
        }
        // core: console level
        if( !this._config.core.consoleLevel || _options.consoleLevel !== coreConfig.getDefaultConsoleLevel()){
            this._config.core.consoleLevel = _options.consoleLevel;
        }
        this._config.core.consoleLevel = this._config.core.consoleLevel.toUpperCase();
        // core: environment
        if( !this._config.core.environment ){
            this._config.core.environment = coreConfig.getDefaultEnvironment();
        }
        // core: log level
        if( !this._config.core.logLevel || _options.logLevel !== coreConfig.getDefaultLogLevel()){
            this._config.core.logLevel = _options.logLevel;
        }
        this._config.core.logLevel = this._config.core.logLevel.toUpperCase();
        // core: config dir
        this._config.core.configDir = path.join( api.storageDir(), coreConfig._c.configDir );
        // core: log dir
        this._config.core.logDir = path.join( api.storageDir(), coreConfig._c.logDir );
        // core: run dir
        this._config.core.runDir = path.join( api.storageDir(), coreConfig._c.runDir );
        // feature objects

        return this;
    }

    /**
     * Getter/Setter
     * @param {String} level the desired console verbosity level
     * @returns {uppercase-String} the configured console level label
     */
    consoleLevel( level ){
        if( level && typeof level === 'string' && level.length ){
            this._config.core.consoleLevel = level.toUpperCase();
        }
        return this._config.core.consoleLevel;
    }

    /**
     * @returns {Object} the core (this._config) application configuration
     */
    core(){
        return this._config.core;
    }

    /**
     * @returns {String} the log directory full pathname
     */
    logDir(){
        return this._config.core.logDir;
    }

    /**
     * @returns {uppercase-String} the configured log level label
     */
    logLevel(){
        return this._config.core.logLevel;
    }

    /**
     * @returns {Object} the object which describes the configured features in the configuration file
     *  Is expected to be an Object keyed by service names.
     */
    features(){
        return this._config.features;
    }

    /**
     * @returns {String} the run directory full pathname
     */
    runDir(){
        return this._config.core.runDir;
    }
}
