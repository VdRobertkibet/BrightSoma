import React from 'react';
import { UserRole } from '../types';
import {
  GraduationCap, Wallet, Shield, CheckCircle2,
  Lock, ArrowRight, X
} from 'lucide-react';

type Edition = 'starter' | 'professional' | 'elite';

interface RealRegistrationScreenProps {
  edition: Edition;
  onStartRegistration: (modules: string[]) => void;
  onBack: () => void;
}

const EDITION_CONFIG: Record<Edition, {
  label: string;
  color: string;
  tagline: string;
  badge: string;
  features: { label: string; description: string; icon: React.ReactNode; perks: string[] }[];
  modules: { name: string; id: string; enabled: boolean }[];
}> = {
  starter: {
    label: 'Starter Kit',
    color: 'bg-slate-700',
    badge: '🏫 Great for small schools',
    tagline: 'A simple, easy-to-use system for smaller schools just getting started.',
    features: [
      {
        label: 'School Admin',
        description: 'Run the whole school from one place — learners, fees, results and more.',
        icon: <Shield size={24} />,
        perks: ['Add and manage learners', 'Record fees and print invoices', 'Enter CBC results', 'Set up class timetables', 'Manage your teachers'],
      },
      {
        label: 'Class Teacher',
        description: 'Manage your class with ease — take attendance, record marks, and view learners.',
        icon: <GraduationCap size={24} />,
        perks: ['Take daily attendance', 'Record CBC assessment marks', 'View your class timetable', 'See your learner list', 'Check fee balances'],
      },
    ],
    modules: [
      { name: 'CBC Assessments', id: 'academics', enabled: true },
      { name: 'Learner Records', id: 'students', enabled: true },
      { name: 'Fee & Invoice Tracking', id: 'finance', enabled: true },
      { name: 'Class Timetable', id: 'timetable', enabled: true },
      { name: 'Attendance', id: 'attendance', enabled: true },
      { name: 'Health & Wellness', id: 'health', enabled: true },
      { name: 'Events Management', id: 'events', enabled: true },
      { name: 'Asset Management', id: 'assets', enabled: true },
      { name: 'Boarding & Dorms', id: 'boarding', enabled: false },
      { name: 'M-Pesa Payments', id: 'mpesa', enabled: false },
      { name: 'School Bus & Transport', id: 'transport', enabled: false },
      { name: 'Parent Portal', id: 'parents', enabled: false },
      { name: 'Stock & Inventory', id: 'inventory', enabled: false },
      { name: 'Advanced Reports', id: 'analytics', enabled: false },
      { name: 'WhatsApp Alerts', id: 'whatsapp', enabled: false },
    ],
  },
  professional: {
    label: 'Professional Kit',
    color: 'bg-orange-600',
    badge: '🌟 Most popular choice',
    tagline: 'Everything a growing school needs — fees, boarding, timetables and real-time reports.',
    features: [
      {
        label: 'School Admin',
        description: 'Full control over every part of your school — fees, reports, boarding and more.',
        icon: <Shield size={24} />,
        perks: ['All Starter features included', 'Collect fees via M-Pesa automatically', 'KRA receipts issued instantly', 'Manage boarding and dorms', 'View school-wide reports'],
      },
      {
        label: 'Class Teacher',
        description: 'Everything a teacher needs, plus the ability to notify parents and generate reports.',
        icon: <GraduationCap size={24} />,
        perks: ['All Starter teacher features', 'Send updates to parents', 'Connect via WhatsApp', 'Print termly reports'],
      },
      {
        label: 'Finance Officer',
        description: 'Handle all payments and official receipts — simple and fully compliant.',
        icon: <Wallet size={24} />,
        perks: ['Collect and track all fees', 'M-Pesa payment requests', 'Print invoices and receipts', 'KRA-compliant eTIMS receipts', 'Generate finance reports'],
      },
    ],
    modules: [
      { name: 'CBC Assessments', id: 'academics', enabled: true },
      { name: 'Learner Records', id: 'students', enabled: true },
      { name: 'Fees & Finance', id: 'finance', enabled: true },
      { name: 'Class Timetable', id: 'timetable', enabled: true },
      { name: 'Attendance', id: 'attendance', enabled: true },
      { name: 'Boarding & Dorms', id: 'boarding', enabled: true },
      { name: 'School Reports', id: 'analytics', enabled: false },
      { name: 'M-Pesa Payments', id: 'mpesa', enabled: true },
      { name: 'WhatsApp Alerts', id: 'whatsapp', enabled: true },
      { name: 'School Bus & Transport', id: 'transport', enabled: false },
      { name: 'Parent Portal', id: 'parents', enabled: false },
      { name: 'Stock & Inventory', id: 'inventory', enabled: false },
      { name: 'Health & Wellness', id: 'health', enabled: true },
    ],
  },
  elite: {
    label: 'Elite Kit',
    color: 'bg-indigo-600',
    badge: '🏆 For large institutions',
    tagline: 'The full package — KES 15,000 for up to 1,000 learners, then KES 50 per additional head.',
    features: [
      {
        label: 'School Admin',
        description: 'Complete school management with every tool available — nothing locked.',
        icon: <Shield size={24} />,
        perks: ['All Standard features included', 'Track stock and school supplies', 'Manage school buses and drivers', 'Parent access portal', 'Priority setup and onboarding help'],
      },
      {
        label: 'Class Teacher',
        description: 'All teacher tools plus advanced communication and parent reporting.',
        icon: <GraduationCap size={24} />,
        perks: ['All Standard teacher features', 'Bulk SMS to all parents', 'Advanced learner portfolio'],
      },
      {
        label: 'Finance Officer',
        description: 'Full financial management including stock purchasing and advanced tax compliance.',
        icon: <Wallet size={24} />,
        perks: ['All Standard finance features', 'Manage inventory budgets', 'Advanced KRA receipting reports'],
      },
    ],
    modules: [
      { name: 'CBC Assessments', id: 'academics', enabled: true },
      { name: 'Learner Records', id: 'students', enabled: true },
      { name: 'Fees & Finance', id: 'finance', enabled: true },
      { name: 'Class Timetable', id: 'timetable', enabled: true },
      { name: 'Attendance', id: 'attendance', enabled: true },
      { name: 'Boarding & Dorms', id: 'boarding', enabled: true },
      { name: 'School Reports', id: 'analytics', enabled: true },
      { name: 'M-Pesa Payments', id: 'mpesa', enabled: true },
      { name: 'WhatsApp Alerts', id: 'whatsapp', enabled: true },
      { name: 'School Bus & Transport', id: 'transport', enabled: true },
      { name: 'Parent Portal', id: 'parents', enabled: true },
      { name: 'Stock & Inventory', id: 'inventory', enabled: true },
      { name: 'Health & Wellness', id: 'health', enabled: true },
    ],
  },
};

