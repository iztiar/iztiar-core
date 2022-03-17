/*
 * Checkable class
 *
 * Returns an object conform to checkable.schema.json
 */

export class Checkable {
    startable = true;
    reasons = [];
    pids = [];
    ports = [];

    /**
     * Merge another checkable with this object
     * @param {Checkable} o
     * @returns {Checkable}
     * @throws {Error} if o is not a checkable
     */
    merge( o ){
        if( o && o instanceof Checkable ){
            this.startable &= o.startable;
            this.reasons = [ ...this.reasons, ...o.reasons ];
            this.pids = [ ...this.pids, ...o.pids ];
            this.ports = [ ...this.ports, ...o.ports ];
            return this;
        }
        throw new Error( 'Checkable.merge() not a Checkable instance', o );
    }
}
