(function () {
'use strict';
var D = window.DATA;
var $ = function (id) { return document.getElementById(id); };
var BRL = function (v, d) { return v.toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d }); };
function money(v) {
  var a = Math.abs(v);
  if (a >= 1e9) return 'R$ ' + BRL(v / 1e9, 2) + ' bi';
  if (a >= 1e6) return 'R$ ' + BRL(v / 1e6, a >= 1e8 ? 0 : 1) + ' mi';
  if (a >= 1e3) return 'R$ ' + BRL(v / 1e3, 0) + ' mil';
  return 'R$ ' + BRL(v, 0);
}
function full(v) { return 'R$ ' + BRL(v, 2); }
function pct(a, b, d) { return b ? BRL(a / b * 100, d == null ? 1 : d) + '%' : '0%'; }
function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
function norm(s) { return String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }
function col(i) { return 'var(--s' + ((i % 8) + 1) + ')'; }
var TOT = D.tot, REC = D.rec, M = D.meses;
var DAYS = 273;
var CMAP = null, redrawForn = null, printHooks = [];

/* ---------- tooltip ---------- */
var tip = $('tip');
function showTip(t, x, y) {
  tip.innerHTML = t; tip.hidden = false;
  var w = tip.offsetWidth, h = tip.offsetHeight;
  var nx = Math.min(x + 14, window.innerWidth - w - 8), ny = y + 16;
  if (ny + h > window.innerHeight - 8) ny = y - h - 12;
  tip.style.left = Math.max(8, nx) + 'px'; tip.style.top = Math.max(8, ny) + 'px';
}
document.addEventListener('pointermove', function (e) {
  var el = e.target.closest && e.target.closest('[data-tip]');
  if (el) showTip(el.getAttribute('data-tip'), e.clientX, e.clientY); else tip.hidden = true;
});
document.addEventListener('pointerleave', function () { tip.hidden = true; });
document.addEventListener('scroll', function () { tip.hidden = true; }, true);

