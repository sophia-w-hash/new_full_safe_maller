import React, { useState, useRef, useEffect } from 'react';
import { 
  Mail, 
  Send, 
  ShieldAlert, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  Play, 
  Pause, 
  RotateCcw, 
  HelpCircle, 
  Sliders, 
  KeyRound, 
  Users, 
  FileText, 
  Clock, 
  Sparkles,
  Info,
  User,
  Activity,
  Trash2,
  Lock,
  LogOut,
  Settings,
  ShieldCheck,
  Check,
  RefreshCw
} from 'lucide-react';
import GeminiComposer from './components/GeminiComposer';
import SpamTips from './components/SpamTips';
import { MailSendStatus } from './types';

export default function App() {
  // Inputs matching user's layout structure
  const [senderName, setSenderName] = useState(localStorage.getItem('senderName') || '');
  const [senderEmail, setSenderEmail] = useState(localStorage.getItem('senderEmail') || '');
  const [appPassword, setAppPassword] = useState(localStorage.getItem('appPassword') || '');
  const [subject, setSubject] = useState(localStorage.getItem('subject') || 'Important Business Update for {{Name}}');
  const [body, setBody] = useState(localStorage.getItem('body') || `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
  <p>Dear <strong>{{Name}}</strong>,</p>
  <p>I hope you are doing well.</p>
  <p>We have tailored some special business solutions for you. Please let me know if you would be interested in connecting briefly to discuss how we can assist you.</p>
  <p>Best Regards,<br><strong>{{SenderName}}</strong></p>
</div>`);
  const [recipientsInput, setRecipientsInput] = useState(localStorage.getItem('recipientsInput') || '');

  // Persist inputs to localStorage
  useEffect(() => {
    localStorage.setItem('senderName', senderName);
    localStorage.setItem('senderEmail', senderEmail);
    localStorage.setItem('appPassword', appPassword);
    localStorage.setItem('subject', subject);
    localStorage.setItem('body', body);
    localStorage.setItem('recipientsInput', recipientsInput);
  }, [senderName, senderEmail, appPassword, subject, body, recipientsInput]);

  // Bulk active sending state
  const [recipients, setRecipients] = useState<MailSendStatus[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [currentSendingIndex, setCurrentSendingIndex] = useState<number>(-1);
  const [delaySeconds, setDelaySeconds] = useState(6); // default to 6 seconds for safer delivery
  const [randomizeDelay, setRandomizeDelay] = useState(true); // default to true for human-like pattern
  const [addUniqueIdToSubject, setAddUniqueIdToSubject] = useState(true); // append unique id to evade Gmail duplicate filter
  
  // Connection Test & Logs State
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<{ success?: boolean; message: string } | null>(null);
  const [bulkLog, setBulkLog] = useState<string[]>([]);
  
  const stopRequestedRef = useRef(false);

  // Parse recipients input dynamically on change or send
  const parseRecipients = (text: string): MailSendStatus[] => {
    const items = text.split(/[\n,;]+/).map(item => item.trim()).filter(Boolean);
    const list: MailSendStatus[] = [];
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    items.forEach(item => {
      let email = item;
      let name = '';

      // Check if format is "Name <email>"
      const match = item.match(/([^<]+)<([^>]+)>/);
      if (match) {
        name = match[1].trim();
        email = match[2].trim();
      }

      if (emailRegex.test(email)) {
        list.push({
          id: crypto.randomUUID(),
          email,
          name: name || email.split('@')[0],
          status: 'pending'
        });
      }
    });
    return list;
  };

  const addLog = (msg: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setBulkLog(prev => [`[${timestamp}] ${msg}`, ...prev.slice(0, 99)]);
  };

  // Connection Tester
  const handleTestConnection = async () => {
    if (!senderEmail || !appPassword) {
      setConnectionStatus({
        success: false,
        message: 'Please fill in Your Gmail and 16-Digit App Password first.'
      });
      return;
    }

    setTestingConnection(true);
    setConnectionStatus(null);
    addLog('Testing connection to Gmail SMTP...');

    try {
      const response = await fetch('/api/mail/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ senderEmail, appPassword })
      });

      const data = await response.json();
      if (data.success) {
        setConnectionStatus({
          success: true,
          message: 'Connected Successfully! Your 16-Digit App Password is valid.'
        });
        addLog('✅ SMTP Connection verified successfully.');
      } else {
        setConnectionStatus({
          success: false,
          message: data.message || 'Verification failed. Please verify your Gmail or App Password.'
        });
        addLog('❌ SMTP Connection verification failed.');
      }
    } catch (error: any) {
      setConnectionStatus({
        success: false,
        message: 'Server error: ' + error.message
      });
      addLog('❌ SMTP Server error: ' + error.message);
    } finally {
      setTestingConnection(false);
    }
  };

  // Clear All fields (All Logout)
  const handleAllLogout = () => {
    if (window.confirm('क्या आप सच में सभी क्रेडेंशियल्स, सेटिंग्स और प्राप्तकर्ताओं की सूची को मिटाना (Clear) चाहते हैं?')) {
      setSenderName('');
      setSenderEmail('');
      setAppPassword('');
      setSubject('Important Business Update for {{Name}}');
      setBody(`<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
  <p>Dear <strong>{{Name}}</strong>,</p>
  <p>I hope you are doing well.</p>
  <p>We have tailored some special business solutions for you. Please let me know if you would be interested in connecting briefly to discuss how we can assist you.</p>
  <p>Best Regards,<br><strong>{{SenderName}}</strong></p>
</div>`);
      setRecipientsInput('');
      setRecipients([]);
      setBulkLog([]);
      setConnectionStatus(null);
      localStorage.clear();
      addLog('All data cleared successfully.');
      alert('All Logout Completed! Fields cleared.');
    }
  };

  // Variable Interpolation Helper
  const renderTemplate = (text: string, recipient: MailSendStatus, uniqueId?: string) => {
    let output = text;
    output = output.replace(/\{\{email\}\}/gi, recipient.email || '');
    output = output.replace(/\{\{Name\}\}/gi, recipient.name || '');
    output = output.replace(/\{\{SenderName\}\}/gi, senderName || senderEmail || 'Solutions Team');
    
    if (uniqueId) {
      output = output.replace(/\{\{ID\}\}/gi, uniqueId);
    }
    return output;
  };

  // Bulk send loop handler
  useEffect(() => {
    let timer: NodeJS.Timeout;

    const sendNext = async () => {
      if (!isSending) return;
      if (stopRequestedRef.current) {
        setIsSending(false);
        stopRequestedRef.current = false;
        addLog('Bulk sending paused.');
        return;
      }

      // Find first pending recipient
      const targetIndex = recipients.findIndex(r => r.status === 'pending');
      if (targetIndex === -1) {
        setIsSending(false);
        setCurrentSendingIndex(-1);
        addLog('🎉 All emails sent successfully! Bulk send operation complete.');
        alert('Bulk send operation has completed successfully!');
        return;
      }

      setCurrentSendingIndex(targetIndex);
      const target = recipients[targetIndex];

      // Mark status as sending
      setRecipients(prev => {
        const updated = [...prev];
        updated[targetIndex] = { ...updated[targetIndex], status: 'sending' };
        return updated;
      });

      const uniqueMailId = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Personalization & Anti-spam subject tweak
      let parsedSubject = renderTemplate(subject, target, uniqueMailId);
      if (addUniqueIdToSubject) {
        parsedSubject = `${parsedSubject} [Ref: #${uniqueMailId}]`;
      }
      
      const parsedBody = renderTemplate(body, target, uniqueMailId);

      addLog(`[${targetIndex + 1}/${recipients.length}] Sending to ${target.email}...`);

      try {
        const response = await fetch('/api/mail/send-single', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            senderEmail,
            appPassword,
            senderName,
            recipientEmail: target.email,
            subject: parsedSubject,
            body: parsedBody
          })
        });

        const data = await response.json();
        const sentTime = new Date().toLocaleTimeString();

        if (data.success) {
          setRecipients(prev => {
            const updated = [...prev];
            updated[targetIndex] = { ...updated[targetIndex], status: 'success', sentAt: sentTime };
            return updated;
          });
          addLog(`✅ Delivered to ${target.email}`);
        } else {
          setRecipients(prev => {
            const updated = [...prev];
            updated[targetIndex] = { ...updated[targetIndex], status: 'failed', error: data.message, sentAt: sentTime };
            return updated;
          });
          addLog(`❌ Failed for ${target.email}: ${data.message}`);
        }
      } catch (err: any) {
        const sentTime = new Date().toLocaleTimeString();
        setRecipients(prev => {
          const updated = [...prev];
          updated[targetIndex] = { ...updated[targetIndex], status: 'failed', error: err.message, sentAt: sentTime };
          return updated;
        });
        addLog(`❌ Network error for ${target.email}: ${err.message}`);
      }

      // Set timeout for next mail with optional randomized jitter
      if (isSending && !stopRequestedRef.current) {
        // Humanized jitter: Add -1 to +2 seconds random delay
        const actualDelay = randomizeDelay 
          ? Math.max(2, delaySeconds + Math.floor(Math.random() * 4) - 1)
          : delaySeconds;

        addLog(`Sleeping for ${actualDelay}s to emulate human behavior...`);
        timer = setTimeout(sendNext, actualDelay * 1000);
      }
    };

    if (isSending) {
      sendNext();
    }

    return () => clearTimeout(timer);
  }, [isSending, currentSendingIndex, recipients, delaySeconds, randomizeDelay, subject, body, addUniqueIdToSubject]);

  // Start sending triggered by send button
  const handleStartSending = () => {
    if (!senderEmail || !appPassword) {
      alert('Your Gmail and App Password are required to start sending.');
      return;
    }

    const list = parseRecipients(recipientsInput);
    if (list.length === 0) {
      alert('Please enter at least one valid recipient email address.');
      return;
    }

    setRecipients(list);
    stopRequestedRef.current = false;
    setIsSending(true);
    addLog(`🚀 Initializing bulk send to ${list.length} clients...`);
  };

  const handlePauseSending = () => {
    stopRequestedRef.current = true;
    addLog('Pause requested. Stopping after current email dispatch finishes.');
  };

  // Count stats
  const pendingCount = recipients.filter(r => r.status === 'pending').length;
  const successCount = recipients.filter(r => r.status === 'success').length;
  const failedCount = recipients.filter(r => r.status === 'failed').length;

  return (
    <div id="bulk-mail-app-root" className="min-h-screen bg-slate-50 flex flex-col text-slate-800 font-sans">
      
      {/* Visual Header */}
      <header id="main-header" className="bg-white border-b border-slate-200 py-4 px-6 sticky top-0 z-40 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 text-white p-2.5 rounded-xl shadow-md">
            <Mail className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h1 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
              Bulk Mail Sender Pro
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2.5 py-0.5 rounded-full border border-emerald-200">
                Spam Guard Enabled
              </span>
            </h1>
            <p className="text-xs text-slate-500">
              High-speed inbox delivery with Gmail 16-Digit App Password security
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <a 
            href="https://myaccount.google.com/apppasswords" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold px-3 py-1.5 rounded-lg border border-indigo-100 transition flex items-center gap-1.5"
          >
            <KeyRound className="w-3.5 h-3.5" />
            Generate Gmail App Password
          </a>
        </div>
      </header>

      {/* Primary Workspace container */}
      <main className="flex-1 max-w-6xl mx-auto w-full p-4 md:p-6 space-y-6">
        
        {/* Core Layout requested by user */}
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-slate-900 px-6 py-4 border-b border-slate-800 flex items-center justify-between">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Settings className="w-4 h-4 text-indigo-400" />
              Primary Mailer Setup (ईमेल सेट करें)
            </h2>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping mr-1" />
              <span className="text-[11px] font-mono text-emerald-400 font-bold uppercase">Ready</span>
            </div>
          </div>

          <div className="p-6 space-y-6">
            
            {/* 2-Column Grid matching the requested user layout structure */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Row 1 */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  Sender Name / Brand
                </label>
                <input
                  type="text"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  placeholder="e.g. WWKart Sales Team"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  Your Gmail Address
                </label>
                <input
                  type="email"
                  value={senderEmail}
                  onChange={(e) => setSenderEmail(e.target.value)}
                  placeholder="yourname@gmail.com"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white transition"
                />
              </div>

              {/* Row 2 */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                  16-Digit App Password
                </label>
                <input
                  type="password"
                  value={appPassword}
                  onChange={(e) => setAppPassword(e.target.value)}
                  placeholder="xxxx xxxx xxxx xxxx"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-mono text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-slate-400" />
                  Subject
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. Exclusive proposal for {{Name}}"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 font-medium placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white transition"
                />
              </div>

              {/* Row 3 */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-slate-400" />
                  Message Body (HTML Supported)
                </label>
                <textarea
                  rows={8}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Write message HTML or plain text here..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs font-mono text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white transition leading-relaxed resize-none"
                />
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <span className="text-[10px] text-slate-400 self-center uppercase font-mono mr-1">Insert Placeholder:</span>
                  <button 
                    type="button" 
                    onClick={() => setBody(prev => prev + ' {{Name}}')} 
                    className="text-[10px] bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded text-slate-600 font-mono transition"
                  >
                    {"{{Name}}"}
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setBody(prev => prev + ' {{SenderName}}')} 
                    className="text-[10px] bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded text-slate-600 font-mono transition"
                  >
                    {"{{SenderName}}"}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-slate-400" />
                  Recipients (comma or newline)
                </label>
                <textarea
                  rows={8}
                  value={recipientsInput}
                  onChange={(e) => setRecipientsInput(e.target.value)}
                  placeholder="Enter emails here. E.g.:&#13;amit@gmail.com&#13;Rohan <rohan@gmail.com>&#13;sophia@wwkart.com"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white transition leading-relaxed resize-none"
                />
                <p className="text-[10.5px] text-slate-500 mt-2">
                  एक लाइन में एक ईमेल दर्ज करें, या अल्पविराम <code>,</code> का प्रयोग करें।
                </p>
              </div>

            </div>

            {/* Row 4: Send & All Logout Controls */}
            <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-slate-100">
              {!isSending ? (
                <button
                  type="button"
                  onClick={handleStartSending}
                  disabled={!senderEmail || !appPassword || !recipientsInput}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-100 disabled:text-slate-400 text-white font-bold py-3.5 px-6 rounded-xl text-xs transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-indigo-200"
                >
                  <Send className="w-4 h-4" />
                  Send (बल्क ईमेल शुरू करें)
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handlePauseSending}
                  className="flex-1 bg-amber-500 hover:bg-amber-400 text-white font-bold py-3.5 px-6 rounded-xl text-xs transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-amber-200"
                >
                  <Pause className="w-4 h-4" />
                  Pause Dispatcher
                </button>
              )}

              <button
                type="button"
                onClick={handleAllLogout}
                className="flex-1 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold py-3.5 px-6 rounded-xl text-xs transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer border border-rose-200"
              >
                <LogOut className="w-4 h-4" />
                All Logout (सब साफ़ करें)
              </button>
            </div>

          </div>
        </section>

        {/* Dynamic & Advanced features below the primary form */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column (Stats & Protection configuration) */}
          <div className="lg:col-span-6 space-y-6">
            
            {/* SMTP Test section */}
            <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm space-y-3">
              <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-indigo-500" />
                Connection Guard Tester
              </h3>
              <p className="text-[11.5px] text-slate-500 leading-relaxed">
                बल्क ईमेल भेजने से पहले, अपनी 16-Digit App Password की प्रामाणिकता जांचें।
              </p>
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={testingConnection}
                className="w-full bg-slate-100 hover:bg-slate-200 disabled:bg-slate-50 text-slate-800 font-bold py-2 px-4 rounded-lg text-xs border border-slate-200 flex items-center justify-center gap-2 cursor-pointer"
              >
                {testingConnection ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Testing credentials...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-3.5 h-3.5" />
                    Check App Password Security
                  </>
                )}
              </button>

              {connectionStatus && (
                <div className={`p-3 rounded-lg border text-xs flex gap-2 ${
                  connectionStatus.success ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
                }`}>
                  {connectionStatus.success ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" /> : <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />}
                  <span className="leading-relaxed">{connectionStatus.message}</span>
                </div>
              )}
            </div>

            {/* Smart Spam Shield Controller */}
            <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm space-y-4">
              <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                Smart Spam & Filter Shield (सुरक्षा सेटिंग्स)
              </h3>

              <div className="space-y-4">
                {/* Delivery Jitter & Delay */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs font-semibold text-slate-700">
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4 text-indigo-500" />
                      Speed Delay Between Mails
                    </span>
                    <span className="font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 font-mono">
                      {delaySeconds} seconds
                    </span>
                  </div>
                  <input
                    type="range"
                    min={2}
                    max={20}
                    value={delaySeconds}
                    onChange={(e) => setDelaySeconds(parseInt(e.target.value))}
                    className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>2s (Fast)</span>
                    <span className="text-emerald-600 font-semibold">Recommended: 5s - 10s</span>
                    <span>20s (Super Safe)</span>
                  </div>
                </div>

                {/* Additional anti-spam toggles */}
                <div className="space-y-2.5 pt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={randomizeDelay}
                      onChange={(e) => setRandomizeDelay(e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                    />
                    <div className="text-xs">
                      <p className="font-semibold text-slate-800">Humanize Delay (±2s random jitter)</p>
                      <p className="text-[10.5px] text-slate-500">हर ईमेल के अंतराल में थोड़ा अंतर रखें ताकि बॉट न लगे।</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={addUniqueIdToSubject}
                      onChange={(e) => setAddUniqueIdToSubject(e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                    />
                    <div className="text-xs">
                      <p className="font-semibold text-slate-800">Add Unique Mail ID to Subject line</p>
                      <p className="text-[10.5px] text-slate-500">विषय के अंत में रैंडम ID जोड़ें ताकि एक समान विषय ब्लॉक न हो।</p>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            {/* Smart Creator with Gemini */}
            <GeminiComposer 
              onTemplateGenerated={(subj, bdy) => {
                setSubject(subj);
                setBody(bdy);
                addLog('Template updated via Gemini AI smart generator.');
              }} 
            />

          </div>

          {/* Right Column (Live stats, list tracker & logger terminal) */}
          <div className="lg:col-span-6 space-y-6">
            
            {/* Real-time stats dashboard */}
            <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm space-y-4">
              <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-indigo-500" />
                Live Dispatch Analytics
              </h3>

              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-50 rounded-lg p-3 text-center border border-slate-100">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase block">Total Load</span>
                  <span className="text-xl font-black text-slate-800 font-mono">{recipients.length}</span>
                </div>
                <div className="bg-emerald-50 rounded-lg p-3 text-center border border-emerald-100">
                  <span className="text-[10px] text-emerald-500 font-semibold uppercase block">Sent Success</span>
                  <span className="text-xl font-black text-emerald-700 font-mono">{successCount}</span>
                </div>
                <div className="bg-rose-50 rounded-lg p-3 text-center border border-rose-100">
                  <span className="text-[10px] text-rose-400 font-semibold uppercase block">Failed</span>
                  <span className="text-xl font-black text-rose-700 font-mono">{failedCount}</span>
                </div>
              </div>

              {/* Progress bar */}
              {recipients.length > 0 && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-slate-500 font-medium">
                    <span>Overall Dispatch Completion</span>
                    <span className="font-mono">{Math.round(((successCount + failedCount) / recipients.length) * 100)}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div 
                      className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${((successCount + failedCount) / recipients.length) * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Live Terminal Logger */}
            <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm space-y-3">
              <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                Live Server Logs (डिस्पैच इतिहास)
              </h3>
              <div className="bg-slate-950 rounded-xl p-4 font-mono text-[11px] text-slate-300 h-48 overflow-y-auto space-y-1.5 shadow-inner">
                {bulkLog.length === 0 ? (
                  <p className="text-slate-500 italic">No emails sent yet. Set parameters and click send to begin.</p>
                ) : (
                  bulkLog.map((log, index) => (
                    <div key={index} className="border-l-2 border-indigo-500/30 pl-2 leading-relaxed">
                      {log}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Recipient breakdown list */}
            {recipients.length > 0 && (
              <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm space-y-3">
                <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center justify-between">
                  <span>Recipients Status Log</span>
                  <span className="text-[11px] text-slate-400 normal-case">{pendingCount} Pending</span>
                </h3>
                <div className="max-h-60 overflow-y-auto border border-slate-100 rounded-lg divide-y divide-slate-100">
                  {recipients.map((recipient, i) => (
                    <div key={recipient.id} className="p-2.5 flex items-center justify-between text-xs hover:bg-slate-50 transition">
                      <div className="min-w-0 pr-2">
                        <p className="font-semibold text-slate-800 truncate">{recipient.name}</p>
                        <p className="text-[10px] text-slate-400 font-mono truncate">{recipient.email}</p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {recipient.status === 'success' && (
                          <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-100 flex items-center gap-1">
                            <Check className="w-3 h-3" />
                            Sent
                          </span>
                        )}
                        {recipient.status === 'failed' && (
                          <span className="bg-rose-50 text-rose-700 text-[10px] font-bold px-2 py-0.5 rounded border border-rose-100" title={recipient.error}>
                            Failed
                          </span>
                        )}
                        {recipient.status === 'sending' && (
                          <span className="bg-indigo-50 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded border border-indigo-100 flex items-center gap-1">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Sending
                          </span>
                        )}
                        {recipient.status === 'pending' && (
                          <span className="bg-slate-100 text-slate-500 text-[10px] font-bold px-2 py-0.5 rounded border border-slate-200">
                            Pending
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>

        </div>

        {/* Deliverability Tips */}
        <SpamTips />

      </main>

      <footer className="bg-white border-t border-slate-200 py-6 px-6 text-center text-xs text-slate-400 mt-12">
        <p className="font-semibold text-slate-500">Bulk Mail Sender & Spam Guard Engine © 2026</p>
        <p className="mt-1">Designed with privacy-safe serverless SMTP architecture.</p>
      </footer>

    </div>
  );
}
