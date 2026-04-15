import React, { useState } from 'react';
import { UserRole } from '../types';
import {
  GraduationCap, Users, Wallet, BookOpen, Home, Bus,
  Package, BarChart3, MessageSquare, Shield, CheckCircle2,
  Lock, ArrowRight, X, User, Settings
} from 'lucide-react';

type Edition = 'starter' | 'professional' | 'elite';

interface DemoOnboardingScreenProps {
  edition: Edition;
  onSelectRole: (role: UserRole) => void;
  onBack: () => void;
}

const EDITION_CONFIG: Record<Edition, {
  label: string;
  color: string;
  borderColor: string;
  textColor: string;
  bgGrad: string;
  tagline: string;
  roles: { role: UserRole; label: string; icon: React.ReactNode; description: string; permissions: string[] }[];
  modules: { name: string; enabled: boolean }[];
}> = {
  starter: {
    label: 'Starter Kit',
    color: 'bg-slate-700',
    borderColor: 'border-slate-600',
    textColor: 'text-slate-700',
    bgGrad: 'from-slate-50 to-slate-100/50',
    tagline: 'Perfect for small & nursery schools — up to 150 learners.',
    roles: [
      {
        role: 'ADMIN',
        label: 'School Director',
        icon: <Shield size={24} />,
        description: 'Manage the full school — learners, fees, timetable, and CBC assessments.',
        permissions: ['Learner registration', 'Fee recording & invoices', 'CBC assessment entry', 'Class timetable', 'Teacher management'],
      },
      {
        role: 'TEACHER',
        label: 'Class Teacher',
        icon: <GraduationCap size={24} />,
        description: 'Record attendance, enter CBC marks, and manage your assigned class.',
        permissions: ['Attendance marking', 'CBC mark entry', 'View class timetable', 'View learner list', 'Fee balance view'],
      },
    ],
    modules: [
      { name: 'CBC Assessments', enabled: true },
      { name: 'Learner Management', enabled: true },
      { name: 'Finance & Invoices', enabled: true },
      { name: 'Class Timetable', enabled: true },
      { name: 'Attendance', enabled: true },
      { name: 'Boarding Module', enabled: false },
      { name: 'Transport & Driver', enabled: false },
      { name: 'Parent Portal', enabled: false },
      { name: 'Inventory', enabled: false },
      { name: 'Advanced Analytics', enabled: false },
      { name: 'M-Pesa Integration', enabled: false },
      { name: 'WhatsApp Alerts', enabled: false },
      { name: 'Health & Wellness', enabled: true },
    ],
  },
  professional: {
    label: 'Professional Kit',
    color: 'bg-orange-600',
    borderColor: 'border-orange-500',
    textColor: 'text-orange-600',
    bgGrad: 'from-orange-50 to-orange-100/30',
    tagline: 'Full school management for 151–500 learners.',
    roles: [
      {
        role: 'ADMIN',
        label: 'School Director',
        icon: <Shield size={24} />,
        description: 'Complete school control — all modules, fee collection, boarding, and analytics.',
        permissions: ['All Starter features', 'M-Pesa fee collection', 'KRA eTIMS receipts', 'Boarding & pocket money', 'Analytics & reports'],
      },
      {
        role: 'TEACHER',
        label: 'Class Teacher',
        icon: <GraduationCap size={24} />,
        description: 'Full class management with CBC grading and communication tools.',
        permissions: ['All Starter teacher features', 'Send parent notifications', 'WhatsApp integration', 'Term report generation'],
      },
      {
        role: 'FINANCE',
        label: 'Finance Officer',
        icon: <Wallet size={24} />,
        description: 'Handle all fee collection, M-Pesa, invoicing, and eTIMS receipting.',
        permissions: ['Fee collection & recording', 'M-Pesa STK Push', 'Invoice & receipt printing', 'KRA eTIMS integration', 'Finance reports'],
      },
    ],
    modules: [
      { name: 'CBC Assessments', enabled: true },
      { name: 'Learner Management', enabled: true },
      { name: 'Finance & Invoices', enabled: true },
      { name: 'Class Timetable', enabled: true },
      { name: 'Attendance', enabled: true },
      { name: 'Boarding Module', enabled: true },
      { name: 'Analytics & Reports', enabled: true },
      { name: 'M-Pesa Integration', enabled: true },
      { name: 'WhatsApp Alerts', enabled: true },
      { name: 'Transport & Driver', enabled: false },
      { name: 'Parent Portal', enabled: false },
      { name: 'Inventory', enabled: false },
      { name: 'Health & Wellness', enabled: true },
    ],
  },
  elite: {
    label: 'Elite Kit',
    color: 'bg-indigo-600',
    borderColor: 'border-indigo-500',
    textColor: 'text-indigo-600',
    bgGrad: 'from-indigo-50 to-purple-50/30',
    tagline: 'Everything unlocked — for large schools & groups of 500+ learners.',
    roles: [
      {
        role: 'ADMIN',
        label: 'School Director',
        icon: <Shield size={24} />,
        description: 'Full institution control — every module, every role, and priority support.',
        permissions: ['All Standard features', 'Inventory & procurement', 'Transport management', 'Parent portal control', 'Priority onboarding'],
      },
      {
        role: 'TEACHER',
        label: 'Class Teacher',
        icon: <GraduationCap size={24} />,
        description: 'Teaching tools for large schools with full communication and reporting suite.',
        permissions: ['All Standard teacher features', 'Bulk SMS to parents', 'Advanced CBC portfolio'],
      },
      {
        role: 'FINANCE',
        label: 'Finance Officer',
        icon: <Wallet size={24} />,
        description: 'Full finance suite with inventory purchasing and advanced KRA compliance.',
        permissions: ['All Standard finance features', 'Inventory budget control', 'Advanced eTIMS reporting'],
      },
      {
        role: 'PRINCIPAL',
        label: 'Principal / Headteacher',
        icon: <Settings size={24} />,
        description: 'Institutional health, analytics, and staff performance.',
        permissions: ['All school analytics', 'Staff performance', 'Multi-level reporting', 'Budget overview', 'Strategic KPIs'],
      },
      {
        role: 'PARENT',
        label: 'Parent Portal',
        icon: <User size={24} />,
        description: 'Parents can view their child\'s attendance, fees, and CBC results in real time.',
        permissions: ['View child\'s CBC results', 'Fee balance & receipts', 'Attendance reports', 'School announcements'],
      },
    ],
    modules: [
      { name: 'CBC Assessments', enabled: true },
      { name: 'Learner Management', enabled: true },
      { name: 'Finance & Invoices', enabled: true },
      { name: 'Class Timetable', enabled: true },
      { name: 'Attendance', enabled: true },
      { name: 'Boarding Module', enabled: true },
      { name: 'Analytics & Reports', enabled: true },
      { name: 'M-Pesa Integration', enabled: true },
      { name: 'WhatsApp Alerts', enabled: true },
      { name: 'Transport & Driver', enabled: true },
      { name: 'Parent Portal', enabled: true },
      { name: 'Inventory', enabled: true },
      { name: 'Health & Wellness', enabled: true },
    ],
  },
};