/* ---------- componentes ---------- */
function hbar(el, items, o) {
  o = o || {};
  var mx = Math.max.apply(null, items.map(function (i) { return i.v; }).concat([1]));
  var total = o.total;
  el.className = 'hb';
  el.innerHTML = items.map(function (it, i) {
    var w = Math.max(it.v / mx * 100, 0.6);
    var share = total ? ' <span class="muted">(' + pct(it.v, total) + ')</span>' : '';
    var txt = (o.fmt || money)(it.v);
    var tt = esc(it.label) + ': ' + (o.full ? full(it.v) : txt) + (total ? ' · ' + pct(it.v, total) + ' do total' : '') + (it.tip ? '<br>' + esc(it.tip) : '');
    return '<div class="row' + (o.click ? ' click' : '') + '" data-i="' + i + '" data-tip="' + tt.replace(/"/g, '&quot;') + '"><div class="lb">' + esc(it.label) + (it.sub ? '<br><span class="muted small">' + esc(it.sub) + '</span>' : '') + '</div><div class="tr"><div class="bar" style="width:calc((100% - 140px) * ' + (w / 100).toFixed(3) + ');background:' + (it.color || o.color || 'var(--s1)') + '"></div><span class="val">' + txt + share + '</span></div></div>';
  }).join('');
}
function cols(el, vals, color, labels) {
  var mx = Math.max.apply(null, vals) || 1;
  el.innerHTML = '<div class="cols" role="img" aria-label="Gráfico de colunas por mês">' + vals.map(function (v, i) {
    return '<div class="col" data-tip="' + labels[i] + ': ' + full(v) + '"><span class="n">' + BRL(v / 1e9, 2) + '</span><div class="b" style="height:' + (v / mx * 100).toFixed(1) + '%;background:' + color + '"></div></div>';
  }).join('') + '</div><div class="cl">' + labels.map(function (l) { return '<span>' + l + '</span>'; }).join('') + '</div>';
}
function colsMoney(el, vals, color, labels) {
  var mx = Math.max.apply(null, vals) || 1;
  el.innerHTML = '<div class="cols" role="img" aria-label="Gasto por mês">' + vals.map(function (v, i) {
    return '<div class="col" data-tip="' + labels[i] + ': ' + full(v) + '"><span class="n">' + BRL(v / 1e6, 0) + '</span><div class="b" style="height:' + (v / mx * 100).toFixed(1) + '%;background:' + color + '"></div></div>';
  }).join('') + '</div><div class="cl">' + labels.map(function (l) { return '<span>' + l + '</span>'; }).join('') + '</div><p class="muted small">valores em R$ milhões</p>';
}

/* ---------- topo e resumo ---------- */
$('periodo').textContent = D.meta.periodo;
$('atualizado').textContent = D.meta.atualizado;
[].forEach.call(document.querySelectorAll('.at'), function (e) { e.textContent = D.meta.atualizado; });
$('lead').innerHTML = 'Entre janeiro e setembro de 2026, o Governo do Amazonas arrecadou <strong>' + money(REC.realizada) + '</strong> e gastou <strong>' + money(TOT.pago) + '</strong>. Isso dá, em média, <strong>' + money(TOT.pago / DAYS) + ' por dia</strong>. Veja de onde vem, para onde vai e quem recebe.';
$('tiles').innerHTML = [
  ['in', 'Arrecadou', money(REC.realizada), 'Receita realizada, já descontadas as deduções (' + money(-REC.deducoes) + ').'],
  ['out', 'Gastou (pago)', money(TOT.pago), pct(TOT.pago, TOT.aut) + ' do que podia gastar no ano (' + money(TOT.aut) + ').'],
  ['', 'Gasto por dia', money(TOT.pago / DAYS), 'Média de 1º de janeiro a 30 de setembro (273 dias).'],
  ['', 'Orçamento do ano', money(TOT.dot), 'Plano aprovado para 2026. Já foram pagos ' + pct(TOT.pago, TOT.dot, 0) + ' dele.']
].map(function (t) { return '<div class="tile ' + t[0] + '"><p class="k">' + t[1] + '</p><p class="v">' + t[2] + '</p><p class="d">' + t[3] + '</p></div>'; }).join('');

/* R$ 100 */
var FDESC = { 'Encargos Especiais': 'dívida e repasses obrigatórios aos municípios', 'Previdência Social': 'aposentadorias e pensões dos servidores', 'Legislativa': 'Assembleia Legislativa e órgãos ligados', 'Judiciária': 'Tribunal de Justiça', 'Essencial à Justiça': 'Ministério Público, Defensoria e Procuradoria', 'Direitos da Cidadania': 'assistência a direitos e segurança alimentar (ex.: sistema prisional e cidadania)' };
var topF = D.funcoes.slice(0, 7), restV = TOT.pago - topF.reduce(function (a, f) { return a + f[1]; }, 0);
var segs = topF.map(function (f, i) { return { n: f[0], v: f[1], c: col(i), i: i }; }).concat([{ n: 'Demais áreas', v: restV, c: 'var(--other)', i: 7 }]);
$('cem').innerHTML = '<div class="stack" role="img" aria-label="Divisão do gasto por área">' + segs.map(function (s) {
  var sh = s.v / TOT.pago * 100;
  return '<div class="seg' + (s.i === 3 ? ' dark' : '') + '" style="flex:' + sh.toFixed(2) + ';background:' + s.c + '" data-tip="' + esc(s.n) + ': ' + full(s.v) + ' (' + BRL(sh, 1) + ' de cada R$ 100)">' + (sh >= 6 ? BRL(sh, 0) : '') + '</div>';
}).join('') + '</div>';
$('cem-leg').innerHTML = segs.map(function (s) {
  return '<li><span class="sw" style="background:' + s.c + '"></span><span><b>R$ ' + BRL(s.v / TOT.pago * 100, 1) + '</b> · ' + esc(s.n) + '<br><span class="muted small">' + money(s.v) + (FDESC[s.n] ? ' — ' + FDESC[s.n] : '') + '</span></span></li>';
}).join('');

/* ---------- mês a mês ---------- */
var HI = window.HIST || null;
var MES12 = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
var YEARS = HI ? HI.anos.concat([2026]) : [2026], curYear = 2026;
function monthSeries(y) { return y === 2026 ? { rec: REC.mes, pago: D.pagoMes } : HI.mes[y]; }
function drawMonths(y) {
  var S = monthSeries(y), recM = S.rec, pagM = S.pago, M = MES12.slice(0, recM.length);
  var W = 800, H = 340, L = 60, R = 16, T = 18, B = 34;
  var mx = Math.max.apply(null, recM.concat(pagM)), top = Math.ceil(mx / 1e9) * 1e9;
  var xs = function (i) { return L + (W - L - R) * i / (M.length - 1); };
  var ys = function (v) { return T + (H - T - B) * (1 - v / top); };
  var g = '', steps = top / 1e9;
  for (var k = 0; k <= steps; k++) { var v = top / steps * k; g += '<line class="gl" x1="' + L + '" x2="' + (W - R) + '" y1="' + ys(v) + '" y2="' + ys(v) + '"/><text x="' + (L - 8) + '" y="' + (ys(v) + 4) + '" text-anchor="end">R$ ' + BRL(v / 1e9, 1) + ' bi</text>'; }
  var path = function (a) { return a.map(function (v, i) { return (i ? 'L' : 'M') + xs(i).toFixed(1) + ' ' + ys(v).toFixed(1); }).join(' '); };
  var pts = function (a, c, cls) { return a.map(function (v, i) { return '<circle class="pt ' + cls + '" data-i="' + i + '" cx="' + xs(i).toFixed(1) + '" cy="' + ys(v).toFixed(1) + '" r="4.5" fill="' + c + '"/>'; }).join(''); };
  var xl = M.map(function (m, i) { return '<text x="' + xs(i) + '" y="' + (H - 10) + '" text-anchor="middle">' + m + '</text>'; }).join('');
  $('linha').innerHTML = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Linhas de arrecadação e gasto por mês em ' + y + '">' + g + '<line class="ax" x1="' + L + '" x2="' + (W - R) + '" y1="' + ys(0) + '" y2="' + ys(0) + '"/>' + xl +
    '<line id="cross" x1="0" x2="0" y1="' + T + '" y2="' + ys(0) + '" stroke="var(--axis)" stroke-dasharray="4 3" visibility="hidden"/>' +
    '<path class="ln" d="' + path(recM) + '" stroke="var(--s3)"/><path class="ln" d="' + path(pagM) + '" stroke="var(--s2)"/>' + pts(recM, 'var(--s3)', 'r') + pts(pagM, 'var(--s2)', 'p') +
    '<rect id="hit" x="' + L + '" y="' + T + '" width="' + (W - L - R) + '" height="' + (H - T - B) + '" fill="transparent"/></svg>';
  var svg = $('linha').querySelector('svg'), hit = $('hit'), cross = $('cross');
  function at(e) {
    var r = svg.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * W;
    var i = Math.max(0, Math.min(M.length - 1, Math.round((x - L) / (W - L - R) * (M.length - 1))));
    cross.setAttribute('x1', xs(i)); cross.setAttribute('x2', xs(i)); cross.setAttribute('visibility', 'visible');
    showTip('<b>' + M[i] + '</b><br>Entrou: ' + full(recM[i]) + '<br>Saiu: ' + full(pagM[i]) + '<br>Diferença: ' + full(recM[i] - pagM[i]), e.clientX, e.clientY);
    e.stopPropagation();
  }
  hit.addEventListener('pointermove', at); hit.addEventListener('pointerdown', at);
  hit.addEventListener('pointerleave', function () { cross.setAttribute('visibility', 'hidden'); tip.hidden = true; });
  $('linha-leg').innerHTML = '<span><i class="sw" style="background:var(--s3)"></i>Entrou (receita realizada)</span><span><i class="sw" style="background:var(--s2)"></i>Saiu (despesa paga)</span>';
  var sr = recM.reduce(function (a, b) { return a + b; }, 0), sp = pagM.reduce(function (a, b) { return a + b; }, 0);
  var iR = recM.indexOf(Math.max.apply(null, recM)), iP = pagM.indexOf(Math.max.apply(null, pagM));
  $('mes-texto').innerHTML = (y === 2026 ? 'Em 2026 (janeiro a setembro): ' : 'Em ' + y + ': ') + 'em média, entraram <strong>' + money(sr / M.length) + ' por mês</strong> e saíram <strong>' + money(sp / M.length) + ' por mês</strong>. O mês de maior arrecadação foi <strong>' + M[iR] + '</strong> (' + money(recM[iR]) + ') e o de maior gasto foi <strong>' + M[iP] + '</strong> (' + money(pagM[iP]) + '). A diferença de ' + money(sr - sp) + ' entre o que entrou e o que saiu não é “lucro”: inclui contas já contratadas e ainda não pagas e dinheiro em caixa.';
  cols($('col-rec'), recM, 'var(--s3)', M); cols($('col-pago'), pagM, 'var(--s2)', M);
  ['col-rec', 'col-pago'].forEach(function (id) { $(id).insertAdjacentHTML('beforeend', '<p class="muted small">valores em R$ bilhões</p>'); });
  var acc = 0, rows = recM.map(function (r, i) { acc += r - pagM[i]; return '<tr><td>' + M[i] + '</td><td class="r">' + full(r) + '</td><td class="r">' + full(pagM[i]) + '</td><td class="r">' + full(r - pagM[i]) + '</td><td class="r">' + full(acc) + '</td></tr>'; }).join('');
  $('tab-mes').innerHTML = '<div class="tw"><table class="tab"><thead><tr><th>Mês</th><th class="r">Entrou</th><th class="r">Saiu</th><th class="r">Diferença</th><th class="r">Diferença acumulada</th></tr></thead><tbody>' + rows + '<tr><td><b>Total</b></td><td class="r"><b>' + full(sr) + '</b></td><td class="r"><b>' + full(sp) + '</b></td><td class="r"><b>' + full(sr - sp) + '</b></td><td></td></tr></tbody></table></div>';
}
function chips(el, items, cur, cb) {
  el.innerHTML = items.map(function (y) { return '<button type="button" class="chip" data-y="' + y + '" aria-pressed="' + (y === cur) + '">' + y + (y === 2026 ? ' (até set.)' : '') + '</button>'; }).join('');
  el.onclick = function (e) {
    var b = e.target.closest('.chip'); if (!b) return;
    var y = +b.getAttribute('data-y'); [].forEach.call(el.children, function (c) { c.setAttribute('aria-pressed', c === b); }); cb(y);
  };
}
if (HI) chips($('anos-chips'), YEARS, 2026, function (y) { curYear = y; drawMonths(y); }); else $('anos-chips').style.display = 'none';
drawMonths(2026);

/* ---------- de onde vem ---------- */
var NATM = [[/Circula..o de Mercadorias/i, 'ICMS — imposto sobre mercadorias e serviços'], [/Fundo de Participa..o dos Estados/i, 'FPE — repasse da União aos Estados'], [/Fundo de Manuten/i, 'Fundeb — repasses para a educação'],
  [/Propriedade de Ve.culos/i, 'IPVA — imposto sobre veículos'], [/Renda - Retido na Fonte - Trab/i, 'Imposto de Renda retido na fonte (servidores)'], [/Bloco de Manuten/i, 'SUS — repasses do Ministério da Saúde'], [/Sal.rio-Educa/i, 'Salário-educação'],
  [/Transmiss.o .Causa Mortis/i, 'ITCMD — herança e doações'], [/Contribui..o Patronal - Servidor Civil Ativo/i, 'Contribuição patronal (previdência dos servidores)'], [/Contribui..o do Servidor Civil Ativo/i, 'Contribuição dos servidores (previdência)']];
function natName(n) { for (var i = 0; i < NATM.length; i++) if (NATM[i][0].test(n)) return NATM[i][1]; return n.length > 90 ? n.slice(0, 88) + '…' : n; }
hbar($('origem'), REC.origem.map(function (o) { return { label: o[0].replace(/ - Receitas Intraorçamentárias/, ' (internas)'), v: o[1], color: 'var(--s3)' }; }), { total: REC.realizada });
var usedNat = {};
hbar($('natureza'), REC.natureza.map(function (o) {
  var n = natName(o[0]);
  if (usedNat[n]) n = o[0].length > 90 ? o[0].slice(0, 88) + '…' : o[0];
  usedNat[n] = 1;
  return { label: n, v: o[1], color: 'var(--s3)' };
}), { total: REC.realizada });
(function () {
  var imp = REC.origem.filter(function (o) { return /^Impostos/.test(o[0]); })[0], tr = REC.origem.filter(function (o) { return /^Transfer.ncias Correntes/.test(o[0]); })[0];
  $('entra-nota').innerHTML = 'De cada R$ 100 que entraram, <strong>R$ ' + BRL(imp[1] / REC.realizada * 100, 0) + '</strong> vieram de impostos e taxas e <strong>R$ ' + BRL(tr[1] / REC.realizada * 100, 0) + '</strong> de transferências (principalmente da União). Do total bruto de ' + money(REC.bruta) + ', foram deduzidos ' + money(-REC.deducoes) + ' (normalmente, a contribuição ao Fundeb), restando ' + money(REC.realizada) + '. Previsão inicial do ano: ' + money(REC.prevista) + '.';
})();

/* ---------- para onde vai ---------- */
hbar($('funcoes'), D.funcoes.slice(0, 18).map(function (f, i) { return { label: f[0], v: f[1], sub: FDESC[f[0]] || '', color: 'var(--s1)' }; }), { total: TOT.pago });
var CATN = ['Pessoal e encargos', 'Custeio', 'Investimentos', 'Dívida (juros e amortização)'];
var cm = {}; D.cats.forEach(function (c) { cm[c[0].split(' (')[0]] = c[1]; });
var catItems = D.cats.map(function (c) { return { label: c[0], v: c[1], color: /^Pessoal/.test(c[0]) ? 'var(--s1)' : /^Custeio/.test(c[0]) ? 'var(--s2)' : /^Investimentos/.test(c[0]) ? 'var(--s3)' : 'var(--s5)' }; });
hbar($('cats'), catItems, { total: TOT.pago });
$('cats-nota').innerHTML = 'Só <strong>' + pct(cm['Investimentos'], TOT.pago) + '</strong> do gasto foi para investimentos (obras e equipamentos). A maior fatia é custeio (' + pct(cm['Custeio'], TOT.pago) + '): manter serviços funcionando, contratos, remédios, merenda, combustível, aluguel.';
hbar($('elementos'), D.elementos.map(function (e) { return { label: e[0], v: e[1], color: 'var(--s1)' }; }), { total: TOT.pago });
hbar($('programas'), D.programas.map(function (e) { return { label: e[0], v: e[1], color: 'var(--s7)' }; }), { total: TOT.pago });

/* ---------- secretarias ---------- */
var orgs = D.orgaos, sel = 0;
function orgLabel(o) { return o.d ? o.d : o.n; }
function renderList() {
  var q = norm($('busca-org').value), html = '';
  orgs.forEach(function (o, i) {
    if (o.pago <= 0 && o.aut <= 0) return;
    if (q && norm(o.n + ' ' + o.d).indexOf(q) < 0) return;
    html += '<li><button type="button" data-i="' + i + '" aria-pressed="' + (i === sel) + '"><span class="n">' + esc(o.n) + '</span><span class="s">' + esc(o.d || '') + '</span><small>' + money(o.pago) + ' pagos</small></button></li>';
  });
  $('org-list').innerHTML = html || '<li class="muted small" style="padding:8px">Nenhum órgão encontrado.</li>';
}
function renderOrg() {
  var o = orgs[sel], c = o.cat || {};
  var out = o.dot ? '' : '';
  var tipoSpend = [
    { label: 'Pessoal e encargos', v: c.pessoal || 0, color: 'var(--s1)' },
    { label: 'Custeio (manutenção e serviços)', v: c.custeio || 0, color: 'var(--s2)' },
    { label: 'Investimentos (obras e equipamentos)', v: c.invest || 0, color: 'var(--s3)' },
    { label: 'Dívida e outras', v: (c.juros || 0) + (c.amort || 0) + (c.inversoes || 0), color: 'var(--s5)' }
  ].filter(function (x) { return x.v > 0; });
  var frase = '';
  if (o.pago > 0 && c.pessoal != null) frase = 'A cada <strong>R$ 100</strong> pagos por este órgão, <strong>R$ ' + BRL((c.pessoal || 0) / o.pago * 100, 0) + '</strong> foram para pessoal, <strong>R$ ' + BRL((c.custeio || 0) / o.pago * 100, 0) + '</strong> para custeio e <strong>R$ ' + BRL((c.invest || 0) / o.pago * 100, 0) + '</strong> para investimentos.';
  var box = $('org-detalhe');
  box.className = 'card det';
  box.innerHTML = '<h3>' + esc(o.n) + '</h3><p class="muted">' + esc(o.d || 'Órgão do Governo do Estado') + ' · código ' + o.c + '</p>' +
    '<div class="kv"><div><span class="k">Pago (jan–set)</span><span class="v">' + money(o.pago) + '</span></div><div><span class="k">Orçamento autorizado</span><span class="v">' + money(o.aut) + '</span></div><div><span class="k">Empenhado</span><span class="v">' + money(o.emp) + '</span></div><div><span class="k">Parte do gasto do Estado</span><span class="v">' + pct(o.pago, TOT.pago) + '</span></div></div>' +
    '<p class="small muted">Execução do orçamento autorizado: ' + pct(o.pago, o.aut, 0) + ' pago.</p><div class="prog" role="img" aria-label="' + pct(o.pago, o.aut, 0) + ' do autorizado foi pago"><i style="width:' + Math.min(100, o.aut ? o.pago / o.aut * 100 : 0).toFixed(1) + '%"></i></div>' +
    (frase ? '<p style="margin-top:12px">' + frase + '</p>' : '') +
    '<h4>Quanto gastou em cada mês</h4><div id="o-mes"></div>' +
    (HI && HI.orgaos[o.c] ? '<h4>Pago em cada ano</h4><div id="o-anos"></div>' : '') +
    (tipoSpend.length ? '<h4>Em que tipo de gasto</h4><div id="o-cat"></div>' : '') +
    (o.fun.length ? '<h4>Áreas de governo</h4><div id="o-fun"></div>' : '') +
    (o.pro.length ? '<h4>Programas</h4><div id="o-pro"></div>' : '') +
    (o.ele.length ? '<h4>Em que gastou (detalhe)</h4><div id="o-ele"></div>' : '') +
    (o.fon.length ? '<h4>De onde veio o dinheiro (fonte de recurso)</h4><div id="o-fon"></div>' : '') +
    (o.fav.length ? '<h4>Quem mais recebeu deste órgão (' + BRL(o.nfav, 0) + ' favorecidos no total)</h4><div class="tw"><table class="tab"><thead><tr><th>#</th><th>Favorecido</th><th>Tipo</th><th class="r">Recebeu</th><th class="r">% do órgão</th></tr></thead><tbody>' + o.fav.map(function (f, i) { return '<tr><td>' + (i + 1) + '</td><td>' + esc(f[0].replace(/^PF\d+ - /, '')) + '</td><td>' + esc(f[1]) + '</td><td class="r">' + full(f[2]) + '</td><td class="r">' + pct(f[2], o.pago) + '</td></tr>'; }).join('') + '</tbody></table></div>' : '');
  colsMoney($('o-mes'), o.mes, 'var(--s1)', M);
  if ($('o-anos')) colsMoney($('o-anos'), HI.orgaos[o.c].concat([o.pago]), 'var(--s7)', YEARS.slice(0, -1).concat(['2026*']).map(String));
  var oc = $('o-cat'); if (oc) hbar(oc, tipoSpend, { total: o.pago });
  [['o-fun', o.fun, 'var(--s1)'], ['o-pro', o.pro, 'var(--s7)'], ['o-ele', o.ele, 'var(--s2)'], ['o-fon', o.fon, 'var(--s3)']].forEach(function (a) {
    var el = $(a[0]); if (el) hbar(el, a[1].map(function (x) { return { label: x[0].replace(/^\d{10,} - /, ''), v: x[1], color: a[2] }; }), { total: o.pago });
  });
}
$('org-list').addEventListener('click', function (e) {
  var b = e.target.closest('button[data-i]'); if (!b) return;
  sel = +b.getAttribute('data-i'); renderList(); renderOrg();
  if (window.innerWidth < 900) $('org-detalhe').scrollIntoView({ behavior: 'smooth', block: 'start' });
});
$('busca-org').addEventListener('input', renderList);
renderList(); renderOrg();

/* ---------- servidores ---------- */
(function () {
  var p = cm['Pessoal e encargos'];
  $('pessoal-total').innerHTML = '<p style="font-size:2.4rem;font-weight:700;margin:0;letter-spacing:-.02em">' + money(p) + '</p><p>Isso é <strong>' + pct(p, TOT.pago) + '</strong> de tudo que o Estado pagou: salários, aposentadorias, pensões e encargos, como a contribuição do governo para a previdência.</p><div class="prog" role="img" aria-label="' + pct(p, TOT.pago) + ' do gasto é com pessoal"><i style="width:' + (p / TOT.pago * 100).toFixed(1) + '%;background:var(--s1)"></i></div><p class="muted small">Do gasto total, ' + pct(p, TOT.pago, 0) + ' vai para pessoal e encargos. A previdência (AmazonPrev) paga aposentados e pensionistas; os demais valores são servidores ativos.</p>';
  var byP = orgs.filter(function (o) { return o.cat && o.cat.pessoal > 0; }).sort(function (a, b) { return b.cat.pessoal - a.cat.pessoal; }).slice(0, 12);
  hbar($('pessoal-org'), byP.map(function (o) { return { label: o.n, sub: o.d, v: o.cat.pessoal, tip: pct(o.cat.pessoal, o.pago, 0) + ' do que o órgão pagou é pessoal', color: 'var(--s1)' }; }), { total: p });
  var C = D.com;
  $('com-texto').innerHTML = 'O Estado tinha <strong>' + BRL(C.n, 0) + '</strong> vínculos de cargos de confiança em setembro, ao custo de <strong>' + money(C.mensal) + ' por mês</strong> (cerca de ' + pct(C.mensal, TOT.pago / 9) + ' do gasto mensal médio). A metade deles foi admitida a partir de ' + new Date(C.mediana + 'T12:00:00').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }) + '. Servidores de carreira que ocupam cargo de confiança não entram nessa conta.';
  hbar($('com-org'), C.orgaos.slice(0, 12).map(function (o) { return { label: o[0], v: o[2], tip: BRL(o[1], 0) + ' cargos', color: 'var(--s5)' }; }));
  hbar($('com-cargos'), C.cargos.map(function (o) { return { label: o[0], v: o[1], color: 'var(--s5)' }; }), { fmt: function (v) { return BRL(v, 0) + ' pessoas'; } });
  hbar($('com-anos'), C.anos.slice(-8).map(function (o) { return { label: String(o[0]) + (o[0] === 2026 ? ' (até set.)' : ''), v: o[1], color: 'var(--s7)' }; }), { fmt: function (v) { return BRL(v, 0) + ' admissões'; } });
})();

