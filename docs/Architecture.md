# Iztiar

## Architecture

### A high-level survey of the architecture

The environment as we understand it (see [Taxonomy](./Taxonomy.md)) may span on several hosts which together provide following services:

- one database instance,
- at least one ___coreController___ per host,
- at least one ___coreBroker___ per host, which itself manages the messaging bus,
- one REST API server which publishes and manages our public API,
- zero to several UI server(s).

### The coreController

A ___coreController___ is thought to manage other daemons.

Basically, the _coreController_ is at the heart of the whole system. It is responsible of:

- the ___coreBroker___ management: there must be at least one _coreBroker_ per host, and should be only one; the _coreBroker_ is attached to a _coreController_
- the plugins management, or, at least, the management of the plugins attached to this instance of the _coreController_,
- last, of writing operations in the database.

If you have many devices (see [Taxonomy](./Taxonomy.md)) or many gateways (see [Taxonomy](./Taxonomy.md)), you may configure several _coreControllers_, maybe on several hosts. Most of the configurations, though, will reside on a single host.

But, one more time, this is in no case at all, forced by anything: if it happens that first host resources are too heavily consumed, then you are free to span to a second host, a third, and so on.

Several _coreController_'s - whether they are running on one host or on several hosts, collaborate together through the messaging service.

## Configuration

At the moment, only pre-configured services can be started (and this is one of the responsabilities of the installation process).

### iztiar.json

___<configDir>/iztiar.json___ is the main configuration file of the environment on this host. It may contain:

    - a _core_ group
    - a _plugins_ group.

#### _core_ group

The _core_ group is optional. It may contain following keys:

    - logLevel: defines the desired logging level, defaults to 'INFO'
    - consoleLevel: defines the desired console verbosity level, defaults to 'NORMAL'.

#### _plugins_ group

Not all the installed plugins targeting a given module may be automatically started at boot. As said above, each plugin must be configured.

The _plugins_ group is a group:

    - whose key is a unique (inside of this environment on this host) identifier
    - whose value is itself a group, with following keys:

        - module:
            - mandatory
            - the name of the corresponding (obviously installed) module
            - the special value 'core' is accepted as coreController is integrated inside of iztiar-core itself
        - class:
            - optional for an external module
            - mandatory if special module 'core' is to be used
            - the class name of the instance to run
            - the usage is to let the module determines which type of service to run, so it is up to it to make this key mandatory or not in its own case
        - enabled:
            - optional
            - whether the service is enabled or not
            - defaults to true
        - plus other keys which describe the configuration of this instance of the plugin.
