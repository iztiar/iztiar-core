/*
 * coreController class
 */
import { IManageable, Interface } from './index.js';

export class coreController {

    constructor(){

        Interface.add( this, IManageable );
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
}
