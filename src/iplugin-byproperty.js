/*
 * IPluginByProperty interface
 *  Defines which property (resp. properties) a plugin must satisfy to be candidate to load and initialization.
 *  To be implemented by a plugin manager.
 *  Properties are read from the package.json file of the candidate plugin.
 *  Properties are specified as:
 *      key=value
 *  or:
 *      key/key = value
 */
export class IPluginByProperty {

    static _paths = [];
    static _includes = [];
    static _excludes = [];

    static excludeProperty( name, value ){

    }
    static includeProperty( name, value ){

    }
}
