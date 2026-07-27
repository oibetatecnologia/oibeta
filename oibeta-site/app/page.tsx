const PLATFORM_URL = process.env.NEXT_PUBLIC_PLATFORM_URL || 'https://app.oibeta.com.br';

export default function HomePage() {
  return (
    <main className="page-shell">
      <section className="login-card" aria-labelledby="site-title">
        <div className="brand-mark" aria-hidden="true">β</div>
        <h1 id="site-title">Oi Beta</h1>
        <a className="login-button" href={PLATFORM_URL}>
          Entrar na plataforma
        </a>
      </section>
    </main>
  );
}
