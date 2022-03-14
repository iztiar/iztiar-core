/*
 * engineApi class
 */
import { coreApi, coreService } from './index.js';

export class engineApi extends coreApi {

    // all the definitions exported by the '@iztiar/iztiar-core' module
    //  gathered from [package.json].main (src/index.js)
    _exports = null;

    // the coreService itself from '@iztiar/iztiar-core' point of view
    _service = null;

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

    /**
     * Getter/Setter
     * @param {coreService} o the coreService for this plugin
     * @returns {coreService}
     */
    service( o ){
        if( o && o instanceof coreService ){
            this._service = o;
        }
        return this._service;
    }
}
