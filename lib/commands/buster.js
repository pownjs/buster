exports.yargs = {
    command: 'buster [options] <url>',
    describe: 'Web file and directory bruteforcer (a.k.a dirbuster)',

    builder: (yargs) => {
        yargs.option('request-method', {
            type: 'string',
            describe: 'Request method',
            alias: 'm',
            default: 'GET'
        })

        yargs.option('name-dictionary', {
            type: 'string',
            describe: 'Name dictionary file',
            alias: 'n'
        })

        yargs.option('extension-dictionary', {
            type: 'string',
            describe: 'Extension dictionary file',
            alias: 'e'
        })

        yargs.options('name-prefix', {
            type: 'string',
            describe: 'Name prefix',
            default: '/'
        })

        yargs.options('name-suffix', {
            type: 'string',
            describe: 'Name suffix',
            default: ''
        })

        yargs.options('extension-prefix', {
            type: 'string',
            describe: 'Extension prefix',
            default: '.'
        })

        yargs.options('extension-suffix', {
            type: 'string',
            describe: 'Extension suffix',
            default: ''
        })

        yargs.options('request-concurrency', {
            type: 'string',
            describe: 'The number of request to run concurrently',
            alias: 'r',
            default: Number.POSITIVE_INFINITY
        })

        yargs.options('load-concurrency', {
            type: 'string',
            describe: 'The number of assync operations to run concurrently',
            alias: 'l',
            default: Number.POSITIVE_INFINITY
        })
    },

    handler: async(argv) => {
        const { requestMethod, nameDictionary, extensionDictionary, namePrefix, nameSuffix, extensionPrefix, extensionSuffix, requestConcurrency, loadConcurrency, url } = argv

        const { Buster } = require('../buster')

        const buster = new Buster({ namePrefix, nameSuffix, extensionPrefix, extensionSuffix, requestConcurrency, loadConcurrency })

        const results = []

        const colors = require('@pown/cli/lib/colors')

        const responseCodeColorFuncs = [colors.gray, colors.blue, colors.green, colors.yellow, colors.magenta, colors.red, colors.gray, colors.gray, colors.gray, colors.gray]

        buster.on('response', (res) => {
            const responseCode = responseCodeColorFuncs[~~(res.responseCode / 100) % 10](res.responseCode)
            const contentType = colors.cyan(res.responseHeaders['content-type'] || '-')
            const contentLength = (res.responseHeaders['content-length'] || '-')
            const time = colors.gray((res.info.stopTime - res.info.startTime).toFixed(2) + 'ms')
            const location = res.responseHeaders['location'] ? `-> ${res.responseHeaders['location']}` : ''

            console.warn(`${res.uri} -> ${responseCode} ${contentType} ${contentLength} ${time} ${location}`)

            results.push(res)
        })

        buster.on('test-response', (res) => {
            const responseCode = responseCodeColorFuncs[~~(res.responseCode / 100) % 10](res.responseCode)
            const contentType = colors.cyan(res.responseHeaders['content-type'] || '-')
            const contentLength = (res.responseHeaders['content-length'] || '-')
            const time = colors.gray((res.info.stopTime - res.info.startTime).toFixed(2) + 'ms')
            const location = res.responseHeaders['location'] ? `-> ${res.responseHeaders['location']}` : ''

            console.warn(`Test ${res.uri} -> ${responseCode} ${contentType} ${contentLength} ${time} ${location}`)
        })

        if (nameDictionary) {
            const { yieldFileLines } = require('@pown/file')

            try {
                await buster.useNameDictionary(await yieldFileLines(nameDictionary))
            }
            catch (e) {
                console.error(e)
            }
        }

        if (extensionDictionary) {
            const { readFile } = require('@pown/file')

            try {
                await buster.useExtensionDictionary((await readFile(extensionDictionary)).toString().trim().split('\n'))
            }
            catch (e) {
                console.error(e)
            }
        }

        await buster.bust({ method: requestMethod, uri: url })

        if (!results.length) {
            console.warn(`No files or folders found.`)
        }
    }
}
