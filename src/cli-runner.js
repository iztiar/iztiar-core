/*
 * Main command-line interface
 * Is responsible of command-line options management and plugins load and initialization
 */
import chalk from 'chalk';

import { Iztiar } from './iztiar.js';
import { coreCmdline } from './cmdline.js';

if( !Iztiar.envForked()){
    console.log( chalk[Iztiar.c.app.copyrightColor].bold( coreCmdline.copyright()));
}

let appConfig = null;
let serviceName = null;
let verbose = 0;
process.exitCode = 0;

// Due to well-known chicken-and-egg problem, we have to first parse the command-line options.
//  This will define our <storageDir>, which also define the <logDir> and the <configDir>.
//  So we will be able to load application configuration, and then initialize our Logger...

// parse command-line arguments
//  get the filled application configuration
//   which let us initialize our logger

try {
    coreCmdline.parse()
    appConfig = coreConfig.getAppFilledConfig();
    msg.init( Iztiar.c.app.name, appConfig );
    coreCmdline.startupLog();
} catch( e ){
    msg.error( 'cli-runner', e.name, e.message );
    process.exitCode += 1;
}

serviceName = coreCmdline.options().name;
verbose = appConfig.consoleLevel;
//console.log( 'verbose='+verbose );
//console.log( 'serviceName', serviceName );
//console.log( 'coreCmdline.options()', coreCmdline.options());

// check the environment
// check running Node.js against the required version from package.json
if( !Iztiar.envForked()){
    try{
        corePackage.isRunningNodeAcceptable( verbose );
    } catch( e ){
        process.exitCode += 1;
    }
}

// the action must return a Promise, so that we will wait for its resolution (or rejection)
//  the exit code of the process if searched for in process.Iztiarcode (to be attached by the action)
let promise = null;

switch( coreCmdline.getAction()){
    case 'install':
        break;
    case 'uninstall':
        break;
    case 'start':
        promise = cliStart( serviceName );
        break;
    case 'stop':
        promise = cliStop( serviceName );
        break;
    case 'status':
        promise = cliStatus();
        break;
    case 'restart':
        promise = cliRestart( serviceName );
        break;
    case 'list-runnings':
        promise = cliListRunnings();
        break;
    case 'list-tree':
        promise = cliListTree();
        break;
    default:
        break;
}

// We are waiting here for the Promise returned by the action be settled, either resolved or rejected.
// We are prepared to managed both success and failure, but do not modify in either cases the exit code of the process.
// It is up to the action to compute whether its own code is successful or not.
if( promise && promise instanceof Promise ){
    //console.log( 'cli-runner promise', promise );
    //console.log( 'waiting for promise.then' );
    promise.then(( successValue ) => {
        msg.debug( 'cliRunner().success with', successValue );
        msg.verbose( 'Exiting with code', process.exitCode );
        // https://nodejs.org/api/process.html#processexitcode prevents against a direct process.exit() call
        process.exit();

    }, ( failureReason ) => {
        msg.error( 'cliRunner().failure', failureReason );
        msg.verbose( 'Exiting with code', process.exitCode );
        process.exit();
    });
}
