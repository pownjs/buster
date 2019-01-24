const eachOfLimit = async(interable, limit, handler) => {
    // TODO: implement limit

    for await (let item of interable) {
        handler(item)
    }
}

module.exports = { eachOfLimit }
