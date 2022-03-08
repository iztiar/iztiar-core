/*
 * coreController class
 */
import { IRunFile, IServiceable, Interface } from './index.js';

export class coreController {

    // construction
    _api = null;
    _service = null;

    /**
     * @param {ICoreApi} api 
     * @param {coreService} service
     * @returns {coreController}
     */
    constructor( api, service ){
        this._api = api;
        this._service = service;

        Interface.add( this, IRunFile );

        Interface.add( this, IServiceable, {
            expectedPids: this.iserviceableExpectedPids,
            expectedPorts: this.iserviceableExpectedPorts
        });

        return this;
    }

    static start(){

    }

    /**
     * @param {coreService} service the service to be tested
     * @returns {Object}
     */
    static status( service ){

    }

    static stop(){

    }

    /*
     * @returns {Promise} which resolves to an array of the PIDs of running processes (if apply)
     * [-implementation Api-]
     */
    iserviceableExpectedPids(){
        return Promise.resolve( IRunFile.pids( this.api().config(), this.service().name()));
    }

    /*
     * @returns {Promise} which resolves to an array of the opened TCP ports (if apply)
     * [-implementation Api-]
     */
    iserviceableExpectedPorts(){
        return Promise.resolve( IRunFile.ports( this.api().config(), this.service().name()));
    }

    /**
     * @returns {ICoreApi}
     */
    api(){
        return this._api;
    }

    /**
     * @returns {coreService}
     */
    service(){
        return this._service;
    }
}
