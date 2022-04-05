/*
 * coreController MQTT functions
 */
import os from 'os';

import { Msg } from './index.js';

const START = 'starting';
const VOTEDME = 'have voted for me';
const VOTEAGAIN = 'secound round';
const ELECTED = 'elected';

export const mqtt = {

    // other detected controllers
    controllers: {},

    // published (and read) votes
    votes: {},

    // master election timer (ms)
    masterTimer: 1000,
    masterInterval: null,
    masterPhase: null,
    masterElected: null,
    masterVoteTopic: 'iztiar/ADMIN/masterVotes/',
    masterElectedTopic: 'iztiar/ADMIN/masterController',

    /**
     * Detect other coreControllers via alive/ messages
     * @param {coreController} controller
     * @param {String} topic
     * @param {JSON} json
     * @param {MqttConnect} client
     */
    detectAliveController: function( controller, topic, json, client ){
        if( topic.startsWith( 'iztiar/alive/' )){
            const _class = json.class;
            const _name = topic.split( '/' )[2];
            if( _class === 'coreController' && _name !== controller.feature().name()){
                Msg.debug( 'mqtt.detectAliveController() detects another coreController \''+_name+'\'' );
                mqtt.controllers[_name] = {
                    id: json.id,
                    hostname: json.hostname,
                    stamp: Date.now()
                };
            }
        }
    },

    /**
     * Recolt the votes from other coreControllers
     * @param {coreController} controller
     * @param {String} topic
     * @param {JSON} json
     * @param {MqttConnect} client
     */
    detectAdminVote: function( controller, topic, json, client ){
        if( topic.startsWith( mqtt.masterVoteTopic )){
            const _name = topic.split( '/' )[3];
            mqtt.votes[_name] = json;
            Msg.debug( 'mqtt.detectAdminVote() '+_name+' votes for ',json,' as master' );
        }
    },

    /**
     * Detect other coreControllers via alive/ messages
     * @param {coreController} controller
     * @param {String} topic
     * @param {JSON} json
     * @param {MqttConnect} client
     */
    detectAdminMaster: function( controller, topic, json, client ){
        if( topic === mqtt.masterElectedTopic ){
            mqtt.masterElected = json;
            mqtt.masterElected.stamp = Date.now();
        }
    },

    /**
     * @returns {Object|null} the curent masterController
     */
    masterController: function(){
        return mqtt.masterElected;
    },

    /**
     * this function is periodically run to verify that we have a master controller somewhere in the mqtt bus
     * @param {coreController} controller
     */
    masterVoting: function( controller ){

        const tnow = Date.now();
        const myName = controller.feature().name();
        //Msg.debug( 'mqtt.masterVoting() masterPhase='+mqtt.masterPhase+' '+( mqtt.masterElected ? mqtt.masterElected.name : '' ));
        const clients = controller.IMqttClient.getConnections();
        const key = Object.keys( clients )[0];

        // return true if a master has been elected and is still valid
        const _masterElected = function(){
            if( mqtt.masterElected ){
                if( tnow - mqtt.masterElected.stamp > mqtt.masterTimer ){
                    mqtt.masterElected = null;
                }
            }
            if( mqtt.masterElected ){
                mqtt.masterPhase = ELECTED;
            }
            return mqtt.masterElected;
        };

        // publish myself either as a vote or as elected
        const _publishMe = function( topic, options={} ){
            clients[key].publish( topic, {
                name: myName,
                id: controller.id(),
                hostname: os.hostname(),
                stamp: tnow
            }, options );
        }

        // options when voting to limit the lifetime of the votes
        //  this doesn't make the message disappear from the MQTT client
        const options = {
            properties: {
                messageExpiryInterval: 10*mqtt.masterTimer
            }
        };

        switch( mqtt.masterPhase ){
            // a master controller is expected to publish its master status with this same timer
            // if we do not have received any, then we vote for us
            case START:
                if( !_masterElected()){
                    _publishMe( mqtt.masterVoteTopic+myName, options );
                    mqtt.masterPhase = VOTEDME;
                }
                break;
            // no master controller was here at the previous iteration
            //  if one has been found, and is still alive, then this is OK
            //  else vote now for the greatest id (if any), or me again
            case VOTEDME:
                if( !_masterElected()){
                    let maxid = controller.id();
                    let chosen = null;
                    if( mqtt.votes ){
                        Object.keys( mqtt.votes ).every(( n ) => {
                            const o = mqtt.votes[n];
                            if( o.id > maxid ){
                                maxid = o.id;
                                chosen = o;
                            }
                            return true;
                        });
                    }
                    if( chosen ){
                        Msg.debug( 'voting for master chosen', chosen );
                        chosen.stamp = tnow;
                        clients[key].publish( mqtt.masterVoteTopic+myName, chosen, options );
                        mqtt.masterPhase = VOTEAGAIN;
                    } else {
                        _publishMe( mqtt.masterElectedTopic );
                        mqtt.masterPhase = ELECTED;
                    }
                }
                break;
            // a master controller has been elected
            //  if it has not refreshed its master status, then is considered depromoted
            //  and we have to elect again
            case VOTEAGAIN:
            case ELECTED:
                if( !_masterElected()){
                    mqtt.masterPhase = START;
                } else if( mqtt.masterElected.name === myName ){
                    _publishMe( mqtt.masterElectedTopic );
                    mqtt.masterPhase = ELECTED;
                }
                break;
        }
    },

    /**
     * A message has been received on 'iztiar/' topic: what to do with it ?
     * @param {coreController} controller
     * @param {String} topic
     * @param {JSON} json
     * @param {MqttConnect} client
     */
    receivedIztiar: function( controller, topic, json, client ){
        // detect other coreControllers
        if( json ){
            mqtt.detectAliveController( controller, topic, json, client );
            mqtt.detectAdminVote( controller, topic, json, client );
            mqtt.detectAdminMaster( controller, topic, json, client );
        }
    },

    // a subscription function to be advertised of mqtt messages
    // we want to detect other alive coreControllers on the network and negociate a master
    receivedMessages( topic, payload, client ){
        if( topic.startsWith( 'iztiar/' )){
            const _bufferStr = new Buffer.from( payload ).toString().replace( /[\r\n]+/, '' );
            if( _bufferStr && _bufferStr.length ){
                const _json = JSON.parse( _bufferStr );
                mqtt.receivedIztiar( this, topic, _json, client );
            } else {
                Msg.info( 'coreController.mqtt.receivedMessages() receives empty/undefined payload on topic=\''+topic+'\'' );
            }
        } else {
            Msg.info( 'coreController.mqtt.receivedMessages() receives topic=\''+topic+'\'' );
        }
    },

    /**
     * Subscribe to iztiar/ topics
     * @param {coreController} controller
     */
    subscribe: function( controller ){
        const _clients = controller.IMqttClient.getConnections();
        Object.keys( _clients ).every(( key ) => {
            _clients[key].subscribe( 'iztiar/#', controller, mqtt.receivedMessages, _clients[key] );
            return true;
        });
    },

    /**
     * at start time, start the needed timers
     * - timer for electing a master
     * @param {coreController} controller
     */
    startTimers: function( controller ){
        mqtt.masterPhase = START;
        mqtt.masterInterval = setInterval( mqtt.masterVoting, mqtt.masterTimer, controller );
    }
};
