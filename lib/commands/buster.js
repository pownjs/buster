exports.yargs = {
    command: 'buster <command>',
    describe: 'Multi-service bruteforce discovery tool',

    aliases: ['bust'],

    builder: (yargs) => {
        yargs.command(require('./subcommands/web').yargs)
        yargs.command(require('./subcommands/email').yargs)
    }
}
