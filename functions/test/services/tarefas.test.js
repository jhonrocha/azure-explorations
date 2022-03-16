const tap = require('tap')
const { getTarefas } = require('../../services/tarefas.js')

tap.test('Test tarefas Return', async () => {
  console.log(getTarefas(0))
  console.log(getTarefas(1))
  console.log(getTarefas(2))
  console.log(getTarefas(3))
  console.log(getTarefas(4))
  console.log(getTarefas(5))
  console.log(getTarefas(6))
  tap.pass('green')
})
