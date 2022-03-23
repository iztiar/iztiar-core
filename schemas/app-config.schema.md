# Iztiar

## app-config

`app-config` schema describes the application configuration for this [environment](../docs/Taxonomy.md).

The configuration may span on several hosts, and this same application configuration should also span on these hosts.

The application configuration file is stored in `<storageDir>/config` directory.

### Application configuration

In the application configuration file, the application global configuration itself is stored as a group under `core` key.

As of @iztiar/iztiar-core v0.5, two keys are managed:

    - `logLevel` is the desired log level, and defaults to 'INFO'
    - `consoleLevel` is the desired console verbosity level, and defaults to 'NORMAL'.

### Features configuration

In order to be considered by the application, a feature MUST:

    - have its providing module installed (no automatic download at the moment)
    - be identified by its feature name in the application configuration
    - not be disabled by the application configuration.

As a reminder, this is a design decision that each and every usable feature must be named in the application configuration in order to be considered.

Top-level features are described in a `features` group.

Example:

```
    "features": {
        "ControllerOne": {

        },
        "BrokerOne": {

        },
        "RestProductionApi": {

        }
    }
```

where `ControllerOne`, `BrokerOne` and `RestProductionApi` above are the name that the site adminitrator has decided to give to these respective features.

As specified in the `app-config.schema.json`, each feature MUST exhibit a minimal set of keys, and MAY exhibit other keys depending of its own needs:

    - `module` key specifies by which module the feature is provided
    
        the module may be specified either by its ESM name (e.g. `@iztiar/iztizr-broker`), or as `'core'`

        this key is mandatory and no default is provided

    - `class` key specifies the class to be invoked inside of the module

        whether this key is mandatory or not depends of the module own rules; for `'core'` module, the key is mandatory

    - `enabled` key let the administrator disable a feature without removing its description from the application configuration

        this key is optional, and defaults to `true`

#### Interface of a feature

Besides of the general configuration of a feature above, each implemented interface has its own specific configuration. If a particular feature implements for example a TCP server, you should find a 'ITcpServer' group inside of the feature group. Say that we are calling these 'interface' groups.

Though this cannot be enforced in any way as this eventually is the responsability of the feature itself, we at Iztiar strongly suggest that an interface actually runs only if at least its group is specified in the application configuration file, even if this group is itself empty (because default values well suit your needs).

An interface group may allow the user to address another feature to take the configuration from.

As an example, the IMqttClient accepts for its configuration, either a host and a port number, but also the name of the feature which describes the MQTT server it is expected to connect to. This redirection is specified via the `feature` keyword.

So, inside a feature 'FA', a particular interface 'IA' may allow all or a part of its configuration to be taken from another feature (FB), which should itself implements a particular interface IB.

### Add-ons configuration

The features described in the previous paragraph are most often features which run in their own process, also said services or daemons.

Another type of feature exist inside of Iztiar, which is called an 'add-on'. An add-on is just a module which adds a function (a feature) to another feature.
