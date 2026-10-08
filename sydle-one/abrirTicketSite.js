/**
 * Método público `abrirTicketSite` — recebe o formulário "Associe-se" da landing page
 * e abre um ticket no Service Desk do SYDLE ONE.
 *
 * Onde colar: em uma classe sua (ex.: "Contato do site"), criando um método
 * com o identificador `abrirTicketSite`, acesso público (anônimo) e este script.
 * O _id dessa classe vai em `CONTACT_API_CLASS_ID`
 * (packages/home-page/src/services/contact-ticket-api.ts).
 *
 * A mesma classe precisa permitir `_upload` anônimo, porque o site envia os anexos
 * para `/_classId/<id da classe>/_upload` antes de chamar este método.
 *
 * Entrada (_input):
 *   { name, phone, email, subject, message, attachments: [{ _id, name, contentType, length, hash }] }
 * Saída:
 *   { code, searchCode }
 */

/* ===== Configuração (ids da instância arave-partner) ===== */

// Classificação do ticket. Crie uma "Associe-se / Contato pelo site" com o
// solicitante (requester) oculto na criação e sem dados adicionais obrigatórios.
const CLASSIFICACAO_ID = '<_id da classificação>';
const CLASSIFICACAO_CLASS_ID = '5d4467ab62d96562758f41a6'; // Classificação do ticket

// Canal "Externo" (já existe).
const CANAL = { _id: '5ee8dd02f36a6f664f57c84e', _classId: '5d4af15162d965627534572b' };

/* ===== Limites (iguais aos do site; nunca confie só no front) ===== */

const LIMITES = {
  name: { min: 3, max: 100 },
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

/* ===== Validação ===== */

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

const entrada = _input || {};

const nome = texto(entrada.name, 'Nome', LIMITES.name);
const assunto = texto(entrada.subject, 'Assunto', LIMITES.subject);
const mensagem = texto(entrada.message, 'Mensagem', LIMITES.message);
const email = texto(entrada.email, 'E-mail', LIMITES.email).toLowerCase();
if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) falhar('Informe um e-mail válido.');

const telefone = String(entrada.phone || '').replace(/\D/g, '');
if (telefone.length < LIMITES.phoneDigits.min || telefone.length > LIMITES.phoneDigits.max) {
  falhar('Informe um telefone com DDD.');
}

const anexos = Array.isArray(entrada.attachments) ? entrada.attachments : [];
if (anexos.length > LIMITES.anexos.maxArquivos) falhar(`Envie no máximo ${LIMITES.anexos.maxArquivos} arquivos.`);
anexos.forEach(arquivo => {
  if (!arquivo || !arquivo._id) falhar('Anexo inválido.');
  if (arquivo.length > LIMITES.anexos.maxBytes) falhar(`O arquivo "${arquivo.name}" passa de 5 MB.`);
  if (arquivo.contentType && TIPOS_ACEITOS.indexOf(arquivo.contentType) === -1) {
    falhar(`O arquivo "${arquivo.name}" não é um formato aceito.`);
  }
});

/* ===== Abertura do ticket ===== */

const telefoneFormatado =
  telefone.length === 11
    ? `(${telefone.slice(0, 2)}) ${telefone.slice(2, 7)}-${telefone.slice(7)}`
    : `(${telefone.slice(0, 2)}) ${telefone.slice(2, 6)}-${telefone.slice(6)}`;

const descricao = [
  `<p><strong>Nome:</strong> ${escaparHtml(nome)}</p>`,
  `<p><strong>Telefone:</strong> ${telefoneFormatado}</p>`,
  `<p><strong>E-mail:</strong> ${escaparHtml(email)}</p>`,
  '<hr>',
  `<p>${escaparHtml(mensagem).replace(/\n/g, '<br>')}</p>`,
].join('');

const novoTicket = {
  title: assunto,
  description: descricao,
  classification: { _id: CLASSIFICACAO_ID, _classId: CLASSIFICACAO_CLASS_ID },
  channel: CANAL,
  attachments: anexos.map(arquivo => ({
    _id: arquivo._id,
    name: arquivo.name,
    contentType: arquivo.contentType,
    length: arquivo.length,
    hash: arquivo.hash,
  })),
};

// Cria o ticket na classe "Ticket" (5d446dfc62d9656275a47d69) do pacote
// "Service Desk - Atendimento". Ajuste o identificador do pacote se for diferente.
const ticket = serviceDesk.ticket._create(novoTicket);

return {
  code: ticket.code,
  searchCode: ticket.searchCode,
};
