import { ILogger } from './ilogger.js';
import { corePlugin } from './plugin.js';
import { corePluginManager } from './plugin-manager.js';

// instanciates the PluginManager singleton
new corePluginManager();
/*
    'ILogger':       ILogger,
    'plugin':        corePlugin,
    'pluginManager': corePluginManager
*/

export {
    ILogger,
    corePlugin,
    corePluginManager
}
