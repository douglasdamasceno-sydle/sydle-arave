import { CustomAPI, DefaultRestService } from '@sydle/ui-api';

/**
 * Configuração da API no SYDLE ONE: classe "Evento" do pacote "Eventos" (br.com.arave.events),
 * com o método público `listEvents` (script de referência em `home-page/sydle-one/listEvents.js`).
 * Se ficar vazio, a seção do calendário não aparece na home.
 */
export const EVENTS_API_CLASS_ID = '6ade472d4e0f2e3bc0d9b0be';
export const EVENTS_API_METHOD = 'listEvents';

/** Todas as datas do calendário são exibidas no horário de Belo Horizonte. */
export const EVENTS_TIME_ZONE = 'America/Sao_Paulo';

/* `feriado` e `comemorativa` vêm das classes Feriado e Data comemorativa (dia inteiro, não são cadastrados em Evento) */
export type EventCategory = 'esporte' | 'cultura' | 'comunidade' | 'reuniao' | 'feriado' | 'comemorativa';

export const EVENT_CATEGORY_LABEL: Record<EventCategory, string> = {
  esporte: 'Esporte',
  cultura: 'Cultura',
  comunidade: 'Comunidade',
  reuniao: 'Reunião',
  feriado: 'Feriado',
  comemorativa: 'Data comemorativa',
};

export interface ArEvent {
  id: string;
  title: string;
  start: Date;
  end?: Date;
  place?: string;
  description?: string;
  category: EventCategory;
}

/** Cada evento dentro do `eventsJson` devolvido pelo método `listEvents`. */
interface RawEvent {
  _id: string;
  title: string;
  start: string;
  end?: string;
  location?: string;
  description?: string;
  category?: string;
}

interface ListEventsInput {
  from: string;
  to: string;
  /** Máximo de eventos da ARAVE; feriados e datas comemorativas vêm a mais. */
  limit?: number;
  /** false traz só eventos da ARAVE. Padrão no método: true. */
  includeHolidays?: boolean;
}

/* O ambiente não tem campo do tipo JSON, então a lista chega serializada em texto */
interface ListEventsResult {
  eventsJson?: string;
}

export class EventsApiError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = 'EventsApiError';
  }
}

export const isEventsApiConfigured = (): boolean => Boolean(EVENTS_API_CLASS_ID);

/* ===== Datas no fuso de Belo Horizonte ===== */

