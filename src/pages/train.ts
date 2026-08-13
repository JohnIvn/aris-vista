/** Train view — model configuration form + live run console. */
export const trainView = `
<section class="view view-train" id="view-train">
  <header class="topbar">
    <div>
      <h1 class="page-title">Train a Model</h1>
      <p class="page-sub">Configure and kick off a new training run.</p>
    </div>
    <div class="topbar-actions">
      <button class="btn primary" id="train-run-btn">▸ Start Run</button>
    </div>
  </header>

  <section class="grid-2 train-grid">
    <article class="card glass config-card">
      <h2 class="card-title">Configuration</h2>
      <p class="card-sub">Model, data and hyperparameters.</p>

      <label class="field">
        <span class="field-label">Model architecture</span>
        <select class="input" id="train-arch">
          <option>ViT‑Base / 16</option>
          <option>Swin‑Transformer</option>
          <option>ResNet‑50</option>
          <option>EfficientNet‑B4</option>
        </select>
      </label>

      <label class="field">
        <span class="field-label">Dataset</span>
        <select class="input" id="train-dataset">
          <option>ImageNet‑21k</option>
          <option>CIFAR‑100</option>
          <option>COCO 2017</option>
          <option>Custom (upload)</option>
        </select>
      </label>

      <div class="field-grid">
        <label class="field">
          <span class="field-label">Epochs</span>
          <input class="input" id="train-epochs" type="number" value="50" min="1" />
        </label>
        <label class="field">
          <span class="field-label">Batch size</span>
          <select class="input" id="train-batch">
            <option>16</option>
            <option selected>32</option>
            <option>64</option>
            <option>128</option>
          </select>
        </label>
      </div>

      <label class="field">
        <span class="field-label">Learning rate</span>
        <input class="input" id="train-lr" type="number" step="0.0001" value="0.0003" />
      </label>

      <div class="opt-row">
        <label class="check">
          <input type="checkbox" id="train-aug" checked />
          <span>Data augmentation</span>
        </label>
        <label class="check">
          <input type="checkbox" id="train-ckpt" />
          <span>Checkpoint every epoch</span>
        </label>
      </div>
    </article>

    <article class="card glass progress-card">
      <div class="card-head">
        <div>
          <h2 class="card-title">Run Console</h2>
          <p class="card-sub">Live progress of the current run.</p>
        </div>
        <span class="badge ok" id="run-status">● Idle</span>
      </div>

      <div class="run-info">
        <span id="run-label">Arís‑1 · ViT‑Base / 16</span>
        <span class="run-progress-pct" id="run-pct">0%</span>
      </div>
      <div class="meter large"><div class="meter-fill run" id="run-meter"></div></div>

      <div class="run-metrics">
        <div class="run-metric"><span class="rm-label">Epoch</span><span class="rm-val" id="run-epoch">0 / 50</span></div>
        <div class="run-metric"><span class="rm-label">Loss</span><span class="rm-val" id="run-loss">—</span></div>
        <div class="run-metric"><span class="rm-label">Accuracy</span><span class="rm-val" id="run-acc">—</span></div>
        <div class="run-metric"><span class="rm-label">ETA</span><span class="rm-val" id="run-eta">—</span></div>
      </div>

      <div class="console" id="run-console">
        <div class="console-line dim">Ready to train.</div>
      </div>
    </article>
  </section>
</section>
`;
