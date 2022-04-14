/*
 * FeatureProvider class
 *
 *  The base class each plugin must derive from.
 */
import { featureCard, engineApi, Msg } from './index.js';

export class featureProvider {

    // construction
    _api = null;                    // the engine API
    _featCard = null;               // the featureCard

    /**
     * Constructor
     * @param {engineApi} api the engine API as described in engine-api.schema.json
     * @param {featureCard} card a description of this feature
     * @returns {featureProvider}
     */
    constructor( api, card ){
        Msg.debug( 'featureProvider instanciation' );
        this._api = api;
        this._featCard = card;
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
        Msg.debug( 'featureProvider.statusPart()', 'instance '+( instance ? 'set':'unset' ));
        const self = instance ? instance.featureProvider : this;
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

    /**
     * @returns {engineApi}
     */
    api(){
        return this._api;
    }

    /**
     * @returns {featureCard}
     */
    feature(){
        return this._featCard;
    }

    /**
     * @returns {Promise} which resolves to the full configuration of the feature (filled from featureProvider point of view)
     *  - module is expected to already having been checked at featureCard instanciation
     *  - class can only be setup by the derived feature class itself
     *  - enabled: set default here
     * Note:
     *  This fillConfig() method is specific to featureProvider base class.
     *  The generally-used Interface.fillConfig() static method provides other arguments, expects other return value.
     *  See IMqttClient or ITcpServer interfaces for examples.
     */
    fillConfig(){
        Msg.debug( 'featureProvider.fillConfig()' );
        // standard feature configuration
        let _conf = this.feature().config();
        let _promise = Promise.resolve( _conf );
        if( !Object.keys( _conf ).includes( 'enabled' )){
            _conf.enabled = true;
        }
        // each add-on has its own configuration, even if all use the same module
        //  so each add-on also has to have its own featureCard (-> no need to cache)
        if( Object.keys( _conf ).includes( 'add-ons' )){
            const self = this;
            Object.keys( _conf['add-ons'] ).every(( name ) => {
                _promise = _promise
                    .then(() => {
                        return self.api().pluginManager().getAddonConfig( self, name, _conf['add-ons'][name] )
                    })
                    .then(( _confAddon ) => {
                        if( _confAddon ){
                            _conf['add-ons'][name] = { ... _confAddon };
                            return _conf;
                        } else {
                            Msg.error( 'featureProvider.fillConfig()', name+' add-on config not found' );
                            return null;
                        }
                    })
                    .then(() => { return Promise.resolve( _conf ); });
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
        Msg.debug( 'featureProvider.getCapability() cap='+cap );
        if( this.ICapability ){
            return this.ICapability.invoke( cap );
        }
        return null;
    }

    /**
     * @returns {Promise|null} which resolves to the merged Checkable object resulting of all checkable set 
     * [-Public API-]
     */
    getCheckable(){
        Msg.debug( 'featureProvider.getCheckable()' );
        if( this.ICheckable ){
            return this.ICheckable.run();
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
        Msg.debug( 'featureProvider.getConfig()' );
        if( this.feature().name() === name ){
            const _conf = this.feature().config();
            return _conf[key] || {};
        }
        return null;
    }

    /**
     * Called on each add-on/service feature when the (main hosting) feature has terminated with its initialization
     * Time, for example, to increment all interfaces we are now sure they are actually implemented
     */
    initPost(){
        Msg.debug( this.feature().name()+' featureProvider.initPost()' );
        return;
    }

    /**
     * A placeholder to be able to call featureProvider.startPre()
     */
    startPre(){
        Msg.debug( this.feature().name()+' featureProvider.startPre()' );
    }

    /**
     * A placeholder to be able to call featureProvider.start() in case the derived class doesn't implement IForkable
     */
    start(){
        Msg.debug( this.feature().name()+' featureProvider.start()' );
        return Promise.resolve( false );
    }

    /**
     * A placeholder to be able to call featureProvider.startPost()
     */
    startPost(){
        Msg.debug( this.feature().name()+' featureProvider.startPost()' );
    }

    /**
     * A placeholder to be able to call featureProvider.stop() in case the derived class doesn't implement IForkable
     */
    stop(){
        Msg.debug( this.feature().name()+' featureProvider.stop()' );
        return Promise.resolve( false );
    }

    /**
     * A placeholder to be able to call featureProvider.stopPost()
     */
    stopPost(){
        Msg.debug( this.feature().name()+' featureProvider.stopPost()' );
    }

    /**
     * A placeholder to be able to call featureProvider.terminate()
     */
    terminate(){
        Msg.debug( this.feature().name()+' featureProvider.terminate()' );
        return Promise.resolve( false );
    }
}
