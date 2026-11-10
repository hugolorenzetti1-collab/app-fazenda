/**
 * APP FAZENDA LORENZETTI — API do app offline (v2)
 * Recebe a fila de lançamentos do celular e grava nas planilhas de sempre.
 * Implantar como App da Web: Executar como "Eu", Acesso "Qualquer pessoa".
 *
 * Telegram: em Configurações do projeto > Propriedades do script, TELEGRAM_TOKEN = token do bot.
 * Depois rode a função configurarTelegram() uma vez (descobre o grupo e cria os horários 6h, 12h e 18h).
 */

var IDS = {
  GADO:   '1XlO1T97aOfS_U_1jnwFhsllCANSET5UEsKNH3B3DlRk', // CONTROLE GADO
  MANEJO: '1gLoFx8Jl4duhYsvGP2yAx_whhZcUGq1yU1ZMiQdLiHc', // MANEJO MS CONSULTORIA
  GIRO:   '1V8J63bAR0bXfBOMTUrVoo121t90af-uBXy-oiLwsqhU', // giro25 (trato)
  CHUVA:  '1KCXu6InozHemx6IL7Oe0xg3HqFJYJj2vqhbrQ2SYifU'  // Chuvas
};

var SAL = 'lorenzetti-app:';
var USERS = {
  hugo:    { nome: 'Hugo',    hash: 'HASH_HUGO',    admin: true },
  gustavo: { nome: 'Gustavo', hash: 'HASH_GUSTAVO', admin: false },
  rui:     { nome: 'Rui',     hash: 'HASH_RUI',     admin: false, ver: true } // só vê, não lança
};

var TZ = 'America/Cuiaba';
var LER_TZ = TZ; // trocado para o fuso de cada planilha na leitura
var UA_KG = 450;

// Estrutura do rotacionado (igual ao app de manejo antigo)
var MODULES = [
  { n: 1,  area: 86.3,  cap: 46.97,  pastos: [['PASTO 8',7],['PASTO 9',6],['PASTO 10',6],['PASTO 11',9]] },
  { n: 2,  area: 37.8,  cap: 20.82,  pastos: [['PASTO 14',10],['PASTO 14 - A',9],['PASTO 14 - C',9]] },
  { n: 3,  area: 105.1, cap: 77.10,  pastos: [['PASTO 17',6],['PASTO G 17',5],['PASTO 16',7],['SAPÉ',7],['PASTO 14 - B',3]] },
  { n: 4,  area: 64.7,  cap: 54.79,  pastos: [['PASTO G 18',11],['ENLEIRADO 1',7],['ENLEIRADO 2',9]] },
  { n: 5,  area: 74.7,  cap: 95.00,  pastos: [['PASTO 18',8],['PASTO 18 - A',6],['PASTO 19',7],['PASTO 19 - A',6]] },
  { n: 6,  area: 68.2,  cap: 102.00, pastos: [['PASTO 20',8],['PASTO 20 - A',11],['PASTO 21',6],['PASTO 21 - A',3]] },
  { n: 7,  area: 78.7,  cap: 186.00, pastos: [['PALHADÃO - 1',9],['PALHADÃO - 2',10],['PALHADÃO - 4',10]] },
  { n: 8,  area: 72.0,  cap: 158.00, pastos: [['PALHADÃO - 3',9],['PALHADÃO - 5',9],['PALHADÃO - 6',10]] },
  { n: 9,  area: 83.0,  cap: 59.00,  pastos: [['PASTO 22',6],['PASTO 23',5],['PASTO 24',7],['PASTO 24 - A',5],['PASTO 27',4]] },
  { n: 10, area: 62.3,  cap: 90.00,  pastos: [['PASTO 25',6],['PASTO 25 - A',8],['PASTO 26',4],['PASTO 26 -B',10]] },
  { n: 11, area: 105.0, cap: 168.00, pastos: [['PASTO 28',8],['PASTO 29',6],['PASTO 30',6],['PASTO 31',3],['PASTO 31 - A',4]] },
  { n: 12, area: 113.0, cap: 191.00, pastos: [['PASTO 32',8],['PASTO 32 - A',9],['PASTO 33',5],['PASTO 33 - A',6]] },
  { n: 13, area: 111.8, cap: 174.00, pastos: [['PASTO 26 - A',3],['PASTO 34',8],['PASTO 35',5],['PASTO 36',6],['PASTO 36 - A',6]] },
  { n: 14, area: 115.6, cap: 337.00, pastos: [['PASTO 37',10],['PASTO 39',11],['PASTO 41',7]] },
  { n: 15, area: 37.7,  cap: 50.00,  pastos: [['PASTO 42',11],['PASTO 42 - A',17]] },
  { n: 16, area: 54.9,  cap: 89.00,  pastos: [['PASTO 45',9],['PASTO 46',13],['PASTO 47',6]] },
  { n: 17, area: 152.9, cap: 256.00, pastos: [['PASTO 48',5],['PASTO 49',5],['PASTO 50',7],['PASTO 51',4],['PASTO 52',7]] },
  { n: 18, area: 27.5,  cap: 0.00,   pastos: [['PASTO 12',12],['PASTO 12 - A',16]] }
];

// Área útil de cada pasto (planilha da MS Consultoria, via KMZ "Pastos 2026")
var AREA_UTIL = {"PASTO 12": 11.8, "PASTO 12 - A": 15.7, "PASTO 8": 22.2, "PASTO 9": 17.3, "PASTO 10": 17.8, "PASTO 11": 29.0, "PASTO 14": 14.0, "PASTO 14 - A": 12.0, "PASTO 14 - B": 10.1, "PASTO 14 - C": 11.8, "PASTO 16": 25.2, "SAPÉ": 28.1, "PASTO 17": 21.6, "PASTO 18": 22.2, "PASTO 18 - A": 17.3, "PASTO 19": 19.0, "PASTO 19 - A": 16.1, "PASTO 20": 19.3, "PASTO 20 - A": 25.7, "PASTO 21": 15.6, "PASTO 21 - A": 7.6, "PASTO G 17": 20.3, "PASTO G 18": 26.2, "ENLEIRADO 1": 16.6, "ENLEIRADO 2": 21.9, "PASTO 22": 18.1, "PASTO 23": 15.2, "PASTO 24": 19.2, "PASTO 24 - A": 14.2, "PASTO 25": 12.6, "PASTO 25 - A": 18.9, "PASTO 26": 7.9, "PASTO 26 - A": 11.9, "PASTO 26 -B": 22.9, "PASTO 27": 12.1, "PASTO 28": 30.4, "PASTO 29": 24.0, "PASTO 30": 21.6, "PASTO 31": 11.9, "PASTO 31 - A": 16.7, "PASTO 32": 34.1, "PASTO 32 - A": 35.1, "PASTO 33": 19.1, "PASTO 33 - A": 25.2, "PASTO 34": 33.4, "PASTO 35": 19.8, "PASTO 36": 22.0, "PASTO 36 - A": 24.7, "PASTO 37": 40.2, "PASTO 39": 45.0, "PASTO 41": 30.4, "PASTO 42": 14.7, "PASTO 42 - A": 23.0, "PASTO 45": 17.3, "PASTO 46": 25.5, "PASTO 47": 12.1, "PASTO 48": 28.9, "PASTO 49": 26.8, "PASTO 50": 38.0, "PASTO 51": 23.1, "PASTO 52": 36.1, "PALHADÃO - 1": 24.1, "PALHADÃO - 2": 28.0, "PALHADÃO - 3": 23.4, "PALHADÃO - 4": 26.7, "PALHADÃO - 5": 22.3, "PALHADÃO - 6": 26.0};
var CONSUMO_UA = UA_KG * 0.025; // 11,25 kg MS por UA por dia (2,5% do peso vivo)

