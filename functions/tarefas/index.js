const TelegramBot = require('node-telegram-bot-api')
const { TELEGRAM_BOT_TOKEN } = process.env
const bot = new TelegramBot(TELEGRAM_BOT_TOKEN)

const { getTarefas } = require('../services/tarefas.js')

module.exports = async function (context, myTimer) {
  bot.sendMessage(process.env.CHAT_ID, 'Hi')
  // const dia = (new Date()).getDay()
  const dia = Math.floor(Math.random() * 7)
  const message = getTarefas(dia)
  bot.sendMessage(process.env.CHAT_ID, message, { parse_mode: 'HTML' })

  const timeStamp = new Date().toISOString()

  if (myTimer.IsPastDue) {
    context.log('JavaScript is running late!')
  }
  context.log('JavaScript timer trigger function ran!', timeStamp)
}
