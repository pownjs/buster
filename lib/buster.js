const util = require('util')
const { EventEmitter } = require('events')
const { Scheduler } = require('@pown/request/lib/scheduler')

const { eachOfLimit } = require('./async')

class Buster extends EventEmitter {
    constructor(options = {}) {
        super()

        const { namePrefix = '', nameSuffix = '', extensionPrefix, extensionSuffix, loadConcurrency = Number.POSITIVE_INFINITY, requestConcurrency = Number.POSITIVE_INFINITY, ...schedulerOptions } = options

        this.namePrefix = namePrefix
        this.nameSuffix = nameSuffix
        this.extensionPrefix = extensionPrefix
        this.extensionSuffix = extensionSuffix
        this.loadConcurrency = loadConcurrency

        this.scheduler = new Scheduler({ ...schedulerOptions, maxConcurrent: requestConcurrency })

        this.names = []
        this.extensions = []

        this.expectedResponseCodes = []
    }

    useNameDictionary(iterable) {
        this.names.push(iterable)
    }

    useExtensionDictionary(iterable) {
        this.extensions.push(iterable)
    }

    randomName() {
        return this.namePrefix + Math.random().toString(32).slice(2) + this.nameSuffix
    }

    randomExtension() {
        return this.extensionPrefix + Math.random().toString(32).slice(2, 5) + this.extensionSuffix
    }

    async * generateRequest(req) {
        for await (let nameDict of this.names) {
            for await (let name of nameDict) {
                name = name.trim()

                if (!name || name.startsWith('#')) {
                    continue
                }

                name = `${this.namePrefix}${name}${this.nameSuffix}`

                yield { ...req, uri: `${req.uri}${name}` }

                for await (let extensionDict of this.extensions) {
                    for await (let extension of extensionDict) {
                        extension = extension.trim()

                        if (!extension || extension.startsWith('#')) {
                            continue
                        }

                        extension = `${this.extensionPrefix}${extension}${this.extensionSuffix}`

                        yield { ...req, uri: `${req.uri}${name}${extension}` }
                    }
                }
            }

        }
    }

    normalizeRequest(req) {
        const newUri = req.uri.replace(/[?#;].*/g, '').replace(/\/?$/, '/')

        return { ...req, uri: newUri, download: false }
    }

    logResponse(res) {
        this.emit('response', res)
    }

    logTestResponse(res) {
        this.emit('test-response', res)
    }

    async calibrate(req) {
        req = this.normalizeRequest(req)

        const res1 = await this.scheduler.request({ ...req })

        const expectedResponseCodes = []

        this.logTestResponse(res1)

        const res2 = await this.scheduler.request({ ...req, uri: `${req.uri}${this.randomName()}` })

        this.logTestResponse(res2)

        expectedResponseCodes.push(res2.responseCode)

        const res3 = await this.scheduler.request({ ...req, uri: `${req.uri}${this.randomName()}${this.randomExtension()}` })

        this.logTestResponse(res3)

        expectedResponseCodes.push(res3.responseCode)

        this.expectedResponseCodes = Array.from(
            new Set([].concat(this.expectedResponseCodes, expectedResponseCodes))
        ).filter(c => c !== res1.responseCode)

        if (this.expectedResponseCodes.length == 0) {
            console.warn(`No response codes to compare to.`)
        }
    }

    async bust(req) {
        req = this.normalizeRequest(req)

        await this.calibrate(req)

        await eachOfLimit(this.generateRequest(req), this.loadConcurrency, async(req) => {
            const res = await this.scheduler.request(req)

            if (!this.expectedResponseCodes.includes(res.responseCode)) {
                this.logResponse(res)
            }
        })
    }
}

module.exports = { Buster }
