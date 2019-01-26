[![Follow on Twitter](https://img.shields.io/twitter/follow/pownjs.svg?logo=twitter)](https://twitter.com/pownjs)
[![NPM](https://img.shields.io/npm/v/@pown/buster.svg)](https://www.npmjs.com/package/@pown/buster)

# Pown Buster 

Pown Buster is a web file and folder discovery tool.

## Quickstart

If installed globally as part of [Pown.js](https://github.com/pownjs/pown) invoke like this:

```sh
$ pown buster
```

Otherwise, install this module from the root of your project:

```sh
$ npm install @pown/buster --save
```

Once done, invoke pown buster like this:

```sh
$ ./node_modules/.bin/pown-cli buster
```

## Usage

> **WARNING**: This pown command is currently under development and as a result will be subject to breaking changes.

```
pown buster [options] <url>

Web file and directory bruteforcer (a.k.a dirbuster)

Options:
  --version                   Show version number  [boolean]
  --debug                     Debug mode  [boolean]
  --help                      Show help  [boolean]
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
  --all, -y                   Display all results  [boolean] [default: false]
  --yes, -y                   Answer yes to all questions  [boolean] [default: false]
  --blessed, -b               Start with blessed ui  [boolean] [default: false]

Examples:
  pown buster -X HEAD -n words.txt http://target                                             Send requests using the HEAD HTTP method
  pown buster -H 'Authorization: Basic YWxhZGRpbjpvcGVuc2VzYW1l' -n words.txt http://target  Send basic authentication headers
  pown buster -b --all -n words.txt http://target                                            Start buster but also open the results in nice text user interface
```

## Blessed

Pown Buster comes with an optional text interface which comes handy when investigating all results in detail. Use either `-b` or `--blessed` options to activate it. Using this feature will not result in performance degradation.

![Screenshot](https://media.githubusercontent.com/media/pownjs/pown-buster/master/screenshots/01.png)

## Todo

The following list of improvements are just around the corner:

* Loading full requests instead of just uris
* Curses mode - preview in nice curses table
* Export - ability to serialise request and responses
* Support for HTTP/2 - should be available soon
* Split the blessed UI in a separate thread
* Support for request pipelining and other paralel options - see @pown/request
