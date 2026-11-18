import type { EventEmitter } from '@stencil/core';
import { Component, Event, Fragment, h, Host, State } from '@stencil/core';

import type { Album, AlbumPhoto } from '../../services/gallery-api';
import { fetchAlbums, formatAlbumDate, GALLERY_PAGE_SIZE, photoUrl } from '../../services/gallery-api';
import { renderIcon } from '../../utils/icons';

type LoadStatus = 'loading' | 'ready' | 'error';

/* Deslocamento horizontal mínimo para o toque contar como "passar a foto" */
const SWIPE_MIN_PX = 50;

/* Mesmo número da página: a grade não cresce quando os álbuns chegam */
const SKELETON_CARDS = GALLERY_PAGE_SIZE;

const photoCountLabel = (count: number) => `${count} ${count === 1 ? 'foto' : 'fotos'}`;

/* O evento ligado ao álbum só aparece quando acrescenta algo ao título */
const showEventTitle = (album: Album) => {
  const eventTitle = album.eventTitle?.trim().toLowerCase();
  return Boolean(eventTitle) && eventTitle !== album.title.trim().toLowerCase();
};

@Component({
  tag: 'sy-lib-photo-gallery',
  styleUrl: 'scss/index.scss',
  shadow: true,
})
export class PhotoGallery {
  private dialogEl?: HTMLDialogElement;
  private gridEl?: HTMLElement;

  /* Card que abriu a tela cheia: recebe o foco de volta ao fechar */
  private opener?: HTMLElement;

  private swipeStart?: { x: number; y: number };

  /* Depois do "Ver mais álbuns", o foco vai para o primeiro álbum novo */
  private focusAlbumIndex?: number;

  private preloadedKey?: string;

  @State() status: LoadStatus = 'loading';
  @State() albums: Album[] = [];
  @State() total = 0;
  @State() loadingMore = false;
  @State() moreError = false;
  @State() openAlbum?: Album;
  @State() photoIndex = 0;
  @State() photoStatus: LoadStatus = 'loading';

  /** Disparado quando não há nenhum álbum publicado: a home esconde a seção. */
  @Event() syLibPhotoGalleryEmpty: EventEmitter<void>;

  componentWillLoad() {
    this.load();
  }

  componentDidUpdate() {
    if (this.openAlbum && this.dialogEl && !this.dialogEl.open) {
      this.dialogEl.showModal();
      document.documentElement.style.overflow = 'hidden';
    }

    if (this.openAlbum) this.preloadNeighbors(this.openAlbum);

    if (this.focusAlbumIndex !== undefined) {
      const buttons = this.gridEl?.querySelectorAll<HTMLElement>('.album-open');
      buttons?.[this.focusAlbumIndex]?.focus();
      this.focusAlbumIndex = undefined;
    }
  }

  disconnectedCallback() {
    document.documentElement.style.removeProperty('overflow');
  }

  /* No "Tentar de novo" o botão some com o esqueleto: o foco vai para o primeiro álbum quando eles chegam */
  private async load(fromRetry = false) {
    this.status = 'loading';
    try {
      const page = await fetchAlbums(0);
      this.albums = page.albums;
      this.total = page.total;
      this.status = 'ready';
      if (fromRetry && page.albums.length) this.focusAlbumIndex = 0;
      if (!page.albums.length) this.syLibPhotoGalleryEmpty.emit();
    } catch {
      this.status = 'error';
    }
  }

  private loadMore = async () => {
    if (this.loadingMore) return;
    this.loadingMore = true;
    this.moreError = false;

    try {
      const page = await fetchAlbums(this.albums.length);
      // Um álbum publicado enquanto a página estava aberta desloca a paginação: não repete o que já está na tela
      const known = new Set(this.albums.map((album) => album.id));
      const fresh = page.albums.filter((album) => !known.has(album.id));
      // Sem álbum novo o botão some: o foco vai para o último card em vez de cair no <body>
      this.focusAlbumIndex = fresh.length ? this.albums.length : this.albums.length - 1;
      this.albums = [...this.albums, ...fresh];
      this.total = fresh.length ? page.total : this.albums.length;
    } catch {
      this.moreError = true;
    } finally {
      this.loadingMore = false;
    }
  };

