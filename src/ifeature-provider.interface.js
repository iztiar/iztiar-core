/*
 * IFeatureProvider interface
 *
 *  The minimal interface to be implemented by any plugin which provides any type of feature to be managed by Iztiar.
 *  See also IServiceFeature and IAddonFeature for more specific other interfaces.
 * 
 *  The IFeatureProvider also acts as a proxy to ICapability, ICheckable interfaces
 *  (that would also take advantage of being implemented by the way).
 */
import { Interface, featureCard, engineApi, Msg } from './index.js';

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
            core: { ...self.api().config().core() }
        };
        delete o.core.rootCACert;
        return Promise.resolve( o );
    }

    /* *** ***************************************************************************************
       *** The implementation API, i.e; the functions the implementation may want to implement ***
       *** *************************************************************************************** */

    /**
     * Called on each and every loaded add-on when the main hosting feature has terminated with its initialization
     * Time, for example, to increment all interfaces we are now sure they are actually implemented
     */
    v_featureInitialized(){
        Msg.debug( 'IFeatureProvider.v_featureInitialized()' );
        return;
    }

    /**
     * @returns {Boolean} true if the process must be forked
     * [-implementation Api-]
     */
    v_forkable(){
        Msg.debug( 'IFeatureProvider.v_forkable()' );
        return false;
    }

    /**
     * If the service had to be SIGKILL'ed to be stoppped, then gives it an opportunity to make some cleanup
     * [-implementation Api-]
     */
    v_killed(){
        Msg.debug( 'IFeatureProvider.v_killed()' );
    }

    /**
     * Start the service (and just that)
     * @param {String} name the name of the feature
     * @param {Callback|null} cb the funtion to be called on IPC messages reception (only relevant if a process is forked)
     * @param {String[]} args arguments list (only relevant if a process is forked)
     * @returns {Promise}
     * Notes:
     *  - If the service must start in its own process, then the calling application must have taken care of forking the ad-hoc
     *    process before calling this method.
     *  - This method is not expected to check that the service is not running before to start, and not expected either to check
     *    that the service is rightly running after that.
     * @returns {Promise}
     * [-implementation Api-]
     */
    v_start(){
        Msg.verbose( 'IFeatureProvider.v_start()' );
        return Promise.resolve( false );
    }

    /**
     * Get the status of a service
     * @returns {Promise} which must resolve to an object conform to run-status.schema.json
     * [-implementation Api-]
     */
    v_status(){
        Msg.debug( 'IFeatureProvider.v_status()' );
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
    v_stop(){
        Msg.debug( 'IFeatureProvider.v_stop()' );
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
     * Called on each feature when the main hosting feature has terminated with its initialization
     * Time, for example, to increment all interfaces we are now sure they are actually implemented
     */
    featInitialized(){
        Msg.debug( 'IFeatureProvider.featInitialized()' );
        this.v_featureInitialized();
        Interface
        return;
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
     * @param {Object} conf the feature configuration
     * @returns {Promise} which resolves to the full configuration of the feature (filled from IFeatureProvider point of view)
     *  - module is expected to already having been checked at featureCard instanciation
     *  - class can only be setup by the feature class implementation itself
     *  - enabled: set default here
     * Note:
     *  This fillConfig() method is specific to IFeatureProvider interface.
     *  The generally-used Interface.fillConfig() static method provides other arguments, expects other return value.
     *  See IMqttClient or ITcpServer interfaces for examples.
     * [-Public API-]
     */
    fillConfig( conf ){
        let _promise = Promise.resolve( conf );
        if( !Object.keys( conf ).includes( 'enabled' )){
            conf.enabled = true;
        }
        // each add-on has its own configuration, even if all use the same module
        //  so each add-on also has its own featureCard (-> no need to cache)
        if( Object.keys( conf ).includes( 'add-ons' )){
            Object.keys( conf['add-ons'] ).every(( name ) => {
                _promise = _promise
                    .then(() => {
                        return this.api().pluginManager().getAddonConfig( this._instance, name, conf['add-ons'][name] )
                    })
                    .then(( _confAddon ) => {
                        if( _confAddon ){
                            conf['add-ons'][name] = { ... _confAddon };
                            return conf;
                        } else {
                            Msg.error( 'IFeatureProvider.fillConfig()', name+' add-on config not found' );
                            return null;
                        }
                    })
                    .then(() => { return Promise.resolve( conf ); });
                return true;
            });
        }
        return _promise;
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

    /**
     * @param {String} name the searched feature
     * @param {String|null} key the searched configuration group
     * @returns {Object|null} the filled configuration group or null
     * [-Public API-]
     */
    getConfig( name, key ){
        Msg.debug( 'IFeatureProvider.getConfig()' );
        if( this.feature().name() === name ){
            const _conf = this.feature().config();
            return _conf[key] || {};
        }
        return null;
    }
}
