/*
 * cliApplication singleton
 */
import path from 'path';

import { ICmdline, IPluginManager, IRunnable, coreApi, coreConfig, Interface, Msg, PackageJson } from './index.js';

export class cliApplication {

    static _singleton = null;

    static const = {
        commonName: 'iztiar',
        displayName: 'Iztiar',
        copyrightColor: 'yellowBright'
    };

    // a coreApi instance
    _cApi = null;

    /**
     * @returns {cliApplication} singleton
     */
    constructor(){
        if( cliApplication._singleton ){
            return cliApplication._singleton;
        }
        //console.log( 'cliApplication instanciation' );

        // need to build LogLevel's const very early!
        Msg.init();

        Interface.add( this, ICmdline, {
            v_commands: this.icmdlineCommands,
            v_options: this.icmdlineOptions,
            v_texts: this.icmdlineTexts,
            v_version: this.icmdlineVersion
        });

        Interface.add( this, IPluginManager );

        Interface.add( this, IRunnable, {
            _copyrightColor: cliApplication.irunnableCopyrightColor,
            _copyrightText: cliApplication.irunnableCopyrightText
        });

        // replace the process title (node) by the application name
        process.title = cliApplication.const.commonName;

        // instanciates a coreApi
        this._cApi = new coreApi();
        this._cApi.commonName( cliApplication.const.commonName );
        this._cApi.packet( new PackageJson( path.dirname( path.dirname( new URL( import.meta.url ).pathname ))));
        this._cApi.pluginManager( this.IPluginManager );

        cliApplication._singleton = this;
        return cliApplication._singleton;
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
        //console.log( 'cliApplication.icmdlineOptions()' );
        return [
            [ '-s|--storage-dir <dir>', 'path to storage directory', coreConfig.getDefaultStorageDir() ],
            [ '-S|--service <name>', 'name of the service' ],
            [ '-L|--log-level <level>', 'logging level', coreConfig.getDefaultLogLevel() ],
            [ '-C|--console-level <level>', 'console verbosity', coreConfig.getDefaultConsoleLevel() ],
            [ '-D|--no-daemon', 'doesn\'t fork even if configured for' ]
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
        return this.core().packet().getVersion();
    }

    /*
     * @returns {string} the color of the copyright message
     * <-IRunnable implementation->
     */
    static irunnableCopyrightColor(){
        return cliApplication.const.copyrightColor;
    }

    /*
     * @returns {string} the copyright message of the application
     * <-IRunnable implementation->
     */
    static irunnableCopyrightText(){
        let _text = cliApplication.const.displayName+' v '+this.core().packet().getVersion();
        _text += '\nCopyright (@) 2020,2021,2022 TheDreamTeam&Consorts (and may the force be with us;))';
        return _text;
    }

    /**
     * @returns {coreApi} the coreApi instance
     *  built at construction time, so always there
     */
    core(){
        return this._cApi;
    }
}
