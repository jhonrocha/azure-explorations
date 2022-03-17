const t = {
  dManha: 'Manhã do Dunkinha',
  dNoite: 'Noite do Dunkinha',
  cLouca: 'Lavar louças',
  cVarre: 'Varrer o chão',
  rLavar: 'Lavar roupas',
  rRecol: 'Recolher roupas',
  lLixos: 'Retirar o lixo',
  lQuint: 'Limpar o quintal'
}

const tarefas = [
  { day: 'FDS', jhon: [t.dManha, t.cVarre, t.lLixos], chi: [t.cLouca, t.lQuint, t.dNoite] }, // Domingo
  { day: 'Seg', jhon: [t.dManha, t.cLouca, t.lQuint, t.rLavar], chi: [t.cVarre, t.lLixos, t.dNoite] }, // Segunda
  { day: 'Ter', jhon: [t.dManha, t.cVarre, t.lLixos, t.rRecol], chi: [t.cLouca, t.lQuint, t.dNoite] }, // Terça
  { day: 'Qua', jhon: [t.dManha, t.cLouca, t.lQuint], chi: [t.cVarre, t.lLixos, t.dNoite] }, // Quarta
  { day: 'Qui', jhon: [t.dManha, t.cVarre, t.lLixos], chi: [t.cLouca, t.lQuint, t.rLavar, t.dNoite] }, // Quinta
  { day: 'Sex', jhon: [t.dManha, t.cLouca, t.lQuint], chi: [t.cVarre, t.lLixos, t.rRecol, t.dNoite] }, // Sexta
  { day: 'FDS', jhon: [t.dManha, t.cVarre, t.lLixos], chi: [t.cLouca, t.lQuint, t.dNoite] } // Sábado
]

function getTarefas (day) {
  if ((day > 6) || (day < 0)) return
  const todo = tarefas[day]
  const resp =
    `<b>*** Afazeres Jhon (${todo.day}) ***</b>\n${todo.jhon.join('\n')}\n\n<b>*** Afazeres Chi (${todo.day}) ***</b>\n${todo.chi.join('\n')}`
  return resp
}

module.exports = {
  getTarefas
}
