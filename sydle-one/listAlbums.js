/**
 * Método público `listAlbums` da classe "Álbum" (Album, pacote "Galeria", br.com.arave.gallery) —
 * devolve os álbuns publicados para a galeria de fotos da landing page, do mais recente para o mais antigo.
 *
 * Classe: 6afdb6cfad623b2aff4f4844 (vai em `GALLERY_API_CLASS_ID`, packages/home-page/src/services/gallery-api.ts).
 * Acesso do método: público (anônimo), no mesmo esquema do `listEvents`.
 *
 * Entrada (_input):
 *   { limit?, offset? }   paginação; limit entre 1 e 24 (padrão 6)
 * Saída (_output):
 *   { albumsJson, total }
 *     albumsJson   texto JSON com [{ _id, title, date, description, eventTitle, photos: [{ id, caption, version }] }]
 *                  (o ambiente não tem campo do tipo JSON; o site faz o JSON.parse)
 *     total        quantidade de álbuns publicados, para o botão "Ver mais álbuns"
 *
 * As fotos em si saem pelo método público `photo` (photo.js): aqui vão só os dados para montar as URLs.
 */

/* ===== Configuração ===== */

// Classe "Álbum" (br.com.arave.gallery.Album)
const ALBUM_CLASS_ID = '6afdb6cfad623b2aff4f4844';
const EVENT_CLASS_ID = '6ade472d4e0f2e3bc0d9b0be';

/* ===== Limites (nunca confie só no front) ===== */

const LIMITES = {
  porPagina: 24,
  padrao: 6,
  inicioMax: 5000,
};

/* ===== Entrada ===== */

const entrada = _input || {};
const limite = Math.min(Math.max(parseInt(entrada.limit, 10) || LIMITES.padrao, 1), LIMITES.porPagina);
const inicio = Math.min(Math.max(parseInt(entrada.offset, 10) || 0, 0), LIMITES.inicioMax);

/* ===== Álbuns ===== */

const resultado = _utils.getMethod('_classId', ALBUM_CLASS_ID, '_search')({
  query: { bool: { filter: [{ term: { published: true } }] } },
  sort: [{ date: 'desc' }, { _creationDate: 'desc' }],
  _source: ['title', 'date', 'description', 'event', 'photos'],
  from: inicio,
  size: limite,
  track_total_hits: true,
});

const total = resultado.hits.total;
const quantidade = typeof total === 'number' ? total : (total && total.value) || 0;

/* ===== Título do evento ligado a cada álbum (complemento: se falhar, o álbum sai sem ele) ===== */

const idsDeEvento = resultado.hits.hits
  .map(hit => hit._source.event && hit._source.event._id)
  .filter(Boolean);

const tituloDoEvento = {};
if (idsDeEvento.length) {
  try {
    _utils
      .getMethod('_classId', EVENT_CLASS_ID, '_search')({
        query: { ids: { values: idsDeEvento } },
        _source: ['title'],
        size: idsDeEvento.length,
      })
      .hits.hits.forEach(hit => (tituloDoEvento[hit._id] = hit._source.title));
  } catch (e) {
    // sem títulos de evento nesta resposta
  }
}

/* ===== Saída: só o que o site precisa, nada de dados internos do registro ===== */

function dataSemHora(valor) {
  return valor ? new Date(valor).toISOString().slice(0, 10) : undefined;
}

const albums = resultado.hits.hits.map(hit => {
  const album = hit._source;
  return {
    _id: hit._id,
    title: album.title,
    date: dataSemHora(album.date),
    description: album.description || undefined,
    eventTitle: (album.event && tituloDoEvento[album.event._id]) || undefined,
    // Foto ainda sem miniatura (gravação em andamento) fica de fora
    photos: (album.photos || [])
      .filter(foto => foto && foto._id && foto.image && foto.thumb)
      .map(foto => ({
        id: foto._id,
        caption: foto.caption || undefined,
        // Muda quando a foto é trocada: a URL nova fura o cache do navegador
        version: String(foto.image.hash || foto.image._id).slice(0, 12),
      })),
  };
});

_output.albumsJson = JSON.stringify(albums.filter(album => album.photos.length));
_output.total = quantidade;
