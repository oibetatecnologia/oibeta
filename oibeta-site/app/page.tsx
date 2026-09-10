import Image from 'next/image';
import Link from 'next/link';
import { products } from '../lib/products';

const PLATFORM_URL =
  process.env.NEXT_PUBLIC_PLATFORM_URL || 'https://sis.oibeta.com.br';

const WHATSAPP_URL =
  'https://wa.me/5545991280745?text=Ol%C3%A1%2C%20tenho%20interesse%20em%20uma%20solu%C3%A7%C3%A3o%20da%20OI%20BETA.';

function Arrow() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

function External() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8 16 16 8M10 8h6v6" />
      <path d="M16 14v5H5V8h5" />
    </svg>
  );
}

const markets = [
  'Governo Federal',
  'Ministérios',
  'Governos Estaduais',
  'Prefeituras',
  'Câmaras e Assembleias',
  'Órgãos de Justiça',
  'Autarquias e Consórcios',
  'Empresas privadas',
];

export default function HomePage() {
  const featured = products.find((product) => product.featured)!;
  const others = products.filter((product) => !product.featured);

  return (
    <main>
      <header className="site-header mobile-site-header">
        <a className="brand" href="#inicio" aria-label="OI BETA Tecnologia">
          <Image className="brand-symbol brand-symbol-image" src="/oibeta-icon.png" alt="" width={38} height={38} />
          <span><strong>OI BETA</strong><small>TECNOLOGIA</small></span>
        </a>
        <a className="header-action" href={WHATSAPP_URL} target="_blank" rel="noreferrer">
          Falar no WhatsApp
        </a>
      </header>

      <section className="hero-banner" id="inicio" aria-label="OI BETA Tecnologia">
        <Image
          className="hero-banner-image"
          src="/hero-oibeta-clean.png"
          alt="OI BETA Tecnologia"
          fill
          priority
          sizes="100vw"
        />

        <div className="hero-desktop-layer">
          <div className="hero-brand">
            <Image className="hero-brand-symbol hero-brand-symbol-image" src="/oibeta-icon.png" alt="" width={70} height={70} priority />
            <span>
              <strong>OI BETA</strong>
              <small>TECNOLOGIA</small>
            </span>
          </div>

          <nav className="hero-nav" aria-label="Navegação principal">
            <a href="#solucoes">Soluções</a>
            <a href="#atuacao">Setores</a>
            <a href="#solucoes">Cases</a>
            <a href="#empresa">Sobre</a>
            <a href="#contato">Contato</a>
          </nav>

          <a className="hero-whatsapp-top" href={WHATSAPP_URL} target="_blank" rel="noreferrer">
            <span className="wa-circle">◔</span>
            Falar no WhatsApp
            <Arrow />
          </a>

          <div className="hero-message">
            <h1>
              A OI BETA
              <span><em>aprimora</em> a sua gestão!</span>
            </h1>
            <p>
              Desenvolvemos sistemas e plataformas que impulsionam organizações
              <strong> privadas e públicas</strong> por meio da
              <strong> tecnologia, gestão e pessoas.</strong>
            </p>
            <a className="hero-proposal" href={WHATSAPP_URL} target="_blank" rel="noreferrer">
              Solicite uma proposta <Arrow />
            </a>

            <div className="hero-years">
              <span>Estamos há</span>
              <strong>+8 Anos</strong>
              <small>
                Desenvolvendo soluções que geram
                <b> eficiência, transparência e impacto real.</b>
              </small>
            </div>
          </div>

          <div className="hero-keywords">
            <span>TECNOLOGIA</span>
            <span>DADOS</span>
            <span>GESTÃO</span>
            <span>RESULTADOS</span>
          </div>

          <a className="hero-solutions-link" href="#solucoes">
            <span className="hero-down">↓</span>
            <span>CONHEÇA<br />NOSSAS SOLUÇÕES</span>
          </a>

          <a
          className="hero-whatsapp-card"
          href="https://wa.me/5545991280745"
          target="_blank"
          rel="noreferrer"
          aria-label="Falar com a OI BETA pelo WhatsApp"
        >
          <span className="hero-whatsapp-icon" aria-hidden="true">
            <svg viewBox="0 0 32 32" role="img" focusable="false">
              <path d="M27.3 4.7A15.4 15.4 0 0 0 16.1 0C7.4 0 .3 7 .3 15.7c0 2.8.7 5.5 2.1 7.9L.2 32l8.6-2.2a15.8 15.8 0 0 0 7.3 1.9h.1c8.7 0 15.8-7 15.8-15.7 0-4.2-1.7-8.2-4.7-11.3Zm-11.2 24.4h-.1c-2.3 0-4.6-.6-6.6-1.8l-.5-.3-5.1 1.3 1.4-4.9-.3-.5a13 13 0 0 1-2-6.9C2.9 8.9 8.8 3.1 16.1 3.1c3.5 0 6.8 1.4 9.3 3.8a13 13 0 0 1 3.9 9.3c0 7.2-5.9 12.9-13.2 12.9Zm7.2-9.7c-.4-.2-2.3-1.1-2.7-1.2-.4-.1-.7-.2-1 .2-.3.4-1 1.2-1.3 1.5-.2.3-.5.3-.9.1-.4-.2-1.7-.6-3.2-2-1.2-1-2-2.3-2.2-2.7-.2-.4 0-.6.2-.8l.6-.7c.2-.2.3-.4.4-.7.1-.3.1-.5 0-.7-.1-.2-1-2.3-1.3-3.1-.4-.9-.7-.7-1-.7h-.8c-.3 0-.7.1-1.1.5-.4.4-1.4 1.4-1.4 3.4s1.5 3.9 1.7 4.2c.2.3 3 4.6 7.2 6.4 1 .4 1.8.7 2.4.9 1 .3 1.9.3 2.6.2.8-.1 2.3-.9 2.6-1.8.3-.9.3-1.7.2-1.8-.1-.3-.4-.4-.8-.6Z"/>
            </svg>
          </span>
          <span className="hero-whatsapp-copy">
            <small>Fale agora</small>
            <strong>(45) 99128-0745</strong>
            <em>Atendimento rápido e consultivo</em>
          </span>
        </a>
        </div>

        <div className="hero-mobile-copy">
          <span className="hero-kicker">OI BETA TECNOLOGIA</span>
          <h1>A OI BETA <em>aprimora</em> a sua gestão!</h1>
          <p>
            Desenvolvemos sistemas e plataformas que impulsionam organizações
            privadas e públicas por meio da tecnologia, gestão e pessoas.
          </p>
          <div className="hero-actions">
            <a className="btn btn-primary" href={WHATSAPP_URL} target="_blank" rel="noreferrer">
              Solicite uma proposta <Arrow />
            </a>
            <a className="btn btn-ghost" href="#solucoes">Conheça nossas soluções</a>
          </div>
          <div className="hero-mobile-proof">
            <strong>+8 Anos</strong>
            <span>Desenvolvendo soluções que geram eficiência, transparência e impacto real.</span>
          </div>
        </div>
      </section>

      <section className="featured-product">
        <div className="featured-copy">
          <span className="section-kicker">DESTAQUE</span>
          <h2>{featured.name}</h2>
          <p>{featured.summary}</p>
          <div className="tag-row">
            {featured.solves.slice(0, 5).map((item) => <span key={item}>{item}</span>)}
          </div>
          <div className="featured-actions">
            <Link className="btn btn-primary" href={`/produtos/${featured.slug}`}>
              Ver detalhes <Arrow />
            </Link>
            <a className="text-link" href="https://inteligenciaeleitoral.vercel.app/" target="_blank" rel="noreferrer">
              Acessar sistema <External />
            </a>
          </div>
        </div>

        <div className="featured-visual">
          <div className="mock-app">
            <div className="mock-top">
              <span className="mock-logo">IE</span>
              <span>Inteligência Eleitoral</span>
            </div>
            <div className="mock-body">
              <aside>
                <span className="active" />
                <span />
                <span />
                <span />
                <span />
              </aside>
              <div className="mock-content">
                <div className="mock-kpis">
                  <div><span>Territórios</span><strong>63</strong></div>
                  <div><span>Apoiadores</span><strong>2.600+</strong></div>
                  <div><span>Lideranças</span><strong>170+</strong></div>
                </div>
                <div className="mock-map">
                  <div className="map-grid" />
                  <div className="map-dot one" />
                  <div className="map-dot two" />
                  <div className="map-dot three" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="solutions" id="solucoes">
        <div className="section-heading">
          <div>
            <span className="section-kicker">PORTFÓLIO</span>
            <h2>Soluções para gestão pública, empresas e inteligência aplicada.</h2>
          </div>
          <p>
            Cada produto possui uma página própria com escopo, público, problemas
            resolvidos e modelo de contratação.
          </p>
        </div>

        <div className="solutions-grid">
          {others.map((product) => (
            <article className={`solution-card accent-${product.accent}`} key={product.slug}>
              <div className="solution-number">
                {String(products.indexOf(product) + 1).padStart(2, '0')}
              </div>
              <span className="solution-eyebrow">{product.eyebrow}</span>
              <h3>{product.name}</h3>
              <p>{product.summary}</p>
              <div className="solution-footer">
                <span>{product.audience.slice(0, 2).join(' • ')}</span>
                <Link href={`/produtos/${product.slug}`}>
                  Ver mais <Arrow />
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="market-section" id="atuacao">
        <div className="market-copy">
          <span className="section-kicker">ATUAÇÃO</span>
          <h2>Tecnologia para diferentes estruturas institucionais.</h2>
          <p>
            As soluções da OI BETA são desenhadas para contextos públicos e privados,
            com módulos e implantação ajustados a cada organização.
          </p>
        </div>

        <div className="market-grid">
          {markets.map((market) => (
            <div className="market-card" key={market}>
              <span className="market-icon">β</span>
              <strong>{market}</strong>
              <small>Soluções aplicáveis</small>
            </div>
          ))}
        </div>
      </section>

      <section className="company-section" id="empresa">
        <div className="company-photo">
          <Image src="/lider-oibeta.png" alt="OI BETA Tecnologia" fill sizes="45vw" />
        </div>
        <div className="company-copy">
          <span className="section-kicker">OI BETA</span>
          <h2>Tecnologia construída para resolver problemas reais.</h2>
          <p>
            Desenvolvemos e licenciamos soluções de software com foco em gestão,
            dados, processos digitais, transparência, inteligência eleitoral e
            operação institucional.
          </p>
          <div className="company-stats">
            <div><strong>10</strong><span>produtos comercializáveis</span></div>
            <div><strong>Brasil</strong><span>atuação nacional</span></div>
            <div><strong>Foz do Iguaçu</strong><span>base da empresa</span></div>
          </div>
        </div>
      </section>

      <section className="contact-section" id="contato">
        <div>
          <span className="section-kicker">FALE CONOSCO</span>
          <h2>Quer conhecer uma solução da OI BETA?</h2>
          <p>
            Conte o seu cenário. Podemos apresentar o produto mais adequado e
            organizar uma demonstração.
          </p>
        </div>
        <a className="contact-button" href={WHATSAPP_URL} target="_blank" rel="noreferrer">
          Falar pelo WhatsApp
          <Arrow />
        </a>
      </section>

      <footer className="footer">
        <div className="brand footer-brand">
          <Image className="brand-symbol brand-symbol-image" src="/oibeta-icon.png" alt="" width={38} height={38} />
          <span>
            <strong>OI BETA</strong>
            <small>TECNOLOGIA</small>
          </span>
        </div>
        <div className="footer-links">
          <a href="#solucoes">Soluções</a>
          <a href="#atuacao">Atuação</a>
          <a href="#empresa">Empresa</a>
          <a href={PLATFORM_URL}>SIS OI BETA</a>
        </div>
        <span className="copyright">© 2026 OI BETA LTDA</span>
      </footer>
</main>
  );
}
