const express = require('express')
const app = express()
const os = require('os')
app.get('/', function (req, res) {
  res.send('<h1>Hello World! I am inside the VM! From host ' + os.hostname() + '!</h1>')
})
app.listen(3000, function () {
  console.log('Hello world app listening on port 3000!')
})
