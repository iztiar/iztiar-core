/*
 * baseService class
 *
 *  A base class for our IServiceable's
 */

import { Msg } from './index.js';

export class baseService {

    // construction
    _api = null;

    /**
     * @param {coreApi} api the core API as described in core-api.schema.json
     * @returns {baseService}
     */
     constructor( api ){
        Msg.debug( 'baseService instanciation' );
        //console.log( api );
        this._api = api;
        return this;
    }

    /**
     * @returns {coreApi} the whole core API object provided by the core at initialization time
     */
    api(){
        return this._api;
    }
}
