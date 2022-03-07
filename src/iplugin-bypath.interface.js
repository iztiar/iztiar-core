/*
 * IPluginByPath interface
 */
import path from 'path';

import { coreApplication, PackageJson, utils } from './imports.js';

export class IPluginByPath {

    /* *** ***************************************************************************************
       *** The implementation API, i.e; the functions the implementation may want to implement ***
       *** *************************************************************************************** */

    /* *** ***************************************************************************************
       *** The public API, i.e; the API anyone may call to access the interface service        ***
       *** *************************************************************************************** */

    /**
     * @param {coreApplication} app
     * @returns {PackageJson[]} the array of installed modules of our Iztiar family, not including this one
     */
    installed( app ){
        const parentDir = path.dirname( app.getPackage().getDir());
        //const pckName = app.getPackage().getName();
        //  new RegExp( '^(?!'+pckName+'$)' )
        const regex = [
            new RegExp( '^[^\.]' ),
            new RegExp( '^'+coreApplication.const.commonName+'-' )
        ];
        let result = [];
        utils.dirScanSync( parentDir, { type:'d', regex:regex }).every(( p ) => {
            result.push( new PackageJson( p ));
            return true;
        });
        return result;
    }
}
