/*
 * IStatus interface
 * 
 *  Everyone, and for example every implemented interface, is allowed to add() here a new status part.
 *  Each of the provided function will then be called in sequence when requiring a feature status.
 */
import { Interface, Msg } from './index.js';

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
     * Add a status part to an implementation instance
     * Takes care of implementing the interface if not already done
     * @param {Object} instance the implementation instance
     * @param {Function} fn the function to be invoked when status is requested
     *  The function will be called with the implementation instance as first argument, followed by the args provided here
     *  The function must return a Promise which resolves to an object which will be added as-is to the parent status
     *  (so you should group the datas inside of a group if you wish so)
     * @param {Object[]} args the arguments to pass to the function, after:
     *  - the implementation instance
     * [-Public API-]
     */
    static add(){
        Msg.debug( 'IStatus.add()' );
        if( arguments.length > 1 ){
            let _args = [ ...arguments ];
            const instance = _args.splice( 0, 1 )[0];
            if( instance ){
                if( !instance.IStatus ){
                    Interface.add( instance, IStatus );
                }
                instance.IStatus.add( ..._args );
                return;
            }
        }
        Msg.error( 'IStatus.add() lacks of at least an instance and a function' );
    }

    /**
     * Add a status part to the implementation instance
     * @param {Function} fn the function to be invoked when status is requested
     *  The function will be called with the implementation instance as first argument, followed by the args provided here
     *  The function must return a Promise which resolves to an object which will be added as-is to the parent status
     *  (so you should group the datas inside of a group if you wish so)
     * @param {Object[]} args the arguments to pass to the function, after:
     *  - the implementation instance
     * [-Public API-]
     */
    add(){
        Msg.debug( 'IStatus.add()' );
        if( arguments.length > 0 ){
            let _args = [ ...arguments ];
            const fn = _args.splice( 0, 1 )[0];
            if( fn && typeof fn === 'function' ){
                this._status.push({ fn:fn, args:_args });
                return;
            }
        }
        Msg.error( 'IStatus.add() lacks of at least a function' );
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