// Regras de aviso (padrão). Ficam na aba REGRAS do CONTROLE GADO e podem ser mudadas pelo app (Hugo).
var REGRAS_PADRAO = [
  ['semi_sem_trato',   'Pasto do semi sem trato (dias)', 2,  'SIM'],
  ['rot_passou',       'Rotacionado: passou do dia de retirar (dias além)', 0, 'SIM'],
  ['rot_antes',        'Rotacionado: avisar antes de retirar (dias antes)', 1, 'SIM'],
  ['rot_lotacao',      'Rotacionado: lotação acima da capacidade', 0, 'SIM'],
  ['medicao',          'Módulo sem medição de forragem (dias)', 30, 'NÃO'],
  ['sem_chuva',        'Dias sem chuva', 15, 'SIM'],
  ['bebedouro',        'Bebedouro sem lavar (dias)', 7, 'SIM'],
  ['cocho',            'Cocho/sal sem abastecer (dias)', 7, 'SIM'],
  ['maquina',          'Máquina sem lançamento (dias)', 30, 'NÃO']
];

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
    if (req.a === 'login') return json_({ ok: true, nome: u.nome, admin: u.admin, ver: u.ver });
    if (req.a === 'dados') return json_({ ok: true, dados: dados_(u) });
    if (u.ver) return json_({ ok: false, erro: 'Usuário só de consulta: não pode lançar' });
    if (req.a === 'sync')  return json_(sync_(req.itens || [], u));
    if (req.a === 'apagar')   return json_(apagar_(req.id, u));
    if (req.a === 'corrigir') return json_(corrigir_(req.id, req.d, u));
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
  if (h === x.hash) return { id: u, nome: x.nome, admin: !!x.admin, ver: !!x.ver };
  cache.put(kf, String(falhas + 1), 3600);
  return null;
}

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

/* ---------------- sincronização ---------------- */

var LOG_CAB = ['ID', 'Tipo', 'Usuário', 'Lançado no celular', 'Recebido', 'Dados', 'Onde gravou', 'Situação'];

function log_() {
  var sh = sheet_(IDS.GADO, 'APP_LOG', LOG_CAB);
  if (sh.getLastColumn() < LOG_CAB.length) sh.getRange(1, 1, 1, LOG_CAB.length).setValues([LOG_CAB]).setFontWeight('bold');
  return sh;
}

