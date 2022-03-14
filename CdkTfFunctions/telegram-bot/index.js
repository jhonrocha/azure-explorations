const { Telegraf } = require('telegraf')
const { TELEGRAM_BOT_TOKEN } = process.env

console.log('TOKEN:::::', TELEGRAM_BOT_TOKEN)

const bot = new Telegraf(TELEGRAM_BOT_TOKEN)
bot.start((ctx) => { ctx.reply('Hello World!!') })
bot.help((ctx) => ctx.reply('Send me a sticker'))
bot.command('oldschool', (ctx) => ctx.reply('Hello'))
bot.on('sticker', (ctx) => ctx.reply('👍'))
bot.hears('Hi', (ctx) => ctx.reply('Hey there'))

// Enable graceful stop
module.exports = async function (context, req) {
  context.log('>>>>Called', TELEGRAM_BOT_TOKEN)
  if (req.query.setup) {
    context.log('Running setup with:', req.originalUrl.split('?')[0])
    try {
      await bot.telegram.setWebhook(req.originalUrl.split('?')[0].replace('http', 'https'))
      context.res = {
        status: 200,
        body: { ok: true },
        headers: { 'Content-Type': 'application/json' }
      }
    } catch (err) {
      context.log(err)
      context.res = { status: 500, body: err }
    }
  } else {
    return bot.handleUpdate(req.body, context.res)
  }
}
