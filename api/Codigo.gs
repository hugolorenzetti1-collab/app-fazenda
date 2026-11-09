/**
 * APP FAZENDA LORENZETTI — API do app offline
 * Recebe a fila de lançamentos do celular e grava nas planilhas de sempre.
 * Implantar como App da Web: Executar como "Eu", Acesso "Qualquer pessoa".
 */

var IDS = {
  GADO:   '1XlO1T97aOfS_U_1jnwFhsllCANSET5UEsKNH3B3DlRk', // CONTROLE GADO
  MANEJO: '1gLoFx8Jl4duhYsvGP2yAx_whhZcUGq1yU1ZMiQdLiHc', // MANEJO MS CONSULTORIA
  GIRO:   '1V8J63bAR0bXfBOMTUrVoo121t90af-uBXy-oiLwsqhU', // giro25 (trato)
  CHUVA:  '1KCXu6InozHemx6IL7Oe0xg3HqFJYJj2vqhbrQ2SYifU'  // Chuvas
};

var SAL = 'lorenzetti-app:';
var USERS = {
  hugo:    { nome: 'Hugo',    hash: 'HASH_HUGO' },
  gustavo: { nome: 'Gustavo', hash: 'HASH_GUSTAVO' }
};

var TZ = 'America/Cuiaba';
var LER_TZ = TZ; // trocado para o fuso de cada planilha na leitura

/* ---------------- entrada ---------------- */

function doGet() {
  return json_({ ok: true, app: 'Fazenda Lorenzetti', hora: new Date().toISOString() });
}

function doPost(e) {
  var req;
  try { req = JSON.parse(e.postData.contents); } catch (err) { return json_({ ok: false, erro: 'JSON inválido' }); }
  var u = auth_(req.u, req.p);
  if (!u) return json_({ ok: false, erro: 'Usuário ou PIN errado' });
  try {
    if (req.a === 'login') return json_({ ok: true, nome: u.nome });
    if (req.a === 'dados') return json_({ ok: true, dados: dados_() });
    if (req.a === 'sync')  return json_(sync_(req.itens || [], u));
    return json_({ ok: false, erro: 'Ação desconhecida' });
  } catch (err) {
    return json_({ ok: false, erro: String(err && err.message || err) });
  }
}

function auth_(u, p) {
  u = String(u || '').toLowerCase().trim();
  var x = USERS[u];
  if (!x) return null;
  var cache = CacheService.getScriptCache(), kf = 'falhas_' + u;
  var falhas = Number(cache.get(kf) || 0);
  if (falhas >= 10) return null; // trava 1 hora depois de 10 PINs errados
  var h = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, SAL + u + ':' + String(p || ''), Utilities.Charset.UTF_8)
    .map(function (b) { return ('0' + (b & 255).toString(16)).slice(-2); }).join('');
  if (h === x.hash) return { id: u, nome: x.nome };
  cache.put(kf, String(falhas + 1), 3600);
  return null;
}

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

/* ---------------- sincronização ---------------- */

function sync_(itens, u) {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var log = sheet_(IDS.GADO, 'APP_LOG', ['ID', 'Tipo', 'Usuário', 'Lançado no celular', 'Recebido', 'Dados']);
    var feitos = {};
    var n = log.getLastRow();
    if (n > 1) log.getRange(2, 1, n - 1, 1).getValues().forEach(function (r) { feitos[r[0]] = 1; });
    var ok = [], erros = [];
    itens.forEach(function (it) {
      if (!it || !it.id) return;
      if (feitos[it.id]) { ok.push(it.id); return; }
      try {
        gravar_(it.tipo, it.d || {}, u, it);
        log.appendRow([it.id, it.tipo, u.nome, it.ts ? new Date(it.ts) : '', new Date(), JSON.stringify(it.d)]);
        feitos[it.id] = 1;
        ok.push(it.id);
      } catch (err) {
        erros.push({ id: it.id, erro: String(err && err.message || err) });
      }
    });
    SpreadsheetApp.flush();
    return { ok: true, gravados: ok, erros: erros };
  } finally {
    lock.releaseLock();
  }
}

