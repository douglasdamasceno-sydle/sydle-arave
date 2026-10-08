import { Component, h, Host, State } from '@stencil/core';

const ECM_BASE_URL = 'https://arave-partner.sydle.one/api/1/main/_ecm/_defaultFile/www';
const LOGO_URL = `${ECM_BASE_URL}/br.com.arave/Imagens/Icons/arave.jpg/`;

const CONTACT_EMAIL = 'projetoarave@gmail.com';
const CONTACT_PHONE_DISPLAY = '(31) 97333-7159';
const CONTACT_PHONE_TEL = '+5531973337159';
const WHATSAPP_URL = 'https://wa.me/5531973337159';
const ADDRESS_STREET = 'Rua Dom Oscar Romero, s/n';
const ADDRESS_CITY = 'Nova Gameleira - Belo Horizonte/MG';
const MAP_QUERY = 'Rua%20Dom%20Oscar%20Romero,%20Nova%20Gameleira,%20Belo%20Horizonte';
const MAP_EMBED_URL = `https://maps.google.com/maps?q=${MAP_QUERY}&t=&z=16&ie=UTF8&iwloc=&output=embed`;
const DIRECTIONS_URL = `https://www.google.com/maps/dir/?api=1&destination=${MAP_QUERY}`;

const SCHEDULE = [
  { days: 'Qua - Sex', hours: '18:00 - 20:00' },
  { days: 'Sábados', hours: '08:00 - 11:30' },
];

type Activity = 'campo' | 'futsal' | 'funcional' | 'artes';

interface ScheduleItem {
  activity: Activity;
  day: string;
  time: string;
  place?: string;
  group?: string;
}

/* Agenda semanal (os treinos de futsal acontecem em escolas parceiras, não na sede) */
const WEEKLY_SCHEDULE: ScheduleItem[] = [
  { activity: 'funcional', day: 'Terça', time: '17h', group: 'Terceira idade' },
  { activity: 'futsal', day: 'Quarta', time: '18h', place: 'Escola João do Patrocínio', group: 'Crianças até 9 anos' },
  {
    activity: 'futsal',
    day: 'Quinta',
    time: '18h',
    place: 'Escola Maria do Socorro',
    group: 'Meninos acima de 9 anos',
  },
  { activity: 'campo', day: 'Sábado', time: '8h', place: 'Campo da Nova Gameleira', group: 'Meninos até 17 anos' },
  { activity: 'artes', day: 'Sábado', time: 'após o treino de campo', group: 'Crianças até 17 anos' },
];

const ACTIVITY_LABEL: Record<Activity, string> = {
  campo: 'Futebol de Campo',
  futsal: 'Futsal',
  funcional: 'Aula de Funcional',
  artes: 'Aula de Artes',
};

const scheduleKey = (item: ScheduleItem) => `${item.activity}-${item.day}`;

const WEEKDAY_INDEX: Record<string, number> = {
  Domingo: 0,
  Segunda: 1,
  Terça: 2,
  Quarta: 3,
  Quinta: 4,
  Sexta: 5,
  Sábado: 6,
};

/* Agenda agrupada por dia, na ordem da semana */
const SCHEDULE_BY_DAY = Object.keys(WEEKDAY_INDEX)
  .map((day) => ({ day, items: WEEKLY_SCHEDULE.filter((item) => item.day === day) }))
  .filter((group) => group.items.length > 0);

/* Resumo curto de uma atividade, ex.: "Qua e Qui, 18h" */
const scheduleSummary = (activity: Activity) => {
  const items = WEEKLY_SCHEDULE.filter((item) => item.activity === activity);
  const days = items.map((item) => item.day.slice(0, 3)).join(' e ');
  const times = Array.from(new Set(items.map((item) => item.time))).join(' / ');
  return `${days}, ${times}`;
};

const HERO_PHOTO_URL = `${ECM_BASE_URL}/pascoa.jpg/`;

/* Ícones de linha (24x24) usados nos cards de informação */
const ICON_PATHS: Record<string, string[]> = {
  pin: ['M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z', 'M12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z'],
  clock: ['M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z', 'M12 6v6l4 2'],
  ball: [
    'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z',
    'm12 7 4.5 3.3-1.7 5.2H9.2l-1.7-5.2Z',
    'M12 2v5M21.5 9.2l-5 1.1M18 20l-3.2-4.5M6 20l3.2-4.5M2.5 9.2l5 1.1',
  ],
  mail: ['M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z', 'm22 6-10 7L2 6'],
  phone: [
    'M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92Z',
  ],
};

