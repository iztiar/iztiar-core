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

            const _ipcCallback = function( child, message ){
                console.log( '_ipcCallback()', message );
                ipcStartupReceived = true;
                //_ipcToConsole( serviceName, messageData );
                //coreForkable.startupOnIPCMessage( child, messageData );
                //console.log( 'about to increment ipcCount to', 1+_ipcCount );
                //_ipcCount += 1;
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

            // wait for the having received the IPC message
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
