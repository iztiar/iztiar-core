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
     * @returns {String[]} the array of service capabilities
     * [-implementation Api-]
     */
    capabilities(){
        Msg.debug( 'IServiceable.capabilities()' );
        return [];
    }

    /**
     * @returns {String} the type of the service, not an identifier, rather a qualifier
     *  For example, the implementation class name is a good choice
     *  This method is also called from featureCard.class() to provide the actual runtime class name.
     *  So you probably want rather use the featureCard.class() methid which is always available.
     * [-implementation Api-]
     */
    class(){
        Msg.debug( 'IServiceable.class()' );
        return '';
    }

    /**
     * @returns {Object} the filled configuration for the service
     * [-implementation Api-]
     */
    config(){
        Msg.debug( 'IServiceable.config()' );
        return {};
    }

    /**
     * If the service had to be SIGKILL'ed to be stoppped, then gives it an opportunity to make some cleanup
     * [-implementation Api-]
     */
    killed(){
        Msg.debug( 'IServiceable.killed()' );
    }

    /**
     * @param {String} cap the desired capability name
     * @returns {Object|null} the capability characteristics 
     * [-implementation Api-]
     */
    get( cap ){
        Msg.debug( 'IServiceable.get() cap='+cap );
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
     * Start the service (and just that)
     * Notes:
     *  - If the service must start in its own process, then the calling application must have taken care of forking the ad-hoc
     *    process before calling this method.
     *  - This method is not expected to check that the service is not running before to start, and not expected either to check
     *    that the service is rightly running after that.
     * @returns {Promise}
     * [-implementation Api-]
     */
    start(){
        Msg.verbose( 'IServiceable.start()' );
        return Promise.resolve( false );
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
                module: 'unset',
                class: 'unset',
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
}