  /* ===== Tela cheia ===== */

  private openLightbox(album: Album, event: MouseEvent) {
    this.opener = event.currentTarget as HTMLElement;
    this.photoIndex = 0;
    this.photoStatus = 'loading';
    this.openAlbum = album;
  }

  private closeLightbox = () => this.dialogEl?.close();

  /* Esc, botão Fechar ou close() por script terminam aqui */
  private handleDialogClose = () => {
    this.openAlbum = undefined;
    this.preloadedKey = undefined;
    document.documentElement.style.removeProperty('overflow');
    this.opener?.focus();
  };

  private goTo(index: number) {
    const count = this.openAlbum?.photos.length ?? 0;
    if (count < 2) return;
    // Dá a volta: da última foto para a primeira e vice-versa
    this.photoIndex = (index + count) % count;
    this.photoStatus = 'loading';
  }

  private prevPhoto = () => this.goTo(this.photoIndex - 1);
  private nextPhoto = () => this.goTo(this.photoIndex + 1);

  private handleKeyDown = (event: KeyboardEvent) => {
    const actions: Record<string, () => void> = {
      ArrowLeft: this.prevPhoto,
      ArrowRight: this.nextPhoto,
      Home: () => this.goTo(0),
      End: () => this.goTo((this.openAlbum?.photos.length ?? 1) - 1),
    };
    const action = actions[event.key];
    if (!action) return;
    event.preventDefault();
    action();
  };

  private handlePointerDown = (event: PointerEvent) => {
    if (!event.isPrimary) return;
    this.swipeStart = { x: event.clientX, y: event.clientY };
  };

  private handlePointerUp = (event: PointerEvent) => {
    if (!this.swipeStart || !event.isPrimary) return;
    const dx = event.clientX - this.swipeStart.x;
    const dy = event.clientY - this.swipeStart.y;
    this.swipeStart = undefined;
    if (Math.abs(dx) < SWIPE_MIN_PX || Math.abs(dx) < Math.abs(dy)) return;
    if (dx < 0) this.nextPhoto();
    else this.prevPhoto();
  };

  private handlePointerCancel = () => (this.swipeStart = undefined);

  /* A próxima e a anterior já ficam no cache do navegador: passar a foto não espera a rede */
  private preloadNeighbors(album: Album) {
    const key = `${album.id}:${this.photoIndex}`;
    if (this.preloadedKey === key) return;
    this.preloadedKey = key;

    const count = album.photos.length;
    if (count < 2) return;
    const neighbors = new Set([(this.photoIndex + 1) % count, (this.photoIndex - 1 + count) % count]);
    neighbors.forEach((index) => {
      const image = new Image();
      image.decoding = 'async';
      image.src = photoUrl(album, album.photos[index], 'full');
    });
  }

  /* ===== Render ===== */

  private renderAlbum(album: Album) {
    const cover = album.photos[0];
    const date = formatAlbumDate(album.date);
    const count = photoCountLabel(album.photos.length);

    return (
      <li key={album.id}>
        <article class="album-card">
          <div class="album-cover">
            <img
              src={photoUrl(album, cover, 'thumb')}
              alt=""
              loading="lazy"
              decoding="async"
            />
          </div>

          <span class="album-count" aria-hidden="true">
            {renderIcon('camera')}
            {count}
          </span>

          <div class="album-info">
            {showEventTitle(album) && <span class="album-event">{album.eventTitle}</span>}
            <h3 class="album-title">
              {/* O botão cobre o card inteiro (::after); o resto do texto fica fora dele para continuar legível */}
              <button type="button" class="album-open" onClick={(event) => this.openLightbox(album, event)}>
                {album.title}
                <span class="visually-hidden">, {count}. Ver fotos</span>
              </button>
            </h3>
            {date && (
              <time class="album-date" dateTime={album.date}>
                {date}
              </time>
            )}
          </div>
        </article>
      </li>
    );
  }

