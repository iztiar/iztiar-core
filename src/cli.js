#!/usr/bin/env node
/*
 * Main command-line interface
 * Is expected to be automatically run at host boot.
 * 
 * Environment:
 *  - NODE_ENV
 *  - DEBUG
 *  - IZTIAR_ENV
 *  - IZTIAR_LOGLEVEL
 */
import { cliApplication, coreConfig } from './index.js';

const app = new cliApplication();
//console.log( app );

app.IRunnable.displayCopyright();
app.ICmdline.parseArgs();
app.core().config( new coreConfig( app.ICmdline.getOptions()));
app.IRunnable.run( app );
