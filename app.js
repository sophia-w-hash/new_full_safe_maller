function countRecipients() {
  const raw = document.getElementById('recipients').value;
  const emails = parseEmails(raw);
  const badge = document.getElementById('recipientCount');
  badge.textContent = `${emails.length} recipient${emails.length !== 1 ? 's' : ''}`;
  badge.style.background = emails.length > 50 ? '#ef4444' : '#5b5ef4';
}

function parseEmails(raw) {
  return raw
    .split(/[\n,]+/)
    .map(e => e.trim().toLowerCase())
    .filter(e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
}

function togglePass() {
  const inp = document.getElementById('appPassword');
  inp.type = inp.type === 'password' ? 'text' : 'password';
}

function setStatus(type, icon, text) {
  const bar = document.getElementById('statusBar');
  bar.className = 'status-bar ' + type;
  document.getElementById('statusIcon').textContent = icon;
  document.getElementById('statusText').textContent = text;
}

function addLog(type, icon, message) {
  const logBox = document.getElementById('logBox');
  const logList = document.getElementById('logList');
  logBox.style.display = 'block';
  const item = document.createElement('div');
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
  const pct = total > 0 ? Math.round((current / total) * 100) : 0;
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

// ✅ john@gmail.com → "John"
// wardexcavationllc@gmail.com → "Wardexcavationllc" → clean name
function getFirstName(email) {
  const local = email.split('@')[0];
  const name = local.split(/[.\-_0-9]/)[0];
  if (!name || name.length < 2) return '';
  return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
}

async function sendAll() {
  const emails = validate();
  if (!emails) return;

  const senderName  = document.getElementById('senderName').value.trim();
  const gmailId     = document.getElementById('gmailId').value.trim();
  const appPassword = document.getElementById('appPassword').value.trim();
  const subject     = document.getElementById('subject').value.trim();
  const messageBody = document.getElementById('messageBody').value.trim();

  const btn = document.getElementById('sendBtn');
  btn.disabled = true;
  btn.innerHTML = '<span>⏳</span> Sending...';

  clearLog();
  setStatus('sending', '📤', `Sending to ${emails.length} recipients...`);
  setProgress(0, emails.length);

  let successCount = 0;
  let failCount = 0;
  let completed = 0;

  for (let i = 0; i < emails.length; i++) {
    const to = emails[i];

    // ✅ Auto name from email — john@gmail.com → "Hi John,"
    const firstName = getFirstName(to);
    const greeting = firstName ? `Hi ${firstName},\n\n` : `Hi,\n\n`;
    const personalBody = greeting + messageBody;

    try {
      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderName,
          gmailId,
          appPassword,
          subject,
          messageBody: personalBody,
          to
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        successCount++;
      } else {
        failCount++;
      }
    } catch {
      failCount++;
    }

    completed++;
    setProgress(completed, emails.length);

    // ✅ Random delay — human pattern, spam bypass
    if (i < emails.length - 1) {
      const delay = Math.floor(Math.random() * 300) + 400;
      await sleep(delay);
    }
  }

  if (failCount === 0) {
    setStatus('success', '🎉', `All ${successCount} emails sent successfully!`);
    addLog('ok', '✅', `${successCount} emails delivered successfully`);
  } else if (successCount === 0) {
    setStatus('error', '💥', `All ${failCount} emails failed. Check credentials.`);
    addLog('fail', '❌', `All ${failCount} emails failed — check Gmail & App Password`);
  } else {
    setStatus('sending', '⚠️', `${successCount} sent, ${failCount} failed`);
    addLog('ok', '✅', `${successCount} delivered`);
    addLog('fail', '❌', `${failCount} failed`);
  }

  addLog('info', '📊', `Total: ${emails.length} | ✅ ${successCount} success  ❌ ${failCount} failed`);

  btn.disabled = false;
  btn.innerHTML = '<span>🚀</span> Send All';
}

function logoutAll() {
  document.getElementById('senderName').value = '';
  document.getElementById('gmailId').value = '';
  document.getElementById('appPassword').value = '';
  document.getElementById('subject').value = '';
  document.getElementById('messageBody').value = '';
  document.getElementById('recipients').value = '';
  countRecipients();
  clearLog();
  document.getElementById('progressWrap').style.display = 'none';
  setStatus('', '⚡', 'Ready to launch');
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
