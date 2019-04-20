exports.yargs = {
    command: 'email [options] <domain>',
    describe: 'Email bruteforce discovery tool (via smtp)',

    aliases: ['emails'],

    builder: (yargs) => {
        yargs.option('write', {
            type: 'string',
            describe: 'Write to file',
            alias: 'w'
        })

        yargs.option('dictionary', {
            type: 'string',
            describe: 'Dictionary file',
            alias: 'd'
        })

        yargs.options('servers', {
            type: 'array',
            describe: 'Servers to use',
            alias: 's',
            default: []
        })

        yargs.option('scale', {
            type: 'number',
            describe: 'Scale servers times',
            alias: 'e',
            default: 10
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
    },

    handler: async(argv) => {
        const { write, dictionary, servers, scale, all, yes, no, domain } = argv

        const { findMx, EmailBuster } = require('../../email')
        const { responseCodeColorFuncs } = require('../../colors')

        let bustServers

        bustServers = servers.map((server) => {
            const [host, port, enc] = server.split(':')

            return {
                host: host,
                port: parseInt(port),

                enc: enc === 'true' || enc === 'enc' ? true : false
            }
        })

        if (!bustServers.length) {
            bustServers = (await findMx(domain)).map((server) => ({ host: server, port: 25, enc: false }))
        }

        bustServers.forEach(({ host, port, enc }) => {
            console.warn(`Using server ${host}:${port}${enc ? 'tls' : ''}`)
        })

        bustServers = [].concat(...Array(scale).fill(bustServers))

        const buster = new EmailBuster({ servers: bustServers })

        buster.on('log', console.log.bind(console))
        buster.on('info', console.info.bind(console))
        buster.on('warn', console.warn.bind(console))
        buster.on('error', console.error.bind(console))

        if (dictionary) {
            const { yieldFileLines } = require('@pown/file')

            try {
                await buster.useDictionary(await yieldFileLines(dictionary))
            }
            catch (e) {
                console.error(e)
            }
        }

        const results = []

        buster.on('test-item', (item) => {
            const { email, code, message } = item

            console.warn(`Testing ${email} -> ${responseCodeColorFuncs[~~(code / 100) % 10](code)} ${message}`)
        })

        buster.on('item', (item) => {
            const { valid, email, code, message } = item

            if (!all && !valid) {
                return
            }

            console.log(`${email} -> ${responseCodeColorFuncs[~~(code / 100) % 10](code)} ${message}`)

            results.push(email)
        })

        if (!(await buster.calibrate(domain))) {
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

        await buster.bust(domain)

        if (!results.length) {
            console.warn(`No emails found.`)
        }

        if (write) {
            const path = require('path')
            const { writeFile } = require('@pown/file')

            if (path.extname(write) === '.json') {
                await writeFile(write, results.map((item) => JSON.stringify(item)).join('\n')) // NOTE: will not serialize Buffer
            }
            else {
                await writeFile(write, results.join('\n'))
            }
        }
    }
}
