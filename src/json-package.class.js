/*
 * JsonPackage class exhibits the package.json file of an ESM module.
 */
import path from 'path';

import { utils } from './imports.js';

export class JsonPackage {

    _dir = null;
    _json = null;

    /**
     * 
     * @param {String} dir the directory where we want find a package.json
     */
    constructor( dir ){
        this._dir = dir;
        const _fname = path.join( dir, 'package.json' );
        this._json = utils.jsonReadFileSync( _fname );
        return this;
    }

    /**
     * @returns {String} the version of the package
     */
    getVersion(){
        return this._json.version;
    }
}
