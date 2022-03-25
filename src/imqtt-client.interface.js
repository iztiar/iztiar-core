/*
 * IMqttClient interface
 */
import mqtt from 'mqtt';

import { IStatus, Msg, utils } from './index.js';

export class IMqttClient {

    static d = {
        alivePeriod: 60*1000,
        connectPeriod: 60*1000,
        port: 24003
    };

    _instance = null;
    _client = null;
    _aliveInterval = null;
    _alivePeriod = null;

    /**
     * Constructor
     * @param {*} instance the implementation instance
     * @returns {IMqttClient}
     */
   constructor( instance ){
        Msg.debug( 'IMqttClient instanciation' );
        this._instance = instance;

        // let publish our own status
        IStatus.add( this._instance, this._statusPart );

        return this;
    }

    _aliveInstall( options={} ){
        //console.log( 'IMqttClient._aliveInstall()', this._client );
        Msg.debug( 'IMqttClient._aliveInstall()', 'this._client is '+( this._client ? 'set':'unset' ));
        if( !this._aliveInterval ){
            Msg.debug( 'IMqttClient.advertise() installing aliveInterval' );
            this._alivePeriod = options.alivePeriod || IMqttClient.d.alivePeriod;
            this._aliveInterval = setInterval(() => { this._aliveRun()}, this._alivePeriod );
            this._aliveRun();
        }
    }

    _aliveRun(){
        //console.log( 'IMqttClient._aliveRun()', this );
        //Msg.debug( 'IMqttClient._aliveRun()' );
        if( this._client && this._aliveInterval ){
            const topic = 'iztiar/alive/'+this.v_name();
            let _payload = null;
            this.v_alive()
                .then(( res ) => {
                    if( res ){
                        _payload = res;
                    } else {
                        _payload = {};
                    }
                    _payload.timestamp = utils.now();
                    Msg.debug( 'IMqttClient._alive() publishing', topic, _payload );
                    this.publish( topic, _payload );
                });
        }
    }

    // publish the IMqttClient status as part of the global one
    _statusPart( instance ){
        Msg.debug( 'IMqttClient.statusPart()' );
        const o = {
            IMqttClient: instance.IMqttClient._client.options
        };
        return Promise.resolve( o );
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
    advertise( options={} ){
        Msg.debug( 'IMqttClient.advertise()', options );
        const self = this;

        // for now, we only connect to a local broker
        this._client = mqtt.connect( 'mqtt://127.0.0.1:'+options.port, options );

        this._client.on( 'connect', function(){
            Msg.verbose( 'IMqttClient (re)connect' );
            self._aliveInstall( options );
        });

        this._client.on( 'error', ( e ) => {
            Msg.error( 'IMqttClient error', e );
        });
    }

    /**
     * Fill the configuration for this interface
     * @param {Object} conf the full feature configuration (at an unspecified stade of filling...)
     * @returns {Promise} which resolves to the filled interface configuration
     */
    fillConfig( conf ){
        const featApi = this._instance.IFeatureProvider.api();
        const exports = featApi.exports();
        exports.Msg.debug( 'IMqttClient.fillConfig()' );
        let _filled = conf.IMqttClient;
        if( !_filled.alivePeriod ){
            _filled.alivePeriod = IMqttClient.d.alivePeriod;
        }
        //  the feature should be preferred - not mandatory and no default
        //  host and port are possible too - not mandatory either and no defaults
        //  if only a port is specified, then we default to localhost
        let _promise = Promise.resolve( _filled );
        if( Object.keys( _filled ).includes( 'feature' )){
            _promise = featApi.pluginManager().getConfig( featApi, _filled.feature, 'IMqttServer' )
                .then(( _conf ) => {
                    if( _conf ){
                        _filled.host = _conf.host || 'localhost'; 
                        _filled.port = _conf.port;
                    }
                    return Promise.resolve( _filled );
                });
        }
        _promise = _promise
            .then(() => {
                if( !_filled.host ){
                    _filled.host = 'localhost';
                }
                if( !_filled.port ){
                    _filled.port = IMqttClient.d.port;
                }
                return Promise.resolve( _filled );
            });
        return _promise;
    }

    /**
     * Publish a payload message on the MQTT bus
     * @param {String} topic must begin with 'iztiar/'
     * @param {Object} payload the data to be published
     * [-Public API-]
     */
    publish( topic, payload ){
        if( this._client ){
            this._client.publish( topic, JSON.stringify( payload ));
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
