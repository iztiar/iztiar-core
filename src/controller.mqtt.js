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
    masterElectionTopic: 'iztiar/ADMIN/masterElection/',
    masterElectedTopic: 'iztiar/ADMIN/masterController',

    /**
     * Detect other coreControllers via alive/ messages
     * @param {coreController} controller
     * @param {String} topic
     * @param {JSON} json
     */
    detectController: function( controller, topic, json ){
        if( topic.startsWith( 'iztiar/alive/' )){
            const _class = json.class;
            const _name = topic.split( '/' )[2];
            if( _class === 'coreController' && _name !== controller.IFeatureProvider.feature().name()){
                Msg.debug( 'mqtt.detectController() detects another coreController \''+_name+'\'' );
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
     */
    detectElection: function( controller, topic, json ){
        if( topic.startsWith( mqtt.masterElectionTopic )){
            const _name = topic.split( '/' )[3];
            mqtt.votes[_name] = json;
        }
    },

    /**
     * Detect other coreControllers via alive/ messages
     * @param {coreController} controller
     * @param {String} topic
     * @param {JSON} json
     */
    detectMaster: function( controller, topic, json ){
        if( topic === mqtt.masterElectedTopic ){
            mqtt.masterElected = {
                name: json.name,
                id: json.id,
                hostname: json.hostname,
                stamp: Date.now()
            };
        }
    },

    /**
     * this function is periodically run to verify that we have a master controller somewhere in the mqtt bus
     * @param {coreController} controller
     */
    masterVoting: function( controller ){

        const tnow = Date.now();
        const myName = controller.IFeatureProvider.feature().name();
        Msg.debug( 'mqtt.masterVoting() masterPhase='+mqtt.masterPhase+' '+( mqtt.masterElected ? mqtt.masterElected.name : '' ));

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
        const _publishMe = function( topic ){
            controller.IMqttClient.publish( topic, {
                name: myName,
                id: controller.id(),
                hostname: os.hostname(),
                stamp: tnow
            });
        }

        switch( mqtt.masterPhase ){
            // a master controller is expected to publish its master status with this same timer
            // if we do not have received any, then we vote for us
            case START:
                if( !_masterElected()){
                    _publishMe( mqtt.masterElectionTopic+myName );
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
                    if( mqtt.controllers ){
                        Object.keys( mqtt.controllers ).every(( n ) => {
                            const o = mqtt.controllers[n];
                            if( o.id > maxid ){
                                maxid = o.id;
                                chosen = o;
                            }
                            return true;
                        });
                    }
                    if( chosen ){
                        controller.IMqttClient.publish( mqtt.masterElectionTopic+myName, {
                            name: chosen.name,
                            id: chosen.id,
                            hostname: chosen.hostname,
                            stamp: tnow
                        });
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
     */
    received: function( controller, topic, json ){
        // detect other coreControllers
        mqtt.detectController( controller, topic, json );
        mqtt.detectElection( controller, topic, json );
        mqtt.detectMaster( controller, topic, json );
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