const dayKeyFormat = new Intl.DateTimeFormat('pt-BR', {
  timeZone: EVENTS_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const timeFormat = new Intl.DateTimeFormat('pt-BR', {
  timeZone: EVENTS_TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

/** Chave do dia no fuso local, ex.: "2026-11-12" (montada pelas partes, sem depender do formato do locale). */
export const toDayKey = (date: Date): string => {
  const parts = Object.fromEntries(dayKeyFormat.formatToParts(date).map((part) => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
};

/** Último instante do evento: o fim é exclusivo, então um evento que acaba à meia-noite não ocupa o dia seguinte. */
export const lastInstant = (event: ArEvent): Date => (event.end ? new Date(event.end.getTime() - 1) : event.start);

/** Hora no padrão do site: "18h", "8h30". */
export const formatHour = (date: Date): string => {
  const [hour, minute] = timeFormat.format(date).split(':');
  return `${Number(hour)}h${minute === '00' ? '' : minute}`;
};

/** Faixa de horário do evento: "18h às 20h", "8h" ou vazio quando o evento não tem hora definida. */
export const formatEventTime = (event: ArEvent): string => {
  const start = formatHour(event.start);
  // Dia inteiro (feriados, datas comemorativas e eventos de 0h a 0h): sem faixa de horário
  if (start === '0h' && (!event.end || formatHour(event.end) === '0h')) return '';
  if (event.end && toDayKey(lastInstant(event)) === toDayKey(event.start)) {
    return `${start} às ${formatHour(event.end)}`;
  }
  return start === '0h' ? '' : start;
};

/* Belo Horizonte está em UTC-3 o ano todo (sem horário de verão desde 2019) */
const UTC_OFFSET_HOURS = 3;

const DAY_MS = 24 * 60 * 60 * 1000;

/** Início do mês (0-11) às 00h no horário de Belo Horizonte. */
const monthStart = (year: number, month: number) => new Date(Date.UTC(year, month, 1, UTC_OFFSET_HOURS));

/** Início do dia de hoje (00h) no horário de Belo Horizonte. */
const todayStart = (now: Date) => new Date(`${toDayKey(now)}T0${UTC_OFFSET_HOURS}:00:00Z`);

/**
 * Período exibido na grade do mês: semanas completas de domingo a sábado,
 * incluindo os dias dos meses vizinhos que aparecem nas pontas.
 */
const gridRange = (year: number, month: number) => {
  const daysBefore = new Date(Date.UTC(year, month, 1)).getUTCDay();
  const daysAfter = 6 - new Date(Date.UTC(year, month + 1, 0)).getUTCDay();
  return {
    from: new Date(monthStart(year, month).getTime() - daysBefore * DAY_MS),
    to: new Date(monthStart(year, month + 1).getTime() + daysAfter * DAY_MS - 1),
  };
};

/* ===== Chamadas ===== */

let restService: DefaultRestService | undefined;
const getRestService = () => (restService ??= new DefaultRestService());

const normalizeCategory = (value?: string): EventCategory => {
  const key = (value ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
  return key in EVENT_CATEGORY_LABEL ? (key as EventCategory) : 'comunidade';
};

const toEvent = (raw: RawEvent): ArEvent => ({
  id: raw._id,
  title: raw.title,
  start: new Date(raw.start),
  end: raw.end ? new Date(raw.end) : undefined,
  place: raw.location || undefined,
  description: raw.description || undefined,
  category: normalizeCategory(raw.category),
});

const parseEvents = (json?: string): RawEvent[] => {
  if (!json) return [];
  try {
    const list = JSON.parse(json);
    return Array.isArray(list) ? list : [];
  } catch {
    throw new EventsApiError('Não foi possível ler os eventos.');
  }
};

const listEvents = async (input: ListEventsInput): Promise<ArEvent[]> => {
  if (!isEventsApiConfigured()) throw new EventsApiError('O calendário ainda não está configurado.');

  const api = new CustomAPI(EVENTS_API_CLASS_ID, getRestService());
  const response = await api.fetch<ListEventsInput, ListEventsResult>(EVENTS_API_METHOD, input, {
    forcePost: true,
    requestParams: { public: true },
  });

  if (response.error) {
    throw new EventsApiError('Não foi possível carregar os eventos. Tente novamente.', response.error.status);
  }
  return parseEvents(response.data?.eventsJson)
    .map(toEvent)
    .filter((event) => event.title && !isNaN(event.start.getTime()));
};

/* Cache por mês: voltar a um mês já visto não refaz a busca */
const monthCache = new Map<string, Promise<ArEvent[]>>();

/**
 * Eventos dos dias exibidos na grade do mês (0-11), ordenados pelo início.
 * Inclui os dias dos meses vizinhos que aparecem nas pontas da grade, para que também mostrem os pontinhos.
 */
export const fetchMonthEvents = (year: number, month: number): Promise<ArEvent[]> => {
  const key = `${year}-${month}`;
  let request = monthCache.get(key);
  if (!request) {
    const { from, to } = gridRange(year, month);
    request = listEvents({ from: from.toISOString(), to: to.toISOString() });
    // Falhas não ficam em cache, para o "Tentar de novo" buscar de verdade
    request.catch(() => monthCache.delete(key));
    monthCache.set(key, request);
  }
  return request;
};

/** Janela da lista "Próximos eventos": a partir de hoje, até esta quantidade de dias e de eventos. */
export const UPCOMING_DAYS = 60;
export const UPCOMING_LIMIT = 6;

/**
 * Próximos eventos de hoje até `UPCOMING_DAYS` dias à frente (no máximo `UPCOMING_LIMIT`).
 * Começa às 00h de hoje para não esconder um evento do dia que já começou.
 */
export const fetchUpcomingEvents = (now = new Date()): Promise<ArEvent[]> => {
  const from = todayStart(now);
  return listEvents({
    from: from.toISOString(),
    to: new Date(from.getTime() + UPCOMING_DAYS * DAY_MS - 1).toISOString(),
    limit: UPCOMING_LIMIT,
  });
};

/** Próximo evento a partir de uma data (procura até 1 ano à frente). */
export const fetchNextEvent = async (after: Date): Promise<ArEvent | undefined> => {
  const limit = new Date(after.getTime() + 365 * DAY_MS);
  // Só eventos da ARAVE: o atalho não deve levar a um feriado
  const [next] = await listEvents({ from: after.toISOString(), to: limit.toISOString(), limit: 1, includeHolidays: false });
  return next;
};
