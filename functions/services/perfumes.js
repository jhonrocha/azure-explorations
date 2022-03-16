const axios = require('axios')
const https = require('https')

const request = axios.create({
  httpsAgent: new https.Agent({
    rejectUnauthorized: false
  })
})

async function getSephora () {
  // const resp = await axios.get('https://www.sephora.com.br/perfumes/masculino/masculino/?srule=DiscountDesc&start=0&sz=36')
  request
    .get('https://www.sephora.com.br/perfumes/masculino/masculino/?srule=DiscountDesc&start=0&sz=36')
    .then(res => {
      console.log(`statusCode: ${res.status}`)
      console.log(res)
    })
    .catch(error => {
      console.error(error)
    })
  return 'asdf'
}

async function getEpoca () {
  return 'Epoca List:'
}

module.exports = {
  getSephora,
  getEpoca
}
