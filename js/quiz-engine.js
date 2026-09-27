/**
 * quiz-engine.js
 * Motor reutilizable para presentar preguntas ABCD, una a la vez.
 *
 * Modo "scored": cada pregunta tiene una opción correcta -> % de aciertos.
 * Modo "skills": cada opción suma puntos a una o más dimensiones/habilidades
 *                -> perfil de 0 a 100 por dimensión, sin "correcto/incorrecto".
 *
 * Formato esperado de cada pregunta:
 * {
 *   id, prompt, context,
 *   options: [{ id:"a", text:"...", correct:true|false, skills:{comunicacion:3, liderazgo:1} }, ...]
 * }
 */

class QuizEngine {
  constructor(opts) {
    this.containerId = opts.containerId;
    this.questions = opts.questions;
    this.mode = opts.mode || "scored"; // "scored" | "skills"
    this.onComplete = opts.onComplete || function () {};
    this.current = 0;
    this.answers = [];
    this.startTime = Date.now();
  }

  container() {
    return document.getElementById(this.containerId);
  }

  start() {
    this.current = 0;
    this.answers = [];
    this.startTime = Date.now();
    this.renderQuestion();
  }

  renderQuestion() {
    const el = this.container();
    const q = this.questions[this.current];
    if (!q) return this.finish();

    el.innerHTML = `
      <div class="quiz-progreso">Pregunta ${this.current + 1} de ${this.questions.length}</div>
      ${q.context ? `<div class="quiz-contexto">${q.context}</div>` : ""}
      <div class="quiz-pregunta">${q.prompt}</div>
      <div class="quiz-opciones">
        ${q.options
          .map(
            (opt) => `
          <button type="button" class="quiz-opcion" data-id="${opt.id}">
            <span class="quiz-opcion-letra">${opt.id.toUpperCase()}.</span>
            <span class="quiz-opcion-texto">${opt.text}</span>
          </button>`
          )
          .join("")}
      </div>
    `;

    el.querySelectorAll(".quiz-opcion").forEach((btn) => {
      btn.addEventListener("click", () => this.selectAnswer(btn.dataset.id));
    });
  }

  selectAnswer(optionId) {
    const q = this.questions[this.current];
    const option = q.options.find((o) => o.id === optionId);

    // Bloquear la pregunta: deshabilitar botones y marcar visualmente
    this.container()
      .querySelectorAll(".quiz-opcion")
      .forEach((btn) => {
        btn.disabled = true;
        if (btn.dataset.id === optionId) btn.classList.add("selected");
      });

    this.answers.push({
      question_id: q.id,
      option_id: optionId,
      correct: !!option.correct,
      skills: option.skills || {}
    });

    setTimeout(() => {
      this.current += 1;
      this.renderQuestion();
    }, 350);
  }

  finish() {
    const timeSeconds = Math.round((Date.now() - this.startTime) / 1000);

    const computeProfile = () => {
      const totals = {};
      const maxima = {};
      this.answers.forEach((a) => {
        Object.entries(a.skills).forEach(([dim, val]) => {
          totals[dim] = (totals[dim] || 0) + val;
          maxima[dim] = (maxima[dim] || 0) + 3; // 3 = puntaje máximo asumido por opción
        });
      });
      const profile = {};
      Object.keys(totals).forEach((dim) => {
        profile[dim] = maxima[dim] ? Math.max(0, Math.round((totals[dim] / maxima[dim]) * 100)) : 0;
      });
      return profile;
    };

    if (this.mode === "scored") {
      const correctCount = this.answers.filter((a) => a.correct).length;
      const total = this.questions.length;
      const result = {
        correct: correctCount,
        total,
        percentage: Math.round((correctCount / total) * 100),
        time_seconds: timeSeconds,
        answers: this.answers
      };
      this.onComplete(result);
    } else if (this.mode === "combined") {
      const correctCount = this.answers.filter((a) => a.correct).length;
      const total = this.questions.length;
      this.onComplete({
        correct: correctCount,
        toReview: total - correctCount,
        total,
        percentage: Math.round((correctCount / total) * 100),
        profile: computeProfile(),
        time_seconds: timeSeconds,
        answers: this.answers
      });
    } else {
      this.onComplete({ profile: computeProfile(), time_seconds: timeSeconds, answers: this.answers });
    }
  }
}