  private renderGrid() {
    if (this.status === 'loading') {
      return (
        <ul class="album-grid" aria-hidden="true">
          {Array.from({ length: SKELETON_CARDS }, (_, index) => (
            <li key={index} class="album-skeleton"></li>
          ))}
        </ul>
      );
    }

    if (this.status === 'error') {
      return (
        <div class="gallery-message" role="alert">
          <p>Não foi possível carregar as fotos.</p>
          <button type="button" class="more-button" onClick={() => this.load(true)}>
            Tentar de novo
          </button>
        </div>
      );
    }

    const hasMore = this.albums.length < this.total;

    return (
      <Fragment>
        <ul class="album-grid" ref={(el) => (this.gridEl = el)}>
          {this.albums.map((album) => this.renderAlbum(album))}
        </ul>

        {(hasMore || this.moreError) && (
          <div class="gallery-more">
            {this.moreError && <p role="alert">Não foi possível carregar mais álbuns.</p>}
            <button
              type="button"
              class="more-button"
              aria-disabled={this.loadingMore ? 'true' : undefined}
              onClick={this.loadMore}
            >
              {this.loadingMore ? 'Carregando…' : this.moreError ? 'Tentar de novo' : 'Ver mais álbuns'}
            </button>
          </div>
        )}
      </Fragment>
    );
  }

  private renderLightbox(album: Album) {
    const count = album.photos.length;
    const photo: AlbumPhoto = album.photos[Math.min(this.photoIndex, count - 1)];
    const position = `${this.photoIndex + 1} de ${count}`;
    const date = formatAlbumDate(album.date);
    // A legenda fica ligada à foto por aria-describedby; repetir no alt faria o leitor de tela ler duas vezes
    const alt = `Foto ${position} do álbum ${album.title}`;

    return (
      <div class="lightbox-shell">
        <header class="lightbox-header">
          <div class="lightbox-heading">
            <h2 id="lightbox-title">{album.title}</h2>
            <p>
              {date && <span>{date} · </span>}
              <span aria-live="polite">Foto {position}</span>
            </p>
          </div>
          <button type="button" class="lightbox-close" aria-label="Fechar" onClick={this.closeLightbox}>
            {renderIcon('close')}
          </button>
        </header>

        <figure
          class={{ 'lightbox-stage': true, 'is-loading': this.photoStatus === 'loading' }}
          aria-describedby={photo.caption ? 'lightbox-caption' : undefined}
          onPointerDown={this.handlePointerDown}
          onPointerUp={this.handlePointerUp}
          onPointerCancel={this.handlePointerCancel}
        >
          {this.photoStatus === 'error' ? (
            <p class="lightbox-error">Não foi possível carregar esta foto.</p>
          ) : (
            <img
              key={photo.id}
              src={photoUrl(album, photo, 'full')}
              alt={alt}
              decoding="async"
              draggable={false}
              onLoad={() => (this.photoStatus = 'ready')}
              onError={() => (this.photoStatus = 'error')}
            />
          )}
        </figure>

        {count > 1 && (
          <Fragment>
            <button type="button" class="lightbox-nav is-prev" aria-label="Foto anterior" onClick={this.prevPhoto}>
              {renderIcon('chevronLeft')}
            </button>
            <button type="button" class="lightbox-nav is-next" aria-label="Próxima foto" onClick={this.nextPhoto}>
              {renderIcon('chevronRight')}
            </button>
          </Fragment>
        )}

        <p class="lightbox-caption" id="lightbox-caption">
          {photo.caption}
        </p>
      </div>
    );
  }

  render() {
    return (
      <Host>
        <div class="gallery" aria-busy={this.status === 'loading' ? 'true' : 'false'}>
          {this.renderGrid()}
        </div>

        <dialog
          ref={(el) => (this.dialogEl = el)}
          class="lightbox"
          aria-labelledby="lightbox-title"
          onClose={this.handleDialogClose}
          onKeyDown={this.handleKeyDown}
        >
          {this.openAlbum && this.renderLightbox(this.openAlbum)}
        </dialog>
      </Host>
    );
  }
}