/* ---------- fornecedores ---------- */
(function () {
  var T = D.tipos, nTot = 0; for (var k in T) nTot += T[k][0];
  var tn = { 'pessoal e transferências': 'Folha, aposentados e repasses (favorecidos genéricos)', 'empresa/CNPJ': 'Empresas e instituições (CNPJ)', 'pessoa física': 'Pessoas físicas (CPF)' };
  hbar($('tipos'), Object.keys(T).sort(function (a, b) { return T[b][1] - T[a][1]; }).map(function (k, i) { return { label: tn[k] || k, v: T[k][1], tip: BRL(T[k][0], 0) + ' favorecidos', color: col(i) }; }), { total: TOT.pago });
  $('forn-texto').innerHTML = 'O portal lista <strong>' + BRL(nTot, 0) + ' favorecidos</strong>. As empresas e instituições (CNPJ) receberam <strong>' + money(T['empresa/CNPJ'][1]) + '</strong> (' + pct(T['empresa/CNPJ'][1], TOT.pago) + ' do gasto) e se dividem em <strong>' + BRL(D.cnpj.length, 0) + '</strong> CNPJ com pagamentos no período. CPFs são mascarados pelo portal.';
  hbar($('genericos'), D.genericos.slice(0, 10).map(function (g) { return { label: g[0].replace(/\bPF\d+\b/, '').trim(), v: g[1], color: 'var(--s6)' }; }), { total: TOT.pago });
  var list = D.cnpj, shown = 30, filtered = list;
  function draw() {
    var tb = document.querySelector('#tab-forn tbody');
    tb.innerHTML = filtered.slice(0, shown).map(function (f) {
      var r = list.indexOf(f) + 1, c = CMAP && CMAP[f[1]];
      var ct = CMAP ? (c ? c[2] + ' · ' + money(c[3]) : '—') : '…';
      return '<tr><td>' + r + '</td><td>' + esc(f[0]) + '<br><span class="muted small">' + f[1] + '</span></td><td class="r">' + full(f[2]) + '</td><td class="r">' + f[3] + '</td><td class="small">' + esc(f[4].join(', ')) + '</td><td class="r small">' + ct + '</td></tr>';
    }).join('');
    $('forn-cont').textContent = 'Mostrando ' + Math.min(shown, filtered.length) + ' de ' + BRL(filtered.length, 0);
    $('mais-forn').style.display = shown >= filtered.length ? 'none' : '';
  }
  $('busca-forn').addEventListener('input', function () { var q = norm(this.value); filtered = q ? list.filter(function (f) { return norm(f[0] + ' ' + f[1]).indexOf(q) >= 0; }) : list; shown = 30; draw(); });
  $('mais-forn').addEventListener('click', function () { shown += 50; draw(); });
  draw(); redrawForn = draw;
  var keep; printHooks.push({ before: function () { keep = shown; shown = Math.max(shown, 50); draw(); }, after: function () { shown = keep; draw(); } });
})();

