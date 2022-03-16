const TelegramBot = require('node-telegram-bot-api')
require('dotenv').config()

const { TELEGRAM_BOT_TOKEN, CHAT_ID } = process.env
const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true })

bot.onText(/Perfumes/, (msg) => {
  bot.sendMessage(msg.chat.id, 'Lista de perfumes')
})

bot.onText(/oi/i, (msg) => {
  bot.sendMessage(msg.chat.id, 'Posso ajudar?', {
    reply_markup: {
      keyboard: [['Perfumes']]
    }
  })
})

// bot.setWebHook(`${url}/bot${TOKEN}`);
