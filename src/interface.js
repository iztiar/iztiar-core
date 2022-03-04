/*
 * interface.js
 *
 * Usage: addInterface( object, interface, mapFns );
 * 
 * To be called from the implementing constructor.
 */

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
export function addInterface( instance, ifaceClass, mapFns={} ){

    // returns an array of the prototypes chain, last element being null
    function _getPrototypesChain( object, chain ){
        if( !chain ){
            chain = [];
        }
        const proto = Object.getPrototypeOf( object );
        chain.push( proto );
        if( !proto ){
            return chain;
        }
        return _getPrototypesChain( proto, chain );
    }

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
        //console.log( 'iface[k]', iface[k] );
        //console.log( 'Object.getPrototypeOf iface[k]', Object.getPrototypeOf( iface[k] ));
        //console.log( 'mapFns[k]', mapFns[k] );
        /*
        iface[k] = function(){
            return instance[mapFns[k]];
        };
        */
        //Object.setPrototypeOf( iface[k], Object.getPrototypeOf( mapFns[k] ));
        //iface[k] = () => { return mapFns[k]; }
        //iface[k] = eval( () => { return mapFns[k]; });
        
        //console.log( 'iface[k]', iface[k]());
        //console.log( 'mapFns[k]', mapFns[k]());

        ifaceInstance[k] = () => { return mapFns[k](); }

        return true;
    });

    /*
    console.log( iface.constructor.name );
    let ifaceProtos = _getPrototypesChain( iface );
    if( ifaceProtos.length < 3 ){
        throw new Error( 'Expects at least three prototype levels' );
    }
    const last = ifaceProtos.slice( -3, -2 )[0];

    let instanceFirst = Object.getPrototypeOf( instance );
    let instanceSecond = Object.getPrototypeOf( instanceFirst );

    Object.setPrototypeOf( instanceFirst, ifaceProtos[0] );
    Object.setPrototypeOf( last, instanceSecond );

    //console.log( mapFns );
    let handler = {};
    */

    /*
    Object.keys( mapFns ).every(( k ) => {
        console.log( 'building handler', 'k='+k, 'value='+mapFns[k] );
        handler.apply = function( k, thisArg, argsList ){
            console.log( 'handler.apply()', 'k='+k, 'value='+mapFns[k] );
        }
        return true;
    })
    */

    /*
    let proxy = instance;
    console.log( iface );
    console.log( Object.getPrototypeOf( iface ));

    Object.keys( mapFns ).every(( k ) => {
        //console.log( 'building handler', 'k='+k, 'value='+mapFns[k] );
        //console.log( instance.iface[k] );
        let newProxy = new Proxy( Object.getPrototypeOf( iface )[k], {
            apply: function( target, thisArg, argsList ){
                console.log( 'handler.apply()', target, thisArg, argsList );
                Reflect( proxy.target( target, thisArg, argsList ));
            }
        });
        proxy = newProxy;
        return true;
    })
    */

    /*
    if( Object.keys( mapFns ).length ){
        handler.apply = function( target, thisArg, argsList ){
            console.log( 'in handler.apply()' );
            console.log( ...arguments );
            Reflect.apply( ...arguments );
        }
    }
    */

    // make sure the instance is callable
    //console.log( 'instanceof Function', instance instanceof Function );                   // true
    //console.log( 'instanceof coreApplication', instance instanceof coreApplication );     // true
    //console.log( 'instanceof IRunnable', instance instanceof interface );                 // true

    //console.log( 'proxy instanceof Function', proxy instanceof Function );                   // true
    //console.log( 'proxy instanceof coreApplication', proxy instanceof coreApplication );     // true
    //console.log( 'proxy instanceof IRunnable', proxy instanceof interface );                 // true

    /*
    console.log( 'proxy', proxy );
    let proxyProtos = _getPrototypesChain( proxy );
    console.log( 'proxyProtos', proxyProtos );
    if( proxyProtos.length < 3 ){
        throw new Error( 'Expects at least three prototype levels' );
    }
    //const last = ifaceProtos.slice( -3, -2 )[0];
    */

    //instance = proxy;
    return instance;
    //return proxy;
}
