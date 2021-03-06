exports.yargs = {
    command: 'web [options] <url>',
    describe: 'Web file and directory bruteforcer (a.k.a dirbuster)',

    builder: (yargs) => {
        const { hasNodeModule } = require('@pown/modules')

        yargs.option('write', {
            type: 'string',
            describe: 'Write to file',
            alias: 'w'
        })

        yargs.option('request-method', {
            type: 'string',
            describe: 'Request method',
            alias: 'X',
            default: 'GET'
        })

        yargs.option('accept-unauthorized', {
            type: 'boolean',
            describe: 'Accept unauthorized TLS errors',
            alias: 'k',
            default: false
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

        yargs.options('header', {
            type: 'array',
            describe: 'Set header',
            alias: 'H',
            default: []
        })

        yargs.options('timeout', {
            type: 'number',
            describe: 'Request timeout in milliseconds',
            alias: 't',
            default: 30000
        })

        yargs.options('all', {
            type: 'boolean',
            describe: 'Display all results',
            alias: 'a',
            default: false
        })

        yargs.options('yes', {
            type: 'boolean',
            describe: 'Answer yes to all questions',
            default: false
        })

        yargs.options('no', {
            type: 'boolean',
            describe: 'Answer no to all questions',
            default: false
        })

        if (hasNodeModule('@pown/blessed')) {
            yargs.options('blessed', {
                type: 'boolean',
                describe: 'Start with blessed ui',
                alias: 'b',
                default: false
            })
        }

        yargs.example(`$0 buster web -X HEAD -n words.txt http://target`, 'Send requests using the HEAD HTTP method')
        yargs.example(`$0 buster web -H 'Authorization: Basic YWxhZGRpbjpvcGVuc2VzYW1l' -n words.txt http://target`, 'Send basic authentication headers')
        yargs.example(`$0 buster web -b --all -n words.txt http://target`, 'Start buster but also open the results in nice text user interface')
    },

    handler: async(argv) => {
        const { write, requestMethod, acceptUnauthorized, nameDictionary, extensionDictionary, namePrefix, nameSuffix, extensionPrefix, extensionSuffix, requestConcurrency, loadConcurrency, header, timeout, all, yes, no, blessed, url } = argv

        const { Buster } = require('../../web')

        const buster = new Buster({ namePrefix, nameSuffix, extensionPrefix, extensionSuffix, requestConcurrency, loadConcurrency })

        buster.on('info', console.info.bind(console))
        buster.on('warn', console.warn.bind(console))
        buster.on('error', console.error.bind(console))

        const colors = require('@pown/cli/lib/colors')

        const responseCodeColorFuncs = [colors.gray, colors.blue, colors.green, colors.yellow, colors.magenta, colors.red, colors.gray, colors.gray, colors.gray, colors.gray]

        if (blessed) {
            const blessed = require('@pown/blessed/lib/blessed')
            const Quit = require('@pown/blessed/lib/auxiliary/quit')
            const Console = require('@pown/blessed/lib/auxiliary/console')
            const HTTPView = require('@pown/blessed/lib/auxiliary/httpview')

            const s = blessed.screen({ name: 'Buster' })

            const q = new Quit()
            const c = new Console()
            const h = new HTTPView()

            q.bindKeys()
            c.bindKeys()
            c.hijackConsole()

            s.append(q)
            s.append(c)
            s.append(h)

            const buildTransaction = (res) => {
                return {
                    ...res
                }
            }

            if (all) {
                buster.on('response', (res) => {
                    h.addTransaction(buildTransaction(res))
                })
            }

            buster.on('interesting-response', (res) => {
                h.addTransaction(buildTransaction(res))
            })
        }

        const results = []

        const buildLogLine = (res) => {
            const responseCode = responseCodeColorFuncs[~~(res.responseCode / 100) % 10](res.responseCode)
            const contentType = colors.cyan(res.responseHeaders['content-type'] || '-')
            const server = colors.blue(res.responseHeaders['server'] || '-')
            const contentLength = ((res.responseHeaders['content-length'] || '-') + 'b')
            const time = colors.gray((res.info.stopTime - res.info.startTime).toFixed(2) + 'ms')
            const location = res.responseHeaders['location'] ? `-> ${res.responseHeaders['location']}` : ''

            return `${res.uri} -> ${responseCode} ${contentType} ${server} ${contentLength} ${time} ${location}`
        }

        if (all) {
            buster.on('response', (res) => {
                console.warn(`${buildLogLine(res)}`)
            })
        }

        buster.on('test-response', (res) => {
            console.warn(`Test ${buildLogLine(res)}`)
        })

        buster.on('interesting-response', (res) => {
            console.warn(`${buildLogLine(res)}`)

            results.push(res)
        })

        if (nameDictionary) {
            const { yieldFileLines } = require('@pown/file')

            try {
                // NOTE: load the dictionary asynchronously

                await buster.useNameDictionary(await yieldFileLines(nameDictionary))
            }
            catch (e) {
                console.error(e)
            }
        }

        if (extensionDictionary) {
            const { readFile } = require('@pown/file')

            try {
                // NOTE: load the dictionary in memory for sub-looping to work

                await buster.useExtensionDictionary((await readFile(extensionDictionary)).toString().trim().split('\n'))
            }
            catch (e) {
                console.error(e)
            }
        }

        const headers = {}

        header.forEach((header) => {
            const [name, value] = header.split(/:\s/)

            if (headers[name]) {
                if (!Array.isArray(headers[name])) {
                    headers[name] = [headers[name]]
                }

                headers[name].push(value)
            }
            else {
                headers[name] = value
            }
        })

        const req = { method: requestMethod, uri: url, headers, timeout, rejectUnauthorized: !acceptUnauthorized }

        if (!(await buster.calibrate(req))) {
            console.warn('The selected detection strategy is unfit for purpose and is likely going to result in false-positives.')

            if (no) {
                return
            }

            if (!yes) {
                const { prompt } = require('@pown/cli/lib/prompt')

                const result = await prompt({ name: 'continue', type: 'confirm', message: 'Do you want to continue?' })

                if (!result.continue) {
                    return
                }
            }
        }

        await buster.bust(req)

        if (!results.length) {
            console.warn(`No files or folders found.`)
        }

        if (write) {
            const path = require('path')
            const { writeFile } = require('@pown/file')

            if (path.extname(write) === '.json') {
                await writeFile(write, results.map((item) => JSON.stringify(item)).join('\n')) // NOTE: will not serialize Buffer
            }
            else {
                await writeFile(write, results.map(({ uri }) => uri).join('\n'))
            }
        }
    }
}
