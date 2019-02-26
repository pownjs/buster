const net = require('net')
const tls = require('tls')
const dns = require('dns')
const util = require('util')
const readline = require('readline')

const resolveMx = util.promisify(dns.resolveMx.bind(dns))

const findMx = async(domain) => {
    const results = await resolveMx(domain)

    results.sort((a, b) => a.priority - b.priority)

    return results.map(({ exchange }) => exchange)
}

const chatServer = async(port, server, enc = false) => {
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

const bruteforceEmails = async function*(port, server, emails) {
    const chat = await chatServer(port, server)

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

                yield* bruteforceEmails(port, server, emails)

                return
            }

            if (/^250/.test(value)) {
                break
            }
        }

        await chat.write('MAIL FROM: <test@gmail.com>\r\n')

        if ((await chat.next()).done) {
            await chat.end()

            yield* bruteforceEmails(port, server, emails)

            return
        }

        await chat.write(`RCPT TO: <${email}>\r\n`)

        const { value, done } = await chat.next()

        const [parsedCode, ...parsedMessageParts] = value.split(/[-\s]/)

        const code = parseInt(parsedCode)
        const message = parsedMessageParts.join(' ')

        if (code >= 200 && code <= 399) {
            yield { email, valid: true, confident: true, code, message }

            if (done) {
                await chat.end()

                yield* bruteforceEmails(port, server, emails)

                return
            }
        }
        if (!(code >= 500 && code <= 599)) {
            yield { email, valid: true, confident: false, code, message }

            if (done) {
                await chat.end()

                yield* bruteforceEmails(port, server, emails)

                return
            }
        }
        else {
            yield { email, valid: false, confident: true, code, message }
        }
    }

    await chat.end()
}

class Buster {
    constructor(options = {}) {
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

    async calibrate(domain) {
        return true // TODO: add code here
    }

    async * bust(domain) {
        const emails = this.generateEmails(domain)

        const workers = this.servers.map(({ port, host }) => {
            return bruteforceEmails(port, host, emails)
        })

        const handler = async(worker, index) => {
            const { value, done } = await worker.next()

            return { value, done, worker, index }
        }

        const promises = Object.assign({}, ...workers.map((worker, index) => {
            return {
                [index]: handler(worker, index)
            }
        }))

        while (true) {
            const runners = Object.values(promises)

            if (!runners.length) {
                return
            }

            const { value, done, worker, index } = await Promise.race(runners)

            if (value) {
                yield value
            }

            if (done) {
                delete promises[index]
            }
            else {
                promises[index] = handler(worker, index)
            }
        }
    }
}

module.exports = { Buster, bruteforceEmails, findMx }