/*
 * cli-status.js
 * 
 *  Returns a Promise which eventually resolves with the feature status.
 */
import chalk from 'chalk';

import { featureCard, featureProvider, Msg } from './index.js';

/**
 * Get the status of the named service
 * @param {coreApi} api a coreApi instance
 * @param {String} name the feature name to get the status from
 * @param {Object} options 
 *  consoleLevel {String} defaulting to current level
 * @returns {Promise} which resolves to the service status
 */
export function cliStatus( api, name, options={} ){
    Msg.verbose( 'cliStatus()', 'coreApi:', api, 'name='+name, 'options:', options );

    const _origLevel = Msg.consoleLevel();
    const _consoleLevel = Object.keys( options ).includes( 'consoleLevel' ) ? options.consoleLevel : _origLevel;
    if( _consoleLevel !== _origLevel ) Msg.consoleLevel( _consoleLevel );

    const featCard = api.pluginManager().byName( api, name );

    if( !featCard || !( featCard instanceof featureCard )){
        Msg.error( 'cliStatus() unknown feature: \''+name+'\'' );
        process.exitCode += 1;
        return Promise.resolve( false );
    }

    Msg.out( 'Getting the status of \''+name+'\' feature' );
    let result = {};

    let _promise = Promise.resolve( true )
        .then(() => { return featCard.initialize( api ); })
        .then(( provider ) => {
            if( provider && provider instanceof featureProvider ){
                Msg.verbose( name+': featureProvider instance sucessfully initialized' );
            } else {
                Msg.verbose( name+': initialization failed' );
            }
        })
        .then(() => { return featCard.status(); })
        .then(( res ) => {

            if( res.startable ){
                Msg.out( 'Service doesn\'t run, is startable' );
            
            } else if( res.reasons && res.reasons.length  ){
                Msg.warn( '\''+name+'\' service is said running, but exhibits', res.reasons.length, 'error message(s)' );
                Msg.warn( ' You may want use --force-stop option to remove the falsy \''+name+'\' from your run directory' );
                process.exitCode += 1;

            } else {
                Msg.out( chalk.green( 'Service \''+name+'\' is confirmed up and running' ));
                const hello = featCard.provider().getCapability( 'helloMessage' );
                if( hello ){
                    hello.then(( res ) => { Msg.info( chalk.green( 'Greetings message is « '+res+' »' )); });
                }
            }

            if( _consoleLevel !== _origLevel ) Msg.consoleLevel( _origLevel );
            return Promise.resolve( res );
        })

    return _promise;
}
