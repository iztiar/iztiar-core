# Iztiar

## package.json

As a reminder, a `package.json` file is mandatory for all ESM modules.

The file content is well described on [NPMJS](https://docs.npmjs.com/cli/v6/configuring-npm/package-json).

We will detail here the values that Iztiar requests or asks for (whether they are mandatory or not) inside of your own `package.json`.

### name

Your package MUST be scoped on `iztiar` and MUST be prefixed by `iztiar-`. Its name MUST so be something like `@iztiar/iztiar-xxxxxxx`.

This is mandatory as Iztiar only consider these packages, and ignore others.

### type

Though Iztiar doesn't enforce that, we request that you specify the `"type": "module"` value, so that it is clear for everybody that your package is an ESM one.

### keywords

You are writing a plugin for Iztiar, as we write ourselves the core ;)

You so SHOULD specify at least:

    - `iztiar`
    - `iztiar-plugin`

as the minimal set of keywords.

### engines

You MAY specify:

    - `node`: the minimal version of `node` your plugin requires

        If it is specified, then the core application will check the package compatibility against the `node` running version
    
You SHOULD specify:

    - `@iztiar/iztiar-core`: the minimal version of `@iztiar/iztiar-core` your plugin requires

        If it is specified, then the core application will check the package compatibility against the `@iztiar/iztiar-core` running version

If your plugin provides a (sub-) feature, i.e. is not an autonomous service, then you MAY also specify the plugin(s) you are targeting. Iztiar will take care of verifying each target version you specify here.

### iztiar

The `iztiar` group is dedicated to Iztiar family, and let you qualify the content of your package is such a way that other packages will be able to interpret it.

The content of this group is described in [iztiar-group](../schemas/iztiar-group.schema.json) documentation.

#### features

List here all the features provided by your package.

##### type

    The `type` key qualifies the feature the module provides. This let us have a code as generic as possible.

    For example, a service may be started, stopped, tested, but not an addon.

    Known types are:

    - service: a feature which runs in its own process (aka a daemon)
    - addon: a feature which adds something to another feature
    - cli: a command-line interface
    - core: only used for now by the `@iztiar/iztiar-core` module

##### class

    The `class` key identifies the class name which implements the feature. This is useful, for example for an addon, to know which class it must target if it wants extend your class.

    If you do not provide information about the clas, then it will be a bit difficult to extend it, and so to provide some more features.
