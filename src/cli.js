#!/usr/bin/env node
/*
 * Main command-line interface
 * Is expected to be automatically started at host boot.
 *
 * Command-line options:
 *  See coreCmdline class definition.
 * 
 * Environment:
 *  - NODE_ENV
 *  - DEBUG
 *  - IZTIAR_CONFIG
 *  - IZTIAR_ENV
 *  - IZTIAR_LOGLEVEL
 */
import { coreApplication } from './application.js';

const app = new coreApplication( 'iztiar' );
console.log( app );

app.IRunnable.run();
