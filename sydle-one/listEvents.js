/**
 * Método público `listEvents` da classe "Evento" (pacote "Eventos", br.com.arave.events) —
 * devolve os eventos publicados da ARAVE, os feriados e as datas comemorativas
 * para o calendário da landing page.
 *
 * Classe: 6ade472d4e0f2e3bc0d9b0be (vai em `EVENTS_API_CLASS_ID`,
 * packages/home-page/src/services/events-api.ts). Acesso do método: público (anônimo).
 *
 * Fontes:
 *   Evento (esta classe)        eventos da ARAVE com published = true
 *   Feriado (plataforma)        feriados do Brasil, de MG e de Belo Horizonte — nada é copiado para Evento
 *   Data comemorativa (ARAVE)   Dia das Mães, Dia das Crianças etc., calculadas para cada ano
 *
 * Entrada (_input):
 *   { from, to, limit?, includeHolidays? }
 *     from, to          datas em ISO
 *     limit             máximo de eventos da ARAVE; feriados e datas comemorativas vêm a mais
 *     includeHolidays   false para trazer só eventos da ARAVE (ex.: atalho "Ver próximo evento"). Padrão: true
 * Saída (_output):
 *   { eventsJson }   texto JSON com [{ _id, title, start, end, location, description, category }]
 *   (o ambiente não tem campo do tipo JSON; o site faz o JSON.parse)
 *   Feriados e datas comemorativas são de dia inteiro: start às 00h e end às 00h do dia seguinte (horário de Brasília).
 */

/* ===== Configuração ===== */

const EVENT_CLASS_ID = '6ade472d4e0f2e3bc0d9b0be';
const HOLIDAY_CLASS_ID = '5994c289116a1f6008f7411e';
// Preencher com o _id da classe "Data comemorativa" depois de criada; vazio = não busca
const COMMEMORATIVE_CLASS_ID = '';

// Abrangência dos feriados: nacionais, de Minas Gerais e de Belo Horizonte
const BRASIL_ID = '590b71c2f5ca53091c89ea4e';
const MG_ID = '590b7f44f5ca5307c8e841cd';
const BH_ID = '590cb810116a1f208c6c7c96';

// Brasília está em UTC-3 o ano todo (sem horário de verão desde 2019)
const UTC_OFFSET_HOURS = 3;
const DIA_MS = 24 * 60 * 60 * 1000;

const DIAS_DA_SEMANA = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];

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
if (fim - inicio > LIMITES.intervaloMaxDias * DIA_MS) {
  falhar(`O intervalo deve ter no máximo ${LIMITES.intervaloMaxDias} dias.`);
}

const limite = Math.min(Math.max(parseInt(entrada.limit, 10) || LIMITES.resultadosMax, 1), LIMITES.resultadosMax);
const incluirFeriados = entrada.includeHolidays !== false;

/* ===== Eventos da ARAVE ===== */

function iso(valor) {
  return valor ? new Date(valor).toISOString() : undefined;
}

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

/* ===== Itens de dia inteiro (feriados e datas comemorativas) ===== */

// Ano (UTC) de cada ponta do intervalo, com folga de 1 ano para cobrir a virada no fuso de Brasília
const anos = [];
for (let ano = inicio.getUTCFullYear() - 1; ano <= fim.getUTCFullYear(); ano++) anos.push(ano);

/**
 * Dia do calendário de uma data salva. Soma 12h antes de ler o dia porque registros antigos
 * guardam a meia-noite no fuso do horário de verão (ex.: 2000-11-02T02:00Z = 2 de novembro).
 */
function diaCivil(valor) {
  const d = new Date(new Date(valor).getTime() + 12 * 60 * 60 * 1000);
  return { ano: d.getUTCFullYear(), mes: d.getUTCMonth(), dia: d.getUTCDate() };
}

/** Item de dia inteiro, se o dia cruzar o intervalo pedido. */
function diaInteiro(id, title, ano, mes, dia, category, description) {
  const comeco = new Date(Date.UTC(ano, mes, dia, UTC_OFFSET_HOURS));
  const termino = new Date(comeco.getTime() + DIA_MS);
  if (comeco > fim || termino <= inicio) return null;
  return {
    _id: `${id}-${ano}`,
    title: title,
    start: comeco.toISOString(),
    end: termino.toISOString(),
    description: description || undefined,
    category: category,
  };
}

