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

As a reminder, this is a design decision that each and every usable feature be named in the application configuration in order to be considered.

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

where `ControllerOne`, `BrokerOne` and `RestProductionApi` above are the name of the features.

This name MUST be defined in the `features` group in order the feature be considered by the application.

As specified in the `app-config.schema.json`, each feature MUST exhibit a minimal set of keys, and MAY exhibit other keys depending of its own needs:

    - `module` key specifies by which module the feature is provided
    
        the module may be specified either by its ESM name (e.g. `@iztiar/iztizr-broker`), or as `'core'`

        this key is mandatory and no default is provided

    - `class` key specifies the class to be invoked inside of the module

        whether this key is mandatory or not depends of the module own rules; for `'core'` module, the key is mandatory

    - `enabled` key let the administrator disable a feature without removing its description from the application configuration

        this key is optional, and defaults to `true`

    - `features` key specifies a list of (sub-) features to be added at startup time to this specific feature

        this may for example be a plugin which adds an interface to a class

        this (sub-) feature MUST itself be configured as any other feature, i.e. with `module` key, maybe a `class` key, maybe an `enabled` key, and other properties the (sub-) feature may need
