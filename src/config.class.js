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
import path from 'path';

import { cliApplication, Logger, Msg, utils } from './index.js';

export class coreConfig {

    static _storageDir = null;

    static _c = {
        configDir: 'config',
        logDir: 'logs',
        runDir: 'run'
    }

    _options = null;
    _json = null;
    _filled = null;

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

        const _configFname = path.join( options.storageDir, coreConfig._c.configDir, cliApplication.const.commonName+'.json' );
        this._json = utils.jsonReadFileSync( _configFname );

        const _fillupConfig = function( opts, json ){
            let filled = { ...json };
            filled.core = filled.core || {};
            filled.features = filled.features || [];
            const _jsonCore = json && json.core ? json.core : {};
            const _jsonPlugins = json && json.features ? json.features : {};
            // core: console level
            if( !_jsonCore.consoleLevel || opts.consoleLevel !== coreConfig.getDefaultConsoleLevel()){
                filled.core.consoleLevel = opts.consoleLevel;
            }
            filled.core.consoleLevel = filled.core.consoleLevel.toUpperCase();
            // core: environment
            if( !_jsonCore.environment ){
                filled.core.environment = coreConfig.getDefaultEnvironment();
            }
            // core: log level
            if( !_jsonCore.logLevel || opts.logLevel !== coreConfig.getDefaultLogLevel()){
                filled.core.logLevel = opts.logLevel;
            }
            filled.core.logLevel = filled.core.logLevel.toUpperCase();
            // core: storage dir
            filled.core.storageDir = coreConfig.storageDir();
            // core: config dir
            filled.core.configDir = path.join( coreConfig.storageDir(), coreConfig._c.configDir );
            // core: log dir
            filled.core.logDir = path.join( coreConfig.storageDir(), coreConfig._c.logDir );
            // core: run dir
            filled.core.runDir = path.join( coreConfig.storageDir(), coreConfig._c.runDir );
            // feature objects
            //  we can only take a glance here the key we know: module, enabled
            //  see docs/Architecture.md
            //console.log( filled );
            return filled;
        };
        this._filled = _fillupConfig( this._options, this._json );

        return this;
    }

    /**
     * Getter/Setter
     * @param {String} level the desired console verbosity level
     * @returns {uppercase-String} the configured console level label
     */
    consoleLevel( level ){
        if( level && typeof level === 'string' && level.length ){
            this._filled.core.consoleLevel = level.toUpperCase();
        }
        return this._filled.core.consoleLevel;
    }

    /**
     * @returns {Object} the full filled application configuration
     */
    filled(){
        return this._filled;
    }

    /**
     * @returns {String} the log directory full pathname
     */
    logDir(){
        return this._filled.core.logDir;
    }

    /**
     * @returns {uppercase-String} the configured log level label
     */
    logLevel(){
        return this._filled.core.logLevel;
    }

    /**
     * @returns {Object} the object which describes the configured features in the configuration file
     *  Is expected to be an Object keyed by service names.
     */
    features(){
        return this._filled.features;
    }

    /**
     * @returns {String} the run directory full pathname
     */
    runDir(){
        return this._filled.core.runDir;
    }
}