/* ---------- ano a ano ---------- */
(function () {
  if (!HI) { $('anos').style.display = 'none'; return; }
  var ys = YEARS, lab = ys.map(function (y) { return y === 2026 ? '2026*' : String(y); });
  var recY = ys.map(function (y) { return y === 2026 ? REC.realizada : HI.rec[y][3]; });
  var pagY = ys.map(function (y) { return y === 2026 ? TOT.pago : HI.tot[y][4]; });
  var cat26 = [cm['Pessoal e encargos'], cm['Custeio'], cm['Investimentos'], cm['Juros da dívida'] + cm['Inversões financeiras'] + cm['Amortização da dívida']];
  var catY = ys.map(function (y) { return y === 2026 ? cat26 : HI.cats[y]; });
  var sum = function (a) { return a.reduce(function (x, y) { return x + y; }, 0); };
  var n = ys.length - 1, g = function (a, b) { return (a / b - 1) * 100; };
  $('anos-texto').innerHTML = 'Em <strong>2025</strong>, o Estado arrecadou <strong>' + money(recY[n - 1]) + '</strong> e gastou <strong>' + money(pagY[n - 1]) + '</strong>. Em <strong>2022</strong> foram ' + money(recY[0]) + ' e ' + money(pagY[0]) + ': a arrecadação variou ' + BRL(g(recY[n - 1], recY[0]), 0) + '% e o gasto, ' + BRL(g(pagY[n - 1], pagY[0]), 0) + '% no período, sem corrigir pela inflação. 2026 (marcado com *) vai só até setembro, por isso parece menor.';
  var mx = Math.max.apply(null, recY.concat(pagY));
  var bar = function (v, c) { return '<div class="gb"><span class="n">' + BRL(v / 1e9, 1) + '</span><div class="b" style="height:' + (v / mx * 100).toFixed(1) + '%;background:' + c + '"></div></div>'; };
  $('anos-col').innerHTML = '<div class="cols" role="img" aria-label="Entrou e saiu em cada ano">' + ys.map(function (y, i) {
    return '<div class="grp" data-tip="<b>' + lab[i] + '</b><br>Entrou: ' + full(recY[i]) + '<br>Saiu: ' + full(pagY[i]) + '">' + bar(recY[i], 'var(--s3)') + bar(pagY[i], 'var(--s2)') + '</div>';
  }).join('') + '</div><div class="cl">' + lab.map(function (l) { return '<span>' + l + '</span>'; }).join('') + '</div><p class="muted small">valores em R$ bilhões · * 2026 até setembro</p>';
  var cn = ['Pessoal e encargos', 'Custeio', 'Investimentos', 'Dívida e outras'], cc = ['var(--s1)', 'var(--s2)', 'var(--s3)', 'var(--s5)'];
  $('anos-cat').innerHTML = ys.map(function (y, i) {
    var c = catY[i], t = sum(c);
    return '<div class="ys"><span>' + lab[i] + '</span><div class="stack sm" role="img" aria-label="Divisão do gasto de ' + y + ' por tipo">' + c.map(function (v, k) {
      var sh = v / t * 100;
      return '<div class="seg" style="flex:' + sh.toFixed(2) + ';background:' + cc[k] + '" data-tip="' + cn[k] + ' em ' + lab[i] + ': ' + full(v) + ' (' + BRL(sh, 1) + '% do gasto)">' + (sh >= 7 ? BRL(sh, 0) + '%' : '') + '</div>';
    }).join('') + '</div></div>';
  }).join('') + '<p class="muted small">Cada barra soma 100% do gasto do ano. * 2026 até setembro.</p>';
  $('tab-anos').innerHTML = '<div class="tw"><table class="tab"><thead><tr><th>Ano</th><th class="r">Entrou</th><th class="r">Saiu</th><th class="r">Diferença</th><th class="r">Pessoal</th><th class="r">Investimentos</th></tr></thead><tbody>' + ys.map(function (y, i) {
    var t = sum(catY[i]);
    return '<tr><td>' + lab[i] + '</td><td class="r">' + full(recY[i]) + '</td><td class="r">' + full(pagY[i]) + '</td><td class="r">' + full(recY[i] - pagY[i]) + '</td><td class="r">' + pct(catY[i][0], t) + '</td><td class="r">' + pct(catY[i][2], t) + '</td></tr>';
  }).join('') + '</tbody></table></div>';
})();

