/*
 * interface.class.js
 *
 * Let define an interface implementation
 * Usage: Interface.add( object, interface, mapFns );
 * 
 * To be called from the implementing constructor.
 */
import { Msg } from './index.js';

export class Interface {

    static _published = false;

    static _statusPart( instance ){
        Msg.debug( 'Interface.statusPart()', 'instance '+( instance ? 'set':'unset' ));
        const o = {
            Interfaces: instance.Interfaces
        };
        //Msg.debug( 'Interface.statusPart()', o );
        return Promise.resolve( o );
    }

    /**
     * @param {Object} instance the instance of the class which wants implement the interface
     * @param {Class} ifaceClass the class which defines the interface
     *  interface is expected to be a class definition: we so expect to have (at least)
     *  [[class_prototype]] -> [[Object_prototype]] -> [[null]]
     *  so three inheritance levels at least, last being null
     * @param {Object} mapFns an object whose keys map the interface functions to the implementation ones
     * @returns {Object} the instance updated with interface prototype
     * @throws Error
     */
    static add( instance, ifaceClass, mapFns={} ){

        // attach a new instance of the interface to the object
        //console.log( new iface());
        const ifaceInstance = new ifaceClass( instance );
        const name = ifaceInstance.constructor.name;
        instance[name] = ifaceInstance;

        // now we want that calls to the interface functions listed in mapFns are actually redirected
        //  by the implementation functions addressed in this same mapFns
        //  for the sake of this interface instance, the original function - which are overriden by
        //  the implementation - are safe to disappear
        Object.keys( mapFns ).every(( k ) => {
            if( ifaceInstance.constructor[k] ){
                //console.log( k,'is a static function' );
                ifaceInstance.constructor[k] = function(){
                    return mapFns[k].apply( instance, arguments );
                }
            } else {
                //console.log( k,'is an instance method' );
                ifaceInstance[k] = function(){
                    //console.log( name, k );
                    //console.log( ...arguments );
                    return mapFns[k].apply( instance, arguments );
                }
            }
            return true;
        });

        // register the new interface against the instance
        if( !instance.Interfaces ){
            instance.Interfaces = [];
        }
        instance.Interfaces.push( name );

        // let the interfaces be published with the class status (only once)
        if( !Interface._published ){
            if( instance.IFeatureProvider && instance.IFeatureProvider.api && typeof instance.IFeatureProvider.api === 'function' ){
                const api = instance.IFeatureProvider.api();
                if( api && api.exports && typeof api.exports === 'function' ){
                    Interface._published = true;
                    const IStatus = instance.IFeatureProvider.api().exports().IStatus;
                    if( !instance.IStatus ){
                        Interface.add( instance, IStatus );
                    }
                    instance.IStatus.add( Interface._statusPart );
                }
            }
        }

        return instance;
    }
    /**
     *** Object.appendChain(@object, @prototype)
     *
     * Appends the first non-native prototype of a chain to a new prototype.
     * Returns @object (if it was a primitive value it will transformed into an object).
     *
     *** Object.appendChain(@object [, "@arg_name_1", "@arg_name_2", "@arg_name_3", "..."], "@function_body")
     *** Object.appendChain(@object [, "@arg_name_1, @arg_name_2, @arg_name_3, ..."], "@function_body")
     *
     * Appends the first non-native prototype of a chain to the native Function.prototype object, then appends a
     * new Function(["@arg"(s)], "@function_body") to that chain.
     * Returns the function.
     *
     *  From https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/setPrototypeOf
     */
    /*
    static extends(){
        Object.appendChain = function( oChain, oProto ){
            if( arguments.length < 2 ){
                throw new TypeError( 'Object.appendChain - Not enough arguments' );
            }
            if( typeof oProto !== 'object' && typeof oProto !== 'string' ){
                throw new TypeError('second argument to Object.appendChain must be an object or a string');
            }

            var oNewProto = oProto,
                oReturn = o2nd = oLast = oChain instanceof this ? oChain : new oChain.constructor( oChain );
        
            for( let o1st = this.getPrototypeOf( o2nd );
                o1st !== Object.prototype && o1st !== Function.prototype;
                o1st = this.getPrototypeOf( o2nd )){
                    o2nd = o1st;
            }
        
            if( oProto.constructor === String ){
                oNewProto = Function.prototype;
                oReturn = Function.apply( null, Array.prototype.slice.call( arguments, 1 ));
                this.setPrototypeOf(oReturn, oLast);
            }
        
            this.setPrototypeOf( o2nd, oNewProto );
            return oReturn;
        }
    }
    */

    /**
     * extends the instance to get the new defClass base class
     * @param {Object} instance the instance of the class which wants implement the interface
     * @param {Class} defClass the class definition
     * @param {*} args arguments to be passed to the constructor
     * @returns {Object} the instance updated with new class prototype
     * @throws Error
     */
     static extends( instance, defClass ){
        const args = [ ...arguments ].slice( 2 );
        //console.log( 'Interface.extends', args );
        //console.log( 'Interface.extends', arguments );

        /*
        const _base = new defClass( args );
        const _childProto = Object.getPrototypeOf( instance );
        //const _objectProto = Object.getPrototypeOf( _childProto );
        Object.setPrototypeOf( _childProto, Object.getPrototypeOf( _base ));
        */

        // set prototype
        const _base = new defClass( ...args );
        const _childProto = Object.getPrototypeOf( instance );
        Object.setPrototypeOf( _childProto, Object.getPrototypeOf( _base ));

        // set own properties
        Reflect.ownKeys( _base ).every(( p ) => {
            Object.defineProperty( instance, p, Object.getOwnPropertyDescriptor( _base, p ));
            return true;
        });

        return instance;
    }

    /**
     * tries to fill the configuration of the interface
     * This function tests and calls for a 'fillConfig()' method in the interface
     * The 'fillConfig()' method is expected to get the full feature configuration as input
     * and return a Promise which whill resolve to the filled configuration for the interface.
     * @param {Object} instance the instance of the implementation class
     * @param {String} iface the interface name
     * @returns {Promise} which resolves to the new instance filled configuration for the interface part
     */
    static fillConfig( instance, iface ){
        let _promise = Promise.resolve( null );
        if( instance.IFeatureProvider && instance.IFeatureProvider.feature && typeof instance.IFeatureProvider.feature === 'function' ){
            const featCard = instance.IFeatureProvider.feature();
            let _conf = featCard.config();
            _promise = Promise.resolve( _conf )
            if( Object.keys( _conf ).includes( iface )){
                if( instance[iface].fillConfig && typeof instance[iface].fillConfig === 'function' ){
                    _promise = _promise
                        .then(() => { return instance[iface].fillConfig( _conf ) })
                        .then(( res ) => {
                            _conf[iface] = { ...res };
                            instance.IFeatureProvider.feature().config( _conf );
                            return Promise.resolve( _conf );
                        });
                }
            }
        }
        return _promise;
    }
}