/** Feriados do Brasil, de MG e de BH. Os de data fixa repetem o dia e o mês em todos os anos. */
function listarFeriados() {
  const busca = _utils.getMethod('_classId', HOLIDAY_CLASS_ID, '_search')({
    query: {
      bool: {
        // Referências múltiplas são indexadas como nested: o term direto não encontra nada
        should: [
          { nested: { path: 'countries', query: { term: { 'countries._id': BRASIL_ID } } } },
          { nested: { path: 'states', query: { term: { 'states._id': MG_ID } } } },
          { nested: { path: 'cities', query: { term: { 'cities._id': BH_ID } } } },
        ],
        minimum_should_match: 1,
      },
    },
    _source: ['name', 'date', 'fixedDate', 'type'],
    size: 500,
  });

  const itens = [];
  busca.hits.hits.forEach(hit => {
    const feriado = hit._source;
    const datas = (feriado.date || []).map(diaCivil);
    const descricao = feriado.type === 'optionalHoliday' ? 'Ponto facultativo' : undefined;

    if (feriado.fixedDate && datas.length) {
      anos.forEach(ano => itens.push(diaInteiro(hit._id, feriado.name, ano, datas[0].mes, datas[0].dia, 'feriado', descricao)));
    } else {
      datas.forEach(d => itens.push(diaInteiro(hit._id, feriado.name, d.ano, d.mes, d.dia, 'feriado', descricao)));
    }
  });
  return itens;
}

/** Dia do mês da n-ésima ocorrência de um dia da semana (ex.: 2º domingo de maio); null se não existir. */
function enesimoDiaDaSemana(ano, mes, semana, diaDaSemana) {
  const primeiro = new Date(Date.UTC(ano, mes, 1)).getUTCDay();
  const dia = 1 + ((diaDaSemana - primeiro + 7) % 7) + (semana - 1) * 7;
  const diasNoMes = new Date(Date.UTC(ano, mes + 1, 0)).getUTCDate();
  return dia <= diasNoMes ? dia : null;
}

/** Datas comemorativas publicadas, calculadas para cada ano do intervalo. */
function listarDatasComemorativas() {
  if (!COMMEMORATIVE_CLASS_ID) return [];

  const busca = _utils.getMethod('_classId', COMMEMORATIVE_CLASS_ID, '_search')({
    query: { bool: { filter: [{ term: { published: true } }] } },
    size: 200,
  });

  const itens = [];
  busca.hits.hits.forEach(hit => {
    const comemorativa = hit._source;
    const mes = parseInt(comemorativa.month, 10) - 1;
    if (!(mes >= 0 && mes <= 11)) return;

    anos.forEach(ano => {
      let dia = null;
      if (comemorativa.rule === 'diaFixo') {
        dia = parseInt(comemorativa.day, 10) || null;
      } else if (comemorativa.rule === 'diaDaSemana') {
        const diaDaSemana = DIAS_DA_SEMANA.indexOf(comemorativa.weekday);
        const semana = parseInt(comemorativa.weekOfMonth, 10);
        if (diaDaSemana >= 0 && semana >= 1 && semana <= 4) dia = enesimoDiaDaSemana(ano, mes, semana, diaDaSemana);
      }
      if (dia) itens.push(diaInteiro(hit._id, comemorativa.name, ano, mes, dia, 'comemorativa', comemorativa.description));
    });
  });
  return itens;
}

// Feriados e datas comemorativas são complemento: se a busca falhar, o calendário
// continua mostrando os eventos da ARAVE em vez de quebrar.
let extras = [];
if (incluirFeriados) {
  try {
    extras = extras.concat(listarFeriados());
  } catch (e) {
    // sem feriados nesta resposta
  }
  try {
    extras = extras.concat(listarDatasComemorativas());
  } catch (e) {
    // sem datas comemorativas nesta resposta
  }
}

const todos = events
  .concat(extras.filter(Boolean))
  .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

_output.eventsJson = JSON.stringify(todos);
