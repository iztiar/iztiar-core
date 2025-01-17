/*
 * MqttConnect class
 *
 * Companion class of the IMqttClient interface.
 */
import deepcopy from 'deepcopy';
import fs from 'fs';
import mqtt from 'mqtt';
import path from 'path';

import { IStatus, Msg, utils } from './index.js';

export class MqttConnect {

    static d = {
        pubAlive: false,
        pubConf: false,
        pubDocuments: false,
        pubPeriod: 60*1000,
        proto: 'mqtt',
        host: 'localhost',
        port: 24003,
        name: 'default',
        // MQTT client connect options we override (MQTT.js default = 1000)
        reconnectPeriod: 5*1000
    };

    // the key of the client configuration group
    _key = null;

    // the MQTT client connection
    _client = null;

    // the JS interval for periodic alive publication
    _aliveInterval = null;

    // TLS certificate and key
    _clientCert = null;
    _clientCertPath = null;
    _clientKey = null;
    _clientKeyPath = null;

    _filledConf = null;
    _secConfig = null;

    /**
     * Constructor
     * @param {*} instance the instance which implements the IMqttClient interface
     * @param {String} key the key of this client connection configuration group
     * @returns {MqttConnect}
     */
    constructor( instance, key ){
        Msg.debug( 'MqttConnect instanciation', 'key='+key );
        this._key = key;
        IStatus.add( instance, this._statusPart, this );
        return this;
    }

    /*
     * 'alive' messages are periodically published
     */
    _aliveInstall( iface ){
        Msg.debug( 'MqttConnect._aliveInstall()', 'this._client is '+( this._client ? 'set':'unset' ));
        if( !this._aliveInterval ){
            Msg.debug( 'MqttConnect._aliveInstall() installing _aliveInterval' );
            this._aliveInterval = setInterval(() => { this._aliveRun( iface )}, this._filledConf.publications.period );
            this._aliveRun( iface );
        }
    }

    _aliveRun( iface, empty=false ){
        const exports = iface.featureProvider().api().exports();
        if( this._client && this._aliveInterval ){
            let _promise = Promise.resolve( true );
            const topic = 'iztiar/$IZ/alive/'+iface.v_name();
            let _payload = null;
            if( empty ){
                _promise = _promise
                    .then(() => { _payload = undefined; });
            } else {
                _promise = _promise
                    .then(() => { return iface.v_alive(); })
                    .then(( res ) => {
                        _payload = res ? res : {};
                        _payload.timestamp = exports.utils.now();
                    });
            }
            _promise = _promise.then(() => {
                Msg.debug( 'MqttConnect._aliveOrigRun() publishing', topic, _payload );
                this.publish( topic, _payload, { retain: true });
            });
        }
    }

    /*
     * conf/ hierarchy is published once at startup
     */
    _confRun( iface, empty=false ){
        const exports = iface.featureProvider().api().exports();
        if( this._client ){
            const topic = 'iztiar/$IZ/feature/'+iface.v_name()+'/conf';
            let _payload = null;
            if( empty ){
                _payload = undefined;
                Msg.debug( 'MqttConnect._confRun() publishing', topic, _payload );
                this.publish( topic, _payload, { retain: true });
            } else {
                _payload = iface.v_conf();
                Object.keys( _payload ).every(( k ) => {
                    if( typeof _payload[k] === 'object' ){
                        Object.keys( _payload[k] ).every(( subk ) => {
                            const tt = topic+'/'+k+'/'+subk;
                            Msg.debug( 'MqttConnect._confRun() publishing', tt, _payload[k][subk] );
                            this.publish( tt, _payload[k][subk], { retain: true });
                            return true;
                        });
                    } else {
                        const tt = topic+'/'+k;
                        Msg.debug( 'MqttConnect._confRun() publishing', tt, _payload[k] );
                        this.publish( tt, _payload[k], { retain: true });
                    }
                    return true;
                });
            }
        }
    }

