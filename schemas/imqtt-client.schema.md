# Iztiar

## IMqttClient interface configuration

We say here to which broker the IMqttClient will connect to.

### feature

The name of the feature which provides a IMqttServer implementation.

The client will read the configuration of this feature, using the value for managing its connection.

This should be the preferred way of configuring a IMqttClient.

### hostname, port

If no feature is configured, it is always possible to just specifiy a hostname and a port.

As of v0.x, only localhost hostname is considered.

If nothing is configured at all, then the interface is able to provide a default port.

## Exception

The feature which implements a IMqttServer defaults to:

    - have a IMqttClient even if not configured
    - connect the IMqttClient to this same IMqttServer.
