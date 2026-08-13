/** Overview view — key stats, charts and recent runs. */
export const overviewView = `
<section class="view view-overview" id="view-overview">
  <header class="topbar">
    <div>
      <h1 class="page-title">Overview</h1>
      <p class="page-sub">Live dashboard for the <strong>Arís‑1</strong> vision transformer run.</p>
    </div>
    <div class="topbar-actions">
      <button class="btn ghost">⇅ Export</button>
      <a class="btn primary" href="#train">▸ Resume Training</a>
    </div>
  </header>

  <section class="stats-grid">
    <article class="card glass stat-card">
      <div class="stat-top"><span class="stat-icon">✓</span><span class="stat-label">Accuracy</span></div>
      <div class="stat-value" data-count="94.8" data-decimals="1">0.0<span class="unit">%</span></div>
      <div class="stat-delta up">▲ 2.4% this epoch</div>
      <svg class="spark" data-spark="acc" viewBox="0 0 120 40" preserveAspectRatio="none"></svg>
    </article>

    <article class="card glass stat-card">
      <div class="stat-top"><span class="stat-icon accent">∿</span><span class="stat-label">Loss</span></div>
      <div class="stat-value" data-count="0.312" data-decimals="3">0.000</div>
      <div class="stat-delta down">▼ 0.081 vs baseline</div>
      <svg class="spark" data-spark="loss" viewBox="0 0 120 40" preserveAspectRatio="none"></svg>
    </article>

    <article class="card glass stat-card">
      <div class="stat-top"><span class="stat-icon violet">◎</span><span class="stat-label">Epoch</span></div>
      <div class="stat-value" data-count="42" data-decimals="0">0</div>
      <div class="stat-delta neutral">Restarting from epoch 42</div>
      <svg class="spark" data-spark="epoch" viewBox="0 0 120 40" preserveAspectRatio="none"></svg>
    </article>

    <article class="card glass stat-card">
      <div class="stat-top"><span class="stat-icon amber">◆</span><span class="stat-label">F1 Score</span></div>
      <div class="stat-value" data-count="92.1" data-decimals="1">0.0<span class="unit">%</span></div>
      <div class="stat-delta up">▲ 1.1% this week</div>
      <svg class="spark" data-spark="f1" viewBox="0 0 120 40" preserveAspectRatio="none"></svg>
    </article>
  </section>

  <section class="grid-2">
    <article class="card glass chart-card">
      <div class="card-head">
        <div>
          <h2 class="card-title">Training Progress</h2>
          <p class="card-sub">Loss & accuracy across epochs</p>
        </div>
        <div class="legend">
          <span class="legend-item"><i class="dot dot-train"></i>Loss</span>
          <span class="legend-item"><i class="dot dot-val"></i>Accuracy</span>
        </div>
      </div>
      <div class="line-chart" data-chart="line"></div>
    </article>

    <article class="card glass chart-card">
      <div class="card-head">
        <div>
          <h2 class="card-title">Computation Budget</h2>
          <p class="card-sub">Resource consumption</p>
        </div>
      </div>
      <div class="donut-wrap">
        <div class="donut" data-chart="donut"></div>
        <div class="donut-center">
          <span class="donut-val" id="donut-val">72%</span>
          <span class="donut-label">of 96 GPU·h</span>
        </div>
      </div>
    </article>
  </section>

  <section class="grid-2">
    <article class="card glass chart-card">
      <div class="card-head">
        <div>
          <h2 class="card-title">Batch Throughput</h2>
          <p class="card-sub">Samples / second</p>
        </div>
      </div>
      <div class="bar-chart" data-chart="bar"></div>
    </article>

    <article class="card glass table-card">
      <div class="card-head">
        <div>
          <h2 class="card-title">Recent Runs</h2>
          <p class="card-sub">Latest experiments</p>
        </div>
      </div>
      <table class="runs-table">
        <thead>
          <tr><th>Run</th><th>Accuracy</th><th>Loss</th><th>Status</th></tr>
        </thead>
        <tbody>
          <tr><td><span class="run-name">Arís‑1 v42</span></td><td class="num">94.8%</td><td class="num">0.312</td><td><span class="badge ok">● Running</span></td></tr>
          <tr><td><span class="run-name">Arís‑1 v41</span></td><td class="num">92.6%</td><td class="num">0.398</td><td><span class="badge done">✓ Done</span></td></tr>
          <tr><td><span class="run-name">ViT-Base v12</span></td><td class="num">88.1%</td><td class="num">0.521</td><td><span class="badge done">✓ Done</span></td></tr>
          <tr><td><span class="run-name">Swin-T v07</span></td><td class="num">85.4%</td><td class="num">0.603</td><td><span class="badge warn">! Queued</span></td></tr>
        </tbody>
      </table>
    </article>
  </section>
</section>
`;