    // try to build an URI to address the broker
    // @param {featureProvider} provider
    // @param {Object} conf this client configuration
    // @returns {Promise} which resolves to provided conf
    _fillConfigURI( provider, conf ){
        const featApi = provider.api();
        const exports = featApi.exports();
        let _promise = Promise.resolve( conf );
        //  the feature should be preferred - not mandatory and no default
        if( Object.keys( conf ).includes( 'feature' )){
            let _featConfig = provider.getConfig( conf.feature, 'IMqttServer' );
            if( _featConfig ){
                conf.uri = _featConfig.uri;
            } else {
                _promise = featApi.pluginManager().getConfig( featApi, conf.feature, 'IMqttServer' )
                .then(( _featConfig ) => {
                    if( _featConfig ){
                        conf.uri = _featConfig.uri;
                    } else {
                        exports.Msg.warn( 'MqttConnect._fillConfigURI() feature='+conf.feature+' config resolves to null' );
                    }
                    return Promise.resolve( conf );
                });
            }
        // an URI is also possible, will be directly used by MQTT.connect()
        //  so just setup atoms of the URL just in case we would need them later
        } else if( Object.keys( conf ).includes( 'uri' )){
            if( Object.keys( conf ).includes( 'proto' )){
                exports.Msg.warn( 'MqttConnect._fillConfigURI() key='+this._key+' proto=\''+conf.proto+'\' ignored as an URI is specified' );
            }
            if( Object.keys( conf ).includes( 'host' )){
                exports.Msg.warn( 'MqttConnect._fillConfigURI() key='+this._key+' host=\''+conf.host+'\' ignored as an URI is specified' );
            }
            if( Object.keys( conf ).includes( 'port' )){
                exports.Msg.warn( 'MqttConnect._fillConfigURI() key='+this._key+' port=\''+conf.port+'\' ignored as an URI is specified' );
            }
            let url = new URL( conf.uri );
            conf.proto = url.protocol;
            conf.host = url.hostname;
            conf.port = url.port;
        // as a last chance we try to build an URI from proto+host+port
        } else {
            if( !conf.proto ){
                conf.proto = MqttConnect.d.proto;
            }
            if( !conf.host ){
                conf.host = MqttConnect.d.host;
            }
            if( !conf.port ){
                conf.port = MqttConnect.d.port;
            }
            conf.uri = conf.proto + '://' + conf.host + ':' + conf.port;
        }
        return _promise;
    }

    // publish the MqttConnect status as part of the global one
    _statusPart( instance, self ){
        Msg.debug( 'MqttConnect.statusPart()' );
        let o = {};
        o[ self._key ] = {
            ... self._filledConf
        };
        return Promise.resolve( o );
    }

    /* *** ***************************************************************************************
       *** The public API, i.e; the API anyone may call to access the interface service        ***
       *** *************************************************************************************** */

    /**
     * @returns {Object} the secured filled configuration
     */
    config(){
        return this._filledConf;
    }

    /**
     * Try to connect to the specified message bus (aka broker) - retry every minute if needed
     * @param {IMqttClient} iface
     * @param {Object} conf the client connection configuration
     * Note:
     *  Starting with v0.7, our IMqttServer makes use of self-signed root CA
     * [-Public API-]
     */
    connect( iface, conf ){
        Msg.debug( 'MqttConnect.connect()' );

        this._filledConf = utils.filterBuffer( conf );
        delete this._filledConf.options.password;

        const self = this;

        this._client = mqtt.connect( conf.uri, conf.options );

        this._client.on( 'connect', function(){
            Msg.verbose( 'MqttConnect (re)connect' );
            if( self._filledConf.publications.alive ){
                self._aliveInstall( iface );
            }
            if( self._filledConf.publications.conf ){
                self._confRun( iface );
            }
        });

        this._client.on( 'error', ( e ) => {
            Msg.error( 'MqttConnect error', e );
        });
    }

