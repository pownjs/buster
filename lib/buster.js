const { EventEmitter } = require('events')
const { Scheduler } = require('@pown/request/lib/scheduler')
const { eachOfLimit } = require('@pown/async/lib/eachOfLimit')

class BasicStrategy {
    constructor() {
        this.baseResponseCodes = []
        this.randomResponseCodes = []
    }

    studyBaseResponse(res) {
        this.baseResponseCodes.push(res.responseCode)
    }

    studyRandomResponse(res) {
        this.randomResponseCodes.push(res.responseCode)
    }

    isImportantResponse(res) {
        return !this.randomResponseCodes.includes(res.responseCode)
    }

    canProceed() {
        return !(
            this.randomResponseCodes.some(code => this.baseResponseCodes.includes(code))

            ||

            this.baseResponseCodes.some(code => this.randomResponseCodes.includes(code))
        )
    }
}

class Buster extends EventEmitter {
    constructor(options = {}) {
        super()

        const { namePrefix = '/', nameSuffix = '', extensionPrefix = '.', extensionSuffix = '', loadConcurrency = Number.POSITIVE_INFINITY, requestConcurrency = Number.POSITIVE_INFINITY, ...schedulerOptions } = options

        this.namePrefix = namePrefix
        this.nameSuffix = nameSuffix
        this.extensionPrefix = extensionPrefix
        this.extensionSuffix = extensionSuffix
        this.loadConcurrency = loadConcurrency

        this.scheduler = new Scheduler({ ...schedulerOptions, maxConcurrent: requestConcurrency })

        this.names = []
        this.extensions = []

        this.strategy = new BasicStrategy()
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
        const newUri = req.uri.replace(/[?#;].*/g, '').replace(/\/+?$/, '')

        return { ...req, uri: newUri, download: false }
    }

    warn(...args) {
        this.emit('warn', ...args)
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

        this.strategy.studyBaseResponse(res1)

        this.logTestResponse(res1)

        const res2 = await this.scheduler.request({ ...req, uri: `${req.uri}${this.randomName()}` })

        this.strategy.studyRandomResponse(res2)

        this.logTestResponse(res2)

        const res3 = await this.scheduler.request({ ...req, uri: `${req.uri}${this.randomName()}${this.randomExtension()}` })

        this.strategy.studyRandomResponse(res3)

        this.logTestResponse(res3)

        return this.strategy.canProceed()
    }

    async bust(req) {
        req = this.normalizeRequest(req)

        await eachOfLimit(this.generateRequest(req), this.loadConcurrency, async(req) => {
            const res = await this.scheduler.request(req)

            if (this.strategy.isImportantResponse(res)) {
                this.logResponse(res)
            }
        })
    }
}

module.exports = { Buster, BasicStrategy }
