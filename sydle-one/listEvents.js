/**
 * Método público `listEvents` da classe "Evento" (pacote "Eventos", br.com.arave.events) —
 * devolve os eventos publicados da ARAVE para o calendário da landing page.
 *
 * Classe: 6ade472d4e0f2e3bc0d9b0be (vai em `EVENTS_API_CLASS_ID`,
 * packages/home-page/src/services/events-api.ts). Acesso do método: público (anônimo).
 *
 * Campos da classe:
 *   title (texto, obrigatório)       start (data e hora, obrigatório)
 *   end (data e hora)                location (texto)
 *   description (texto)              category (esporte | cultura | comunidade | reuniao)
 *   published (booleano: "Publicado no site")
 *
 * Entrada (_input):
 *   { from, to, limit? }   datas em ISO; `limit` é usado para achar o próximo evento
 * Saída (_output):
 *   { eventsJson }   texto JSON com [{ _id, title, start, end, location, description, category }]
 *   (o ambiente não tem campo do tipo JSON; o site faz o JSON.parse)
 */

/* ===== Configuração ===== */

const EVENT_CLASS_ID = '6ade472d4e0f2e3bc0d9b0be';

/* ===== Limites (nunca confie só no front) ===== */

const LIMITES = {
  intervaloMaxDias: 400,
  resultadosMax: 200,
};

/* ===== Validação ===== */

function falhar(mensagem) {
  throw new Error(mensagem);
}

function data(valor, campo) {
  const d = new Date(valor);
  if (!valor || isNaN(d.getTime())) falhar(`O campo "${campo}" deve ser uma data válida.`);
  return d;
}

const entrada = _input || {};

const inicio = data(entrada.from, 'from');
const fim = data(entrada.to, 'to');
if (fim < inicio) falhar('O fim do intervalo deve ser depois do início.');
if (fim - inicio > LIMITES.intervaloMaxDias * 24 * 60 * 60 * 1000) {
  falhar(`O intervalo deve ter no máximo ${LIMITES.intervaloMaxDias} dias.`);
}

const limite = Math.min(Math.max(parseInt(entrada.limit, 10) || LIMITES.resultadosMax, 1), LIMITES.resultadosMax);

/* ===== Busca ===== */

// Eventos publicados que cruzam o intervalo: começam antes do fim do intervalo e
// terminam (ou, sem fim, começam) depois do início do intervalo.
const resultado = _utils.getMethod('_classId', EVENT_CLASS_ID, '_search')({
  query: {
    bool: {
      filter: [{ term: { published: true } }, { range: { start: { lte: fim.toISOString() } } }],
      should: [{ range: { end: { gte: inicio.toISOString() } } }, { range: { start: { gte: inicio.toISOString() } } }],
      minimum_should_match: 1,
    },
  },
  sort: [{ start: 'asc' }],
  size: limite,
});

function iso(valor) {
  return valor ? new Date(valor).toISOString() : undefined;
}

// Só os campos que o site precisa; nada de dados internos do registro.
const events = resultado.hits.hits.map(hit => {
  const evento = hit._source;
  return {
    _id: hit._id,
    title: evento.title,
    start: iso(evento.start),
    end: iso(evento.end),
    location: evento.location,
    description: evento.description,
    category: evento.category,
  };
});

_output.eventsJson = JSON.stringify(events);
