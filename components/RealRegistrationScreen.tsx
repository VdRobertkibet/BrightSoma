import React from 'react';
import { UserRole } from '../types';
import {
  GraduationCap, Wallet, Shield, CheckCircle2,
  Lock, ArrowRight, X, Loader2, School, User, Phone, Mail,
  MapPin, FileText, Upload, Camera
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import toast from 'react-hot-toast';

type Edition = 'starter' | 'professional' | 'elite';

interface RealRegistrationScreenProps {
  edition: Edition;
  onStartRegistration: (modules: string[]) => void;
  setResolvedProfile: (profile: any) => void;
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

const RealRegistrationScreen: React.FC<RealRegistrationScreenProps> = ({ edition, onStartRegistration, setResolvedProfile, onBack }) => {
  const [step, setStep] = React.useState(1);
  const [isLoading, setIsLoading] = React.useState(false);
  const [formData, setFormData] = React.useState({
    schoolName: '',
    directorName: '',
    email: '',
    password: '',
    phone: '',
    motto: '',
    county: '',
    subCounty: '',
    registrationNumber: '',
  });
  const [schoolLogo, setSchoolLogo] = React.useState<string | null>(null);
  const [directorPhoto, setDirectorPhoto] = React.useState<string | null>(null);

  const handleFileRead = (file: File, setter: (b64: string) => void) => {
    if (file.size > 2 * 1024 * 1024) { toast.error('Image must be under 2MB'); return; }
    const reader = new FileReader();
    reader.onloadend = () => setter(reader.result as string);
    reader.readAsDataURL(file);
  };

  const config = EDITION_CONFIG[edition];
  const [selectedModules, setSelectedModules] = React.useState<string[]>(
    config.modules.filter(m => m.enabled).map(m => m.id)
  );

  const toggleModule = (id: string) => {
    // Only allow toggling modules that are supported in this edition
    const isSupported = config.modules.find(m => m.id === id);
    if (!isSupported) return;

    setSelectedModules(prev => 
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    );
  };

  const handleProceed = () => {
    setStep(2);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.password || !formData.schoolName) {
      toast.error("Please fill in all required fields.");
      return;
    }

    setIsLoading(true);
    try {
      const { createUserWithEmailAndPassword } = await import('firebase/auth');
      const { auth, db } = await import('../src/firebase');
      const { doc, setDoc } = await import('firebase/firestore');

      // 0. Set pending flag to prevent useAuth from signing out during the race
      sessionStorage.setItem('pending_registration', 'true');

      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      const user = userCredential.user;

      // 1. Create School Document
      await setDoc(doc(db, 'schools', user.uid), {
        name: formData.schoolName,
        directorName: formData.directorName,
        email: formData.email,
        phone: formData.phone,
        motto: formData.motto,
        county: formData.county,
        subCounty: formData.subCounty,
        registrationNumber: formData.registrationNumber,
        ...(schoolLogo ? { logo: schoolLogo } : {}),
        ...(directorPhoto ? { directorPhoto } : {}),
        edition: edition,
        enabledModules: selectedModules,
        onboardingCompleted: false,
        createdAt: new Date().toISOString()
      });

      // 2. Create Admin Profile
      await setDoc(doc(db, 'profiles', user.uid), {
        role: 'ADMIN',
        schoolId: user.uid,
        email: formData.email,
        isPlatformAdmin: false,
        onboardingCompleted: false
      });

      // 3. Manually resolve and set the profile to ensure instant transition
      const resolvedProfile = {
        role: 'ADMIN' as UserRole,
        schoolId: user.uid,
        edition: edition,
        enabledModules: selectedModules,
        isPlatformAdmin: false,
        onboardingCompleted: false
      };

      sessionStorage.removeItem('pending_registration');
      setResolvedProfile(resolvedProfile);
      
      toast.success("School registered successfully!");
      onStartRegistration(selectedModules);
    } catch (error: any) {
      console.error("Registration Error:", error);
      toast.error(error.message || "Failed to register school.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen bg-slate-50 flex flex-col overflow-hidden animate-in fade-in duration-500">
      {/* Top Bar */}
      <div className="flex flex-shrink-0 items-center justify-between px-6 py-4 border-b border-slate-100 bg-white">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center">
             <Shield size={18} className="text-white" />
          </div>
          <span className="text-sm font-bold text-slate-900">BrightSoma Registration</span>
          <span className={`ml-2 px-3 py-0.5 ${config.color} text-white text-[9px] font-bold rounded-full`}>
            {config.label}
          </span>
        </div>
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 text-slate-400 hover:text-slate-600 text-xs font-bold transition-colors rounded-xl hover:bg-slate-50"
        >
          <X size={14} /> Back to site
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-4 py-10">
          <AnimatePresence mode="wait">
            {step === 1 ? (
              <motion.div 
                key="step1"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-10"
              >
                {/* Hero */}
                <div className="text-center space-y-3">
                  <div className={`inline-flex items-center gap-2 px-4 py-1.5 ${config.color} rounded-full text-white text-[10px] font-bold`}>
                    {config.badge}
                  </div>
                  <h1 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight">
                    Setup your <span className="text-orange-500">{config.label}</span>.
                  </h1>
                  <p className="text-slate-500 text-sm max-w-xl mx-auto font-medium">{config.tagline}</p>
                </div>

                {/* Role/User Cards */}
                <div className="space-y-6">
                  <h2 className="text-slate-900 font-bold text-xl text-center">User tools in this plan</h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {config.features.map((f, i) => (
                      <div key={i} className="text-left p-8 rounded-3xl border border-slate-100 bg-white shadow-sm transition-all hover:shadow-md">
                        <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center mb-6">{f.icon}</div>
                        <h3 className="font-bold text-lg mb-2 text-slate-900">{f.label}</h3>
                        <p className="text-slate-500 text-xs mb-6 leading-relaxed">{f.description}</p>
                        <ul className="space-y-3">
                          {f.perks.map((p, j) => (
                            <li key={j} className="flex items-center gap-3 text-xs text-slate-600 font-medium">
                              <CheckCircle2 size={14} className="text-orange-500 shrink-0" />
                              {p}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Module Configuration */}
                <div className="space-y-6">
                  <div className="text-center">
                    <h2 className="text-slate-900 font-bold text-xl mb-2">Configure your modules</h2>
                    <p className="text-xs text-slate-500 font-medium">Toggle the tools you want to enable for your institution.</p>
                  </div>
                  
                  <div className="bg-white rounded-3xl border border-slate-100 p-8 shadow-sm">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {config.modules.map((mod, i) => {
                        const isSelected = selectedModules.includes(mod.id);
                        const isLocked = !mod.enabled;
                        
                        return (
                          <button 
                            key={i} 
                            disabled={isLocked}
                            onClick={() => toggleModule(mod.id)}
                            className={`flex items-center justify-between px-5 py-4 rounded-2xl border transition-all text-left group ${
                              isSelected 
                                ? 'bg-orange-50 border-orange-200 text-orange-900' 
                                : isLocked 
                                  ? 'bg-slate-50 border-slate-100 text-slate-300 opacity-60 cursor-not-allowed'
                                  : 'bg-white border-slate-100 text-slate-600 hover:border-orange-200'
                            }`}
                          >
                            <div className="flex flex-col gap-0.5">
                              <span className="text-xs font-bold">{mod.name}</span>
                              {isLocked && <span className="text-[8px] font-bold uppercase text-slate-400">Not in this plan</span>}
                            </div>
                            <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                              isSelected ? 'bg-orange-500 border-orange-500 text-white' : 'border-slate-200'
                            }`}>
                              {isSelected && <CheckCircle2 size={12} strokeWidth={3} />}
                              {isLocked && <Lock size={10} />}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="text-center pb-12">
                  <button onClick={handleProceed} className="inline-flex items-center gap-3 px-10 py-5 bg-orange-600 text-white font-bold text-sm rounded-2xl hover:bg-orange-700 transition-all shadow-xl shadow-orange-500/20 active:scale-95">
                    Proceed to identity setup <ArrowRight size={18} />
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="max-w-xl mx-auto"
              >
                <div className="bg-white rounded-[2.5rem] p-8 md:p-12 shadow-2xl space-y-8 border border-slate-100">
                  <div className="text-center space-y-2">
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">School identity</h2>
                    <p className="text-slate-500 text-sm font-medium">Let's set up your institutional credentials.</p>
                  </div>

                  <form onSubmit={handleRegister} className="space-y-5">

                    {/* ── Photo Uploads ───────────────────────── */}
                    <div className="grid grid-cols-2 gap-4">
                      {/* School Logo */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 ml-1">School Logo</label>
                        <label className="flex flex-col items-center justify-center gap-2 w-full h-28 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl cursor-pointer hover:border-orange-400 transition-all overflow-hidden relative group">
                          {schoolLogo ? (
                            <img src={schoolLogo} alt="Logo" className="w-full h-full object-cover" />
                          ) : (
                            <>
                              <Upload size={20} className="text-slate-400 group-hover:text-orange-500 transition-colors" />
                              <span className="text-[10px] font-bold text-slate-400">Upload logo</span>
                            </>
                          )}
                          <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && handleFileRead(e.target.files[0], setSchoolLogo)} />
                        </label>
                      </div>
                      {/* Director Photo */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 ml-1">Director Photo</label>
                        <label className="flex flex-col items-center justify-center gap-2 w-full h-28 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl cursor-pointer hover:border-orange-400 transition-all overflow-hidden relative group">
                          {directorPhoto ? (
                            <img src={directorPhoto} alt="Director" className="w-full h-full object-cover" />
                          ) : (
                            <>
                              <Camera size={20} className="text-slate-400 group-hover:text-orange-500 transition-colors" />
                              <span className="text-[10px] font-bold text-slate-400">Director photo</span>
                            </>
                          )}
                          <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && handleFileRead(e.target.files[0], setDirectorPhoto)} />
                        </label>
                      </div>
                    </div>

                    {/* ── School Name ─────────────────────────── */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 ml-1">School name</label>
                      <div className="relative">
                        <School className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} strokeWidth={2} />
                        <input 
                          type="text" 
                          required 
                          value={formData.schoolName}
                          onChange={e => setFormData(p => ({ ...p, schoolName: e.target.value }))}
                          placeholder="e.g. Bright Academy" 
                          className="w-full pl-12 pr-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:border-orange-500 outline-none transition-all" 
                        />
                      </div>
                    </div>

                    {/* ── School Motto ─────────────────────────── */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 ml-1">School Motto</label>
                      <div className="relative">
                        <FileText className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} strokeWidth={2} />
                        <input 
                          type="text" 
                          value={formData.motto}
                          onChange={e => setFormData(p => ({ ...p, motto: e.target.value }))}
                          placeholder="e.g. Knowledge is Power" 
                          className="w-full pl-12 pr-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:border-orange-500 outline-none transition-all" 
                        />
                      </div>
                    </div>

                    {/* ── Registration Number ──────────────────── */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 ml-1">School Registration Number</label>
                      <div className="relative">
                        <FileText className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} strokeWidth={2} />
                        <input 
                          type="text" 
                          value={formData.registrationNumber}
                          onChange={e => setFormData(p => ({ ...p, registrationNumber: e.target.value }))}
                          placeholder="e.g. MoE/2023/001" 
                          className="w-full pl-12 pr-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:border-orange-500 outline-none transition-all" 
                        />
                      </div>
                    </div>

                    {/* ── County & Sub-County ──────────────────── */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 ml-1">County</label>
                        <div className="relative">
                          <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} strokeWidth={2} />
                          <input 
                            type="text" 
                            value={formData.county}
                            onChange={e => setFormData(p => ({ ...p, county: e.target.value }))}
                            placeholder="e.g. Nairobi" 
                            className="w-full pl-12 pr-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:border-orange-500 outline-none transition-all" 
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 ml-1">Sub-County</label>
                        <div className="relative">
                          <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} strokeWidth={2} />
                          <input 
                            type="text" 
                            value={formData.subCounty}
                            onChange={e => setFormData(p => ({ ...p, subCounty: e.target.value }))}
                            placeholder="e.g. Westlands" 
                            className="w-full pl-12 pr-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:border-orange-500 outline-none transition-all" 
                          />
                        </div>
                      </div>
                    </div>

                    {/* ── Director name + Phone ────────────────── */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 ml-1">Director name</label>
                        <div className="relative">
                          <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} strokeWidth={2} />
                          <input 
                            type="text" 
                            required 
                            value={formData.directorName}
                            onChange={e => setFormData(p => ({ ...p, directorName: e.target.value }))}
                            placeholder="Full name" 
                            className="w-full pl-12 pr-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:border-orange-500 outline-none transition-all" 
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 ml-1">Official phone number</label>
                        <div className="relative">
                          <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} strokeWidth={2} />
                          <input 
                            type="tel" 
                            required 
                            value={formData.phone}
                            onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))}
                            placeholder="0712 345 678" 
                            className="w-full pl-12 pr-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:border-orange-500 outline-none transition-all" 
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 ml-1">Administrative email</label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} strokeWidth={2} />
                        <input 
                          type="email" 
                          required 
                          value={formData.email}
                          onChange={e => setFormData(p => ({ ...p, email: e.target.value }))}
                          placeholder="admin@school.com" 
                          className="w-full pl-12 pr-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:border-orange-500 outline-none transition-all" 
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 ml-1">Master password</label>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} strokeWidth={2} />
                        <input 
                          type="password" 
                          required 
                          value={formData.password}
                          onChange={e => setFormData(p => ({ ...p, password: e.target.value }))}
                          placeholder="Min. 8 characters" 
                          className="w-full pl-12 pr-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:border-orange-500 outline-none transition-all" 
                        />
                      </div>
                    </div>

                    <button 
                      disabled={isLoading}
                      className="w-full py-5 bg-orange-600 text-white font-bold rounded-2xl shadow-xl hover:bg-orange-700 active:scale-95 transition-all flex items-center justify-center gap-3"
                    >
                      {isLoading ? <Loader2 className="animate-spin" size={20} /> : (
                        <>Complete registration <CheckCircle2 size={20} /></>
                      )}
                    </button>
                    
                    <button 
                      type="button"
                      onClick={() => setStep(1)}
                      className="w-full text-[10px] font-bold text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      Back to plan selection
                    </button>
                  </form>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default RealRegistrationScreen;
