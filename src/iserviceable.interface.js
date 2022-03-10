/*
 * IServiceable interface
 *
 *  The interface to be implemented by the running services to be managed by Iztiar
 */
import { IMsg } from './index.js';

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
        IMsg.debug( 'IServiceable.class()' );
        return this.constructor && this.constructor.name ? this.constructor.name : '';
    }

    /**
     * If the service had to be SIGKILL'ed to be stoppped, then gives it an opportunity to make some cleanup
     * [-implementation Api-]
     */
    cleanupAfterKill(){
        IMsg.debug( 'IServiceable.cleanupAfterKill()' );
    }

    /**
     * @returns {Promise} which must resolve to an object conform to check-status.schema.json
     * [-implementation Api-]
     */
    getCheckStatus(){
        IMsg.debug( 'IServiceable.getCheckStatus()' );
        return Promise.resolve({
            startable: false,
            reasons: [ 'not implemented' ],
            pids: [],
            ports: []
        });
    }

    /**
     * @returns {Boolean} true if the process must be forked (and the main application will take care of that)
     * [-implementation Api-]
     */
    isForkable(){
        IMsg.debug( 'IServiceable.isForkable()' );
        return true;
    }

    /**
     * [-implementation Api-]
     */
    onStartupConfirmed( data ){
        IMsg.debug( 'IServiceable.onStartupConfirmed()' );
    }

    /**
     * @returns {Promise}
     * [-implementation Api-]
     */
    start(){
        IMsg.verbose( 'IServiceable.start()' );
        return Promise.resolve( true );
    }

    /**
     * @returns {Promise} which must resolve to an object conform to run-status.schema.json
     * [-implementation Api-]
     */
    status(){
        IMsg.debug( 'IServiceable.status()' );
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
     * @returns {Promise}
     * [-implementation Api-]
     */
    stop(){
        IMsg.debug( 'IServiceable.stop()' );
        return Promise.resolve( true );
    }

    /* *** ***************************************************************************************
       *** The public API, i.e; the API anyone may call to access the interface service        ***
       *** *************************************************************************************** */

}
