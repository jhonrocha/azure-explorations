require('dotenv').config()
const TelegramBot = require('node-telegram-bot-api')
const { getSephora, getEpoca } = require('../services/perfumes/index.js')

const { TELEGRAM_BOT_TOKEN, CHAT_ID } = process.env
const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true })

bot.onText(/Perfumes/, (msg) => {
  const epoca = getEpoca()
  const sephora = getSephora()
  bot.sendMessage(msg.chat.id, `Lista de perfumes:\n${sephora}`)
})

bot.onText(/oi/i, (msg) => {
  bot.sendMessage(msg.chat.id, 'Posso ajudar?', {
    reply_markup: {
      keyboard: [['Perfumes']]
    }
  })
})

// Enable graceful stop
module.exports = async function (context, req) {
  if (req.query.setup) {
    try {
      await bot.setWebhook(req.originalUrl.split('?')[0])
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
    await bot.sendMessage(CHAT_ID, 'Hello Everyone!')
    bot.processUpdate(req.body)
    context.res = {
      status: 200,
      body: { ok: true },
      headers: { 'Content-Type': 'application/json' }
    }
  }
}
