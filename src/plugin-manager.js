/*
 * corePluginManager singleton.
 *
 * From iztiar-core point of view, a plugin is an ESM module which is to be loaded and initialized at iztiar-core startup.
 * corePluginManager below is a thin class whose main goal is to implement the interfaces defined to handle these plugins.
 */
import { Interface } from 'es6-interfaces';

import { IPluginByPath } from './iplugin-bypath.js';
import { IPluginByProperty } from './iplugin-byproperty.js';
import { IPluginLoader } from './iplugin-loader.js';

// our singleton
let _singleton = null;

class _pluginManager {

    // we only manage here plugins to iztiar-core
    // contrarily for example to plugins to the UI, or plugins dedicated to another Iztiar component
    static _target = 'iztiar-core';

    // options passed to the (initial) constructor
    static _options = null;

    /*
     * This constructor may be called several times, but always returns the same singleton object.
     * @param {*} options 
     * @returns the corePluginManager singleton
     */
    constructor( options ){
        //console.log( '_pluginManager instanciation' );
        _pluginManager._options = options;
        return this;
    }
}

export function corePluginManager(){
    if( _singleton ){
        //console.log( 'corePluginManager returning already instanciated' );
        return _singleton;
    }
    //console.log( 'corePluginManager instanciating' );
    _singleton = new Interface( new _pluginManager(), [ IPluginByPath, IPluginByProperty, IPluginLoader ]);
    return _singleton;
}
