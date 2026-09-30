'use strict';

const byId = id => document.getElementById(id);
const node = (tag, className, text) => {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
};

// Table 1, arXiv:2609.36452v1. Each row is [quality %, NFE, tokens/s].
const methods = ['Default', 'Fast-dLLM', 'EB-Sampler', 'LoPA', 'DAPD', 'RPD-block', 'RPD'];
const results = {
  llada: {
    mbpp: [[39.60,256,5.93],[40.20,44.73,33.13],[39.20,53.26,26.96],[39.40,23.94,21.58],[37.80,47.16,28.62],[38.60,40.61,33.91],[40.60,38.16,35.92]],
    humaneval: [[43.29,256,7.70],[43.29,44.48,43.13],[43.90,59.06,32.10],[40.24,24.68,29.32],[41.46,49.09,36.46],[41.46,41.23,46.23],[43.90,40.59,45.29]],
    gsm8k: [[76.50,256,10.50],[76.35,77.09,35.63],[79.15,88.79,30.72],[76.50,38.35,25.83],[76.19,75.77,34.34],[75.74,69.08,38.55],[78.85,71.76,35.30]],
    math500: [[38,256,11.31],[37.40,103.78,27.59],[39,116.01,24.46],[38.60,50.39,19.48],[37.20,98.71,28.18],[37.80,93.99,30],[38.80,98.88,26.77]]
  },
  dream: {
    mbpp: [[56.80,256,4.09],[58.20,57.63,16.82],[56.80,62.41,15.30],[51.20,36.95,11.78],[56.40,65.05,13.82],[58,55.49,17.34],[58.40,55.89,15.14]],
    humaneval: [[57.32,256,7.35],[60.37,64.54,31.69],[56.71,78.35,25.57],[55.49,35.79,19.71],[55.49,77.74,20.93],[59.76,61.72,31.71],[60.98,63.09,30.07]],
    gsm8k: [[81.35,256,8.98],[81.73,76.04,30.03],[81.35,89.26,25.53],[81.65,37.20,20.90],[80.59,79.01,22.02],[81.27,70.78,30.82],[81.80,82.03,24.56]],
    math500: [[41.80,256,12.57],[46,114.34,29.74],[45,124.60,27.09],[44,55.28,20.43],[41.80,112.64,24.07],[44.20,108.93,30.51],[45.80,116.17,27.71]]
  }
};

function renderResults() {
  const model = byId('result-model').value;
  const task = byId('result-task').value;
  const rows = results[model][task];
  const maxTPS = Math.max(...rows.map(r => r[2]));
  const metric = ['mbpp', 'humaneval'].includes(task) ? 'pass@1' : 'accuracy';
  byId('quality-heading').textContent = `${metric === 'accuracy' ? 'Accuracy' : metric} (%) ↑`;
  const modelName = byId('result-model').selectedOptions[0].textContent;
  const taskName = byId('result-task').selectedOptions[0].textContent;
  byId('results-caption').textContent = `${modelName} · ${taskName}`;
  byId('results-body').replaceChildren(...rows.map((values, i) => {
    const tr = node('tr', methods[i] === 'RPD' ? 'rpd-row' : '');
    const heading = node('th', '', methods[i]); heading.scope = 'row'; tr.append(heading);
    values.forEach(value => tr.append(node('td', '', value.toFixed(2))));
    const td = node('td', 'speed-cell');
    const visual = node('div', 'speed-visual');
    const track = node('i', 'bar-track'); track.setAttribute('aria-hidden', 'true');
    const bar = node('i', 'bar-fill'); bar.style.width = `${values[2] / maxTPS * 100}%`;
    track.append(bar); visual.append(node('span', '', `${(values[2] / rows[0][2]).toFixed(2)}×`), track);
    td.append(visual); tr.append(td); return tr;
  }));
  byId('result-takeaway').textContent = `On ${modelName.split('-')[0]} ${taskName}, full RPD reaches ${(rows[6][2] / rows[0][2]).toFixed(2)}× the throughput of default decoding, with ${metric} of ${rows[6][0].toFixed(2)}% vs. ${rows[0][0].toFixed(2)}%. RPD-block is reported as a separate variant.`;
}
byId('result-model').addEventListener('change', renderResults);
byId('result-task').addEventListener('change', renderResults);
renderResults();

