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

    await chat.next()

    await chat.write('HELO HI\r\n')

    for await (const email of emails) {
        await chat.write('MAIL FROM: <test@gmail.com>\r\n')
        await chat.next()

        await chat.write(`RCPT TO: <${email}>\r\n`)

        const { value, done } = await chat.next()

        if (done) {
            return
        }

        if (/^250/.test(value)) {
            yield { email, valid: true }
        }
        else {
            yield { email, valid: false }

            await chat.write('NOOP\r\n')

            while (true) {
                const { value, done } = await chat.next()

                if (done) {
                    return
                }

                if (/^250/.test(value)) {
                    break
                }
            }
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

    async * generate(domain) {
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
        const ge = this.generate(domain)

        const workers = this.servers.map(({ port, host }) => {
            return bruteforceEmails(port, host, ge)
        })

        let promises = []

        while (workers.length) {
            promises = promises.concat(workers.map(async(worker, index) => {
                const { value, done } = await worker.next()

                if (done) {
                    workers.splice(workers.indexOf(worker), 1)
                }

                return { value, index }
            }))

            const { value, index } = await Promise.race(promises)

            if (value) {
                yield value
            }

            promises.splice(index, 1)
        }
    }
}

module.exports = { Buster, findMx }