    /**
     * Fill the configuration for this client connection
     * @param {featureProvider} provider
     * @param {Object} conf the client configuration
     * @returns {Promise} which resolves to the filled client configuration
     */
    fillConfig( provider, conf ){
        const featApi = provider.api();
        const exports = featApi.exports();
        const core = featApi.config().core();
        exports.Msg.debug( 'MqttConnect.fillConfig() key='+this._key );
        let _promise = Promise.resolve( conf )
            .then(() => { return this._fillConfigURI( provider, conf ); })
            .then(() => {
                // MqttConnect options
                if( !conf.publications ){
                    conf.publications = {};
                }
                if( !conf.publications.period ){
                    conf.publications.period = MqttConnect.d.pubPeriod;
                }
                if( !conf.publications.alive ){
                    conf.publications.alive = MqttConnect.d.pubAlive;
                }
                if( !conf.publications.conf ){
                    conf.publications.conf = MqttConnect.d.pubConf;
                }
                if( !conf.publications.documents ){
                    conf.publications.documents = MqttConnect.d.pubDocuments;
                }
                // mqtt client options we override
                if( !conf.options ){
                    conf.options = {};
                }
                if( !conf.options.reconnectPeriod ){
                    conf.options.reconnectPeriod = MqttConnect.d.reconnectPeriod;
                }
                // starting with v0.7.0, our IMqttServer broker requires TLS connections
                // reading server key and cert files may also throw exceptions, which is acceptable here
                if( !core.rootCACert ){
                    throw new Error( 'MqttConnect.fillConfig() root CA is not set' );
                }
                if( !conf.options.ca ){
                    Msg.debug( 'MqttConnect.fillConfig() installing root CA' );
                    conf.options.ca = core.rootCACert;
                }
                if( conf.cert ){
                    this._clientCert = fs.readFileSync( path.join( featApi.storageDir(), conf.cert ));
                    this._clientCertPath = conf.cert;
                    conf.options.cert = this._clientCert;
                }
                if( conf.key ){
                    this._clientKey = fs.readFileSync( path.join( featApi.storageDir(), conf.key ));
                    this._clientKeyPath = conf.key;
                    conf.options.key = this._clientKey;
                }
                return Promise.resolve( conf );
            });
        return _promise;
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
            Msg.error( 'MqttConnect.publish() not connected while trying to publish on \''+topic+'\' topic' );
        }
    }

    /**
     * Subscribe to a topic
     * @param {String} topic the topic to subscribe to
     * @param {Object} instance an instance to become 'this' inside of the callback
     * @param {Function} fn the function ( topic, payload ) to be called when a message is seen on this topic
     * @param {*} args more arguments to be passed to fn callback
     * [-Public API-]
     */
    subscribe( topic, instance, fn, args ){
        if( this._client ){
            let _args = [ ...arguments ];
            _args.splice( 3 );
            Msg.debug( 'MqttConnect.subscribe() topic='+topic );
            this._client.subscribe( topic, ( err ) => {
                Msg.error( 'MqttConnect.subscribe() topic='+topic, 'error', err );
            });
            this._client.on( 'message', ( t, p ) => { fn.apply( instance, [ t, p, ..._args ]); });
        } else {
            Msg.error( 'MqttConnect.subscribe() not connected while trying to subscribe to \''+topic+'\' topic' );
        }
    }

    /**
     * When the server is asked for terminating, also close the MQTT connection
     * @param {IMqttClient} iface
     * @returns {Promise}
     * [-Public API-]
     */
    terminate( iface ){
        let _promise = Promise.resolve( true );
        if( this._client ){
            if( this._aliveInterval ){
                clearInterval( this._aliveInterval );
                this._aliveRun( iface, true );
                this._aliveInterval = null;
            }
            if( this._filledConf.publications.conf ){
                this._confRun( iface, true );
            }
            _promise = _promise.then(() => {
                Msg.debug( 'MqttConnect.terminate() ending client connection' );
                this._client.end();
            });
        }
        return _promise;
    }
}
