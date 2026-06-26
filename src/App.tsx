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
  const
