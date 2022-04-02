# Iztiar

## IMqttClient interface configuration

Though there is only one interface implementation, this unique implementation may manage several broker connections. This can be done by providing either one IMqttClient configuration, or an array of objects.

We say here to which broker(s) the IMqttClient will connect to.

### feature

The name of the feature which provides a IMqttServer implementation.

The client will read the configuration of this feature, using the found values for managing its connection.

This should be the preferred way of configuring a IMqttClient when possible.

### hostname, port

If no feature is configured, it is always possible to just specifiy a hostname and a port.

If nothing is configured at all, then the interface is able to provide a default port.

## Exception

The feature which implements a IMqttServer defaults to:

    - have a IMqttClient even if not configured
    - connect the IMqttClient to this same IMqttServer.
