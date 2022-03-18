/*
 * IStatus interface
 * 
 *  Everyone, and for example every implemented interface, is allowed to add() here a new status part.
 *  Each of the returned checkable will then be called in sequence when requiring a feature status.
 */
import { Msg } from './index.js';

export class IStatus {

    _instance = null;
    _status = [];

    /**
     * Constructor
     * @param {*} instance the implementation instance
     * @returns {IStatus}
     */
    constructor( instance ){
        Msg.debug( 'IStatus instanciation' );
        this._instance = instance;
        return this;
    }

    /* *** ***************************************************************************************
       *** The implementation API, i.e; the functions the implementation may want to implement ***
       *** *************************************************************************************** */

    /* *** ***************************************************************************************
       *** The public API, i.e; the API anyone may call to access the interface service        ***
       *** *************************************************************************************** */

    /**
     * Add a status part to the implementation instance
     * @param {Function} fn the function to be invoked when status is requested
     *  The function will be called with the implementation instance as first argument, followed by the args provided here
     *  The function must return a Promise which resolves to an object which will be added to the parent status
     * @param {Object[]} args the arguments to pass to the function, after:
     *  - the implementation instance
     * [-Public API-]
     */
    add( fn, args=[] ){
        Msg.debug( 'IStatus.add()', fn, args );
        this._status.push({ fn:fn, args:args });
    }

    /**
     * @params {Object} the current status object
     * @returns {Promise} which resolves to the status object where all the status parts have been added
     * [-Public API-]
     */
    run( status ){
        let _promise = Promise.resolve( status );
        this._status.every(( o ) => {
            if( o.fn && typeof o.fn === 'function' ){
                _promise = _promise
                    .then(() => { return o.fn( this._instance, ...o.args ); })
                    .then(( res ) => { return status = { ...status, ...res }; });
            }
            return true;
        });
        return _promise;
    }
}
