# Iztiar

## Taxonomy

- coreBroker

A messaging broker is one of the _services_ required to run Iztiar (see [Architecture](./Architecture.md) for a description).

The _coreBroker_ is a core _plugin_ which provides a (MQTT) message broker _service_.

- coreController

The _coreController_ is one of the services required to run Iztiar (see [Architecture](./Architecture.md) for a description).

The _coreController_ provides a TCP-based management system between the running _plugins_.

- Device

As its name says, a device is before all something that is able to send some informations and/or receive some commands.

A device may gather several sensors and/or actioners: for example, we may imagine a device with temperature and light sensors, a push button, and a gate opener. Which caracterizes the device here is that it is installed as one block, will be moved as one same block, finally replaced or decommissionned as another time same block.

Besides of this physical device, a plugin let the user define virtual devices, which are thought to gather informations and/or commands in another way that the physical devices do.

- Environment

We are talking here about _development_ vs. _staging_ vs. _production_, etc. to use some widely used terms. You can have as many environments as you like, and name them as you want.

From the Iztiar family point of view, you can have as many environments as you want on a same host, as this is only determined by:

- the storage directory which must be dedicated to an environment
- the user TCP ports which must not overlap between environments.

Environments are meant to be self-content, and __do not communicate between each others__.

Besides of `NODE_ENV` variable which is rather limited, Iztiar honors the `IZTIAR_ENV` variable which can be used to suit your own needs.

- Feature

As the name says, a feature is anything which provides something (hope valuable) to the Iztiar family: a new UI, a new broker, another gateway, a new set of colors, a new implementation of an interface, an add-on for a particular class, and so on.

Iztiar distinguishes between two types of features:

    - a feature which runs in its own process, aka a service in the system sens, aka a daemon

        Examples of such features are `coreController`, `coreBroker`, ...
        Iztiar uses the term `service` to qualify such a feature.

    - a (sub-) feature which rather acts as an add-on to another feature.

        Examples of such features are `pidUsage`, ...
        Iztiar uses the term `add-on` to qualify such a feature.

So, Iztiar may be extended with services and add-ons which both provide new features, or replace or add something to existing ones.

The features provided by a plugin SHOULD be advertised in the `package.json` file of the corresponding module. See our [package.json](./package.json.md) documentation for more information on that.

- Gateway

A gateway is something which manages some devices of the same nature. Common example of gateways are protocol gateways which manage a given protocol, e.g. Z-Wave gateway, Zigbee gateway, MySensors gateway, RFXCom gateway, and so on.

Because Iztiar is protocol agnostic, at least one gateway is required to manage a given protocol.

A gateway is attached to one _coreController_ as a plugin.

- Plugin

A _plugin_ is a ESM module designed and written to provide some _service_ to the Iztiar family.

The `package.json` file of the plugin must include:

    - a `main` key, whose value must address a file containing a default-exported function

        This default-exported function will be called by Iztiar, with a single `coreApi` argument

    - a `iztiar` group, which must contains a `target` key, which itself must adress the module that this plugin targets.

The rest is up to the plugin...

- Service

A _service_ is anything which provides some feature to Iztiar, and/or participates to the good run of the whole thing.

A service can be provided:

    - either by the core `@iztiar/iztiar-core` module
    - or by an external plugin.

For example, the core Iztiar family includes:

    - a TCP management service, provided by a coreController
    - a message broker service, provided by a coreBroker.

A service is identified by its name in the application configuration file, and this name must be unique on the host for this environment (inside of the storage directory). More, we suggest to make this name unique in the whole environment.

- Storage directory

The storage directory is the top of the file tree of all software and data used by Iztiar family for a given _environment_.

On a given host, and for a given environment, it gathers all the configurations of the application and plugins, the logs directory, the run directory, all the data, and so on.

The storage directory is determined at install time, and defaults to `/var/lib/iztiar` in *nix-like systems.

It must be specified - if not the default - as a command-line argument for all CLI commands.

## Homie vs Jeedom vs Iztiar

    [Homie](https://homieiot.github.io/specification/)
    Homie aims to define a MQTT standard exchange language. It makes use of a Device / Node / (settable) Property hierarchy.

    [Jeedom](https://jeedom.com/)
    Jeedom hierarchy is Zone / Equipment / Command(info|action)
    In Jeedom, zones may be built as a tree (a zone in a zone in a zone) of arbitrary deep.
    Zone is a powerful level, as it may organize and present the equipments in every way we can imagine.
    An equipment is attached to at most one zone.
    One can think that a Jeedom equipment is almost analogous to Homie device+node.

    [MySensors](https://www.mysensors.org/)
    MySensors defines Node / Sensor

    The table below ignore all visual/display properties.

 +----------------------------+--------------------------------------+----------------+-----------------
 |       Homie v4             |           Jeedom                     | MySensors      |     Iztiar
 +----------------------------+--------------------------------------+----------------+------------------+
 |                            | Zone      $name                      |                | Zone    name     |
 |                            |           $children (zone|equipment) |                |         children |
 |                            |                                      |                |  
 | Device    $name            | Equipment $name                      |                |
 |           $nodes           |           $category                  |                |
 |           $homie           |           $active                    |                |  
 |           $state           |           $commands                  |                |
 |           $extensions      |                                      |                |
 |           $implementation  |                                      |                |
 |                            |                                      |                |
 | Node      $name            |                                      | Node    $id    |
 |           $type            |                                      |         $name  |
 |           $properties      |                                      |                |
 |                            |                                      |                |
 |                            |                                      |                |
 | Property  $name            | Command   $name                      | Sensor  $id    |
 |           $datatype        |           $nature (info|action)      |         $name  | 
 |           $retained        |           $datatype                  |                |
 |           $settable        |                                      |                |
 |           $unit            |                                      |                |
 |           $format          |                                      |                |
 +----------------------------+--------------------------------------+----------------+-----------------
