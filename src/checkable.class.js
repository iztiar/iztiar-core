/*
 * Checkable class
 *
 * Returns an object conform to checkable.schema.json
 *
 * Rationale:
 *  The featureCard class is able to test for alive pids and ports answering to iz.ping and iz.status commands.
 *
 *  When a service feature (aka a daemon) is able to provide these test datas from the main process, then it may
 *  implement the ICheckable interface, which itself makes use of this class.
 *  For a service feature being able to provide pids and ports of a running daemon, it is required that this
 *  daemon has written somewhere these pids and ports datas (aka the IRunFile interface).
 *
 *  Note that the checkableStatus of the ICapability interface provides the same function that the ICheckable
 *  interface: using a Checkable object to provide test datas to the featureCard.
 */

export class Checkable {
    startable = true;
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
            this.pids = [ ...this.pids, ...o.pids ];
            this.ports = [ ...this.ports, ...o.ports ];
            return this;
        }
        throw new Error( 'Checkable.merge() not a Checkable instance', o );
    }
}