const COLOR_MAP: Record<Edition, { active: string; badge: string; border: string }> = {
  starter: { active: 'bg-slate-800 text-white border-slate-700', badge: 'bg-slate-100 text-slate-700', border: 'border-slate-300 hover:border-slate-500' },
  professional: { active: 'bg-orange-600 text-white border-orange-500', badge: 'bg-orange-100 text-orange-700', border: 'border-slate-200 hover:border-orange-400' },
  elite: { active: 'bg-indigo-600 text-white border-indigo-500', badge: 'bg-indigo-100 text-indigo-700', border: 'border-slate-200 hover:border-indigo-400' },
};

const DemoOnboardingScreen: React.FC<DemoOnboardingScreenProps> = ({ edition, onSelectRole, onBack }) => {
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const config = EDITION_CONFIG[edition];
  const colors = COLOR_MAP[edition];

  return (
    <div className="h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col overflow-hidden animate-in fade-in duration-500">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="BrightSoma" className="h-8 w-auto object-contain" />
          <span className={`ml-2 px-3 py-1 ${config.color} text-white text-[10px] font-black rounded-full tracking-widest uppercase`}>
            {config.label}
          </span>
        </div>
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 text-slate-400 hover:text-white text-xs font-bold transition-colors rounded-xl hover:bg-white/10"
        >
          <X size={14} /> Back to landing
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-4 py-10 space-y-10">

          {/* Hero */}
          <div className="text-center space-y-3">
            <div className={`inline-flex items-center gap-2 px-4 py-1.5 ${config.color} rounded-full text-white text-xs font-bold`}>
              🎮 Demo Mode Active
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">
              Welcome to BrightSoma<br />
              <span className="text-orange-400">{config.label}</span>
            </h1>
            <p className="text-slate-400 text-sm max-w-xl mx-auto">{config.tagline}</p>
            <p className="text-slate-500 text-xs">No data is saved. This is a safe exploration environment.</p>
          </div>

          {/* Step: Pick your role */}
          <div className="space-y-4">
            <h2 className="text-white font-bold text-lg text-center">Step 1 — Choose your role</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {config.roles.map((r) => (
                <button
                  key={r.role}
                  onClick={() => setSelectedRole(r.role)}
                  className={`relative text-left p-6 rounded-[1.5rem] border-2 transition-all duration-200 group ${
                    selectedRole === r.role
                      ? `${colors.active} shadow-2xl scale-[1.02]`
                      : `bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 text-white`
                  }`}
                >
                  {selectedRole === r.role && (
                    <div className="absolute top-4 right-4">
                      <CheckCircle2 size={18} className="text-white" />
                    </div>
                  )}
                  <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    {r.icon}
                  </div>
                  <h3 className="font-black text-base mb-1">{r.label}</h3>
                  <p className={`text-xs mb-4 ${selectedRole === r.role ? 'text-white/80' : 'text-slate-400'}`}>{r.description}</p>
                  <ul className="space-y-1.5">
                    {r.permissions.map((p, i) => (
                      <li key={i} className={`flex items-center gap-2 text-xs ${selectedRole === r.role ? 'text-white/90' : 'text-slate-400'}`}>
                        <CheckCircle2 size={12} className={selectedRole === r.role ? 'text-white' : 'text-orange-400'} />
                        {p}
                      </li>
                    ))}
                  </ul>
                </button>
              ))}
            </div>
          </div>

          {/* Feature Matrix */}
          <div className="space-y-4">
            <h2 className="text-white font-bold text-lg text-center">Step 2 — Modules in this edition</h2>
            <div className="bg-white/5 rounded-[1.5rem] border border-white/10 p-6">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {config.modules.map((mod, i) => (
                  <div
                    key={i}
                    className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border text-sm font-semibold ${
                      mod.enabled
                        ? 'bg-white/10 border-white/20 text-white'
                        : 'bg-black/20 border-white/5 text-slate-600'
                    }`}
                  >
                    {mod.enabled
                      ? <CheckCircle2 size={14} className="text-green-400 shrink-0" />
                      : <Lock size={14} className="text-slate-600 shrink-0" />
                    }
                    <span className={mod.enabled ? '' : 'line-through'}>{mod.name}</span>
                  </div>
                ))}
              </div>
              {config.modules.filter(m => !m.enabled).length > 0 && (
                <p className="text-xs text-slate-500 mt-4 text-center">
                  🔒 Locked modules are available in a higher edition. <span className="text-orange-400 font-bold">Upgrade anytime.</span>
                </p>
              )}
            </div>
          </div>

          {/* Enter Button */}
          <div className="text-center pb-8">
            {selectedRole ? (
              <button
                onClick={() => onSelectRole(selectedRole)}
                className={`inline-flex items-center gap-3 px-10 py-4 ${config.color} text-white font-black text-sm rounded-[1.5rem] hover:opacity-90 transition-all shadow-2xl active:scale-95`}
              >
                Enter as {config.roles.find(r => r.role === selectedRole)?.label}
                <ArrowRight size={18} />
              </button>
            ) : (
              <p className="text-slate-500 text-sm">← Select a role above to continue</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DemoOnboardingScreen;
