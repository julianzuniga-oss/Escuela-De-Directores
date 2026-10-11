/**
 * canvas-editor.js
 * Lienzo libre (SVG) para mapas: rectángulos, círculos, textos, conectores, colores y logos.
 * Funciona con mouse y táctil (pointer events). Sin librerías externas.
 *
 *   const ed = new CanvasEditor({ container, data, readOnly, logos, onChange });
 *   ed.getData()  -> { nodes:[...], edges:[...] }
 */
(function () {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg';
  var XL = 'http://www.w3.org/1999/xlink';
  var PALETTE = ['#ffffff', '#e8eef5', '#1a3c6e', '#b08d2b', '#2f7d4f', '#a3441f', '#0b7285', '#862e9c', '#f6d365', '#e5e7eb', '#33393f'];
  var EDGE_COLORS = ['#33393f', '#1a3c6e', '#2f7d4f', '#a3441f', '#b08d2b', '#862e9c'];
  var HINTS = {
    select: 'Toca un elemento para seleccionarlo; arrástralo para moverlo. Usa el punto azul de la esquina para cambiar su tamaño.',
    pan: 'Arrastra sobre el lienzo para desplazarte.',
    rect: 'Toca el lienzo para colocar un rectángulo.',
    ellipse: 'Toca el lienzo para colocar un círculo.',
    text: 'Toca el lienzo para colocar un texto.',
    connect: 'Toca el elemento de origen y luego el de destino para unirlos con un conector.'
  };

  function el(tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    if (attrs) for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function uid() { return 'n' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function isHex(c) { return /^#[0-9a-f]{6}$/i.test(c || ''); }
  function lum(hex) {
    var r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  }
  function textColor(n, fill) {
    if (n.color) return n.color;
    if (!isHex(fill)) return '#0f2a4d';
    return lum(fill) < 0.5 ? '#ffffff' : '#0f2a4d';
  }

  class CanvasEditor {
    constructor(o) {
      this.root = o.container;
      this.readOnly = !!o.readOnly;
      this.logos = o.logos || null;
      this.onChange = o.onChange || null;
      this.W = o.width || 1600;
      this.H = o.height || 1000;
      var d = o.data || {};
      this.nodes = (d.nodes || []).map(function (n) { return Object.assign({}, n); });
      this.edges = (d.edges || []).map(function (e) { return Object.assign({}, e); });
      this.sel = null; this.tool = 'select'; this.connectFrom = null;
      this.history = []; this.drag = null; this.zoom = 1; this.textTimer = null;
      this.build();
      this.render();
    }

    /* ---------- construcción de la interfaz ---------- */
    build() {
      var self = this, r = this.root;
      r.innerHTML = '';
      r.classList.add('ce');
      if (!this.readOnly) {
        var tb = document.createElement('div');
        tb.className = 'ce-toolbar';
        tb.innerHTML =
          '<div class="ce-group">' +
          '<button type="button" data-tool="select">Seleccionar</button>' +
          '<button type="button" data-tool="pan">Mano</button>' +
          '<button type="button" data-tool="rect">Rectángulo</button>' +
          '<button type="button" data-tool="ellipse">Círculo</button>' +
          '<button type="button" data-tool="text">Texto</button>' +
          '<button type="button" data-tool="connect">Conector</button></div>' +
          '<div class="ce-group">' +
          '<button type="button" data-act="undo">Deshacer</button>' +
          '<button type="button" data-act="zoomin">Acercar</button>' +
          '<button type="button" data-act="zoomout">Alejar</button>' +
          '<button type="button" data-act="fit">Ajustar</button></div>';
        r.appendChild(tb);
        this.toolbar = tb;
        tb.addEventListener('click', function (e) {
          var b = e.target.closest('button');
          if (!b) return;
          if (b.dataset.tool) self.setTool(b.dataset.tool);
          else if (b.dataset.act) self.act(b.dataset.act);
        });
        if (this.logos && this.logos.length) {
          var lg = document.createElement('div');
          lg.className = 'ce-logos';
          lg.innerHTML = '<span class="ce-logos-title">Logos y entidades (toca para agregar al lienzo)</span><div class="ce-logos-list">' +
            this.logos.map(function (l) {
              return '<button type="button" class="ce-logo-chip" data-logo="' + esc(l.id) + '">' +
                '<span class="ce-chip-mark" style="background:' + esc(l.color) + '">' +
                (l.archivo ? '<img src="assets/logos/' + esc(l.archivo) + '" alt="" data-s="' + esc(l.sigla) + '" onerror="this.parentNode.textContent=this.dataset.s">' : esc(l.sigla)) +
                '</span>' + esc(l.nombre) + '</button>';
            }).join('') + '</div>';
          r.appendChild(lg);
          lg.addEventListener('click', function (e) {
            var b = e.target.closest('[data-logo]');
            if (b) self.addLogo(b.dataset.logo);
          });
        }
        this.hint = document.createElement('div');
        this.hint.className = 'ce-hint';
        r.appendChild(this.hint);
        this.props = document.createElement('div');
        this.props.className = 'ce-props';
        r.appendChild(this.props);
      }
      this.scroll = document.createElement('div');
      this.scroll.className = 'ce-scroll';
      r.appendChild(this.scroll);
      this.svg = el('svg', { 'class': 'ce-svg' });
      this.scroll.appendChild(this.svg);

      if (!this.readOnly) {
        var svg = this.svg;
        svg.addEventListener('pointerdown', function (e) { self.onDown(e); });
        svg.addEventListener('pointermove', function (e) { self.onMove(e); });
        svg.addEventListener('pointerup', function (e) { self.onUp(e); });
        svg.addEventListener('pointercancel', function (e) { self.onUp(e); });
        svg.addEventListener('dblclick', function () {
          if (self.sel && self.sel.kind === 'node' && self.props) {
            var t = self.props.querySelector('textarea');
            if (t) t.focus();
          }
        });
        this.keyHandler = function (e) { self.onKey(e); };
        document.addEventListener('keydown', this.keyHandler);
        var w = this.scroll.clientWidth || 900;
        this.zoom = Math.max(0.5, Math.min(1, w / this.W));
        this.applyZoom();
        this.setTool('select');
        this.renderProps();
      }
    }

    applyZoom() {
      this.svg.style.width = Math.round(this.W * this.zoom) + 'px';
      this.svg.style.height = Math.round(this.H * this.zoom) + 'px';
    }

    setTool(t) {
      this.tool = t;
      this.connectFrom = null;
      if (this.toolbar) {
        this.toolbar.querySelectorAll('[data-tool]').forEach(function (b) {
          b.classList.toggle('active', b.dataset.tool === t);
        });
      }
      this.svg.style.touchAction = t === 'pan' ? 'auto' : 'none';
      this.svg.style.cursor = t === 'pan' ? 'grab' : (t === 'select' ? 'default' : 'crosshair');
      if (this.hint) this.hint.textContent = HINTS[t] || '';
      this.render();
    }

    act(a) {
      if (a === 'undo') this.undo();
      else if (a === 'zoomin') { this.zoom = Math.min(2, this.zoom + 0.15); this.applyZoom(); }
      else if (a === 'zoomout') { this.zoom = Math.max(0.3, this.zoom - 0.15); this.applyZoom(); }
      else if (a === 'fit') { this.zoom = Math.max(0.3, Math.min(1.5, (this.scroll.clientWidth || 900) / this.W)); this.applyZoom(); }
    }

    /* ---------- datos ---------- */
    snapshot() { return JSON.stringify({ nodes: this.nodes, edges: this.edges }); }
    pushHistory(snap) {
      this.history.push(snap || this.snapshot());
      if (this.history.length > 60) this.history.shift();
    }
    undo() {
      if (!this.history.length) return;
      var s = JSON.parse(this.history.pop());
      this.nodes = s.nodes; this.edges = s.edges;
      this.sel = null; this.connectFrom = null;
      this.render(); this.renderProps(); this.emit();
    }
    emit() { if (this.onChange) this.onChange(this.getData()); }
    getData() { return JSON.parse(JSON.stringify({ nodes: this.nodes, edges: this.edges })); }
    setData(d) {
      this.pushHistory();
      this.nodes = (d.nodes || []).map(function (n) { return Object.assign({}, n); });
      this.edges = (d.edges || []).map(function (e) { return Object.assign({}, e); });
      this.sel = null; this.render(); this.renderProps(); this.emit();
    }
    countElements() {
      return this.nodes.filter(function (n) { return n.type === 'logo' || (n.text || '').trim(); }).length;
    }
    destroy() { if (this.keyHandler) document.removeEventListener('keydown', this.keyHandler); }
    getNode(id) { return this.nodes.filter(function (n) { return n.id === id; })[0]; }
    getEdge(id) { return this.edges.filter(function (e) { return e.id === id; })[0]; }

    /* ---------- altas y bajas ---------- */
    addNode(type, pt) {
      this.pushHistory();
      var d = {
        rect: { w: 170, h: 80, fill: '#e8eef5', text: '', fs: 16 },
        ellipse: { w: 150, h: 100, fill: '#e8eef5', text: '', fs: 16 },
        text: { w: 200, h: 44, fill: 'none', text: 'Texto', fs: 20 }
      }[type];
      var n = Object.assign({ id: uid(), type: type }, d);
      n.x = Math.max(0, Math.min(this.W - n.w, Math.round((pt.x - n.w / 2) / 10) * 10));
      n.y = Math.max(0, Math.min(this.H - n.h, Math.round((pt.y - n.h / 2) / 10) * 10));
      this.nodes.push(n);
      this.sel = { kind: 'node', id: n.id };
      this.setTool('select');
      this.renderProps(); this.emit();
    }
    addLogo(id) {
      var l = (this.logos || []).filter(function (x) { return x.id === id; })[0];
      if (!l) return;
      this.pushHistory();
      var c = this.nodes.filter(function (n) { return n.type === 'logo'; }).length;
      var n = {
        id: uid(), type: 'logo', w: 130, h: 185,
        x: 40 + (c % 7) * 210, y: 40 + Math.floor(c / 7) * 240,
        text: l.nombre, logoId: l.id, logoColor: l.color, logoSigla: l.sigla, logoFile: l.archivo || null, fs: 15
      };
      this.nodes.push(n);
      this.sel = { kind: 'node', id: n.id };
      this.render(); this.renderProps(); this.emit();
      if (this.scroll) this.scroll.scrollTo({ left: Math.max(0, n.x * this.zoom - 40), top: Math.max(0, n.y * this.zoom - 40), behavior: 'smooth' });
    }
    addEdge(from, to) {
      var dup = this.edges.some(function (e) { return e.from === from && e.to === to; });
      if (dup) return;
      this.pushHistory();
      var e = { id: uid(), from: from, to: to, color: '#33393f', arrow: true };
      this.edges.push(e);
      this.sel = { kind: 'edge', id: e.id };
      this.renderProps(); this.emit();
    }
    deleteSelected() {
      if (!this.sel) return;
      this.pushHistory();
      var id = this.sel.id;
      if (this.sel.kind === 'node') {
        this.nodes = this.nodes.filter(function (n) { return n.id !== id; });
        this.edges = this.edges.filter(function (e) { return e.from !== id && e.to !== id; });
      } else {
        this.edges = this.edges.filter(function (e) { return e.id !== id; });
      }
      this.sel = null; this.render(); this.renderProps(); this.emit();
    }
    duplicateSelected() {
      if (!this.sel || this.sel.kind !== 'node') return;
      var n = this.getNode(this.sel.id);
      if (!n) return;
      this.pushHistory();
      var c = Object.assign({}, n, { id: uid(), x: Math.min(this.W - n.w, n.x + 30), y: Math.min(this.H - n.h, n.y + 30) });
      this.nodes.push(c);
      this.sel = { kind: 'node', id: c.id };
      this.render(); this.renderProps(); this.emit();
    }
    select(kind, id) {
      this.sel = kind ? { kind: kind, id: id } : null;
      this.render(); this.renderProps();
    }

    /* ---------- interacción ---------- */
    toLocal(e) {
      var rect = this.svg.getBoundingClientRect();
      var vb = this.svg.viewBox.baseVal;
      return { x: (e.clientX - rect.left) * vb.width / rect.width + vb.x, y: (e.clientY - rect.top) * vb.height / rect.height + vb.y };
    }
    onDown(e) {
      if (e.button !== undefined && e.button > 0) return;
      if (this.tool === 'pan') return;
      var pt = this.toLocal(e), t = e.target;
      if (this.tool === 'rect' || this.tool === 'ellipse' || this.tool === 'text') { this.addNode(this.tool, pt); return; }
      var handle = t.closest ? t.closest('[data-handle]') : null;
      var item = t.closest ? t.closest('[data-id]') : null;
      if (handle && this.sel && this.sel.kind === 'node') {
        var rn = this.getNode(this.sel.id);
        this.drag = { type: 'resize', n: rn, sx: pt.x, sy: pt.y, w: rn.w, h: rn.h, snap: this.snapshot(), moved: false };
        this.svg.setPointerCapture(e.pointerId); e.preventDefault(); return;
      }
      if (this.tool === 'connect') {
        if (item && item.dataset.kind === 'node') {
          var id = item.dataset.id;
          if (!this.connectFrom) { this.connectFrom = id; if (this.hint) this.hint.textContent = 'Origen elegido. Ahora toca el elemento de destino.'; }
          else if (this.connectFrom !== id) { this.addEdge(this.connectFrom, id); this.connectFrom = null; if (this.hint) this.hint.textContent = HINTS.connect; }
          else this.connectFrom = null;
        } else { this.connectFrom = null; if (this.hint) this.hint.textContent = HINTS.connect; }
        this.render();
        return;
      }
      if (item) {
        var kind = item.dataset.kind, iid = item.dataset.id;
        this.select(kind, iid);
        if (kind === 'node') {
          var n = this.getNode(iid);
          this.drag = { type: 'move', n: n, dx: pt.x - n.x, dy: pt.y - n.y, snap: this.snapshot(), moved: false };
          this.svg.setPointerCapture(e.pointerId);
        }
        e.preventDefault();
      } else {
        this.select(null);
      }
    }
    onMove(e) {
      var d = this.drag;
      if (!d) return;
      var pt = this.toLocal(e);
      if (d.type === 'move') {
        d.n.x = Math.max(0, Math.min(this.W - d.n.w, Math.round((pt.x - d.dx) / 10) * 10));
        d.n.y = Math.max(0, Math.min(this.H - d.n.h, Math.round((pt.y - d.dy) / 10) * 10));
      } else {
        d.n.w = Math.max(50, Math.min(this.W - d.n.x, Math.round((d.w + pt.x - d.sx) / 10) * 10));
        d.n.h = Math.max(30, Math.min(this.H - d.n.y, Math.round((d.h + pt.y - d.sy) / 10) * 10));
      }
      d.moved = true;
      this.render();
    }
    onUp(e) {
      var d = this.drag;
      if (!d) return;
      this.drag = null;
      try { this.svg.releasePointerCapture(e.pointerId); } catch (x) {}
      if (d.moved) { this.pushHistory(d.snap); this.emit(); }
    }
    onKey(e) {
      if (!this.root.isConnected) { document.removeEventListener('keydown', this.keyHandler); return; }
      var tag = (e.target.tagName || '').toUpperCase();
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if ((e.key === 'Delete' || e.key === 'Backspace') && this.sel) { e.preventDefault(); this.deleteSelected(); }
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); this.undo(); }
    }

    /* ---------- panel de propiedades ---------- */
    renderProps() {
      if (this.readOnly || !this.props) return;
      var self = this, p = this.props, s = this.sel;
      p.hidden = false;
      if (!s) { p.innerHTML = '<p class="ce-props-empty">Selecciona un elemento del lienzo para cambiar su texto, color o tamaño. Si no ves nada seleccionado, usa los botones de arriba para agregar formas.</p>'; p.onclick = null; return; }
      var sw = function (list, attr) {
        return list.map(function (c) {
          return '<button type="button" class="ce-sw" data-' + attr + '="' + c + '" style="background:' + c + '" aria-label="Color ' + c + '"></button>';
        }).join('');
      };
      if (s.kind === 'node') {
        var n = this.getNode(s.id);
        if (!n) { p.hidden = true; return; }
        p.innerHTML =
          '<div class="ce-props-row"><label>Texto del elemento<textarea rows="2" maxlength="200" placeholder="Escribe aquí"></textarea></label></div>' +
          '<div class="ce-props-row"><span class="ce-lbl">Color de relleno</span><div class="ce-swatches">' + sw(PALETTE, 'fill') +
          '<button type="button" class="ce-sw ce-sw-none" data-fill="none">Sin relleno</button>' +
          '<input type="color" class="ce-color" value="' + (isHex(n.fill) ? n.fill : '#e8eef5') + '" aria-label="Color personalizado"></div></div>' +
          '<div class="ce-props-row"><span class="ce-lbl">Letra</span>' +
          '<button type="button" data-p="fs-">A−</button><button type="button" data-p="fs+">A+</button>' +
          '<span class="ce-sep"></span>' +
          '<button type="button" data-p="front">Traer al frente</button>' +
          '<button type="button" data-p="dup">Duplicar</button>' +
          '<button type="button" data-p="del" class="danger">Eliminar</button></div>';
        var ta = p.querySelector('textarea');
        ta.value = n.text || '';
        ta.addEventListener('input', function () {
          if (!self.textTimer) self.pushHistory();
          clearTimeout(self.textTimer);
          self.textTimer = setTimeout(function () { self.textTimer = null; }, 900);
          n.text = ta.value;
          self.render(); self.emit();
        });
        p.querySelector('.ce-color').addEventListener('input', function (e) {
          self.pushHistory(); n.fill = e.target.value; self.render(); self.emit();
        });
        p.onclick = function (e) {
          var b = e.target.closest('button');
          if (!b) return;
          if (b.dataset.fill) { self.pushHistory(); n.fill = b.dataset.fill; self.render(); self.emit(); }
          else if (b.dataset.p === 'fs+') { self.pushHistory(); n.fs = Math.min(48, (n.fs || 16) + 2); self.render(); self.emit(); }
          else if (b.dataset.p === 'fs-') { self.pushHistory(); n.fs = Math.max(9, (n.fs || 16) - 2); self.render(); self.emit(); }
          else if (b.dataset.p === 'front') { self.pushHistory(); self.nodes = self.nodes.filter(function (x) { return x.id !== n.id; }); self.nodes.push(n); self.render(); self.emit(); }
          else if (b.dataset.p === 'dup') self.duplicateSelected();
          else if (b.dataset.p === 'del') self.deleteSelected();
        };
      } else {
        var ed = this.getEdge(s.id);
        if (!ed) { p.hidden = true; return; }
        p.innerHTML =
          '<div class="ce-props-row"><span class="ce-lbl">Conector — color</span><div class="ce-swatches">' + sw(EDGE_COLORS, 'ecolor') + '</div>' +
          '<label class="ce-check"><input type="checkbox" ' + (ed.arrow !== false ? 'checked' : '') + '> Con flecha</label>' +
          '<button type="button" data-p="del" class="danger">Eliminar conector</button></div>';
        p.querySelector('input[type=checkbox]').addEventListener('change', function (e) {
          self.pushHistory(); ed.arrow = e.target.checked; self.render(); self.emit();
        });
        p.onclick = function (e) {
          var b = e.target.closest('button');
          if (!b) return;
          if (b.dataset.ecolor) { self.pushHistory(); ed.color = b.dataset.ecolor; self.render(); self.emit(); }
          else if (b.dataset.p === 'del') self.deleteSelected();
        };
      }
    }

    /* ---------- dibujo ---------- */
    contentBox() {
      if (!this.nodes.length) return [0, 0, 800, 260];
      var x1 = 1e9, y1 = 1e9, x2 = -1e9, y2 = -1e9;
      this.nodes.forEach(function (n) {
        x1 = Math.min(x1, n.x); y1 = Math.min(y1, n.y); x2 = Math.max(x2, n.x + n.w); y2 = Math.max(y2, n.y + n.h);
      });
      var pad = 30;
      return [Math.round(x1 - pad), Math.round(y1 - pad), Math.max(400, Math.round(x2 - x1 + pad * 2)), Math.max(220, Math.round(y2 - y1 + pad * 2))];
    }
    anchor(n, tx, ty) {
      var cx = n.x + n.w / 2, cy = n.y + n.h / 2, dx = tx - cx, dy = ty - cy;
      if (!dx && !dy) return { x: cx, y: cy };
      var t = n.type === 'ellipse'
        ? 1 / Math.sqrt(Math.pow(dx / (n.w / 2), 2) + Math.pow(dy / (n.h / 2), 2))
        : 1 / Math.max(Math.abs(dx) / (n.w / 2), Math.abs(dy) / (n.h / 2));
      return { x: cx + dx * t, y: cy + dy * t };
    }
    render() {
      var self = this, svg = this.svg;
      svg.innerHTML = '';
      if (this.readOnly) {
        var vb = this.contentBox();
        svg.setAttribute('viewBox', vb.join(' '));
        svg.style.width = '100%'; svg.style.height = 'auto';
        svg.style.aspectRatio = vb[2] + ' / ' + vb[3];
        svg.style.maxHeight = '560px';
      } else {
        svg.setAttribute('viewBox', '0 0 ' + this.W + ' ' + this.H);
      }
      var defs = el('defs', null, svg);
      if (!this.readOnly) {
        var pat = el('pattern', { id: 'ce-grid', width: 20, height: 20, patternUnits: 'userSpaceOnUse' }, defs);
        el('circle', { cx: 1, cy: 1, r: 1, fill: '#cfd6dd' }, pat);
        el('rect', { x: 0, y: 0, width: this.W, height: this.H, fill: 'url(#ce-grid)' }, svg);
      }
      var colors = {};
      this.edges.forEach(function (e) { colors[e.color || '#33393f'] = 1; });
      Object.keys(colors).forEach(function (c) {
        var m = el('marker', { id: 'ar-' + c.slice(1), markerWidth: 12, markerHeight: 10, refX: 11, refY: 5, orient: 'auto', markerUnits: 'userSpaceOnUse' }, defs);
        el('path', { d: 'M0,0 L12,5 L0,10 z', fill: c }, m);
      });
      var gE = el('g', null, svg), gN = el('g', null, svg);
      this.edges.forEach(function (e) {
        var a = self.getNode(e.from), b = self.getNode(e.to);
        if (!a || !b) return;
        var p1 = self.anchor(a, b.x + b.w / 2, b.y + b.h / 2), p2 = self.anchor(b, a.x + a.w / 2, a.y + a.h / 2);
        var col = e.color || '#33393f';
        var g = el('g', { 'data-id': e.id, 'data-kind': 'edge' }, gE);
        if (self.sel && self.sel.kind === 'edge' && self.sel.id === e.id) {
          el('line', { x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y, stroke: '#4c8bf5', 'stroke-opacity': 0.35, 'stroke-width': 10, 'stroke-linecap': 'round' }, g);
        }
        if (!self.readOnly) el('line', { x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y, stroke: 'transparent', 'stroke-width': 20 }, g);
        var ln = el('line', { x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y, stroke: col, 'stroke-width': 3 }, g);
        if (e.arrow !== false) ln.setAttribute('marker-end', 'url(#ar-' + col.slice(1) + ')');
      });
      this.nodes.forEach(function (n) { self.drawNode(n, gN); });
    }
    drawText(g, n, w, h, y, fill, label) {
      var fo = el('foreignObject', { x: 0, y: y, width: w, height: h, 'pointer-events': 'none' }, g);
      var d = document.createElement('div');
      var empty = !label && !this.readOnly;
      var col = empty ? '#94a3b8' : textColor(n, fill);
      d.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml');
      d.style.cssText = 'display:flex;align-items:center;justify-content:center;text-align:center;width:100%;height:100%;box-sizing:border-box;padding:4px 8px;overflow:hidden;white-space:pre-wrap;word-break:break-word;pointer-events:none;' +
        'font-family:Inter,Arial,sans-serif;line-height:1.2;font-size:' + (n.fs || 16) + 'px;color:' + col + ';font-weight:' + (empty ? 400 : 600) + ';' + (empty ? 'font-style:italic;' : '');
      d.textContent = label || (empty ? 'Escribe aquí' : '');
      fo.appendChild(d);
    }
    drawLogo(n, g) {
      var s = Math.max(40, Math.min(n.w, n.h - 30)), x0 = (n.w - s) / 2;
      var fill = isHex(n.fill) ? n.fill : (n.logoColor || '#1a3c6e');
      if (n.logoFile) {
        el('rect', { x: x0, y: 0, width: s, height: s, rx: 14, fill: '#ffffff', stroke: '#cfd6dd', 'stroke-width': 2 }, g);
        var img = el('image', { x: x0 + 6, y: 6, width: s - 12, height: s - 12, preserveAspectRatio: 'xMidYMid meet' }, g);
        img.setAttribute('href', 'assets/logos/' + n.logoFile);
        img.setAttributeNS(XL, 'href', 'assets/logos/' + n.logoFile);
        img.addEventListener('error', function () {
          img.remove();
          var tx = el('text', { x: n.w / 2, y: s / 2 + 8, 'text-anchor': 'middle', 'font-size': s * 0.3, 'font-weight': 700, fill: '#33393f', 'pointer-events': 'none' }, g);
          tx.textContent = n.logoSigla || '';
        });
      } else {
        el('rect', { x: x0, y: 0, width: s, height: s, rx: 14, fill: fill, stroke: 'rgba(0,0,0,.15)', 'stroke-width': 2 }, g);
        var t = el('text', { x: n.w / 2, y: s / 2 + s * 0.13, 'text-anchor': 'middle', 'font-size': s * 0.36, 'font-weight': 700, fill: isHex(fill) && lum(fill) > 0.6 ? '#0f2a4d' : '#ffffff', 'pointer-events': 'none', 'font-family': 'Inter,Arial,sans-serif' }, g);
        t.textContent = n.logoSigla || '';
      }
      var tc = Object.assign({}, n, { color: n.color || '#0f2a4d' });
      this.drawText(g, tc, n.w, Math.max(20, n.h - s - 2), s + 2, '#ffffff', n.text);
    }
    drawNode(n, parent) {
      var g = el('g', { 'data-id': n.id, 'data-kind': 'node', transform: 'translate(' + n.x + ',' + n.y + ')' }, parent);
      var fill = n.fill || (n.type === 'text' ? 'none' : '#e8eef5'), stroke = n.stroke || '#1a3c6e';
      if (n.type === 'rect') el('rect', { width: n.w, height: n.h, rx: 10, fill: fill, stroke: stroke, 'stroke-width': 2 }, g);
      else if (n.type === 'ellipse') el('ellipse', { cx: n.w / 2, cy: n.h / 2, rx: n.w / 2, ry: n.h / 2, fill: fill, stroke: stroke, 'stroke-width': 2 }, g);
      else if (n.type === 'text') el('rect', { width: n.w, height: n.h, fill: 'transparent' }, g);
      else if (n.type === 'logo') { el('rect', { width: n.w, height: n.h, fill: 'transparent' }, g); this.drawLogo(n, g); }
      if (n.type !== 'logo') this.drawText(g, n, n.w, n.h, 0, fill, n.text);
      if (this.readOnly) return;
      if (this.connectFrom === n.id) {
        el('rect', { x: -6, y: -6, width: n.w + 12, height: n.h + 12, fill: 'none', stroke: '#f59e0b', 'stroke-width': 3, rx: 12, 'pointer-events': 'none' }, g);
      }
      if (this.sel && this.sel.kind === 'node' && this.sel.id === n.id) {
        el('rect', { x: -5, y: -5, width: n.w + 10, height: n.h + 10, fill: 'none', stroke: '#2563eb', 'stroke-width': 2, 'stroke-dasharray': '6 4', 'pointer-events': 'none' }, g);
        el('circle', { cx: n.w, cy: n.h, r: 12, fill: '#2563eb', stroke: '#ffffff', 'stroke-width': 2, 'data-handle': 'se', style: 'cursor:nwse-resize' }, g);
      }
    }
  }

  /* ---------- comparación de mapas de estructura (Sesión 3) ---------- */
  function nodeKey(n) {
    var t = (n.text || '').trim().toLowerCase();
    if (n.logoId) return 'logo:' + n.logoId;
    return t ? 'txt:' + t : null;
  }
  function nodeLabel(n) { return (n.text || '').trim() || n.logoId || 'Elemento'; }
  function neighbors(data) {
    var byId = {}, m = {}, labels = {};
    (data.nodes || []).forEach(function (n) {
      byId[n.id] = n;
      var k = nodeKey(n);
      if (k) { m[k] = m[k] || {}; labels[k] = nodeLabel(n); }
    });
    (data.edges || []).forEach(function (e) {
      var a = byId[e.from], b = byId[e.to];
      if (!a || !b) return;
      var ka = nodeKey(a), kb = nodeKey(b);
      if (!ka || !kb) return;
      m[ka][kb] = 1; m[kb][ka] = 1;
    });
    return { m: m, labels: labels };
  }
  function identifiedElements(data, ref) {
    var nodes = (data && data.nodes) || [];
    return ref.filter(function (r) {
      return nodes.some(function (n) {
        if (n.logoId === r.id) return true;
        var t = (n.text || '').toLowerCase();
        return r.claves.some(function (c) { return t.indexOf(c) !== -1; });
      });
    }).map(function (r) { return r.id; });
  }
  function compareMaps(a, b, ref) {
    a = a || { nodes: [], edges: [] }; b = b || { nodes: [], edges: [] };
    var na = neighbors(a), nb = neighbors(b);
    var added = [], removed = [], modified = [];
    Object.keys(nb.m).forEach(function (k) {
      if (!na.m[k]) added.push(nb.labels[k]);
      else if (Object.keys(na.m[k]).sort().join('|') !== Object.keys(nb.m[k]).sort().join('|')) modified.push(nb.labels[k]);
    });
    Object.keys(na.m).forEach(function (k) { if (!nb.m[k]) removed.push(na.labels[k]); });
    return {
      initialCount: a.nodes.length, finalCount: b.nodes.length,
      relInitial: a.edges.length, relFinal: b.edges.length,
      idInitial: identifiedElements(a, ref).length, idFinal: identifiedElements(b, ref).length, refTotal: ref.length,
      added: added, removed: removed, modified: modified
    };
  }

  window.CanvasEditor = CanvasEditor;
  window.compareMaps = compareMaps;
  window.identifiedElements = identifiedElements;
})();