const renderIcon = (name: string) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    {ICON_PATHS[name].map((d) => (
      <path key={d} d={d}></path>
    ))}
  </svg>
);

interface Sponsor {
  name: string;
  image?: string;
}

const SPONSORS: Sponsor[] = [
  { name: 'SYDLE', image: `${ECM_BASE_URL}/Patrocinadores/SYDLE.png/` },
  { name: 'Droga Maxi', image: `${ECM_BASE_URL}/Patrocinadores/drogaMaxi.jpeg/` },
  { name: 'Patrocinador 03' },
  { name: 'Patrocinador 04' },
  { name: 'Patrocinador 05' },
  { name: 'Patrocinador 06' },
];

@Component({
  tag: 'sy-lib-home',
  styleUrl: 'scss/index.scss',
  shadow: true,
})
export class Home {
  @State() contactOpen = false;

  private activitiesEl?: HTMLElement;

  private openContact = () => (this.contactOpen = true);
  private scrollToActivities = () => this.activitiesEl?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  private closeContact = () => (this.contactOpen = false);

  private renderSchedule = (activity: Activity) => (
    <ul class="card-schedule">
      {WEEKLY_SCHEDULE.filter((item) => item.activity === activity).map((item) => (
        <li key={scheduleKey(item)}>
          <span class="schedule-when">
            {item.day} · {item.time}
          </span>
          {(item.place || item.group) && (
            <span class="schedule-where">{[item.place, item.group].filter(Boolean).join(' · ')}</span>
          )}
        </li>
      ))}
    </ul>
  );

  private renderSponsorCard = (sponsor: Sponsor) => (
    <div class="sponsor-card">
      {sponsor.image ? <img src={sponsor.image} alt={sponsor.name} /> : <span>{sponsor.name}</span>}
    </div>
  );

