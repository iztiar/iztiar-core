/*
 * IForkable interface
 */
export class IForkable {

    /* *** ***************************************************************************************
       *** The implementation API, i.e; the functions the implementation may want to implement ***
       *** *************************************************************************************** */

    /**
     * @returns {String} the name of the environment variable which, if set, holds the qualifier of the forked process
     * [-implementation Api-]
     */
    static _forkedVar(){
        return '';
    }

    /* *** ***************************************************************************************
       *** The public API, i.e; the API anyone may call to access the interface service        ***
       *** *************************************************************************************** */

    /**
     * @returns {String|null} the qualifier of the forked process
     * [-public API-]
     */
    static processQualifier(){
        //console.log( 'IForkable._forkedVar', IForkable._forkedVar());
        const _var = IForkable._forkedVar();
        return _var ? process.env[_var] : null;
    }
}
