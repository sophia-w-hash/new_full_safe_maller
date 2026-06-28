import React from 'react';
import { ShieldCheck, MailWarning, Zap, Clock, UserCheck, FileText, Sparkles, Send } from 'lucide-react';

export default function SpamTips() {
  return (
    <div id="spam-tips-container" className="bg-slate-50 border border-slate-200 rounded-xl p-5 shadow-sm space-y-5">
      <div>
        <h3 id="spam-tips-title" className="text-lg font-bold text-slate-900 mb-1.5 flex items-center gap-2">
          <ShieldCheck className="text-emerald-500 w-5 h-5" />
          Email Delivery & Spam Optimization Rules (स्पैम से बचने के नियम)
        </h3>
        <p id="spam-tips-desc" className="text-xs text-slate-600">
          Gmail SMTP के ज़रिए bulk ईमेल करते समय इन नियमों का पालन करने से आपके ईमेल्स direct clients के <strong>Inbox</strong> में जाएंगे और Gmail account सुरक्षित रहेगा।
        </p>
      </div>

      {/* Upgraded Engine Specs */}
      <div className="bg-gradient-to-r from-emerald-500/10 via-indigo-500/10 to-indigo-500/5 border border-emerald-200/60 rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-600 animate-pulse" />
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
            Upgraded Inbox Delivery Engine v2.0 (सक्रिय हाई-लेवल इंजन)
          </h4>
        </div>
        <p className="text-[11px] text-slate-600 leading-relaxed">
          हमने आपके ईमेल को डायरेक्ट इनबॉक्स में पहुंचाने के लिए दुनिया के सर्वश्रेष्ठ डिलीवरी टूल्स जैसे ही फीचर्स बैकएंड में जोड़े हैं:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1 text-[11px] text-slate-700">
          <div className="bg-white/80 p-2.5 rounded-lg border border-slate-100 flex items-start gap-1.5">
            <span className="text-emerald-500 font-bold shrink-0">✓</span>
            <div>
              <strong>Domain-Aligned Message-ID:</strong> Nodemailer के डिफ़ॉल्ट हेडर को हटाकर प्रत्येक ईमेल को आपके सेंडर डोमेन (जैसे: @gmail.com या आपका कस्टम डोमेन) के अनुकूल जेनरेट किया जाता है। इससे SPF/DKIM/DMARC 100% संरेखित रहता है।
            </div>
          </div>
          <div className="bg-white/80 p-2.5 rounded-lg border border-slate-100 flex items-start gap-1.5">
            <span className="text-emerald-500 font-bold shrink-0">✓</span>
            <div>
              <strong>Checksum Variance (हस्ताक्षर भिन्नता):</strong> प्रत्येक ईमेल के बैकएंड में एक अदृश्य रैंडम टोकन (Dynamic HTML comment व माइक्रो-आईडी) मिलाया जाता है ताकि कोई भी दो ईमेल फ़ाइल-सिग्नेचर लेवल पर समान न लगें। स्पैम फ़िल्टर्स बल्क सिग्नेचर नहीं पकड़ पाते।
            </div>
          </div>
          <div className="bg-white/80 p-2.5 rounded-lg border border-slate-100 flex items-start gap-1.5">
            <span className="text-emerald-500 font-bold shrink-0">✓</span>
            <div>
              <strong>Desktop Client Simulation:</strong> ईमेल के हेडर को इस प्रकार री-स्ट्रक्चर किया गया है कि वे सर्वर स्क्रिप्ट के बजाय वास्तविक Mozilla Thunderbird या Outlook डेस्कटॉप ऐप से भेजे गए वन-टू-वन पर्सनल ईमेल प्रतीत होते हैं।
            </div>
          </div>
          <div className="bg-white/80 p-2.5 rounded-lg border border-slate-100 flex items-start gap-1.5">
            <span className="text-emerald-500 font-bold shrink-0">✓</span>
            <div>
              <strong>No Bulk Flags:</strong> हमने <code>Precedence: bulk</code> और <code>List-Unsubscribe</code> हेडर को हटा दिया है। सामान्य Gmail ऐप पासवर्ड से बल्क फ्लैग वाले ईमेल्स को भेजने पर Gmail उन्हें तुरंत स्पैम या प्रमोशन्स फोल्डर में डाल देता है।
            </div>
          </div>
        </div>
      </div>

      <div id="spam-tips-grid" className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div id="tip-1" className="flex gap-3 items-start p-3 bg-white rounded-lg border border-slate-100">
          <Clock className="text-indigo-500 w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-semibold text-slate-800">1. Proper Delay / Interval (टाइम गैप)</h4>
            <p className="text-[11px] text-slate-500 mt-1">
              बिना गैप के लगातार ईमेल भेजने पर Google उसे bot/spam मानकर ब्लॉक कर देता है। हर ईमेल के बीच कम से कम <strong>5-12 seconds</strong> का delay ज़रूर रखें।
            </p>
          </div>
        </div>

        <div id="tip-2" className="flex gap-3 items-start p-3 bg-white rounded-lg border border-slate-100">
          <UserCheck className="text-emerald-500 w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-semibold text-slate-800">2. Personalized Content (निजीकृत कंटेंट)</h4>
            <p className="text-[11px] text-slate-500 mt-1">
              सभी clients को हूबहू एक जैसा ईमेल न भेजें। Placeholders जैसे <code>{"{{Name}}"}</code> या <code>{"{{Company}}"}</code> का प्रयोग करें ताकि हर ईमेल unique लगे।
            </p>
          </div>
        </div>

        <div id="tip-3" className="flex gap-3 items-start p-3 bg-white rounded-lg border border-slate-100">
          <MailWarning className="text-amber-500 w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-semibold text-slate-800">3. Avoid Spam Keywords (ट्रिगर शब्दों से बचें)</h4>
            <p className="text-[11px] text-slate-500 mt-1">
              Subject या Body में "FREE", "BUY NOW", "EARN MONEY", "💯 GUARANTEED" जैसे शब्दों का अत्यधिक उपयोग न करें, ये स्पैम फ़िल्टर को सक्रिय करते हैं।
            </p>
          </div>
        </div>

        <div id="tip-4" className="flex gap-3 items-start p-3 bg-white rounded-lg border border-slate-100">
          <Zap className="text-sky-500 w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-semibold text-slate-800">4. 16-Digit App Password Usage</h4>
            <p className="text-[11px] text-slate-500 mt-1">
              अपने Gmail का मुख्य पासवर्ड यहाँ उपयोग न करें। Google Account settings में जाकर 2-Step Verification चालू करें और <strong>App Password</strong> जनरेट करें।
            </p>
          </div>
        </div>

        <div id="tip-5" className="flex gap-3 items-start p-3 bg-white rounded-lg border border-slate-100 col-span-1 md:col-span-2">
          <FileText className="text-rose-500 w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-semibold text-slate-800">5. Gmail Send Limits & Account Age (भेजने की दैनिक सीमा)</h4>
            <p className="text-[11px] text-slate-500 mt-1">
              साधारण Gmail एकाउंट से 1 दिन में अधिकतम <strong>500 emails</strong> ही भेजे जा सकते हैं। नए एकाउंट से शुरुआत में 50-100 ईमेल प्रतिदिन ही भेजें (Warm-up करें) ताकि अकाउंट सस्पेंड न हो। अगर आपके पास कस्टम बिजनेस ईमेल है तो SPF, DKIM और DMARC रिकॉर्ड अवश्य सेट करें।
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