/* ---------- municípios ---------- */
(function () {
  var Mn = HI && HI.mun; if (!Mn) { $('municipios').style.display = 'none'; return; }
  var yr = 2026, TN = ['ICMS', 'IPVA', 'Royalties', 'IPI', 'Recurso extraordinário'], tc = ['var(--s3)', 'var(--s1)', 'var(--s4)', 'var(--s7)', 'var(--s8)'];
  function data(y) { return Mn.nomes.map(function (n, i) { return { n: n, v: Mn.v[y][i] }; }).sort(function (a, b) { return b.v[5] - a.v[5]; }); }
  function draw() {
    var d = data(yr), tot = d.reduce(function (a, x) { return a + x.v[5]; }, 0), q = norm($('busca-mun').value);
    var man = d.filter(function (x) { return x.n === 'MANAUS'; })[0], p = yr === 2026 ? ' (janeiro a setembro)' : '';
    $('mun-texto').innerHTML = 'Em <strong>' + yr + '</strong>' + p + ', o Estado repassou <strong>' + money(tot) + '</strong> aos 62 municípios do Amazonas (ICMS, IPVA, royalties e IPI). <strong>Manaus</strong> ficou com ' + money(man.v[5]) + ' (' + pct(man.v[5], tot, 0) + '). Os 5 maiores juntos receberam ' + pct(d.slice(0, 5).reduce(function (a, x) { return a + x.v[5]; }, 0), tot, 0) + ' do total.';
    hbar($('mun-top'), d.slice(0, 15).map(function (x) { return { label: x.n, v: x.v[5], color: 'var(--s1)' }; }), { total: tot });
    hbar($('mun-tipo'), TN.map(function (t, k) { return { label: t, v: d.reduce(function (a, x) { return a + x.v[k]; }, 0), color: tc[k] }; }).filter(function (x) { return x.v > 0; }), { total: tot });
    $('mun-nota').innerHTML = 'Parte do ICMS e do IPVA que o Estado arrecada pertence por lei aos municípios (25% do ICMS; 50% do IPVA dos veículos emplacados no município). O ICMS é dividido por um índice que leva em conta, principalmente, a atividade econômica de cada município, por isso Manaus recebe a maior fatia.';
    $('tab-mun').querySelector('tbody').innerHTML = d.map(function (x, i) { return { x: x, i: i }; }).filter(function (o) { return !q || norm(o.x.n).indexOf(q) >= 0; }).map(function (o) {
      return '<tr><td>' + (o.i + 1) + '</td><td>' + esc(o.x.n) + '</td>' + [0, 1, 2, 3, 5].map(function (k) { return '<td class="r">' + full(o.x.v[k]) + '</td>'; }).join('') + '<td class="r">' + pct(o.x.v[5], tot, 2) + '</td></tr>';
    }).join('');
  }
  chips($('mun-chips'), Mn.anos, yr, function (y) { yr = y; draw(); });
  $('busca-mun').addEventListener('input', draw);
  draw();
})();

