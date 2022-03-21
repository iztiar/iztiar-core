/*
 * IFeatureProvider interface
 *
 *  The minimal interface to be implemented by any plugin which provides any type of feature to be managed by Iztiar.
 *  See also IServiceFeature and IAddonFeature for more specific other interfaces.
 * 
 *  The IFeatureProvider also acts as a proxy to ICapability, ICheckable interfaces
 *  (that would also take advantage of being implemented by the way).
 */
import { featureCard, engineApi, Msg } from './index.js';

export class IFeatureProvider {

    // instanciation time
    _instance = null;

    // the engineApi passed in when the implementation is instanciated
    _api = null;

    // the featureCard passed in when the implementation is instanciated
    _feature = null;

    /**
     * Constructor
     * @param {*} instance the implementation instance
     * @returns {IFeatureProvider}
     */
    constructor( instance ){
        Msg.debug( 'IFeatureProvider instanciation' );
        this._instance = instance;
        return this;
    }

    _statusInstall( api ){
        const IStatus = api.exports().IStatus;
        if( !this._instance.IStatus ){
            api.exports().Interface.add( this._instance, IStatus );
        }
        this._instance.IStatus.add( this._statusPart );
    }

    // publish some core information as part of the status
    _statusPart( instance ){
        Msg.debug( 'IFeatureProvider.statusPart()', 'instance '+( instance ? 'set':'unset' ));
        const self = instance ? instance.IFeatureProvider : this;
        const exports = self.api().exports();
        const o = {
            // running environment
            env: {
                IZTIAR_DEBUG: process.env.IZTIAR_DEBUG || '(undefined)',
                NODE_ENV: process.env.NODE_ENV || '(undefined)'
            },
            // general runtime constants
            logfile: exports.Logger.logFname(),
            version: self.api().packet().getVersion(),
            core: self.api().config().core()
        };
        return Promise.resolve( o );
    }

    /* *** ***************************************************************************************
       *** The implementation API, i.e; the functions the implementation may want to implement ***
       *** *************************************************************************************** */

    /**
     * If the service had to be SIGKILL'ed to be stoppped, then gives it an opportunity to make some cleanup
     * [-implementation Api-]
     */
    killed(){
        Msg.debug( 'IFeatureProvider.killed()' );
    }

    /**
     * @returns {Boolean} true if the process must be forked (and the main application will take care of that)
     * [-implementation Api-]
     */
    isForkable(){
        Msg.debug( 'IFeatureProvider.isForkable()' );
        return true;
    }

    /**
     * Start the service (and just that)
     * Notes:
     *  - If the service must start in its own process, then the calling application must have taken care of forking the ad-hoc
     *    process before calling this method.
     *  - This method is not expected to check that the service is not running before to start, and not expected either to check
     *    that the service is rightly running after that.
     * @returns {Promise}
     * [-implementation Api-]
     */
    start(){
        Msg.verbose( 'IFeatureProvider.start()' );
        return Promise.resolve( false );
    }

    /**
     * Get the status of a service
     * Even if there is not any dameon, this default should be overriden
     * @returns {Promise} which must resolve to an object conform to run-status.schema.json
     * [-implementation Api-]
     */
    status(){
        Msg.debug( 'IFeatureProvider.status()' );
        return Promise.resolve({
            name: {
                module: 'unset',
                class: 'unset',
                pids: [],
                ports: [],
                status: null
            }
        });
    }

    /**
     * Stop the service
     * @returns {Promise}
     * [-implementation Api-]
     */
    stop(){
        Msg.debug( 'IFeatureProvider.stop()' );
        return Promise.resolve( true );
    }

    /* *** ***************************************************************************************
       *** The public API, i.e; the API anyone may call to access the interface services       ***
       *** *************************************************************************************** */

    /**
     * Getter/Setter
     * @param {engineApi} api the engine API as described in engine-api.schema.json
     * @returns {engineApi}
     * [-Public API-]
     */
    api( o ){
        if( o && o instanceof engineApi ){
            this._api = o;
            this._statusInstall( o );
        }
        return this._api;
    }

    /**
     * Getter/Setter
     * @param {featureCard} card the instance which describes this feature in the application configuration
     * @returns {featureCard}
     * [-Public API-]
     */
    feature( o ){
        if( o && o instanceof featureCard ){
            this._feature = o;
            o.class( this._instance.constructor.name );
        }
        return this._feature;
    }

    /**
     * @param {String} cap the desired capability name
     * @returns {Object|null} the capability characteristics 
     * [-Public API-]
     */
    getCapability( cap ){
        Msg.debug( 'IFeatureProvider.getCapability() cap='+cap );
        if( this._instance && this._instance.ICapability ){
            return this._instance.ICapability.invoke( cap );
        }
        return null;
    }

    /**
     * @returns {Promise|null} which resolves to the merged Checkable object resulting of all checkable set 
     * [-Public API-]
     */
    getCheckable(){
        Msg.debug( 'IFeatureProvider.getCheckable()' );
        if( this._instance && this._instance.ICheckable ){
            return this._instance.ICheckable.run();
        }
        return null;
    }
}