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
     * @returns {Object}
     * [-implementation Api-]
     */
    start(){

    }

    /**
     * @returns {Object}
     * [-implementation Api-]
     */
    status(){

    }

    /**
     * @returns {Object}
     * [-implementation Api-]
     */
    stop(){

    }

    /* *** ***************************************************************************************
       *** The public API, i.e; the API anyone may call to access the interface service        ***
       *** *************************************************************************************** */

}
