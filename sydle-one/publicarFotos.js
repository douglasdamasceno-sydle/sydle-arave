/**
 * Método `publicarFotos` da classe "Formulário de álbum" (AlbumForm, 6afdb89cc5ea2162a762d5e3,
 * pacote "Galeria", br.com.arave.gallery), chamado pelo serviço "Publicar fotos" (6afdb8d7c5ea2162a796d9ef)
 * do catálogo "Associação" em https://portal-arave-partner.sydle.com/servicos/.
 * Acesso do método: EXPLICIT, Administrador e "Gestor de eventos".
 *
 * Dois modos (campo `mode`, visibilidade em albumFormMetadata.js):
 *   novo        cria um Álbum já publicado. Recusa se já houver um álbum com o mesmo nome na mesma data
 *   existente   acrescenta as fotos ao álbum escolhido na lista, sem mexer nas que já estão lá
 *
 * A redução das fotos e as miniaturas ficam no `_save` da Foto do álbum (albumPhotoSave.js), que só
 * processa fotos sem miniatura. Como a redução gera arquivos novos, as fotos enviadas pelo formulário
 * podem ir para o Álbum (outra classe).
 *
 * Entrada (_input):
 *   { form: { mode, album?, title?, date?, description?, event?, photos: [arquivo], consent } }
 * Saída:
 *   { message }   HTML que o portal mostra depois do envio
 */

/* ===== Configuração (ids da instância arave-partner) ===== */

// Classe "Álbum" (br.com.arave.gallery.Album)
const ALBUM_CLASS_ID = '6afdb6cfad623b2aff4f4844';
// Classe "Evento", para mostrar o nome do evento ligado ao álbum
const EVENT_CLASS_ID = '6ade472d4e0f2e3bc0d9b0be';
// Home pública, onde fica a galeria
const HOME_URL = 'https://portal-arave-partner.sydle.com/arave/';

/* ===== Limites (o formulário do serviço repete os mesmos) ===== */

const LIMITES = {
  title: { min: 3, max: 120 },
  description: { max: 1000 },
  fotos: { max: 40, maxBytes: 15 * 1024 * 1024 },
  fotosPorAlbum: 200,
};

const TIPOS_ACEITOS = ['image/jpeg', 'image/png'];

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
  return String(valor).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// "Treinos  Arena MILTON" e "treinos arena milton" contam como o mesmo nome
