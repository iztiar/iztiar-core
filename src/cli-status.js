/*
 * cli-status.js
 * 
 *  Returns a Promise which eventually resolves with the feature status.
 */
import chalk from 'chalk';

import { IFeatureProvider, featureCard, Msg } from './index.js';

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

    const feature = api.pluginManager().byName( api, name );

    if( !feature || !( feature instanceof featureCard )){
        Msg.error( 'cliStatus() unknown feature: \''+name+'\'' );
        process.exitCode += 1;
        return Promise.resolve( false );
    }

    Msg.out( 'Getting the status of \''+name+'\' service' );
    let result = {};

    let _promise = Promise.resolve( true )
        .then(() => { return feature.initialize( api ); })
        .then(( iFeatureProvider ) => {
            if( iFeatureProvider && iFeatureProvider instanceof IFeatureProvider ){
                Msg.verbose( name+': iFeatureProvider sucessfully initialized' );
            } else {
                Msg.verbose( name+': initialization failed' );
            }
        })
        .then(() => { return feature.status(); })
        .then(( res ) => {

            if( res.startable ){
                Msg.out( 'Service doesn\'t run, is startable' );
            
            } else if( res.reasons.length  ){
                Msg.warn( '\''+name+'\' service is said running, but exhibits', res.reasons.length, 'error message(s)' );
                Msg.warn( ' You may want use --force-stop option to remove the falsy \''+name+'\' from your run directory' );
                process.exitCode += 1;

            } else {
                Msg.out( chalk.green( 'Service \''+name+'\' is confirmed up and running' ));
                const hello = feature.iProvider().getCapability( 'helloMessage' );
                if( hello ){
                    hello.then(( res ) => { Msg.out( chalk.green( 'Greetings message is « '+res+' »' )); });
                }
            }

            if( _consoleLevel !== _origLevel ) Msg.consoleLevel( _origLevel );
            return Promise.resolve( res );
        })

    return _promise;
}
