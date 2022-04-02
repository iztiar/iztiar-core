# Iztiar

## Installation

Note: at the moment, this a rather a tool specification than an actual tool description.

### Installing

Install this piece of gold that Iztiar aims to be is as simple as just running one command in the console:

```bash
wget -O- https://www.github.com/iztiar/install/install.sh | sudo bash
```

You can also download and examine it to know exactly what it does. In brief:

- check your systems for prerequisites
- request from the console the configuration informations if they have not been provided in the command-line
- before doing anything, display a summary of what the script will do, requesting for a confirmation of a cancellation
- last, does the work hoping you have confirmed the stuff.

### install.sh development notes

As the script is expected to be run from a http get, it is supposed (required ?) to be one-piece: no external function can be used here.

Nonetheless, we have probably to write it so that each dependant package be easily maintained:

- have a 'iztiar-core' part
- have a 'iztiar-core-cli' part
- have a 'iztiar-code-ui' part
- and so on.

Also, all our installed packages, and the future installed plugins will be NPM packages. We prefer:

- keep the NPM packages away from the live data (seems obvious)
- keep the Iztiar NPM packages and their dependancies away from maybe already installed other packages.

What to do:

- check that we are run by root
- accept command-line arguments

    - iztiar-core
        - install NPM directory (default to /usr/lib/iztiar) -- maybe not this one

    - iztiar-core-cli
        - storage directory (default to /var/lib/iztiar)
        - account name (default to iztiar)
        - account uid (system default)
        - account gid (system default)
        - environment name (default to production)
        - controller name (application default)
        - controller ports (application default)
        - broker ports (application default)
    - iztiar-core-ui
        - admin initial user (default to admin)
        - admin initial password (default to admin)
- detect, gather and later install all prerequisites
    - the latest Node.js LTS version
    - development and compilation tools for the host: gcc-c++, make, python3, 'Development Tools' group

    - mongodb software -- or another database service ?

- interactively ask to the user the configuration informations if they have not been provided in the command-line
- may propose a set of Iztiar base packages
- display a summary of:
    - the checks which have been done
    - the packages which will be installed
    - the way the system will be modified (user account, directory and so on)
- request a confirmation or a cancellation
- if confirmed:

    - install missing packages
        @iztiar packages are installed by root globally

    - define a name/uid/guid account

        ```shell
        # useradd --comment Iztiar --home-dir /var/lib/iztiar --groups wheel --create-home --shell/bin/false --system --user-group iztiar
        # cat <<! >/etc/sudoers.d/iztiar
        iztiar ALL=(ALL) NOPASSWD: /usr/bin/systemctl reboot, /usr/bin/systemctl start iztiar, /usr/bin/systemctl stop iztiar, /usr/bin/systemctl restart iztiar, /usr/bin/node, /usr/bin/npm
        !
        ```

    - create storageDir
    - create the initial set of configuration files
    - define the systemd services
        - iztiar-controller
        - iztiar-broker
        - iztiar-ui
        - iztiar-api
        - mongodb ?
    - install a set of selectionned Iztiar base packages
    - provide a full log of its actions and their results

The installer should focalize on installing all services on a single host. Spanning the environment on several hosts should be considered as an advanced alternative.

### Security notes

The security is based on client certificates.

The installation process must :

    - generate a CA root certificate for the environment (e.g. production)
    - generate a CARoot-based CA certificate for each IMqttClient (coreBroker, coreController) and each IMqttServer (coreBroker)
    - configure the broker to allow the client certificates

#### Create the CA

    # mkdir certs
    # cd certs

    1/ generate a private key 'ca.key' for the CA

    # openssl genpkey -algorithm RSA -out ca.key -pkeyopt rsa_keygen_bits:2048

    2/ create the CA certificate based of its newly-created private key

    # openssl req -new -x509 -days 3650 -key ca.key -nodes -out ca.crt


