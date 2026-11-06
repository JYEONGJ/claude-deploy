(() => {
  'use strict';

  const N = 10, LEVELS = 14;
  const cv = document.getElementById('cv'), ctx = cv.getContext('2d');
  let rungs, shown, done, busy, token = 0;

  // secure random integer in [0, n)
  function rnd(n) {
    const a = new Uint32Array(1);
    crypto.getRandomValues(a);
    return a[0] % n;
  }

  function buildTeamInputs() {
    const box = document.getElementById('teams');
    for (let i = 0; i < N; i++) {
      const inp = document.createElement('input');
      inp.value = 'Team ' + (i + 1);
      inp.maxLength = 16;
      inp.oninput = () => { document.querySelectorAll('.heads button')[i].textContent = inp.value || 'Team ' + (i + 1); renderResult(); };
      box.appendChild(inp);
    }
  }
  const names = () => [...document.querySelectorAll('#teams input')].map((e, i) => e.value || 'Team ' + (i + 1));

  // rungs[level][gap] = true if a rung joins column gap and gap+1 (no two adjacent on the same level)
  function newLadder() {
    token++;
    rungs = Array.from({ length: LEVELS }, () => {
      const row = Array(N - 1).fill(false);
      for (let g = 0; g < N - 1; g++) if (!row[g - 1] && rnd(100) < 45) row[g] = true;
      return row;
    });
    shown = new Set();
    done = {};
    busy = false;
    const heads = document.getElementById('heads');
    heads.innerHTML = '';
    names().forEach((n, i) => {
      const b = document.createElement('button');
      b.textContent = n;
      b.onclick = () => trace(i);
      heads.appendChild(b);
    });
    document.getElementById('foot').innerHTML = Array.from({ length: N }, (_, i) => `<div>${i + 1}</div>`).join('');
    document.getElementById('allBtn').disabled = false;
    renderResult();
    draw();
  }

  const X = i => (i + 0.5) * cv.width / N;
  const Y = l => 20 + (l + 0.5) * (cv.height - 40) / LEVELS;

  function path(start) {
    const pts = [{ x: X(start), y: 20 }];
    const keys = [];
    let c = start;
    for (let l = 0; l < LEVELS; l++) {
      pts.push({ x: X(c), y: Y(l) });
      let to = c;
      if (c < N - 1 && rungs[l][c]) { to = c + 1; keys.push(l + ':' + c); }
      else if (c > 0 && rungs[l][c - 1]) { to = c - 1; keys.push(l + ':' + (c - 1)); }
      if (to !== c) pts.push({ x: X(to), y: Y(l) });
      c = to;
    }
    pts.push({ x: X(c), y: cv.height - 20 });
    return { pts, keys, end: c };
  }

  function draw(extra) {
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.strokeStyle = '#cfd3dc';
    for (let i = 0; i < N; i++) { ctx.beginPath(); ctx.moveTo(X(i), 20); ctx.lineTo(X(i), cv.height - 20); ctx.stroke(); }
    for (let l = 0; l < LEVELS; l++) for (let g = 0; g < N - 1; g++)
      if (rungs[l][g] && shown.has(l + ':' + g)) { ctx.beginPath(); ctx.moveTo(X(g), Y(l)); ctx.lineTo(X(g + 1), Y(l)); ctx.stroke(); }
    for (const t in done) strokePath(done[t].pts, done[t].color, done[t].pts.length, 0.55);
    if (extra) strokePath(extra.pts, extra.color, extra.n, 1, extra.frac);
  }

  function strokePath(pts, color, n, alpha, frac) {
    ctx.globalAlpha = alpha; ctx.strokeStyle = color; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < n; i++) ctx.lineTo(pts[i].x, pts[i].y);
    if (frac !== undefined && n < pts.length + 1 && pts[n]) {
      const a = pts[n - 1], b = pts[n];
      ctx.lineTo(a.x + (b.x - a.x) * frac, a.y + (b.y - a.y) * frac);
    }
    ctx.stroke(); ctx.globalAlpha = 1; ctx.lineWidth = 3;
  }

  const color = i => `hsl(${i * 36},70%,48%)`;

  function trace(i) {
    if (busy || done[i]) return;
    busy = true;
    const my = token;
    const p = path(i);
    const col = color(i);
    let seg = 1, frac = 0;
    const step = () => {
      if (my !== token) return;
      frac += 0.22;
      if (frac >= 1) {
        frac = 0; seg++;
        // reveal rung once the path has reached its row
        p.keys.forEach(k => { const l = +k.split(':')[0]; if (Y(l) <= p.pts[Math.min(seg, p.pts.length - 1)].y + 1) shown.add(k); });
      }
      if (seg >= p.pts.length) {
        p.keys.forEach(k => shown.add(k));
        done[i] = { pts: p.pts, color: col, rank: p.end + 1 };
        busy = false;
        document.querySelectorAll('.heads button')[i].classList.add('used');
        draw(); renderResult(); return;
      }
      draw({ pts: p.pts, color: col, n: seg, frac });
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  function revealAll() {
    if (busy) return;
    for (let i = 0; i < N; i++) if (!done[i]) {
      const p = path(i);
      p.keys.forEach(k => shown.add(k));
      done[i] = { pts: p.pts, color: color(i), rank: p.end + 1 };
      document.querySelectorAll('.heads button')[i].classList.add('used');
    }
    draw(); renderResult();
  }

  function renderResult() {
    const nm = names();
    const byRank = {};
    for (const t in done) byRank[done[t].rank] = nm[t];
    document.getElementById('result').innerHTML =
      Array.from({ length: N }, (_, r) => `<li><b>${r + 1}</b>${byRank[r + 1] || '—'}</li>`).join('');
    document.querySelectorAll('#foot div').forEach((d, r) => d.classList.toggle('hit', !!byRank[r + 1]));
  }

  cv.width = 900;
  buildTeamInputs();
  document.getElementById('newBtn').onclick = newLadder;
  document.getElementById('allBtn').onclick = revealAll;
  newLadder();
})();