function sync_(itens, u) {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var log = log_();
    var feitos = {};
    var n = log.getLastRow();
    if (n > 1) log.getRange(2, 1, n - 1, 1).getValues().forEach(function (r) { feitos[r[0]] = 1; });
    var ok = [], erros = [];
    itens.forEach(function (it) {
      if (!it || !it.id) return;
      if (feitos[it.id]) { ok.push(it.id); return; }
      try {
        var d = it.d || {};
        var foto = d.foto; if (foto) delete d.foto;          // foto não vai para o log
        var locs = gravar_(it.tipo, d, u, foto) || [];
        log.appendRow([it.id, it.tipo, u.nome, it.ts ? new Date(it.ts) : '', new Date(), JSON.stringify(d), JSON.stringify(locs), 'OK']);
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

function gravar_(tipo, d, u, foto) {
  switch (tipo) {
    case 'gado':      return gado_(d, u);
    case 'transf':    return transf_(d, u);
    case 'morte':     return morte_(d, u, foto);
    case 'trato':     return trato_(d, u);
    case 'chuva':     return chuva_(d, u);
    case 'manejo':    return manejo_(d, u);
    case 'mudar':     return mudarPasto_(d, u);
    case 'lote':      return lote_(d, u);
    case 'contagem':  return contagem_(d, u);
    case 'bebedouro': return bebedouro_(d, u);
    case 'cocho':     return cocho_(d, u);
    case 'maquina':   return maquina_(d, u);
    case 'maq_nova':  return maqNova_(d, u);
    case 'regras':    return salvaRegras_(d, u);
    case 'medicao':   return medicao_(d, u);
  }
  throw new Error('Tipo desconhecido: ' + tipo);
}

// guarda onde a linha foi gravada, para poder apagar/corrigir depois
function loc_(ssId, sh, row, col, n, ignorar) {
  var snap = sh.getRange(row, col, 1, n).getDisplayValues()[0];
  return { ss: ssId, aba: sh.getName(), linha: row, col: col, n: n, ign: ignorar || [], snap: snap };
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
    var ini = Math.max(2, last - 30);
    var fs = sh.getRange(ini, 6, last - ini + 1, 1).getFormulas();
    for (var i = fs.length - 1; i >= 0; i--) {
      if (fs[i][0]) { sh.getRange(ini + i, 6, 1, 2).copyTo(sh.getRange(row, 6, 1, 2), SpreadsheetApp.CopyPasteType.PASTE_FORMULA, false); break; }
    }
    sh.getRange(last, 1, 1, 9).copyTo(sh.getRange(row, 1, 1, 9), SpreadsheetApp.CopyPasteType.PASTE_FORMAT, false);
  }
  SpreadsheetApp.flush();
  return loc_(IDS.GADO, sh, row, 1, 9, [5, 6]); // ignora saldo (muda sozinho)
}

function gado_(d, u) {
  var m = num_(d.machos), f = num_(d.femeas);
  if (!m && !f && d.qtd) { if (d.sexo === 'F') f = num_(d.qtd); else m = num_(d.qtd); } // formato antigo
  if (!m && !f) throw new Error('Quantidade vazia');
  var obs = up_(d.obs || '') + assina_(u);
  if (d.mov === 'saida') return [linhaGado_(data_(d.data), '', '', m, f, obs, d.fazenda)];
  return [linhaGado_(data_(d.data), m, f, '', '', obs, d.fazenda)];
}

function transf_(d, u) {
  var m = num_(d.machos), f = num_(d.femeas);
  if (!m && !f && d.qtd) { if (d.sexo === 'F') f = num_(d.qtd); else m = num_(d.qtd); }
  if (!m && !f) throw new Error('Quantidade vazia');
  if (d.de === d.para) throw new Error('Origem e destino iguais');
  var dt = data_(d.data), extra = (d.obs ? ' ' + up_(d.obs) : '') + assina_(u);
  return [linhaGado_(dt, '', '', m, f, 'TRANSF. P/ ' + up_(d.para) + extra, d.de),
          linhaGado_(dt, m, f, '', '', 'TRANSF. DA ' + up_(d.de) + extra, d.para)];
}

function morte_(d, u, foto) {
  var q = num_(d.qtd) || 1;
  var m = d.sexo === 'F' ? 0 : q, f = d.sexo === 'F' ? q : 0;
  var link = foto ? salvaFoto_(foto, d) : '';
  var obs = 'MORTE' + (d.pasto ? ' PASTO ' + d.pasto : '') + (d.causa ? ' CAUSA ' + d.causa : '') +
            (d.brinco ? ' NUMERO=' + d.brinco : '') + (d.obs ? ' ' + d.obs : '');
  var locs = [linhaGado_(data_(d.data), '', '', m, f, obs.toUpperCase() + assina_(u), d.fazenda)];
  var sh = sheet_(IDS.GADO, 'MORTES', ['Data', 'Fazenda', 'Sexo', 'Cabeças', 'Brinco', 'Pasto', 'Causa', 'Obs', 'Foto', 'Usuário']);
  sh.appendRow([data_(d.data), d.fazenda || 'Lorenzetti', d.sexo === 'F' ? 'Fêmea' : 'Macho', q, d.brinco || '', d.pasto || '', d.causa || '', d.obs || '', link, u.nome]);
  locs.push(loc_(IDS.GADO, sh, sh.getLastRow(), 1, 10));
  return locs;
}

function salvaFoto_(dataUrl, d) {
  var m = /^data:(image\/\w+);base64,(.*)$/.exec(dataUrl);
  if (!m) return '';
  var pasta = pastaFotos_();
  var nome = (d.data || '') + ' morte ' + (d.brinco || '') + ' ' + (d.pasto || '') + '.jpg';
  var f = pasta.createFile(Utilities.newBlob(Utilities.base64Decode(m[2]), m[1], nome));
  return f.getUrl();
}

function pastaFotos_() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty('PASTA_FOTOS');
  if (id) { try { return DriveApp.getFolderById(id); } catch (e) {} }
  var p = DriveApp.createFolder('App Fazenda - Fotos de mortes');
  props.setProperty('PASTA_FOTOS', p.getId());
  return p;
}

// giro25 > TRATOS: E Data | F Pasto | G Peso | H Tratador
function trato_(d, u) {
  var kg = num_(d.kg);
  if (!kg) throw new Error('Peso vazio');
  var sh = SpreadsheetApp.openById(IDS.GIRO).getSheetByName('TRATOS');
  var row = ultimaLinha_(sh, 5) + 1;
  sh.getRange(row, 5, 1, 4).setValues([[data_(d.data), String(d.pasto).toUpperCase(), kg, d.tratador || u.nome]]);
  if (row > 2) sh.getRange(row - 1, 5, 1, 4).copyTo(sh.getRange(row, 5, 1, 4), SpreadsheetApp.CopyPasteType.PASTE_FORMAT, false);
  return [loc_(IDS.GIRO, sh, row, 5, 4)];
}

// Chuvas > LANÇAMENTOS: Data | mm | Obs
function chuva_(d, u) {
  var sh = SpreadsheetApp.openById(IDS.CHUVA).getSheetByName('LANÇAMENTOS');
  var row = ultimaLinha_(sh, 1) + 1;
  sh.getRange(row, 1, 1, 3).setValues([[data_(d.data), num_(d.mm), (d.obs || '') + assina_(u)]]);
  if (row > 2) sh.getRange(row - 1, 1, 1, 3).copyTo(sh.getRange(row, 1, 1, 3), SpreadsheetApp.CopyPasteType.PASTE_FORMAT, false);
  return [loc_(IDS.CHUVA, sh, row, 1, 3)];
}

// Rotacionado (igual ao app antigo): salva as datas de entrada e o lote de um módulo
// MANEJO > AppDatas: Modulo | Pasto | Entrada (texto aaaa-mm-dd);  AppLotes: Modulo | Categoria | Cabecas | Peso
function manejo_(d, u) {
  var mod = String(d.modulo);
  var ss = SpreadsheetApp.openById(IDS.MANEJO);
  if (d.datas) {
    var sh = ss.getSheetByName('AppDatas');
    var vals = sh.getLastRow() > 1 ? sh.getRange(2, 1, sh.getLastRow() - 1, 3).getDisplayValues() : [];
    var out = vals.filter(function (r) { return r[0] !== '' && String(r[0]) !== mod; });
    Object.keys(d.datas).forEach(function (p) { if (d.datas[p]) out.push([mod, p, d.datas[p]]); });
    if (sh.getLastRow() > 1) sh.getRange(2, 1, sh.getLastRow() - 1, 3).clearContent();
    if (out.length) sh.getRange(2, 1, out.length, 3).setNumberFormat('@').setValues(out);
  }
  if (d.lotes) {
    var sl = ss.getSheetByName('AppLotes');
    var lv = sl.getLastRow() > 1 ? sl.getRange(2, 1, sl.getLastRow() - 1, 4).getValues() : [];
    var lo = lv.filter(function (r) { return r[0] !== '' && String(r[0]) !== mod; });
    d.lotes.forEach(function (l) { if (l.categoria || num_(l.cabecas)) lo.push([mod, l.categoria || '', num_(l.cabecas), num_(l.peso)]); });
    if (sl.getLastRow() > 1) sl.getRange(2, 1, sl.getLastRow() - 1, 4).clearContent();
    if (lo.length) sl.getRange(2, 1, lo.length, 4).setValues(lo);
  }
  var h = sheet_(IDS.MANEJO, 'AppHistorico', ['Data', 'Módulo', 'Pasto', 'Obs', 'Usuário', 'Lançado em']);
  h.appendRow([new Date(), Number(mod), '', 'SALVOU MÓDULO: ' + JSON.stringify({ datas: d.datas, lotes: d.lotes }), u.nome, new Date()]);
  return [];
}

// compatibilidade com a versão 1 (fila antiga)
function mudarPasto_(d, u) {
  var datas = {}; datas[d.pasto] = isoData_(d.data);
  var atual = datasModulo_(d.modulo);
  Object.keys(atual).forEach(function (p) { if (!(p in datas)) datas[p] = atual[p]; });
  return manejo_({ modulo: d.modulo, datas: datas }, u);
}
function lote_(d, u) {
  var lotes = lotesModulo_(d.modulo);
  var i = lotes.map(function (l) { return norm_(l.categoria); }).indexOf(norm_(d.categoria));
  if (d.modo === 'remover') { if (i >= 0) lotes.splice(i, 1); }
  else if (i >= 0) { lotes[i].cabecas = num_(d.cabecas); lotes[i].peso = num_(d.peso); }
  else lotes.push({ categoria: d.categoria, cabecas: num_(d.cabecas), peso: num_(d.peso) });
  return manejo_({ modulo: d.modulo, lotes: lotes }, u);
}

function contagem_(d, u) {
  var sh = sheet_(IDS.GADO, 'CONTAGEM', ['Data', 'Fazenda', 'Local', 'Cabeças', 'Obs', 'Usuário']);
  sh.appendRow([data_(d.data), d.fazenda || '', d.local || '', num_(d.cabecas), d.obs || '', u.nome]);
  return [loc_(IDS.GADO, sh, sh.getLastRow(), 1, 6)];
}

function bebedouro_(d, u) {
  var sh = sheet_(IDS.GADO, 'BEBEDOUROS', ['Data', 'Local', 'Obs', 'Usuário']);
  sh.appendRow([data_(d.data), d.local || '', d.obs || '', u.nome]);
  return [loc_(IDS.GADO, sh, sh.getLastRow(), 1, 4)];
}

function cocho_(d, u) {
  var sh = sheet_(IDS.MANEJO, 'COCHO_SAL', ['Data', 'Módulo', 'Pasto', 'Produto', 'Sacos', 'Kg', 'Obs', 'Usuário']);
  sh.appendRow([data_(d.data), Number(d.modulo) || d.modulo, d.pasto || '', d.produto || '', num_(d.sacos), num_(d.kg), d.obs || '', u.nome]);
  return [loc_(IDS.MANEJO, sh, sh.getLastRow(), 1, 8)];
}

function maquina_(d, u) {
  var sh = sheet_(IDS.GADO, 'MAQ_HISTORICO', ['Data', 'Máquina', 'Tipo', 'Horímetro/Km', 'Litros', 'Descrição', 'Usuário']);
  sh.appendRow([data_(d.data), d.maquina || '', d.tipo || '', num_(d.horimetro), num_(d.litros), d.desc || '', u.nome]);
  return [loc_(IDS.GADO, sh, sh.getLastRow(), 1, 7)];
}

function maqNova_(d, u) {
  var sh = sheet_(IDS.GADO, 'MAQUINAS', ['Máquina', 'Tipo', 'Obs', 'Ativa']);
  var vals = sh.getDataRange().getValues();
  for (var i = 1; i < vals.length; i++) if (norm_(vals[i][0]) === norm_(d.nome)) return [];
  sh.appendRow([d.nome, d.tipo || '', d.obs || '', 'SIM']);
  return [];
}

function salvaRegras_(d, u) {
  if (!u.admin) throw new Error('Só o Hugo muda as regras');
  var sh = regrasSheet_();
  var vals = sh.getRange(2, 1, sh.getLastRow() - 1, 4).getValues();
  vals.forEach(function (r, i) {
    var x = (d.regras || {})[r[0]];
    if (x) sh.getRange(i + 2, 3, 1, 2).setValues([[num_(x.limite), x.ativa ? 'SIM' : 'NÃO']]);
  });
  return [];
}

// Medição de forragem: MANEJO > MEDICOES
var MED_CAB = ['Data', 'Módulo', 'Pasto', 'Área útil (ha)', 'Altura (cm)', 'Densidade (kg MS/ha/cm)', 'Aproveitamento (%)', 'Época', 'Período (dias)',
               'Massa (kg MS/ha)', 'Forragem aproveitável (kg MS)', 'Capacidade (UA)', 'Lotação (UA/ha)', 'Obs', 'Usuário'];
function calcForragem_(d) {
  var area = num_(d.area), alt = num_(d.altura), dens = num_(d.densidade), apr = num_(d.aprov), per = num_(d.periodo);
  var massa = alt * dens, aprov = massa * area * apr / 100;
  var cap = per > 0 ? aprov / (CONSUMO_UA * per) : 0;
  return { massa: massa, aprov: aprov, cap: cap, uaha: area > 0 ? cap / area : 0 };
}
function medicao_(d, u) {
  if (!num_(d.altura)) throw new Error('Altura vazia');
  var c = calcForragem_(d);
  var sh = sheet_(IDS.MANEJO, 'MEDICOES', MED_CAB);
  sh.appendRow([data_(d.data), Number(d.modulo), d.pasto, num_(d.area), num_(d.altura), num_(d.densidade), num_(d.aprov), d.epoca || '', num_(d.periodo),
                Math.round(c.massa), Math.round(c.aprov), Math.round(c.cap * 10) / 10, Math.round(c.uaha * 100) / 100, d.obs || '', u.nome]);
  return [loc_(IDS.MANEJO, sh, sh.getLastRow(), 1, MED_CAB.length)];
}
function lerMedicoes_(ss) {
  var sh = ss.getSheetByName('MEDICOES'), ult = {}, hist = [];
  if (!sh || sh.getLastRow() < 2) return { ult: ult, hist: hist };
  valsData_(sh.getRange(2, 1, sh.getLastRow() - 1, 15), 0).forEach(function (r) {
    if (!isIso_(r[0]) || !r[2]) return;
    var m = { data: r[0], modulo: String(r[1]), pasto: String(r[2]), area: num_(r[3]), altura: num_(r[4]), densidade: num_(r[5]), aprov: num_(r[6]),
              epoca: String(r[7]), periodo: num_(r[8]), massa: num_(r[9]), aprovKg: num_(r[10]), cap: num_(r[11]), uaha: num_(r[12]), user: String(r[14]) };
    hist.push(m);
    var k = m.modulo + '||' + m.pasto;
    if (!ult[k] || ult[k].data <= m.data) ult[k] = m;
  });
  return { ult: ult, hist: hist.slice(-80).reverse() };
}
// capacidade do módulo pela última medição de cada pasto (soma dos pastos medidos)
function capMedida_(mod, med) {
  var cap = 0, n = 0, data = '';
  mod.pastos.forEach(function (p) { var m = med.ult[mod.n + '||' + p[0]]; if (m) { cap += m.cap; n++; if (m.data > data) data = m.data; } });
  return n ? { cap: cap, n: n, data: data } : null;
}

/* ---------------- apagar / corrigir ---------------- */

function acharLog_(id) {
  var log = log_();
  var n = log.getLastRow();
  if (n < 2) return null;
  var ids = log.getRange(2, 1, n - 1, 1).getValues();
  for (var i = ids.length - 1; i >= 0; i--) if (ids[i][0] === id) {
    var r = log.getRange(i + 2, 1, 1, 8).getValues()[0];
    return { log: log, linha: i + 2, tipo: r[1], user: r[2], d: JSON.parse(r[5] || '{}'), locs: JSON.parse(r[6] || '[]'), sit: r[7] };
  }
  return null;
}

function apagar_(id, u) {
  var lock = LockService.getScriptLock(); lock.waitLock(30000);
  try {
    var x = acharLog_(id);
    if (!x) throw new Error('Lançamento não encontrado');
    if (!u.admin && x.user !== u.nome) throw new Error('Só dá para apagar os seus lançamentos');
    if (x.sit !== 'OK') throw new Error('Esse lançamento já foi ' + String(x.sit).toLowerCase());
    if (!x.locs.length) throw new Error('Esse tipo não dá para apagar pelo app (mude direto na tela)');
    limparLocs_(x.locs);
    x.log.getRange(x.linha, 8).setValue('APAGADO por ' + u.nome + ' em ' + Utilities.formatDate(new Date(), TZ, 'dd/MM/yyyy HH:mm'));
    return { ok: true };
  } finally { lock.releaseLock(); }
}

function corrigir_(id, novo, u) {
  var lock = LockService.getScriptLock(); lock.waitLock(30000);
  try {
    var x = acharLog_(id);
    if (!x) throw new Error('Lançamento não encontrado');
    if (!u.admin && x.user !== u.nome) throw new Error('Só dá para corrigir os seus lançamentos');
    if (x.sit !== 'OK') throw new Error('Esse lançamento já foi ' + String(x.sit).toLowerCase());
    if (!x.locs.length) throw new Error('Esse tipo não dá para corrigir pelo app');
    limparLocs_(x.locs);
    var d = novo || x.d;
    var locs = gravar_(x.tipo, d, u, null) || [];
    var novoId = id + '-c' + Date.now().toString(36);
    x.log.getRange(x.linha, 8).setValue('CORRIGIDO por ' + u.nome + ' → ' + novoId);
    x.log.appendRow([novoId, x.tipo, u.nome, '', new Date(), JSON.stringify(d), JSON.stringify(locs), 'OK']);
    return { ok: true, id: novoId };
  } finally { lock.releaseLock(); }
}

function limparLocs_(locs) {
  // confere antes se as linhas ainda são as mesmas
  locs.forEach(function (l) {
    var sh = SpreadsheetApp.openById(l.ss).getSheetByName(l.aba);
    var atual = sh.getRange(l.linha, l.col, 1, l.n).getDisplayValues()[0];
    for (var i = 0; i < l.n; i++) {
      if (l.ign.indexOf(i) >= 0) continue;
      if (String(atual[i]) !== String(l.snap[i])) throw new Error('A linha ' + l.linha + ' da aba ' + l.aba + ' mudou na planilha. Corrija direto na planilha.');
    }
  });
  locs.forEach(function (l) {
    SpreadsheetApp.openById(l.ss).getSheetByName(l.aba).getRange(l.linha, l.col, 1, l.n).clearContent();
  });
}

/* ---------------- leitura para o app ---------------- */

function dados_(u) {
  var hoje = new Date();
  var out = { gerado: hoje.toISOString(), hoje: Utilities.formatDate(hoje, TZ, 'yyyy-MM-dd') };

  // Gado: todos os lançamentos (o app calcula saldo, mês a mês, gráfico)
  var gl = SpreadsheetApp.openById(IDS.GADO);
  LER_TZ = gl.getSpreadsheetTimeZone();
  var lan = valsData_(gl.getSheetByName('Lançamentos').getDataRange(), 0);
  var rows = [];
  for (var i = 1; i < lan.length; i++) {
    var r = lan[i];
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(r[0]))) continue;
    rows.push([r[0], num_(r[1]), num_(r[2]), num_(r[3]), num_(r[4]), String(r[7] || ''), String(r[8] || 'Lorenzetti')]);
  }
  out.gado = { lanc: rows };

  // Semi-confinamento (giro25)
  var giro = SpreadsheetApp.openById(IDS.GIRO);
  LER_TZ = giro.getSpreadsheetTimeZone();
  var gv = giro.getSheetByName('GIRO 25').getRange('A3:N60').getDisplayValues();
  var cab = gv[0], tab = [], semi = [];
  for (var g = 1; g < gv.length; g++) {
    if (!gv[g][0]) continue;
    tab.push(gv[g]);
    semi.push({ pasto: String(gv[g][0]).toUpperCase(), bois: num_(gv[g][2]), peso: num_(gv[g][3]), entrada: isoBr_(gv[g][4]) });
  }
  var painel = giro.getSheetByName('PAINEL').getRange('B4:G26').getDisplayValues();
  var tr = giro.getSheetByName('TRATOS');
  var tn = ultimaLinha_(tr, 5);
  var tv = tn > 1 ? valsData_(tr.getRange(2, 5, tn - 1, 4), 0) : [];
  var ultTrato = {}, recentes = [];
  tv.forEach(function (r) {
    if (!isIso_(r[0]) || !r[1]) return;
    var p = String(r[1]).toUpperCase().trim(), dt = r[0];
    if (!ultTrato[p] || ultTrato[p].data < dt) ultTrato[p] = { data: dt, kg: num_(r[2]) };
  });
  tv.slice(-60).forEach(function (r) { if (isIso_(r[0])) recentes.push({ data: r[0], pasto: String(r[1]), kg: num_(r[2]), quem: String(r[3] || '') }); });
  var lista = tr.getRange('J2:J60').getValues().map(function (r) { return String(r[0]).toUpperCase().trim(); }).filter(String);
  semi.forEach(function (s) { if (s.bois && lista.indexOf(s.pasto) < 0) lista.push(s.pasto); });
  out.semi = { cab: cab, tabela: tab, pastos: semi, painel: painel, ultTrato: ultTrato, recentes: recentes.reverse(), lista: ordenaPastos_(lista) };

  // Rotacionado
  var mj = SpreadsheetApp.openById(IDS.MANEJO);
  LER_TZ = mj.getSpreadsheetTimeZone();
  out.rot = { modulos: MODULES, uaKg: UA_KG, consumo: CONSUMO_UA, areaUtil: AREA_UTIL, datas: lerDatas_(mj), lotes: lerLotes_(mj), med: lerMedicoes_(mj) };
  var cs = mj.getSheetByName('COCHO_SAL');
  var ultCocho = {}, cochoHist = [];
  if (cs && cs.getLastRow() > 1) valsData_(cs.getRange(2, 1, cs.getLastRow() - 1, 6), 0).forEach(function (r) {
    if (!isIso_(r[0])) return;
    var k = String(r[1]); var dt = r[0];
    cochoHist.push({ data: dt, modulo: k, pasto: String(r[2]), produto: String(r[3]), sacos: num_(r[4]), kg: num_(r[5]) });
    if (!ultCocho[k] || ultCocho[k].data < dt) ultCocho[k] = { data: dt, produto: String(r[3]), sacos: num_(r[4]), kg: num_(r[5]) };
  });
  out.ultCocho = ultCocho;
  out.cochoHist = cochoHist.slice(-40).reverse();

  // Chuva
  var chs = SpreadsheetApp.openById(IDS.CHUVA);
  LER_TZ = chs.getSpreadsheetTimeZone();
  var ch = chs.getSheetByName('LANÇAMENTOS');
  var cn = ultimaLinha_(ch, 1);
  var cv = cn > 1 ? valsData_(ch.getRange(2, 1, cn - 1, 2), 0) : [];
  out.chuva = cv.filter(function (r) { return isIso_(r[0]); }).map(function (r) { return [r[0], num_(r[1])]; })
    .sort(function (p, q) { return p[0] < q[0] ? -1 : 1; });

  // Bebedouros, contagens, máquinas, regras, meus lançamentos
  LER_TZ = gl.getSpreadsheetTimeZone();
  out.bebedouros = ultimoPor_(gl.getSheetByName('BEBEDOUROS'), 1, 0, 4);
  out.bebHist = ultimas_(gl.getSheetByName('BEBEDOUROS'), 4, 30).map(function (r) { return { data: iso_(r[0]), local: String(r[1]), user: String(r[3]) }; });
  out.contagens = ultimas_(gl.getSheetByName('CONTAGEM'), 6, 20).map(function (r) { return { data: iso_(r[0]), faz: r[1], local: r[2], cab: num_(r[3]), obs: r[4], user: r[5] }; });
  var mq = gl.getSheetByName('MAQUINAS');
  out.maquinas = mq && mq.getLastRow() > 1 ? mq.getRange(2, 1, mq.getLastRow() - 1, 4).getValues()
    .filter(function (r) { return r[0] && String(r[3]).toUpperCase() !== 'NÃO'; }).map(function (r) { return { nome: String(r[0]), tipo: String(r[1]) }; }) : [];
  out.maqHist = ultimas_(gl.getSheetByName('MAQ_HISTORICO'), 7, 400).map(function (r) {
    return { data: iso_(r[0]), maquina: String(r[1]), tipo: String(r[2]), horimetro: num_(r[3]), litros: num_(r[4]), desc: String(r[5]), user: String(r[6]) };
  });
  out.mortes = ultimas_(gl.getSheetByName('MORTES'), 10, 20).map(function (r) { return { data: iso_(r[0]), faz: r[1], sexo: r[2], cab: num_(r[3]), brinco: r[4], pasto: r[5], causa: r[6], foto: r[8] }; });
  out.regras = lerRegras_();
  out.avisos = avisos_(out);
  out.meus = meus_(u);
  return out;
}

