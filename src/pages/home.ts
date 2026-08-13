/** Home view — hero with live clock, greeting and quick actions. */
export const homeView = `
<section class="view view-home" id="view-home">
  <header class="topbar home-topbar">
    <div></div>
    <div class="topbar-actions">
      <button class="icon-btn header-btn" aria-label="notifications">◌</button>
      <a class="btn primary" href="#train">▸ Start Training</a>
    </div>
  </header>

  <div class="hero">
    <p class="eye" id="home-greeting">Good morning</p>
    <h1 class="hero-title">
      <span class="hero-clock" id="home-clock">--:--</span>
      <span class="hero-date" id="home-date"></span>
    </h1>
    <p class="lead">Welcome back, Alex — your models are ready whenever you are.</p>
    <div class="hero-actions">
      <a class="btn primary" href="#train">◎ Train a model</a>
      <a class="btn ghost" href="#test">✓ Test a model</a>
    </div>
  </div>

  <section class="pill-row">
    <article class="card glass pill-card">
      <span class="pill-icon">◇</span>
      <div class="pill-body">
        <span class="pill-title">Active run</span>
        <span class="pill-value">Arís‑1 v42</span>
      </div>
      <span class="pill-meta">94.8%</span>
    </article>
    <article class="card glass pill-card">
      <span class="pill-icon violet">▤</span>
      <div class="pill-body">
        <span class="pill-title">Datasets</span>
        <span class="pill-value">12 available</span>
      </div>
      <span class="pill-meta">240 GB</span>
    </article>
    <article class="card glass pill-card">
      <span class="pill-icon amber">✎</span>
      <div class="pill-body">
        <span class="pill-title">Quick tip</span>
        <span class="pill-value">Use batch 32 for speed</span>
      </div>
      <span class="pill-meta">Read more →</span>
    </article>
  </section>
</section>
`;
