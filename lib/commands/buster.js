exports.yargs = {
    command: 'buster <command>',
    describe: 'Multi-service bruteforcer',

    builder: (yargs) => {
        yargs.command(require('./subcommands/web').yargs)
        yargs.command(require('./subcommands/email').yargs)
    }
}
