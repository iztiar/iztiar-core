/*
 * IServiceable interface
 *
 *  The interface to be implemented by the running services to be managed by Iztiar
 */
export class IServiceable {

    /* *** ***************************************************************************************
       *** The implementation API, i.e; the functions the implementation may want to implement ***
       *** *************************************************************************************** */

    /**
     * @returns {Promise} which resolves to an array of the PIDs of running processes (if apply)
     * [-implementation Api-]
     */
    expectedPids(){
        return Promise.resolve( [] );
    }

    /**
     * @returns {Promise} which resolves to an array of the opened TCP ports (if apply)
     * [-implementation Api-]
     */
    expectedPorts(){
        return Promise.resolve( [] );
    }

    /**
     * @returns {Boolean} true if the process must be forked (and the main application will take care of that)
     * [-implementation Api-]
     */
    isForkable(){
        return true;
    }

    /**
     * @returns {Promise}
     * [-implementation Api-]
     */
    start(){
        return Promise.resolve( true );
    }

    /**
     * @returns {Promise}
     * [-implementation Api-]
     */
    status(){
        return Promise.resolve( true );
    }

    /**
     * @returns {Promise}
     * [-implementation Api-]
     */
    stop(){
        return Promise.resolve( true );
    }

    /* *** ***************************************************************************************
       *** The public API, i.e; the API anyone may call to access the interface service        ***
       *** *************************************************************************************** */

}
