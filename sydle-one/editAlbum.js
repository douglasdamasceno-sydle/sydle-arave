/**
 * Método `editAlbum` da classe "Álbum" (Album, 6afdb6cfad623b2aff4f4844, pacote "Galeria") —
 * edita um álbum pela aba "Álbuns" das Consultas do portal
 * (https://portal-arave-partner.sydle.com/servicos/consultas).
 * Acesso do método: EXPLICIT, Administrador e "Gestor de eventos". Contexto: OBJECT.
 *
 * O formulário já abre preenchido com o álbum (script _createDraft do parâmetro: `_input.album = _object`).
 * Na lista de fotos dá para:
 *   - remover uma foto: excluir a linha;
 *   - escrever ou mudar a legenda;
 *   - trocar a capa: a primeira foto da lista é a capa.
 * Foto nova ou trocada aqui também é reduzida pelo `_save` da Foto (albumPhotoSave.js).
 *
 * Entrada (_input):
 *   { album: { title, date, description?, event?, published, photos: [{ _id?, image, thumb?, caption? }] } }
 * Saída: nenhuma (o portal recarrega a lista)
 */

/* ===== Configuração ===== */

const ALBUM_CLASS_ID = '6afdb6cfad623b2aff4f4844';

const LIMITES = {
  title: { min: 3, max: 120 },
  description: { max: 1000 },
  caption: { max: 300 },
  fotosPorAlbum: 200,
};

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

const form = (_input && _input.album) || {};
const id = (_object && _object._id) || form._id;
if (!id) falhar('Álbum não encontrado.');

const titulo = texto(form.title, 'Título', LIMITES.title);
const descricao = texto(form.description, 'Descrição', LIMITES.description);
if (!form.date || isNaN(new Date(form.date).getTime())) falhar('Informe a data do evento.');

const fotos = (form.photos || []).filter(foto => foto && foto.image);
if (!fotos.length) falhar('O álbum precisa de pelo menos uma foto. Para tirar todas, exclua o álbum.');
if (fotos.length > LIMITES.fotosPorAlbum) falhar(`O álbum pode ter no máximo ${LIMITES.fotosPorAlbum} fotos.`);

/* ===== Atualização ===== */

// Parte do álbum gravado: campos que o formulário não mostra (ex.: imageConsent) ficam como estão
const album = _utils.getMethod('_classId', ALBUM_CLASS_ID, '_get')({ _id: id });
if (!album) falhar('Álbum não encontrado. Ele pode ter sido excluído.');

album.title = titulo;
album.date = form.date;
album.description = descricao || null;
album.event = form.event && form.event._id ? { _id: form.event._id, _classId: form.event._classId } : null;
album.published = form.published === true;
// Mantém o _id e a miniatura de cada foto: o _save só refaz a foto cuja imagem mudou
album.photos = fotos.map((foto, i) => ({
  _id: foto._id,
  image: foto.image,
  thumb: foto.thumb,
  caption: texto(foto.caption, `Legenda da foto ${i + 1}`, LIMITES.caption) || null,
}));

_utils.getMethod('_classId', ALBUM_CLASS_ID, '_update')(album);
