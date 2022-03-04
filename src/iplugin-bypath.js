/*
 * IPluginByPath interface
 *  Defines where to search for (paths to include), or where to not search for (paths to exclude)
 *  To be implemented by a plugin manager.
 *  'path' here is the full pathname to the module directory; we expect to find a <path>/package.json file.
 */
export class IPluginByPath {

    static _paths = [];
    static _includes = [];
    static _excludes = [];

    static excludePath( path ){

    }
    static includePath( path ){

    }
}
