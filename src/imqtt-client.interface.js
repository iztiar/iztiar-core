/*
 * IMqttClient interface
 */
import mqtt from 'mqtt';

import { Msg, utils } from './index.js';

export class IMqttClient {

    static d = {
        connectPeriod: 60*1000,
        alivePeriod: 60*1000
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
            const topic = 'iztiar/alive/'+this._name();
            let _payload = null;
            this._status()
                .then(( res ) => {
                    if( res ){
                        return res;
                    } else {
                        return this._stdPayload();
                    }
                })
                .then(( res ) => {
                    if( res ){
                        _payload = res;
                    } else {
                        _payload = {};
                    }
                })
                .then(() => {
                    Msg.debug( 'IMqttClient._alive() publishing', topic, _payload );
                    this._client.publish( topic, JSON.stringify( _payload ));
                });
        }
    }

    _capabilities(){
        let _caps = [];
        if( this._instance && this._instance.ICapability ){
            _caps = this._instance.ICapability.get();
        }
        return _caps
    }

    // the standard payload which is published by default
    _stdPayload(){
        return Promise.resolve({
            module: this._module(),
            class: this._class(),
            capabilities: this._capabilities(),
            timestamp: utils.now()
        });
    }

    /* *** ***************************************************************************************
       *** The implementation API, i.e; the functions the implementation may want to implement ***
       *** *************************************************************************************** */

    /**
     * @returns {String} the name of the implementation class
     * [-implementation Api-]
     */
    _class(){
        return '';
    }

    /**
     * @returns {String} the name of the implementation module
     * [-implementation Api-]
     */
    _module(){
        return null;
    }

    /**
     * @returns {String} the name of the service
     * [-implementation Api-]
     */
    _name(){
        return null;
    }

    /**
     * @returns {Promise} which resolves to the status of the service
     * This is the first tested option when publishing an 'alive' message
     * If not iplemented by the instance, then we default to the standard payload
     * [-implementation Api-]
     */
    _status(){
        return Promise.resolve( null );
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

        this._client.on( 'message', ( topic, message ) => {
            console.log( 'message:topic', topic );
            // message is Buffer
            console.log( 'message:message', message.toString());
            self._client.end();
        });
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
