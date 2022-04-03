# Iztiar

## IMqttClient interface configuration

As a reminder, for an instance have a connection one a MQTT message bus through this IMqttClient interface, not only must it implement this interface (this should be obvious), but also its configuration must include at least an empty IMqttClient group.

Also, and though the interface is only implemented once by the instance, this unique implementation is able manage several broker connections. This can be done by appending a connection name to the 'IMqttClient' configuration group:

    - IMqttClient group handles one connection
    - IMqttClient.name handles the 'name'd connection.

The broker to be connected to may be identified, in the order of preference:

    - by identifying its _feature_, i.e. by the Iztiar service which manages this broker
    - by providing a full URI
    - by providing proto, hostname, port.

### feature

The name of the feature which provides a IMqttServer implementation.

The client will read the configuration of this feature, using the found values for managing its connection.

This should be the preferred way of configuring a IMqttClient when possible.

### URI

If not _feature_ is found in the configuration, then an URI is searched for. It is expected to be a full URI.

### hostname, port

If no feature nor an URI are configured, it is always possible to just specifiy a hostname and a port.

If nothing is configured at all, then the interface is able to provide a default port.

## Exception

The feature which implements a IMqttServer defaults to:

    - have a IMqttClient even if not configured
    - connect the IMqttClient to this same IMqttServer.
