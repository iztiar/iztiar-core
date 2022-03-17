/*
 * checkable class
 *
 * Returns an object conform to checkable.schema.json
 */

export class checkable {
    startable = true;
    reasons = [];
    pids = [];
    ports = [];

    /**
     * Merge another checkable with this object
     * @param {checkable} o
     * @returns {checkable}
     * @throws {Error} if o is not a checkable
     */
    merge( o ){
        if( o && o instanceof checkable ){
            this.startable &= o.startable;
            this.reasons = [ ...this.reasons, ...o.reasons ];
            this.pids = [ ...this.pids, ...o.pids ];
            this.ports = [ ...this.ports, ...o.ports ];
            return this;
        }
        console.log( o );
        throw new Error( 'checkable.merge() not a checkable instance' );
    }
}
