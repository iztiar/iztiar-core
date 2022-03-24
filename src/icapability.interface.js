/*
 * ICapability interface
 *
 *  Manage the capabilities of the implementation class
 * 
 *  As of v 0.x, we do not have real semantic for what is a 'capability'.
 *  We accept here any named capabiity, associated with a function whih is expected to provided some valuable information
 *  (be also seen as rather useless by the way...)
 */
import { Interface, IStatus, Msg } from './index.js';

export class ICapability {

    _instance = null;
    _capabilities = {};

    /**
     * Constructor
     * @param {*} instance the implementation instance
     * @returns {ICapability}
     */
    constructor( instance ){
        Msg.debug( 'ICapability instanciation' );
        this._instance = instance;

        // let the capabilities be published as a part of the status
        IStatus.add( this._instance, this._statusPart );

        return this;
    }

    // publish the capabilities as part of the status
    _statusPart( instance ){
        Msg.debug( 'ICapability.statusPart()' );
        const self = instance.ICapability;
        const o = {
            ICapability: [ ... self.get().sort() ]
        };
        return Promise.resolve( o );
    }

    /* *** ***************************************************************************************
       *** The implementation API, i.e; the functions the implementation may want to implement ***
       *** *************************************************************************************** */

    /* *** ***************************************************************************************
       *** The public API, i.e; the API anyone may call to access the interface service        ***
       *** *************************************************************************************** */

    /**
     * Add a capability to a feature instance
     * Takes care of implementing this interface if not already done
     * @param {Object} instance the implementation instance
     * @param {String} cap the capability to add
     * @param {Function} fn the function to be invoked when someone asks for this capability
     *  It is expected that the function returns a Promise which resolves to the actual value
     * @param {Object[]} args the arguments to pass to the function, after:
     *  - the implementation instance
     *  - the capability name
     * [-Public API-]
     */
    static add(){
        Msg.debug( 'ICapability.add()' );
        if( arguments.length < 3 ){
            Msg.error( 'ICapability.add() expects at least ( instance, capability, function ) arguments' );
        } else {
            let _args = [ ...arguments ];
            const instance = _args.splice( 0, 1 )[0];
            if( instance ){
                if( !instance.ICapability ){
                    Interface.add( instance, ICapability );
                }
                instance.ICapability.add( ..._args );
            } else {
                Msg.error( 'ICapability.add() lacks at least an instance' );
            }
        }
    }

    /**
     * Add a capability to the server
     * @param {String} cap the capability to add
     * @param {Function} fn the function to be invoked when someone asks for this capability
     *  It is expected that the function returns a Promise which resolves to the actual value
     * @param {Object[]} args the arguments to pass to the function, after:
     *  - the implementation instance
     *  - the capability name
     * [-Public API-]
     */
    add( cap ){
        Msg.debug( 'ICapability.add()', 'cap='+cap );
        if( Object.keys( this._capabilities ).includes( cap )){
            Msg.error( 'ICapability.add() already defined capability \''+cap+'\'' );
        } else if( arguments.length < 2 ){
            Msg.error( 'ICapability.add() expects at least ( capability, function ) arguments' );
        } else {
            let _args = [ ...arguments ];
            _args.splice( 0, 1 );
            const fn = _args.splice( 0, 1 )[0];
            if( fn && typeof fn === 'function' ){
                this._capabilities[cap] = {
                    fn: fn,
                    args: [ ..._args ]
                }
            } else {
                Msg.error( 'ICapability.add() capability=\''+cap+'\' lacks a function' );
            }
        }
    }

    /**
     * @param {String|null} cap the capability to get
     * @returns {Object|Object[]} the defined capability (resp. the defined capabilities if cap is not set)
     * [-Public API-]
     */
    get( cap=null ){
        Msg.debug( 'ICapability.get()', 'cap='+cap );
        if( cap ){
            if( Object.keys( this._capabilities ).includes( cap )){
                return this._capabilities[cap];
            } else {
                Msg.error( 'ICapability.get() unknown capability \''+cap+'\'' );
            }
        } else {
            return Object.keys( this._capabilities );
        }
    }

    /**
     * @param {String} cap the capability to be invoked
     * @returns {*} the return value of the defined function (anything as far as we know)
     * [-Public API-]
     */
    invoke( cap ){
        let _msg = null;
        if( Object.keys( this._capabilities ).includes( cap )){
            let _args = [ this._instance, cap, ...this._capabilities[cap].args ];
            if( this._capabilities[cap].fn && typeof this._capabilities[cap].fn === 'function' ){
                return this._capabilities[cap].fn( ..._args );
            } else {
                _msg = 'Warning: capability \''+cap+'\' doesn\' exhibit a function';
                Msg.warn( _msg );
            }
        } else {
            _msg = 'Error: unknown capability \''+cap+'\'';
            Msg.error( _msg );
        }
        return _msg || 'Unknwon error';
    }
}
