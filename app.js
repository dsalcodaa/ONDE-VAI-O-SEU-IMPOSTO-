/* Para onde vai o seu imposto? 2.0 — Governo do Amazonas 2019–2026. Sem bibliotecas externas. */
"use strict";
const $ = (s, r = document) => r.querySelector(s);
const APP = $("#app");
const PODERES = ["Executivo", "Legislativo", "Judiciário", "Tribunal de Contas", "Ministério Público", "Defensoria Pública"];
const AUTONOMOS = new Set(["Tribunal de Contas", "Ministério Público", "Defensoria Pública"]);
const COR = ["var(--s1)", "var(--s2)", "var(--s3)", "var(--s4)", "var(--s5)", "var(--s7)", "var(--s6)", "var(--s8)"];
const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const PARCIAL = 2026;

/* ---------- formatação: valores sempre completos ---------- */
const nf2 = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const nf0 = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });
const R = v => (v == null || isNaN(v)) ? "–" : "R$ " + nf2.format(v);
const N = v => (v == null || isNaN(v)) ? "–" : nf0.format(v);
const PC = (a, b) => b ? nf2.format(a / b * 100) + "%" : "–";
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const YL = y => +y === PARCIAL ? `${y}*` : String(y);
const eixo = v => { const a = Math.abs(v); if (a >= 1e9) return nf0.format(v / 1e9) + " bilhões"; if (a >= 1e6) return nf0.format(v / 1e6) + " milhões"; if (a >= 1e3) return nf0.format(v / 1e3) + " mil"; return nf0.format(v); };
const norm = s => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const dig = s => String(s || "").replace(/\D/g, "");
function dataISO(s) {
  s = String(s || "").trim(); let m;
  if ((m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/))) return `${m[3]}-${m[2]}-${m[1]}`;
  if ((m = s.match(/^(\d{4})-(\d{2})-(\d{2})/))) return `${m[1]}-${m[2]}-${m[3]}`;
  if ((m = s.match(/^(\d{4})(\d{2})(\d{2})$/))) return `${m[1]}-${m[2]}-${m[3]}`;
  return "";
}
const DBR = s => { const d = dataISO(s); return d ? `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}` : (s || "–"); };
const pbadge = p => `<span class="badge p${PODERES.indexOf(p)}">${esc(p)}</span>`;

/* ---------- dados (carregados sob demanda) ---------- */
const cache = {};
function get(path) {
  if (!cache[path]) cache[path] = fetch("data/" + path).then(r => { if (!r.ok) throw new Error(path + " " + r.status); return r.json(); });
  return cache[path];
}
let GERAL, ORGAOS, ORGMAP = {};
async function base() {
  if (!GERAL) [GERAL, ORGAOS] = await Promise.all([get("geral.json"), get("orgaos.json")]);
  if (!Object.keys(ORGMAP).length) ORGAOS.forEach(o => ORGMAP[o[0]] = { ug: o[0], sigla: o[1], nome: o[2], poder: o[3] });
  DC = GERAL.meta.atualizado || DC; HOJE = DC.split("/").reverse().join("-");
  return GERAL;
}
const orgLink = ug => { const o = ORGMAP[ug]; return o ? `<a href="#/orgao/${ug}">${esc(o.sigla)}</a> <span class="muted small">${esc(o.nome)}</span>` : esc(ug || "não identificado"); };

/* ---------- estado ---------- */
let ANO = 2025;
const anosChips = (anos, onPick, cur = ANO) => `<div class="chips" role="group" aria-label="Escolha o ano">${anos.map(y =>
  `<button class="chip" type="button" data-ano="${y}" aria-pressed="${+y === +cur}">${YL(y)}</button>`).join("")}</div>`;
function bindChips(root, cb) {
  root.querySelectorAll(".chips [data-ano]").forEach(b => b.addEventListener("click", () => {
    root.querySelectorAll(".chips [data-ano]").forEach(x => x.setAttribute("aria-pressed", x === b)); cb(+b.dataset.ano);
  }));
}

/* ---------- tooltip ---------- */
const TIP = $("#tip");
document.addEventListener("pointermove", e => {
  const t = e.target.closest("[data-tip]");
  if (!t) { TIP.hidden = true; return; }
  TIP.innerHTML = t.dataset.tip; TIP.hidden = false;
  const x = Math.min(e.clientX + 14, innerWidth - TIP.offsetWidth - 8), y = e.clientY + 16 + TIP.offsetHeight > innerHeight ? e.clientY - TIP.offsetHeight - 10 : e.clientY + 16;
  TIP.style.left = x + "px"; TIP.style.top = y + "px";
});

/* ---------- gráficos ---------- */
function hbars(rows, { fmt = R, max, color = "var(--s1)", click } = {}) {
  const m = max || Math.max(...rows.map(r => r[1]), 1);
  return `<div class="hb">${rows.map((r, i) => `<div class="row${click ? " click" : ""}" ${click ? `data-i="${i}" tabindex="0" role="button"` : ""} data-tip="${esc(r[0])}<br><b>${esc(fmt(r[1]))}</b>${r[2] ? "<br>" + esc(r[2]) : ""}">
    <div class="lb">${esc(r[0])}</div><div class="tr"><div class="bar" style="width:${Math.max(0.3, r[1] / m * 70)}%;background:${r[3] || color}"></div><span class="val">${esc(fmt(r[1]))}</span></div></div>`).join("")}</div>`;
}
function cols(items, { color = "var(--s1)", fmt = R, h = 190 } = {}) {   // items: [label, valor, tip?]
  const m = Math.max(...items.map(i => i[1]), 1);
  return `<div class="cols" style="height:${h}px">${items.map(i => `<div class="col" data-tip="${esc(i[0])}<br><b>${esc(fmt(i[1]))}</b>${i[2] ? "<br>" + esc(i[2]) : ""}">
    <div class="b" style="height:${Math.max(1, i[1] / m * 100)}%;background:${i[3] || color}"></div></div>`).join("")}</div>
    <div class="cl">${items.map(i => `<span>${esc(i[0])}</span>`).join("")}</div>`;
}
function gcols(cats, series, names, { colors = ["var(--s1)", "var(--s2)", "var(--s3)"], fmt = R, h = 200 } = {}) {
  const m = Math.max(...series.flat(), 1);
  return `<div class="cols" style="height:${h}px">${cats.map((c, ci) => `<div class="grp">${series.map((s, si) =>
    `<div class="gb" data-tip="${esc(c)} · ${esc(names[si])}<br><b>${esc(fmt(s[ci]))}</b>"><div class="b" style="height:${Math.max(0.5, s[ci] / m * 100)}%;background:${colors[si]}"></div></div>`).join("")}</div>`).join("")}</div>
    <div class="cl">${cats.map(c => `<span>${esc(c)}</span>`).join("")}</div>
    <div class="legend-row">${names.map((n, i) => `<span><i class="sw" style="background:${colors[i]}"></i>${esc(n)}</span>`).join("")}</div>`;
}
function linhas(series, names, labels, { colors = ["var(--s3)", "var(--s2)", "var(--s1)"], h = 240 } = {}) {
  const W = 760, H = h, pl = 92, pr = 16, pt = 14, pb = 28;
  const vals = series.flat().filter(v => v != null); const mx = Math.max(...vals, 1) * 1.08;
  const x = i => pl + i * (W - pl - pr) / Math.max(1, labels.length - 1), y = v => pt + (H - pt - pb) * (1 - v / mx);
  const ticks = [0, .25, .5, .75, 1].map(t => mx * t);
  let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(names.join(" e "))} por mês">`;
  s += ticks.map(t => `<line class="gl" x1="${pl}" x2="${W - pr}" y1="${y(t)}" y2="${y(t)}"/><text x="${pl - 6}" y="${y(t) + 4}" text-anchor="end">${eixo(t)}</text>`).join("");
  s += labels.map((l, i) => `<text x="${x(i)}" y="${H - 8}" text-anchor="middle">${esc(l)}</text>`).join("");
  series.forEach((se, si) => {
    const pts = se.map((v, i) => v == null ? null : [x(i), y(v), v, i]).filter(Boolean);
    s += `<polyline class="ln" stroke="${colors[si]}" points="${pts.map(p => p[0] + "," + p[1]).join(" ")}"/>`;
    s += pts.map(p => `<circle class="pt" cx="${p[0]}" cy="${p[1]}" r="4.5" fill="${colors[si]}" data-tip="${esc(labels[p[3]])} · ${esc(names[si])}<br><b>${esc(R(p[2]))}</b>"/>`).join("");
  });
  return `<div class="chart">${s}</svg></div><div class="legend-row">${names.map((n, i) => `<span><i class="sw" style="background:${colors[i]}"></i>${esc(n)}</span>`).join("")}</div>`;
}
function stack100(rows) {   // rows: [nome, valor]
  const t = rows.reduce((a, r) => a + r[1], 0) || 1;
  const top = rows.slice(0, 7), rest = rows.slice(7).reduce((a, r) => a + r[1], 0);
  const segs = rest > 0 ? [...top, ["Outras áreas", rest]] : top;
  const cor = i => i < 7 ? COR[i] : "var(--other)";
  return `<div class="stack">${segs.map((r, i) => { const p = r[1] / t * 100; return `<div class="seg${i === 3 ? " dark" : ""}" style="flex:${p};background:${cor(i)}" data-tip="${esc(r[0])}<br><b>R$ ${nf2.format(p)} de cada R$ 100</b><br>${esc(R(r[1]))}">${p >= 6 ? nf0.format(p) : ""}</div>`; }).join("")}</div>
  <ul class="legend">${segs.map((r, i) => `<li><span class="sw" style="background:${cor(i)}"></span><span><b>R$ ${nf2.format(r[1] / t * 100)}</b> ${esc(r[0])}<br><span class="muted small">${esc(R(r[1]))}</span></span></li>`).join("")}</ul>`;
}

