import 'dotenv/config';
import fs from 'fs';
import { ethers } from 'ethers';

//
// ==============================
// Giwa (reformatado - UX friendly)
// ==============================
// Mantive toda a lógica original intacta — apenas melhorei a apresentação no console,
// adicionei uma separação visual entre "Agendado" e o primeiro "Iniciando" e
// unifiquei o sistema de log para escrita em out/activity.log.
//

// Banner original (mantive)
const BANNER = `
 _________________________________________________________________
|                                                                 |
|                                                                 |
|                 Desmistificador de Crypto                       | 
|                                                                 |
|                                                                 | 
|_________________________________________________________________|
|                                                                 | 
| Youtube: https://www.youtube.com/@desmistificadordecrypto       |
| Twitter: https://x.com/desm_de_crypto                           |
| Canal do Telegram: https://t.me/Desmistificador_de_crypto       | 
| Grupo do Telegram: https://t.me/+EK-001T9G6E1ZTQ5               |
|_________________________________________________________________|`;
console.log(BANNER);
console.log();
console.log();

//
// Environment variables
//
const {
  RPC_GIWA,
  PRIVATE_KEY,
  OWLTO_ORIGINAL_TX,
  ONCHAIN_GM_FACTORY,
  ONCHAIN_GM_METHOD = 'deploy',
  GM_ORIGINAL_TX,
  BRIDGE_RPC,
  BRIDGE_PROXY,
  ONCHAIN_GM_VALUE,
  ONCHAIN_GM_SAMPLE_TX,
  MIN_DELAY_MS = '3600000',
  MAX_DELAY_MS = '10800000'
} = process.env;

if (!RPC_GIWA || !PRIVATE_KEY) {
  console.error('❌ Defina RPC_GIWA e PRIVATE_KEY no .env');
  process.exit(1);
}

const DRY = (process.env.DRY_RUN === '1');

const provider = new ethers.JsonRpcProvider(RPC_GIWA);
const wallet   = new ethers.Wallet(PRIVATE_KEY, provider);

fs.mkdirSync('out', { recursive: true });
const ACTIVITY_LOG = 'out/activity.log';

