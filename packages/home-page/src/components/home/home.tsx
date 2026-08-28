import { Component, h, Host } from '@stencil/core';

@Component({
  tag: 'sy-lib-home',
  styleUrl: 'scss/index.scss',
  shadow: true,
})
export class Home {
  render() {
    return (
      <Host>
        <div class="arave-landing-page">
          {/* Hero Section COM a onda na base */}
          <section class="hero-section">
            <div class="hero-content container">
              <div class="logo-wrapper">
                <img
                  class="main-logo"
                  src="https://arave-partner.sydle.one/api/1/main/_ecm/_defaultFile/www/br.com.arave/Imagens/Icons/arave.jpg/"
                  alt="Logo da Associação ARAVE"
                />
              </div>

              <h1>ARAVE</h1>
              <h2>Esporte, Lazer e Comunidade</h2>
              <p>
                O ponto de encontro da família em BH. Treinos, cultura, futebol e momentos inesquecíveis em um só lugar.
              </p>

              <div class="cta-wrapper">
                <sy-button color="primary" variant="filled" size="large">
                  Associe-se Agora
                </sy-button>
              </div>
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
          <section class="activities-section">
            <div class="container">
              <span class="section-subtitle">O que acontece na ARAVE</span>
              <h2 class="section-title">Modalidades & Atividades</h2>

              <div class="activities-grid">
                <div class="activity-card campo">
                  <div class="card-bg"></div>
                  <div class="card-badge">Esporte</div>
                  <div class="card-info">
                    <h3>Futebol de Campo</h3>
                    <p>Gramado bem cuidado para os tradicionais campeonatos e peladas de fim de semana.</p>
                  </div>
                </div>

                <div class="activity-card futsal">
                  <div class="card-bg"></div>
                  <div class="card-badge">Esporte</div>
                  <div class="card-info">
                    <h3>Futebol de Salão</h3>
                    <p>Quadra coberta e estruturada para treinos e partidas aceleradas em qualquer clima.</p>
                  </div>
                </div>

                <div class="activity-card funcional">
                  <div class="card-bg"></div>
                  <div class="card-badge">Saúde</div>
                  <div class="card-info">
                    <h3>Aula de Funcional</h3>
                    <p>Exercícios dinâmicos para aumentar a disposição, queimar calorias e fortalecer a saúde.</p>
                  </div>
                </div>

                <div class="activity-card artes">
                  <div class="card-bg"></div>
                  <div class="card-badge">Cultura</div>
                  <div class="card-info">
                    <h3>Aulas de Artes</h3>
                    <p>Espaço de criatividade, expressão e oficinas culturais para crianças e adultos.</p>
                  </div>
                </div>
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
                {/* --- BLOCO ORIGINAL --- */}
                <div class="sponsor-card">
                  <img
                    src="https://arave-partner.sydle.one/api/1/main/_ecm/_defaultFile/www/Patrocinadores/SYDLE.png/"
                    alt="SYDLE"
                  />
                </div>
                <div class="sponsor-card">
                  <img
                    src="https://arave-partner.sydle.one/api/1/main/_ecm/_defaultFile/www/Patrocinadores/drogaMaxi.jpeg/"
                    alt="SYDLE"
                  />
                </div>
                <div class="sponsor-card">
                  <span>Patrocinador 03</span>
                </div>
                <div class="sponsor-card">
                  <span>Patrocinador 04</span>
                </div>
                <div class="sponsor-card">
                  <span>Patrocinador 05</span>
                </div>
                <div class="sponsor-card">
                  <span>Patrocinador 06</span>
                </div>

                {/* --- BLOCO DUPLICADO (Cópia exata para o loop infinito) --- */}
                <div class="sponsor-card">
                  <img
                    src="https://arave-partner.sydle.one/api/1/main/_ecm/_defaultFile/www/Patrocinadores/SYDLE.png/"
                    alt="SYDLE"
                  />
                </div>
                <div class="sponsor-card">
                  <img
                    src="https://arave-partner.sydle.one/api/1/main/_ecm/_defaultFile/www/Patrocinadores/drogaMaxi.jpeg/"
                    alt="SYDLE"
                  />
                </div>
                <div class="sponsor-card">
                  <span>Patrocinador 03</span>
                </div>
                <div class="sponsor-card">
                  <span>Patrocinador 04</span>
                </div>
                <div class="sponsor-card">
                  <span>Patrocinador 05</span>
                </div>
                <div class="sponsor-card">
                  <span>Patrocinador 06</span>
                </div>
              </div>
            </div>
          </section>

          {/* Localização e Contato */}
          <section class="location-section">
            <div class="container">
              <div class="location-grid">
                <div class="location-info">
                  <span class="section-subtitle">Onde Estamos</span>
                  <h2>Venha nos Conhecer na Nova Gameleira</h2>
                  <p class="address">📍 Rua Dom Oscar Romero, s/n, Nova Gameleira - Belo Horizonte/MG</p>
                  <p class="details">Fácil acesso, ambiente seguro e familiar esperando por você.</p>

                  <div class="contact-box">
                    <p>📧 contato@arave.com.br</p>
                    <p>📞 (31) 99999-9999</p>
                    <div class="btn-space">
                      <sy-button color="primary" variant="filled">
                        Falar no WhatsApp
                      </sy-button>
                    </div>
                  </div>
                </div>

                <div class="map-container">
                  <iframe
                    src="https://maps.google.com/maps?q=Rua%20Dom%20Oscar%20Romero,%20Nova%20Gameleira,%20Belo%20Horizonte&t=&z=16&ie=UTF8&iwloc=&output=embed"
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
                    <img
                      src="https://arave-partner.sydle.one/api/1/main/_ecm/_defaultFile/www/br.com.arave/Imagens/Icons/arave.jpg/"
                      alt="Logo ARAVE"
                    />
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
                    <a
                      href="https://wa.me/5531999999999"
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="WhatsApp"
                    >
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
                    <li>
                      <strong>Qua - Sex:</strong> 18:00 - 20:00
                    </li>
                    <li>
                      <strong>Sábados:</strong> 08:00 - 11:30
                    </li>
                  </ul>
                </div>

                <div class="footer-col">
                  <h4>Endereço & Contato</h4>
                  <p class="address-text">
                    📍 Rua Dom Oscar Romero, s/n
                    <br />
                    Nova Gameleira - Belo Horizonte/MG
                  </p>
                  <p class="contact-text">
                    📧 contato@arave.com.br
                    <br />
                    📞 (31) 99999-9999
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
      </Host>
    );
  }
}