```
You are about to be asked to enter information that will be incorporated
into your certificate request.
What you are about to enter is what is called a Distinguished Name or a DN.
There are quite a few fields but you can leave some blank
For some fields there will be a default value,
If you enter '.', the field will be left blank.
-----
Country Name (2 letter code) [XX]:FR
State or Province Name (full name) []:France
Locality Name (eg, city) [Default City]:
Organization Name (eg, company) [Default Company Ltd]:Iztiar
Organizational Unit Name (eg, section) []:Iztiar
Common Name (eg, your name or your server's hostname) []:iztiar
Email Address []:iztiar-leader@trychlos.org
```

#### Create the broker certificate

Please note that the broker certificate is just a particular sort of client certificate, signed by our previously created CA.

Which makes it particular is that the broker certificate MUST include the same server name than those that client will use to connect.

Here we choose the broker FQDN hostname.

    - create the broker private key
    - create a certificate request, signing it with the client private key
    - sign the certificate request for the CA key to provide a CA-certified client certificate

    # openssl genpkey -algorithm RSA -out brokerOne.key -pkeyopt rsa_keygen_bits:2048
    # openssl req -new -out brokerOne.csr -key brokerOne.key
    # openssl x509 -req -in brokerOne.csr -CA ca.crt -CAkey ca.key -CAcreateserial -out brokerOne.crt -days 3650

```
You are about to be asked to enter information that will be incorporated
into your certificate request.
What you are about to enter is what is called a Distinguished Name or a DN.
There are quite a few fields but you can leave some blank
For some fields there will be a default value,
If you enter '.', the field will be left blank.
-----
Country Name (2 letter code) [XX]:FR
State or Province Name (full name) []:France
Locality Name (eg, city) [Default City]:
Organization Name (eg, company) [Default Company Ltd]:Iztiar
Organizational Unit Name (eg, section) []:Iztiar
Common Name (eg, your name or your server's hostname) []:xps13.trychlos.lan
Email Address []:iztiar-leader@trychlos.org

Please enter the following 'extra' attributes
to be sent with your certificate request
A challenge password []:
An optional company name []:brokerOne
```

```
Signature ok
subject=C = FR, ST = France, L = Default City, O = Iztiar, OU = Iztiar, CN = xps13.trychlos.lan, emailAddress = iztiar-leader@trychlos.org
Getting CA Private Key
```

#### Create each clients certificate

Then, for each client:

    - create its private key
    - create a certificate request, signing it with the client private key
    - sign the certificate request for the CA key to provide a CA-certified client certificate

    # openssl genpkey -algorithm RSA -out controllerOne.key -pkeyopt rsa_keygen_bits:2048
    # openssl req -new -out controllerOne.csr -key controllerOne.key
    # openssl x509 -req -in controllerOne.csr -CA ca.crt -CAkey ca.key -CAcreateserial -out controllerOne.crt -days 3650

or:

    # client=mySensorsGateway && openssl genpkey -algorithm RSA -out $client.key -pkeyopt rsa_keygen_bits:2048 && openssl req -new -out $client.csr -key $client.key && openssl x509 -req -in $client.csr -CA ca.crt -CAkey ca.key -CAcreateserial -out $client.crt -days 3650

```
You are about to be asked to enter information that will be incorporated
into your certificate request.
What you are about to enter is what is called a Distinguished Name or a DN.
There are quite a few fields but you can leave some blank
For some fields there will be a default value,
If you enter '.', the field will be left blank.
-----
Country Name (2 letter code) [XX]:FR
State or Province Name (full name) []:France
Locality Name (eg, city) [Default City]:
Organization Name (eg, company) [Default Company Ltd]:Iztiar
Organizational Unit Name (eg, section) []:
Common Name (eg, your name or your server's hostname) []:
Email Address []:iztiar-leader@trychlos.org

Please enter the following 'extra' attributes
to be sent with your certificate request
A challenge password []:
An optional company name []:controllerOne
```

```
Signature ok
subject=C = FR, ST = France, L = Default City, O = Iztiar, emailAddress = iztiar-leader@trychlos.org
Getting CA Private Key
```