  render() {
    return (
      <Host>
        <div class="arave-landing-page">
          {/* Hero: texto à esquerda, foto da turma à direita */}
          <section class="hero-section">
            <div class="hero-inner container">
              <div class="hero-content">
                <div class="hero-brand">
                  <img class="hero-logo" src={LOGO_URL} alt="" />
                  <span>Associação Recreativa dos Amigos da Vila Embaúba</span>
                </div>

                <h1>
                  ARAVE
                  <span class="hero-tagline">Esporte, Lazer e Comunidade</span>
                </h1>
                <p>
                  O ponto de encontro da família em BH. Treinos, cultura, futebol e momentos inesquecíveis em um só
                  lugar.
                </p>

                <div class="hero-actions">
                  <sy-button color="primary" variant="filled" size="large" onClick={this.openContact}>
                    Associe-se Agora
                  </sy-button>
                  <button type="button" class="hero-link" onClick={this.scrollToActivities}>
                    Ver atividades
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M12 5v14M19 12l-7 7-7-7"></path>
                    </svg>
                  </button>
                </div>

                <ul class="hero-highlights">
                  <li>
                    <strong>{Object.keys(ACTIVITY_LABEL).length}</strong> modalidades
                  </li>
                  <li>
                    Da <strong>criançada</strong> à <strong>terceira idade</strong>
                  </li>
                  <li>
                    <strong>Nova Gameleira</strong> · BH
                  </li>
                </ul>
              </div>

              <figure class="hero-media">
                <div class="hero-photo">
                  <img src={HERO_PHOTO_URL} alt="Crianças e professores da ARAVE comemorando juntos no campo" />
                </div>
                <div class="hero-chip chip-top" aria-hidden="true">
                  <span class="chip-icon">{renderIcon('ball')}</span>
                  <span>
                    <strong>Futsal</strong>
                    {scheduleSummary('futsal')}
                  </span>
                </div>
                <div class="hero-chip chip-bottom" aria-hidden="true">
                  <span class="chip-icon">{renderIcon('ball')}</span>
                  <span>
                    <strong>Futebol de Campo</strong>
                    {scheduleSummary('campo')}
                  </span>
                </div>
              </figure>
            </div>

            {/* ONDA MANTIDA APENAS NO HEADER */}
            <div class="hero-wave-divider">
              <svg viewBox="0 0 1200 120" preserveAspectRatio="none">
                <path d="M0,0 C150,90 350,-40 500,60 C650,160 900,10 1200,40 L1200,120 L0,120 Z"></path>
              </svg>
            </div>
          </section>

          {/* Quem Somos (Sem onda no final) */}
          <section class="about-section">
            <div class="container">
              <div class="about-card">
                <h2 class="section-title">Mais que um clube, uma família</h2>
                <p>
                  A <strong>Associação Recreativa dos Amigos da Vila Embaúba - ARAVE</strong> une esporte, saúde e
                  cultura no coração do bairro Nova Gameleira. Oferecemos infraestrutura completa e atividades
                  orientadas para todas as idades.
                </p>
              </div>
            </div>
          </section>

          {/* Modalidades Esportivas (Sem onda no final) */}
          <section class="activities-section" ref={(el) => (this.activitiesEl = el)}>
            <div class="container">
              <span class="section-subtitle">O que acontece na ARAVE</span>
              <h2 class="section-title">Modalidades & Atividades</h2>

              <div class="activities-grid">
                <div class="activity-card campo">
                  <div class="card-bg"></div>
                  <div class="card-badge">Esporte</div>
                  <div class="card-info">
                    <h3>Futebol de Campo</h3>
                    <p>Treino da garotada no gramado da Nova Gameleira, todo fim de semana.</p>
                    {this.renderSchedule('campo')}
                  </div>
                </div>

                <div class="activity-card futsal">
                  <div class="card-bg"></div>
                  <div class="card-badge">Esporte</div>
                  <div class="card-info">
                    <h3>Futebol de Salão</h3>
                    <p>Treinos semanais em escolas parceiras, com turmas separadas por idade.</p>
                    {this.renderSchedule('futsal')}
                  </div>
                </div>

                <div class="activity-card funcional">
                  <div class="card-bg"></div>
                  <div class="card-badge">Saúde</div>
                  <div class="card-info">
                    <h3>Aula de Funcional</h3>
                    <p>Exercícios para a terceira idade: mais disposição, equilíbrio e saúde no dia a dia.</p>
                    {this.renderSchedule('funcional')}
                  </div>
                </div>

                <div class="activity-card artes">
                  <div class="card-bg"></div>
                  <div class="card-badge">Cultura</div>
                  <div class="card-info">
                    <h3>Aulas de Artes</h3>
                    <p>Espaço de criatividade, expressão e oficinas culturais para crianças e adolescentes.</p>
                    {this.renderSchedule('artes')}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Agenda semanal */}
          <section class="schedule-section">
            <div class="container">
              <span class="section-subtitle">Programe-se</span>
              <h2 class="section-title">Agenda semanal</h2>
              <p class="section-lead">Escolha sua turma e venha fazer parte da família ARAVE.</p>

              <div class="schedule-grid">
                {SCHEDULE_BY_DAY.map(({ day, items }) => {
                  const isToday = WEEKDAY_INDEX[day] === new Date().getDay();
                  return (
                    <article key={day} class={{ 'day-card': true, 'is-today': isToday }}>
                      <header class="day-header">
                        <h3>{day}</h3>
                        {isToday && <span class="today-badge">Hoje</span>}
                      </header>

                      <ul class="session-list">
                        {items.map((item) => (
                          <li key={scheduleKey(item)} class={`session session-${item.activity}`}>
                            <span class="session-time">{item.time}</span>
                            <strong class="session-title">{ACTIVITY_LABEL[item.activity]}</strong>
                            {item.place && (
                              <span class="session-place">
                                {renderIcon('pin')}
                                {item.place}
                              </span>
                            )}
                            {item.group && <span class="session-group">{item.group}</span>}
                          </li>
                        ))}
                      </ul>
                    </article>
                  );
                })}
              </div>
            </div>
          </section>

          {/* Patrocinadores */}
          <section class="sponsors-section">
            <div class="container text-center">
              <span class="section-subtitle">Apoiadores do Esporte & Comunidade</span>
              <h2 class="section-title">Nossos Patrocinadores</h2>
            </div>

            <div class="sponsors-carousel">
              <div class="sponsors-track">
                {/* Lista duplicada (via array, não copiada no JSX) para o loop infinito do CSS */}
                {[...SPONSORS, ...SPONSORS].map(this.renderSponsorCard)}
              </div>
            </div>
          </section>

          {/* Localização e Contato */}
          <section class="location-section">
            <div class="container">
              <span class="section-subtitle">Onde Estamos</span>
              <h2 class="section-title">Venha nos conhecer na Nova Gameleira</h2>
              <p class="section-lead">Fácil acesso, ambiente seguro e familiar esperando por você.</p>

              <div class="location-card">
                <div class="location-info">
                  <ul class="info-list">
                    <li class="info-item">
                      <span class="info-icon">{renderIcon('pin')}</span>
                      <div class="info-text">
                        <span class="info-label">Endereço</span>
                        <span class="info-value">
                          {ADDRESS_STREET}
                          <br />
                          {ADDRESS_CITY}
                        </span>
                      </div>
                    </li>

                    <li class="info-item">
                      <span class="info-icon">{renderIcon('clock')}</span>
                      <div class="info-text">
                        <span class="info-label">Funcionamento</span>
                        {SCHEDULE.map((item) => (
                          <span key={item.days} class="info-value">
                            <strong>{item.days}:</strong> {item.hours}
                          </span>
                        ))}
                      </div>
                    </li>

                    <li class="info-item">
                      <span class="info-icon">{renderIcon('mail')}</span>
                      <div class="info-text">
                        <span class="info-label">E-mail</span>
                        <a class="info-value" href={`mailto:${CONTACT_EMAIL}`}>
                          {CONTACT_EMAIL}
                        </a>
                      </div>
                    </li>

                    <li class="info-item">
                      <span class="info-icon">{renderIcon('phone')}</span>
                      <div class="info-text">
                        <span class="info-label">Telefone</span>
                        <a class="info-value" href={`tel:${CONTACT_PHONE_TEL}`}>
                          {CONTACT_PHONE_DISPLAY}
                        </a>
                      </div>
                    </li>
                  </ul>

                  <div class="location-actions">
                    <sy-button color="primary" variant="filled" href={WHATSAPP_URL} target="_blank">
                      Falar no WhatsApp
                    </sy-button>
                    <sy-button color="primary" variant="outlined" href={DIRECTIONS_URL} target="_blank">
                      Como chegar
                    </sy-button>
                  </div>
                </div>

                <div class="map-container">
                  <iframe
                    src={MAP_EMBED_URL}
                    title="Mapa com a localização da ARAVE"
                    width="100%"
                    height="100%"
                    style={{ border: '0' }}
                    allowFullScreen
                    loading="lazy"
                  ></iframe>
                </div>
              </div>
            </div>
          </section>

          {/* Rodapé */}
          <footer class="main-footer">
            <div class="footer-container container">
              <div class="footer-grid">
                <div class="footer-col brand-col">
                  <div class="footer-logo">
                    <img src={LOGO_URL} alt="Logo ARAVE" />
                    <h3>ARAVE</h3>
                  </div>
                  <p class="footer-desc">
                    Associação Recreativa dos Amigos da Vila Embaúba. Promovendo esporte, saúde, lazer e integração
                    comunitária.
                  </p>

                  <div class="social-links">
                    <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      >
                        <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                        <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                      </svg>
                    </a>
                    <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" aria-label="Facebook">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      >
                        <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
                      </svg>
                    </a>
                    <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      >
                        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                      </svg>
                    </a>
                  </div>
                </div>

                <div class="footer-col">
                  <h4>Atividades</h4>
                  <ul>
                    <li>Futebol de Campo</li>
                    <li>Futebol de Salão</li>
                    <li>Aulas de Funcional</li>
                    <li>Oficinas de Artes</li>
                    <li>Eventos Comunitários</li>
                  </ul>
                </div>

                <div class="footer-col">
                  <h4>Funcionamento</h4>
                  <ul class="schedule-list">
                    {SCHEDULE.map((item) => (
                      <li key={item.days}>
                        <strong>{item.days}:</strong> {item.hours}
                      </li>
                    ))}
                  </ul>
                </div>

                <div class="footer-col">
                  <h4>Endereço & Contato</h4>
                  <p class="address-text">
                    📍 {ADDRESS_STREET}
                    <br />
                    {ADDRESS_CITY}
                  </p>
                  <p class="contact-text">
                    📧 {CONTACT_EMAIL}
                    <br />
                    📞 {CONTACT_PHONE_DISPLAY}
                  </p>
                </div>
              </div>

              <div class="footer-bottom">
                <p>© 2026 ARAVE - Associação Recreativa dos Amigos da Vila Embaúba. Todos os direitos reservados.</p>
                <p class="sub-text">Desenvolvido com excelência no SYDLE UI</p>
              </div>
            </div>
          </footer>
        </div>

        <sy-lib-contact-modal
          open={this.contactOpen}
          defaultSubject="Quero me associar à ARAVE"
          onSyLibContactModalClose={this.closeContact}
        ></sy-lib-contact-modal>
      </Host>
    );
  }
}
