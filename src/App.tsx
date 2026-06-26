import React, { useState, useRef, useEffect } from 'react';
import Papa from 'papaparse';
import { 
  Mail, 
  Send, 
  Upload, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  Play, 
  Pause, 
  RotateCcw, 
  Sliders, 
  KeyRound, 
  Users, 
  Clock, 
  Activity,
  Trash2,
  FileSpreadsheet,
  Search,
  Check,
  ExternalLink,
  User,
  Info
} from 'lucide-react';
import GeminiComposer from './components/GeminiComposer';
import SpamTips from './components/SpamTips';
import { MailConfig, MailTemplate, MailSendStatus } from './types';

export default function App() {
  const [config, setConfig] = useState<MailConfig>({
    senderEmail: localStorage.getItem('senderEmail') || '',
    appPassword: localStorage.getItem('appPassword') || '',
    senderName: localStorage.getItem('senderName') || ''
  });

  useEffect(() => {
    localStorage.setItem('senderEmail', config.senderEmail);
    localStorage.setItem('appPassword', config.appPassword);
    localStorage.setItem('senderName', config.senderName || '');
  }, [config]);

  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<{
    success?: boolean;
    message: string;
  } | null>(null);

  const [manualEmails, setManualEmails] = useState('');
  const [recipients, setRecipients] = useState<MailSendStatus[]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'success' | 'failed'>('all');

  const [template, setTemplate] = useState<MailTemplate>({
    subject: 'Important Update: Professional Solutions for {{Name}}',
    body: `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
  <div style="background-color: #4f46e5; color: white; padding: 24px; text-align: center;">
    <h2 style="margin: 0; font-size: 20px;">Exclusive Business Proposal</h2>
  </div>
  <div style="padding: 24px; background-color: #ffffff;">
    <p>Dear <strong>{{Name}}</strong>,</p>
    <p>I hope this email finds you well. We are reaching out because we have designed specialized solutions tailored for <strong>{{Company}}</strong> to accelerate your productivity.</p>
    <p>Our tools allow businesses to maximize their outreach without ending up in spam. If you're interested in booking a free 15-minute consultation, please let me know by replying to this email.</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="#" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 14px; display: inline-block;">Get Started Now</a>
    </div>
    <p>Best Regards,<br><strong>{{SenderName}}</strong><br>Solutions Specialist</p>
  </div>
  <div style="background-color: #f8fafc; color: #64748b; padding: 16px; text-align: center; font-size: 11px; border-top: 1px solid #e2e8f0;">
    You received this email because you are a client of {{Company}}.<br>
    To unsubscribe, simply reply to this email.
  </div>
</div>`
  });

  const [delaySeconds, setDelaySeconds] = useState(4);
  const [isSending, setIsSending] = useState(false);
  const [currentSendingIndex, setCurrentSendingIndex] = useState<number>(-1);
  const [bulkLog, setBulkLog] = useState<string[]>([]);
  const [testRecipientEmail, setTestRecipientEmail] = useState('');
  const [testingSingleMail, setTestingSingleMail] = useState(false);
  const [testMailResult, setTestMailResult] = useState<{ success?: boolean; message: string } | null>(null);

  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const stopRequestedRef = useRef(false);

  const availablePlaceholders = ['email', 'Name', ...csvHeaders.filter(h => h.toLowerCase() !== 'email' && h.toLowerCase() !== 'name'), 'SenderName'];

  const pendingCount = recipients.filter(r => r.status === 'pending').length;
  const successCount = recipients.filter(r => r.status === 'success').length;
  const failedCount = recipients.filter(r => r.status === 'failed').length;
  const totalCount = recipients.length;
  const estTimeRemaining = pendingCount * delaySeconds;

  const formatTime = (seconds: number) => {
    if (seconds <= 0) return '0s';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  const handleTestConnection = async () => {
    if (!config.senderEmail || !config.appPassword) {
      setConnectionStatus({
        success: false,
        message: 'Please provide both your Gmail address and 16-digit app password first.'
      });
      return;
    }

    setTestingConnection(true);
    setConnectionStatus(null);

    try {
      const response = await fetch('/api/mail/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderEmail: config.senderEmail,
          appPassword: config.appPassword
        })
      });

      const data = await response.json();
      if (data.success) {
        setConnectionStatus({
          success: true,
          message: 'Success! Connected securely to Gmail SMTP.'
        });
      } else {
        setConnectionStatus({
          success: false,
          message: data.message || 'SMTP authentication failed. Verify credentials.'
        });
      }
    } catch (error: any) {
      setConnectionStatus({
        success: false,
        message: 'Error: ' + (error.message || error)
      });
    } finally {
      setTestingConnection(false);
    }
  };

  const handleAddManualEmails = () => {
    if (!manualEmails.trim()) return;
    const items = manualEmails.split(/[\n,;]+/).map(item => item.trim()).filter(Boolean);
    const newRecipients: MailSendStatus[] = [];
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    items.forEach(item => {
      let email = item;
      let name = '';
      const match = item.match(/([^<]+)<([^>]+)>/);
      if (match) {
        name = match[1].trim();
        email = match[2].trim();
      }

      if (emailRegex.test(email)) {
        if (!recipients.some(r => r.email === email)) {
          newRecipients.push({
            id: crypto.randomUUID(),
            email,
            name: name || email.split('@')[0],
            status: 'pending'
          });
        }
      }
    });

    if (newRecipients.length > 0) {
      setRecipients([...recipients, ...newRecipients]);
      setManualEmails('');
      addLog(`Added ${newRecipients.length} recipients manually.`);
    } else {
      alert('No valid emails found.');
    }
  };

  const handleCsvFile = (file: File) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const headers = results.meta.fields || [];
        setCsvHeaders(headers);
        setParsedRows(results.data);

        const list: MailSendStatus[] = [];
        results.data.forEach((row: any) => {
          const emailKey = Object.keys(row).find(k => k.toLowerCase() === 'email' || k.toLowerCase() === 'mail');
          const nameKey = Object.keys(row).find(k => k.toLowerCase() === 'name' || k.toLowerCase() === 'client');

          const emailValue = emailKey ? row[emailKey]?.trim() : '';
          const nameValue = nameKey ? row[nameKey]?.trim() : '';

          if (emailValue && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue)) {
            if (!recipients.some(r => r.email === emailValue)) {
              const customFields: Record<string, string> = {};
              headers.forEach(h => { customFields[h] = row[h] || ''; });

              list.push({
                id: crypto.randomUUID(),
                email: emailValue,
                name: nameValue || emailValue.split('@')[0],
                status: 'pending',
                ...customFields
              });
            }
          }
        });

        if (list.length > 0) {
          setRecipients([...recipients, ...list]);
          addLog(`Imported ${list.length} contacts from CSV.`);
        } else {
          alert('No valid email column found in CSV.');
        }
      }
    });
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleCsvFile(e.dataTransfer.files[0]);
    }
  };

  const handleClearRecipients = () => {
    if (window.confirm('Clear list?')) {
      setRecipients([]);
      setParsedRows([]);
      setCsvHeaders([]);
      setCurrentSendingIndex(-1);
      addLog('Recipients list cleared.');
    }
  };

  const addLog = (msg: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setBulkLog(prev => [`[${timestamp}] ${msg}`, ...prev.slice(0, 99)]);
  };

  const renderTemplate = (text: string, recipient: MailSendStatus) => {
    let output = text;
    output = output.replace(/\{\{email\}\}/gi, recipient.email || '');
    output = output.replace(/\{\{Name\}\}/gi, recipient.name || '');
    output = output.replace(/\{\{SenderName\}\}/gi, config.senderName || config.senderEmail || 'Specialist');

    Object.keys(recipient).forEach(key => {
      if (!['id', 'status', 'error', 'sentAt'].includes(key)) {
        const val = (recipient as any)[key] || '';
        output = output.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'gi'), val);
      }
    });

    output = output.replace(/\{\{Company\}\}/gi, (recipient as any)['Company'] || 'your company');
    return output;
  };

  const handleSendTestMail = async () => {
    if (!config.senderEmail || !config.appPassword) {
      alert('Credentials missing');
      return;
    }
    setTestingSingleMail(true);
    setTestMailResult(null);

    const mockRecipient = recipients[0] || {
      id: 'test',
      email: testRecipientEmail,
      name: 'Client Name',
      status: 'pending',
      Company: 'Solutions Tech'
    };

    try {
      const response = await fetch('/api/mail/send-single', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderEmail: config.senderEmail,
          appPassword: config.appPassword,
          senderName: config.senderName,
          recipientEmail: testRecipientEmail,
          subject: renderTemplate(template.subject, mockRecipient),
          body: renderTemplate(template.body, mockRecipient)
        })
      });
      const data = await response.json();
      if (data.success) {
        setTestMailResult({ success: true, message: 'Test mail sent successfully! Check spam/inbox.' });
      } else {
        setTestMailResult({ success: false, message: 'Failed: ' + data.message });
      }
    } catch (err: any) {
      setTestMailResult({ success: false, message: 'Error: ' + err.message });
    } finally {
      setTestingSingleMail(false);
    }
  };

  const handleResetProgress = () => {
    setRecipients(prev => prev.map(r => ({ ...r, status: 'pending', error: undefined, sentAt: undefined })));
    setIsSending(false);
    addLog('Reset statuses to pending.');
  };

  useEffect(() => {
    let timer: NodeJS.Timeout;
    const sendNext = async () => {
      if (!isSending) return;
      if (stopRequestedRef.current) {
        setIsSending(false);
        stopRequestedRef.current = false;
        addLog('Paused.');
        return;
      }

      const targetIndex = recipients.findIndex(r => r.status === 'pending');
      if (targetIndex === -1) {
        setIsSending(false);
        addLog('🎉 Completed successfully!');
        return;
      }

      const target = recipients[targetIndex];
      setRecipients(prev => {
        const updated = [...prev];
        updated[targetIndex] = { ...updated[targetIndex], status: 'sending' };
        return updated;
      });

      try {
        const response = await fetch('/api/mail/send-single', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            senderEmail: config.senderEmail,
            appPassword: config.appPassword,
            senderName: config.senderName,
            recipientEmail: target.email,
            subject: renderTemplate(template.subject, target),
            body: renderTemplate(template.body, target)
          })
        });
        const data = await response.json();
        const now = new Date().toLocaleTimeString();

        setRecipients(prev => {
          const updated = [...prev];
          updated[targetIndex] = { 
            ...updated[targetIndex], 
            status: data.success ? 'success' : 'failed',
            error: data.success ? undefined : data.message,
            sentAt: now
          };
          return updated;
        });
        addLog(data.success ? `✅ Sent: ${target.email}` : `❌ Failed: ${target.email}`);
      } catch (err: any) {
        const now = new Date().toLocaleTimeString();
        setRecipients(prev => {
          const updated = [...prev];
          updated[targetIndex] = { ...updated[targetIndex], status: 'failed', error: err.message, sentAt: now };
          return updated;
        });
        addLog(`❌ Fail: ${err.message}`);
      }

      if (isSending && !stopRequestedRef.current) {
        timer = setTimeout(sendNext, delaySeconds * 1000);
      }
    };

    if (isSending) sendNext();
    return () => clearTimeout(timer);
  }, [isSending, recipients, delaySeconds, template, config]);

  const filteredRecipients = recipients.filter(r => {
    const match = r.email.toLowerCase().includes(searchQuery.toLowerCase()) || (r.name && r.name.toLowerCase().includes(searchQuery.toLowerCase()));
    return statusFilter === 'all' ? match : r.status === statusFilter && match;
  });

  const handleInsertPlaceholder = (p: string) => {
    const textarea = document.getElementById('body-textarea') as HTMLTextAreaElement;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newBody = template.body.substring(0, start) + `{{${p}}}` + template.body.substring(end);
    setTemplate({ ...template, body: newBody });
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 flex flex-col font-sans">
      <header className="bg-white border-b border-slate-200 py-4 px-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 text-white p-2 rounded-xl shadow">
            <Mail className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">Bulk Mailer Pro</h1>
            <p className="text-xs text-slate-500">Fast delivering secure bulk mailing client with dynamic placeholders</p>
          </div>
        </div>
        <div className="flex gap-2">
          <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener noreferrer" className="text-xs bg-indigo-50 text-indigo-700 hover:underline px-3 py-1.5 rounded-lg border border-indigo-100 flex items-center gap-1.5">
            <KeyRound className="w-3.5 h-3.5" /> App Password Setup <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </header>

      <main className="max-w-7xl mx-auto w-full p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">
        <div className="lg:col-span-7 space-y-6">
          <section className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm space-y-4">
            <h2 className="font-bold text-slate-900 flex items-center gap-2 text-sm uppercase tracking-wider">
              <span className="bg-indigo-100 text-indigo-700 w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs">1</span>
              SMTP Setup
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="email"
                value={config.senderEmail}
                onChange={(e) => setConfig({ ...config, senderEmail: e.target.value })}
                placeholder="your-email@gmail.com"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs focus:outline-none focus:border-indigo-500"
              />
              <input
                type="password"
                value={config.appPassword}
                onChange={(e) => setConfig({ ...config, appPassword: e.target.value })}
                placeholder="16-digit Gmail App Password"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs font-mono focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div className="flex gap-3">
              <input
                type="text"
                value={config.senderName}
                onChange={(e) => setConfig({ ...config, senderName: e.target.value })}
                placeholder="Sender Name / Brand"
                className="flex-1 bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs focus:outline-none focus:border-indigo-500"
              />
              <button onClick={handleTestConnection} disabled={testingConnection} className="bg-indigo-50 border border-indigo-200 text-indigo-700 font-semibold px-4 py-2 rounded-lg text-xs hover:bg-indigo-100 transition flex items-center gap-2 cursor-pointer">
                {testingConnection ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Activity className="w-3.5 h-3.5" />} Test Connection
              </button>
            </div>
            {connectionStatus && (
              <div className={`p-3 rounded-lg border text-xs ${connectionStatus.success ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`}>
                {connectionStatus.message}
              </div>
            )}
          </section>

          <GeminiComposer onTemplateGenerated={(s, b) => setTemplate({ subject: s, body: b })} />

          <section className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm space-y-4">
            <h2 className="font-bold text-slate-900 text-sm uppercase tracking-wider flex items-center gap-2">
              <span className="bg-indigo-100 text-indigo-700 w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs">3</span>
              Compose Template
            </h2>
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
              <span className="text-[10px] font-bold text-slate-500 block mb-1.5 uppercase">Placeholders (Click to Insert):</span>
              <div className="flex flex-wrap gap-1.5">
                {availablePlaceholders.map(p => (
                  <button key={p} type="button" onClick={() => handleInsertPlaceholder(p)} className="text-[10px] bg-white border border-slate-200 text-indigo-700 font-bold px-2 py-1 rounded hover:bg-indigo-50">
                    <code>{"{{" + p + "}}"}</code>
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-3">
              <input
                type="text"
                value={template.subject}
                onChange={(e) => setTemplate({ ...template, subject: e.target.value })}
                placeholder="Subject Line"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs focus:outline-none focus:border-indigo-500"
              />
              <textarea
                id="body-textarea"
                rows={12}
                value={template.body}
                onChange={(e) => setTemplate({ ...template, body: e.target.value })}
                placeholder="HTML or Plain Text Message Body"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs font-mono focus:outline-none focus:border-indigo-500 leading-relaxed"
              />
            </div>
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="bg-slate-100 px-4 py-2 border-b border-slate-200 text-[11px] font-bold text-slate-600">PREVIEW RENDERING</div>
              <div className="p-4 bg-slate-50 max-h-80 overflow-y-auto">
                <div className="bg-white p-4 rounded shadow-xs text-xs" dangerouslySetInnerHTML={{ __html: renderTemplate(template.body, recipients[0] || { id:'test', email:'demo@test.com', name:'John Doe', Company:'Enterprise Ltd' }) }} />
              </div>
            </div>
          </section>

          <SpamTips />
        </div>

        <div className="lg:col-span-5 space-y-6">
          <section className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm space-y-4">
            <h2 className="font-bold text-slate-900 text-sm uppercase tracking-wider flex items-center gap-2">
              <span className="bg-indigo-100 text-indigo-700 w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs">2</span>
              Recipients List
            </h2>
            <div onDragEnter={handleDrag} onDragOver={handleDrag} onDragLeave={handleDrag} onDrop={handleDrop} onClick={() => fileInputRef.current?.click()} className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition ${dragActive ? 'border-indigo-500 bg-indigo-50' : 'border-slate-300 hover:bg-slate-50'}`}>
              <input ref={fileInputRef} type="file" accept=".csv" onChange={(e) => { if (e.target.files?.[0]) handleCsvFile(e.target.files[0]); }} className="hidden" />
              <Upload className="mx-auto h-8 w-8 text-slate-400 mb-2" />
              <p className="text-xs font-bold text-slate-700">Drag & Drop or Click to Upload CSV</p>
              <p className="text-[10px] text-slate-500 mt-1">Include header column named "email" & optional "Name"</p>
            </div>
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <label className="text-xs font-bold text-slate-700 block">Or Paste Emails manually:</label>
              <div className="flex gap-2">
                <textarea rows={2} value={manualEmails} onChange={(e) => setManualEmails(e.target.value)} placeholder="email1@test.com, Name <email2@test.com>" className="flex-1 bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs" />
                <button onClick={handleAddManualEmails} className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-4 rounded-lg text-xs cursor-pointer">Add</button>
              </div>
            </div>
          </section>

          <section className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm space-y-3">
            <h3 className="font-bold text-slate-950 text-xs uppercase tracking-wider">Send Quick Test Mail</h3>
            <div className="flex gap-2">
              <input type="email" value={testRecipientEmail} onChange={(e) => setTestRecipientEmail(e.target.value)} placeholder="test-email@example.com" className="flex-1 bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:outline-none" />
              <button onClick={handleSendTestMail} disabled={testingSingleMail || !testRecipientEmail} className="bg-amber-500 hover:bg-amber-400 text-white font-bold px-4 py-2 rounded-lg text-xs cursor-pointer flex items-center gap-1">
                {testingSingleMail ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3 h-3" />} Send Test
              </button>
            </div>
            {testMailResult && <div className={`p-3 rounded text-xs ${testMailResult.success ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`}>{testMailResult.message}</div>}
          </section>

          <section className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm space-y-4">
            <h2 className="font-bold text-slate-900 text-sm uppercase tracking-wider flex items-center gap-2">
              <span className="bg-indigo-100 text-indigo-700 w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs">4</span>
              Control Panel
            </h2>
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-150 space-y-2">
              <div className="flex justify-between items-center text-xs font-bold">
                <span className="flex items-center gap-1"><Clock className="w-4 h-4 text-indigo-500" /> Sending Interval:</span>
                <span className="text-indigo-700">{delaySeconds}s</span>
              </div>
              <input type="range" min={1} max={30} value={delaySeconds} onChange={(e) => setDelaySeconds(parseInt(e.target.value))} className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600" />
              <p className="text-[10px] text-slate-500">Wait interval between successive client emails protects against Google spam blockers.</p>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-xs font-bold">
              <div className="bg-slate-100 p-2 rounded">Total<p className="text-base font-black font-mono mt-0.5">{totalCount}</p></div>
              <div className="bg-emerald-50 p-2 rounded text-emerald-700">Sent<p className="text-base font-black font-mono mt-0.5">{successCount}</p></div>
              <div className="bg-rose-50 p-2 rounded text-rose-700">Failed<p className="text-base font-black font-mono mt-0.5">{failedCount}</p></div>
            </div>

            {totalCount > 0 && (
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold text-slate-500">
                  <span>Batch Progress</span>
                  <span>{Math.round(((successCount + failedCount) / totalCount) * 100)}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div className="bg-indigo-600 h-2 rounded-full transition-all duration-300" style={{ width: `${((successCount + failedCount) / totalCount) * 100}%` }} />
                </div>
                {isSending && <p className="text-[10px] text-slate-500 text-right">Time Left: {formatTime(estTimeRemaining)}</p>}
              </div>
            )}

            <div className="flex gap-2">
              {!isSending ? (
                <button onClick={handleStartSending} disabled={recipients.length === 0} className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-100 text-white font-bold py-2.5 px-4 rounded-lg text-xs cursor-pointer flex justify-center items-center gap-1.5 shadow-sm">
                  <Play className="w-3.5 h-3.5" /> Start Bulk Send ({pendingCount})
                </button>
              ) : (
                <button onClick={handlePauseSending} className="flex-1 bg-amber-500 hover:bg-amber-400 text-white font-bold py-2.5 px-4 rounded-lg text-xs cursor-pointer flex justify-center items-center gap-1.5">
                  <Pause className="w-3.5 h-3.5" /> Pause Send
                </button>
              )}
              <button onClick={handleResetProgress} disabled={recipients.length === 0 || isSending} className="bg-slate-100 border border-slate-200 p-2 rounded-lg text-slate-700 hover:bg-slate-200 cursor-pointer">
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>

            {recipients.length > 0 && !isSending && (
              <button onClick={handleClearRecipients} className="w-full text-center text-rose-600 hover:underline text-xs flex justify-center items-center gap-1">
                <Trash2 className="w-3.5 h-3.5" /> Reset & Clear Recipients List
              </button>
            )}

            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase">Live Output logs:</span>
              <div className="bg-slate-900 text-slate-300 rounded-lg p-3 font-mono text-[10px] h-32 overflow-y-auto space-y-1">
                {bulkLog.length === 0 ? <p className="text-slate-500 italic">Idle. Add clients to start.</p> : bulkLog.map((log, i) => <p key={i} className={log.includes('✅') ? 'text-emerald-400' : log.includes('❌') ? 'text-rose-400' : 'text-slate-300'}>{log}</p>)}
              </div>
            </div>
          </section>

          <section className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-950 text-xs uppercase">Filter Tracker</h3>
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search client..." className="bg-slate-50 border border-slate-200 p-1.5 rounded text-xs focus:outline-none w-32" />
            </div>
            <div className="flex gap-1">
              {(['all', 'pending', 'success', 'failed'] as const).map(f => (
                <button key={f} onClick={() => setStatusFilter(f)} className={`text-[10px] flex-1 py-1 rounded capitalize font-semibold ${statusFilter === f ? 'bg-indigo-600 text-white' : 'bg-slate-50 hover:bg-slate-100 text-slate-500'}`}>{f}</button>
              ))}
            </div>
            <div className="border border-slate-200 rounded max-h-48 overflow-y-auto">
              <table className="w-full text-left text-[11px]">
                <tbody>
                  {filteredRecipients.map(r => (
                    <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="p-2">
                        <p className="font-bold text-slate-900">{r.name}</p>
                        <p className="text-[10px] text-slate-500">{r.email}</p>
                      </td>
                      <td className="p-2 text-right">
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${r.status === 'success' ? 'bg-emerald-100 text-emerald-800' : r.status === 'failed' ? 'bg-rose-100 text-rose-800' : r.status === 'sending' ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-100 text-slate-600'}`}>{r.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