function gravar_(tipo, d, u, it) {
  switch (tipo) {
    case 'gado':      return gado_(d, u);
    case 'transf':    return transf_(d, u);
    case 'morte':     return morte_(d, u);
    case 'trato':     return trato_(d, u);
    case 'chuva':     return chuva_(d, u);
    case 'mudar':     return mudarPasto_(d, u);
    case 'lote':      return lote_(d, u);
    case 'contagem':  return contagem_(d, u);
    case 'bebedouro': return bebedouro_(d, u);
    case 'cocho':     return cocho_(d, u);
    case 'maquina':   return maquina_(d, u);
    case 'maq_nova':  return maqNova_(d, u);
  }
  throw new Error('Tipo desconhecido: ' + tipo);
}

/* ---------------- gravações ---------------- */

// CONTROLE GADO > Lançamentos: Data | Ent M | Ent F | Saí M | Saí F | Saldo M | Saldo F | Obs | Fazenda
function linhaGado_(data, em, ef, sm, sf, obs, faz) {
  var sh = SpreadsheetApp.openById(IDS.GADO).getSheetByName('Lançamentos');
  var last = ultimaLinha_(sh, 1);
  var row = last + 1;
  sh.getRange(row, 1, 1, 5).setValues([[data, em || '', ef || '', sm || '', sf || '']]);
  sh.getRange(row, 8, 1, 2).setValues([[obs || '', faz || 'Lorenzetti']]);
  if (last >= 2) {
    // copia a fórmula de saldo da última linha que tem fórmula (pula linhas "União (hist.)")
    var ini = Math.max(2, last - 30);
    var fs = sh.getRange(ini, 6, last - ini + 1, 1).getFormulas();
    for (var i = fs.length - 1; i >= 0; i--) {
      if (fs[i][0]) { sh.getRange(ini + i, 6, 1, 2).copyTo(sh.getRange(row, 6, 1, 2), SpreadsheetApp.CopyPasteType.PASTE_FORMULA, false); break; }
    }
    sh.getRange(last, 1, 1, 9).copyTo(sh.getRange(row, 1, 1, 9), SpreadsheetApp.CopyPasteType.PASTE_FORMAT, false);
  }
}

function gado_(d, u) {
  var q = num_(d.qtd);
  if (!q) throw new Error('Quantidade vazia');
  var m = d.sexo === 'F' ? 0 : q, f = d.sexo === 'F' ? q : 0;
  var obs = (d.obs || '') + assina_(u);
  if (d.mov === 'saida') linhaGado_(data_(d.data), '', '', m, f, obs, d.fazenda);
  else linhaGado_(data_(d.data), m, f, '', '', obs, d.fazenda);
}

function transf_(d, u) {
  var q = num_(d.qtd);
  if (!q) throw new Error('Quantidade vazia');
  if (d.de === d.para) throw new Error('Origem e destino iguais');
  var m = d.sexo === 'F' ? 0 : q, f = d.sexo === 'F' ? q : 0;
  var dt = data_(d.data), extra = (d.obs ? ' ' + d.obs : '') + assina_(u);
  linhaGado_(dt, '', '', m, f, 'TRANSF. P/ ' + up_(d.para) + extra, d.de);
  linhaGado_(dt, m, f, '', '', 'TRANSF. DA ' + up_(d.de) + extra, d.para);
}

function morte_(d, u) {
  var q = num_(d.qtd) || 1;
  var m = d.sexo === 'F' ? 0 : q, f = d.sexo === 'F' ? q : 0;
  var obs = 'MORTE' + (d.pasto ? ' PASTO ' + d.pasto : '') + (d.causa ? ' CAUSA ' + d.causa : '') +
            (d.brinco ? ' NUMERO=' + d.brinco : '') + (d.obs ? ' ' + d.obs : '') + assina_(u);
  linhaGado_(data_(d.data), '', '', m, f, obs.toUpperCase(), d.fazenda);
}

