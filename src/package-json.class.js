/*
 * PackageJson class exhibits the package.json file of an ESM module.
 */
import path from 'path';

import { utils } from './index.js';

export class PackageJson {

    _dir = null;
    _json = null;

    /**
     * Constructor
     * @param {String} dir the directory where we want find a package.json
     * @returns {PackageJson}
     */
    constructor( dir ){
        this._dir = dir;
        const _fname = path.join( dir, 'package.json' );
        this._json = utils.jsonReadFileSync( _fname );
        return this;
    }

    /**
     * @returns {String} the description string
     */
    getDescription(){
        return this._json ? this._json.description || '' : '';
    }

    /**
     * @returns {String} the directory from where this package.json has been read
     */
    getDir(){
        return this._dir;
    }

    /**
     * @returns {String} the full name of the package
     */
    getFullName(){
        return this._json ? this._json.name || '' : '';
    }

    /**
     * @returns {Object} the group of keys in 'iztiar' group
     */
    getIztiar(){
        return this._json ? this._json.iztiar || {} : {};
    }

    /**
     * @returns {String} the main entry point of the package
     */
    getMain(){
        return this._json ? this._json.main || 'index.js' : 'index.js';
    }

    /**
     * @returns {String} the name of the package, i.e. the full name minus the organization if present
     */
    getName(){
        const fullname = this.getFullName();
        const words = fullname.split( '/' );
        return words.length === 1 ? words[0] : words[1];
    }

    /**
     * @returns {String} the organization name if present
     */
    getOrganization(){
        const fullname = this.getFullName();
        const words = fullname.split( '/' );
        return words.length === 1 ? '' : words[0].substring( 1 );
    }

    /**
     * @returns {String} the version of the package
     */
    getVersion(){
        //console.log( this._json );
        return this._json ? this._json.version : '';
    }
}
