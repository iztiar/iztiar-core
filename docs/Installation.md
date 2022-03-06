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
