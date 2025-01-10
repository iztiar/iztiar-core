#!/usr/bin/env node
/*
 * Main command-line interface
 * Is expected to be automatically run at host boot.
 * 
 * Environment:
 *  - APP_ENV, defaulting to NODE_ENV, defaulting to 'development'
 *  - APP_LOGLEVEL, defaulting to NOTICE
 */
import { cliApplication, coreConfig } from './index.js';

const app = new cliApplication();
//console.log( app );

exit;

app.IRunnable.displayCopyright();
app.ICmdline.parseArgs();
app.core().cmdLine( app.ICmdline.getOptions());
app.core().config( new coreConfig( app.core()));
app.IRunnable.run( app );
