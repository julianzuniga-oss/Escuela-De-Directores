/**
 * kahoot-engine.js
 * Retos tipo Kahoot: temporizador por pregunta, puntos por exactitud y velocidad,
 * rachas, marcador en vivo entre preguntas y marcador final.
 * Requiere points.js (saveStageLive, kahootBoard).
 *  - Preguntas con opción "correct": modo puntuado.
 *  - Preguntas con "skills" en cada opción: modo perfil de habilidades (puntos según qué tan asertiva es la opción).
 */
const KH_SHAPES = [
  '<svg viewBox="0 0 24 24" aria-hidden="true"><polygon points="12,3 22,21 2,21" fill="currentColor"/></svg>',
  '<svg viewBox="0 0 24 24" aria-hidden="true"><polygon points="12,2 22,12 12,22 2,12" fill="currentColor"/></svg>',
  '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="currentColor"/></svg>',
  '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" fill="currentColor"/></svg>'
];
function khEsc(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function khSum(skills) {
  return Math.max(0, Object.values(skills || {}).reduce(function (a, v) { return a + v; }, 0));
}
function khBoardHtml(rows, myId, limit) {
  limit = limit || 5;
  if (!rows.length) return '<p class="kh-empty">Aún no hay puntuaciones registradas.</p>';
  var top = rows.slice(0, limit);
  var myIdx = rows.findIndex(function (r) { return r.id === myId; });
  var html = '<ol class="kh-board">' + top.map(function (r, i) {
    return '<li class="' + (r.id === myId ? 'me ' : '') + 'pos-' + (i + 1) + '"><span class="kh-pos">' + (i + 1) + '</span><span class="kh-name">' + khEsc(r.name) + (r.id === myId ? ' (tú)' : '') + '</span><span class="kh-pts">' + r.pts + '</span></li>';
  }).join('') + '</ol>';
  if (myIdx >= limit) {
    var r = rows[myIdx];
    html += '<div class="kh-me-row"><span class="kh-pos">' + (myIdx + 1) + '</span><span class="kh-name">' + khEsc(r.name) + ' (tú)</span><span class="kh-pts">' + r.pts + '</span></div>';
  }
  return html;
}

class KahootEngine {
  constructor(o) {
    this.container = document.getElementById(o.containerId);
    this.questions = o.questions;
    this.maxPoints = o.maxPoints || 1000;
    this.seconds = o.seconds || 20;
    this.participant = o.participant;
    this.session = o.session;
    this.stage = o.stage;
    this.title = o.title || 'Reto';
    this.onFinish = o.onFinish || function () {};
    this.onContinue = o.onContinue || null;
    this.continueLabel = o.continueLabel || 'Continuar';
    this.hasCorrect = this.questions.some(function (q) { return q.options.some(function (x) { return x.correct === true; }); });
    this.reset();
  }
  reset() { this.idx = 0; this.points = 0; this.streak = 0; this.answers = []; this.t0 = Date.now(); this.saveChain = Promise.resolve(); }
  perQ() { return this.maxPoints / this.questions.length; }

  renderIntro() {
    var self = this;
    this.container.innerHTML = '<div class="kh kh-intro"><h2>' + khEsc(this.title) + '</h2>' +
      '<p class="kh-rules"><b>' + this.questions.length + '</b> preguntas · <b>' + this.seconds + ' s</b> por pregunta · hasta <b>' + this.maxPoints + '</b> puntos</p>' +
      '<p>Los puntos dependen de la exactitud de tu respuesta y de qué tan rápido respondes. Encadena respuestas perfectas para ganar bonos de racha. Entre pregunta y pregunta verás el marcador en vivo. Solo puedes jugar este reto una vez.</p>' +
      '<button class="btn-primary kh-start" type="button">Comenzar reto</button></div>';
    this.container.querySelector('.kh-start').addEventListener('click', function () { self.start(); });
  }
  async renderCompleted(points) {
    var rows = [];
    try { rows = await kahootBoard(this.session, this.stage); } catch (e) {}
    this.container.innerHTML = '<div class="kh kh-done"><h2>Reto completado</h2><p class="kh-big">' + points + ' <small>puntos</small></p>' +
      '<p>Ya registraste tu resultado en este reto. Marcador actual:</p>' + khBoardHtml(rows, this.participant.id, 10) +
      (this.onContinue ? '<button type="button" class="btn-primary kh-cont">' + khEsc(this.continueLabel) + '</button>' : '') + '</div>';
    if (this.onContinue) this.container.querySelector('.kh-cont').addEventListener('click', this.onContinue);
  }
  start() { this.reset(); this.renderQuestion(); }

  renderQuestion() {
    var self = this, q = this.questions[this.idx];
    this.container.innerHTML = '<div class="kh">' +
      '<div class="kh-top"><span>Pregunta ' + (this.idx + 1) + ' de ' + this.questions.length + '</span>' +
      '<span class="kh-streak ' + (this.streak >= 2 ? 'on' : '') + '">Racha ×' + this.streak + '</span>' +
      '<span class="kh-score">Puntos <b>' + this.points + '</b></span></div>' +
      '<div class="kh-timer"><div class="kh-timer-fill" style="width:100%"></div></div>' +
      (q.context ? '<div class="kh-context">' + khEsc(q.context) + '</div>' : '') +
      '<div class="kh-q">' + khEsc(q.prompt) + '</div>' +
      '<div class="kh-opts">' + q.options.map(function (o, i) {
        return '<button type="button" class="kh-opt kh-c' + (i % 4) + '" data-id="' + o.id + '"><span class="kh-shape">' + KH_SHAPES[i % 4] + '</span><span class="kh-letter">' + o.id.toUpperCase() + '</span><span class="kh-text">' + khEsc(o.text) + '</span></button>';
      }).join('') + '</div></div>';
    this.qStart = Date.now();
    this.locked = false;
    var fill = this.container.querySelector('.kh-timer-fill');
    this.timer = setInterval(function () {
      var left = Math.max(0, self.seconds - (Date.now() - self.qStart) / 1000);
      var pct = left / self.seconds * 100;
      fill.style.width = pct + '%';
      if (pct < 30) fill.classList.add('low');
      if (left <= 0) self.answer(null, true);
    }, 100);
    this.container.querySelectorAll('.kh-opt').forEach(function (b) {
      b.addEventListener('click', function () { self.answer(b.dataset.id, false); });
    });
  }

  answer(optId, timedOut) {
    var self = this;
    if (this.locked) return;
    this.locked = true;
    clearInterval(this.timer);
    var q = this.questions[this.idx];
    var elapsed = (Date.now() - this.qStart) / 1000;
    var tf = Math.max(0, 1 - elapsed / this.seconds);
    var opt = q.options.filter(function (o) { return o.id === optId; })[0] || null;
    var hasCorrect = q.options.some(function (o) { return o.correct === true; });
    var quality = 0;
    if (opt) {
      if (hasCorrect) quality = opt.correct ? 1 : 0;
      else {
        var max = Math.max.apply(null, [1].concat(q.options.map(function (o) { return khSum(o.skills); })));
        quality = khSum(opt.skills) / max;
      }
    }
    var pts = quality > 0 ? this.perQ() * quality * (0.6 + 0.4 * tf) : 0;
    var perfect = quality >= 0.99;
    if (perfect) { this.streak++; if (this.streak >= 2) pts += this.perQ() * 0.1 * Math.min(3, this.streak - 1); }
    else this.streak = 0;
    pts = Math.round(pts);
    this.points = Math.min(this.maxPoints, this.points + pts);
    this.answers.push({
      question_id: q.id, option_id: optId,
      correct: hasCorrect ? !!(opt && opt.correct) : perfect,
      skills: opt ? (opt.skills || {}) : {}, points: pts,
      seconds: Math.round(elapsed * 10) / 10, timeout: !!timedOut
    });
    var current = this.points;
    this.saveChain = this.saveChain.then(function () {
      return saveStageLive(self.participant.id, self.session, self.stage, current);
    }).catch(function () {});
    this.reveal(q, opt, hasCorrect, pts, timedOut);
  }

  async reveal(q, opt, hasCorrect, pts, timedOut) {
    var self = this;
    this.container.querySelectorAll('.kh-opt').forEach(function (t) {
      t.disabled = true;
      var o = q.options.filter(function (x) { return x.id === t.dataset.id; })[0];
      if (hasCorrect) {
        if (o.correct) t.classList.add('correct');
        else if (opt && o.id === opt.id) t.classList.add('wrong');
        else t.classList.add('dim');
      } else {
        if (opt && o.id === opt.id) t.classList.add('chosen'); else t.classList.add('dim');
      }
    });
    var ok = hasCorrect ? !!(opt && opt.correct) : pts > 0;
    var msg = timedOut ? 'Tiempo agotado' : (hasCorrect ? (ok ? 'Correcto' : 'Incorrecto') : 'Respuesta registrada');
    var box = document.createElement('div');
    box.className = 'kh-feedback ' + (timedOut ? 'timeout' : hasCorrect ? (ok ? 'ok' : 'bad') : 'neutral');
    box.innerHTML = '<strong>' + msg + '</strong><span>+' + pts + ' puntos</span>';
    var root = this.container.querySelector('.kh');
    root.appendChild(box);
    await this.saveChain;
    var rows = [];
    try { rows = await kahootBoard(this.session, this.stage); } catch (e) {}
    var last = this.idx >= this.questions.length - 1;
    var board = document.createElement('div');
    board.className = 'kh-boardwrap';
    board.innerHTML = '<h3>Marcador en vivo</h3>' + khBoardHtml(rows, this.participant.id, 5) +
      '<button type="button" class="btn-primary kh-next">' + (last ? 'Ver resultado final' : 'Siguiente pregunta') + '</button>';
    root.appendChild(board);
    board.querySelector('.kh-next').addEventListener('click', function () {
      if (last) self.finish(); else { self.idx++; self.renderQuestion(); }
    });
  }

  computeProfile() {
    var self = this, tot = {}, max = {};
    this.questions.forEach(function (q, i) {
      var a = self.answers[i], dims = {};
      q.options.forEach(function (o) { Object.keys(o.skills || {}).forEach(function (d) { dims[d] = 1; }); });
      Object.keys(dims).forEach(function (d) {
        var best = Math.max.apply(null, [0].concat(q.options.map(function (o) { return (o.skills || {})[d] || 0; })));
        max[d] = (max[d] || 0) + best;
        tot[d] = (tot[d] || 0) + Math.max(0, a && a.skills ? (a.skills[d] || 0) : 0);
      });
    });
    var p = {};
    Object.keys(max).forEach(function (d) { p[d] = max[d] ? Math.round(Math.min(100, tot[d] / max[d] * 100)) : 0; });
    return p;
  }

  async finish() {
    var self = this, total = this.questions.length;
    var correct = this.answers.filter(function (a) { return a.correct; }).length;
    var result = {
      points: this.points, correct: correct, total: total, percentage: Math.round(correct / total * 100),
      profile: this.computeProfile(), answers: this.answers, time_seconds: Math.round((Date.now() - this.t0) / 1000)
    };
    this.container.innerHTML = '<div class="kh kh-done"><p>Guardando resultado…</p></div>';
    try { await this.saveChain; await this.onFinish(result); } catch (e) { console.error(e); }
    var rows = [];
    try { rows = await kahootBoard(this.session, this.stage); } catch (e) {}
    this.container.innerHTML = '<div class="kh kh-done"><h2>Reto completado</h2><p class="kh-big">' + result.points + ' <small>puntos</small></p>' +
      '<p>' + (this.hasCorrect ? 'Respuestas acertadas' : 'Respuestas más asertivas') + ': ' + correct + ' de ' + total + '</p>' +
      '<h3>Marcador final</h3>' + khBoardHtml(rows, this.participant.id, 10) +
      (this.onContinue ? '<button type="button" class="btn-primary kh-cont">' + khEsc(this.continueLabel) + '</button>' : '') + '</div>';
    if (this.onContinue) this.container.querySelector('.kh-cont').addEventListener('click', this.onContinue);
  }
}
