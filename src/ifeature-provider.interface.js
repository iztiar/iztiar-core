/*
 * IFeatureProvider interface
 *
 *  The minimal interface to be implemented by any plugin which provides any type of feature to be managed by Iztiar.
 *  See also IServiceFeature and IAddonFeature for more specific other interfaces.
 * 
 *  The IFeatureProvider also acts as a proxy to ICapability, ICheckable interfaces
 *  (that would also take advantage of being implemented by the way).
 */
import { Msg } from './index.js';

export class IFeatureProvider {

    _instance = null;
    _config = null;

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

    /* *** ***************************************************************************************
       *** The implementation API, i.e; the functions the implementation may want to implement ***
       *** *************************************************************************************** */

    /**
     * @returns {String} the name providing the feature, not an identifier, rather a qualifier
     *  For example, the implementation class name is a good choice
     * 
     *  Note:
     *      You should never call yourself this method, but rather ask to featureCard.class(), which
     *      - anyway, requires this method if it is defined
     *      - and defaults to the name configured for this feature in the application configuration file
     *      - is always available (while this one requires the plugin be initialized).
     * 
     *  Rationale:
     *      Depending of the module rules, the class may or may not be specified in the application
     *      configuration file (for now, only 'core' requires that the class be specified).
     *      So we strongly advise that a plugin implement this method to provide some valuable
     *      information to the application, other plugins, the administrator itself...
     * 
     * [-implementation Api-]
     */
    _class(){
        Msg.debug( 'IFeatureProvider._class()' );
        return '';
    }

    /**
     * @returns {Object} the filled configuration for the service
     * [-implementation Api-]
     */
    config(){
        Msg.debug( 'IFeatureProvider.config()' );
        return {};
    }

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
     * @returns {Object} the filled config built at construction time
     */
    config( conf ){
        if( conf && Object.keys( conf ).length ){
            Msg.debug( 'IFeatureProvider.config()', 'name='+this._instance().feature().name(), conf );
            this._config = conf;
        }
        return this._config;
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
