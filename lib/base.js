const { EventEmitter } = require('events')

class BaseBuster extends EventEmitter {
    constructor() {
        super()
    }

    log(...args) {
        this.emit('log', ...args)
    }

    info(...args) {
        this.emit('info', ...args)
    }

    warn(...args) {
        this.emit('warn', ...args)
    }

    error(...args) {
        this.emit('error', ...args)
    }

    async calibrate() {}

    async bust() {}
}

module.exports = { BaseBuster }
