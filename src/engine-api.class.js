/*
 * engineApi class
 *
 *  An instance of this class is passed at initialization time to every module default export function.
 *  The schema is described in engine-api.schema.json
 */
import { coreApi } from './index.js';

export class engineApi extends coreApi {

    // all the definitions exported by the '@iztiar/iztiar-core' module
    //  gathered from [package.json].main (src/index.js)
    _exports = null;

    /**
     * Constructor
     * @param {coreApi} core a coreApi instance
     * @returns {engineApi}
     */
    constructor( core ){
        super();
        this.commonName( core.commonName());
        this.config( core.config());
        this.packet( core.packet());
        this.pluginManager( core.pluginManager());
        return this;
    }

    /**
     * Getter/Setter
     * @param {*} o the object got from a dynamic import on the '@iztiar/iztiar-core' module
     * @returns {*}
     */
    exports( o ){
        if( o ){
            this._exports = o;
        }
        return this._exports;
    }
}