/* ---------- contratos ---------- */
function initContratos() {
  var C = window.CONTRATOS; if (!C) return;
  var sum = function (a) { return a.reduce(function (x, y) { return x + y; }, 0); };
  CMAP = {}; C.rows.forEach(function (r) { CMAP[r[0]] = r; });
  if (redrawForn) redrawForn();
  var nC = sum(C.n), vC = sum(C.tot), yl = C.anos.map(function (a) { return a === '2026' ? '2026 (até out.)' : a; });
  $('ct-texto').innerHTML = 'De ' + C.anos[0] + ' a ' + C.anos[C.anos.length - 1] + ', os órgãos do Estado registraram <strong>' + BRL(nC, 0) + '</strong> contratos e notas de empenho com empresas e pessoas, num valor inicial somado de <strong>' + money(vC) + '</strong>. Isso é o valor <strong>contratado</strong>, não o valor pago: veja o aviso abaixo da tabela. Dados do Sistema de Gestão de Contratos (SGC), coletados em ' + C.coleta + '.';
  $('ct-tiles').innerHTML = [['', 'Contratos registrados', BRL(nC, 0), 'Contratos originais e notas de empenho de ' + C.anos[0] + ' a ' + C.anos[C.anos.length - 1] + '.'], ['', 'Valor contratado', money(vC), 'Soma do valor inicial. Aditivos não entram.'], ['', 'Empresas (CNPJ)', BRL(C.ncnpj, 0), 'CNPJ diferentes contratados. Pessoas físicas somam ' + BRL(C.pf[0], 0) + ' contratos (' + money(C.pf[1]) + '), sem nomes aqui.'], ['', 'Ainda em vigor', BRL(C.nvig, 0), BRL(C.nadit, 0) + ' aditivos e prorrogações registrados.']].map(function (t) { return '<div class="tile ' + t[0] + '"><p class="k">' + t[1] + '</p><p class="v">' + t[2] + '</p><p class="d">' + t[3] + '</p></div>'; }).join('');
  hbar($('ct-ano'), C.anos.map(function (a, i) { return { label: yl[i], v: C.tot[i], tip: BRL(C.n[i], 0) + ' contratos', color: 'var(--s7)' }; }), { total: vC });
  hbar($('ct-ug'), C.ug.slice(0, 12).map(function (u) { return { label: u[0], v: u[2], tip: BRL(u[1], 0) + ' contratos', color: 'var(--s7)' }; }), { total: vC });
  var shown = 20, filtered = C.rows, open = {};
  function draw() {
    var h = '';
    filtered.slice(0, shown).forEach(function (r) {
      var k = r[0];
      h += '<tr class="click" data-k="' + k + '"><td>' + (C.rows.indexOf(r) + 1) + '</td><td>' + esc(r[1]) + '<br><span class="muted small">' + k + '</span> <span class="ex">' + (open[k] ? '▲ fechar' : '▼ detalhes') + '</span></td><td class="r">' + r[2] + '</td><td class="r">' + full(r[3]) + '</td><td class="r">' + (r[4] ? r[4] + ' · ' + money(r[5]) : '—') + '</td><td class="r">' + r[6] + '</td></tr>';
      if (open[k]) {
        h += '<tr class="sub"><td></td><td colspan="5"><b>Por ano de assinatura:</b> ' + C.anos.map(function (a, i) { return r[7][i] ? a + ': ' + money(r[7][i]) : ''; }).filter(Boolean).join(' · ') + '<br><b>Maiores contratos:</b><br>' + r[8].map(function (c) { return c[0] + ' · ' + esc(c[1]) + ' · <b>' + full(c[3]) + '</b>' + (c[4] ? ' · em vigor' : '') + '<br><span class="small">' + esc(c[2]) + '</span>'; }).join('<br>') + '</td></tr>';
      }
    });
    document.querySelector('#tab-ct tbody').innerHTML = h;
    $('ct-cont').textContent = 'Mostrando ' + Math.min(shown, filtered.length) + ' de ' + BRL(filtered.length, 0) + ' empresas (as de maior valor, com contratos acima de R$ 50 mil ou 3+ contratos)';
    $('mais-ct').style.display = shown >= filtered.length ? 'none' : '';
  }
  $('busca-ct').addEventListener('input', function () { var q = norm(this.value); filtered = q ? C.rows.filter(function (r) { return norm(r[1] + ' ' + r[0]).indexOf(q) >= 0; }) : C.rows; shown = 20; draw(); });
  $('mais-ct').addEventListener('click', function () { shown += 50; draw(); });
  document.querySelector('#tab-ct tbody').addEventListener('click', function (e) { var tr = e.target.closest('tr.click'); if (!tr) return; var k = tr.getAttribute('data-k'); open[k] = !open[k]; draw(); });
  draw();
  var keep; printHooks.push({ before: function () { keep = shown; shown = Math.max(shown, 40); draw(); }, after: function () { shown = keep; draw(); } });
}
(function () {
  var s = document.createElement('script'); s.src = 'contratos.js'; s.onload = initContratos;
  s.onerror = function () { $('ct-texto').textContent = 'Não foi possível carregar os contratos agora. Tente recarregar a página.'; };
  document.body.appendChild(s);
})();

