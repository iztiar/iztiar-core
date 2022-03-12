/*
 * IServiceable interface
 *
 *  The interface to be implemented by the running services to be managed by Iztiar
 */
import { Msg } from './index.js';

export class IServiceable {

    /* *** ***************************************************************************************
       *** The implementation API, i.e; the functions the implementation may want to implement ***
       *** *************************************************************************************** */

    /**
     * @returns {String} the type of the service, not an identifier, rather a qualifier
     *  For example, the implementation class name is a good choice
     * [-implementation Api-]
     */
    class(){
        Msg.debug( 'IServiceable.class()' );
        return this.constructor && this.constructor.name ? this.constructor.name : '';
    }

    /**
     * If the service had to be SIGKILL'ed to be stoppped, then gives it an opportunity to make some cleanup
     * [-implementation Api-]
     */
    cleanupAfterKill(){
        Msg.debug( 'IServiceable.cleanupAfterKill()' );
    }

    /**
     * @returns {Promise} which must resolve to an object conform to check-status.schema.json
     *  This will be used by coreService.status() to know which pids and ports to check
     * [-implementation Api-]
     */
    getCheckStatus(){
        Msg.debug( 'IServiceable.getCheckStatus()' );
        return Promise.resolve({
            startable: false,
            reasons: [ 'not implemented' ],
            pids: [],
            ports: []
        });
    }

    /**
     * @returns {String} the helloMessage from the runfile (if any)
     * [-implementation Api-]
     */
    helloMessage(){
         return null;
    }

    /**
     * @returns {Boolean} true if the process must be forked (and the main application will take care of that)
     * [-implementation Api-]
     */
    isForkable(){
        Msg.debug( 'IServiceable.isForkable()' );
        return true;
    }

    /**
     * Start the service
     * @returns {Promise}
     * [-implementation Api-]
     */
    start(){
        Msg.verbose( 'IServiceable.start()' );
        return Promise.resolve( true );
    }

    /**
     * Get the status of a service
     * Even if there is not any dameon, this default should be overriden
     * @returns {Promise} which must resolve to an object conform to run-status.schema.json
     * [-implementation Api-]
     */
    status(){
        Msg.debug( 'IServiceable.status()' );
        return Promise.resolve({
            name: {
                module: 'unknown',
                class: 'unknown',
                pids: [],
                ports: [],
                status: null
            }
        });
    }

    /**
     * Stop the service
     * @returns {Promise}
     * [-implementation Api-]
     */
    stop(){
        Msg.debug( 'IServiceable.stop()' );
        return Promise.resolve( true );
    }

    /* *** ***************************************************************************************
       *** The public API, i.e; the API anyone may call to access the interface service        ***
       *** *************************************************************************************** */

    /**
     * @param {IServiceable} instance to be checked
     * @returns {Promise} which resolves to true if the instance has been successfully initialized
     */
    static successfullyInitialized( instance ){
        return new Promise(( resolve, reject ) => {
            const _res = instance && instance instanceof IServiceable;
            Msg.verbose( 'IServiceable.successfullyInitialized()', _res );
            resolve( _res );
        })
    }
}
