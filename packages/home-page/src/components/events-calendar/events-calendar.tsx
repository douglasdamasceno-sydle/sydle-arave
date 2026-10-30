import { Component, Fragment, h, Host, State } from '@stencil/core';

import type { ArEvent } from '../../services/events-api';
import {
  EVENT_CATEGORY_LABEL,
  fetchMonthEvents,
  fetchNextEvent,
  fetchUpcomingEvents,
  formatEventTime,
  lastInstant,
  toDayKey,
  UPCOMING_DAYS,
} from '../../services/events-api';
import { renderIcon } from '../../utils/icons';

type LoadStatus = 'loading' | 'ready' | 'error';

interface CalendarDay {
  key: string;
  day: number;
  inMonth: boolean;
}

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTHS = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
];

const DAY_MS = 24 * 60 * 60 * 1000;

/* Abaixo deste ponto a lista fica embaixo da grade (mesmo valor do SCSS) */
const STACKED_QUERY = '(width <= 900px)';

/* As chaves "AAAA-MM-DD" são datas de calendário puras; contas feitas em UTC para não depender do fuso do navegador */
const keyFromUtc = (date: Date) => date.toISOString().slice(0, 10);
const utcFromKey = (key: string) => new Date(`${key}T00:00:00Z`);

const parseKey = (key: string) => {
  const [year, month, day] = key.split('-').map(Number);
  return { year, month: month - 1, day };
};

/** Semanas do mês (domingo a sábado), completando com os dias dos meses vizinhos. */
const buildMonthGrid = (year: number, month: number): CalendarDay[] => {
  const first = new Date(Date.UTC(year, month, 1));
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const totalCells = Math.ceil((first.getUTCDay() + daysInMonth) / 7) * 7;
  const gridStart = first.getTime() - first.getUTCDay() * DAY_MS;

  return Array.from({ length: totalCells }, (_, index) => {
    const date = new Date(gridStart + index * DAY_MS);
    return { key: keyFromUtc(date), day: date.getUTCDate(), inMonth: date.getUTCMonth() === month };
  });
};

/** Dias (chaves) ocupados por um evento, incluindo os de eventos com mais de um dia. */
const eventDayKeys = (event: ArEvent) => {
  const startKey = toDayKey(event.start);
  const endKey = toDayKey(lastInstant(event));
  const keys: string[] = [];
  for (let time = utcFromKey(startKey).getTime(); time <= utcFromKey(endKey).getTime(); time += DAY_MS) {
    keys.push(keyFromUtc(new Date(time)));
  }
  return keys;
};

const formatLongDay = (key: string) => {
  const { month, day } = parseKey(key);
  return `${day} de ${MONTHS[month]}`;
};

const monthAbbr = (key: string) => MONTHS[parseKey(key).month].slice(0, 3);

/** Primeiro e último dia (chaves) do mês (0-11). */
const monthBounds = (year: number, month: number) => ({
  first: keyFromUtc(new Date(Date.UTC(year, month, 1))),
  last: keyFromUtc(new Date(Date.UTC(year, month + 1, 0))),
});

const countLabel = (count: number) => `${count} ${count > 1 ? 'eventos' : 'evento'}`;

const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

@Component({
  tag: 'sy-lib-events-calendar',
  styleUrl: 'scss/index.scss',
  shadow: true,
})
export class EventsCalendar {
  private todayKey = toDayKey(new Date());
  private listHeaderEl?: HTMLElement;

  /* Ao tocar num dia com a lista embaixo da grade, traz a lista para a tela depois de redesenhar */
  private pendingReveal = false;

  /* Evita que uma resposta atrasada de outro mês sobrescreva o mês atual */
  private requestId = 0;

  @State() year = parseKey(this.todayKey).year;
  @State() month = parseKey(this.todayKey).month;
  @State() status: LoadStatus = 'loading';
  @State() events: ArEvent[] = [];
  @State() selectedKey?: string;
  @State() nextEvent?: ArEvent;

  /* Lista "Próximos eventos": aparece no mês atual quando nenhum dia está selecionado */
  @State() upcomingStatus: LoadStatus = 'loading';
  @State() upcoming: ArEvent[] = [];
  @State() upcomingNext?: ArEvent;

  componentWillLoad() {
    this.load();
    this.loadUpcoming();
  }