byId('copy-citation').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(byId('bibtex').textContent);
    byId('copy-citation').textContent = 'Copied!';
    byId('copy-status').textContent = 'BibTeX copied to clipboard.';
    setTimeout(() => { byId('copy-citation').textContent = 'Copy BibTeX'; }, 2000);
  } catch {
    const range = document.createRange(); range.selectNodeContents(byId('bibtex'));
    const selection = window.getSelection(); selection.removeAllRanges(); selection.addRange(range);
    byId('copy-status').textContent = 'Citation selected. Use your device’s copy command.';
    byId('copy-citation').textContent = 'Selected — copy text';
  }
});

async function initReplay() {
  const response = await fetch('static/traces/examples.json');
  if (!response.ok) throw new Error('Could not load trajectory data.');
  const data = await response.json();
  let selected = 0, step = 0, playing = false, frame = null, lastTime = 0, accumulator = 0;
  let panels = [], autoStarted = false, interacted = false;
  const maxStep = () => Math.max(...data.cases[selected].methods.map(m => m.nfe));
  const pause = () => {
    const wasPlaying = playing;
    playing = false; cancelAnimationFrame(frame); frame = null;
    byId('play').textContent = 'Play'; byId('play').setAttribute('aria-pressed', 'false');
    if (wasPlaying && step < maxStep()) byId('replay-status').textContent = `Paused at forward ${step}. Use Play or Step +1 to continue.`;
  };
  const manual = () => { interacted = true; pause(); };

  function renderStep() {
    byId('timeline').value = step;
    byId('step-number').textContent = `${step} / ${maxStep()}`;
    panels.forEach(panel => {
      const m = panel.method, current = Math.min(step, m.nfe);
      const done = step >= m.nfe;
      panel.badge.textContent = done ? 'Complete' : (step ? 'Decoding' : 'Ready');
      panel.badge.className = `panel-badge${done ? ' complete' : ''}`;
      panel.nfe.textContent = `${current} / ${m.nfe}`;
      panel.count.textContent = `${m.commit_step.filter(s => s <= current).length} / 256`;
      let latest = null;
      m.commit_step.forEach((commit, position) => {
        const state = commit > step ? 'masked' : commit === step ? 'new' : 'old';
        panel.strip[position].className = state;
        if (position < panel.tokens.length) {
          const token = panel.tokens[position];
          token.className = `token ${state}`;
          if (state === 'masked') token.setAttribute('aria-hidden', 'true');
          else token.removeAttribute('aria-hidden');
          token.title = state === 'masked' ? `Position ${position}: masked` : `Position ${position}: committed at forward ${commit}`;
          if (state === 'new') latest = token;
        }
      });
      if (latest && playing && panel.follow) {
        const parentBox = panel.text.getBoundingClientRect();
        const tokenBox = latest.getBoundingClientRect();
        if (tokenBox.bottom > parentBox.bottom || tokenBox.top < parentBox.top) {
          panel.text.scrollTop += tokenBox.top - parentBox.top - panel.text.clientHeight * .45;
        }
      }
      if (!step) panel.text.scrollTop = 0;
    });
    if (step === maxStep()) {
      byId('replay-status').textContent = 'All methods complete. Replay or choose another example.';
      pause();
    } else if (!playing) {
      byId('replay-status').textContent = step ? `Paused at forward ${step}. Use Play or Step +1 to continue.` : 'Ready. All three methods start with a fully masked canvas.';
    }
  }

  function tick(time) {
    if (!playing) return;
    if (lastTime) accumulator += Math.min(time - lastTime, 250);
    lastTime = time;
    const interval = 1000 / Number(byId('speed').value);
    if (accumulator >= interval) {
      const advance = Math.floor(accumulator / interval); accumulator %= interval;
      step = Math.min(maxStep(), step + advance); renderStep();
    }
    if (playing) frame = requestAnimationFrame(tick);
  }

  function play() {
    if (step >= maxStep()) { step = 0; renderStep(); }
    playing = true; lastTime = 0; accumulator = 0;
    byId('play').textContent = 'Pause'; byId('play').setAttribute('aria-pressed', 'true');
    byId('replay-status').textContent = 'Playing.';
    frame = requestAnimationFrame(tick);
  }

  function selectCase(index) {
    pause(); selected = index; step = 0;
    const example = data.cases[index];
    byId('timeline').max = maxStep();
    [...byId('case-tabs').children].forEach((button, i) => button.setAttribute('aria-pressed', String(i === index)));
    byId('prompt-title').textContent = `${example.model} · ${example.task} · Test item ${example.doc_id}`;
    byId('prompt-text').textContent = example.question;
    byId('download-gif').href = `static/videos/${example.id}.gif`;
    byId('method-panels').replaceChildren();
    panels = example.methods.map((method, i) => {
      const article = node('article', `method-panel ${['default', 'fast', 'rpd'][i]}`);
      article.setAttribute('aria-label', `${method.name} trajectory`);
      const heading = node('div', 'panel-heading-row'), badge = node('span', 'panel-badge', 'Ready');
      heading.append(node('h3', '', method.name), badge);
      const stats = node('div', 'panel-stats'), nfe = node('strong'), count = node('strong');
      const forwardLabel = node('span', '', 'Forwards '), countLabel = node('span', '', 'Committed ');
      forwardLabel.append(nfe); countLabel.append(count); stats.append(forwardLabel, countLabel);
      const stripElement = node('div', 'position-strip'); stripElement.setAttribute('aria-hidden', 'true');
      const strip = method.tokens.map(() => { const el = node('i'); stripElement.append(el); return el; });
      const text = node('div', 'token-text'); text.tabIndex = 0;
      text.setAttribute('aria-label', `${method.name}: scrollable generated text`);
      const tokens = method.tokens.slice(0, method.effective_tokens).map(piece => {
        const el = node('span', 'token masked', piece); el.setAttribute('aria-hidden', 'true'); text.append(el); return el;
      });
      article.append(heading, node('p', 'panel-description', method.description), stats, stripElement, text);
      byId('method-panels').append(article);
      const panel = {method, article, badge, nfe, count, strip, text, tokens, follow:true};
      text.addEventListener('wheel', () => { panel.follow = false; }, {passive:true});
      text.addEventListener('touchstart', () => { panel.follow = false; }, {passive:true});
      return panel;
    });
    byId('replay-status').textContent = 'Ready. All three methods start with a fully masked canvas.';
    renderStep();
  }

  data.cases.forEach((example, i) => {
    const label = `${example.model.split('-')[0]} · ${example.task}`;
    const button = node('button', '', label); button.type = 'button';
    button.addEventListener('click', () => { interacted = true; selectCase(i); });
    byId('case-tabs').append(button);
  });
  selectCase(0);
  ['play', 'restart', 'next-step', 'timeline'].forEach(id => { byId(id).disabled = false; });
  byId('play').addEventListener('click', () => { interacted = true; if (playing) pause(); else play(); });
  byId('restart').addEventListener('click', () => { manual(); step = 0; panels.forEach(p => p.follow = true); renderStep(); byId('replay-status').textContent = 'Reset to the fully masked canvas.'; });
  byId('next-step').addEventListener('click', () => { manual(); step = Math.min(maxStep(), step + 1); renderStep(); });
  byId('timeline').addEventListener('input', () => { manual(); step = Number(byId('timeline').value); renderStep(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      const visible = entries[0].isIntersecting;
      if (!visible) pause();
      else if (!autoStarted && !interacted && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        autoStarted = true; play();
      }
    }, {threshold:0.25});
    observer.observe(byId('method-panels'));
  }
}
initReplay().catch(() => {
  byId('replay-status').textContent = 'The replay could not be loaded. Please refresh the page.';
}).finally(() => byId('replay').setAttribute('aria-busy', 'false'));
