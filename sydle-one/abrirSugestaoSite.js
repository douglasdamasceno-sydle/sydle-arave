/**
 * Método público `abrirSugestaoSite` da classe "Contato do site" (ContatoSite.abrirSugestaoSite).
 * Recebe o formulário "Sugestões e reclamações" da landing page e abre um ticket na
 * classificação "Sugestões e reclamações" do Service Desk do SYDLE ONE.
 *
 * Nome, e-mail e telefone são opcionais (a pessoa pode enviar de forma anônima); o que vier
 * é gravado no campo "Solicitante (opcional)" dos dados adicionais.
 *
 * Os anexos chegam em base64 na própria chamada (o `_upload` do SYDLE ONE exige login,
 * e esta chamada é anônima); aqui eles viram arquivos com `_util._fileHelper.create`.
 *
 * Entrada (_input):
 *   { type: 'suggestion' | 'complaint', name?, phone?, email?, subject, message,
 *     attachments: [{ name, contentType, length, base64 }] }
 * Saída:
 *   { code, searchCode }
 */

/* ===== Configuração (ids da instância arave-partner) ===== */

const CLASSIFICACAO = { _id: '69f7c368fccc32660bdc48e4', _classId: '5d4467ab62d96562758f41a6' };
const DADOS_ADICIONAIS_CLASS = { _id: '6a064fb10e16c82d5b2bb19b', _classId: '000000000000000000000000' };
const CANAL = { _id: '5ee8dd02f36a6f664f57c84e', _classId: '5d4af15162d965627534572b' }; // Externo

const TIPOS = { suggestion: 'Sugestão', complaint: 'Reclamação' };

/* ===== Limites (iguais aos do site; nunca confie só no front) ===== */

const LIMITES = {
  name: { max: 100 },
  phoneDigits: { min: 10, max: 11 },
  email: { max: 120 },
  subject: { min: 3, max: 120 },
  message: { min: 10, max: 1000 },
  anexos: { maxArquivos: 3, maxBytes: 5 * 1024 * 1024 },
};

const TIPOS_ACEITOS = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

function falhar(mensagem) {
  throw new Error(mensagem);
}

function texto(valor, campo, limite) {
  const v = typeof valor === 'string' ? valor.trim() : '';
  if (limite.min && v.length < limite.min) falhar(`O campo "${campo}" deve ter pelo menos ${limite.min} caracteres.`);
  if (v.length > limite.max) falhar(`O campo "${campo}" deve ter no máximo ${limite.max} caracteres.`);
  return v;
}

function escaparHtml(valor) {
  return valor.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/* ===== Validação da entrada ===== */

const entrada = _input || {};

const tipo = TIPOS[entrada.type];
if (!tipo) falhar('Escolha se é uma sugestão ou uma reclamação.');

const nome = texto(entrada.name, 'Nome', LIMITES.name);
const assunto = texto(entrada.subject, 'Assunto', LIMITES.subject);
const mensagem = texto(entrada.message, 'Mensagem', LIMITES.message);

const email = texto(entrada.email, 'E-mail', LIMITES.email).toLowerCase();
if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) falhar('Informe um e-mail válido.');

const telefone = String(entrada.phone || '').replace(/\D/g, '');
if (telefone && (telefone.length < LIMITES.phoneDigits.min || telefone.length > LIMITES.phoneDigits.max)) {
  falhar('Informe um telefone com DDD.');
}

const anexos = Array.isArray(entrada.attachments) ? entrada.attachments : [];
if (anexos.length > LIMITES.anexos.maxArquivos) falhar(`Envie no máximo ${LIMITES.anexos.maxArquivos} arquivos.`);
anexos.forEach(arquivo => {
  if (!arquivo || typeof arquivo.base64 !== 'string' || !arquivo.base64 || typeof arquivo.name !== 'string') {
    falhar('Anexo inválido.');
  }
  // Tamanho real a partir do base64, sem confiar no `length` informado.
  const bytes = Math.floor((arquivo.base64.length * 3) / 4);
  if (bytes > LIMITES.anexos.maxBytes) falhar(`O arquivo "${arquivo.name}" passa de 5 MB.`);
  if (TIPOS_ACEITOS.indexOf(arquivo.contentType) === -1) {
    falhar(`O arquivo "${arquivo.name}" não é um formato aceito.`);
  }
});

/* ===== Criação do ticket ===== */

const telefoneFormatado = !telefone
  ? ''
  : telefone.length === 11
    ? `(${telefone.slice(0, 2)}) ${telefone.slice(2, 7)}-${telefone.slice(7)}`
    : `(${telefone.slice(0, 2)}) ${telefone.slice(2, 6)}-${telefone.slice(6)}`;

const solicitante = [nome, email, telefoneFormatado].filter(Boolean).join(' · ') || 'Anônimo';

const novoTicket = {
  title: `${tipo}: ${assunto}`,
  description: `<p>${escaparHtml(mensagem).replace(/\n/g, '<br>')}</p>`,
  classification: CLASSIFICACAO,
  channel: CANAL,
  additionalData: {
    _class: DADOS_ADICIONAIS_CLASS,
    requester: solicitante,
    subject: `${tipo}: ${assunto}`,
    message: mensagem,
  },
  attachments: anexos.map(arquivo =>
    _util._fileHelper.create({
      base64: arquivo.base64,
      targetFileName: arquivo.name.replace(/[\\/]/g, '_').slice(0, 150),
      targetContentType: arquivo.contentType,
    }),
  ),
};

// Classe "Ticket" do pacote "Service Desk - Atendimento" (com.sydle.servicedesk.itsm).
const ticket = com.sydle.servicedesk.itsm.ticket._create(novoTicket);

_output = {
  code: ticket.code,
  searchCode: ticket.searchCode,
};