/* ---------- tabela com busca, ordenação, paginação e CSV ---------- */
// cols: [{k: índice ou função, t: título, r: alinhado à direita, f: formatador html, csv: função texto, w: classe}]
function tabela(host, rows, cols, { busca = true, pag = 100, ordem = null, nome = "tabela", total = null, rowClass = null, filtros = "" } = {}) {
  let q = "", sortI = ordem ? ordem[0] : null, sortD = ordem ? ordem[1] : -1, lim = pag, data = rows;
  const val = (r, c) => typeof c.k === "function" ? c.k(r) : r[c.k];
  host.innerHTML = `<div class="tools">${busca ? `<input type="search" placeholder="Buscar nesta tabela" aria-label="Buscar nesta tabela">` : ""}${filtros}
    <button class="btn-ghost csv" type="button">Baixar CSV</button></div><div class="pager top"></div><div class="tw"><table class="tab"><thead><tr>${cols.map((c, i) =>
    `<th class="s${c.r ? " r" : ""}" data-i="${i}" scope="col">${c.t}<span class="ar"></span></th>`).join("")}</tr></thead><tbody></tbody>${total ? "<tfoot></tfoot>" : ""}</table></div><div class="pager bot"></div>`;
  const tb = host.querySelector("tbody"), tf = host.querySelector("tfoot");
  function render() {
    let d = rows;
    if (q) { const qs = norm(q).split(/\s+/).filter(Boolean); d = d.filter(r => { const s = norm(cols.map(c => val(r, c)).join(" ")); return qs.every(w => s.includes(w)); }); }
    if (sortI != null) { const c = cols[sortI]; d = [...d].sort((a, b) => { const x = val(a, c), y = val(b, c); return (typeof x === "number" && typeof y === "number" ? x - y : String(x ?? "").localeCompare(String(y ?? ""), "pt-BR")) * sortD; }); }
    data = d;
    tb.innerHTML = d.slice(0, lim).map(r => `<tr${rowClass ? ` class="${rowClass(r) || ""}"` : ""}>${cols.map(c => { const v = val(r, c); return `<td class="${c.r ? "r" : ""} ${c.w || ""}">${c.f ? c.f(v, r) : esc(v)}</td>`; }).join("")}</tr>`).join("") ||
      `<tr><td colspan="${cols.length}" class="muted">Nenhum registro.</td></tr>`;
    if (tf) tf.innerHTML = `<tr>${cols.map((c, i) => `<td class="${c.r ? "r" : ""}">${i === 0 ? "Total" + (q ? " (filtrado)" : "") : total[i] ? esc(total[i](d)) : ""}</td>`).join("")}</tr>`;
    const msg = `${N(Math.min(lim, d.length))} de ${N(d.length)} registros`;
    host.querySelectorAll(".pager").forEach(p => p.innerHTML = `<span>${msg}</span>${d.length > lim ? `<span><button class="btn-ghost mais" type="button">Mostrar mais ${N(Math.min(pag * 5, d.length - lim))}</button> <button class="btn-ghost tudo" type="button">Mostrar todos</button></span>` : ""}`);
    host.querySelectorAll(".mais").forEach(b => b.onclick = () => { lim += pag * 5; render(); });
    host.querySelectorAll(".tudo").forEach(b => b.onclick = () => { lim = d.length; render(); });
    host.querySelectorAll("th.s .ar").forEach((a, i) => a.textContent = i === sortI ? (sortD > 0 ? "▲" : "▼") : "");
  }
  host.querySelectorAll("th.s").forEach(th => th.onclick = () => { const i = +th.dataset.i; sortD = sortI === i ? -sortD : (cols[i].r ? -1 : 1); sortI = i; render(); });
  const inp = host.querySelector("input[type=search]"); let to;
  if (inp) inp.oninput = () => { clearTimeout(to); to = setTimeout(() => { q = inp.value.trim(); lim = pag; render(); }, 200); };
  host.querySelector(".csv").onclick = () => {
    const cell = (c, r) => { const v = c.csv ? c.csv(val(r, c), r) : val(r, c); return typeof v === "number" ? String(v).replace(".", ",") : `"${String(v ?? "").replace(/<[^>]+>/g, "").replace(/"/g, '""')}"`; };
    const txt = "﻿" + cols.map(c => `"${c.t.replace(/<[^>]+>/g, "")}"`).join(";") + "\n" + data.map(r => cols.map(c => cell(c, r)).join(";")).join("\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([txt], { type: "text/csv;charset=utf-8" })); a.download = nome + ".csv"; a.click();
  };
  render();
  return { set(r) { rows = r; lim = pag; render(); } };
}
// calendário de pagamentos: linhas = anos, colunas = meses; cor mais forte = mês com mais pagamento. Valores completos em R$.
function calendario(mes) {
  const anos = Object.keys(mes || {}).sort();
  if (!anos.length) return `<p class="muted">Nenhum pagamento registrado por mês nesta fonte.</p>`;
  const max = Math.max(1, ...anos.flatMap(y => mes[y]));
  const totM = MESES.map((_, m) => anos.reduce((a, y) => a + (mes[y][m] || 0), 0));
  const linha = y => { const v = mes[y], top = Math.max(...v);
    return `<tr><th scope="row">${YL(y)}</th>${v.map((x, m) => +y === PARCIAL && m >= 10 ? `<td class="z" title="mês ainda não terminou na data da coleta">·</td>`
      : x ? `<td style="--h:${(x / max).toFixed(3)}"${x === top ? ' class="top"' : ""} title="${MESES[m]}/${y}: ${R(x)}">${nf2.format(x)}</td>` : `<td class="z">–</td>`).join("")}<td class="t">${nf2.format(v.reduce((a, b) => a + b, 0))}</td></tr>`; };
  return `<div class="cal-wrap"><table class="cal"><thead><tr><th>Ano</th>${MESES.map(m => `<th>${m}</th>`).join("")}<th>Total do ano</th></tr></thead>
    <tbody>${anos.map(linha).join("")}</tbody><tfoot><tr><th>Total</th>${totM.map(v => `<td class="t">${nf2.format(v)}</td>`).join("")}<td class="t">${nf2.format(totM.reduce((a, b) => a + b, 0))}</td></tr></tfoot></table></div>
    <p class="muted small">Valores em R$. Pago do ano + pago de anos anteriores, no mês em que o dinheiro saiu. Cor mais forte = mês com mais pagamento; contorno = maior mês de cada ano.</p>`;
}
const cR = (t, k, o = {}) => ({ t, k, r: 1, f: v => esc(R(v)), csv: v => v, ...o });
const sumF = k => d => R(d.reduce((a, r) => a + (+(typeof k === "function" ? k(r) : r[k]) || 0), 0));

/* ---------- páginas ---------- */
const head = (titulo, sub, crumb = "") => `<section class="page-h"><div class="wrap">${crumb ? `<p class="crumb">${crumb}</p>` : ""}<h1>${titulo}</h1>${sub ? `<p class="lead">${sub}</p>` : ""}</div></section>`;
let DC = "01/11/2026", HOJE = "2026-11-01";   // trocados pela data da coleta em base()
const nota26f = () => `<p class="note">* 2026 é parcial: vai de janeiro até a data da coleta (${DC}). Não compare 2026 com anos fechados como se fosse o ano inteiro.</p>`;

async function pInicio() {
  const g = await base(); const A = g.anos;
  const pagoT = A.filter(y => y < PARCIAL).reduce((a, y) => a + g.exec[y][4], 0);
  APP.innerHTML = `<section class="hero"><div class="wrap">
    <p class="eyebrow">Governo do Estado do Amazonas · 2019 a 2026</p>
    <h1>Para onde vai o <em>seu imposto</em>?</h1>
    <p class="lead">De 2019 a 2025, o Estado pagou <b>${R(pagoT)}</b> em despesas. Aqui você vê de onde veio o dinheiro, em que foi gasto, quais órgãos gastaram, quais empresas receberam e o que fica para a próxima gestão.</p>
    <p class="muted small">Dados oficiais coletados em ${esc(g.meta.atualizado)}. <a href="#/fontes">Como ler os números</a>.</p></div></section>
  <section class="wrap block"><h2>O resumo do ano</h2>${anosChips(A)}<div class="tiles" id="tiles"></div>
    <div class="card"><h3>A cada R$ 100 pagos, para onde foram?</h3><p class="muted">Cada faixa é uma área de governo (função). Passe o mouse ou toque para ver o valor.</p><div id="cem"></div></div>
    <div class="card"><h3>Quanto entra e quanto sai, mês a mês</h3><div id="mes"></div></div></section>
  <section class="wrap block"><h2>Ano a ano</h2><p class="muted">Receita arrecadada e despesa paga em cada ano, em valores da época (sem correção pela inflação).</p>
    <div class="card">${gcols(A.map(YL), [A.map(y => g.recTot[y][3]), A.map(y => g.exec[y][4])], ["Receita realizada", "Despesa paga no ano"], { colors: ["var(--s3)", "var(--s2)"] })}</div>
    <div class="card" id="anos-tab"></div>${nota26f()}</section>
  <section class="wrap block"><h2>Calendário de pagamentos do Estado</h2><p class="muted">Quanto o Estado pagou em cada mês, de janeiro de 2019 até ${DC}, todos os Poderes e órgãos.</p><div class="card">${calendario(g.cal)}</div></section>
  <section class="wrap block"><h2>Explore</h2><div class="cards-links">
    <a href="#/orgaos"><b>Órgãos</b><span>${N(ORGAOS.length)} secretarias, fundos e órgãos, com credores, contratos e DEA de cada um.</span></a>
    <a href="#/fornecedores"><b>Empresas</b><span>Quanto cada empresa recebeu, de quais órgãos e por quais contratos.</span></a>
    <a href="#/ranking"><b>Ranking</b><span>Empresas que mais receberam e as que mais têm a receber.</span></a>
    <a href="#/contratos"><b>Contratos</b><span>Todos os contratos e aditivos registrados, com valor, pago e vencimento.</span></a>
    <a href="#/transicao"><b>Transição</b><span>Contas a pagar, DEA, reconhecimento de dívida, dívida pública e contratos que passam de 2026.</span></a>
    <a href="#/leis"><b>Leis</b><span>${N(g.leis.n)} leis sancionadas, com autoria e texto integral.</span></a>
    <a href="#/municipios"><b>Municípios</b><span>Quanto o Estado repassou a cada um dos 62 municípios.</span></a></div></section>`;
  const tiles = y => {
    const e = g.exec[y], r = g.recTot[y], l = g.lrf[y] || {};
    $("#tiles").innerHTML = [
      ["in", "Arrecadou (receita realizada)", R(r[3]), `prevista: ${R(r[0])}`],
      ["out", "Pagou", R(e[4]), `${PC(e[4], r[3])} do que arrecadou`],
      ["", "Entregue e ainda não pago", R(e[3] - e[4]), "serviço entregue que ficou para pagar"],
      ["", "Dívida consolidada", R(l.dc), l.dclp != null ? `dívida líquida: ${nf2.format(l.dclp)}% da RCL (${esc(l.per)})` : "–"],
    ].map(t => `<div class="tile ${t[0]}"><p class="k">${t[1]}${+y === PARCIAL ? " · 2026*" : " · " + y}</p><p class="v long">${t[2]}</p><p class="d">${t[3]}</p></div>`).join("");
    $("#cem").innerHTML = stack100(g.funcao[y].map(r => [r[0].replace(/^\d+\s*-\s*/, ""), r[5]]).filter(r => r[1] > 0).sort((a, b) => b[1] - a[1]));
    const ult = +y === PARCIAL ? g.mes[y].findLastIndex(v => v > 0) + 1 : 12;
    $("#mes").innerHTML = linhas([g.mrec[y].slice(0, ult), g.mes[y].slice(0, ult)], ["Receita realizada", "Despesa paga"], MESES.slice(0, ult), { colors: ["var(--s3)", "var(--s2)"] });
  };
  bindChips(APP, y => { ANO = y; tiles(y); }); tiles(ANO);
  tabela($("#anos-tab"), A.map(y => [YL(y), ...g.exec[y], g.recTot[y][3]]), [
    { t: "Ano", k: 0 }, cR("Receita realizada", 7), cR("Orçamento autorizado", 2), cR("Reservado (empenho)", 3), cR("Entregue (liquidado)", 4), cR("Pago do ano", 5), cR("Pago de anos anteriores", 6),
  ], { busca: false, nome: "ano_a_ano" });
}

async function pGastos() {
  const g = await base();
  APP.innerHTML = head("Em que o Estado gasta", "A despesa paga por área de governo, tipo de gasto, programa e fonte do dinheiro.") +
    `<section class="wrap block">${anosChips(g.anos)}
    <div class="card"><h3>Por área de governo (função)</h3><div id="g-fun"></div></div>
    <div class="split"><div class="card"><h3>Por tipo de gasto (grupo)</h3><div id="g-gru"></div></div><div class="card"><h3>Por forma de aplicação (modalidade)</h3><div id="g-mod"></div></div></div>
    <div class="card"><h3>Por elemento de despesa</h3><p class="muted small">O elemento diz o que foi comprado ou pago: salários, serviços de terceiros, obras, material etc.</p><div id="g-ele"></div></div>
    <div class="card"><h3>Por programa de governo</h3><div id="g-pro"></div></div>
    <div class="card"><h3>Por fonte de recurso</h3><p class="muted small">De onde saiu o dinheiro: impostos do próprio Estado, transferências federais, operações de crédito etc.</p><div id="g-fon"></div></div>
    <div class="card"><h3>Por subfunção</h3><div id="g-sub"></div></div>${nota26f()}</section>`;
  const cols7 = nome => [{ t: nome, k: 0 }, cR("Orçamento inicial", 1), cR("Orçamento autorizado", 2), cR("Reservado (empenho)", 3), cR("Entregue (liquidado)", 4), cR("Pago", 5), cR("Pago de anos anteriores", 6)];
  const draw = y => {
    const lim = r => r.filter(x => x[5] > 0).sort((a, b) => b[5] - a[5]);
    $("#g-fun").innerHTML = hbars(lim(g.funcao[y]).map(r => [r[0].replace(/^\d+\s*-\s*/, ""), r[5]]));
    $("#g-gru").innerHTML = hbars(lim(g.grupo[y]).map(r => [r[0].replace(/^\d+\s*-\s*/, ""), r[5]]), { color: "var(--s2)" });
    $("#g-mod").innerHTML = hbars(lim(g.modalidade[y]).slice(0, 10).map(r => [r[0].replace(/^\d+\s*-\s*/, ""), r[5]]), { color: "var(--s7)" });
    for (const [id, k, nome] of [["#g-ele", "elemento", "Elemento"], ["#g-pro", "programa", "Programa"], ["#g-fon", "fonte", "Fonte de recurso"], ["#g-sub", "subfuncao", "Subfunção"]])
      tabela($(id), g[k][y], cols7(nome), { ordem: [5, -1], pag: 25, nome: `${k}_${y}`, total: [null, sumF(1), sumF(2), sumF(3), sumF(4), sumF(5), sumF(6)] });
  };
  bindChips(APP, y => { ANO = y; draw(y); }); draw(ANO);
}

async function pReceitas() {
  const g = await base();
  APP.innerHTML = head("De onde vem o dinheiro", "A receita do Estado por origem: impostos, transferências da União, contribuições, operações de crédito.") +
    `<section class="wrap block">${anosChips(g.anos)}<div class="card"><h3>Receita realizada por origem</h3><div id="r-bar"></div></div><div class="card" id="r-tab"></div>
    <p class="note">Receita realizada = arrecadação bruta menos deduções (como a parte do ICMS e do IPVA que vai para os municípios e a parcela do Fundeb). Os repasses aos municípios aparecem na página <a href="#/municipios">Municípios</a>.</p>${nota26f()}</section>`;
  const draw = y => {
    const rows = g.rec[y].filter(r => r[4] > 0).sort((a, b) => b[4] - a[4]);
    $("#r-bar").innerHTML = hbars(rows.map(r => [r[0].replace(/^\d+\s*-\s*/, ""), r[4]]), { color: "var(--s3)" });
    tabela($("#r-tab"), g.rec[y], [{ t: "Origem", k: 0 }, cR("Prevista", 1), cR("Arrecadação bruta", 2), cR("Deduções", 3), cR("Realizada", 4)],
      { busca: false, ordem: [4, -1], nome: `receitas_${y}`, total: [null, sumF(1), sumF(2), sumF(3), sumF(4)] });
  };
  bindChips(APP, y => { ANO = y; draw(y); }); draw(ANO);
}

async function pPoderes() {
  const g = await base(); const A = g.anos;
  APP.innerHTML = head("Poderes e órgãos autônomos", "O orçamento é um só, mas cada Poder e cada órgão autônomo executa a sua parte.") +
    `<section class="wrap block"><p class="note">Os Poderes são três: Executivo, Legislativo (Assembleia) e Judiciário. Tribunal de Contas, Ministério Público e Defensoria Pública são <b>órgãos autônomos</b>, não Poderes. O portal da SEFAZ agrupa o TCE no Legislativo e a Defensoria no Executivo; aqui eles aparecem separados.</p>
    <div class="cards-links">${Object.entries(PODER_INFO).map(([k, v]) => `<a href="#/poder/${k}"><b>${esc(v.t)}</b><span>${esc(v.s)}</span></a>`).join("")}<a href="#/orgaos"><b>Poder Executivo</b><span>Governo, secretarias, fundações, fundos e hospitais: lista de órgãos</span></a></div>
    <div class="card"><h3>Despesa paga por Poder e órgão autônomo, ano a ano</h3><div id="p-chart"></div></div>
    <div class="card"><h3>Sem o Executivo, para comparar os demais</h3><div id="p-chart2"></div></div>
    ${anosChips(A)}<div class="card" id="p-tab"></div>${nota26f()}</section>`;
  const cor = ["var(--s1)", "var(--s2)", "var(--s3)", "var(--s4)", "var(--s5)", "var(--s7)"];
  $("#p-chart").innerHTML = gcols(A.map(YL), PODERES.map(p => A.map(y => g.poder[y][p][3])), PODERES, { colors: cor });
  $("#p-chart2").innerHTML = gcols(A.map(YL), PODERES.slice(1).map(p => A.map(y => g.poder[y][p][3])), PODERES.slice(1), { colors: cor.slice(1) });
  const draw = y => tabela($("#p-tab"), PODERES.map(p => [p, ...g.poder[y][p]]), [{ t: "Poder / órgão autônomo", k: 0, f: v => pbadge(v) }, cR("Orçamento autorizado", 1), cR("Reservado (empenho)", 2), cR("Entregue (liquidado)", 3), cR("Pago do ano", 4),
    cR("Entregue e não pago", r => r[3] - r[4]), cR("Pago de anos anteriores", 5)], { busca: false, nome: `poderes_${y}`, total: [null, sumF(1), sumF(2), sumF(3), sumF(4), sumF(r => r[3] - r[4]), sumF(5)] });
  bindChips(APP, y => { ANO = y; draw(y); }); draw(ANO);
}

async function pOrgaos() {
  const g = await base();
  APP.innerHTML = head("Órgãos", `${N(ORGAOS.length)} unidades gestoras: secretarias, fundações, fundos, hospitais, Assembleia, Tribunais, Ministério Público e Defensoria. Clique em um órgão para ver tudo sobre ele.`) +
    `<section class="wrap block"><p class="note">A maior linha do Executivo, <a href="#/orgao/014103">SEFAZ-EG (Encargos Gerais do Estado)</a>, não é gasto da Secretaria da Fazenda: é por onde o Estado paga repasses aos municípios, dívida, precatórios e PASEP. Abra a página para ver a divisão.</p>${anosChips(g.anos)}<div id="o-tab"></div>${nota26f()}</section>`;
  let pod = "", T;
  const linhas = y => ORGAOS.filter(o => o[4][y] && (!pod || o[3] === pod)).map(o => [o[0], o[1], o[2], o[3], ...o[4][y], o[5], o[6], o[8]]);
  const draw = y => {
    T = tabela($("#o-tab"), linhas(y), [
      { t: "Órgão", k: r => r[1] + " " + r[2], f: (v, r) => `<a href="#/orgao/${r[0]}"><b>${esc(r[1])}</b></a><br><span class="small muted">${esc(r[2])}</span>`, w: "wrap" },
      { t: "Poder", k: 3, f: v => pbadge(v) },
      cR("Orçamento autorizado", 4), cR("Reservado (empenho)", 5), cR("Entregue (liquidado)", 6), cR("Pago", 7), cR("Entregue e não pago", r => r[6] - r[7]),
      { t: "Contratos (2019–2026)", k: 9, r: 1, f: v => N(v) }, cR("Contas antigas pagas – DEA (2019–2026)", 11),
    ], { ordem: [5, -1], nome: `orgaos_${y}`, total: [null, null, sumF(4), sumF(5), sumF(6), sumF(7), sumF(r => r[6] - r[7]), null, sumF(11)],
      filtros: `<label>Poder <select id="f-pod"><option value="">Todos</option>${PODERES.map(p => `<option${p === pod ? " selected" : ""}>${p}</option>`).join("")}</select></label>` });
    $("#f-pod").onchange = e => { pod = e.target.value; T.set(linhas(ANO)); };
  };
  bindChips(APP, y => { ANO = y; draw(y); }); draw(ANO);
}

/* ---------- execução por ação (SEFAZ-Encargos Gerais e demais Poderes) ---------- */
// linha de ação: [código, ação, dotação inicial, autorizado, empenhado, liquidado, pago, pago de anos anteriores]
const EG = "014103";
// grupos dos Encargos Gerais pelo código da ação do orçamento (Transparência Fiscal)
const GRUPO_EG = c => ({ "0013": 0, "0014": 0, "0015": 0, "0016": 0, "0017": 0, "0004": 1, "0005": 1, "0002": 2, "0011": 3, "2518": 4, "2520": 4, "0012": 5 })[c] ?? 6;
const GRUPOS_EG = ["Repasse obrigatório aos municípios (ICMS, IPVA, IPI, royalties, CIDE)", "Dívida pública: juros e amortização", "Sentenças judiciais e precatórios",
  "PASEP (contribuição federal sobre a receita)", "Fundo de Parcerias Público-Privadas", "Devolução de tributos e cauções", "Outros encargos"];
const NOTA_EG = `<div class="note"><b>Encargos Gerais não é o gasto da Secretaria da Fazenda com ela mesma.</b> É a conta por onde o Estado paga obrigações de todo o governo:
  a parte do ICMS e do IPVA que a Constituição manda entregar aos municípios, a dívida pública, os precatórios, o PASEP e o fundo de PPP.
  O custeio da própria secretaria (pessoal, sistemas, prédios) está em <a href="#/orgao/014101">SEFAZ (014101)</a>; o fundo de modernização, em <a href="#/orgao/014701">SEFAZ-FUNDO (014701)</a>.</div>`;
function blocoAcoes(host, acoes, nome, { comUG = false, eg = false } = {}) {
  const ys = Object.keys(acoes).map(Number).sort(); if (!ys.length) { host.innerHTML = ""; return; }
  const y = ys.includes(ANO) ? ANO : ys[ys.length - 1];
  host.innerHTML = `<h3>Em que o dinheiro foi usado (por ação do orçamento)</h3><p class="muted">Cada linha é uma ação do orçamento. Fonte: Transparência Fiscal (SEFAZ-AM). A soma das ações é igual ao total do órgão no ano.</p>
    ${anosChips(ys, null, y)}${eg ? `<div id="ac-g"></div>` : ""}<div id="ac-t"></div>`;
  const draw = y => {
    const rows = acoes[y] || [];
    if (eg) { const g = GRUPOS_EG.map(n => [n, 0]); rows.forEach(r => g[GRUPO_EG(r[0])][1] += r[6]);
      $("#ac-g", host).innerHTML = `<h3>A cada R$ 100 pagos pelos Encargos Gerais em ${YL(y)}, para onde foram</h3><p class="muted">Total pago no ano: <b>${R(rows.reduce((a, r) => a + r[6], 0))}</b>.</p>${stack100(g.filter(x => x[1] > 0).sort((a, b) => b[1] - a[1]))}`; }
    const cols = [...(comUG ? [{ t: "Órgão", k: r => (ORGMAP[r[8]] || {}).sigla || r[8], f: (v, r) => `<a href="#/orgao/${r[8]}">${esc(v)}</a>` }] : []),
      { t: "Ação", k: 1, f: (v, r) => `${esc(v)} <span class="muted small">(${esc(r[0])})</span>`, w: "wrap" },
      ...(eg ? [{ t: "Grupo", k: r => GRUPOS_EG[GRUPO_EG(r[0])], w: "wrap" }] : []),
      cR("Orçamento autorizado", 3), cR("Reservado (empenho)", 4), cR("Entregue (liquidado)", 5), cR("Pago do ano", 6), cR("Pago de anos anteriores", 7)];
    const n = cols.length;
    tabela($("#ac-t", host), rows, cols, { busca: rows.length > 15, ordem: [n - 2, -1], nome: `${nome}_acoes_${y}`, total: cols.map((c, i) => i >= n - 5 ? sumF(c.k) : null) });
  };
  bindChips(host, y => { ANO = y; draw(y); }); draw(y);
}

// Poderes e órgãos autônomos fora do Executivo: uma página para cada
const DUODECIMO = `Tem orçamento próprio, aprovado na lei do orçamento do Estado. Quem arrecada é o Executivo, que repassa a parte de cada um em parcelas mensais (duodécimo, art. 168 da Constituição Federal).`;
const PODER_INFO = {
  legislativo: { p: "Legislativo", t: "Poder Legislativo", s: "Assembleia Legislativa do Estado do Amazonas (ALEAM)",
    d: `<p>A Assembleia Legislativa faz as leis estaduais, vota o orçamento do Estado e fiscaliza o Executivo. Na fiscalização das contas, é auxiliada pelo Tribunal de Contas, que é um órgão autônomo e tem página própria.</p><p>${DUODECIMO}</p>` },
  judiciario: { p: "Judiciário", t: "Poder Judiciário", s: "Tribunal de Justiça do Estado do Amazonas (TJAM)",
    d: `<p>O Tribunal de Justiça julga as causas da Justiça estadual em todo o Amazonas. Tem autonomia administrativa e financeira (art. 99 da Constituição Federal). O FUNJEAM é o Fundo de Modernização e Reaparelhamento do Poder Judiciário.</p><p>${DUODECIMO}</p>
      <p>Os <b>precatórios</b> (dívidas do Estado reconhecidas pela Justiça) não estão aqui: são pagos pelos <a href="#/orgao/014103">Encargos Gerais da SEFAZ</a>, ação "Cumprimento de Sentenças Judiciais".</p>` },
  "tribunal-de-contas": { p: "Tribunal de Contas", t: "Tribunal de Contas do Estado", s: "Órgão autônomo de controle externo, não é um Poder",
    d: `<p>O TCE-AM julga as contas de quem administra dinheiro público do Estado e dos municípios do Amazonas e dá parecer sobre as contas do governador, que depois são julgadas pela Assembleia (arts. 71 e 75 da Constituição Federal). O FAECE é o Fundo de Apoio ao Exercício do Controle Externo.</p><p>${DUODECIMO}</p>` },
  "ministerio-publico": { p: "Ministério Público", t: "Ministério Público do Estado", s: "Órgão autônomo, não é um Poder; dirigido pela Procuradoria-Geral de Justiça",
    d: `<p>O Ministério Público defende a ordem jurídica, o regime democrático e os interesses sociais (art. 127 da Constituição Federal). É quem acusa nos processos criminais e propõe ações civis públicas. O FAMP é o fundo de apoio do Ministério Público; o PROVITA é o programa de proteção a vítimas e testemunhas ameaçadas.</p><p>${DUODECIMO}</p>` },
  defensoria: { p: "Defensoria Pública", t: "Defensoria Pública do Estado", s: "Órgão autônomo, não é um Poder",
    d: `<p>A Defensoria Pública dá orientação jurídica e defesa gratuitas a quem não pode pagar advogado (art. 134 da Constituição Federal).</p><p>${DUODECIMO}</p>` },
};
const PODER_SLUG = Object.fromEntries(Object.entries(PODER_INFO).map(([k, v]) => [v.p, k]));

async function pPoder(slug) {
  const g = await base(); const info = PODER_INFO[slug]; if (!info) { location.hash = "#/poderes"; return; }
  const ugs = ORGAOS.filter(o => o[3] === info.p);
  const [C, ...OS] = await Promise.all([get("contratos.json"), ...ugs.map(o => get(`orgao/${o[0]}.json`))]);
  const A = g.anos, soma = (y, i) => ugs.reduce((a, o) => a + ((o[4][y] || [])[i] || 0), 0);   // orgaos.json, por ano: [autorizado, empenhado, liquidado, pago, pago de anos anteriores]
  const set = new Set(ugs.map(o => o[0])), ct = C.filter(c => set.has(c[1])), orig = ct.filter(c => !c[4]);
  const acoes = {}; OS.forEach(o => Object.entries(o.acoes || {}).forEach(([y, rows]) => (acoes[y] ||= []).push(...rows.map(r => [...r, o.ug]))));
  APP.innerHTML = head(`${esc(info.t)} ${pbadge(info.p)}`, esc(info.s), `<a href="#/poderes">Poderes</a> › ${esc(info.t)}`) + `<section class="wrap block">
    <div class="card">${info.d}<p class="muted small">Unidades orçamentárias: ${ugs.map(o => `<a href="#/orgao/${o[0]}">${esc(o[1])}</a> (${esc(o[2])})`).join(" · ")}.</p></div>
    <div id="pd-res">${anosChips(A)}<div class="tiles" id="pd-tiles"></div></div>
    <div class="card"><h3>Ano a ano</h3>${gcols(A.map(YL), [A.map(y => soma(y, 0)), A.map(y => soma(y, 2)), A.map(y => soma(y, 3))], ["Orçamento autorizado", "Entregue (liquidado)", "Pago"], { colors: ["var(--axis)", "var(--s1)", "var(--s3)"] })}<div id="pd-anos"></div></div>
    <div class="card" id="pd-ac"></div>
    <div class="card"><h3>Contratos (2019–2026)</h3><p class="muted">${N(orig.length)} contratos originais e ${N(ct.length - orig.length)} aditivos, registrados no TCE-AM (e-Contas). Valor dos originais: <b>${R(orig.reduce((a, c) => a + c[7], 0))}</b>. Valor contratado não é dívida nem valor pago. O quanto foi pago em cada contrato: não localizado na fonte consultada (o TCE-AM não liga pagamento a contrato).</p><div id="pd-ct"></div></div>
    ${nota26f()}</section>`;
  const tiles = y => { const tot = PODERES.reduce((a, p) => a + ((g.poder[y] || {})[p] || [])[3] || 0, 0);
    $("#pd-tiles").innerHTML = [["Orçamento autorizado", R(soma(y, 0))], ["Entregue (liquidado)", R(soma(y, 2))], ["Pago do ano", R(soma(y, 3))],
      ["Fatia do total pago pelo Estado", tot ? PC(g.poder[y][info.p][3], tot) : "–"]].map(([t, v]) => `<div class="tile"><p class="k">${t} · ${YL(y)}</p><p class="v long">${v}</p></div>`).join(""); };
  bindChips($("#pd-res"), y => { ANO = y; tiles(y); }); tiles(A.includes(ANO) ? ANO : A[A.length - 1]);
  tabela($("#pd-anos"), A.map(y => [YL(y), soma(y, 0), soma(y, 1), soma(y, 2), soma(y, 3), soma(y, 4)]), [{ t: "Ano", k: 0 }, cR("Orçamento autorizado", 1), cR("Reservado (empenho)", 2), cR("Entregue (liquidado)", 3), cR("Pago do ano", 4), cR("Entregue e não pago", r => r[3] - r[4]), cR("Pago de anos anteriores", 5)],
    { busca: false, nome: `${slug}_execucao` });
  blocoAcoes($("#pd-ac"), acoes, slug, { comUG: ugs.length > 1 });
  tabela($("#pd-ct"), ct, [{ t: "Órgão", k: r => (ORGMAP[r[1]] || {}).sigla || r[1], f: (v, r) => `<a href="#/orgao/${r[1]}">${esc(v)}</a>` }, { t: "Nº", k: 3, f: (v, r) => (r[4] ? "› " : "") + esc(v) }, { t: "Ano", k: 2 },
    { t: "Contratado", k: 6, f: (v, r) => r[5] ? `<a href="#/fornecedor/${dig(r[5])}">${esc(v)}</a><br><span class="small muted">${esc(r[5])}</span>` : esc(v), w: "wrap" },
    cR("Valor", 7), { t: "Vencimento", k: r => dataISO(r[9]), f: (v, r) => DBR(r[9]) + (dataISO(r[9]) > HOJE ? ' <span class="badge p2">vigente</span>' : "") }],
    { ordem: [4, -1], pag: 25, nome: `${slug}_contratos`, rowClass: r => r[4] ? "adit" : "" });
}

async function pOrgao(ug) {
  await base();
  const o = await get(`orgao/${ug}.json`);
  const anos = Object.keys(o.exec).map(Number).sort();
  const ctB = o.contratos.filter(c => !c[4]), ctA = o.contratos.filter(c => c[4]);
  const hoje = HOJE;
  APP.innerHTML = head(`${esc(o.sigla)} ${pbadge(o.poder)}`, esc(o.nome), `<a href="#/orgaos">Órgãos</a> › ${esc(o.sigla)}`) +
    `<section class="wrap block">
    <div class="card"><h3>Execução ano a ano</h3>${gcols(anos.map(YL), [anos.map(y => o.exec[y][1]), anos.map(y => o.exec[y][3]), anos.map(y => o.exec[y][4])], ["Orçamento autorizado", "Entregue (liquidado)", "Pago"], { colors: ["var(--axis)", "var(--s1)", "var(--s3)"] })}
    <div id="ex-tab"></div></div>
    ${ug === EG ? NOTA_EG : ""}${PODER_SLUG[o.poder] ? `<p class="note">Este órgão faz parte de: <a href="#/poder/${PODER_SLUG[o.poder]}">${esc(PODER_INFO[PODER_SLUG[o.poder]].t)}</a> (o que é, todas as unidades e os contratos).</p>` : ""}
    ${o.acoes && Object.keys(o.acoes).length ? `<div class="card" id="ac-bloco"></div>` : ""}
    <details class="card"><summary><b>Calendário de pagamentos</b> <span class="muted small">(mês a mês, 2019–2026; clique para abrir)</span></summary>${calendario(o.mes)}</details>
    <div class="tabs" role="tablist">
      <button role="tab" data-t="cred" aria-selected="true">Quem recebeu <span class="cnt">(${N(Object.values(o.credores).reduce((a, v) => a + v.length, 0))})</span></button>
      <button role="tab" data-t="ct" aria-selected="false">Contratos <span class="cnt">(${N(ctB.length)} + ${N(ctA.length)} aditivos)</span></button>
      <button role="tab" data-t="dea" aria-selected="false">DEA <span class="cnt">(${N(o.dea.length)})</span></button>
      <button role="tab" data-t="doe" aria-selected="false">Diário Oficial <span class="cnt">(${N(o.doeDivida.length + o.doeAditivos.length)})</span></button>
      ${o.pncp.length ? `<button role="tab" data-t="pncp" aria-selected="false">PNCP <span class="cnt">(${N(o.pncp.length)})</span></button>` : ""}
    </div><div id="tab-body"></div></section>`;
  tabela($("#ex-tab"), anos.map(y => [YL(y), ...o.exec[y]]), [{ t: "Ano", k: 0 }, cR("Orçamento inicial", 1), cR("Orçamento autorizado", 2), cR("Reservado (empenho)", 3), cR("Entregue (liquidado)", 4), cR("Pago", 5),
    cR("Entregue e não pago", r => r[4] - r[5]), cR("Pago de anos anteriores", 6)], { busca: false, nome: `${o.sigla}_execucao` });
  if ($("#ac-bloco")) blocoAcoes($("#ac-bloco"), o.acoes, o.sigla, { eg: ug === EG });
  const body = $("#tab-body");
  const T = {
    cred() {
      const ys = Object.keys(o.credores).map(Number).sort(); let y = ys.includes(ANO) ? ANO : ys[ys.length - 1];
      body.innerHTML = `<p class="muted">Quanto cada credor teve empenhado, liquidado e pago por este órgão no ano. Empresas com nome e CNPJ; pessoas físicas só no total.</p>${anosChips(ys, null, y)}<div id="cr-t"></div>`;
      const draw = y => tabela($("#cr-t"), o.credores[y] || [], [
        { t: "Credor", k: 1, f: (v, r) => r[0] && r[0] !== "PF" ? `<a href="#/fornecedor/${dig(r[0])}">${esc(v)}</a>` : esc(v), w: "wrap" },
        { t: "CNPJ", k: 0, f: v => v === "PF" ? "" : esc(v) }, cR("Reservado (empenho)", 2), cR("Entregue (liquidado)", 3), cR("Pago do ano", 4), cR("Entregue e não pago", r => r[3] - r[4]), cR("Pago de anos anteriores", 5),
      ], { ordem: [4, -1], nome: `${o.sigla}_credores_${y}`, total: [null, null, sumF(2), sumF(3), sumF(4), sumF(r => r[3] - r[4]), sumF(5)] });
      bindChips(body, draw); draw(y);
    },
    ct() {
      const byOrig = {}; ctA.forEach(a => (byOrig[a[3]] ||= []).push(a));
      body.innerHTML = `<p class="muted">Contratos originais e seus aditivos (› logo abaixo do original). <b>Valor</b> é o valor contratado registrado; <b>pago</b> vem das notas de empenho ligadas ao contrato. "Falta pagar" não é dívida: só mostra quanto do valor contratado ainda não saiu do caixa.</p><div id="ct-t"></div>`;
      const rows = [];
      ctB.forEach(c => { rows.push(c); (byOrig[c[2]] || []).sort((a, b) => dataISO(a[8]).localeCompare(dataISO(b[8]))).forEach(a => rows.push(a)); });
      ctA.filter(a => !ctB.some(c => c[2] === a[3])).forEach(a => rows.push(a));
      const vig = r => dataISO(r[10]) > hoje;
      const T = tabela($("#ct-t"), rows, [
        { t: "Nº", k: 2, f: (v, r) => (r[4] ? "› " : "<b>") + esc(v) + (r[4] ? "" : "</b>") },
        { t: "Ano", k: 1 }, { t: "Assinatura", k: r => dataISO(r[8]), f: (v, r) => DBR(r[8]) },
        { t: "Vencimento", k: r => dataISO(r[10]), f: (v, r) => DBR(r[10]) + (vig(r) ? ' <span class="badge p2">vigente</span>' : "") },
        { t: "Contratado", k: 7, f: (v, r) => r[6] ? `<a href="#/fornecedor/${dig(r[6])}">${esc(v)}</a><br><span class="small muted">${esc(r[6])}</span>` : esc(v), w: "wrap" },
        { t: "Objeto", k: 5, w: "obj wrap" }, cR("Valor", 11), cR("Reservado (empenho)", 12), cR("Pago", 13), cR("Falta pagar", 14), { t: "Fonte", k: 16 },
      ], { pag: 50, nome: `${o.sigla}_contratos`, rowClass: r => r[4] ? "adit" : "",
        total: [null, null, null, null, null, null, d => R(d.filter(r => !r[4]).reduce((a, r) => a + r[11], 0)) + " (originais)", sumF(12), sumF(13), null, null],
        filtros: `<label><input type="checkbox" id="so-vig"> só vigentes depois de ${DC}</label>` });
      $("#so-vig").onchange = e => T.set(e.target.checked ? rows.filter(r => vig(r) || (!r[4] && (byOrig[r[2]] || []).some(vig))) : rows);
    },
    dea() {
      body.innerHTML = `<p class="muted">DEA (despesas de exercícios anteriores) é conta de um ano passado que não foi empenhada na época e só foi reconhecida e paga depois (Lei 4.320/1964, art. 37). Lista do TCE-AM, empenho por empenho.</p><div id="dea-t"></div>`;
      tabela($("#dea-t"), o.dea, [{ t: "Ano", k: 0 }, { t: "Data", k: r => dataISO(r[1]), f: (v, r) => DBR(r[1]) }, { t: "Nota", k: 2 },
        { t: "Credor", k: 3, f: (v, r) => r[4] ? `<a href="#/fornecedor/${dig(r[4])}">${esc(v)}</a><br><span class="small muted">${esc(r[4])}</span>` : esc(v), w: "wrap" },
        { t: "Subelemento", k: 5, w: "wrap" }, { t: "Processo", k: 7 }, { t: "Objeto", k: 8, w: "obj wrap" }, cR("Reservado (empenho)", 9), cR("Pago", 10)],
        { pag: 50, nome: `${o.sigla}_dea`, total: [null, null, null, null, null, null, null, sumF(9), sumF(10)] });
    },
    doe() {
      body.innerHTML = `<h3>Reconhecimento de dívida no Diário Oficial</h3><p class="muted">Atos publicados com "reconhecer a dívida" (2019–2026). O valor e o credor foram lidos do texto do ato (em 2019 e 2020, edições só em PDF, do trecho devolvido pela busca); confira no link.</p><div id="doe-d"></div>${o.poder !== "Executivo" ? `<p class="note">Este órgão publica seus atos no diário próprio: reconhecimentos de dívida e termos aditivos não localizados na fonte consultada (Diário Oficial do Executivo).</p>` : ""}
        ${o.doeAditivos.length ? `<h3 style="margin-top:28px">Termos aditivos publicados no Diário Oficial</h3><p class="muted">Termos aditivos publicados pelo órgão no Diário Oficial do Executivo.</p><div id="doe-a"></div>` : ""}`;
      tabela($("#doe-d"), o.doeDivida, [{ t: "Data", k: 0, f: v => DBR(v) }, { t: "Edição", k: 1 }, { t: "Ato", k: 3, w: "wrap", f: (v, r) => esc(v) + (r[8] ? ' <span class="badge">repetido</span>' : "") }, { t: "Credor (lido do texto)", k: 5, w: "wrap", f: (v, r) => esc(v) + (r[9] ? `<br><span class="small muted">${esc(r[9])}</span>` : "") },
        cR("Valor (lido do texto)", 4), { t: "Link", k: 6, f: v => `<a href="${esc(v)}" target="_blank" rel="noopener">abrir</a>` }], { pag: 50, nome: `${o.sigla}_reconhecimento_divida`, total: [null, null, null, null, d => R(d.filter(r => !r[8]).reduce((a, r) => a + (r[4] || 0), 0)) + " (sem repetidos)", null] });
      if (o.doeAditivos.length) tabela($("#doe-a"), o.doeAditivos, [{ t: "Data", k: 0, f: v => DBR(v) }, { t: "Edição", k: 1 }, { t: "Título", k: 3, w: "wrap" },
        { t: "Texto", k: 4, f: v => `<details class="more"><summary>ver texto</summary><div class="txt-doe">${esc(v)}</div></details>`, w: "obj" }, { t: "Link", k: 5, f: v => `<a href="${esc(v)}" target="_blank" rel="noopener">abrir</a>` }], { pag: 50, nome: `${o.sigla}_aditivos_doe` });
    },
    pncp() {
      body.innerHTML = `<p class="muted">Contratos publicados pelo órgão no Portal Nacional de Contratações Públicas (PNCP), 2023–2026.</p><div id="pn-t"></div>`;
      tabela($("#pn-t"), o.pncp, [{ t: "Assinatura", k: 0, f: v => DBR(v) }, { t: "Nº", k: 1 }, { t: "Fornecedor", k: 5, f: (v, r) => r[4] ? `<a href="#/fornecedor/${dig(r[4])}">${esc(v)}</a><br><span class="small muted">${esc(r[4])}</span>` : esc(v), w: "wrap" },
        { t: "Objeto", k: 3, w: "obj wrap" }, cR("Valor global", 6), { t: "Fim da vigência", k: 7, f: v => DBR(v) },
        { t: "Também no SGC/TCE", k: 10, f: v => v ? "sim" : "não" }, { t: "PNCP", k: 8, f: v => `<a href="${esc(v)}" target="_blank" rel="noopener">abrir</a>` }],
        { pag: 50, nome: `${o.sigla}_pncp`, total: [null, null, null, null, sumF(6), null, null, null] });
    },
  };
  const tabs = APP.querySelectorAll(".tabs [role=tab]");
  tabs.forEach(b => b.onclick = () => { tabs.forEach(x => x.setAttribute("aria-selected", x === b)); T[b.dataset.t](); });
  T.cred();
}

let FIDX;
async function pFornecedores() {
  await base(); FIDX = FIDX || await get("fornecedores.json");
  APP.innerHTML = head("Empresas que receberam do Estado", `${N(FIDX.length)} empresas (CNPJ) com empenho, liquidação, pagamento, contrato ou DEA de 2019 a 2026. Busque pelo nome ou pelo CNPJ.`) +
    `<section class="wrap block"><div id="f-tab"></div><p class="note">Total pago = pago do ano mais o pago de anos anteriores, somado de 2019 a 2026 (2026 até ${DC}). Pessoas físicas não aparecem aqui. Órgãos públicos com CNPJ (Amazonprev, INSS, bancos, prefeituras) aparecem porque recebem repasses e retenções.</p></section>`;
  tabela($("#f-tab"), FIDX, [
    { t: "Empresa", k: 1, f: (v, r) => `<a href="#/fornecedor/${dig(r[0])}"><b>${esc(v)}</b></a>`, w: "wrap" }, { t: "CNPJ", k: 0 },
    cR("Total pago 2019–2026", 2), cR("Entregue 2019–2026", 3), { t: "Órgãos", k: 4, r: 1, f: v => N(v) }, cR("Valor de contratos originais", 5, { f: (v, r) => r[6] ? esc(R(v)) : "–" }), { t: "Contratos", k: 6, r: 1, f: v => v ? N(v) : "nenhum no SGC/TCE" },
    { t: "Anos com pagamento", k: r => r[7].join(", ") },
  ], { ordem: [2, -1], nome: "empresas" });
}

async function pFornecedor(cn) {
  await base(); const d = await get(`fornecedor/${cn.slice(0, 2)}.json`);
  const doc = `${cn.slice(0, 2)}.${cn.slice(2, 5)}.${cn.slice(5, 8)}/${cn.slice(8, 12)}-${cn.slice(12)}`; const f = d[doc];
  if (!f) { APP.innerHTML = head("Empresa não encontrada", esc(doc), `<a href="#/fornecedores">Empresas</a>`); return; }
  const anos = Object.keys(f.anos).sort(); const rows = []; anos.forEach(y => f.anos[y].forEach(r => rows.push([+y, ...r])));
  const tot = i => rows.reduce((a, r) => a + r[i], 0);
  const vct = f.contratos.filter(c => !c[3]).reduce((a, c) => a + c[5], 0);
  APP.innerHTML = head(esc(f.nome || doc), `CNPJ ${esc(doc)}`, `<a href="#/fornecedores">Empresas</a> › ${esc(doc)}`) + `<section class="wrap block">
    <div class="kv"><div class="kv-deve"><span class="k">Quanto o governo deve (2026)</span><span class="v">${R((f.deve || []).reduce((a, r) => a + r[3], 0))}</span></div><div><span class="k">Total pago (2019–2026)</span><span class="v">${R(tot(4) + tot(5))}</span></div><div><span class="k">Pago do ano (soma 2019–2026)</span><span class="v">${R(tot(4))}</span></div><div><span class="k">Pago de anos anteriores (soma 2019–2026)</span><span class="v">${R(tot(5))}</span></div>
    <div><span class="k">Entregue (soma 2019–2026)</span><span class="v">${R(tot(3))}</span></div><div><span class="k">Órgãos</span><span class="v">${N(new Set(rows.map(r => r[1])).size)}</span></div>
    <div><span class="k">Contratos registrados (SGC/TCE)</span><span class="v">${f.contratos.some(c => !c[3]) ? `${N(f.contratos.filter(c => !c[3]).length)} · ${R(vct)}` : "nenhum contrato registrado no SGC/TCE"}</span></div><div><span class="k">Contas antigas pagas – DEA (2019–2026)</span><span class="v">${R(f.dea.reduce((a, x) => a + x[3], 0))}</span></div></div>
    <div class="card deve" id="fo-deve"></div>
    <div class="card"><h3>Calendário de pagamentos</h3><p class="muted">Em que mês e ano a empresa recebeu, somando todos os órgãos.</p>${calendario(f.mes)}</div>
    ${anos.length ? `<div class="card"><h3>Pago por ano</h3>${cols(anos.map(y => [YL(y), f.anos[y].reduce((a, r) => a + r[3] + r[4], 0)]), { color: "var(--s3)" })}</div>` : ""}
    <h3>Por órgão e ano</h3><div id="fo-t"></div><h3 style="margin-top:28px">Contratos</h3><div id="fo-c"></div>
    ${f.dea.length ? `<h3 style="margin-top:28px">Contas antigas pagas (DEA)</h3><div id="fo-d"></div>` : ""}${nota26f()}</section>`;
  // ---- quanto o governo deve
  const deve = f.deve || [], doe = f.doe || [];
  const totDeve = deve.reduce((a, r) => a + r[3], 0);
  const virada = anos.filter(y => +y < PARCIAL).map(y => {
    const v = f.anos[y], liq = v.reduce((a, r) => a + r[2], 0), pg = v.reduce((a, r) => a + r[3], 0);
    const prox = f.anos[+y + 1] ? f.anos[+y + 1].reduce((a, r) => a + r[4], 0) : 0;
    return [+y, liq, pg, liq - pg, prox];
  });
  const doeSoma = doe.filter(r => !r[5]).reduce((a, r) => a + (r[4] || 0), 0);
  $("#fo-deve").innerHTML = `<h3>Quanto o governo deve</h3>
    <p class="deve-v">${R(totDeve)}</p>
    <p class="muted">Serviço, obra ou produto que o órgão <b>já conferiu como entregue em 2026 e ainda não pagou</b> (até ${DC}).
      Pode ser pago até 31/12/2026; o que sobrar passa para 2027 e, quando pago, aparece como "pago de anos anteriores".</p>
    ${deve.length ? `<div id="dv-org"></div>` : `<p><b>Nada entregue e não pago em 2026</b> para esta empresa até ${DC}.</p>`}
    <details style="margin-top:14px"><summary><b>O que ficou para pagar na virada de cada ano</b> <span class="muted small">(clique para abrir)</span></summary>
      <p class="muted small">Entregue no ano e não pago até 31/12. Esse valor costuma ser pago no ano seguinte, como "pago de anos anteriores" (última coluna, para comparar).
      A fonte não informa quanto disso ainda está em aberto hoje.</p><div id="dv-ano"></div></details>
    ${doe.length ? `<details style="margin-top:10px"><summary><b>Dívidas reconhecidas no Diário Oficial com este CNPJ</b>: ${N(doe.length)} atos, ${R(doeSoma)} sem repetidos</summary>
      <p class="muted small">Ato em que o órgão admite que deve por serviço prestado sem contrato válido ou fora do prazo. Valor lido do texto do ato por regra automática: confira no link.
      Pode já ter sido pago depois.</p><div id="dv-doe"></div></details>` : ""}`;
  if (deve.length) tabela($("#dv-org"), deve, [{ t: "Órgão", k: r => (ORGMAP[r[0]] || {}).sigla || r[0], f: (v, r) => orgLink(r[0]), w: "wrap" },
    cR("Entregue em 2026", 1), cR("Pago em 2026", 2), cR("Falta pagar", 3)], { busca: false, ordem: [3, -1], nome: `empresa_${cn}_deve`, total: [null, sumF(1), sumF(2), sumF(3)] });
  tabela($("#dv-ano"), virada, [{ t: "Ano", k: 0 }, cR("Entregue no ano", 1), cR("Pago do ano", 2), cR("Ficou para o ano seguinte", 3), cR("Pago de anos anteriores no ano seguinte", 4)],
    { busca: false, ordem: [0, 1], nome: `empresa_${cn}_virada` });
  if (doe.length) tabela($("#dv-doe"), doe, [{ t: "Data", k: 0, f: v => DBR(v) }, { t: "Órgão", k: r => (ORGMAP[r[1]] || {}).sigla || r[2], f: (v, r) => r[1] ? orgLink(r[1]) : esc(r[2]), w: "wrap" },
    { t: "Ato", k: 3, w: "wrap", f: (v, r) => esc(v) + (r[5] ? ' <span class="badge">repetido</span>' : "") }, cR("Valor (lido do texto)", 4),
    { t: "Link", k: 6, f: v => `<a href="${esc(v)}" target="_blank" rel="noopener">abrir</a>` }], { busca: false, pag: 20, nome: `empresa_${cn}_diario_oficial` });

  tabela($("#fo-t"), rows, [{ t: "Ano", k: 0, f: v => YL(v) }, { t: "Órgão", k: r => (ORGMAP[r[1]] || {}).sigla || r[1], f: (v, r) => orgLink(r[1]), w: "wrap" }, cR("Reservado (empenho)", 2), cR("Entregue (liquidado)", 3), cR("Pago do ano", 4), cR("Pago de anos anteriores", 5)],
    { ordem: [0, -1], nome: `empresa_${cn}_orgaos`, total: [null, null, sumF(2), sumF(3), sumF(4), sumF(5)] });
  tabela($("#fo-c"), f.contratos, [{ t: "Órgão", k: r => (ORGMAP[r[0]] || {}).sigla || r[0], f: (v, r) => `<a href="#/orgao/${r[0]}">${esc(v)}</a>` }, { t: "Nº", k: 1, f: (v, r) => (r[3] ? "› " : "") + esc(v) }, { t: "Ano", k: 2 },
    { t: "Objeto", k: 4, w: "obj wrap" }, cR("Valor", 5), cR("Pago", 6), { t: "Vencimento", k: r => dataISO(r[7]), f: (v, r) => DBR(r[7]) }], { pag: 50, nome: `empresa_${cn}_contratos`, rowClass: r => r[3] ? "adit" : "" });
  if (f.dea.length) tabela($("#fo-d"), f.dea, [{ t: "Órgão", k: r => (ORGMAP[r[0]] || {}).sigla || r[0], f: (v, r) => `<a href="#/orgao/${r[0]}">${esc(v)}</a>` }, { t: "Ano", k: 1 }, cR("Reservado (empenho)", 2), cR("Pago", 3)],
    { busca: false, nome: `empresa_${cn}_dea`, total: [null, null, sumF(2), sumF(3)] });
}

// órgãos públicos, fundos, bancos de folha e concessionárias ficam fora do ranking de empresas por padrão (filtro aproximado pelo nome)
const PUBLICO = /AMAZONPREV|\bFUNDO\b|^BANCO |CAIXA ECONOMICA|SEGURIDADE SOCIAL|\bINSS\b|MINISTERIO|TRIBUNAL|SECRETARIA|PREFEITURA|MUNICIPIO|\bMUNICIPAL\b|AGENCIA AMAZONENSE|PRODAM|ESTADO DO AMAZONAS|RECEITA FEDERAL|UNIVERSIDADE|ASSEMBLEIA|DEFENSORIA|PROCURADORIA|CAMARA MUNICIPAL|CONSELHO ESCOLAR|ASSOC DE PAIS|APMC|\bVARA\b|JUIZO|COMARCA|POLICIA|BOMBEIROS|DETRAN|MANAUS ENERGIA|AMAZONAS ENERGIA|AMAZONAS DISTRIBUIDORA DE ENERGIA|COSAMA|SUFRAMA/;
async function pRanking() {
  await base(); FIDX = FIDX || await get("fornecedores.json");
  const A = ["todos", 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026];
  let per = "todos", priv = true;
  APP.innerHTML = head("Ranking de empresas", "Quem mais recebeu do Estado e quem mais tem a receber.") + `<section class="wrap block">
    <label class="chk"><input type="checkbox" id="rk-priv" checked> Só empresas e entidades privadas (esconde órgãos públicos, fundos, bancos de folha e concessionárias; filtro aproximado pelo nome)</label>
    <h2>Quem mais recebeu</h2><div class="chips" role="group" aria-label="Período" id="rk-anos">${A.map(y => `<button type="button" class="chip" aria-pressed="${y === per}" data-y="${y}">${y === "todos" ? "2019–2026" : YL(y)}</button>`).join("")}</div>
    <div class="card"><div id="rk-bar"></div></div><div id="rk-tab"></div>
    <h2 style="margin-top:36px">Quem mais tem a receber</h2><p class="muted">Serviço, obra ou produto já entregue e conferido pelo órgão (liquidado) em 2026 e ainda não pago até ${DC}. Pode ser pago até 31/12; o que sobrar passa para 2027 como "pago de anos anteriores".</p>
    <div class="card"><div id="pd-bar"></div></div><div id="pd-tab"></div>${nota26f()}</section>`;
  const draw = () => {
    const lista = FIDX.filter(r => !priv || !PUBLICO.test(norm(r[1]).toUpperCase()));
    const val = r => per === "todos" ? r[2] : ((r[8] || {})[per] || 0);
    const rk = lista.filter(r => val(r) > 0).sort((a, b) => val(b) - val(a)).map((r, i) => [i + 1, r[1] || r[0], r[0], val(r), r[4], r[5]]);
    $("#rk-bar").innerHTML = hbars(rk.slice(0, 15).map(r => [`${r[0]}º ${r[1]}`, r[3]]), { color: "var(--s3)" });
    tabela($("#rk-tab"), rk, [{ t: "Posição", k: 0, r: 1, f: v => v + "º" }, { t: "Empresa", k: 1, w: "wrap", f: (v, r) => `<a href="#/fornecedor/${dig(r[2])}"><b>${esc(v)}</b></a>` }, { t: "CNPJ", k: 2 },
      cR(per === "todos" ? "Total pago 2019–2026" : `Total pago em ${YL(per)}`, 3), { t: "Órgãos que pagaram (2019–2026)", k: 4, r: 1, f: v => N(v) }, cR("Valor de contratos originais", 5)],
      { ordem: [0, 1], pag: 100, nome: `ranking_pago_${per}`, total: [null, null, null, sumF(3), null, null] });
    const pd = lista.filter(r => r[9] > 0.005).sort((a, b) => b[9] - a[9]).map((r, i) => [i + 1, r[1] || r[0], r[0], r[9], (r[8] || {})[2026] || 0]);
    $("#pd-bar").innerHTML = hbars(pd.slice(0, 15).map(r => [`${r[0]}º ${r[1]}`, r[3]]), { color: "var(--s2)" });
    tabela($("#pd-tab"), pd, [{ t: "Posição", k: 0, r: 1, f: v => v + "º" }, { t: "Empresa", k: 1, w: "wrap", f: (v, r) => `<a href="#/fornecedor/${dig(r[2])}"><b>${esc(v)}</b></a>` }, { t: "CNPJ", k: 2 },
      cR("Entregue e não pago (2026)", 3), cR("Total pago em 2026", 4)], { ordem: [0, 1], pag: 100, nome: "ranking_a_receber_2026", total: [null, null, null, sumF(3), sumF(4)] });
  };
  $("#rk-anos").addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; per = b.dataset.y === "todos" ? "todos" : +b.dataset.y;
    $("#rk-anos").querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", String(x === b))); draw(); });
  $("#rk-priv").addEventListener("change", e => { priv = e.target.checked; draw(); });
  draw();
}

async function pContratos() {
  await base(); const C = await get("contratos.json"); const hoje = HOJE;
  const orig = C.filter(c => !c[4]);
  const anos = [...new Set(orig.map(c => c[2]))].sort();
  APP.innerHTML = head("Contratos", `${N(orig.length)} contratos originais e ${N(C.length - orig.length)} aditivos registrados de 2019 a 2026 em todos os Poderes.`) + `<section class="wrap block">
    <div class="card"><h3>Valor dos contratos originais por ano de assinatura</h3>${cols(anos.map(y => [YL(y), orig.filter(c => c[2] === y).reduce((a, c) => a + c[7], 0), N(orig.filter(c => c[2] === y).length) + " contratos"]))}</div>
    <div class="card"><h3>De quem são os contratos</h3><p class="muted">O Executivo (secretarias, fundações, fundos, hospitais) é o principal contratante. Os demais Poderes e os órgãos autônomos têm contratos próprios; clique no nome para abrir a página de cada um.</p><div id="c-pod"></div></div>
    <div id="c-tab"></div><p class="note">Executivo: Sistema de Gestão de Contratos (SGC) da SEFAZ, com aditivos ligados ao contrato original. Demais Poderes e órgãos autônomos: TCE-AM e-Contas, que não informa o valor pago por contrato (aparece "–"). Valores acima de R$ 3 bilhões num único registro podem ser erro de digitação na fonte. Clique no órgão para ver o objeto completo de cada contrato.</p></section>`;
  const podDe = c => (ORGMAP[c[1]] || {}).poder || "não identificado";
  const vOrig = orig.reduce((a, c) => a + c[7], 0);
  tabela($("#c-pod"), [...PODERES, "não identificado"].map(p => { const cs = C.filter(c => podDe(c) === p), os = cs.filter(c => !c[4]);
    return [p, os.length, cs.length - os.length, os.reduce((a, c) => a + c[7], 0), cs.reduce((a, c) => a + (c[8] || 0), 0)]; }).filter(r => r[1] + r[2]),
    [{ t: "Poder / órgão autônomo", k: 0, f: v => PODER_SLUG[v] ? `<a href="#/poder/${PODER_SLUG[v]}">${pbadge(v)}</a>` : v === "Executivo" ? `<a href="#/orgaos">${pbadge(v)}</a>` : esc(v) },
      { t: "Contratos originais", k: 1, r: 1, f: v => N(v) }, { t: "Aditivos", k: 2, r: 1, f: v => N(v) }, cR("Valor dos originais", 3), { t: "% do valor", k: 3, r: 1, f: v => PC(v, vOrig) }, cR("Pago (notas de empenho do contrato)", 4, { f: (v, r) => r[0] === "Executivo" ? esc(R(v)) : "não localizado na fonte consultada" }),
      { t: "Fonte", k: r => r[0] === "Executivo" ? "SGC (SEFAZ)" : "TCE-AM (e-Contas)" }],
    { busca: false, nome: "contratos_por_poder", total: [null, d => N(d.reduce((a, r) => a + r[1], 0)), d => N(d.reduce((a, r) => a + r[2], 0)), sumF(3), null, sumF(4), null] });
  let rows = C;
  const t = tabela($("#c-tab"), rows, [
    { t: "Órgão", k: r => (ORGMAP[r[1]] || {}).sigla || r[1], f: (v, r) => `<a href="#/orgao/${r[1]}">${esc(v)}</a>` }, { t: "Poder", k: r => podDe(r), f: v => pbadge(v) }, { t: "Nº", k: 3, f: (v, r) => (r[4] ? "› " : "") + esc(v) }, { t: "Ano", k: 2 },
    { t: "Contratado", k: 6, f: (v, r) => r[5] ? `<a href="#/fornecedor/${dig(r[5])}">${esc(v)}</a><br><span class="small muted">${esc(r[5])}</span>` : esc(v), w: "wrap" },
    cR("Valor", 7), cR("Pago", 8, { f: (v, r) => podDe(r) === "Executivo" ? esc(R(v)) : "–" }), { t: "Vencimento", k: r => dataISO(r[9]), f: (v, r) => DBR(r[9]) + (dataISO(r[9]) > hoje ? ' <span class="badge p2">vigente</span>' : "") },
  ], { ordem: [5, -1], nome: "contratos", rowClass: r => r[4] ? "adit" : "",
    filtros: `<label>Poder <select id="c-pd"><option value="">Todos</option>${PODERES.map(p => `<option>${p}</option>`).join("")}</select></label>
      <label>Ano <select id="c-ano"><option value="">Todos</option>${anos.map(y => `<option>${y}</option>`).join("")}</select></label>
      <label>Tipo <select id="c-tipo"><option value="">Originais e aditivos</option><option value="o">Só originais</option><option value="a">Só aditivos</option></select></label>
      <label><input type="checkbox" id="c-vig"> só vigentes depois de ${DC}</label>` });
  const ap = () => { const a = $("#c-ano").value, tp = $("#c-tipo").value, v = $("#c-vig").checked, pd = $("#c-pd").value;
    t.set(C.filter(c => (!pd || podDe(c) === pd) && (!a || c[2] === +a) && (!tp || (tp === "o" ? !c[4] : c[4])) && (!v || dataISO(c[9]) > hoje))); };
  ["#c-pd", "#c-ano", "#c-tipo", "#c-vig"].forEach(s => $(s).onchange = ap);
}

async function pTransicao() {
  const g = await base(); const A = g.anos; const D = await get("doe_divida.json");
  const e = g.exec, l = g.lrf;
  APP.innerHTML = head("O que fica para a próxima gestão", "Contas a pagar, despesas de anos anteriores, dívidas reconhecidas, dívida pública e contratos que continuam depois de 2026.") + `<section class="wrap block">
  <h2>Liquidado e ainda não pago</h2><p>A despesa tem três etapas: <b>empenho</b> (o Estado reserva o dinheiro), <b>liquidação</b> (o órgão confirma que recebeu o bem ou serviço) e <b>pagamento</b>. O que foi liquidado e não pago até 31/12 vira <b>restos a pagar processados</b>: conta certa que passa para o ano seguinte.</p>
  <div class="card">${gcols(A.map(YL), [A.map(y => e[y][3] - e[y][4]), A.map(y => e[y][2] - e[y][3])], ["Entregue e não pago", "Reservado e não entregue"], { colors: ["var(--s2)", "var(--s4)"] })}</div><div id="t-liq"></div>
  <h2 style="margin-top:36px">2026 por Poder (até ${DC})</h2><div id="t-pod"></div>
  <h2 style="margin-top:36px">Despesas de exercícios anteriores (DEA)</h2><p>DEA é conta de um ano anterior que não foi empenhada na época (Lei 4.320/1964, art. 37). Crescimento da DEA indica despesa feita sem empenho ou sem orçamento no ano em que aconteceu.</p>
  <div class="card">${cols(A.filter(y => g.dea[y].dcaPago).map(y => [String(y), g.dea[y].dcaPago, "oficial (DCA/SICONFI)"]), { color: "var(--s8)" })}<p class="muted small">DEA paga por ano, valor oficial (SICONFI, DCA). 2026 ainda sem DCA publicada.</p></div><div id="t-dea"></div>
  <h2 style="margin-top:36px">Dívidas reconhecidas no Diário Oficial</h2><p>Atos com "reconhecer a dívida" publicados de 2019 a 2026: em geral, serviço prestado sem contrato ou fora do prazo, pago por indenização. Valor e credor foram lidos do texto de cada ato; confira no link.</p>
  <div class="card" id="t-doe-c"></div><div id="t-doe"></div>
  <h2 style="margin-top:36px">Dívida pública e pessoal (LRF)</h2><div id="t-lrf"></div>
  <h2 style="margin-top:36px">Contratos que continuam depois de 2026</h2>
  <div class="kv"><div><span class="k">Contratos do Executivo vigentes depois de 31/12/2026</span><span class="v">${N(g.prox.n)}</span></div><div><span class="k">Valor contratado</span><span class="v">${R(g.prox.vct)}</span></div><div><span class="k">Já pago</span><span class="v">${R(g.prox.vpag)}</span></div><div><span class="k">Saldo (valor − pago)</span><span class="v">${R(g.prox.vct - g.prox.vpag)}</span></div></div>
  <p><a href="#/contratos">Ver todos os contratos e filtrar os vigentes</a>.</p>${nota26f()}</section>`;
  tabela($("#t-liq"), A.map(y => [YL(y), ...e[y]]), [{ t: "Ano", k: 0 }, cR("Reservado (empenho)", 3), cR("Entregue (liquidado)", 4), cR("Pago do ano", 5), cR("Entregue e não pago", r => r[4] - r[5]), cR("Reservado e não entregue", r => r[3] - r[4]), cR("Pago de anos anteriores", 6)], { busca: false, nome: "liquidado_nao_pago" });
  tabela($("#t-pod"), PODERES.map(p => [p, ...g.poder[PARCIAL][p]]), [{ t: "Poder / órgão autônomo", k: 0, f: v => pbadge(v) }, cR("Reservado (empenho)", 2), cR("Entregue (liquidado)", 3), cR("Pago", 4), cR("Entregue e não pago", r => r[3] - r[4]), cR("Reservado e não entregue", r => r[2] - r[3])], { busca: false, nome: "2026_por_poder" });
  tabela($("#t-dea"), A.map(y => [YL(y), g.dea[y].dcaEmp, g.dea[y].dcaPago, g.dea[y].n, g.dea[y].emp, g.dea[y].pago, ...PODERES.map(p => g.dea[y].poder[p])]), [{ t: "Ano", k: 0 },
    cR("Reservado oficial (DCA)", 1, { f: v => v == null ? "não publicado" : esc(R(v)) }), cR("Pago oficial (DCA)", 2, { f: v => v == null ? "não publicado" : esc(R(v)) }), { t: "Empenhos (TCE)", k: 3, r: 1, f: v => N(v) }, cR("Reservado (lista TCE)", 4), cR("Pago (lista TCE)", 5),
    ...PODERES.map((p, i) => cR("Pago — " + p, 6 + i))], { busca: false, nome: "dea" });
  const dv = D.map(r => [r[0], ...r.slice(1)]);
  const byY = {}; dv.forEach(r => { const y = r[1].slice(0, 4); byY[y] ||= [0, 0]; byY[y][0]++; if (!r[9]) byY[y][1] += r[5] || 0; });
  $("#t-doe-c").innerHTML = cols(Object.keys(byY).sort().map(y => [YL(y), byY[y][1], N(byY[y][0]) + " atos"]), { color: "var(--s5)" }) + `<p class="muted small">Soma dos valores lidos nos atos, por ano de publicação. ${N(dv.filter(r => r[5] == null).length)} atos sem valor identificado no texto; ${N(dv.filter(r => r[9]).length)} atos que repetem uma dívida já publicada (extrato do termo de ajuste igual à portaria, ou portaria que retoma outra anterior com o mesmo valor) ficam fora da soma.</p>`;
  tabela($("#t-doe"), dv, [{ t: "Data", k: 1, f: v => DBR(v) }, { t: "Órgão", k: r => (ORGMAP[r[0]] || {}).sigla || r[8], f: (v, r) => r[0] ? orgLink(r[0]) : esc(r[8]), w: "wrap" },
    { t: "Ato", k: 4, w: "wrap", f: (v, r) => esc(v) + (r[9] ? ' <span class="badge">repetido</span>' : "") }, { t: "Credor (lido do texto)", k: 6, w: "wrap", f: (v, r) => esc(v) + (r[10] ? `<br><span class="small muted">${esc(r[10])}</span>` : "") }, cR("Valor (lido do texto)", 5), { t: "Link", k: 7, f: v => `<a href="${esc(v)}" target="_blank" rel="noopener">abrir</a>` }],
    { ordem: [0, -1], pag: 50, nome: "reconhecimento_divida_doe", total: [null, null, null, null, d => R(d.filter(r => !r[9]).reduce((a, r) => a + (r[5] || 0), 0)) + " (sem repetidos)", null] });
  tabela($("#t-lrf"), A.filter(y => l[y]).map(y => [YL(y) + (l[y].per !== "exercício" ? ` (${l[y].per})` : ""), l[y].rcl, l[y].dtp, l[y].dtpp, l[y].dc, l[y].dcl, l[y].dclp, l[y].prim]), [{ t: "Ano", k: 0 },
    cR("Receita corrente líquida", 1), cR("Despesa com pessoal", 2), { t: "Pessoal / RCL", k: 3, r: 1, f: v => v == null ? "–" : nf2.format(v) + "%" }, cR("Dívida consolidada", 4), cR("Dívida consolidada líquida", 5),
    { t: "DCL / RCL", k: 6, r: 1, f: v => v == null ? "–" : nf2.format(v) + "%" }, cR("Resultado primário", 7)], { busca: false, nome: "lrf" });
}

async function pLeis() {
  const g = await base(); const L = await get("leis.json");
  APP.innerHTML = head("Leis", `${N(g.leis.n)} leis estaduais sancionadas de 2019 a 2026, ${N(g.leis.exec)} de iniciativa do Poder Executivo.`) + `<section class="wrap block">
    <div class="card">${gcols(g.anos.map(YL), [g.anos.map(y => g.leis.ano[y][0]), g.anos.map(y => g.leis.ano[y][1])], ["Leis", "Do Executivo"], { fmt: N, colors: ["var(--s1)", "var(--s2)"] })}</div>
    <div id="l-tab"></div><p class="note">Fonte: ALEAM, SAPL (API pública), com autoria de cada projeto e o PDF do texto. Tema classificado automaticamente pela ementa.</p></section>`;
  tabela($("#l-tab"), L, [{ t: "Lei", k: 0, f: (v, r) => `${r[1] === 2 ? "LC" : "Lei"} nº ${esc(v)}` }, { t: "Data", k: 2, f: v => DBR(v) }, { t: "Ementa", k: 3, w: "obj wrap" }, { t: "Tema", k: 4 },
    { t: "Autoria", k: 5, w: "wrap" }, { t: "Texto", k: 6, f: v => v ? `<a href="${esc(v)}" target="_blank" rel="noopener">PDF</a>` : "–" }], { pag: 50, nome: "leis" });
}

async function pMunicipios() {
  const g = await base(); const m = g.mun; const A = m.anos.map(String);
  APP.innerHTML = head("Municípios", "Quanto o Estado repassou a cada um dos 62 municípios: cota-parte de ICMS, IPVA, IPI-Exportação e royalties.") +
    `<section class="wrap block"><div id="m-tab"></div><p class="note">Fonte: SEFAZ-AM, Sistema de Repartição de Tributos (SRT), por data de arrecadação. 2019 a 2021 não foram coletados por município. Mostra o que o Estado repassa, não o que cada município arrecada. * 2026 parcial.</p></section>`;
  const rows = m.nomes.map((n, i) => [n, ...A.map(y => m.v[y][i][m.v[y][i].length - 1])]);
  tabela($("#m-tab"), rows, [{ t: "Município", k: 0 }, ...A.map((y, j) => cR(YL(y), 1 + j)), cR("Total", r => A.reduce((a, _, j) => a + r[1 + j], 0))],
    { ordem: [A.length + 1, -1], pag: 100, nome: "municipios", total: [null, ...A.map((_, j) => sumF(1 + j)), sumF(r => A.reduce((a, _, j) => a + r[1 + j], 0))] });
}

async function pServidores() {
  const g = await base(); const S = g.servidores; const anos = ["2019", "2020", "2021", "2022", "2023", "2024", "2025", "2026"];
  const rows = Object.entries(S).map(([o, v]) => [o, ...anos.map(y => (v[y] || [])[0] ?? null), (v["2026"] || [])[1] ?? null,
    (v["2026"] || [])[2] ? Object.entries(v["2026"][2]).filter(([k]) => /COMISS/.test(k) && /S\/V|SEM V/.test(k)).reduce((a, [, n]) => a + n, 0) : null]);
  APP.innerHTML = head("Servidores", "Quantas pessoas estão na folha de cada órgão, ano a ano. Só totais: nomes não aparecem.") +
    `<section class="wrap block"><div id="s-tab"></div><p class="note">Fonte: Portal da Transparência do Governo do Amazonas, folhas mensais por órgão (último mês disponível de cada ano; 2026: ${esc((Object.values(S)[0]["2026"] || [])[3] || "set")}/2026). Inclui ativos, aposentados e pensionistas quando a folha do órgão os traz. Os órgãos aparecem com o nome usado na folha.</p></section>`;
  tabela($("#s-tab"), rows, [{ t: "Órgão (folha)", k: 0, w: "wrap" }, ...anos.map((y, j) => ({ t: YL(y), k: 1 + j, r: 1, f: v => v == null ? "–" : N(v) })),
    cR("Remuneração bruta do mês (2026)", 9), { t: "Comissionados sem vínculo (2026)", k: 10, r: 1, f: v => v == null ? "–" : N(v) }],
    { ordem: [8, -1], nome: "servidores", total: [null, ...anos.map((_, j) => d => N(d.reduce((a, r) => a + (r[1 + j] || 0), 0))), sumF(9), d => N(d.reduce((a, r) => a + (r[10] || 0), 0))] });
}

async function pFontes() {
  const g = await base();
  APP.innerHTML = head("Como ler os números", "O que significa cada termo e de onde vêm os dados.") + `<section class="wrap block">
  <div class="split"><div class="card"><h3>Termos</h3><ul class="plain">
    <li><b>Orçamento inicial</b> (dotação inicial): quanto a Lei Orçamentária (LOA) previu para o ano.</li>
    <li><b>Orçamento autorizado</b>: orçamento inicial mais os créditos aprovados durante o ano.</li>
    <li><b>Reservado (empenho)</b>: dinheiro separado para um gasto. Ainda não é pagamento.</li>
    <li><b>Entregue (liquidado)</b>: o órgão conferiu que recebeu o bem, o serviço ou a obra. A partir daqui é conta a pagar.</li>
    <li><b>Pago do ano</b>: dinheiro que saiu do caixa para pagar uma conta do próprio ano.</li>
    <li><b>Pago de anos anteriores</b> (restos a pagar): conta registrada num ano e paga no ano seguinte ou depois.</li>
    <li><b>Total pago</b>: pago do ano + pago de anos anteriores. É o que a empresa ou o órgão de fato recebeu ou gastou.</li>
    <li><b>Entregue e não pago</b>: conta já conferida que ainda não saiu do caixa. Vira "pago de anos anteriores" quando é paga no ano seguinte.</li>
    <li><b>Reservado e não entregue</b>: dinheiro separado para algo que ainda não foi entregue.</li>
    <li><b>Contas antigas pagas (DEA)</b>: despesa de exercícios anteriores. Conta de um ano passado que não foi registrada na época e só foi reconhecida e paga depois, com dinheiro do ano do pagamento (Lei 4.320/1964, art. 37). Já está dentro do "pago do ano" do ano em que foi paga; não somar de novo.</li>
    <li><b>Reconhecimento de dívida</b>: ato publicado no Diário Oficial em que o órgão admite que deve por um serviço prestado sem contrato ou fora do prazo.</li>
    <li><b>Valor do contrato</b>: valor assinado. Não é dívida e não é o valor pago.</li>
    <li><b>RCL</b>: receita corrente líquida, base dos limites da Lei de Responsabilidade Fiscal.</li></ul></div>
  <div class="card"><h3>Regras deste site</h3><ul class="plain">
    <li>Valores nominais, como publicados, sem correção pela inflação e sem auditoria.</li>
    <li>2026 é parcial (até ${DC}) e nunca é tratado como ano completo.</li>
    <li>Contratado, empenhado e pago são coisas diferentes e não são somados entre si.</li>
    <li>Tribunal de Contas, Ministério Público e Defensoria Pública são órgãos autônomos, não Poderes.</li>
    <li>Pessoas físicas não têm o nome exibido; o CPF já vem mascarado pela fonte.</li>
    <li>O que não foi encontrado nas fontes aparece como "–" ou "não publicado".</li>
    <li>O site não aponta irregularidades: mostra os dados para que cada pessoa possa conferir.</li></ul></div></div>
  <div class="card"><h3>Fontes</h3><ul class="plain">
    <li>SEFAZ-AM, Portal da Transparência Fiscal: receitas e despesas por órgão, função, programa, fonte e credor (empenhado, liquidado e pago). transparenciafiscal.am.gov.br</li>
    <li>SEFAZ-AM, Sistema de Gestão de Contratos (SGC): contratos e aditivos do Executivo e notas de empenho por contrato.</li>
    <li>TCE-AM, e-Contas (dados abertos): contratos dos demais Poderes, pagamentos por nota e empenhos de DEA (elemento 92).</li>
    <li>Tesouro Nacional, SICONFI: RGF, RREO e DCA (pessoal, dívida, resultado, DEA oficial).</li>
    <li>ALEAM, SAPL: leis, autoria e texto integral.</li>
    <li>Imprensa Oficial do Estado, Diário Oficial (busca pública): atos de reconhecimento de dívida e termos aditivos.</li>
    <li>PNCP, Portal Nacional de Contratações Públicas (API de consulta): contratos publicados pelos órgãos estaduais.</li>
    <li>SEFAZ-AM, SRT: repasses aos municípios. Portal da Transparência do Governo: folhas de pagamento (só totais).</li>
    <li>Receita Federal (via minhareceita.org): razão social completa quando o portal da SEFAZ corta o nome da empresa.</li></ul>
    <p class="muted small">Coleta em ${esc(g.meta.atualizado)}, por APIs públicas e leitura das páginas, sem login e sem CAPTCHA. Versão em PDF: “Balanço de Transição Governamental — Estado do Amazonas” (NEX).</p></div></section>`;
}

/* ---------- roteador ---------- */
const ROTAS = [[/^#\/?$/, pInicio], [/^#\/gastos$/, pGastos], [/^#\/receitas$/, pReceitas], [/^#\/poderes$/, pPoderes], [/^#\/poder\/([a-z-]+)$/, pPoder], [/^#\/orgaos$/, pOrgaos], [/^#\/orgao\/(\d+)$/, pOrgao],
  [/^#\/fornecedores$/, pFornecedores], [/^#\/fornecedor\/(\d{14})$/, pFornecedor], [/^#\/contratos$/, pContratos], [/^#\/transicao$/, pTransicao], [/^#\/leis$/, pLeis],
  [/^#\/municipios$/, pMunicipios], [/^#\/servidores$/, pServidores], [/^#\/fontes$/, pFontes], [/^#\/ranking$/, pRanking]];
async function rota() {
  const h = location.hash || "#/"; $("#nav").classList.remove("open"); $("#menu").setAttribute("aria-expanded", "false");
  document.querySelectorAll("#nav a").forEach(a => { const base = a.getAttribute("href"); const on = base === "#/" ? h === "#/" || h === "" : h.startsWith(base.replace(/s$/, "")); a.toggleAttribute("aria-current", on); if (on) a.setAttribute("aria-current", "page"); });
  for (const [re, fn] of ROTAS) {
    const m = h.match(re);
    if (m) {
      APP.innerHTML = `<p class="wrap loading">Carregando…</p>`;
      try { await fn(...m.slice(1)); } catch (e) { console.error(e); APP.innerHTML = `<div class="wrap block"><h2>Não foi possível carregar esta página</h2><p class="muted">${esc(e.message)}</p><p>Se você abriu o arquivo direto do computador, rode um servidor local (veja LEIAME.txt).</p></div>`; }
      scrollTo(0, 0); APP.focus({ preventScroll: true }); return;
    }
  }
  location.hash = "#/";
}
addEventListener("hashchange", rota);
$("#menu").onclick = () => { const o = $("#nav").classList.toggle("open"); $("#menu").setAttribute("aria-expanded", o); };
$("#imprimir").onclick = () => { $("#print-data").textContent = new Date().toLocaleDateString("pt-BR"); print(); };
$("#tema").onclick = () => { const r = document.documentElement; const dark = r.dataset.theme ? r.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches; r.dataset.theme = dark ? "light" : "dark"; localStorage.setItem("tema", r.dataset.theme); };
if (localStorage.getItem("tema")) document.documentElement.dataset.theme = localStorage.getItem("tema");
rota();
