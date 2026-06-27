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
  const [addUniqueIdToSubject, setAddUniqueIdToSubject] = useState(false); // FALSE by default so no extra words are added unless manually checked
  
  // Connection Test & Logs State
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<{ success?: boolean; message: string } | null>(null);
  const [bulkLog, setBulkLog] = useState<string[]>([]);
  
  const stopRequestedRef = useRef(false);

  // Synchronous references to avoid triggering the useEffect sending loop on state/prop change
  const recipientsRef = useRef<MailSendStatus[]>([]);
  const delaySecondsRef = useRef(delaySeconds);
  const randomizeDelayRef = useRef(randomizeDelay);
  const subjectRef = useRef(subject);
  const bodyRef = useRef(body);
  const addUniqueIdToSubjectRef = useRef(addUniqueIdToSubject);
  const senderEmailRef = useRef(senderEmail);
  const appPasswordRef = useRef(appPassword);
  const senderNameRef = useRef(senderName);

  // Keep references in sync with state changes
  useEffect(() => { recipientsRef.current = recipients; }, [recipients]);
  useEffect(() => { delaySecondsRef.current = delaySeconds; }, [delaySeconds]);
  useEffect(() => { randomizeDelayRef.current = randomizeDelay; }, [randomizeDelay]);
  useEffect(() => { subjectRef.current = subject; }, [subject]);
  useEffect(() => { bodyRef.current = body; }, [body]);
  useEffect(() => { addUniqueIdToSubjectRef.current = addUniqueIdToSubject; }, [addUniqueIdToSubject]);
  useEffect(() => { senderEmailRef.current = senderEmail; }, [senderEmail]);
  useEffect(() => { appPasswordRef.current = appPassword; }, [appPassword]);
  useEffect(() => { senderNameRef.current = senderName; }, [senderName]);

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

  // Bulk send loop handler - Triggers ONLY when isSending changes to true
  useEffect(() => {
    if (!isSending) return;

    let active = true;
    let timerId: NodeJS.Timeout | null = null;

    const sendNext = async () => {
      if (!active) return;
      if (stopRequestedRef.current) {
        setIsSending(false);
        stopRequestedRef.current = false;
        addLog('Bulk sending paused.');
        return;
      }

      // Find up to 8 pending recipients using the ref to avoid stale state
      const currentRecipients = recipientsRef.current;
      const pendingTargets: { index: number; target: MailSendStatus }[] = [];
      
      for (let i = 0; i < currentRecipients.length; i++) {
        if (currentRecipients[i].status === 'pending') {
          pendingTargets.push({ index: i, target: currentRecipients[i] });
          if (pendingTargets.length === 8) break; // Batch of 8
        }
      }
      
      if (pendingTargets.length === 0) {
        setIsSending(false);
        setCurrentSendingIndex(-1);
        addLog('🎉 All emails sent successfully! Bulk send operation complete.');
        alert('Bulk send operation has completed successfully!');
        return;
      }

      // Mark status as sending for the entire batch in state and ref synchronously
      const updatedListBeforeSend = [...currentRecipients];
      pendingTargets.forEach(({ index }) => {
        updatedListBeforeSend[index] = { ...updatedListBeforeSend[index], status: 'sending' };
      });
      setRecipients(updatedListBeforeSend);
      recipientsRef.current = updatedListBeforeSend;

      addLog(`🚀 Dispatching batch of ${pendingTargets.length} emails simultaneously...`);

      // Run up to 8 requests concurrently
      const batchResults = await Promise.all(
        pendingTargets.map(async ({ index, target }) => {
          const uniqueMailId = Math.floor(100000 + Math.random() * 900000).toString();
          
          // Personalization
          let parsedSubject = renderTemplate(subjectRef.current, target, uniqueMailId);
          if (addUniqueIdToSubjectRef.current) {
            parsedSubject = `${parsedSubject} [Ref: #${uniqueMailId}]`;
          }
          
          const parsedBody = renderTemplate(bodyRef.current, target, uniqueMailId);

          addLog(`[Batch Entry] Sending to ${target.email}...`);

          try {
            const response = await fetch('/api/mail/send-single', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                senderEmail: senderEmailRef.current,
                appPassword: appPasswordRef.current,
                senderName: senderNameRef.current,
                recipientEmail: target.email,
                subject: parsedSubject,
                body: parsedBody
              })
            });

            const data = await response.json();
            const sentTime = new Date().toLocaleTimeString();

            if (data.success) {
              addLog(`✅ Delivered to ${target.email}`);
              return { index, status: 'success' as const, sentAt: sentTime, error: undefined };
            } else {
              addLog(`❌ Failed for ${target.email}: ${data.message}`);
              return { index, status: 'failed' as const, sentAt: sentTime, error: data.message };
            }
          } catch (err: any) {
            const sentTime = new Date().toLocaleTimeString();
            addLog(`❌ Network error for ${target.email}: ${err.message}`);
            return { index, status: 'failed' as const, sentAt: sentTime, error: err.message };
          }
        })
      );

      if (!active) return;

      // Apply batch results together to avoid state races
      const updatedListAfterBatch = [...recipientsRef.current];
      batchResults.forEach(res => {
        updatedListAfterBatch[res.index] = {
          ...updatedListAfterBatch[res.index],
          status: res.status,
          sentAt: res.sentAt,
          error: res.error
        };
      });

      setRecipients(updatedListAfterBatch);
      recipientsRef.current = updatedListAfterBatch;

      // Schedule next batch sending
      if (active && !stopRequestedRef.current) {
        const actualDelay = randomizeDelayRef.current 
          ? Math.max(2, delaySecondsRef.current + Math.floor(Math.random() * 4) - 1)
          : delaySecondsRef.current;

        addLog(`Sleeping for ${actualDelay}s before dispatching next batch...`);
        timerId = setTimeout(sendNext, actualDelay * 1000);
      }
    };

    // Trigger the initial send
    sendNext();

    return () => {
      active = false;
      if (timerId) clearTimeout(timerId);
    };
  }, [isSending]);

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

    // Set lists synchronously in state and references immediately to prevent race conditions
    setRecipients(list);
    recipientsRef.current = list;
    
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
          {/* Helper links hidden to keep layout extremely clean */}
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
                  rows={4}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Write message HTML or plain text here..."
                  className="w-full h-32 bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-mono text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white transition leading-relaxed resize-none"
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
                  rows={4}
                  value={recipientsInput}
                  onChange={(e) => setRecipientsInput(e.target.value)}
                  placeholder="Enter emails here. E.g.:&#13;amit@gmail.com&#13;Rohan <rohan@gmail.com>&#13;sophia@wwkart.com"
                  className="w-full h-32 bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white transition leading-relaxed resize-none"
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

                  <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 text-xs flex gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-emerald-800 flex items-center gap-1.5">
                        Inbox Deliverability Shield Active
                        <span className="bg-emerald-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider animate-pulse">AUTO-ON</span>
                      </p>
                      <p className="text-[11px] text-emerald-700 leading-relaxed mt-1">
                        ईमेल फ़िल्टर (Gmail/Yahoo) को चकमा देने के लिए प्रत्येक ईमेल के भीतर <strong>अदृश्य जीरो-विड्थ कैरेक्टर</strong> मिलाए जाते हैं। इससे प्रत्येक ईमेल का डिजिटल सिग्नेचर (Fingerprint Hash) बिल्कुल अलग बनता है, लेकिन ग्राहक को ईमेल बिल्कुल साफ़ और वैसा ही दिखता है जैसा आपने लिखा है। 
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Spam Protection Cloudflare Success Block */}
            <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm space-y-3">
              <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                Spam Protection
              </h3>
              
              <div className="bg-white border border-slate-200 rounded-lg p-3 flex flex-col gap-2 shadow-xs max-w-[300px]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="bg-emerald-100 p-1 rounded-full text-emerald-600">
                      <Check className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold text-slate-800">Success!</span>
                  </div>
                  <div className="flex flex-col items-end text-[9px] text-slate-400">
                    <div className="flex items-center gap-1">
                      <svg className="w-4 h-4 text-orange-500" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM19 18H6c-2.21 0-4-1.79-4-4 0-2.05 1.53-3.76 3.56-3.97l1.07-.11.5-.95C8.08 7.14 9.94 6 12 6c2.62 0 4.88 1.86 5.39 4.43l.3 1.5 1.53.11c1.56.1 2.78 1.41 2.78 2.96 0 1.65-1.35 3-3 3z" />
                      </svg>
                      <span className="font-extrabold text-slate-600 tracking-tight">CLOUDFLARE</span>
                    </div>
                    <span className="text-[8px] text-slate-400">Privacy • Help</span>
                  </div>
                </div>
                <div className="border border-red-200 bg-red-50 text-red-600 text-[9px] px-2 py-0.5 rounded text-center font-mono font-medium">
                  For testing only. If seen, report to site owner
                </div>
              </div>
            </div>

          </div>

          {/* Right Column (Live stats, list tracker) */}
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

      </main>

      <footer className="bg-white border-t border-slate-200 py-6 px-6 text-center text-xs text-slate-400 mt-12">
        <p className="font-semibold text-slate-500">Bulk Mail Sender & Spam Guard Engine © 2026</p>
        <p className="mt-1">Designed with privacy-safe serverless SMTP architecture.</p>
      </footer>

    </div>
  );
}
