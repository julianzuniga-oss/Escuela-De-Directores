/**
 * mapa-builder.js
 * Componente reutilizable para construir mapas de tarjetas organizadas por
 * categoría (Sesión 1: mapa de expectativas / Sesión 2: mapa de estructura).
 *
 * Uso:
 *   const builder = new MapaBuilder({
 *     containerId: "mapa-container",
 *     table: "expectation_maps",
 *     participantId: participant.id,
 *     categories: ["Liderazgo", "Equipo", ...],
 *     extraFilter: {},        // filtro adicional (p.ej. { version: "inicial" })
 *     readOnly: false,
 *     fieldLabels: { title: "Título", description: "Descripción", priority: "Prioridad" }
 *   });
 *   await builder.load();
 */

class MapaBuilder {
  constructor(opts) {
    this.containerId = opts.containerId;
    this.table = opts.table;
    this.participantId = opts.participantId;
    this.categories = opts.categories;
    this.extraFilter = opts.extraFilter || {};
    this.readOnly = !!opts.readOnly;
    this.items = [];
  }

  container() {
    return document.getElementById(this.containerId);
  }

  async load() {
    const filter = Object.assign({ participant_id: this.participantId }, this.extraFilter);
    this.items = await DB.selectWhere(this.table, filter);
    this.render();
  }

  render() {
    const el = this.container();
    if (!el) return;

    el.innerHTML = "";
    el.className = "mapa-grid";

    this.categories.forEach((cat) => {
      const col = document.createElement("div");
      col.className = "mapa-columna";

      const itemsInCat = this.items
        .filter((i) => i.category === cat)
        .sort((a, b) => (a.position || 0) - (b.position || 0));

      col.innerHTML = `
        <h3 class="mapa-columna-titulo">${cat}</h3>
        <div class="mapa-tarjetas" data-cat="${cat}"></div>
        ${
          this.readOnly
            ? ""
            : `<button type="button" class="btn-secondary btn-add-card" data-cat="${cat}">+ Agregar</button>`
        }
      `;

      const tarjetasEl = col.querySelector(".mapa-tarjetas");
      itemsInCat.forEach((item) => tarjetasEl.appendChild(this.renderCard(item)));

      el.appendChild(col);
    });

    if (!this.readOnly) {
      el.querySelectorAll(".btn-add-card").forEach((btn) => {
        btn.addEventListener("click", () => this.openForm(btn.dataset.cat));
      });
    }
  }

  renderCard(item) {
    const card = document.createElement("div");
    card.className = "mapa-tarjeta";
    card.innerHTML = `
      <div class="mapa-tarjeta-titulo">${escapeHtml(item.title || "")}</div>
      <div class="mapa-tarjeta-desc">${escapeHtml(item.description || "")}</div>
      ${item.priority ? `<span class="badge">Prioridad: ${escapeHtml(item.priority)}</span>` : ""}
      ${
        !this.readOnly
          ? `<div class="mapa-tarjeta-acciones">
              <button type="button" class="icon-btn" data-action="up" title="Mover arriba">↑</button>
              <button type="button" class="icon-btn" data-action="down" title="Mover abajo">↓</button>
              <button type="button" class="icon-btn" data-action="edit" title="Editar">Editar</button>
              <button type="button" class="icon-btn" data-action="delete" title="Eliminar">Eliminar</button>
            </div>`
          : ""
      }
    `;

    if (!this.readOnly) {
      card.querySelector('[data-action="edit"]').addEventListener("click", () => this.openForm(item.category, item));
      card.querySelector('[data-action="delete"]').addEventListener("click", () => this.deleteItem(item));
      card.querySelector('[data-action="up"]').addEventListener("click", () => this.move(item, -1));
      card.querySelector('[data-action="down"]').addEventListener("click", () => this.move(item, 1));
    }
    return card;
  }

  async move(item, direction) {
    const siblings = this.items
      .filter((i) => i.category === item.category)
      .sort((a, b) => (a.position || 0) - (b.position || 0));
    const idx = siblings.findIndex((i) => i.id === item.id);
    const swapIdx = idx + direction;
    if (swapIdx < 0 || swapIdx >= siblings.length) return;

    const a = siblings[idx];
    const b = siblings[swapIdx];
    const posA = a.position || 0;
    const posB = b.position || 0;
    await DB.update(this.table, a.id, { position: posB });
    await DB.update(this.table, b.id, { position: posA });
    a.position = posB;
    b.position = posA;
    this.render();
  }

  openForm(category, existing) {
    const el = this.container();
    const modal = document.createElement("div");
    modal.className = "modal-overlay";
    modal.innerHTML = `
      <div class="modal-box">
        <h3>${existing ? "Editar" : "Agregar"} elemento — ${category}</h3>
        <form id="mapa-form">
          <label>Título
            <input type="text" name="title" required maxlength="80" value="${existing ? escapeHtml(existing.title || "") : ""}">
          </label>
          <label>Descripción
            <textarea name="description" rows="3" maxlength="400">${existing ? escapeHtml(existing.description || "") : ""}</textarea>
          </label>
          <label>Expectativa / detalle
            <textarea name="expectation" rows="2" maxlength="300">${existing ? escapeHtml(existing.expectation || "") : ""}</textarea>
          </label>
          <label>Prioridad
            <select name="priority">
              <option value="Alta" ${existing && existing.priority === "Alta" ? "selected" : ""}>Alta</option>
              <option value="Media" ${!existing || existing.priority === "Media" ? "selected" : ""}>Media</option>
              <option value="Baja" ${existing && existing.priority === "Baja" ? "selected" : ""}>Baja</option>
            </select>
          </label>
          <div class="modal-actions">
            <button type="button" class="btn-secondary" id="mapa-cancel">Cancelar</button>
            <button type="submit" class="btn-primary">Guardar</button>
          </div>
        </form>
      </div>
    `;
    document.body.appendChild(modal);

    modal.querySelector("#mapa-cancel").addEventListener("click", () => modal.remove());
    modal.querySelector("#mapa-form").addEventListener("submit", async (ev) => {
      ev.preventDefault();
      const fd = new FormData(ev.target);
      const data = {
        participant_id: this.participantId,
        category,
        title: fd.get("title").trim(),
        description: fd.get("description").trim(),
        expectation: fd.get("expectation").trim(),
        priority: fd.get("priority"),
        position: existing ? existing.position || 0 : this.items.filter((i) => i.category === category).length
      };
      Object.assign(data, this.extraFilter);

      if (existing) {
        await DB.update(this.table, existing.id, data);
      } else {
        await DB.insert(this.table, data);
      }
      modal.remove();
      showToast("Actividad guardada correctamente.", "success");
      await this.load();
    });
  }

  async deleteItem(item) {
    await DB.remove(this.table, item.id);
    showToast("Elemento eliminado.", "info");
    await this.load();
  }

  count() {
    return this.items.length;
  }
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