  componentDidUpdate() {
    if (!this.pendingReveal) return;
    this.pendingReveal = false;
    this.listHeaderEl?.scrollIntoView({ block: 'nearest', behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  }

  private async load() {
    const requestId = ++this.requestId;
    this.todayKey = toDayKey(new Date());
    this.status = 'loading';
    this.nextEvent = undefined;

    try {
      const events = await fetchMonthEvents(this.year, this.month);
      if (requestId !== this.requestId) return;
      this.events = events;
      this.status = 'ready';
    } catch {
      if (requestId === this.requestId) this.status = 'error';
      return;
    }

    if (!this.monthEvents().length) {
      // Atalho para o próximo evento; se falhar, o mês continua mostrando "sem eventos"
      const after = new Date(Math.max(Date.UTC(this.year, this.month + 1, 1, 3), Date.now()));
      fetchNextEvent(after)
        .then((next) => {
          if (requestId === this.requestId) this.nextEvent = next;
        })
        .catch(() => undefined);
    }
  }

  private async loadUpcoming() {
    this.upcomingStatus = 'loading';
    this.upcomingNext = undefined;

    try {
      this.upcoming = await fetchUpcomingEvents();
      this.upcomingStatus = 'ready';
    } catch {
      this.upcomingStatus = 'error';
      return;
    }

    if (!this.upcoming.length) {
      // Nada nos próximos dias: oferece o atalho para o primeiro evento depois da janela
      const after = new Date(Date.now() + UPCOMING_DAYS * 24 * 60 * 60 * 1000);
      fetchNextEvent(after)
        .then((next) => (this.upcomingNext = next))
        .catch(() => undefined);
    }
  }

  /* No mês atual sem dia selecionado, a lista mostra o que vem pela frente em vez do mês */
  private isUpcomingMode() {
    const today = parseKey(this.todayKey);
    return !this.selectedKey && today.year === this.year && today.month === this.month;
  }

  /* A grade traz também os dias dos meses vizinhos; a lista do mês mostra só o que toca o mês */
  private monthEvents() {
    const { first, last } = monthBounds(this.year, this.month);
    return this.events.filter((event) => toDayKey(event.start) <= last && toDayKey(lastInstant(event)) >= first);
  }

  private goToMonth(year: number, month: number) {
    const date = new Date(Date.UTC(year, month, 1));
    this.year = date.getUTCFullYear();
    this.month = date.getUTCMonth();
    this.selectedKey = undefined;
    this.load();
  }

  private prevMonth = () => this.goToMonth(this.year, this.month - 1);
  private nextMonth = () => this.goToMonth(this.year, this.month + 1);

  private goToToday = () => {
    this.todayKey = toDayKey(new Date());
    const { year, month } = parseKey(this.todayKey);
    this.goToMonth(year, month);
  };

  private goToEvent = (event?: ArEvent) => {
    if (!event) return;
    const key = toDayKey(event.start);
    const { year, month } = parseKey(key);
    this.goToMonth(year, month);
    this.selectedKey = key;
  };

  private selectDay = (day: CalendarDay) => {
    if (!day.inMonth) {
      const { year, month } = parseKey(day.key);
      this.goToMonth(year, month);
    }
    this.selectedKey = this.selectedKey === day.key ? undefined : day.key;
    this.pendingReveal = Boolean(this.selectedKey) && window.matchMedia(STACKED_QUERY).matches;
  };

  private clearSelection = () => (this.selectedKey = undefined);

  private eventsByDay() {
    const map = new Map<string, ArEvent[]>();
    for (const event of this.events) {
      for (const key of eventDayKeys(event)) {
        map.set(key, [...(map.get(key) ?? []), event]);
      }
    }
    return map;
  }

  private isPast(event: ArEvent) {
    return toDayKey(lastInstant(event)) < this.todayKey;
  }

  /* Só os dias com evento são botões: menos paradas no Tab e nenhum toque que leva a uma lista vazia */
  private renderDay(day: CalendarDay, dayEvents: ArEvent[]) {
    const count = dayEvents.length;
    const isToday = day.key === this.todayKey;

    if (!count) {
      return (
        <span
          class={{ 'day': true, 'is-outside': !day.inMonth, 'is-today': isToday }}
          aria-hidden={day.inMonth ? undefined : 'true'}
        >
          {day.inMonth ? day.day : ''}
        </span>
      );
    }

    const categories = Array.from(new Set(dayEvents.map((event) => event.category))).slice(0, 3);
    const isSelected = day.key === this.selectedKey;

    return (
      <button
        type="button"
        class={{ 'day': true, 'has-events': true, 'is-outside': !day.inMonth, 'is-today': isToday, 'is-selected': isSelected }}
        aria-label={`${formatLongDay(day.key)}${isToday ? ', hoje' : ''}, ${countLabel(count)}`}
        aria-pressed={isSelected ? 'true' : 'false'}
        onClick={() => this.selectDay(day)}
      >
        {day.day}
        <span class="day-dots" aria-hidden="true">
          {categories.map((category) => (
            <span key={category} class={`dot dot-${category}`}></span>
          ))}
        </span>
      </button>
    );
  }

  private renderEvent(event: ArEvent) {
    const key = toDayKey(event.start);
    const time = formatEventTime(event);
    const past = this.isPast(event);
    const isToday = !past && key <= this.todayKey;

    return (
      <li key={event.id} class={{ 'event-card': true, [`cat-${event.category}`]: true, 'is-past': past }}>
        <div class="event-date" aria-hidden="true">
          <span class="event-day">{parseKey(key).day}</span>
          <span class="event-month">{monthAbbr(key)}</span>
        </div>
        <div class="event-body">
          <span class="event-category">
            {EVENT_CATEGORY_LABEL[event.category]}
            {isToday && <span class="event-today"> · Hoje</span>}
          </span>
          <h4 class="event-title">{event.title}</h4>
          <span class="visually-hidden">{formatLongDay(key)}</span>
          {(time || event.place) && (
            <div class="event-meta">
              {time && (
                <span>
                  {renderIcon('clock')}
                  {time}
                </span>
              )}
              {event.place && (
                <span>
                  {renderIcon('pin')}
                  {event.place}
                </span>
              )}
            </div>
          )}
          {event.description && <p class="event-description">{event.description}</p>}
        </div>
      </li>
    );
  }

  private renderList(list: ArEvent[]) {
    if (this.status === 'loading') {
      return (
        <ul class="event-list" aria-hidden="true">
          <li class="event-skeleton"></li>
          <li class="event-skeleton"></li>
        </ul>
      );
    }

    if (this.status === 'error') {
      return (
        <div class="list-message">
          <p>Não foi possível carregar os eventos.</p>
          <button type="button" class="text-button" onClick={() => this.load()}>
            Tentar de novo
          </button>
        </div>
      );
    }

    if (!list.length) {
      return (
        <div class="list-message">
          <p>{this.selectedKey ? 'Nenhum evento neste dia.' : 'Nenhum evento neste mês.'}</p>
          {!this.selectedKey && this.nextEvent && (
            <button type="button" class="text-button" onClick={() => this.goToEvent(this.nextEvent)}>
              Ver próximo evento: {formatLongDay(toDayKey(this.nextEvent.start))}
            </button>
          )}
        </div>
      );
    }

    // No mês todo, o que ainda vai acontecer vem primeiro; os encerrados ficam no fim
    const upcoming = this.selectedKey ? list : list.filter((event) => !this.isPast(event));
    const past = this.selectedKey ? [] : list.filter((event) => this.isPast(event));

    return (
      <Fragment>
        {upcoming.length > 0 && <ul class="event-list">{upcoming.map((event) => this.renderEvent(event))}</ul>}
        {past.length > 0 && (
          <Fragment>
            <h4 class="list-group-label">Encerrados</h4>
            <ul class="event-list">{past.map((event) => this.renderEvent(event))}</ul>
          </Fragment>
        )}
      </Fragment>
    );
  }

  /* Próximos eventos agrupados por mês; um evento que já começou entra no mês de hoje */
  private renderUpcoming() {
    if (this.upcomingStatus === 'loading') {
      return (
        <ul class="event-list" aria-hidden="true">
          <li class="event-skeleton"></li>
          <li class="event-skeleton"></li>
        </ul>
      );
    }

    if (this.upcomingStatus === 'error') {
      return (
        <div class="list-message">
          <p>Não foi possível carregar os eventos.</p>
          <button type="button" class="text-button" onClick={() => this.loadUpcoming()}>
            Tentar de novo
          </button>
        </div>
      );
    }

    if (!this.upcoming.length) {
      return (
        <div class="list-message">
          <p>Nenhum evento nos próximos {UPCOMING_DAYS} dias.</p>
          {this.upcomingNext && (
            <button type="button" class="text-button" onClick={() => this.goToEvent(this.upcomingNext)}>
              Ver próximo evento: {formatLongDay(toDayKey(this.upcomingNext.start))}
            </button>
          )}
        </div>
      );
    }

    const groups = new Map<string, ArEvent[]>();
    for (const event of this.upcoming) {
      const startKey = toDayKey(event.start);
      const { year, month } = parseKey(startKey < this.todayKey ? this.todayKey : startKey);
      const key = `${year}-${month}`;
      groups.set(key, [...(groups.get(key) ?? []), event]);
    }

    // Só os dois primeiros meses, cada um em sua coluna
    return (
      <div class="month-columns">
        {Array.from(groups.entries())
          .slice(0, 2)
          .map(([key, events]) => (
            <section key={key} class="month-column">
              <h4 class="list-group-label">{MONTHS[Number(key.split('-')[1])]}</h4>
              <ul class="event-list">{events.map((event) => this.renderEvent(event))}</ul>
            </section>
          ))}
      </div>
    );
  }

  /* Resumo curto para leitor de tela, em vez de anunciar a lista inteira a cada troca */
  private statusMessage(list: ArEvent[]) {
    if (this.isUpcomingMode()) {
      if (this.upcomingStatus === 'loading') return '';
      if (this.upcomingStatus === 'error') return 'Não foi possível carregar os eventos.';
      return this.upcoming.length
        ? `${countLabel(this.upcoming.length)} nos próximos ${UPCOMING_DAYS} dias`
        : `Nenhum evento nos próximos ${UPCOMING_DAYS} dias`;
    }
    if (this.status === 'loading') return '';
    if (this.status === 'error') return 'Não foi possível carregar os eventos.';
    const where = this.selectedKey ? formatLongDay(this.selectedKey) : `${MONTHS[this.month]} de ${this.year}`;
    return list.length ? `${countLabel(list.length)} em ${where}` : `Nenhum evento em ${where}`;
  }

  render() {
    const grid = buildMonthGrid(this.year, this.month);
    const eventsByDay = this.status === 'ready' ? this.eventsByDay() : new Map<string, ArEvent[]>();
    const list = this.selectedKey ? eventsByDay.get(this.selectedKey) ?? [] : this.monthEvents();
    const upcomingMode = this.isUpcomingMode();
    const monthName = MONTHS[this.month];
    const today = parseKey(this.todayKey);
    const isCurrentMonth = today.year === this.year && today.month === this.month;
    const listTitle = this.selectedKey
      ? `Eventos em ${formatLongDay(this.selectedKey)}`
      : upcomingMode
        ? 'Próximos eventos'
        : `Eventos de ${monthName}`;

    return (
      <Host>
        <div class="calendar-layout">
          <div class="calendar-card" aria-busy={this.status === 'loading' ? 'true' : 'false'}>
            <header class="calendar-header">
              <h3 class="month-title">
                {monthName} <span>{this.year}</span>
              </h3>
              <div class="calendar-nav">
                {!isCurrentMonth && (
                  <button type="button" class="today-button" onClick={this.goToToday}>
                    Hoje
                  </button>
                )}
                <button type="button" class="nav-button" aria-label="Mês anterior" onClick={this.prevMonth}>
                  {renderIcon('chevronLeft')}
                </button>
                <button type="button" class="nav-button" aria-label="Próximo mês" onClick={this.nextMonth}>
                  {renderIcon('chevronRight')}
                </button>
              </div>
            </header>

            <div class="weekdays" aria-hidden="true">
              {WEEKDAYS.map((weekday) => (
                <span key={weekday}>{weekday}</span>
              ))}
            </div>

            <div class="days">
              {grid.map((day) => (
                <div key={day.key} class="day-cell">
                  {this.renderDay(day, eventsByDay.get(day.key) ?? [])}
                </div>
              ))}
            </div>

            <ul class="legend" aria-label="Categorias">
              {(Object.keys(EVENT_CATEGORY_LABEL) as (keyof typeof EVENT_CATEGORY_LABEL)[]).map((category) => (
                <li key={category}>
                  <span class={`dot dot-${category}`} aria-hidden="true"></span>
                  {EVENT_CATEGORY_LABEL[category]}
                </li>
              ))}
            </ul>
          </div>

          <div class="list-panel">
            <header class="list-header" ref={(el) => (this.listHeaderEl = el)}>
              <h3>{listTitle}</h3>
              {this.selectedKey && (
                <button type="button" class="text-button" onClick={this.clearSelection}>
                  Ver o mês todo
                </button>
              )}
            </header>
            <p class="visually-hidden" role="status">
              {this.statusMessage(list)}
            </p>
            {upcomingMode ? this.renderUpcoming() : this.renderList(list)}
          </div>
        </div>
      </Host>
    );
  }
}