function lerDatas_(ss) {
  var sh = ss.getSheetByName('AppDatas'), o = {};
  if (!sh || sh.getLastRow() < 2) return o;
  sh.getRange(2, 1, sh.getLastRow() - 1, 3).getValues().forEach(function (r) {
    if (r[0] === '' || r[1] === '' || r[2] === '') return;
    o[String(r[0]) + '||' + String(r[1])] = r[2] instanceof Date ? iso_(r[2]) : String(r[2]).slice(0, 10);
  });
  return o;
}
function lerLotes_(ss) {
  var sh = ss.getSheetByName('AppLotes'), o = {};
  if (!sh || sh.getLastRow() < 2) return o;
  sh.getRange(2, 1, sh.getLastRow() - 1, 4).getValues().forEach(function (r) {
    if (r[0] === '') return;
    (o[String(r[0])] = o[String(r[0])] || []).push({ categoria: String(r[1]).trim(), cabecas: num_(r[2]), peso: num_(r[3]) });
  });
  return o;
}
function datasModulo_(mod) {
  var all = lerDatas_(SpreadsheetApp.openById(IDS.MANEJO)), o = {};
  Object.keys(all).forEach(function (k) { var p = k.split('||'); if (p[0] === String(mod)) o[p[1]] = all[k]; });
  return o;
}
function lotesModulo_(mod) { return lerLotes_(SpreadsheetApp.openById(IDS.MANEJO))[String(mod)] || []; }

