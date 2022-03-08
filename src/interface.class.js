/*
 * interface.class.js
 *
 * Let define an interface implementation
 * Usage: Interface.add( object, interface, mapFns );
 * 
 * To be called from the implementing constructor.
 */

export class Interface {
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
        const ifaceInstance = new ifaceClass();
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

        return instance;
    }
}
