import { CustomAPI, DefaultRestService } from '@sydle/ui-api';

/**
 * Configuração da API no SYDLE ONE: classe "Álbum" do pacote "Galeria" (br.com.arave.gallery),
 * com os métodos públicos `listAlbums` e `photo` (scripts de referência em `home-page/sydle-one/`).
 * Se ficar vazio, a seção da galeria não aparece na home.
 */
export const GALLERY_API_CLASS_ID = '6afdb6cfad623b2aff4f4844';
export const GALLERY_LIST_METHOD = 'listAlbums';
export const GALLERY_PHOTO_METHOD = 'photo';

/** Álbuns por página: os primeiros aparecem de cara, o resto vem no "Ver mais álbuns". */
export const GALLERY_PAGE_SIZE = 6;

/** "thumb" (cerca de 640 px) nos cards; "full" (até 1920 px) na tela cheia. */
export type PhotoSize = 'thumb' | 'full';

export interface AlbumPhoto {
  id: string;
  caption?: string;
  version?: string;
}

export interface Album {
  id: string;
  title: string;
  /** Data do evento, "AAAA-MM-DD". */
  date?: string;
  description?: string;
  eventTitle?: string;
  photos: AlbumPhoto[];
}

export interface AlbumPage {
  albums: Album[];
  total: number;
}

/** Cada álbum dentro do `albumsJson` devolvido pelo método `listAlbums`. */
interface RawAlbum {
  _id: string;
  title: string;
  date?: string;
  description?: string;
  eventTitle?: string;
  photos?: AlbumPhoto[];
}

interface ListAlbumsInput {
  limit: number;
  offset: number;
}

/* O ambiente não tem campo do tipo JSON, então a lista chega serializada em texto */
interface ListAlbumsResult {
  albumsJson?: string;
  total?: number;
}

export class GalleryApiError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = 'GalleryApiError';
  }
}

export const isGalleryApiConfigured = (): boolean => Boolean(GALLERY_API_CLASS_ID);

/* ===== Datas ===== */

/* "AAAA-MM-DD" é uma data de calendário pura: formatada em UTC para não voltar um dia no fuso do Brasil */
const albumDateFormat = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'UTC',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

/** Data do álbum por extenso: "12 de outubro de 2026". */
export const formatAlbumDate = (date?: string): string => {
  const parsed = date ? new Date(`${date}T00:00:00Z`) : undefined;
  return parsed && !isNaN(parsed.getTime()) ? albumDateFormat.format(parsed) : '';
};

/* ===== Chamadas ===== */

let restService: DefaultRestService | undefined;
const getRestService = () => (restService ??= new DefaultRestService());

/**
 * URL da imagem de uma foto. É uma chamada GET ao método público `photo`, montada com a mesma base
 * que a `@sydle/ui-api` usa nas outras chamadas, para ir direto no `<img src>`.
 */
export const photoUrl = (album: Album, photo: AlbumPhoto, size: PhotoSize): string => {
  const { baseUrl, app } = getRestService().config;
  const body = JSON.stringify({ album: album.id, photo: photo.id, size, v: photo.version });
  return `${baseUrl}${app}/_classId/${GALLERY_API_CLASS_ID}/${GALLERY_PHOTO_METHOD}?_body=${encodeURIComponent(body)}`;
};

const toAlbum = (raw: RawAlbum): Album => ({
  id: raw._id,
  title: raw.title,
  date: raw.date || undefined,
  description: raw.description || undefined,
  eventTitle: raw.eventTitle || undefined,
  photos: (raw.photos ?? []).filter((photo) => photo?.id),
});

const parseAlbums = (json?: string): RawAlbum[] => {
  if (!json) return [];
  try {
    const list = JSON.parse(json);
    return Array.isArray(list) ? list : [];
  } catch {
    throw new GalleryApiError('Não foi possível ler os álbuns.');
  }
};

const listAlbums = async (input: ListAlbumsInput): Promise<AlbumPage> => {
  if (!isGalleryApiConfigured()) throw new GalleryApiError('A galeria ainda não está configurada.');

  const api = new CustomAPI(GALLERY_API_CLASS_ID, getRestService());
  const response = await api.fetch<ListAlbumsInput, ListAlbumsResult>(GALLERY_LIST_METHOD, input, {
    forcePost: true,
    requestParams: { public: true },
  });

  if (response.error) {
    throw new GalleryApiError('Não foi possível carregar os álbuns. Tente novamente.', response.error.status);
  }

  const albums = parseAlbums(response.data?.albumsJson)
    .map(toAlbum)
    .filter((album) => album.id && album.title && album.photos.length);
  return { albums, total: Number(response.data?.total) || albums.length };
};

/* Cache por página: reabrir a home na mesma sessão não refaz a busca */
const pageCache = new Map<number, Promise<AlbumPage>>();

/** Uma página de álbuns publicados, do mais recente para o mais antigo. */
export const fetchAlbums = (offset = 0): Promise<AlbumPage> => {
  let request = pageCache.get(offset);
  if (!request) {
    request = listAlbums({ limit: GALLERY_PAGE_SIZE, offset });
    // Falhas não ficam em cache, para o "Tentar de novo" buscar de verdade
    request.catch(() => pageCache.delete(offset));
    pageCache.set(offset, request);
  }
  return request;
};