//
// Date formatters
//
function formatarDataBR(date = new Date()) {
  const d = date;
  const dia = String(d.getDate()).padStart(2, '0');
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const ano = d.getFullYear();
  const hora = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${dia}/${mes}/${ano} às ${hora}:${min}`;
}
function formatarDataHoraBR(date = new Date()) {
  const d = date;
  const dia = String(d.getDate()).padStart(2, '0');
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const ano = d.getFullYear();
  const hora = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  const seg = String(d.getSeconds()).padStart(2, '0');
  return `${dia}/${mes}/${ano} às ${hora}:${min}:${seg}`;
}

//
// Disk helpers (mantive)
//
function listOutFilesSorted() {
  try {
    const files = fs.readdirSync('out').map(f => {
      const st = fs.statSync(`out/${f}`);
      return { name: f, mtime: st.mtimeMs, size: st.size };
    });
    return files.sort((a,b) => a.mtime - b.mtime);
  } catch (e) {
    return [];
  }
}

function appendLogLineSafe(line) {
  try {
    const prefix = formatarDataBR();
    fs.appendFileSync(ACTIVITY_LOG, `(${prefix}) ${line}\n`);
  } catch (err) {
    if (err && err.code === 'ENOSPC') {
      console.error('ENOSPC ao gravar activity.log — limpando arquivos antigos em out/ e tentando novamente...');
      try {
        const files = listOutFilesSorted();
        for (let i = 0; i < Math.min(10, files.length); i++) {
          try { fs.unlinkSync(`out/${files[i].name}`); } catch(e) {}
        }
        const prefix = formatarDataBR();
        fs.appendFileSync(ACTIVITY_LOG, `(${prefix}) ${line}\n`);
        console.log('Gravação de activity.log sucedida após limpeza.');
      } catch (e2) {
        console.error('Falha ao gravar activity.log após limpeza:', e2.message || e2);
      }
    } else {
      console.error('Erro ao gravar activity.log:', err?.message || err);
    }
  }
}

function safeWriteJSON(path, obj) {
  try {
    const txt = JSON.stringify(obj, (_k,v) => (typeof v === 'bigint' ? v.toString() : v), 2);
    fs.writeFileSync(path, txt);
    return true;
  } catch (err) {
    if (err && err.code === 'ENOSPC') {
      appendLogLineSafe('ENOSPC ao gravar ' + path + ' — tentando liberar espaço (removendo arquivos antigos em out/)');
      const files = listOutFilesSorted();
      for (let i = 0; i < Math.min(10, files.length); i++) {
        try { fs.unlinkSync(`out/${files[i].name}`); appendLogLineSafe('Removido arquivo antigo: ' + files[i].name); } catch(e) {}
      }
      try {
        const txt = JSON.stringify(obj, (_k,v) => (typeof v === 'bigint' ? v.toString() : v), 2);
        fs.writeFileSync(path, txt);
        appendLogLineSafe('Gravação sucedida após limpeza: ' + path);
        return true;
      } catch (e2) {
        appendLogLineSafe('Ainda falhou ao gravar ' + path + ' após tentativa de limpeza: ' + (e2.message || e2));
        return false;
      }
    } else {
      appendLogLineSafe('Erro ao gravar ' + path + ': ' + (err.message || err));
      return false;
    }
  }
}

//
// small utils
//
const sleep = ms => new Promise(r => setTimeout(r, ms));
const randIn = (a,b) => Math.random()*(b-a)+a;
const nowIso = () => new Date().toISOString();


// -----------------------------
// Terminal compatibility helpers
// -----------------------------
const IS_WINDOWS = process.platform === 'win32';
const TTY = !!process.stdout && !!process.stdout.isTTY;
const NO_COLOR = !!process.env.NO_COLOR;
const FORCE_EMOJI = process.env.FORCE_EMOJI === '1';
const FORCE_ASCII = process.env.ASCII === '1';

// Decide if we will use emojis and ANSI colors
const useEmoji = FORCE_EMOJI ? true : (FORCE_ASCII ? false : (!IS_WINDOWS));
const useColor = !NO_COLOR && TTY;

// Lightweight color wrapper (no dependency)
const c = {
  gray: s => useColor ? `\x1b[90m${s}\x1b[0m` : s,
  green: s => useColor ? `\x1b[32m${s}\x1b[0m` : s,
  yellow: s => useColor ? `\x1b[33m${s}\x1b[0m` : s,
  cyan: s => useColor ? `\x1b[36m${s}\x1b[0m` : s,
  red: s => useColor ? `\x1b[31m${s}\x1b[0m` : s,
  bold: s => useColor ? `\x1b[1m${s}\x1b[0m` : s
};

// Icons: emoji fallback to ASCII for Windows/Anaconda
const iconsEmoji = { info: '💬', start: '⚙️', done: '✅', warn: '⚠️', error: '❌', schedule: '🕒' };
const iconsAscii = { info: '[INFO]', start: '[START]', done: '[OK]', warn: '[WARN]', error: '[ERR]', schedule: '[SCHED]' };
const ICONS = useEmoji ? iconsEmoji : iconsAscii;

// Global separator flag: imprime apenas UMA linha entre a lista de agendamentos e o primeiro iniciar
let printedStartSeparator = false;

// Unified logging function (console + activity.log)
// - mantém gravação no arquivo sem códigos de cor
function logRawStringForFile(s) { appendLogLineSafe(s); }

function log(...args) {
  // last arg can be type
  let type = 'info';
  if (args.length >= 2 && typeof args[args.length-1] === 'string' && ['start','done','warn','error','schedule','info'].includes(args[args.length-1])) {
    type = args.pop();
  }

  const s = args.map(a => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ');
  const prefix = formatarDataHoraBR();
  let icon = ICONS.info;
  let msgColored = s;

  switch (type) {
    case 'start': icon = ICONS.start; msgColored = c.cyan(s); break;
    case 'done':  icon = ICONS.done;  msgColored = c.green(s); break;
    case 'warn':  icon = ICONS.warn;  msgColored = c.yellow(s); break;
    case 'error': icon = ICONS.error; msgColored = c.red(s); break;
    case 'schedule': icon = ICONS.schedule; msgColored = c.gray(s); break;
    default: icon = ICONS.info;
  }

  // Build console line (timestamp + icon + message)
  const lineConsole = `(${prefix}) ${icon} ${msgColored}`;

  // For very narrow consoles we avoid long lines — basic wrap if > 160 chars
  if (TTY && process.stdout.columns && process.stdout.columns < 100) {
    // simple shorten for readability
    const max = Math.max(40, process.stdout.columns - 20);
    if (lineConsole.length > max) {
      const head = lineConsole.slice(0, max - 3);
      console.log(head + '...');
    } else console.log(lineConsole);
  } else {
    console.log(lineConsole);
  }

  // Write raw line to activity log (without color codes)
  logRawStringForFile(`${icon} ${s}`);
}

//
// Scheduling (única definição, com separator controlado)
//
function scheduleAt(date, fn, label) {
  const delay = date.getTime() - Date.now();
  const whenStr = formatarDataHoraBR(date);
  if (delay <= 0) {
    log(`${label} — horário já passou (${whenStr})`, 'warn');
    return;
  }

  log(`Agendado: ${label} -> transação ocorrerá dia ${whenStr} - Aguardando horário`, 'schedule');

  setTimeout(async () => {
    // imprime apenas uma vez (antes do primeiro Iniciando) desde o último reset
    if (!printedStartSeparator) {
      console.log(); // linha em branco
      console.log('────────────────────────────────────────────────────────────');
      printedStartSeparator = true;
    }

    log(`Iniciando: ${label}`, 'start');
    try {
      await fn();
      log(`Concluído: ${label}`, 'done');
    } catch (err) {
      log(`Erro em ${label}: ${err?.message || err}`, 'error');
      appendLogLineSafe(`ERROR ${label}: ${err?.stack || err}`);
    }
    console.log(); // pequeno espaçamento depois de cada execução
  }, delay);
}

function todayAt(h,m=0,s=0){ const d=new Date(); d.setHours(h,m,s,0); return d; }
function randomTimes(count, { startHour = 9, endHour = 22, minGapMin = 45 } = {}) {
  const slots = [];
  for (let i=0; i<1000 && slots.length < count; i++) {
    const h = startHour + Math.floor(Math.random() * (endHour - startHour));
    const m = Math.floor(Math.random() * 60);
    const d = todayAt(h,m,0);
    if (d.getTime() <= Date.now() + 30_000) continue;
    if (slots.every(x => Math.abs(x.getTime() - d.getTime()) >= minGapMin*60*1000)) slots.push(d);
  }
  return slots.sort((a,b)=>a-b);
}

//
// Fee helpers / nonce lock (mantive lógica)
//
function bumpFee(bn) { 
  if (typeof bn === 'number') bn = BigInt(Math.floor(bn));
  return (BigInt(bn) * 12n) / 10n;
}

let nonceLockPromise = Promise.resolve();
async function withNonceLock(fn) {
  let release;
  const p = new Promise(r => release = r);
  const prev = nonceLockPromise;
  nonceLockPromise = p;
  try {
    await prev;
    return await fn();
  } finally {
    release();
  }
}

//
// Bridge contract (corrigido BR_RPC / BR_PROXY)
//
const BR_RPC_FINAL = BRIDGE_RPC || 'https://ethereum-sepolia.publicnode.com';
const BR_PROXY_FINAL = BRIDGE_PROXY || '0x956962C34687A954e611A83619ABaA37Ce6bC78A';

const BRIDGE_ABI = ['function depositTransaction(address _to, uint256 _value, uint64 _gasLimit, bool _isCreation, bytes _data) payable'];
const bridgeProvider = new ethers.JsonRpcProvider(BR_RPC_FINAL);
const bridgeWallet   = new ethers.Wallet(PRIVATE_KEY, bridgeProvider);
const bridgeContract = new ethers.Contract(BR_PROXY_FINAL, BRIDGE_ABI, bridgeWallet);

// simulateCall helper (mantive)
async function simulateCall(txRequest) {
  try {
    await provider.call(txRequest);
    return { ok: true, reason: null };
  } catch (err) {
    const reason = err?.reason || err?.error?.message || err?.message || '';
    return { ok: false, reason };
  }
}

// simulateCallNoRevert used for binary search (keeps pattern)
async function simulateCallNoRevert(txRequest, valueToTry) {
  const callTx = { to: txRequest.to, data: txRequest.data, from: txRequest.from, value: valueToTry };
  try {
    await provider.call(callTx);
    return { ok: true, reason: null };
  } catch (err) {
    const reason = err?.reason || err?.error?.message || err?.message || '';
    return { ok: false, reason };
  }
}

//
// Helper: tenta descobrir value mínimo aceito pelo bridge via binary search
// Retorna BigInt (wei) ou 0n se não encontrado.
// maxSearchEth: número em ETH (string) ex '0.01' — teto da busca
//
async function findValueForBridgeByBinarySearch({ iface, fnName, toAddr, txFrom, maxSearchEth = '0.01', searchIters = 20 }) {
  // montaremos chamadas provider.call variando 'value'
  const maxSearchWei = ethers.parseEther(maxSearchEth); // BigInt
  const txTemplate = (valueToTry) => {
    const encoded = iface.encodeFunctionData(fnName, [toAddr, valueToTry, 100000n, false, '0x']);
    return { to: BR_PROXY_FINAL, data: encoded, from: txFrom };
  };

  // primeiro teste no teto
  const testHigh = await simulateCallNoRevert(txTemplate(maxSearchWei), maxSearchWei);
  if (!testHigh.ok) {
    const r = (testHigh.reason || '').toLowerCase();
    if (r.includes('insufficient')) {
      // até o teto reverte por insuficiente: precisamos ampliar teto (tentativa rápida de escalar)
      // vamos tentar tetos maiores progressivamente (até 1 ETH) — cuidado para não exagerar.
      const largerTMAX = [ethers.parseEther('0.05'), ethers.parseEther('0.1'), ethers.parseEther('1')];
      let passed = false;
      for (const t of largerTMAX) {
        const test = await simulateCallNoRevert(txTemplate(t), t);
        if (test.ok) { passed = true; break; }
      }
      if (!passed) {
        // não conseguimos passar mesmo aumentando teto: aborta busca
        return 0n;
      }
    } else {
      // reverte por outro motivo (não insuficiente) — não podemos descobrir value desta forma
      return 0n;
    }
  }

  // binary search between 0 e maxSearchWei
  let low = 0n;
  let high = maxSearchWei;
  let found = 0n;

  for (let i = 0; i < searchIters; i++) {
    const mid = (low + high) / 2n;
    const sim = await simulateCallNoRevert(txTemplate(mid), mid);
    if (sim.ok) {
      found = mid;
      if (mid === 0n) break;
      // podemos tentar valores menores
      high = mid - 1n;
    } else {
      const reason = (sim.reason || '').toLowerCase();
      if (reason.includes('insufficient')) {
        // mid é pequeno demais -> subir
        low = mid + 1n;
      } else {
        // outro motivo de revert — aborta
        return 0n;
      }
    }
    if (low > high) break;
  }

  if (found === 0n && low <= high) {
    // fallback: se binary não achou, tenta high one last time
    const sim = await simulateCallNoRevert(txTemplate(high), high);
    if (sim.ok) found = high;
  }

  return found;
}

//
// doBridgeOnce() — versão reforçada com estimateGas, simulação, checagem de saldo e busca automática de value
//
async function doBridgeOnce() {
  // 80%: 0.00001 - 0.00009 ETH, 20%: 0.001 - 0.009 ETH
  let v = Math.random() < 0.8
    ? randIn(0.00001, 0.00009)
    : randIn(0.001, 0.009);
  let valueEth = Number(v.toFixed(8));
  let valueWei = ethers.parseEther(String(valueEth));
  log(`Bridge: valor inicial (aleatório) ${valueEth} ETH`);

  if (DRY) {
    log('[DRY_RUN] Bridge não será enviada (modo dry-run).');
    return;
  }

  // parâmetros
  const iface = bridgeContract.interface;
  const fnName = 'depositTransaction';
  // candidates de gas para fallback
  const gasFallbacks = [100000n, 200000n, 400000n, 800000n];

  // 1) Estimar gas via estimateGas (primeira tentativa)
  let gasEstimate = null;
  try {
    gasEstimate = await bridgeContract.estimateGas.depositTransaction(
      bridgeWallet.address,
      valueWei,
      100000n,
      false,
      '0x',
      { value: valueWei }
    );
    log('estimateGas result:', gasEstimate.toString());
  } catch (e) {
    log('estimateGas falhou (pode ser normal se contrato reverte em view): ' + (e?.message || e), 'warn');
    gasEstimate = null;
  }

  // 2) Se estimateGas disponível, aplique margem; caso contrário, use fallback
  let chosenGas = gasEstimate ? BigInt(gasEstimate.toString()) : null;
  if (chosenGas) {
    // margem 1.3x (aproximada)
    chosenGas = BigInt(Math.floor(Number(chosenGas) * 1.3));
    log('chosenGas após margem:', chosenGas.toString());
  }

  // Função que monta txRequest (encoded) para simulate / call (usa gasLimit no encode argument)
  function buildTxReq(gasLimit, valueToUseWei) {
    const encoded = iface.encodeFunctionData(fnName, [bridgeWallet.address, valueToUseWei, gasLimit ?? 100000n, false, '0x']);
    const txReq = {
      to: BR_PROXY_FINAL,
      data: encoded,
      from: bridgeWallet.address,
      value: valueToUseWei,
      ...(gasLimit ? { gasLimit: gasLimit } : {})
    };
    return txReq;
  }

  // 3) Checar saldo suficiente (value + gasPrice * gasEstimate)
  const walletBal = await bridgeProvider.getBalance(bridgeWallet.address);
  log('Bridge wallet saldo:', ethers.formatEther(walletBal), 'ETH');

  // pegar fee estimada do provider para cálculo conservador
  const feeData = await bridgeProvider.getFeeData();
  const gasPrice = feeData.maxFeePerGas ?? feeData.gasPrice ?? ethers.parseGwei('1');
  log('gasPrice usado (est):', gasPrice?.toString?.() || String(gasPrice));

  // se temos chosenGas -> verifique balance
  if (chosenGas) {
    const needed = valueWei + chosenGas * BigInt(gasPrice.toString ? gasPrice.toString() : gasPrice);
    if (BigInt(walletBal) < BigInt(needed)) {
      log('Saldo insuficiente no bridgeWallet para cobrir value + gas. Abortando.', 'warn');
      safeWriteJSON(`out/bridge-error-insufficient-balance-${Date.now()}.json`, { when: nowIso(), walletBal: ethers.formatEther(walletBal), needed: String(needed), valueEth });
      return;
    }
  }

  // 4) Simulação com provider.call
  let simOk = false;
  let simReason = null;

  // primeira tentativa: se chosenGas existe, use ele; senão use gasFallbacks
  const simGasCandidates = chosenGas ? [chosenGas, ...gasFallbacks] : gasFallbacks;

  for (const g of simGasCandidates) {
    try {
      const txReq = buildTxReq(g, valueWei);
      const sim = await simulateCall(txReq);
      if (sim.ok) {
        simOk = true;
        chosenGas = BigInt(g);
        log(`Simulação ok com gas ${String(g)}`);
        break;
      } else {
        simReason = sim.reason || '(sem razão)';
        const low = (simReason || '').toLowerCase().includes('insufficient');
        if (low) {
          log(`Simulação reverteu por "insufficient" com gas ${String(g)}: ${simReason}`, 'warn');
          // AQUI: tentamos descoberta automática do mínimo (binary search)
          try {
            log('Tentando descobrir value mínimo aceito pelo bridge via binary search (isto pode demorar)...');
            const discovered = await findValueForBridgeByBinarySearch({
              iface,
              fnName,
              toAddr: bridgeWallet.address,
              txFrom: bridgeWallet.address,
              maxSearchEth: '0.02', // teto inicial para busca (ajustável)
              searchIters: 24
            });
            if (discovered && discovered > 0n) {
              // encontramos um value — usamos ele e continuamos
              valueWei = discovered;
              valueEth = Number(ethers.formatEther(valueWei));
              log(`Value descoberto: ${ethers.formatEther(valueWei)} ETH — continuando fluxo com esse value.`);
              safeWriteJSON(`out/bridge-discovered-value-${Date.now()}.json`, { when: nowIso(), discoveredWei: String(valueWei), discoveredEth: ethers.formatEther(valueWei) });
              // refazer estimateGas usando novo value
              try {
                const est = await bridgeContract.estimateGas.depositTransaction(
                  bridgeWallet.address,
                  valueWei,
                  100000n,
                  false,
                  '0x',
                  { value: valueWei }
                );
                chosenGas = BigInt(Math.floor(Number(est.toString()) * 1.3));
                log('estimateGas (após descoberta) result:', est.toString(), '-> chosenGas:', String(chosenGas));
              } catch (e2) {
                log('estimateGas após descoberta falhou (prosseguindo com fallback de gas)', 'warn');
                chosenGas = chosenGas || gasFallbacks[0];
              }
              simOk = true;
              break; // sair do loop de simulação e seguir envio
            } else {
              log('Não foi possível descobrir um value válido automaticamente via binary search.', 'warn');
              safeWriteJSON(`out/bridge-discovered-value-failed-${Date.now()}.json`, { when: nowIso(), reason: simReason });
              return; // aborta para evitar envios que revertam
            }
          } catch (errSearch) {
            log('Erro durante binary search do bridge: ' + (errSearch?.message || errSearch), 'error');
            safeWriteJSON(`out/bridge-discover-exc-${Date.now()}.json`, { when: nowIso(), exc: errSearch?.message || errSearch });
            return;
          }
        } else {
          log(`Simulação reverteu com gas ${String(g)}: ${simReason}`, 'warn');
          // tentar próxima margem de gas
        }
      }
    } catch (e) {
      log('Erro na simulateCall:', (e?.message || e), 'warn');
    }
  }

  if (!simOk) {
    log('Todas as simulações falharam — abortando envio para evitar revert on-chain.', 'error');
    safeWriteJSON(`out/bridge-sim-allfail-${Date.now()}.json`, { when: nowIso(), reason: simReason, valueEth });
    return;
  }

  // 5) Última checagem de saldo com chosenGas e gasPrice atual
  const requiredTotal = valueWei + chosenGas * BigInt(gasPrice.toString ? gasPrice.toString() : gasPrice);
  const balNow = await bridgeProvider.getBalance(bridgeWallet.address);
  if (BigInt(balNow) < requiredTotal) {
    log('Saldo insuficiente antes do envio (após simulação). Abortando.', 'warn');
    safeWriteJSON(`out/bridge-error-insufficient-balance2-${Date.now()}.json`, { when: nowIso(), walletBal: ethers.formatEther(balNow), requiredTotal: String(requiredTotal), valueEth });
    return;
  }

  // 6) Envio protegido por nonce lock
  await withNonceLock(async () => {
    try {
      log('Enviando Bridge com gasLimit:', String(chosenGas), 'valueEth:', valueEth);
      const tx = await bridgeContract.depositTransaction(
        bridgeWallet.address,
        valueWei,
        chosenGas,
        false,
        '0x',
        { value: valueWei, gasLimit: chosenGas }
      );
      log('Bridge tx enviada:', tx.hash);
      const rc = await tx.wait();
      safeWriteJSON(`out/bridge-${Date.now()}.json`, { when: nowIso(), txHash: tx.hash, block: rc.blockNumber, valueEth, gasUsed: rc.gasUsed?.toString?.() || null });
      log('Bridge finalizada:', tx.hash);
    } catch (err) {
      const msg = err?.message || JSON.stringify(err);
      log(`Erro ao enviar Bridge (on-chain): ${msg}`, 'error');
      // salvar dump para debug
      safeWriteJSON(`out/bridge-send-error-${Date.now()}.json`, {
        when: nowIso(),
        error: msg,
        attempted: { valueEth, chosenGas: String(chosenGas) }
      });
      // tentar extrair reason via provider.call (fallback)
      try {
        const txReq = buildTxReq(chosenGas, valueWei);
        const sim2 = await simulateCall(txReq);
        safeWriteJSON(`out/bridge-send-error-sim-${Date.now()}.json`, { when: nowIso(), simReason: sim2.reason, simOk: sim2.ok });
      } catch (e2) {
        safeWriteJSON(`out/bridge-send-error-sim-exc-${Date.now()}.json`, { when: nowIso(), exc: e2?.message || e2 });
      }
    }
  });
}

//
// Owlto deploy replay
//
const OWLTO_TX = OWLTO_ORIGINAL_TX;
async function deployOwltoReplay() {
  if (!OWLTO_TX) throw new Error('OWLTO_ORIGINAL_TX não definido no .env');
  const base = await provider.getTransaction(OWLTO_TX);
  if (!base) throw new Error('TX modelo Owlto não encontrada');
  if (base.to !== null) throw new Error('TX modelo Owlto não é CREATE (to deve ser null)');

  const fee = await provider.getFeeData();
  let priority = fee.maxPriorityFeePerGas ?? ethers.parseGwei('1');
  let maxFee  = fee.maxFeePerGas ?? ethers.parseGwei('2');

  await withNonceLock(async () => {
    const baseNonce = await provider.getTransactionCount(wallet.address, 'pending');
    const txReq = {
      to: null,
      data: base.data,
      value: base.value ?? 0n,
      nonce: baseNonce,
      maxPriorityFeePerGas: priority,
      maxFeePerGas: maxFee
    };
    log(`Enviando Owlto deploy nonce=${baseNonce} (DRY=${DRY})`);
    if (DRY) { log('Deploy na Owlto Finance simulado.'); return; }
    const tx = await wallet.sendTransaction(txReq);
    log('Owlto Finance deploy tx:', tx.hash);
    const rc = await tx.wait();
    safeWriteJSON(`out/owlto-${Date.now()}.json`, { when: nowIso(), txHash: tx.hash, block: rc.blockNumber, contract: rc.contractAddress });
    log('Deploy na Owlto Finance concluído:', rc.contractAddress);
  });
}

//
// Onchain GM deploy logic (mantive, com logs unificados)
//
const GM_FACTORY = ONCHAIN_GM_FACTORY;
const GM_METHOD = ONCHAIN_GM_METHOD || 'deploy';
const GM_FACTORY_ABI = [{ type:'function', name: GM_METHOD, stateMutability:'payable', inputs:[], outputs:[] }];

function parseValueOpt(v) {
  if (!v) return 0n;
  if (typeof v === 'bigint') return v;
  if (v.includes('.')) return ethers.parseEther(v);
  try { return BigInt(v); } catch { return 0n; }
}

async function tryReadCommonFee(factoryAddress) {
  const names = ['deploymentFee','requiredFee','fee','feeAmount','getDeploymentFee','getFee','price'];
  for (const name of names) {
    try {
      const abi = [{ "type":"function", "name": name, "stateMutability":"view", "outputs":[{ "type":"uint256","name":""}], "inputs": [] }];
      const c = new ethers.Contract(factoryAddress, abi, provider);
      const v = await c[name]();
      if (v != null && BigInt(v) > 0n) {
        log(`Factory expõe ${name} = ${ethers.formatEther(v)} ETH`);
        return BigInt(v);
      }
    } catch (e) {  }
  }
  return 0n;
}

const MAX_SEARCH_ETH = ethers.parseEther('0.1');
const SEARCH_ITERS = 12;

async function findValueByBinarySearch(factoryAddress, txData, fromAddress) {
  let low = 0n;
  let high = MAX_SEARCH_ETH;
  let found = null;

  const testHigh = await simulateCallNoRevert({ to: factoryAddress, data: txData, from: fromAddress }, high);
  if (!testHigh.ok && (testHigh.reason || '').toLowerCase().includes('insufficient')) {
    log('Mesmo com teto MAX_SEARCH_ETH a simulação reverte com "Insufficient deployment fee". Aumente MAX_SEARCH_ETH ou defina ONCHAIN_GM_VALUE/ONCHAIN_GM_SAMPLE_TX.');
    return 0n;
  }

  for (let i = 0; i < SEARCH_ITERS; i++) {
    const mid = (low + high) / 2n;
    const sim = await simulateCallNoRevert({ to: factoryAddress, data: txData, from: fromAddress }, mid);
    if (sim.ok) {
      found = mid;
      if (mid === 0n) break;
      high = mid - 1n;
    } else {
      const reason = (sim.reason || '').toLowerCase();
      if (reason.includes('insufficient')) {
        low = mid + 1n;
      } else {
        log('Simulação reverte por outro motivo:', sim.reason);
        return 0n;
      }
    }
  }
  if (!found) found = high;
  return found;
}

async function deployOnchainGM() {
  if (!GM_FACTORY) throw new Error('ONCHAIN_GM_FACTORY não definido no .env');
  const factory = new ethers.Contract(GM_FACTORY, GM_FACTORY_ABI, wallet);

  let valueToSend = parseValueOpt(ONCHAIN_GM_VALUE || '');

  if (valueToSend === 0n && (ONCHAIN_GM_SAMPLE_TX || process.env.ONCHAIN_GM_SAMPLE_TX)) {
    const sampleHash = ONCHAIN_GM_SAMPLE_TX || process.env.ONCHAIN_GM_SAMPLE_TX;
    try {
      const sample = await provider.getTransaction(sampleHash);
      if (sample && sample.value) {
        valueToSend = sample.value;
        log('Usando value do tx-amostra:', ethers.formatEther(valueToSend), 'ETH');
      }
    } catch (e) {
      log('Não foi possível ler tx-amostra para inferir value:', e.message);
    }
  }

  if (valueToSend === 0n) {
    const v = await tryReadCommonFee(GM_FACTORY);
    if (v && v > 0n) {
      valueToSend = v;
      log('Value detectado via função view:', ethers.formatEther(valueToSend), 'ETH');
    }
  }

  if (valueToSend === 0n) {
    log('Tentando descobrir value por simulação (eth_call), pode demorar e gerar várias chamadas RPC...');
    const iface = new ethers.Interface(GM_FACTORY_ABI);
    const txData = iface.encodeFunctionData(GM_METHOD, []);
    const discovered = await findValueByBinarySearch(GM_FACTORY, txData, wallet.address);
    if (discovered && discovered > 0n) {
      valueToSend = discovered;
      log('Value descoberto por simulação:', ethers.formatEther(valueToSend), 'ETH');
    } else {
      log('Não foi possível descobrir o value automaticamente.');
    }
  }

  if (valueToSend === 0n) {
    throw new Error('Value para deploy da Onchaingm não determinado. Defina ONCHAIN_GM_VALUE ou ONCHAIN_GM_SAMPLE_TX.');
  }

  await withNonceLock(async () => {
    const fee = await provider.getFeeData();
    let priority = fee.maxPriorityFeePerGas ?? ethers.parseGwei('1');
    let maxFee  = fee.maxFeePerGas ?? ethers.parseGwei('2');
    const baseNonce = await provider.getTransactionCount(wallet.address, 'pending');

    if (DRY) { log('[DRY_RUN] Onchaingm deploy simulado.'); return; }

    const overrides = {
      value: valueToSend,
      nonce: baseNonce,
      maxPriorityFeePerGas: priority,
      maxFeePerGas: maxFee
    };

    let attempt = 0;
    const maxAttempts = 3;
    while (attempt < maxAttempts) {
      attempt++;
      try {
        const tx = await factory[GM_METHOD](overrides);
        log('Onchaingm deploy tx enviada:', tx.hash, 'value:', ethers.formatEther(valueToSend));
        const rc = await tx.wait();

        let created = null;
        for (const l of rc.logs) {
          const data = (l.data || '0x').replace(/^0x/, '');
          if (data.length >= 64) {
            for (let i = data.length; i >= 64; i -= 64) {
              const word = data.slice(i-64, i);
              const addr = '0x' + word.slice(64-40);
              if (/^0x[0-9a-fA-F]{40}$/.test(addr)) {
                const code = await provider.getCode(addr);
                if (code && code !== '0x') { created = ethers.getAddress(addr); break; }
              }
            }
          }
          if (created) break;
        }

        const out = { when: nowIso(), txHash: tx.hash, block: rc.blockNumber, contract: created, sentValue: ethers.formatEther(valueToSend) };
        safeWriteJSON(`out/onchaingm-${Date.now()}.json`, out);
        log('Onchaingm deploy concluído:', tx.hash, 'contract:', created);
        return;
      } catch (err) {
        const msg = err?.message || JSON.stringify(err);
        log(`Erro Onchaingm (tentativa ${attempt}): ${msg}`);
        if ((msg && msg.toLowerCase().includes('replacement')) || err && err.code === 'REPLACEMENT_UNDERPRICED') {
          priority = bumpFee(priority);
          maxFee = bumpFee(maxFee);
          log('Aumentando fees e tentando novamente.');
          await sleep(1000 * attempt);

          overrides.maxPriorityFeePerGas = priority;
          overrides.maxFeePerGas = maxFee;
          continue;
        }
        if (msg && msg.toLowerCase().includes('insufficient funds')) {
          log('Saldo insuficiente para Onchaingm deploy. Abortando.');
          safeWriteJSON(`out/onchaingm-error-${Date.now()}.json`, { when: nowIso(), error: msg });
          return;
        }
        await sleep(1000 * attempt);
      }
    }
    log('Todas as tentativas de Onchaingm falharam.');
    safeWriteJSON(`out/onchaingm-error-final-${Date.now()}.json`, { when: nowIso(), message: 'failed after retries' });
  });
}

//
// sendDailyGM (mantive com logs)
//
const GM_TX = GM_ORIGINAL_TX;
async function sendDailyGM() {
  if (!GM_TX) throw new Error('GM_ORIGINAL_TX não definido no .env');
  const orig = await provider.getTransaction(GM_TX);
  if (!orig) throw new Error('GM tx-modelo não encontrada');
  if (orig.to === null) throw new Error('GM tx-modelo é CREATE; precisa ser call normal');

  const simReq = {
    to: orig.to,
    data: orig.data,
    value: orig.value ?? 0n,
    from: wallet.address
  };

  log('Simulando GM antes do envio...', 'info');
  const sim = await simulateCall(simReq);
  if (!sim.ok) {
    log(`Simulação reverteu. Motivo: ${sim.reason || '(sem razão explícita)'} - GM cancelado para evitar gasto desnecessário.`, 'warn');
    safeWriteJSON(`out/gm-sim-fail-${Date.now()}.json`, { when: nowIso(), reason: sim.reason });
    return;
  }

  await withNonceLock(async () => {
    const feeData = await provider.getFeeData();
    let priority = feeData.maxPriorityFeePerGas ?? ethers.parseGwei('1');
    let maxFee  = feeData.maxFeePerGas ?? ethers.parseGwei('2');

    const baseNonce = await provider.getTransactionCount(wallet.address, 'pending');

    if (DRY) { log('[DRY_RUN] Não será enviado GM (somente simulação).', 'info'); return; }

    let attempt = 0;
    const maxAttempts = 4;
    while (attempt < maxAttempts) {
      attempt++;
      try {
        const txReq = {
          to: orig.to,
          data: orig.data,
          value: orig.value ?? 0n,
          nonce: baseNonce,
          maxPriorityFeePerGas: priority,
          maxFeePerGas: maxFee
        };
        log(`Enviando GM (tentativa ${attempt}) nonce=${txReq.nonce} priority=${priority} maxFee=${maxFee}`, 'info');
        const tx = await wallet.sendTransaction(txReq);
        log('GM tx enviada:', tx.hash);
        const rc = await tx.wait();
        safeWriteJSON(`out/gm-${Date.now()}.json`, { when: nowIso(), txHash: tx.hash, block: rc.blockNumber });
        log('GM diário concluído:', tx.hash, 'done');
        return;
      } catch (err) {
        const code = err?.code || '';
        const msg = err?.message || JSON.stringify(err);
        log(`Erro ao enviar GM (tentativa ${attempt}): ${msg}`);
        if (code === 'REPLACEMENT_UNDERPRICED' || (msg && msg.toLowerCase().includes('replacement') && msg.toLowerCase().includes('underpriced'))) {
          priority = bumpFee(priority);
          maxFee = bumpFee(maxFee);
          log('REPLACEMENT_UNDERPRICED detectado, aumentando taxas e tentando novamente.', 'warn');
          await sleep(1000 * attempt);
          continue;
        }
        if ((msg && msg.toLowerCase().includes('insufficient funds')) || code === 'INSUFFICIENT_FUNDS') {
          log('Saldo insuficiente para enviar GM. Abortando.', 'warn');
          safeWriteJSON(`out/gm-error-${Date.now()}.json`, { when: nowIso(), error: msg });
          return;
        }
        await sleep(1000 * attempt);
      }
    }
    log('Todas as tentativas de envio de GM falharam.');
    safeWriteJSON(`out/gm-error-final-${Date.now()}.json`, { when: nowIso(), message: 'failed after retries' });
  });
}

//
// Scheduling orchestration
//
const GM_START_HOUR = Number(process.env.GM_START_HOUR ?? 12);
const GM_END_HOUR   = Number(process.env.GM_END_HOUR ?? 22);
const GM_MIN_GAP_MIN = Number(process.env.GM_MIN_GAP_MIN ?? 60);

function scheduleTodayAll() {
  // reset visual separator para que a próxima execução imprima a linha antes do primeiro "Iniciando"
  printedStartSeparator = false;

  log('Gerando agenda do dia...', 'info');

  const bridgeTimes = randomTimes(3, { startHour: 10, endHour: 22, minGapMin: 45 });
  bridgeTimes.forEach((d,i)=> scheduleAt(d, doBridgeOnce, `Bridge #${i+1}`));

  const owltoTimes = randomTimes(3, { startHour: 11, endHour: 21, minGapMin: 60 });
  owltoTimes.forEach((d,i)=> scheduleAt(d, deployOwltoReplay, `Owlto deploy #${i+1}`));

  const gmDeployTimes = randomTimes(3, { startHour: 12, endHour: 22, minGapMin: 60 });
  gmDeployTimes.forEach((d,i)=> scheduleAt(d, deployOnchainGM, `Onchaingm deploy #${i+1}`));

  const gmWindowStart = Math.max(0, Math.min(23, GM_START_HOUR));
  const gmWindowEnd   = Math.max(0, Math.min(23, GM_END_HOUR));
  const gmStart = Math.min(gmWindowStart, gmWindowEnd);
  const gmEnd   = Math.max(gmWindowStart, gmWindowEnd);

  const gmTimeCandidates = randomTimes(1, { startHour: gmStart, endHour: gmEnd, minGapMin: GM_MIN_GAP_MIN });
  if (gmTimeCandidates.length > 0) {
    scheduleAt(gmTimeCandidates[0], sendDailyGM, `GM diário (aleatório)`);
  } else {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours((gmStart + gmEnd) >> 1, 0, 0, 0);
    scheduleAt(tomorrow, sendDailyGM, `GM diário (fallback amanhã)`);
  }
}

function scheduleMidnight() {
  const next = new Date(); next.setDate(next.getDate()+1); next.setHours(0,5,0,0);
  scheduleAt(next, async () => { log('Virada do dia: replanejando agenda', 'info'); scheduleTodayAll(); scheduleMidnight(); }, 'Refresh diário 00:05');
}

//
// Startup (mantive lógica, agora usando o log unificado)
//
(async () => {
  try {
    log('Daemon iniciado.', 'info');
    const bal = await provider.getBalance(wallet.address);
    log('Saldo inicial: ' + ethers.formatEther(bal) + ' ETH', 'info');
    scheduleTodayAll();
    scheduleMidnight();
    appendLogLineSafe('Daemon rodando: ' + formatarDataBR());
  } catch (err) {
    log('Erro crítico na inicialização: ' + (err.message || err), 'error');
    appendLogLineSafe('CRITICAL ERROR: ' + (err.stack || err.message || err));
    process.exit(1);
  }
})();

//
// Process signals (mantive)
//
process.on('SIGINT', () => { log('SIGINT recebido, finalizando...', 'warn'); appendLogLineSafe('SIGINT - stopped'); process.exit(0); });
process.on('SIGTERM', () => { log('SIGTERM recebido, finalizando...', 'warn'); appendLogLineSafe('SIGTERM - stopped'); process.exit(0); });
process.on('uncaughtException', (err) => { log('uncaughtException: ' + (err.stack || err.message), 'error'); appendLogLineSafe('UNCAUGHT EXCEPTION: ' + (err.stack || err.message)); process.exit(1); });
process.on('unhandledRejection', (r) => { log('unhandledRejection: ' + JSON.stringify(r), 'error'); appendLogLineSafe('UNHANDLED REJECTION: ' + JSON.stringify(r)); });

//
// EOF
//