const COLOR_MAP: Record<Edition, { active: string; border: string }> = {
  starter: { active: 'bg-slate-800 text-white border-slate-700', border: 'border-white/10 hover:border-white/20' },
  professional: { active: 'bg-orange-600 text-white border-orange-500', border: 'border-white/10 hover:border-white/20' },
  elite: { active: 'bg-indigo-600 text-white border-indigo-500', border: 'border-white/10 hover:border-white/20' },
};

const RealRegistrationScreen: React.FC<RealRegistrationScreenProps> = ({ edition, onStartRegistration, onBack }) => {
  const config = EDITION_CONFIG[edition];
  const colors = COLOR_MAP[edition];

  const handleProceed = () => {
    const modulesToEnable = config.modules.filter(m => m.enabled).map(m => m.id);
    onStartRegistration(modulesToEnable);
  };

  return (
    <div className="h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col overflow-hidden animate-in fade-in duration-500">
      {/* Top Bar */}
      <div className="flex flex-shrink-0 items-center justify-between px-6 py-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="BrightSoma" className="h-8 w-auto object-contain" />
          <span className={`ml-2 px-3 py-1 ${config.color} text-white text-[10px] font-bold rounded-full uppercase`}>
            {config.label}
          </span>
        </div>
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 text-slate-400 hover:text-white text-xs font-bold transition-colors rounded-xl hover:bg-white/10"
        >
          <X size={14} /> Back to site
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-4 py-10 space-y-10">

          {/* Hero */}
          <div className="text-center space-y-3">
            <div className={`inline-flex items-center gap-2 px-4 py-1.5 ${config.color} rounded-full text-white text-xs font-bold`}>
              {config.badge}
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
              Start Your Free Trial<br />
              <span className="text-orange-400">{config.label}</span>
            </h1>
            <p className="text-slate-400 text-sm max-w-xl mx-auto">{config.tagline}</p>
            <p className="text-slate-500 text-xs">7-day free trial. No credit card needed. Cancel any time.</p>
          </div>

          {/* Role/User Cards */}
          <div className="space-y-4">
            <h2 className="text-white font-bold text-lg text-center">Who will be using this plan?</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {config.features.map((f, i) => (
                <div
                  key={i}
                  className={`text-left p-6 rounded-[1.5rem] border-2 bg-white/5 border-white/10 text-white`}
                >
                  <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center mb-4">
                    {f.icon}
                  </div>
                  <h3 className="font-bold text-base mb-1">{f.label}</h3>
                  <p className="text-slate-400 text-xs mb-4">{f.description}</p>
                  <ul className="space-y-1.5">
                    {f.perks.map((p, j) => (
                      <li key={j} className="flex items-center gap-2 text-xs text-slate-400">
                        <CheckCircle2 size={12} className="text-orange-400 shrink-0" />
                        {p}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          {/* Module Matrix */}
          <div className="space-y-4">
            <h2 className="text-white font-bold text-lg text-center">What's available in this plan?</h2>
            <div className="bg-white/5 rounded-[1.5rem] border border-white/10 p-6">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {config.modules.filter(m => m.enabled).map((mod, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2.5 px-4 py-3 rounded-xl border bg-white/10 border-white/20 text-white text-sm font-semibold shadow-sm"
                  >
                    <CheckCircle2 size={14} className="text-blue-500 shrink-0" />
                    <span>{mod.name}</span>
                  </div>
                ))}
              </div>
              {config.modules.filter(m => !m.enabled).length > 0 && (
                <div className="mt-6 pt-6 border-t border-white/5">
                  <p className="text-xs text-slate-500 mb-3 text-center uppercase tracking-widest font-bold">Standard Features Included</p>
                  <div className="flex flex-wrap justify-center gap-x-6 gap-y-2">
                    {config.modules.filter(m => !m.enabled).map((mod, i) => (
                      <div key={i} className="flex items-center gap-2 text-[10px] text-slate-600">
                        <Lock size={10} /> {mod.name}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action Button */}
          <div className="text-center pb-8">
            <button
              onClick={handleProceed}
              className={`inline-flex items-center gap-3 px-10 py-4 ${config.color} text-white font-bold text-sm rounded-[1.5rem] hover:opacity-90 transition-all shadow-2xl active:scale-95`}
            >
              Create My Free Account
              <ArrowRight size={18} />
            </button>
            <p className="mt-3 text-slate-500 text-xs">Takes less than 2 minutes to set up.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RealRegistrationScreen;
