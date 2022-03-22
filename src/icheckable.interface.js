/*
 * ICheckable interface
 *
 *  Is the implementation checkable ?
 * 
 *  Everyone, and for example every implemented interface, is allowed to add() here a new checkable event.
 *  Each of the returned checkable will then be tested in sequence when requiring a feature status.
 */
import { Checkable, Msg } from './index.js';

export class ICheckable {

    _instance = null;
    _checkables = [];

    /**
     * Constructor
     * @param {*} instance the implementation instance
     * @returns {ICheckable}
     */
    constructor( instance ){
        Msg.debug( 'ICheckable instanciation' );
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
     * Add a checkable to the implementation instance
     * @param {Function} fn the function to be invoked prior status may be checked
     *  The function will be called with the implementation instance as first argument, followed by the args provided here
     *  The function must return a Promise which resolves to a value which must conform to checkable.schema.json
     * @param {Object[]} args the arguments to pass to the function, after:
     *  - the implementation instance
     * [-Public API-]
     */
    add( fn, args=[] ){
        Msg.debug( 'ICheckable.add()', fn, args );
        this._checkables.push({ fn:fn, args:args });
    }

    /**
     * @returns {Promise} which resolves to each checkable be successively requested, then merged into a single object
     * [-Public API-]
     */
    run(){
        Msg.debug( 'ICheckable.run()' );
        let _result = new Checkable();
        let _promise = Promise.resolve( _result );
        this._checkables.every(( o ) => {
            if( o.fn && typeof o.fn === 'function' ){
                _promise = _promise.then(() => { return o.fn( this._instance, ...o.args ); })
                _promise = _promise.then(( res ) => { return _result.merge( res ); });
            }
            return true;
        });
        //_promise = _promise.then(() => { return Promise.resolve( _result ); });
        return _promise;
    }
}