// giro25 > TRATOS: E Data | F Pasto | G Peso | H Obs
function trato_(d, u) {
  var kg = num_(d.kg);
  if (!kg) throw new Error('Peso vazio');
  var sh = SpreadsheetApp.openById(IDS.GIRO).getSheetByName('TRATOS');
  var row = ultimaLinha_(sh, 5) + 1;
  sh.getRange(row, 5, 1, 4).setValues([[data_(d.data), String(d.pasto), kg, (d.obs || '') + assina_(u)]]);
  if (row > 2) sh.getRange(row - 1, 5, 1, 4).copyTo(sh.getRange(row, 5, 1, 4), SpreadsheetApp.CopyPasteType.PASTE_FORMAT, false);
}

// Chuvas > LANÇAMENTOS: Data | mm | Obs
function chuva_(d, u) {
  var sh = SpreadsheetApp.openById(IDS.CHUVA).getSheetByName('LANÇAMENTOS');
  var row = ultimaLinha_(sh, 1) + 1;
  sh.getRange(row, 1, 1, 3).setValues([[data_(d.data), num_(d.mm), (d.obs || '') + assina_(u)]]);
  if (row > 2) sh.getRange(row - 1, 1, 1, 3).copyTo(sh.getRange(row, 1, 1, 3), SpreadsheetApp.CopyPasteType.PASTE_FORMAT, false);
}

// MANEJO > AppDatas: Modulo | Pasto | Entrada (texto aaaa-mm-dd)
function mudarPasto_(d, u) {
  var ss = SpreadsheetApp.openById(IDS.MANEJO);
  var sh = ss.getSheetByName('AppDatas');
  var vals = sh.getDataRange().getValues();
  var iso = isoData_(d.data);
  var achou = false;
  for (var i = 1; i < vals.length; i++) {
    if (String(vals[i][0]) === String(d.modulo)) {
      sh.getRange(i + 1, 2, 1, 2).setNumberFormat('@').setValues([[d.pasto, iso]]);
      achou = true; break;
    }
  }
  if (!achou) {
    var r = sh.getLastRow() + 1;
    sh.getRange(r, 1, 1, 3).setNumberFormat('@').setValues([[String(d.modulo), d.pasto, iso]]);
  }
  var h = sheet_(IDS.MANEJO, 'AppHistorico', ['Data', 'Módulo', 'Pasto', 'Obs', 'Usuário', 'Lançado em']);
  h.appendRow([data_(d.data), Number(d.modulo), d.pasto, d.obs || '', u.nome, new Date()]);
}

// MANEJO > AppLotes: Modulo | Categoria | Cabecas | Peso
function lote_(d, u) {
  var sh = SpreadsheetApp.openById(IDS.MANEJO).getSheetByName('AppLotes');
  var vals = sh.getDataRange().getValues();
  var alvo = -1;
  for (var i = 1; i < vals.length; i++) {
    if (String(vals[i][0]) === String(d.modulo) && norm_(vals[i][1]) === norm_(d.categoria)) { alvo = i + 1; break; }
  }
  if (d.modo === 'remover') {
    if (alvo > 0) sh.deleteRow(alvo);
  } else if (alvo > 0) {
    sh.getRange(alvo, 3, 1, 2).setValues([[num_(d.cabecas), num_(d.peso)]]);
  } else {
    sh.appendRow([String(d.modulo), d.categoria, num_(d.cabecas), num_(d.peso)]);
  }
  var h = sheet_(IDS.MANEJO, 'AppHistorico', ['Data', 'Módulo', 'Pasto', 'Obs', 'Usuário', 'Lançado em']);
  h.appendRow([data_(d.data), Number(d.modulo), '', 'LOTE ' + (d.modo || 'novo').toUpperCase() + ': ' + d.categoria + ' ' +
               (d.cabecas || '') + ' cab ' + (d.peso || '') + ' kg' + (d.obs ? ' — ' + d.obs : ''), u.nome, new Date()]);
}

function contagem_(d, u) {
  var sh = sheet_(IDS.GADO, 'CONTAGEM', ['Data', 'Fazenda', 'Local', 'Cabeças', 'Obs', 'Usuário']);
  sh.appendRow([data_(d.data), d.fazenda || '', d.local || '', num_(d.cabecas), d.obs || '', u.nome]);
}

