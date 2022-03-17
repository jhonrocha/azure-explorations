const TelegramBot = require('node-telegram-bot-api')
const { TELEGRAM_BOT_TOKEN, CHAT_ID } = process.env
const bot = new TelegramBot(TELEGRAM_BOT_TOKEN)

const { getTarefas } = require('../services/tarefas.js')

module.exports = async function (context, myTimer) {
  const dia = (new Date()).getDay()
  const message = getTarefas(dia)
  bot.sendMessage(CHAT_ID, message, { parse_mode: 'HTML' })
}
