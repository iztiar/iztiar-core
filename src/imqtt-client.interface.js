/*
 * IMqttClient interface
 *
 * One instance of the interface is instanciated at implementation time.
 * Several connections can be managed which are each handled by their own MqttConnect instance.
 */
import { MqttConnect, Msg } from './index.js';

export class IMqttClient {

    _instance = null;
    _clients = {};

    /**
     * Constructor
     * @param {*} instance the implementation instance
     * @returns {IMqttClient}
     */
   constructor( instance ){
        Msg.debug( 'IMqttClient instanciation' );
        this._instance = instance;
        return this;
    }

    /* *** ***************************************************************************************
       *** The implementation API, i.e; the functions the implementation may want to implement ***
       *** *************************************************************************************** */

    /**
     * @returns {Promise} which resolves to the payload of the 'alive' message
     * A date-hour timestamp is always added by the MqttConnect client before publishing
     * [-implementation Api-]
     */
    v_alive(){
        return Promise.resolve({
            module: this.v_module(),
            class: this.v_class()
        });
    }

    /**
     * @returns {String} the name of the implementation class
     * [-implementation Api-]
     */
    v_class(){
        return this._instance.feature().class();
    }

    /**
     * @returns {String} the name of the implementation module
     * [-implementation Api-]
     */
    v_module(){
        return this._instance.feature().module();
    }

    /**
     * @returns {String} the name of the service
     * [-implementation Api-]
     */
    v_name(){
        return this._instance.feature().name();
    }

    /* *** ***************************************************************************************
       *** The public API, i.e; the API anyone may call to access the interface service        ***
       *** *************************************************************************************** */

    /**
     * Try to make each declared client connect to its respective broker
     * [-Public API-]
     */
    connects(){
        Msg.debug( 'IMqttClient.connects()' );
        const self = this;
        const featConfig = self._instance.feature().config();
        Object.keys( this._clients ).every(( key ) => {
            self._clients[key].connect( self, featConfig[key] );
            return true;
        });
    }

    /**
     * @returns {featureProvider} the implementing instance
     */
    featureProvider(){
        return this._instance;
    }

    /**
     * Fill the configuration for this interface
     * Please note that the IMqttClient interface is able to handle several client connections.
     * @param {Object} conf the full feature configuration (at an unspecified stade of filling...)
     * @param {String[]} founds the list of found keys which handle a configuration for this interface
     * @returns {Promise} which resolves to the filled interface configuration, or null if several configurations are found
     */
    fillConfig( conf, founds ){
        const featApi = this._instance.api();
        const Msg = featApi.exports().Msg;
        Msg.debug( 'IMqttClient.fillConfig()', 'founds=', founds );
        const self = this;
        let _promise = Promise.resolve( null );
        if( !Object.keys( conf ).includes( 'izMqtt' )){
            conf.izMqtt = 'IMqttClient';
        }
        let _found = false;
        founds.every(( k ) => {
            if( k === conf.izMqtt ){
                _found = true;
            }
            self._clients[k] = new MqttConnect( self._instance, k );
            _promise = _promise
                .then(() => { return self._clients[k].fillConfig( this._instance, conf[k] ); });
            return true;
        });
        _promise = _promise.then(() => {
            if( !_found ){
                Msg.warn( 'IMqttClient.fillConfig() izMqtt='+conf.izMqtt+' not found among configured clients' );
            }
        })
        return _promise;
    }

    /**
     * @returns {Object} the managed connections
     */
    getConnections(){
        return this._clients;
    }

    /**
     * When the server is asked for terminating, also close the MQTT connections
     * @returns {Promise}
     * [-Public API-]
     */
    terminate(){
        let _promise = Promise.resolve( true );
        Object.keys( this._clients ).every(( key ) => {
            _promise = _promise.then(() => { return this._clients[key].terminate( this ); });
            return true;
        });
        return _promise;
    }
}
