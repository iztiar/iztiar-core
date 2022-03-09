/*
 * cli-start.js
 *
 *  Start the named service.
 * 
 *  Returns a Promise which eventually resolves with the service status.
 */
import { IMsg, coreForkable, utils } from './index.js';

/**
 * Start the named service
 * @param {coreApplication} app the application
 * @param {String} name the service name to be started
 * @param {Object} options 
 *  consoleLevel {String} defaulting to current level
 *  args {String[]} arguments to pass to forked process, defaulting to process.argv
 * @returns {Promise} which resolves to the service status
 */
export function cliStart( app, name, options={} ){

    const _origLevel = app.IMsg.consoleLevel();
    const _consoleLevel = Object.keys( options ).includes( 'consoleLevel' ) ? options.consoleLevel : _origLevel;
    if( _consoleLevel !== _origLevel ) app.IMsg.consoleLevel( _consoleLevel );

    const _args = Object.keys( options ).includes( 'args' ) ? options.args : process.argv;

    const service = app.IPluginManager.byName( app.ICoreApi, name );
    let _promise = Promise.resolve( true );

    if( service ){
        _promise = _promise.then(() => { return service.initialize( app.ICoreApi ); });

        if( !coreForkable.forkedProcess()){

            IMsg.out( 'Starting \''+name+'\' service' );
            let ipcStartupReceived = false;
            let result = {};

            // + (main) MYNAME coreController successfully startup, listening on port 24001
            // + (MYNAME coreController) MYNAME-managed coreBroker successfully startup, listening on port 24002 (message bus on port 24003)
            // + (MYNAME coreController) ANOTHER (MYNAME-managed) coreController successfully startup, listening on port 24001
            // + (MYNAME coreController) ANOTHER-managed coreBroker successfully startup, listening on port 24001 (message bus on port 24003)
            const _ipcToConsole = function( messageData ){
                const _name = Object.keys( messageData )[0];
                const _class = messageData[_name].class || '(undefined class)';

                let _msg = '(';
                if( messageData[_name].event === 'startup' ){
                    _msg += 'main';
                //} else {
                //    _msg += _name+' coreController';
                }
                _msg += ') ';

                if( messageData[_name].event === 'startup' ){
                    _msg += _name+' '+_class;
                //} else if( _forkable === Iztiar.c.forkable.BROKER ){
                //    _msg += messageData[_forkable].manager+'-managed '+_forkable;
                //} else {
                //    _msg += _name+' ('+service.name()+'-managed) '+_forkable;
                }

                _msg += ' successfully startup, listening on port '+messageData[_name].ports.join( ',' );

                //if( _forkable === Iztiar.c.forkable.BROKER ){
                //    _msg += ' (message bus on port ' + messageData[_forkable].messaging.port + ')';
                //}

                IMsg.out( ' + '+_msg );
            };

            const _ipcCallback = function( child, message ){
                IMsg.debug( '_ipcCallback()', message );
                _ipcToConsole( message );
                service.iServiceable().onStartupConfirmed( message );
                ipcStartupReceived = true;
            };
    
            // resolves to the child process or to the startup result
            const _forkOrStart = function(){
                return new Promise(( resolve, reject ) => {
                    if( service.isForkable()){
                        return resolve( coreForkable.fork( service.name(), _ipcCallback, _args ));
                    } else {
                        return resolve( service.start());

                    }
                });
            };

            // wait until having received the IPC message
            const _waitIpc = function(){
                return new Promise(( resolve, reject ) => {
                    resolve( ipcStartupReceived );
                });
            }

            _promise = _promise
                .then(() => { return service.status(); })
                // analyze service status at the beginning
                .then(() => { return _forkOrStart(); })
                .then(() => { return utils.waitFor( result, _waitIpc, null, 5*1000 )})
                .then(() => { return service.status(); })
                // analyze service status at the end
                .then(( res ) => {
                    if( _consoleLevel !== _origLevel ) app.IMsg.consoleLevel( _origLevel );
                    return Promise.resolve( res );
                });

        } else {
            _promise = _promise
                .then(() => { return service.start(); })
                .then(( res ) => {
                    if( _consoleLevel !== _origLevel ) app.IMsg.consoleLevel( _origLevel );
                    return Promise.resolve( res );
                });
        }
    }

    return _promise;
}