function meus_(u) {
  var log = log_();
  var n = log.getLastRow();
  if (n < 2) return [];
  var ini = Math.max(2, n - 300);
  var lim = new Date(Date.now() - 7 * 864e5);
  return log.getRange(ini, 1, n - ini + 1, 8).getValues()
    .filter(function (r) { return r[4] instanceof Date && r[4] >= lim && (u.admin || r[2] === u.nome); })
    .map(function (r) { return { id: r[0], tipo: r[1], user: r[2], quando: r[4].toISOString(), d: JSON.parse(r[5] || '{}'), pode: JSON.parse(r[6] || '[]').length > 0, sit: String(r[7] || 'OK') }; })
    .reverse();
}

/* ---------------- regras e avisos ---------------- */

function regrasSheet_() {
  var sh = sheet_(IDS.GADO, 'REGRAS', ['Regra', 'Descrição', 'Limite', 'Ativa']);
  var tem = sh.getLastRow() > 1 ? sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues().map(function (r) { return String(r[0]); }) : [];
  REGRAS_PADRAO.forEach(function (r) { if (tem.indexOf(r[0]) < 0) sh.appendRow(r); });
  sh.getRange('A:A').setNumberFormat('@');
  return sh;
}
function lerRegras_() {
  var o = {};
  regrasSheet_().getDataRange().getValues().slice(1).forEach(function (r) {
    if (r[0]) o[r[0]] = { desc: String(r[1]), limite: num_(r[2]), ativa: String(r[3]).toUpperCase() === 'SIM' };
  });
  return o;
}

