/*
 * corePlugin class
 *
 *  A corePlugin is a Iztiar module which:
 *  - provides a named service
 *  - is configured and not disabled in the main application configuration file
 *  - is installed
 */

export class corePlugin {

    _name = null;
    _config = null;
    _package = null;

    constructor( name, config, pck ){
        this._name = name;
        this._config = config;
        this._package = pck;
        return this;
    }

    config(){
        return this._config;
    }

    name(){
        return this._name;
    }

    package(){
        return this._package;
    }
}
