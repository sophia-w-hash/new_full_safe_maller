import React from 'react';
import { ShieldCheck, MailWarning, Zap, Clock, UserCheck, FileText } from 'lucide-react';

export default function SpamTips() {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 shadow-sm">
      <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
        <ShieldCheck className="text-emerald-500 w-5 h-5" />
        Email Delivery & Spam Optimization (स्पैम से बचने के नियम)
      </h3>
      <p className="text-xs text-slate-600 mb-3 leading-relaxed">
        Gmail SMTP के ज़रिए bulk ईमेल करते समय इन नियमों का पालन करने से आपके ईमेल्स direct clients के <strong>Inbox</strong> में जाएंगे और आपका मुख्य अकाउंट ब्लॉक नहीं होगा:
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
        <div className="flex gap-2.5 items-start p-2.5 bg-white rounded-lg border border-slate-100">
          <Clock className="text-indigo-500 w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-slate-800">1. Proper Delay (टाइम गैप)</h4>
            <p className="text-[11px] text-slate-500 mt-0.5">बिना गैप के ईमेल भेजने पर Google उसे bot/spam मान लेता है। दो ईमेल के बीच कम से कम <strong>3-8 seconds</strong> का delay ज़रूर रखें।</p>
          </div>
        </div>

        <div className="flex gap-2.5 items-start p-2.5 bg-white rounded-lg border border-slate-100">
          <UserCheck className="text-emerald-500 w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-slate-800">2. Personalized Content</h4>
            <p className="text-[11px] text-slate-500 mt-0.5">सभी को एक जैसा ईमेल न भेजें। <code>{"{{Name}}"}</code> या <code>{"{{Company}}"}</code> placeholders का उपयोग करें ताकि हर ईमेल अनोखा लगे।</p>
          </div>
        </div>

        <div className="flex gap-2.5 items-start p-2.5 bg-white rounded-lg border border-slate-100">
          <MailWarning className="text-amber-500 w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-slate-800">3. Avoid Spam Keywords</h4>
            <p className="text-[11px] text-slate-500 mt-0.5">Subject या Body में "FREE", "BUY NOW", "EARN MONEY", "💯 GUARANTEED" जैसे शब्दों का अत्यधिक उपयोग न करें।</p>
          </div>
        </div>

        <div className="flex gap-2.5 items-start p-2.5 bg-white rounded-lg border border-slate-100">
          <Zap className="text-sky-500 w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-slate-800">4. 16-Digit App Password</h4>
            <p className="text-[11px] text-slate-500 mt-0.5">अपने मुख्य ईमेल पासवर्ड का उपयोग न करें। Google 2-Step चालू करके <strong>App Password</strong> का ही उपयोग करें।</p>
          </div>
        </div>

        <div className="flex gap-2.5 items-start p-2.5 bg-white rounded-lg border border-slate-100 col-span-1 md:col-span-2">
          <FileText className="text-rose-500 w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-slate-800">5. Gmail Send Limits (भेजने की दैनिक सीमा)</h4>
            <p className="text-[11px] text-slate-500 mt-0.5">साधारण Gmail से 1 दिन में अधिकतम <strong>500 emails</strong> ही भेजे जा सकते हैं (Workspace के लिए 2000)। नए एकाउंट से शुरुआत में प्रतिदिन 50-100 ईमेल ही भेजें।</p>
          </div>
        </div>
      </div>
    </div>
  );
}
