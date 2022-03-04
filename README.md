# Iztiar

## Liminaries

Iztiar aims to form a big family of packages (and, of course, nothing less) to drive a set of sensors, actioners, scenarios, and the glue around all of these.
Put in together, we so are building a home automation application, the dream of an automated home, a building supervision software, etc.

Thanks to the designed unique architecture, we do not at the moment identify any limit to the possible usages.

As of 0.x versions, we are still in the long process of drawing the future plans and evaluating implementation patterns.

In other words, though all is public and published in gthub and npmjs, nothing is really finalized, and the application still does nothing :( 
	
At least, it is almost bug-free!

So, please be patient...

## iztiar-core

___iztiar-core___ (this package) is the very core of the whole software family. Through its command-line interface, it is expected to provide the core services required by _Iztiar_:

- the coreBroker messaging bus
- the coreController service
- the REST API server
- the certificate-based security framework.

### Command-line interface

```shell
iztiar {start|stop|test} [--storage-dir <storage_dir>] [--loglevel <loglevel>]
```

It is a design decision that the command-line accept as few options as possible. The rationale is that we want the configuration be written.

The <storage_dir> option addresses the _iztiar_ configuration file, which itself is expected to fully describe all services to be started (respectively stopped, tested).

### See also:

- the [Technologies](./docs/Technologies.md) document which describes the used technologies
- the [Architecture](./docs/Architecture.md) description
- the [Taxonomy](./docs/Taxonomy.md) document which defines and  explain the notions used here
- , and, last, the [Installation](./docs/Installation.md) to know how to install this piece of gold :)

## Some notes about the _iztiar_ word

According to [Wikipedia](https://en.wikipedia.org/), _Itziar_ may be understood as both a spain city and a female given name.

According to [Etre parents](https://etreparents.com/30-prenoms-sans-genre/), _Itziar_ would originate from basque language, and would be appliable to both male and female persons. It would mean «&nbsp;champ d’étoiles&nbsp;» in french, or «&nbsp;field of stars&nbsp;» in english.

Other considered names were:

- adomojs: Authomatized Domus Javascript
- adomong: Authomatized Dom New Generation
- or see also how [NodeJS](https://nodejs.com) finds three new words each time we reload the page..;)

## A copyright notice

First, and though lot of the code has been redesigned or rewritten, the very first code set has been shamelessly forked from [Homebridge](https://github.com/homebridge).

Second, many ideas have been taken from [Jeedom](https://www.jeedom.com/site/en/index.html).

Third, many ideas have also been pulled from other automation softwares, either current or stopped as the day...
