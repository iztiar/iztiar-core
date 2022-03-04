/*
 * coreApplication singleton
 */
import { addInterface } from './interface.js';

import { ICmdline } from './icmdline.js';
import { IRunnable } from './irunnable.js';

const _c = {
    app: {
        name: 'iztiar',
        default: 'default',
        none: 'none',
        displayName: 'Iztiar',
        logLevel: 'info',
        copyrightColor: 'yellowBright'
    },
    forkable: {
        uuid: 'iztiar-bc05bf55-4313-49d7-ab9d-106c93c335eb'
    },
    verbose: {
        QUIET: 0,
        ERROR: 1,
        WARN: 2,
        NORMAL: 3,
        INFO: 4,
        VERBOSE: 5,
        DEBUG: 6
    }
};

export class coreApplication {

    static _singleton = null;

    /**
     * @param title the title of the process (replacing 'node')
     */
     constructor( title ){
        if( coreApplication._singleton ){
            return coreApplication._singleton;
        }
        console.log( 'instanciating coreApplication' );

        addInterface( this, ICmdline, {
            name: this.icmdlineName,
            options: this.icmdlineOptions,
            texts: this.icmdlineTexts
        });

        addInterface( this, IRunnable, {
            _copyrightColor: this.irunnableCopyrightColor,
            _copyrightText: this.irunnableCopyrightText,
            _forkedVar: this.irunnableForkedVar,
            _parseArgs: this.irunnableParseArgs
        });

        process.title = title;

        coreApplication._singleton = this;
        return coreApplication._singleton;
    }

    /*
     * @returns {String} the name of the application
     * <-ICmdline implementation->
     */
    icmdlineName(){
        return _c.app.name;
    }

    /**
     * @returns {Object[]} the list of options
     * <-ICmdline implementation->
     */
    icmdlineOptions(){
        return [];
    }

    /**
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
     * @returns {string} the color of the copyright message
     * <-IRunnable implementation->
     */
    irunnableCopyrightColor(){
        return _c.app.copyrightColor;
    }

    /*
     * @returns {string} the copyright message of the application
     * <-IRunnable implementation->
     */
    irunnableCopyrightText(){
        let _text = _c.app.displayName+' v '+'x.x.x';//corePackage.getVersion();
        _text += '\nCopyright (@) 2020,2021,2022 TheDreamTeam&Consorts (and may the force be with us;))';
        return _text;
    }

    /*
     * the environment variable name which, if set, holds the name/content/qualifier of the forked process
     * <-IRunnable implementation->
     */
    irunnableForkedVar(){
        return _c.forkable.uuid;
    }

    /*
     * parse command-line arguments
     * <-IRunnable implementation->
     */
    irunnableParseArgs(){
        return this.ICmdline.parseArgs();
    }
}
