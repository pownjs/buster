[![Follow on Twitter](https://img.shields.io/twitter/follow/pownjs.svg?logo=twitter)](https://twitter.com/pownjs)
![NPM](https://img.shields.io/npm/v/@pown/buster.svg)

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

```
pown-cli buster [options] <url>

Web file and directory bruteforcer (a.k.a dirbuster)

Options:
  --version                   Show version number  [boolean]
  --debug                     Debug mode  [boolean]
  --help                      Show help  [boolean]
  --request-method, -m        Request method  [string] [default: "GET"]
  --name-dictionary, -n       Name dictionary file  [string]
  --extension-dictionary, -e  Extension dictionary file  [string]
  --name-prefix               Name prefix  [string] [default: "/"]
  --name-suffix               Name suffix  [string] [default: ""]
  --extension-prefix          Extension prefix  [string] [default: "."]
  --extension-suffix          Extension suffix  [string] [default: ""]
  --request-concurrency, -r   The number of request to run concurrently  [string] [default: Infinity]
  --load-concurrency, -l      The number of assync operations to run concurrently  [string] [default: Infinity]
  --timeout, -t               Request timeout in milliseconds  [number] [default: 30000]
  --yes, -y                   Answer yes to all questions  [boolean] [default: false]
```

## Wish List

The following list of improvements are just around the corner:

* Loading full requests instead of just uris