function bebedouro_(d, u) {
  var sh = sheet_(IDS.GADO, 'BEBEDOUROS', ['Data', 'Local', 'Obs', 'Usuário']);
  sh.appendRow([data_(d.data), d.local || '', d.obs || '', u.nome]);
}

function cocho_(d, u) {
  var sh = sheet_(IDS.MANEJO, 'COCHO_SAL', ['Data', 'Módulo', 'Pasto', 'Produto', 'Sacos', 'Kg', 'Obs', 'Usuário']);
  sh.appendRow([data_(d.data), Number(d.modulo) || d.modulo, d.pasto || '', d.produto || '', num_(d.sacos), num_(d.kg), d.obs || '', u.nome]);
}

function maquina_(d, u) {
  var sh = sheet_(IDS.GADO, 'MAQ_HISTORICO', ['Data', 'Máquina', 'Tipo', 'Horímetro/Km', 'Litros', 'Descrição', 'Usuário']);
  sh.appendRow([data_(d.data), d.maquina || '', d.tipo || '', num_(d.horimetro), num_(d.litros), d.desc || '', u.nome]);
}

function maqNova_(d, u) {
  var sh = sheet_(IDS.GADO, 'MAQUINAS', ['Máquina', 'Tipo', 'Obs', 'Ativa']);
  var vals = sh.getDataRange().getValues();
  for (var i = 1; i < vals.length; i++) if (norm_(vals[i][0]) === norm_(d.nome)) return;
  sh.appendRow([d.nome, d.tipo || '', d.obs || '', 'SIM']);
}

/* ---------------- leitura para o app ---------------- */

