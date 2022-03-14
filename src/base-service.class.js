/*
 * baseService class
 *
 *  A base class for our IServiceable's
 */

import { Msg } from './index.js';

export class baseService {

    // construction
    _api = null;
    _config = null;

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

    /**
     * Getter/Setter
     * @returns {Object} the filled config built at construction time
     */
    config( conf ){
        if( conf && Object.keys( conf ).length ){
            this._config = conf;
            Msg.debug( this.name(), 'filledConfiguration', conf );
        }
        return this._config;
    }

    /**
     * @returns {String} the module name providing the service
     */
    module(){
        return this.api().service().module();
    }

    /**
     * @returns {String} the service name
     */
    name(){
        return this.api().service().name();
    }
}
