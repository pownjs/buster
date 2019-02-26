const net = require('net')
const tls = require('tls')
const dns = require('dns')
const util = require('util')
const readline = require('readline')
const { generateOfParalel } = require('@pown/async/lib/generateOfParalel')

const { BaseBuster } = require('./base')

const resolveMx = util.promisify(dns.resolveMx.bind(dns))

const findMx = async(domain) => {
    const results = await resolveMx(domain)

    results.sort((a, b) => a.priority - b.priority)

    return results.map(({ exchange }) => exchange)
}

const chatServer = async(port, server, options = {}) => {
    const { enc = false } = options

    const client = await new Promise((resolve, reject) => {
        const client = (enc ? tls : net).connect(port, server, (err) => {
            if (err) {
                reject(err)
            }
            else {
                resolve(client)
            }
        })
    })

    const rl = readline.createInterface({ input: client })

    const it = await rl[Symbol.asyncIterator]()

    return {
        next: () => {
            return it.next()
        },

        write: async(data) => {
            return new Promise((resolve) => {
                client.write(data, resolve)
            })
        },

        end: async(data) => {
            if (data) {
                await new Promise((resolve) => {
                    client.write(data, resolve)
                })
            }

            client.end()
        }
    }
}

const bruteforceEmails = async function*(port, server, emails, options = {}) {
    const { mailFrom = 'test@gmail.com' } = options

    const chat = await chatServer(port, server, options)

    if ((await chat.next()).done) {
        await chat.end()

        return
    }

    await chat.write('HELO HI\r\n')

    if ((await chat.next()).done) {
        await chat.end()

        return
    }

    for await (const email of emails) {
        await chat.write('NOOP\r\n')

        while (true) {
            const { value, done } = await chat.next()

            if (done) {
                await chat.end()

                yield* bruteforceEmails(port, server, emails, options)

                return
            }

            if (/^250/.test(value)) {
                break
            }
        }

        await chat.write('RSET\r\n')

        if ((await chat.next()).done) {
            await chat.end()

            yield* bruteforceEmails(port, server, emails, options)

            return
        }

        await chat.write(`MAIL FROM: <${mailFrom}>\r\n`)

        if ((await chat.next()).done) {
            await chat.end()

            yield* bruteforceEmails(port, server, emails, options)

            return
        }

        await chat.write(`RCPT TO: <${email}>\r\n`)

        const { value, done } = await chat.next()

        const [parsedCode, ...parsedMessageParts] = value.split(/[-\s]/)

        const code = parseInt(parsedCode)
        const message = parsedMessageParts.filter(p => p).join(' ')

        if (code >= 200 && code <= 399) {
            yield { email, valid: true, confident: true, code, message }

            if (done) {
                await chat.end()

                yield* bruteforceEmails(port, server, emails, options)

                return
            }
        }
        if (!(code >= 500 && code <= 599)) {
            yield { email, valid: true, confident: false, code, message }

            if (done) {
                await chat.end()

                yield* bruteforceEmails(port, server, emails, options)

                return
            }
        }
        else {
            yield { email, valid: false, confident: true, code, message }
        }
    }

    await chat.end()
}

class EmailBuster extends BaseBuster {
    constructor(options = {}) {
        super()

        const { servers = [], dictionaries = [] } = options

        this.servers = servers
        this.dictionaries = dictionaries
    }

    useDictionary(iterable) {
        this.dictionaries.push(iterable)
    }

    async * generateEmails(domain) {
        for (const dictionary of this.dictionaries) {
            for await (let word of dictionary) {
                word = word.trim()

                if (!word || word.startsWith('#')) {
                    continue
                }

                yield `${word}@${domain}`
            }
        }
    }

    async * iterateEmails(emails) {
        const workers = this.servers.map(({ port, host, enc }) => {
            return bruteforceEmails(port, host, emails, { enc })
        })

        for await (const item of generateOfParalel(workers)) {
            yield item
        }
    }

    async calibrate(domain) {
        const emails = [
            `${Math.random().toString(32).slice(2)}@${domain}`,
            `${Math.random().toString(32).slice(2)}@${domain}`,
            `${Math.random().toString(32).slice(2)}@${domain}`
        ]

        const valids = []

        for await (const item of this.iterateEmails(emails)) {
            this.emit('test-item', item)

            valids.push(item.valid)
        }

        return !valids.some(valid => valid)
    }

    async bust(domain) {
        for await (const item of this.iterateEmails(this.generateEmails(domain))) {
            this.emit('item', item)
        }
    }
}

module.exports = { EmailBuster, bruteforceEmails, findMx }
