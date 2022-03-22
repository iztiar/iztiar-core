/*
 * ICapability interface
 *
 *  Manage the capabilities of the implementation class
 */
import { Msg } from './index.js';

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
        if( instance.IFeatureProvider && instance.IFeatureProvider.api && typeof instance.IFeatureProvider.api === 'function' ){
            const api = instance.IFeatureProvider.api();
            if( api && api.exports && typeof api.exports === 'function' ){
                const IStatus = api.exports().IStatus;
                if( !instance.IStatus ){
                    api.exports().Interface.add( instance, IStatus );
                }
                instance.IStatus.add( this._statusPart );
            }
        }

        return this;
    }

    // publish the capabilities as part of the status
    _statusPart( instance ){
        Msg.debug( 'ICapability.statusPart()', 'instance '+( instance ? 'set':'unset' ));
        const self = instance ? instance.ICapability : this;
        const o = {
            ICapability: [ ... self.get() ]
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
     * Add a capability to the server
     * @param {String} cap the capability to add
     * @param {Function} fn the function to be invoked when someone asks for this capability
     *  It is expected that the function returns a Promise which resolves to the actual value
     * @param {Object[]} args the arguments to pass to the function, after:
     *  - the implementation instance
     *  - the capability name
     * [-Public API-]
     */
    add( cap, fn, args=[] ){
        Msg.debug( 'ICapability.add()', 'cap='+cap, fn, args );
        if( Object.keys( this._capabilities ).includes( cap )){
            Msg.error( 'ICapability.add() already defined capability \''+cap+'\'' );
        } else {
            this._capabilities[cap] = {
                fn: fn,
                args: args
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
