exports.yargs = {
    command: 'email [options] <domain>',
    describe: 'Email  bruteforcer (via smtp)',

    builder: (yargs) => {
        yargs.option('dictionary', {
            type: 'string',
            describe: 'Dictionary file',
            alias: 'd'
        })

        yargs.options('yes', {
            type: 'boolean',
            describe: 'Answer yes to all questions',
            alias: 'y',
            default: false
        })
    },

    handler: async(argv) => {
        const { dictionary, yes, domain } = argv

        const { findMx, EmailBuster } = require('../../email')
        const { colors, responseCodeColorFuncs } = require('../../colors')

        const servers = (await findMx(domain)).map((server) => ({ host: server, port: 25, tls: true }))

        const buster = new EmailBuster({ servers })

        if (dictionary) {
            const { yieldFileLines } = require('@pown/file')

            try {
                await buster.useDictionary(await yieldFileLines(dictionary))
            }
            catch (e) {
                console.error(e)
            }
        }

        if (!(await buster.calibrate(domain))) {
            console.warn('The selected detection strategy is unfit for purpose and is likely going to result in false-positives.')

            if (!yes) {
                const { prompt } = require('@pown/cli/lib/prompt')

                const result = await prompt({ name: 'continue', type: 'confirm', message: 'Do you want to continue?' })

                if (!result.continue) {
                    return
                }
            }
        }

        const results = []

        for await (const { email, valid, code, message } of buster.bust(domain)) {
            if (!valid) {
                continue
            }

            results.push(email)

            console.log(`${email} -> ${responseCodeColorFuncs[~~(code / 100) % 10](code)} ${message}...`)
        }

        if (!results.length) {
            console.warn(`No emails found.`)
        }
    }
}
