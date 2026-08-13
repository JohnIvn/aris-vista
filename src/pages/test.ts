/** Test view — evaluate a model and show ranked predictions. */
export const testView = `
<section class="view view-test" id="view-test">
  <header class="topbar">
    <div>
      <h1 class="page-title">Test a Model</h1>
      <p class="page-sub">Evaluate a trained model against inputs.</p>
    </div>
    <div class="topbar-actions">
      <button class="btn primary" id="test-run-btn">▶ Run Test</button>
    </div>
  </header>

  <section class="grid-2 test-grid">
    <article class="card glass config-card">
      <h2 class="card-title">Test Setup</h2>
      <p class="card-sub">Choose a model and an input.</p>

      <label class="field">
        <span class="field-label">Model checkpoint</span>
        <select class="input" id="test-model">
          <option>Arís‑1 v42</option>
          <option>Arís‑1 v41</option>
          <option>ViT-Base v12</option>
        </select>
      </label>

      <label class="field">
        <span class="field-label">Evaluation mode</span>
        <select class="input" id="test-mode">
          <option>Single sample</option>
          <option>Full validation set</option>
        </select>
      </label>

      <div class="dropzone" id="test-drop">
        <div class="drop-icon">⇪</div>
        <p class="drop-title">Drop an image here</p>
        <p class="drop-sub">or click to browse (PNG / JPG)</p>
        <input type="file" id="test-file" accept="image/*" hidden />
      </div>

      <label class="field">
        <span class="field-label">Expected label <span class="faint">(optional)</span></span>
        <input class="input" id="test-label" placeholder="e.g. golden retriever" />
      </label>
    </article>

    <article class="card glass result-card">
      <div class="card-head">
        <div>
          <h2 class="card-title">Result</h2>
          <p class="card-sub">Model prediction output.</p>
        </div>
        <span class="badge done" id="test-status">● Idle</span>
      </div>

      <div class="result-hero">
        <div class="result-thumb" id="test-thumb">⌖</div>
        <div class="result-main">
          <span class="result-tag">Prediction</span>
          <span class="result-label" id="test-prediction">—</span>
          <div class="result-confidence">
            <span class="rc-label">Confidence</span>
            <div class="meter"><div class="meter-fill run" id="test-confidence"></div></div>
            <span class="rc-val" id="test-conf-val">0%</span>
          </div>
        </div>
      </div>

      <div class="class-list" id="test-classes">
        <div class="class-row"><span>No results yet</span></div>
      </div>
    </article>
  </section>
</section>
`;