function diasEntre_(iso, hojeIso) {
  if (!iso) return null;
  var a = iso.split('-'), b = hojeIso.split('-');
  return Math.round((Date.UTC(+b[0], b[1] - 1, +b[2]) - Date.UTC(+a[0], a[1] - 1, +a[2])) / 864e5);
}
function somaDias_(iso, n) {
  var a = iso.split('-'); var d = new Date(Date.UTC(+a[0], a[1] - 1, +a[2] + n));
  return d.toISOString().slice(0, 10);
}

// mesma conta do app de manejo antigo
function calcModulo_(mod, datas, lotes, hoje, med) {
  var cm = med ? capMedida_(mod, med) : null;
  mod = { n: mod.n, area: mod.area, cap: cm ? cm.cap : mod.cap, pastos: mod.pastos };
  var lote = lotes[String(mod.n)] || [], ua = 0, cab = 0, somaPeso = 0;
  lote.forEach(function (l) { ua += l.cabecas * l.peso / UA_KG; cab += l.cabecas; somaPeso += l.cabecas * l.peso; });
  var pesoMedio = cab > 0 ? somaPeso / cab : 280;
  var status = 'semlote';
  if (cab > 0) status = ua > mod.cap + 0.5 ? 'acima' : (ua < mod.cap * 0.85 ? 'aumentar' : 'ok');
  var difCab = Math.round((mod.cap - ua) / (pesoMedio / UA_KG));
  var ps = mod.pastos.map(function (p) { return { nome: p[0], dias: p[1], entrada: '', saida: '' }; });
  for (var i = 0; i < ps.length; i++) {
    var ent = datas[mod.n + '||' + ps[i].nome] || '';
    if (!ent && i > 0 && ps[i - 1].saida) ent = ps[i - 1].saida;
    ps[i].entrada = ent; ps[i].saida = ent ? somaDias_(ent, ps[i].dias) : '';
  }
  var at = -1;
  for (var j = 0; j < ps.length; j++) if (ps[j].entrada && ps[j].entrada <= hoje) at = j;
  var atrasado = at >= 0 && hoje > ps[at].saida;
  return { ua: ua, cab: cab, status: status, difCab: difCab, pastos: ps, atual: at >= 0 ? ps[at] : null, atrasado: atrasado,
           diasAtraso: atrasado ? diasEntre_(ps[at].saida, hoje) : 0, faltam: at >= 0 && !atrasado ? diasEntre_(hoje, ps[at].saida) : null };
}

