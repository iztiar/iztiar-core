/*
 * IServiceManager interface
 */

export class IServiceManager {

    static services = {};

    /* *** ***************************************************************************************
       *** The implementation API, i.e; the functions the implementation may want to implement ***
       *** *************************************************************************************** */

    /* *** ***************************************************************************************
       *** The public API, i.e; the API anyone may call to access the interface service        ***
       *** *************************************************************************************** */
    
    /**
     * Records the status of a managed (started, stopped, ...) service
     * @param {coreService} service the service
     * @param {Promise} promise which resolves to the status of the service
     */
    set( service, promise ){
        IServiceManager.services[service.name()] = {
            service: service,
            promise: promise
        };
    }
}
