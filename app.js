// ====== RATE LIMIT: 28 per 5 hours ======
const RATE_LIMIT = 28;
const WINDOW_MS  = 5 * 60 * 60 * 1000;
const rateStore  = {};

function getRateInfo(gmailId) {
  const now = Date.now();
  if (!rateStore[gmailId] || now >= rateStore[gmailId].resetAt) {
    rateStore[gmailId] = { count: 0, resetAt: now + WINDOW_MS };
  }
  return rateStore[gmailId];
}

function formatTime(ms) {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

document.addEventListener('DOMContentLoaded', function () {
  document.getElementById('recipients').addEventListener('input', countRecipients);
});

function countRecipients() {
  const raw    = document.getElementById('recipients').value;
  const emails = parseEmails(raw);
  const badge  = document.getElementById('recipientCount');
  badge.textContent   = `${emails.length} recipient${emails.length !== 1 ? 's' : ''}`;
  badge.style.background = emails.length > 50 ? '#dc2626' : '#4f46e5';
}

function parseEmails(raw) {
  return raw
    .split(/[\n,]+/)
    .map(e => e.trim().toLowerCase())
    .filter(e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
}

function togglePass() {
  const inp  = document.getElementById('appPassword');
  inp.type   = inp.type === 'password' ? 'text' : 'password';
}

function setStatus(type, icon, text) {
  const bar  = document.getElementById('statusBar');
  bar.className = 'status-bar ' + type;
  document.getElementById('statusIcon').textContent = icon;
  document.getElementById('statusText').textContent = text;
}

function addLog(type, icon, message) {
  const logBox  = document.getElementById('logBox');
  const logList = document.getElementById('logList');
  logBox.style.display = 'block';
  const item    = document.createElement('div');
  item.className = `log-item ${type}`;
  item.innerHTML = `<span>${icon}</span><span>${message}</span>`;
  logList.appendChild(item);
  logBox.scrollTop = logBox.scrollHeight;
}

function clearLog() {
  document.getElementById('logList').innerHTML = '';
  document.getElementById('logBox').style.display = 'none';
}

function setProgress(current, total) {
  const wrap = document.getElementById('progressWrap');
  wrap.style.display = 'flex';
  const pct  = total > 0 ? Math.round((current / total) * 100) : 0;
  document.getElementById('progressFill').style.width = pct + '%';
  document.getElementById('progressText').textContent = `Sending ${current} / ${total}`;
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
  if (emails.length === 0) {
    setStatus('error', '❌', 'Add at least 1 valid recipient email');
    return false;
  }
  if (emails.length > 50) {
    setStatus('error', '❌', 'Max 50 recipients at a time');
    return false;
  }
  return emails;
}

async function sendAll() {
  const emails = validate();
  if (!emails) return;

  const senderName  = document.getElementById('senderName').value.trim();
  const gmailId     = document.getElementById('gmailId').value.trim();
  const appPassword = document.getElementById('appPassword').value.trim();
  const subject     = document.getElementById('subject').value.trim();
  const messageBody = document.getElementById('messageBody').value.trim();

  // ✅ Rate limit check
  const info      = getRateInfo(gmailId);
  const remaining = RATE_LIMIT - info.count;
  const timeLeft  = formatTime(info.resetAt - Date.now());

  if (remaining <= 0) {
    setStatus('error', '🚫', `Limit reach! ${timeLeft} baad reset hoga`);
    addLog('fail', '🚫', `28/5hr limit reach. Reset in ${timeLeft}`);
    return;
  }

  const sendList = emails.slice(0, remaining);
  if (sendList.length < emails.length) {
    addLog('info', 'ℹ️', `Sirf ${sendList.length} bheje jayenge — limit: ${remaining} remaining`);
  }

  const btn = document.getElementById('sendBtn');
  btn.disabled = true;
  btn.innerHTML = '⏳ Sending...';
  btn.style.opacity = '0.7';
  btn.style.cursor  = 'not-allowed';

  clearLog();
  setStatus('sending', '📤', `Sending ${sendList.length} emails... (${remaining} remaining)`);
  setProgress(0, sendList.length);

  let successCount = 0;
  let failCount    = 0;
  let completed    = 0;

  for (let i = 0; i < sendList.length; i++) {
    try {
      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderName,
          gmailId,
          appPassword,
          subject,
          messageBody, // ✅ exact — koi extra words nahi
          to: sendList[i]
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        successCount++;
        info.count++;
      } else {
        failCount++;
      }
    } catch {
      failCount++;
    }

    completed++;
    setProgress(completed, sendList.length);

    const rem = RATE_LIMIT - getRateInfo(gmailId).count;
    const tl  = formatTime(getRateInfo(gmailId).resetAt - Date.now());
    setStatus('sending', '📤', `Sending... ${rem} remaining — resets in ${tl}`);

    // ✅ 1-2 second random delay — safest for inbox
    if (i < sendList.length - 1) {
      const delay = Math.floor(Math.random() * 800) + 1000;
      await sleep(delay);
    }
  }

  const remFinal = RATE_LIMIT - getRateInfo(gmailId).count;
  const tlFinal  = formatTime(getRateInfo(gmailId).resetAt - Date.now());

  if (failCount === 0) {
    setStatus('success', '🎉', `${successCount} sent! ${remFinal} remaining — resets in ${tlFinal}`);
    addLog('ok', '✅', `${successCount} emails delivered`);
  } else if (successCount === 0) {
    setStatus('error', '💥', `All failed. Check Gmail & App Password`);
    addLog('fail', '❌', `All ${failCount} failed`);
  } else {
    setStatus('sending', '⚠️', `${successCount} sent, ${failCount} failed`);
    addLog('ok', '✅', `${successCount} delivered`);
    addLog('fail', '❌', `${failCount} failed`);
  }

  addLog('info', '📊', `Total: ${sendList.length} | ✅ ${successCount} | ❌ ${failCount} | 🔄 ${tlFinal}`);

  btn.disabled = false;
  btn.innerHTML = '🚀 Send All';
  btn.style.opacity = '1';
  btn.style.cursor  = 'pointer';
}

function logoutAll() {
  ['senderName','gmailId','appPassword','subject','messageBody','recipients']
    .forEach(id => document.getElementById(id).value = '');
  countRecipients();
  clearLog();
  document.getElementById('progressWrap').style.display = 'none';
  setStatus('', '⚡', 'Ready to launch');
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
