[![Follow on Twitter](https://img.shields.io/twitter/follow/pownjs.svg?logo=twitter)](https://twitter.com/pownjs)
[![NPM](https://img.shields.io/npm/v/@pown/buster.svg)](https://www.npmjs.com/package/@pown/buster)
[![Fury](https://img.shields.io/badge/version-2x%20Fury-red.svg)](https://github.com/pownjs/lobby)

# Pown Buster 

Pown Buster is a multi-service bruteforce discovery tool.

## Credits

This tool is part of [secapps.com](https://secapps.com) open-source initiative.

```
  ___ ___ ___   _   ___ ___  ___
 / __| __/ __| /_\ | _ \ _ \/ __|
 \__ \ _| (__ / _ \|  _/  _/\__ \
 |___/___\___/_/ \_\_| |_|  |___/
  https://secapps.com
```

## Quickstart

This tool is meant to be used as part of [Pown.js](https://github.com/pownjs/pown) but it can be invoked separately as an independent tool.

Install Pown first as usual:

```sh
$ npm install -g pown@latest
```

Invoke directly from Pown:

```sh
$ pown buster
```

### Library Use

install this module locally from the root of your project:

```sh
$ npm install @pown/buster --save
```

Once done, invoke pown cli:

```sh
$ ./node_modules/.bin/pown-cli buster
```

You can also use the global pown to invoke the tool locally:

```sh
$ POWN_ROOT=. pown buster
```

## Usage

> **WARNING**: This pown command is currently under development and as a result will be subject to breaking changes.

```
pown buster <command>

Multi-service bruteforce discovery tool

Commands:
  pown bust web [options] <url>       Web file and directory bruteforcer (a.k.a dirbuster)
  pown bust email [options] <domain>  Email bruteforce discovery tool (via smtp)  [aliases: emails]

Options:
  --version  Show version number  [boolean]
  --help     Show help  [boolean]
```

### `pown bust web`

```
pown bust web [options] <url>

Web file and directory bruteforcer (a.k.a dirbuster)

Options:
  --version                   Show version number  [boolean]
  --help                      Show help  [boolean]
  --write, -w                 Write to file  [string]
  --request-method, -X        Request method  [string] [default: "GET"]
  --name-dictionary, -n       Name dictionary file  [string]
  --extension-dictionary, -e  Extension dictionary file  [string]
  --name-prefix               Name prefix  [string] [default: "/"]
  --name-suffix               Name suffix  [string] [default: ""]
  --extension-prefix          Extension prefix  [string] [default: "."]
  --extension-suffix          Extension suffix  [string] [default: ""]
  --request-concurrency, -r   The number of request to run concurrently  [string] [default: Infinity]
  --load-concurrency, -l      The number of assync operations to run concurrently  [string] [default: Infinity]
  --header, -H                Set header  [array] [default: []]
  --timeout, -t               Request timeout in milliseconds  [number] [default: 30000]
  --all, -a                   Display all results  [boolean] [default: false]
  --yes, -y                   Answer yes to all questions  [boolean] [default: false]
  --blessed, -b               Start with blessed ui  [boolean] [default: false]

Examples:
  pown buster -X HEAD -n words.txt http://target                                             Send requests using the HEAD HTTP method
  pown buster -H 'Authorization: Basic YWxhZGRpbjpvcGVuc2VzYW1l' -n words.txt http://target  Send basic authentication headers
  pown buster -b --all -n words.txt http://target                                            Start buster but also open the results in nice text user interface
```

### `pown bust emails`

```
pown bust email [options] <domain>

Email bruteforce discovery tool (via smtp)

Options:
  --version         Show version number  [boolean]
  --help            Show help  [boolean]
  --write, -w       Write to file  [string]
  --dictionary, -d  Dictionary file  [string]
  --servers, -s     Servers to use  [array] [default: []]
  --scale, -e       Scale servers times  [number] [default: 10]
  --all, -a         Display all results  [boolean] [default: false]
  --yes, -y         Answer yes to all questions  [boolean] [default: false]
```

## Performance

Notes from the author:

> [@pdp](https://twitter.com/pdp): Pown Buster is written such as that none of the requests and internal scheduling mechanisms are blocking. Although I was initially skeptical that this is going to lead to significant performance improvements, it turns out that it does. I compared the performance to other tools written in more concurrent languages such as Go. It appears that Pown Buster is at least 6 times faster in default configuration when compared to these tools.
> 
> That being said, speed is not always a good thing. In my own tests, many servers will start throwing 5xx errors if you are sending too fast. You can control the concurrency of the tool using `--request-concurrency` and `--load-concurrency` options. The former caps how many concurrent request you would like to send to the server as the name suggests. The later is slightly trickier. This option indicates how many concurrent operations can be pre-loaded in advance. The higher the number the more Promises will be instantiated in advance increasing the performance but at the same time increasing the memory profile. The lower the number the less memory will be used but more operations have to be fetch at some intermediary point. If you are dealing with huge-dictionaries this option helps control the tool behaviour without making your hardware sweat. In normal circumstances you may want to leave this option alone and use `--request-concurrency` intead.

## Blessed

Pown Buster comes with an optional text interface which comes handy when investigating all results in detail. Use either `-b` or `--blessed` options to activate it. Using this feature will not result in performance degradation.

![Screenshot](https://media.githubusercontent.com/media/pownjs/pown-buster/master/screenshots/01.png)

## Suggestions and Improvements

The following list of improvements are just around the corner:

* Loading full requests instead of just uris
* Curses mode - preview in nice curses table
* Export - ability to serialise request and responses
* Support for HTTP/2 - should be available soon
* Split the blessed UI in a separate thread
* Support for request pipelining and other paralel options - see @pown/request
