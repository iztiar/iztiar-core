/*
 * IMqttClient interface
 *
 * One instance of the interface is instanciated at implementation time.
 * Several connections can be managed which are each handled by their own MqttConnect instance.
 */
import { IStatus, MqttConnect, Msg } from './index.js';

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
     * A date-hour timestamp is always added before publishing
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
        return this._instance.IFeatureProvider.feature().class();
    }

    /**
     * @returns {String} the name of the implementation module
     * [-implementation Api-]
     */
    v_module(){
        return this._instance.IFeatureProvider.feature().module();
    }

    /**
     * @returns {String} the name of the service
     * [-implementation Api-]
     */
    v_name(){
        return this._instance.IFeatureProvider.feature().name();
    }

    /* *** ***************************************************************************************
       *** The public API, i.e; the API anyone may call to access the interface service        ***
       *** *************************************************************************************** */

    /**
     * Try to connect to the specified message bus (aka broker) - retry every minute if needed
     * @param {Object} options the configuration
     *  host {String} the hostname (for now only localhost)
     *  port {Integer} the port number
     *  connectPeriod {Integer} the connect retry period in ms, default to 60*1000
     *  alivePeriod {Integer} the interval to refresh the alive status, defaults to 60*1000
     * [-Public API-]
     */
    /*
    advertise( options={} ){
        Msg.debug( 'IMqttClient.advertise()', options );
        const self = this;

        this._client = mqtt.connect( options.uri, options );

        this._client.on( 'connect', function(){
            Msg.verbose( 'IMqttClient (re)connect' );
            self._aliveInstall( options );
        });

        this._client.on( 'error', ( e ) => {
            Msg.error( 'IMqttClient error', e );
        });
    }
    */

    /**
     * Try to make each declared client connect to its respective broker
     * [-Public API-]
     */
    connects(){
        Msg.debug( 'IMqttClient.connects()' );
        const self = this;
        const featConfig = self._instance.IFeatureProvider.feature().config();
        Object.keys( this._clients ).every(( key ) => {
            self._clients[key].connect( self, featConfig[key] );
            return true;
        });
    }

    /**
     * @returns {IFeatureProvider}
     */
    featureProvider(){
        return this._instance.IFeatureProvider;
    }

    /**
     * Fill the configuration for this interface
     * Please note that the IMqttClient interface is able to handle several client connections.
     * @param {Object} conf the full feature configuration (at an unspecified stade of filling...)
     * @param {String[]} founds the list of found keys which handle a configuration for this interface
     * @returns {Promise} which resolves to the filled interface configuration, or null if several configurations are found
     */
    fillConfig( conf, founds ){
        const featApi = this._instance.IFeatureProvider.api();
        const exports = featApi.exports();
        exports.Msg.debug( 'IMqttClient.fillConfig()', 'founds=', founds );
        const self = this;
        let _promise = Promise.resolve( null );
        founds.every(( k ) => {
            self._clients[k] = new MqttConnect( self._instance, k );
            _promise = _promise
                .then(() => { return self._clients[k].fillConfig( this._instance.IFeatureProvider, conf[k] ); });
            return true;
        });
        return _promise;
    }

    /**
     * @returns {String[]} array of connection names
     */
    getConnections(){
        return Object.keys( this._clients );
    }

    /**
     * Publish a payload message on the MQTT bus
     * @param {String} topic must begin with 'iztiar/'
     * @param {Object} payload the data to be published
     * @param {Object} options as name says (see https://www.npmjs.com/package/mqtt#api)
     * [-Public API-]
     */
    publish( topic, payload, options={} ){
        if( this._client ){
            this._client.publish( topic, JSON.stringify( payload ), options );
        } else {
            Msg.error( 'IMqttClient.publish() not connected while trying to publish on \''+topic+'\' topic' );
        }
    }

    /**
     * Subscribe to a topic
     * @param {String} topic the topic to subscribe to
     * @param {Object} instance an instance to become 'this' inside of the callback
     * @param {Function} fn the function ( topic, payload ) to be called when a message is seen on this topic
     * [-Public API-]
     */
    subscribe( topic, instance, fn ){
        if( this._client ){
            Msg.debug( 'IMqttClient.subscribe() topic='+topic );
            this._client.subscribe( topic, ( err ) => {
                Msg.error( 'IMqttClient.subscribe() topic='+topic, 'error', err );
            });
            this._client.on( 'message', ( t, p ) => { fn.apply( instance, [ t, p ]); });
        } else {
            Msg.error( 'IMqttClient.subscribe() not connected while trying to subscribe to \''+topic+'\' topic' );
        }
    }

    /**
     * When the server is asker for terminating, also close the MQTT connection
     * [-Public API-]
     */
    terminate(){
        if( this._client ){
            if( this._aliveInterval ){
                clearInterval( this._aliveInterval );
                this._aliveInterval = null;
            }
            this._client.end();
        }
    }
}
