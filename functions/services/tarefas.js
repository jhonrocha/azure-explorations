const t = {
  manha: 'Manhã com Dunkinha',
  noite: 'Noite com Dunkinha',
  loucas: 'Lavar louças',
  varrer: 'Varrer o chão',
  roupas: 'Lavar roupas',
  recolher: 'Recolher roupas',
  lixo: 'Retirar o lixo',
  quintal: 'Limpar o quintal'
}

const tarefas = [
  { jhon: [t.manha, t.varrer, t.lixo, t.roupas], chi: [t.loucas, t.quintal, t.noite] }, // Domingo
  { jhon: [t.manha, t.loucas, t.quintal, t.recolher], chi: [t.varrer, t.lixo, t.noite] }, // Segunda
  { jhon: [t.manha, t.varrer, t.lixo], chi: [t.loucas, t.quintal, t.noite] }, // Terça
  { jhon: [t.manha, t.loucas, t.quintal], chi: [t.varrer, t.lixo, t.noite] }, // Quarta
  { jhon: [t.manha, t.varrer, t.lixo], chi: [t.loucas, t.quintal, t.noite, t.roupas] }, // Quinta
  { jhon: [t.manha, t.loucas, t.quintal], chi: [t.varrer, t.lixo, t.noite, t.recolher] }, // Sexta
  { jhon: [t.manha, t.varrer, t.lixo], chi: [t.loucas, t.quintal, t.noite] } // Sábado
]

function getTarefas (day) {
  const todo = tarefas[day]
  const resp =
    `*** Afazeres Jhon ***\n${todo.jhon.join('\n')}\n\n*** Afazeres Chi ***\n${todo.chi.join('\n')}`
  return resp
}

module.exports = {
  getTarefas
}