function dados_() {
  var hoje = new Date();
  var out = { gerado: hoje.toISOString() };

  // Gado: saldo por fazenda
  var gl = SpreadsheetApp.openById(IDS.GADO);
  LER_TZ = gl.getSpreadsheetTimeZone();
  var lan = gl.getSheetByName('Lançamentos').getDataRange().getValues();
  var saldo = {}, ult = [];
  for (var i = 1; i < lan.length; i++) {
    var r = lan[i];
    if (!r[0]) continue;
    var faz = String(r[8] || 'Lorenzetti');
    if (/hist/i.test(faz)) continue;
    var s = saldo[faz] || (saldo[faz] = { m: 0, f: 0 });
    s.m += num_(r[1]) - num_(r[3]);
    s.f += num_(r[2]) - num_(r[4]);
  }
  for (var j = Math.max(1, lan.length - 15); j < lan.length; j++) {
    var x = lan[j];
    if (!x[0]) continue;
    ult.push({ data: iso_(x[0]), em: num_(x[1]), ef: num_(x[2]), sm: num_(x[3]), sf: num_(x[4]), obs: String(x[7] || ''), faz: String(x[8] || 'Lorenzetti') });
  }
  out.gado = { saldo: saldo, ultimos: ult.reverse() };

  // Semi-confinamento (giro25): pastos e último trato
  var giro = SpreadsheetApp.openById(IDS.GIRO);
  LER_TZ = giro.getSpreadsheetTimeZone();
  var gv = giro.getSheetByName('GIRO 25').getRange('A4:G60').getValues();
  var semi = [];
  gv.forEach(function (r) {
    if (!r[0]) return;
    semi.push({ pasto: String(r[0]).toUpperCase(), aparte: String(r[1] || ''), bois: num_(r[2]), peso: num_(r[3]), entrada: iso_(r[4]), origem: String(r[5] || ''), dias: num_(r[6]) });
  });
  var tr = giro.getSheetByName('TRATOS');
  var tn = ultimaLinha_(tr, 5);
  var tv = tn > 1 ? tr.getRange(2, 5, tn - 1, 3).getValues() : [];
  var ultTrato = {}, tratosRecentes = [];
  tv.forEach(function (r) {
    if (!r[0] || !r[1]) return;
    var p = String(r[1]).toUpperCase().trim(), dt = iso_(r[0]);
    if (!ultTrato[p] || ultTrato[p].data < dt) ultTrato[p] = { data: dt, kg: num_(r[2]) };
  });
  tv.slice(-20).forEach(function (r) { if (r[0]) tratosRecentes.push({ data: iso_(r[0]), pasto: String(r[1]), kg: num_(r[2]) }); });
  out.semi = { pastos: semi, ultTrato: ultTrato, recentes: tratosRecentes.reverse() };

  // Rotacionado (MANEJO MS)
  var mj = SpreadsheetApp.openById(IDS.MANEJO);
  LER_TZ = mj.getSpreadsheetTimeZone();
  out.modulos = modulos_(mj.getSheetByName('Pastos').getDataRange().getDisplayValues());
  var ad = mj.getSheetByName('AppDatas').getDataRange().getDisplayValues();
  var atual = {};
  for (var a = 1; a < ad.length; a++) if (ad[a][0]) atual[ad[a][0]] = { pasto: ad[a][1], entrada: ad[a][2] };
  var al = mj.getSheetByName('AppLotes').getDataRange().getValues();
  var lotes = {};
  for (var b = 1; b < al.length; b++) if (al[b][0] !== '') (lotes[al[b][0]] = lotes[al[b][0]] || []).push({ categoria: String(al[b][1]).trim(), cabecas: num_(al[b][2]), peso: num_(al[b][3]) });
  out.modulos.forEach(function (m) {
    m.atual = atual[m.n] || null;
    m.lotes = lotes[m.n] || [];
  });
  var cs = mj.getSheetByName('COCHO_SAL');
  var ultCocho = {};
  if (cs && cs.getLastRow() > 1) cs.getRange(2, 1, cs.getLastRow() - 1, 6).getValues().forEach(function (r) {
    var k = String(r[1]); var dt = iso_(r[0]);
    if (!ultCocho[k] || ultCocho[k].data < dt) ultCocho[k] = { data: dt, produto: String(r[3]), sacos: num_(r[4]), kg: num_(r[5]) };
  });
  out.ultCocho = ultCocho;

  // Chuva
  var chs = SpreadsheetApp.openById(IDS.CHUVA);
  LER_TZ = chs.getSpreadsheetTimeZone();
  var ch = chs.getSheetByName('LANÇAMENTOS');
  var cn = ultimaLinha_(ch, 1);
  var cv = cn > 1 ? ch.getRange(2, 1, cn - 1, 2).getValues() : [];
  var chuvas = cv.filter(function (r) { return r[0] instanceof Date; }).map(function (r) { return { data: iso_(r[0]), mm: num_(r[1]) }; });
  chuvas.sort(function (p, q) { return p.data < q.data ? -1 : 1; });
  var ano = Utilities.formatDate(hoje, TZ, 'yyyy'), mes = Utilities.formatDate(hoje, TZ, 'yyyy-MM');
  out.chuva = {
    recentes: chuvas.slice(-15).reverse(),
    totalAno: chuvas.filter(function (c) { return c.data.slice(0, 4) === ano; }).reduce(function (s, c) { return s + c.mm; }, 0),
    totalMes: chuvas.filter(function (c) { return c.data.slice(0, 7) === mes; }).reduce(function (s, c) { return s + c.mm; }, 0)
  };

  // Bebedouros, contagens, máquinas
  LER_TZ = gl.getSpreadsheetTimeZone();
  out.bebedouros = ultimoPor_(gl.getSheetByName('BEBEDOUROS'), 1, 0, 4);
  out.contagens = ultimas_(gl.getSheetByName('CONTAGEM'), 6, 15).map(function (r) { return { data: iso_(r[0]), faz: r[1], local: r[2], cab: num_(r[3]), obs: r[4], user: r[5] }; });
  var mq = gl.getSheetByName('MAQUINAS');
  out.maquinas = mq && mq.getLastRow() > 1 ? mq.getRange(2, 1, mq.getLastRow() - 1, 4).getValues()
    .filter(function (r) { return r[0] && String(r[3]).toUpperCase() !== 'NÃO'; }).map(function (r) { return { nome: String(r[0]), tipo: String(r[1]) }; }) : [];
  out.maqHist = ultimas_(gl.getSheetByName('MAQ_HISTORICO'), 7, 300).map(function (r) {
    return { data: iso_(r[0]), maquina: String(r[1]), tipo: String(r[2]), horimetro: num_(r[3]), litros: num_(r[4]), desc: String(r[5]), user: String(r[6]) };
  });
  return out;
}

