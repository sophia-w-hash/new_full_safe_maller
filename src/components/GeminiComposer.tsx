import React, { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';

interface GeminiComposerProps {
  onTemplateGenerated: (subject: string, body: string) => void;
}

export default function GeminiComposer({ onTemplateGenerated }: GeminiComposerProps) {
  const [prompt, setPrompt] = useState('');
  const [tone, setTone] = useState('professional');
  const [language, setLanguage] = useState('Hindi');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/mail/generate-content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          tone,
          language,
        }),
      });

      const data = await response.json();
      if (data.success && data.data) {
        onTemplateGenerated(data.data.subject, data.data.body);
      } else {
        setError(data.message || 'Failed to generate template content');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while calling Gemini AI API.');
    } finally {
      setLoading(false);
    }
  };

  const setPreset = (presetText: string) => {
    setPrompt(presetText);
  };

  return (
    <div className="bg-slate-900 text-white rounded-xl p-5 border border-slate-800 shadow-xl relative overflow-hidden">
      <div className="absolute -top-10 -right-10 w-40 h-40 bg-indigo-500/20 rounded-full blur-2xl pointer-events-none" />
      
      <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="text-yellow-400 w-5 h-5" />
          <h3 className="font-bold text-sm text-slate-100">Gemini AI Smart Composer</h3>
        </div>
        <span className="text-[9px] bg-indigo-500/30 text-indigo-300 font-mono px-2 py-0.5 rounded-full">GEMINI 3.5 FLASH</span>
      </div>

      <p className="text-xs text-slate-400 mb-3">
        लिखें कि आप किस बारे में मेल भेजना चाहते हैं, AI आपके लिए placeholders (जैसे <code>{"{{Name}}"}</code> या <code>{"{{Company}}"}</code>) से युक्त शानदार HTML ड्राफ्ट तैयार कर देगा।
      </p>

      <form onSubmit={handleGenerate} className="space-y-3">
        <textarea
          rows={3}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="उदाहरण: Client को हमारी Web Development services के बारे में बताएं और meeting schedule करने के लिए बोलें।"
          className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
          required
        />

        <div className="flex flex-wrap gap-1.5 items-center">
          <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Presets:</span>
          <button type="button" onClick={() => setPreset("Introduce Graphic Design and web solutions to new client. Offer 20% festive discount. Use {{Name}}.")} className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-0.5 rounded border border-slate-700">Services Promo</button>
          <button type="button" onClick={() => setPreset("Gentle pending payment reminder for invoices with client name {{Name}}. Provide helpful details.")} className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-0.5 rounded border border-slate-700">Payment Reminder</button>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-1">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 mb-1">Tone</label>
            <select value={tone} onChange={(e) => setTone(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-300 focus:outline-none">
              <option value="professional">Professional / औपचारिक</option>
              <option value="friendly">Friendly / दोस्ताना</option>
              <option value="persuasive">Persuasive / बिक्री उन्मुख</option>
              <option value="urgent">Urgent / ज़रूरी</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 mb-1">Language</label>
            <select value={language} onChange={(e) => setLanguage(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-300 focus:outline-none">
              <option value="Hindi">Hindi / हिंदी</option>
              <option value="English">English</option>
              <option value="Hinglish">Hinglish / हिंदी + English</option>
            </select>
          </div>
        </div>

        {error && <div className="bg-rose-950/50 border border-rose-800/60 rounded p-2 text-xs text-rose-300">{error}</div>}

        <button type="submit" disabled={loading || !prompt.trim()} className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white font-bold py-2 px-4 rounded-lg text-xs flex items-center justify-center gap-1.5 cursor-pointer">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-yellow-300" />} Generate Template
        </button>
      </form>
    </div>
  );
}
