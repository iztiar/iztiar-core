/*
 * coreService class
 *
 *  A coreService is a Iztiar module which:
 *  - provides a named service
 *  - is configured and not disabled in the main application configuration file
 *  - is installed
 */
import path from 'path';

export class coreService {

    // from core
    _name = null;
    _config = null;
    _package = null;

    // from service
    _defaultFn = null;
    _defaultResult = null;

    /**
     * Constructor
     * @param {String} name the service name
     * @param {Object} config the part of the application configuration file which describes this service
     * @param {PackageJson|null} pck the providing module, null for the core itself
     * @returns 
     */
    constructor( name, config, pck ){
        this._name = name;
        this._config = config;
        this._package = pck;
        return this;
    }

    config(){
        return this._config;
    }

    /**
     * dynamically load and initialize the default function of the plugin
     * @returns {Promise} which resolves to the default function
     */
    initialize( app ){
        const main = path.join( this.package().getDir(), this.package().getMain());
        return import( main ).then(( res ) => {
            this._defaultFn = res.default;
            this._defaultResult = this._defaultFn( app, this );
            return Promise.resolve( this._defaultFn );
        });
    }

    name(){
        return this._name;
    }

    package(){
        return this._package;
    }

    /**
     * @returns {Promise} which resolves to the service status
     * @throws {Error}
     */
    start(){
        if( !this._defaultResult ){
            throw new Error( 'dynamically loaded plugin initialization didn\'t provide anything' );
        }
        if( !this._defaultResult.start || typeof this._defaultResult.start !== 'function' ){
            throw new Error( 'dynamically loaded plugin doesn\'t provide start() command' );
        }
        this._defaultResult.start( this._defaultResult );
    }

    /**
     * @returns {Promise} which resolves to the service status
     * @throws {Error}
     */
    status(){
        if( !this._defaultResult ){
            throw new Error( 'dynamically loaded plugin initialization didn\'t provide anything' );
        }
        if( !this._defaultResult.status || typeof this._defaultResult.status !== 'function' ){
            throw new Error( 'dynamically loaded plugin doesn\'t provide status() commands' );
        }
        this._defaultResult.status();
    }

    /**
     * @returns {Promise} which resolves to the service status
     * @throws {Error}
     */
    stop(){
        if( !this._defaultResult ){
            throw new Error( 'dynamically loaded plugin initialization didn\'t provide anything' );
        }
        if( !this._defaultResult.stop || typeof this._defaultResult.stop !== 'function' ){
            throw new Error( 'dynamically loaded plugin doesn\'t provide stop() command' );
        }
        this._defaultResult.stop();
    }
}
