const RATE_LIMIT = 28;
const WINDOW_MS  = 5 * 60 * 60 * 1000;
const rateStore  = {};

function getRateInfo(id) {
  const now = Date.now();
  if (!rateStore[id] || now >= rateStore[id].resetAt)
    rateStore[id] = { count: 0, resetAt: now + WINDOW_MS };
  return rateStore[id];
}

function formatTime(ms) {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('recipients').addEventListener('input', countRecipients);
});

function countRecipients() {
  const emails = parseEmails(document.getElementById('recipients').value);
  const badge  = document.getElementById('recipientCount');
  badge.textContent      = `${emails.length} recipient${emails.length !== 1 ? 's' : ''}`;
  badge.style.background = emails.length > 50 ? '#dc2626' : '#4f46e5';
}

function parseEmails(raw) {
  return raw.split(/[\n,]+/).map(e => e.trim().toLowerCase())
    .filter(e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
}

function togglePass() {
  const inp = document.getElementById('appPassword');
  inp.type  = inp.type === 'password' ? 'text' : 'password';
}

function setStatus(type, icon, text) {
  const bar = document.getElementById('statusBar');
  bar.className = 'status-bar ' + type;
  document.getElementById('statusIcon').textContent = icon;
  document.getElementById('statusText').textContent = text;
}

function addLog(type, icon, msg) {
  const logBox  = document.getElementById('logBox');
  const logList = document.getElementById('logList');
  logBox.style.display = 'block';
  const item = document.createElement('div');
  item.className = `log-item ${type}`;
  item.innerHTML = `<span>${icon}</span><span>${msg}</span>`;
  logList.appendChild(item);
  logBox.scrollTop = logBox.scrollHeight;
}

function clearLog() {
  document.getElementById('logList').innerHTML = '';
  document.getElementById('logBox').style.display = 'none';
}

function setProgress(cur, total) {
  document.getElementById('progressWrap').style.display = 'flex';
  const pct = total > 0 ? Math.round((cur / total) * 100) : 0;
  document.getElementById('progressFill').style.width = pct + '%';
  document.getElementById('progressText').textContent  = `Sending ${cur} / ${total}`;
}

function validate() {
  const fields = [
    { id: 'senderName',  label: 'Sender Name' },
    { id: 'gmailId',     label: 'Gmail ID' },
    { id: 'appPassword', label: 'App Password' },
    { id: 'subject',     label: 'Subject' },
    { id: 'messageBody', label: 'Message Body' },
  ];
  for (const f of fields) {
    if (!document.getElementById(f.id).value.trim()) {
      setStatus('error', '❌', `${f.label} is required`);
      document.getElementById(f.id).focus();
      return false;
    }
  }
  const emails = parseEmails(document.getElementById('recipients').value);
  if (emails.length === 0) { setStatus('error', '❌', 'Add at least 1 valid recipient'); return false; }
  if (emails.length > 50)  { setStatus('error', '❌', 'Max 50 at a time'); return false; }
  return emails;
}

function varySubject(s) {
  const sp = [' ', ' \u200B', ' \u00A0'];
  return s.split(' ').map((w, i) =>
    i === 0 ? w : (Math.random() > 0.7 ? sp[Math.floor(Math.random() * sp.length)] : ' ') + w
  ).join('');
}

async function sendAll() {
  const emails = validate();
  if (!emails) return;

  const senderName  = document.getElementById('senderName').value.trim();
  const gmailId     = document.getElementById('gmailId').value.trim();
  const appPassword = document.getElementById('appPassword').value.trim();
  const subject     = document.getElementById('subject').value.trim();
  const messageBody = document.getElementById('messageBody').value.trim();

  const info      = getRateInfo(gmailId);
  const remaining = RATE_LIMIT - info.count;
  const timeLeft  = formatTime(info.resetAt - Date.now());

  if (remaining <= 0) {
    setStatus('error', '🚫', `Limit reach! ${timeLeft} baad reset hoga`);
    addLog('fail', '🚫', `Reset in ${timeLeft}`);
    return;
  }

  const sendList = emails.slice(0, remaining);
  if (sendList.length < emails.length)
    addLog('info', 'ℹ️', `${sendList.length} bheje jayenge (limit: ${remaining})`);

  const btn = document.getElementById('sendBtn');
  btn.disabled = true; btn.innerHTML = '⏳ Sending...';
  btn.style.opacity = '0.7'; btn.style.cursor = 'not-allowed';

  clearLog();
  setStatus('sending', '📤', `Sending ${sendList.length}...`);
  setProgress(0, sendList.length);

  let ok = 0, fail = 0, done = 0;

  // ✅ One by one — normal speed 1-2 sec
  for (let i = 0; i < sendList.length; i++) {
    try {
      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderName,
          gmailId,
          appPassword,
          subject: varySubject(subject),
          messageBody,
          to: sendList[i]
        })
      });
      const data = await res.json();
      if (res.ok && data.success) { ok++; info.count++; }
      else fail++;
    } catch { fail++; }

    done++;
    setProgress(done, sendList.length);

    const rem = RATE_LIMIT - getRateInfo(gmailId).count;
    const tl  = formatTime(getRateInfo(gmailId).resetAt - Date.now());
    setStatus('sending', '📤', `Sending... ${rem} left (${tl})`);

    // ✅ Normal speed — 1000-2000ms
    if (i < sendList.length - 1)
      await sleep(Math.floor(Math.random() * 1000) + 1000);
  }

  const remF = RATE_LIMIT - getRateInfo(gmailId).count;
  const tlF  = formatTime(getRateInfo(gmailId).resetAt - Date.now());

  if (fail === 0) {
    setStatus('success', '🎉', `${ok} sent! ${remF} left (${tlF})`);
    addLog('ok', '✅', `${ok} delivered`);
  } else if (ok === 0) {
    setStatus('error', '💥', 'All failed. Check credentials.');
    addLog('fail', '❌', `${fail} failed`);
  } else {
    setStatus('sending', '⚠️', `${ok} sent, ${fail} failed`);
    addLog('ok', '✅', `${ok} delivered`);
    addLog('fail', '❌', `${fail} failed`);
  }

  addLog('info', '📊', `Total: ${sendList.length} | ✅ ${ok} | ❌ ${fail} | 🔄 ${tlF}`);

  btn.disabled = false; btn.innerHTML = '🚀 Send All';
  btn.style.opacity = '1'; btn.style.cursor = 'pointer';
}

function logoutAll() {
  ['senderName','gmailId','appPassword','subject','messageBody','recipients']
    .forEach(id => document.getElementById(id).value = '');
  countRecipients(); clearLog();
  document.getElementById('progressWrap').style.display = 'none';
  setStatus('', '⚡', 'Ready to launch');
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