// Lê a aba "Pastos" (blocos de 3 módulos lado a lado: colunas A, F, K)
function modulos_(v) {
  var mods = [];
  for (var i = 0; i < v.length; i++) {
    for (var c = 0; c < v[i].length; c++) {
      var m = /^M[ÓO]DULO\s+(\d+)/i.exec(String(v[i][c] || '').trim());
      if (!m) continue;
      var mod = { n: m[1], resumo: String((v[i + 1] || [])[c] || ''), pastos: [] };
      for (var k = i + 2; k < v.length; k++) {
        var nome = String((v[k] || [])[c] || '').trim();
        if (!nome || /^M[ÓO]DULO/i.test(nome)) break;
        var dias = parseInt(String(v[k][c + 3] || '').replace(/\D/g, ''), 10) || 0;
        mod.pastos.push({ nome: nome, dias: dias });
      }
      mods.push(mod);
    }
  }
  mods.sort(function (a, b) { return a.n - b.n; });
  return mods;
}

/* ---------------- utilidades ---------------- */

function sheet_(id, nome, cab) {
  var ss = SpreadsheetApp.openById(id);
  var sh = ss.getSheetByName(nome);
  if (!sh) {
    sh = ss.insertSheet(nome, ss.getSheets().length);
    sh.getRange(1, 1, 1, cab.length).setValues([cab]).setFontWeight('bold').setBackground('#1F3D2B').setFontColor('#ffffff');
    sh.setFrozenRows(1);
    sh.getRange('A:A').setNumberFormat('dd/mm/yyyy');
  }
  return sh;
}

function ultimaLinha_(sh, col) {
  var n = sh.getLastRow();
  if (n < 1) return 0;
  var v = sh.getRange(1, col, n, 1).getValues();
  for (var i = v.length - 1; i >= 0; i--) if (v[i][0] !== '' && v[i][0] !== null) return i + 1;
  return 0;
}

function ultimas_(sh, ncol, qtd) {
  if (!sh || sh.getLastRow() < 2) return [];
  var n = sh.getLastRow() - 1, ini = Math.max(2, sh.getLastRow() - qtd + 1);
  return sh.getRange(ini, 1, sh.getLastRow() - ini + 1, ncol).getValues().reverse();
}

function ultimoPor_(sh, keyCol, dateCol, ncol) {
  var o = {};
  if (!sh || sh.getLastRow() < 2) return o;
  sh.getRange(2, 1, sh.getLastRow() - 1, ncol).getValues().forEach(function (r) {
    var k = String(r[keyCol]); var dt = iso_(r[dateCol]);
    if (k && (!o[k] || o[k].data < dt)) o[k] = { data: dt, obs: String(r[2] || ''), user: String(r[3] || '') };
  });
  return o;
}

function data_(s) {
  if (!s) return new Date();
  var p = String(s).split('-');
  return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]), 12, 0, 0);
}
function isoData_(s) { return Utilities.formatDate(data_(s), TZ, 'yyyy-MM-dd'); }
function iso_(d) {
  if (d instanceof Date) return Utilities.formatDate(d, LER_TZ, 'yyyy-MM-dd'); // fuso da planilha que está sendo lida
  var m = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(String(d || ''));
  return m ? m[3] + '-' + m[2] + '-' + m[1] : String(d || '');
}
function num_(x) {
  if (typeof x === 'number') return x;
  var s = String(x || '').trim();
  if (!s) return 0;
  if (s.indexOf(',') >= 0) s = s.replace(/\./g, '').replace(',', '.');
  var n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}
function norm_(s) { return String(s || '').toUpperCase().trim(); }
function up_(s) { return String(s || '').toUpperCase(); }
function assina_(u) { return ' [APP ' + u.nome.toUpperCase() + ']'; }

/* Teste manual no editor: roda dados_() e mostra o tamanho. */
function testeDados() { Logger.log(JSON.stringify(dados_()).length); }
