/*
 * baseService class
 *
 *  A base class for our IServiceable's
 */

import { Msg } from './index.js';

export class baseService {

    // construction
    _api = null;
    _feature = null;
    _config = null;

    /**
     * @param {engineApi} api the engine API as described in engine-api.schema.json
     * @param {featureCard} card the instance which describes this feature
     * @returns {baseService}
     */
     constructor( api, card ){
        Msg.debug( 'baseService instanciation', 'engineApi:', api, 'featureCard:', card, 'count='+arguments.length );
        this._api = api;
        this._feature = card;
        return this;
    }

    /**
     * @returns {engineApi} api the engine API as described in engine-api.schema.json
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
            Msg.debug( 'baseService.config()', 'name='+this.feature().name(), conf );
            this._config = conf;
        }
        return this._config;
    }

    /**
     * @returns {featureCard} card the instance which describes this feature
     */
    feature(){
        return this._feature;
    }
}