function nomeNormalizado(valor) {
  return String(valor || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function mesmoDia(a, b) {
  return new Date(a).toISOString().slice(0, 10) === new Date(b).toISOString().slice(0, 10);
}

// Conforme a configuração do serviço, o portal entrega os campos soltos ou dentro de `form`
const entrada = (_input && _input.form) || _input || {};
const adicionar = entrada.mode === 'existente';

if (entrada.consent !== true) {
  falhar('Confirme que as pessoas nas fotos, ou os responsáveis pelas crianças, autorizaram o uso de imagem.');
}

const fotos = (entrada.photos || []).filter(Boolean);
if (!fotos.length) falhar('Envie pelo menos uma foto.');
if (fotos.length > LIMITES.fotos.max) falhar(`Envie no máximo ${LIMITES.fotos.max} fotos por vez.`);
fotos.forEach(foto => {
  if (TIPOS_ACEITOS.indexOf(foto.contentType) < 0) falhar(`"${foto.name}" não é uma foto JPEG ou PNG.`);
  if (foto.length > LIMITES.fotos.maxBytes) falhar(`"${foto.name}" passa de 15 MB.`);
});

const novasFotos = fotos.map(foto => ({ image: foto }));

/* ===== Gravação ===== */

const album = adicionar ? adicionarFotos() : criarAlbum();
_output.message = montarMensagem(album);

function adicionarFotos() {
  if (!entrada.album || !entrada.album._id) falhar('Escolha o álbum que vai receber as fotos.');

  let atual;
  try {
    atual = _utils.getMethod('_classId', ALBUM_CLASS_ID, '_get')({ _id: entrada.album._id });
  } catch (e) {
    atual = null;
  }
  if (!atual) falhar('Não encontramos o álbum escolhido. Ele pode ter sido excluído; escolha outro.');

  const existentes = atual.photos || [];
  const total = existentes.length + novasFotos.length;
  if (total > LIMITES.fotosPorAlbum) {
    const cabem = Math.max(LIMITES.fotosPorAlbum - existentes.length, 0);
    falhar(
      `O álbum "${atual.title}" já tem ${existentes.length} fotos e o limite é ${LIMITES.fotosPorAlbum}. ` +
        (cabem ? `Envie no máximo ${cabem} fotos ou crie um álbum novo.` : 'Crie um álbum novo para estas fotos.'),
    );
  }

  // As fotos que já estão no álbum vão como estão: com miniatura, o _save da foto não as refaz
  atual.photos = existentes.concat(novasFotos);
  // As fotos enviadas também passam pela confirmação de uso de imagem
  atual.imageConsent = true;
  _utils.getMethod('_classId', ALBUM_CLASS_ID, '_update')(atual);

  return {
    title: atual.title,
    date: atual.date,
    event: atual.event,
    published: atual.published === true,
    novas: novasFotos.length,
    total: total,
  };
}

function criarAlbum() {
  const titulo = texto(entrada.title, 'Título do álbum', LIMITES.title);
  const descricao = texto(entrada.description, 'Descrição', LIMITES.description);
  if (!entrada.date || isNaN(new Date(entrada.date).getTime())) falhar('Informe a data do evento.');

  // Mesmo nome na mesma data: quase sempre é alguém tentando pôr mais fotos num álbum que já existe
  const dia = new Date(entrada.date).toISOString().slice(0, 10);
  const proximoDia = new Date(new Date(`${dia}T00:00:00Z`).getTime() + 24 * 60 * 60 * 1000).toISOString();
  const mesmaData = _utils.getMethod('_classId', ALBUM_CLASS_ID, '_search')({
    query: { bool: { filter: [{ range: { date: { gte: `${dia}T00:00:00.000Z`, lt: proximoDia } } }] } },
    _source: ['title', 'date'],
    size: 100,
  }).hits.hits;
  const repetido = mesmaData.find(
    hit => mesmoDia(hit._source.date, entrada.date) && nomeNormalizado(hit._source.title) === nomeNormalizado(titulo),
  );
  if (repetido) {
    falhar(
      `Já existe o álbum "${repetido._source.title}" nessa data. ` +
        'Para incluir estas fotos nele, escolha "Adicionar fotos a um álbum existente".',
    );
  }

  const evento = entrada.event && entrada.event._id ? { _id: entrada.event._id, _classId: entrada.event._classId } : undefined;

  _utils.getMethod('_classId', ALBUM_CLASS_ID, '_create')({
    title: titulo,
    // Campo de data sem hora: vai como veio do formulário
    date: entrada.date,
    description: descricao || undefined,
    event: evento,
    published: true,
    // Quem confirmou e quando ficam em _creationUser e _creationDate
    imageConsent: true,
    photos: novasFotos,
  });

  return { title: titulo, date: entrada.date, event: evento, published: true, novas: novasFotos.length };
}

/* ===== Mensagem de confirmação (mesmo modelo do "Cadastro de eventos") ===== */

function doisDigitos(n) {
  return n < 10 ? '0' + n : String(n);
}

// Data sem hora fica gravada à meia-noite UTC: formatar em UTC para não voltar um dia
function formatarData(valor) {
  const d = new Date(valor);
  return `${doisDigitos(d.getUTCDate())}/${doisDigitos(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`;
}

function contarFotos(n) {
  return n === 1 ? '1 foto' : `${n} fotos`;
}

// Complemento: se não achar o evento, a linha some
function tituloDoEvento(evento) {
  if (!evento || !evento._id) return '';
  try {
    const e = _utils.getMethod('_classId', evento._classId || EVENT_CLASS_ID, '_get')({ _id: evento._id });
    return (e && e.title) || '';
  } catch (e) {
    return '';
  }
}

function linha(rotulo, valor, cor) {
  const estilo = cor ? ` style="color: ${cor};"` : '';
  return `<p><span class="label">${rotulo}:</span> <span class="value"${estilo}>${valor}</span></p>`;
}

function montarMensagem(album) {
  const ROXO = '#7c3aed';
  const VERDE = '#16a34a';
  const CINZA = '#64748b';

  const nomeEvento = tituloDoEvento(album.event);
  const titulo = adicionar ? 'Fotos adicionadas!' : 'Álbum publicado!';
  const subtitulo = !album.published
    ? 'As fotos foram salvas, mas o álbum está despublicado.'
    : adicionar
      ? 'As fotos novas já estão no álbum, na galeria da home da ARAVE.'
      : 'As fotos já estão na galeria da home da ARAVE.';

  const linhas = [
    linha('Álbum', escaparHtml(album.title), ROXO),
    album.date ? linha('Data', formatarData(album.date)) : '',
    nomeEvento ? linha('Evento', escaparHtml(nomeEvento)) : '',
    adicionar
      ? linha('Fotos novas', contarFotos(album.novas)) + linha('Total no álbum', contarFotos(album.total))
      : linha('Fotos', contarFotos(album.novas)),
    album.published
      ? linha('No site', 'Sim, já aparece na galeria', VERDE)
      : linha('No site', 'Não, marque "Publicado" no álbum para mostrar', CINZA),
  ].join('\n      ');

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${titulo}</title>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; margin: 0; padding: 0; background-color: #f4f6f8; color: #334155; }
    .container { max-width: 650px; margin: 50px auto; padding: 30px 40px; background: #fff; border-radius: 12px; border-top: 8px solid ${ROXO}; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.05); text-align: center; }
    .success-icon { font-size: 44px; color: ${VERDE}; margin-bottom: 10px; }
    h1 { color: #1e293b; font-size: 1.6em; margin-bottom: 5px; font-weight: 700; }
    h2 { color: #64748b; font-size: 1.05em; margin-top: 0; margin-bottom: 25px; font-weight: 400; }
    .info-section { background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 20px; border-radius: 8px; margin-top: 25px; text-align: left; }
    .info-section p { margin: 8px 0; font-size: 0.95em; }
    .label { font-weight: 600; color: #64748b; display: inline-block; width: 130px; }
    .value { color: #1e293b; font-weight: 700; }
    .button { display: inline-block; margin-top: 25px; padding: 10px 22px; border-radius: 8px; background: ${ROXO}; color: #fff !important; font-weight: 600; text-decoration: none; }
    .hint { margin-top: 20px; font-size: 0.85em; color: #94a3b8; }
    @media (max-width: 480px) { .container { margin: 16px; padding: 24px 20px; } .label { display: block; width: auto; } }
  </style>
</head>
<body>
  <div class="container">
    <div class="success-icon">✔</div>
    <h1>${titulo}</h1>
    <h2>${subtitulo}</h2>

    <div class="info-section">
      ${linhas}
    </div>

    <a class="button" href="${HOME_URL}" target="_blank" rel="noopener">Ver na home</a>

    <p class="hint">Para tirar o álbum do ar, desmarque "Publicado" no cadastro dele.<br>Para enviar mais fotos, abra o serviço novamente.</p>
  </div>
</body>
</html>`;
}