/* ---------- impressão ---------- */
(function () {
  var st = null;
  function before() {
    st = { theme: document.documentElement.getAttribute('data-theme'), det: [].map.call(document.querySelectorAll('details'), function (d) { return d.open; }) };
    document.documentElement.setAttribute('data-theme', 'light');
    [].forEach.call(document.querySelectorAll('details'), function (d) { d.open = true; });
    $('print-data').textContent = new Date().toLocaleString('pt-BR');
    printHooks.forEach(function (h) { h.before(); });
  }
  function after() {
    if (!st) return;
    printHooks.forEach(function (h) { h.after(); });
    document.documentElement.setAttribute('data-theme', st.theme || 'light');
    [].forEach.call(document.querySelectorAll('details'), function (d, i) { d.open = st.det[i]; });
    st = null;
  }
  window.addEventListener('beforeprint', before);
  window.addEventListener('afterprint', after);
  $('imprimir').addEventListener('click', function () { window.print(); });
})();

/* ---------- glossário e tema ---------- */
$('g-loa').textContent = money(TOT.dot);
var root = document.documentElement, tb = $('tema');
function setTheme(t) { root.setAttribute('data-theme', t); tb.textContent = t === 'dark' ? 'Tema claro' : 'Tema escuro'; try { localStorage.setItem('tema', t); } catch (e) {} }
var saved = null; try { saved = localStorage.getItem('tema'); } catch (e) {}
setTheme(saved || (window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
tb.addEventListener('click', function () { setTheme(root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'); });
})();
