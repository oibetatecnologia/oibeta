import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getProduct, products } from '../../../lib/products';

const WHATSAPP_URL =
  'https://wa.me/5545991280745?text=Ol%C3%A1%2C%20tenho%20interesse%20em%20uma%20solu%C3%A7%C3%A3o%20da%20OI%20BETA.';

export function generateStaticParams() {
  return products.map((product) => ({ slug: product.slug }));
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = getProduct(slug);

  if (!product) notFound();

  return (
    <main className="product-page">
      <header className="product-header">
        <Link className="brand" href="/">
          <span className="brand-symbol">β</span>
          <span>
            <strong>OI BETA</strong>
            <small>TECNOLOGIA</small>
          </span>
        </Link>
        <Link className="back-link" href="/#solucoes">← Voltar ao portfólio</Link>
      </header>

      <section className={`product-hero accent-${product.accent}`}>
        <span className="section-kicker">{product.eyebrow}</span>
        <h1>{product.name}</h1>
        <p>{product.summary}</p>

        <div className="product-hero-actions">
          <a className="btn btn-primary" href={WHATSAPP_URL} target="_blank" rel="noreferrer">
            Solicitar apresentação
          </a>
          <Link className="btn btn-ghost" href="/">Conhecer a OI BETA</Link>
        </div>
      </section>

      <section className="product-detail-grid">
        <article className="detail-block">
          <span className="detail-label">PARA QUEM</span>
          <h2>Quem utiliza esta solução</h2>
          <div className="detail-list">
            {product.audience.map((item) => <span key={item}>{item}</span>)}
          </div>
        </article>

        <article className="detail-block">
          <span className="detail-label">O QUE RESOLVE</span>
          <h2>Principais capacidades</h2>
          <ul>
            {product.solves.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </article>

        <article className="detail-block detail-wide">
          <span className="detail-label">MODELO COMERCIAL</span>
          <h2>Como a solução pode ser contratada</h2>
          <p>{product.commercial}</p>
          <a className="text-link" href={WHATSAPP_URL} target="_blank" rel="noreferrer">
            Conversar sobre implantação →
          </a>
        </article>
      </section>

      <section className="related-products">
        <div className="section-heading compact">
          <div>
            <span className="section-kicker">OUTRAS SOLUÇÕES</span>
            <h2>Explore o portfólio OI BETA.</h2>
          </div>
        </div>
        <div className="related-grid">
          {products.filter((item) => item.slug !== product.slug).slice(0, 3).map((item) => (
            <Link key={item.slug} href={`/produtos/${item.slug}`}>
              <span>{item.eyebrow}</span>
              <strong>{item.name}</strong>
              <small>Ver produto →</small>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