function avisos_(D) {
  var R = D.regras, hoje = D.hoje, av = [];
  var on = function (k) { return R[k] && R[k].ativa; }, lim = function (k) { return R[k] ? R[k].limite : 0; };
  if (on('semi_sem_trato')) D.semi.pastos.forEach(function (p) {
    if (!p.bois) return;
    var u = D.semi.ultTrato[p.pasto], d = u ? diasEntre_(u.data, hoje) : null;
    if (d === null || d >= lim('semi_sem_trato')) av.push({ k: 'trato', t: 'Pasto ' + p.pasto + ' (' + p.bois + ' bois) sem trato há ' + (d === null ? 'muitos' : d) + ' dias' });
  });
  D.rot.modulos.forEach(function (m) {
    var c = calcModulo_(m, D.rot.datas, D.rot.lotes, hoje, D.rot.med);
    if (!c.cab) return;
    if (on('rot_passou') && c.atrasado && c.diasAtraso >= lim('rot_passou'))
      av.push({ k: 'rot', t: 'Módulo ' + m.n + ': passou da retirada do ' + c.atual.nome + ' (venceu ' + br_(c.atual.saida) + ', ' + c.diasAtraso + ' d)' });
    else if (on('rot_antes') && c.atual && c.faltam !== null && c.faltam <= lim('rot_antes'))
      av.push({ k: 'rot', t: 'Módulo ' + m.n + ': tirar do ' + c.atual.nome + ' ' + (c.faltam === 0 ? 'hoje' : 'em ' + c.faltam + ' dia(s)') + ' (' + br_(c.atual.saida) + ')' });
    if (on('rot_lotacao') && c.status === 'acima')
      av.push({ k: 'rot', t: 'Módulo ' + m.n + ': lotação acima (' + Math.round(c.ua) + '/' + Math.round(m.cap) + ' UA · tirar ~' + Math.abs(c.difCab) + ' cab)' });
  });
  if (on('medicao')) D.rot.modulos.forEach(function (m) {
    if (!(D.rot.lotes[String(m.n)] || []).length) return;
    var cm = capMedida_(m, D.rot.med), d = cm ? diasEntre_(cm.data, hoje) : null;
    if (d === null || d >= lim('medicao')) av.push({ k: 'rot', t: 'Módulo ' + m.n + ': ' + (d === null ? 'sem medição de forragem' : 'última medição de forragem há ' + d + ' dias') });
  });
  if (on('sem_chuva')) {
    var ult = D.chuva.filter(function (c) { return c[1] > 0; }).slice(-1)[0];
    var dc = ult ? diasEntre_(ult[0], hoje) : null;
    if (dc !== null && dc >= lim('sem_chuva')) av.push({ k: 'chuva', t: dc + ' dias sem chuva (última: ' + br_(ult[0]) + ')' });
  }
  if (on('bebedouro')) Object.keys(D.bebedouros).forEach(function (l) {
    var d = diasEntre_(D.bebedouros[l].data, hoje);
    if (d >= lim('bebedouro')) av.push({ k: 'beb', t: 'Bebedouro ' + l + ' sem lavar há ' + d + ' dias' });
  });
  if (on('cocho')) D.rot.modulos.forEach(function (m) {
    if (!(D.rot.lotes[String(m.n)] || []).length) return;
    var u = D.ultCocho[String(m.n)];
    if (!u) return;
    var d = diasEntre_(u.data, hoje);
    if (d >= lim('cocho')) av.push({ k: 'cocho', t: 'Cocho do módulo ' + m.n + ' sem abastecer há ' + d + ' dias' });
  });
  if (on('maquina')) D.maquinas.forEach(function (m) {
    var h = D.maqHist.filter(function (x) { return x.maquina === m.nome; })[0];
    var d = h ? diasEntre_(h.data, hoje) : null;
    if (d !== null && d >= lim('maquina')) av.push({ k: 'maq', t: m.nome + ' sem lançamento há ' + d + ' dias' });
  });
  return av;
}

