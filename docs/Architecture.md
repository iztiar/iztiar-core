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

The _plugins_ group is an array of the installed plugins which address the core module, and are configured to be started on this environment on this host.

Each item of the array is a JSON object which describes the service.

Content of the JSON object heavily depends of the plugin and of the service it provides, but may|should|must include following keys:

    - name: uniquely identifies the service on this environment on this host, mandatory
    - enabled: whether the service is enabled or not, defaults to true
