const TelegramBot = require('node-telegram-bot-api')

const { TELEGRAM_BOT_TOKEN, CHAT_ID } = process.env
const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true })

bot.onText(/perfumes/i, (msg) => {
  console.log(CHAT_ID)
  bot.sendMessage(msg.chat.id, 'Lista de perfumes:')
})

bot.onText(/oi/i, (msg) => {
  bot.sendMessage(msg.chat.id, 'Posso ajudar?', {
    reply_markup: {
      keyboard: [['perfumes']]
    }
  })
})

// Enable graceful stop
module.exports = async function (context, req) {
  if (req.query.setup) {
    try {
      await bot.setWebHook(req.originalUrl.split('?')[0].replace('http:', 'https:'))
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
    bot.processUpdate(req.body)
    context.res = {
      status: 200,
      body: { health: true },
      headers: { 'Content-Type': 'application/json' }
    }
  }
}
