/*
 * iztiar.js
 */

export class Iztiar {

    /**
     * Application-wide constants
     */
    static c = {
        app: {
            name: 'iztiar',
            default: 'default',
            none: 'none',
            displayName: 'Iztiar',
            logLevel: 'info',
            copyrightColor: 'yellowBright'
        },
        forkable: {
            uuid: 'iztiar-bc05bf55-4313-49d7-ab9d-106c93c335eb'
        },
        verbose: {
            QUIET: 0,
            ERROR: 1,
            WARN: 2,
            NORMAL: 3,
            INFO: 4,
            VERBOSE: 5,
            DEBUG: 6
        }
    };

    /**
     * @returns {string|null} the forkable which identifies the current running process environment
     */
    static envForked(){
        return process.env[Iztiar.c.forkable.uuid];
    }
}
