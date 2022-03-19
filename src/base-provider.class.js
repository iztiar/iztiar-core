/*
 * baseProvider class
 *
 *  A base class for our IFeatureProvider's
 * 
 *  It aims to be a very thin class which just deals with contruction time arguments.
 *  This is not mandatory for a plugin to derive from this class, but this may save some work...
 */

import { Msg } from './index.js';

export class baseProvider {

    // construction
    _api = null;
    _feature = null;

    /**
     * @param {engineApi} api the engine API as described in engine-api.schema.json
     * @param {featureCard} card the instance which describes this feature
     * @returns {baseProvider}
     */
    constructor( api, card ){
        Msg.debug( 'baseProvider instanciation', 'engineApi:', api, 'featureCard:', card, 'count='+arguments.length );
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
     * @returns {featureCard} card the instance which describes this feature
     */
    feature(){
        return this._feature;
    }
}
