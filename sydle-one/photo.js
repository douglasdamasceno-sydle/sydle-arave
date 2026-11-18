/**
 * Método público `photo` da classe "Álbum" (Album, pacote "Galeria", br.com.arave.gallery) —
 * devolve a imagem de uma foto de álbum publicado. A URL deste método vai direto no <img src> da home,
 * porque o campo Arquivo não é acessível para visitantes anônimos.
 *
 * Acesso do método: público (anônimo). Chamado por GET:
 *   /api/1/main/_classId/<ALBUM_CLASS_ID>/photo?_body={"album","photo","size","v"}
 *
 * Entrada (_input):
 *   album   _id do álbum
 *   photo   _id da foto (item embutido em `photos`)
 *   size    "thumb" (miniatura, padrão) ou "full" (até 1920 px)
 *   v       versão da foto, só para a URL mudar quando a foto é trocada; ignorada aqui
 * Saída:
 *   o arquivo, com cache longo; 404 se o álbum não existir, não estiver publicado ou não tiver a foto
 */

/* ===== Configuração ===== */

// Classe "Álbum" (br.com.arave.gallery.Album)
const ALBUM_CLASS_ID = '6afdb6cfad623b2aff4f4844';

const CAMPO_POR_TAMANHO = { thumb: 'thumb', full: 'image' };

// 7 dias: a URL leva a versão da foto, então trocar a foto gera outra URL
const CACHE = 'public, max-age=604800';

const ID_VALIDO = /^[0-9a-f]{24}$/;

/* ===== Busca ===== */

const entrada = _input || {};
const campo = CAMPO_POR_TAMANHO[entrada.size] || 'thumb';

let album = null;
if (typeof entrada.album === 'string' && ID_VALIDO.test(entrada.album)) {
  try {
    album = _utils.getMethod('_classId', ALBUM_CLASS_ID, '_get')({ _id: entrada.album });
  } catch (e) {
    album = null;
  }
}

// Álbum despublicado some do site na hora, inclusive para quem guardou o link da foto
const foto = album && album.published === true ? (album.photos || []).find(item => item && item._id === entrada.photo) : null;
const arquivo = foto && foto[campo];

/* ===== Resposta ===== */

if (!arquivo) {
  _output._response = { status: 404, body: null };
} else {
  // returnFile devolve { _response } em vez de preencher o _output
  const resposta = _utils.ResponseHelper.returnFile(arquivo)._response;
  resposta.headers = Object.assign({}, resposta.headers || {}, {
    'Cache-Control': CACHE,
    // A home roda em portal-arave-partner.sydle.com e a imagem vem de arave-partner.sydle.one
    'Cross-Origin-Resource-Policy': 'cross-origin',
  });
  _output._response = resposta;
}