/* ---------------- Telegram ---------------- */

function configurarTelegram() {
  var props = PropertiesService.getScriptProperties();
  var token = props.getProperty('TELEGRAM_TOKEN');
  if (!token) throw new Error('Falta TELEGRAM_TOKEN nas Propriedades do script');
  var r = JSON.parse(UrlFetchApp.fetch('https://api.telegram.org/bot' + token + '/getUpdates', { muteHttpExceptions: true }).getContentText());
  var chat = null;
  (r.result || []).forEach(function (u) {
    var m = u.message || u.my_chat_member || u.channel_post;
    if (m && m.chat && (m.chat.type === 'group' || m.chat.type === 'supergroup')) chat = m.chat;
  });
  if (!chat) throw new Error('Não achei o grupo. Ponha o bot no grupo e mande uma mensagem lá, depois rode de novo.');
  props.setProperty('TELEGRAM_CHAT', String(chat.id));
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'enviarAvisos') ScriptApp.deleteTrigger(t); });
  [6, 12, 18].forEach(function (h) { ScriptApp.newTrigger('enviarAvisos').timeBased().atHour(h).everyDays(1).inTimezone(TZ).create(); });
  telegram_('✅ Avisos da Fazenda Lorenzetti ligados neste grupo (' + chat.title + '). Conferência às 6h, 12h e 18h.');
  Logger.log('Grupo: ' + chat.title + ' (' + chat.id + ')');
}

function enviarAvisos() {
  var D = dados_({ id: 'robo', nome: 'Robô', admin: true });
  var av = D.avisos;
  var hora = Utilities.formatDate(new Date(), TZ, 'dd/MM HH:mm');
  if (!av.length) { telegram_('🟢 ' + hora + ' — Fazenda sem pendências.'); return; }
  var ic = { trato: '🌾', rot: '🔄', chuva: '⛈️', beb: '💧', cocho: '🧂', maq: '🚜' };
  telegram_('⚠️ Avisos da fazenda — ' + hora + '\n\n' + av.map(function (a) { return (ic[a.k] || '•') + ' ' + a.t; }).join('\n'));
}

function telegram_(texto) {
  var props = PropertiesService.getScriptProperties();
  var token = props.getProperty('TELEGRAM_TOKEN'), chat = props.getProperty('TELEGRAM_CHAT');
  if (!token || !chat) return;
  UrlFetchApp.fetch('https://api.telegram.org/bot' + token + '/sendMessage', {
    method: 'post', contentType: 'application/json', muteHttpExceptions: true,
    payload: JSON.stringify({ chat_id: chat, text: texto.slice(0, 4000) })
  });
}

/* ---------------- utilidades ---------------- */

// lê valores trocando a coluna de data pelo texto que aparece na planilha (evita erro de fuso)
function valsData_(rng, colData) {
  var v = rng.getValues(), d = rng.getDisplayValues();
  v.forEach(function (r, i) { if (r[colData] instanceof Date) r[colData] = isoBr_(d[i][colData]); });
  return v;
}


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
  var ini = Math.max(2, sh.getLastRow() - qtd + 1);
  return valsData_(sh.getRange(ini, 1, sh.getLastRow() - ini + 1, ncol), 0).filter(function (r) { return r[0] !== ''; }).reverse();
}

function ultimoPor_(sh, keyCol, dateCol, ncol) {
  var o = {};
  if (!sh || sh.getLastRow() < 2) return o;
  valsData_(sh.getRange(2, 1, sh.getLastRow() - 1, ncol), dateCol).forEach(function (r) {
    if (!isIso_(r[dateCol])) return;
    var k = String(r[keyCol]); var dt = iso_(r[dateCol]);
    if (k && (!o[k] || o[k].data < dt)) o[k] = { data: dt, obs: String(r[2] || ''), user: String(r[3] || '') };
  });
  return o;
}

function ordenaPastos_(l) {
  var u = [];
  l.forEach(function (p) { if (p && u.indexOf(p) < 0) u.push(p); });
  return u.sort(function (a, b) {
    var na = parseInt(a, 10), nb = parseInt(b, 10);
    var ka = isNaN(na) ? (/^S\d/.test(a) ? 2000 + parseInt(a.slice(1), 10) : 3000) : na * 10 + (a.length > String(na).length ? 1 : 0);
    var kb = isNaN(nb) ? (/^S\d/.test(b) ? 2000 + parseInt(b.slice(1), 10) : 3000) : nb * 10 + (b.length > String(nb).length ? 1 : 0);
    return ka - kb || (a < b ? -1 : 1);
  });
}

function data_(s) {
  if (!s) return new Date();
  var p = String(s).split('-');
  return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]), 12, 0, 0);
}
function isoData_(s) { return Utilities.formatDate(data_(s), TZ, 'yyyy-MM-dd'); }
function iso_(d) {
  if (d instanceof Date) return Utilities.formatDate(d, LER_TZ, 'yyyy-MM-dd'); // fuso da planilha que está sendo lida
  return isoBr_(d);
}
function isIso_(s) { return /^\d{4}-\d{2}-\d{2}$/.test(String(s)); }
function isoBr_(s) {
  var m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(String(s || ''));
  return m ? m[3] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[1]).slice(-2) : String(s || '');
}
function br_(iso) { var p = String(iso || '').split('-'); return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : iso; }
function num_(x) {
  if (typeof x === 'number') return x;
  var s = String(x || '').trim();
  if (!s) return 0;
  if (s.indexOf(',') >= 0) s = s.replace(/\./g, '').replace(',', '.');
  else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
  var n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}
function norm_(s) { return String(s || '').toUpperCase().trim(); }
function up_(s) { return String(s || '').toUpperCase(); }
function assina_(u) { return ' [APP ' + u.nome.toUpperCase() + ']'; }

/* Testes manuais no editor */
function testeDados() { var d = dados_({ id: 'hugo', nome: 'Hugo', admin: true }); Logger.log(JSON.stringify(d).length + ' bytes; avisos: ' + JSON.stringify(d.avisos)); }
function autorizar() { DriveApp.getRootFolder(); UrlFetchApp.fetch('https://api.telegram.org'); ScriptApp.getProjectTriggers(); }
