import React, { useState, useEffect, useRef } from 'react';
import { UserRole } from '../types';
import { 
  Shield, ShieldCheck, Users, GraduationCap, ArrowRight, CheckCircle2,
  Wallet, Lock, ArrowLeft, Loader2, School as SchoolIcon, Activity,
  Mail, Eye, EyeOff, Sparkles, ChevronDown, ChevronRight, ArrowUp,
  BookOpen, BarChart3, Bus, Heart, Package, Calendar, MessageSquare,
  Zap, Globe, Star, Check, Play, Menu, X, Smartphone, Award,
  Clock, Database, Search, Layout, Bell, MessageCircle, Briefcase
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db, auth } from '../src/firebase';
import { collection, query, where, getDocs, setDoc, doc, getDoc } from 'firebase/firestore';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import toast from 'react-hot-toast';
import DemoOnboardingScreen from './DemoOnboardingScreen';
import RealRegistrationScreen from './RealRegistrationScreen';
import { useAuth } from '../hooks/useAuth';

import { useNavigate } from 'react-router-dom';

interface LandingPageProps {
  isDarkMode: boolean;
}


const roles = [
  { role: 'ADMIN' as const, title: 'School director', description: 'Institutional oversight and strategy.', icon: <ShieldCheck size={24} strokeWidth={1.5} />, color: 'text-orange-600 bg-orange-50' },
  { role: 'TEACHER' as const, title: 'Teacher', description: 'CBC assessments and learner growth.', icon: <Users size={24} strokeWidth={1.5} />, color: 'text-orange-500 bg-orange-50/50' },
  { role: 'PRINCIPAL' as const, title: 'Principal', description: 'Academic health and staff performance.', icon: <GraduationCap size={24} strokeWidth={1.5} />, color: 'text-emerald-600 bg-emerald-50' },
  { role: 'FINANCE' as const, title: 'Finance officer', description: 'Fee collection and eTIMS compliance.', icon: <Wallet size={24} strokeWidth={1.5} />, color: 'text-violet-600 bg-violet-50' },
  { role: 'PLATFORM_ADMIN' as const, title: 'System owner', description: 'Global platform control.', icon: <Activity size={24} strokeWidth={1.5} />, color: 'text-slate-600 bg-slate-50' },
];

const pricingPlans = [
  {
    name: 'Starter Kit', price: '3,000', period: '/ Term', cap: 'Up To 100 Learners', popular: false,
    features: ['Learner Directory', 'Cbc Assessment Tools', 'Basic Attendance', 'School Profile', 'Messaging Support'],
    cta: 'Get Started',
  },
  {
    name: 'Professional', price: '8,000', period: '/ Term', cap: '100-500 Learners', popular: true,
    features: ['Everything In Starter', 'M-Pesa Fee Collection', 'Etims Receipting', 'Staff Management', 'Communication Hub', 'Academic Analytics', 'Sms & Whatsapp Alerts'],
    cta: 'Most Popular',
  },
  {
    name: 'Elite Edition', price: '15,000', period: '/ Term', cap: 'Unlimited Learners', popular: false,
    features: ['Everything In Professional', 'Boarding & Dorms', 'Transport Lifecycle', 'Inventory Control', 'Advanced Analytics', 'Bank Reconciliation', 'Intelligent Notifications'],
    cta: 'Go Super',
  },
];

const featureModules = [
  { icon: <BarChart3 size={24} strokeWidth={1.5} />, name: 'Analytics', desc: 'Real-time performance insights.', color: 'text-orange-600' },
  { icon: <BookOpen size={24} strokeWidth={1.5} />, name: 'CBC engine', desc: 'Automated grading and reports.', color: 'text-orange-500' },
  { icon: <Wallet size={24} strokeWidth={1.5} />, name: 'Financials', desc: 'M-Pesa and eTIMS integrated.', color: 'text-emerald-600' },
  { icon: <MessageCircle size={24} strokeWidth={1.5} />, name: 'WhatsApp', desc: 'Direct school-parent links.', color: 'text-orange-400' },
];

const testimonies = [
  { name: 'Mary Njenga', role: 'Principal', quote: 'CBC marks are now automated, saving teachers hours.' },
  { name: 'James Kamau', role: 'Director', quote: 'M-Pesa collection has improved our cashflow significantly.' },
  { name: 'Sarah Wambui', role: 'Finance', quote: 'The eTIMS integration is a lifesaver for our tax compliance.' },
];

export default function LandingPage({ isDarkMode }: LandingPageProps) {
  const navigate = useNavigate();
  const { setResolvedProfile } = useAuth();
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [showSignInMenu, setShowSignInMenu] = useState(false);
  const signInMenuRef = useRef<HTMLDivElement>(null);

  
  const directorImg = "/assets/director.png";
  const studentsImg = "/assets/students.png";

  useEffect(() => {
    const onScroll = () => setShowScrollTop(window.scrollY > 500);
    window.addEventListener('scroll', onScroll, { passive: true });
    
    const handleClickOutside = (event: MouseEvent) => {
      if (signInMenuRef.current && !signInMenuRef.current.contains(event.target as Node)) {
        setShowSignInMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    
    return () => {
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);


  const navLinks = ['Features', 'Pricing', 'Testimonials'];

  const [showRegistration, setShowRegistration] = useState(false);
  const [selectedEdition, setSelectedEdition] = useState<'starter' | 'professional' | 'elite'>('starter');

  const roles = [
    { role: 'Admin', title: 'Director Portal', description: 'School management and settings', icon: <Shield />, color: 'bg-orange-600' },
    { role: 'Teacher', title: 'Teacher Portal', description: 'Classroom and learner management', icon: <GraduationCap />, color: 'bg-orange-600' },
    { role: 'Principal', title: 'Principal Portal', description: 'Academic and staff oversight', icon: <BookOpen />, color: 'bg-orange-600' },
    { role: 'Finance', title: 'Finance Portal', description: 'Fees and institutional accounting', icon: <Wallet />, color: 'bg-orange-600' },
    { role: 'Platform_Admin', title: 'System Owner', description: 'Platform-wide configuration', icon: <Briefcase />, color: 'bg-slate-900' },
  ];

  if (showRegistration) {
    return (
      <RealRegistrationScreen 
        edition={selectedEdition}
        onBack={() => setShowRegistration(false)}
        setResolvedProfile={setResolvedProfile}
        onStartRegistration={(modules) => {
          console.log("Starting registration with modules:", modules);
          setShowRegistration(false);
          toast.success("Welcome aboard! Let's get your school set up.");
        }}
      />
    );
  }

  return (
    <div className="relative min-h-screen bg-white text-slate-800 font-sans selection:bg-orange-100 selection:text-orange-900 overflow-x-hidden">
      
      {/* ─── NAVIGATION ─────────────────────────────────────────── */}
      <header className="fixed top-0 inset-x-0 z-[100] bg-white/70 backdrop-blur-xl border-b border-slate-100 h-20">
        <div className="max-w-7xl mx-auto px-6 h-full flex items-center">
          {/* Logo Area */}
          <div className="w-48 flex-shrink-0">
            <div className="flex items-center gap-3 group cursor-pointer" onClick={() => window.scrollTo({top:0, behavior:'smooth'})}>
              <div className="w-10 h-10 rounded-2xl bg-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/10">
                <SchoolIcon size={22} className="text-white" strokeWidth={1.5} />
              </div>
              <span className="text-xl font-medium tracking-tight text-slate-900">Bright<span className="text-orange-500">Soma</span></span>
            </div>
          </div>

          {/* Centered Navigation */}
          <nav className="hidden md:flex flex-1 items-center justify-center gap-10">
            {navLinks.map(l => (
              <a key={l} href={`#${l.toLowerCase()}`} className="text-sm font-medium text-slate-500 hover:text-orange-600 transition-colors tracking-wider">{l}</a>
            ))}
            
            <div className="relative" ref={signInMenuRef}>
              <button 
                onClick={() => setShowSignInMenu(!showSignInMenu)} 
                className={`flex items-center gap-2 text-sm font-bold transition-all ${
                  showSignInMenu ? 'text-orange-600' : 'text-slate-900 hover:text-orange-600'
                }`}
              >
                Sign In
                <ChevronDown size={14} className={`transition-transform duration-300 ${showSignInMenu ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {showSignInMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: 15, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 15, scale: 0.95 }}
                    className="absolute top-full left-1/2 -translate-x-1/2 mt-6 w-[640px] bg-white rounded-[2.5rem] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)] border border-slate-100 p-8 z-[110] overflow-hidden"
                  >
                    {/* Background Decor */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-orange-50 rounded-bl-[4rem] pointer-events-none" />
                    
                    <div className="mb-8 flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-black text-orange-600 uppercase tracking-[0.2em] mb-1">Institutional Gateways</p>
                        <h3 className="text-xl font-black text-slate-900 tracking-tight">Select your portal</h3>
                      </div>
                      <Sparkles size={20} className="text-orange-200" />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {roles.map((item, i) => (
                        <button
                          key={item.role}
                          onClick={() => {
                            setShowSignInMenu(false);
                            navigate(`/login/${item.role.toLowerCase() === 'admin' ? 'director' : item.role.toLowerCase()}`);
                          }}
                          className="group flex items-center gap-4 p-4 rounded-2xl bg-slate-50 hover:bg-white hover:shadow-xl hover:shadow-orange-500/5 border border-transparent hover:border-orange-100 transition-all text-left"
                        >
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${item.color} shadow-lg shadow-orange-500/20 group-hover:scale-110 transition-transform shrink-0`}>
                             <div className="text-white flex items-center justify-center">
                               {React.cloneElement(item.icon as React.ReactElement, { size: 22, strokeWidth: 2, className: "text-white" })}
                             </div>
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-900 group-hover:text-orange-600 transition-colors">{item.title}</p>
                            <p className="text-[9px] text-slate-500 font-medium line-clamp-1">{item.description}</p>
                          </div>
                          <ChevronRight size={14} className="ml-auto text-slate-300 group-hover:text-orange-500 transition-colors" />
                        </button>
                      ))}
                    </div>

                    <div className="mt-8 pt-6 border-t border-slate-50 flex items-center justify-between">
                       <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Secure Institutional Access</p>
                       <button 
                         onClick={() => { setShowSignInMenu(false); navigate('/signin'); }}
                         className="text-[9px] font-black text-orange-600 uppercase tracking-widest hover:translate-x-1 transition-transform flex items-center gap-1.6"
                       >
                         Gateway Grid <ArrowRight size={12} />
                       </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </nav>

          {/* Right Spacing / CTA Area */}
          <div className="w-48 hidden md:flex justify-end">
             <button onClick={() => { document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' }); }} className="px-5 py-2 bg-slate-900 text-white rounded-full text-[10px] font-bold tracking-widest hover:bg-orange-600 transition-all active:scale-95">Get Started</button>
          </div>

        </div>
      </header>

      {/* ─── HERO SECTION ───────────────────────────────────────── */}
      <section className="relative px-6 pt-44 pb-32">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-20 items-center">
          <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8 }} className="animate-zoom-spread">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-50 text-orange-600 rounded-full text-[10px] font-medium tracking-[0.2em] mb-8 border border-orange-100">
               <Sparkles size={14} strokeWidth={1.5} /> The Standard For Kenyan Academies
            </div>
            <h1 className="text-6xl md:text-8xl font-medium tracking-tighter leading-[0.9] text-slate-900 mb-10">
              Education<br />management <span className="text-orange-500 italic">redefined.</span>
            </h1>
            <p className="text-xl text-slate-500 font-medium max-w-xl leading-relaxed mb-12">
              BrightSoma is built for the Kenyan context—automating CBC assessments, M-Pesa fee collections, and school financials in one clean interface.
            </p>
            <div className="flex flex-wrap gap-4">
               <button onClick={() => { document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' }); }} className="px-10 py-5 bg-orange-600 text-white rounded-2xl text-xs font-medium tracking-wide hover:shadow-2xl hover:shadow-orange-200 transition-all active:scale-95">Enroll your institution</button>
               <button className="px-10 py-5 border border-slate-200 rounded-2xl text-xs font-medium tracking-wide hover:bg-slate-50 transition-all flex items-center gap-2">Watch demo <Play size={14} fill="currentColor" /></button>
            </div>

          </motion.div>

          <div className="relative">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1 }} className="relative z-10 rounded-[4rem] overflow-hidden shadow-2xl bg-white border border-slate-50">
               <img src={directorImg} alt="Kenya School Director" className="w-full h-full object-cover grayscale-[20%] hover:grayscale-0 transition-all duration-700" />
            </motion.div>
            <motion.div initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5, duration: 1 }} className="absolute -bottom-10 -left-20 z-20 w-80 h-[300px] border-8 border-white rounded-[3rem] overflow-hidden shadow-2xl hidden md:block">
               <img src={studentsImg} alt="Classroom Learning" className="w-full h-full object-cover" />
            </motion.div>
          </div>
        </div>
      </section>

      {/* ─── SMART FEATURES SHOWCASE ──────────────────────────── */}
      <section id="features" className="py-32 bg-white relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-24">
            <h2 className="text-4xl md:text-6xl font-medium tracking-tight text-slate-900 mb-6">Smart features, <span className="text-orange-500 italic">one interface.</span></h2>
            <p className="text-lg text-slate-500 max-w-2xl mx-auto font-medium">Data-driven decisions start with integrated modules that talk to each other.</p>
          </div>

          <div className="grid lg:grid-cols-2 gap-20 items-center">
            {/* Mock Dashboard Showcase */}
            <div className="relative h-[650px] flex items-center justify-center">
               {/* Main Dashboard UI Card */}
               <motion.div initial={{ opacity: 0, scale: 0.8 }} whileInView={{ opacity: 1, scale: 1 }} className="w-full max-w-md bg-white border border-slate-100 rounded-[3rem] shadow-3xl p-10 relative z-10 overflow-hidden">
                  <div className="flex items-center justify-between mb-10">
                     <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-orange-600 rounded-xl flex items-center justify-center"><Layout size={18} className="text-white" /></div>
                        <div>
                           <div className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">Dashboard</div>
                           <div className="text-sm font-medium text-slate-900">Control Center</div>
                        </div>
                     </div>
                     <Search size={20} className="text-slate-300" strokeWidth={1.5} />
                  </div>
                  <div className="grid grid-cols-2 gap-4 mb-10">
                     <div className="p-5 bg-orange-50 rounded-3xl space-y-3">
                        <Wallet className="text-orange-600" size={20} strokeWidth={1.5} />
                        <div>
                           <div className="text-[9px] font-medium text-orange-600/60 uppercase tracking-widest">Fee Collection</div>
                           <div className="text-lg font-medium text-orange-950">92% Met</div>
                        </div>
                     </div>
                     <div className="p-5 bg-slate-50 rounded-3xl space-y-3">
                        <Users className="text-slate-600" size={20} strokeWidth={1.5} />
                        <div>
                           <div className="text-[9px] font-medium text-slate-600/60 uppercase tracking-widest">Learners</div>
                           <div className="text-lg font-medium text-slate-950">Active Now</div>
                        </div>
                     </div>
                  </div>
                  <div className="space-y-4">
                     {[
                       { label: 'Academic Performance', val: 'Improving', col: 'bg-emerald-100 text-emerald-700' },
                       { label: 'Staff Attendance', val: 'On Track', col: 'bg-blue-100 text-blue-700' },
                       { label: 'Inventory Health', val: 'Stable', col: 'bg-slate-100 text-slate-700' }
                     ].map((item, i) => (
                        <div key={i} className="flex items-center justify-between p-4 border border-slate-50 rounded-2xl">
                           <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center"><Clock size={16} className="text-slate-400" /></div>
                              <span className="text-xs font-medium text-slate-600">{item.label}</span>
                           </div>
                           <span className={`text-[9px] font-medium uppercase tracking-widest px-2 py-1 rounded-full ${item.col}`}>{item.val}</span>
                        </div>
                     ))}
                  </div>
               </motion.div>

               {/* Satellite "Child Cards" */}
               <motion.div animate={{ y: [0, -20, 0] }} transition={{ duration: 4, repeat: Infinity }} className="absolute -top-10 right-0 z-20 p-6 bg-white border border-slate-100 rounded-3xl shadow-xl flex items-center gap-4">
                  <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center"><CheckCircle2 size={24} strokeWidth={1.5} /></div>
                  <div>
                    <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">Enrollment</p>
                    <p className="text-sm font-medium text-slate-800">New Learner Registered</p>
                  </div>
               </motion.div>

               <motion.div animate={{ y: [0, 20, 0] }} transition={{ duration: 5, repeat: Infinity }} className="absolute bottom-10 -left-10 z-20 p-6 bg-white border border-slate-100 rounded-3xl shadow-xl flex items-center gap-4">
                  <div className="w-12 h-12 bg-violet-50 text-violet-600 rounded-2xl flex items-center justify-center"><Smartphone size={24} strokeWidth={1.5} /></div>
                  <div>
                    <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">M-Pesa</p>
                    <p className="text-sm font-medium text-slate-800">Fee Payment Success</p>
                  </div>
               </motion.div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-10">
               {featureModules.concat([
                 { icon: <Bell size={24} strokeWidth={1.5} />, name: 'Smart Alerts', desc: 'Instant Push & Data Notifications.', color: 'text-rose-600' },
                 { icon: <MessageSquare size={24} strokeWidth={1.5} />, name: 'Sms Hub', desc: 'Secure Mass Communication.', color: 'text-teal-600' }
               ]).map((m, i) => (
                  <div key={i} className="group p-8 rounded-[2.5rem] border border-slate-100 hover:border-orange-200 transition-all duration-500">
                     <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 bg-white border border-slate-100 ${m.color} shadow-sm group-hover:scale-110 group-hover:rotate-6 transition-transform duration-500`}>
                        {m.icon}
                     </div>
                     <h3 className="text-xl font-medium text-slate-900 mb-3 tracking-tight">{m.name}</h3>
                     <p className="text-sm text-slate-500 font-medium leading-relaxed">{m.desc}</p>
                  </div>
               ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── PRICING ────────────────────────────────────────────── */}
      <section id="pricing" className="py-32 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
             <h2 className="text-4xl md:text-6xl font-medium tracking-tight text-slate-900 mb-6">Simple, fair pricing.</h2>
             <p className="text-lg text-slate-500 font-medium italic mb-12">Pay per term for predictable school growth.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {pricingPlans.map((plan, i) => (
              <div key={i} className={`relative p-12 rounded-[3.5rem] border ${plan.popular ? 'border-orange-500 shadow-2xl shadow-orange-100' : 'border-slate-100'} transition-all hover:-translate-y-2 duration-500`}>
                {plan.popular && <div className="absolute top-8 right-8 bg-orange-600 text-white text-[9px] font-medium px-3 py-1 rounded-full">Most popular</div>}
                <div className="mb-10">
                   <h3 className="text-xs font-medium text-slate-400 mb-6">{plan.name}</h3>
                   <div className="flex items-baseline gap-2">
                      <span className="text-5xl font-medium text-slate-900 tracking-tighter">Kes {plan.price}</span>
                      <span className="text-sm font-medium text-slate-400">{plan.period}</span>
                   </div>
                   <p className="mt-4 text-xs font-medium text-orange-600">{plan.cap}</p>
                </div>
                <ul className="space-y-4 mb-12 border-t border-slate-50 pt-8">
                  {plan.features.map((f, j) => (
                    <li key={j} className="flex items-center gap-3 text-sm font-medium text-slate-500">
                       <Check size={16} className="text-emerald-500" strokeWidth={2} /> {f}
                    </li>
                  ))}
                </ul>
                <button 
                  onClick={() => { 
                    setSelectedEdition(plan.name.toLowerCase().includes('starter') ? 'starter' : plan.name.toLowerCase().includes('professional') ? 'professional' : 'elite');
                    setShowRegistration(true);
                  }}
                  className={`w-full py-5 rounded-2xl text-xs font-medium transition-all active:scale-95 ${plan.popular ? 'bg-orange-600 text-white shadow-xl shadow-orange-200' : 'bg-slate-900 text-white'}`}
                >
                  {plan.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── TESTIMONIALS ───────────────────────────────────────── */}
      <section id="testimonials" className="py-32 bg-white">
        <div className="max-w-7xl mx-auto px-6">
           <div className="grid md:grid-cols-3 gap-12">
              {testimonies.map((t, i) => (
                <div key={i} className="p-10 bg-slate-50 rounded-[2.5rem] relative group">
                   <div className="flex gap-1 mb-6">
                      {[1,2,3,4,5].map(s => <Star key={s} size={14} fill="#f97316" className="text-orange-500" />)}
                   </div>
                   <p className="text-lg font-medium text-slate-700 italic mb-8">"{t.quote}"</p>
                   <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center font-medium text-orange-600 border border-slate-100 shadow-sm">{t.name[0]}</div>
                      <div>
                         <p className="text-sm font-medium text-slate-900">{t.name}</p>
                         <p className="text-[10px] font-medium text-slate-400">{t.role}</p>
                      </div>
                   </div>
                </div>
              ))}
           </div>
        </div>
      </section>


      {/* ─── FOOTER ─────────────────────────────────────────────── */}
      <footer className="py-24 px-6 border-t border-slate-50 bg-white">
        <div className="w-full">
          <div className="grid md:grid-cols-4 gap-16 mb-20 px-6">
             <div className="space-y-6">
                <div className="flex items-center gap-3">
                   <div className="w-8 h-8 rounded-xl bg-slate-900 flex items-center justify-center">
                      <SchoolIcon size={18} className="text-white" strokeWidth={1.5} />
                   </div>
                    <span className="text-sm font-medium">Bright<span className="text-orange-500">Soma</span></span>
                </div>
                <p className="text-xs text-slate-400 font-medium leading-relaxed">The operating system for modern Kenyan education. Compliant, integrated, and scalable.</p>
                <div className="flex gap-4">
                   <Globe size={18} className="text-slate-300" strokeWidth={1.5} />
                   <Database size={18} className="text-slate-300" strokeWidth={1.5} />
                   <Award size={18} className="text-slate-300" strokeWidth={1.5} />
                </div>
             </div>
             <div>
                <h4 className="text-[10px] font-medium text-slate-900 uppercase tracking-[0.3em] mb-8">Platform</h4>
                <ul className="space-y-4 text-[11px] font-medium text-slate-500 tracking-widest">
                   <li><a href="#" className="hover:text-orange-600 transition-colors">Cbc Assessment</a></li>
                   <li><a href="#" className="hover:text-orange-600 transition-colors">Fee Management</a></li>
                   <li><a href="#" className="hover:text-orange-600 transition-colors">Staff Directory</a></li>
                   <li><a href="#" className="hover:text-orange-600 transition-colors">Kra Etims Sync</a></li>
                </ul>
             </div>
             <div>
                <h4 className="text-[10px] font-medium text-slate-900 uppercase tracking-[0.3em] mb-8">Company</h4>
                <ul className="space-y-4 text-[11px] font-medium text-slate-500 tracking-widest">
                   <li><a href="#" className="hover:text-orange-600 transition-colors">About Story</a></li>
                   <li><a href="#" className="hover:text-orange-600 transition-colors">Partner Program</a></li>
                   <li><a href="#" className="hover:text-orange-600 transition-colors">Security Model</a></li>
                   <li><a href="#" className="hover:text-orange-600 transition-colors">Privacy Ethics</a></li>
                </ul>
             </div>
             <div>
                <h4 className="text-[10px] font-medium text-slate-900 uppercase tracking-[0.3em] mb-8">Legal</h4>
                <div className="p-6 bg-white border border-slate-100 rounded-[2rem] shadow-sm">
                   <p className="text-[10px] font-medium text-slate-400 leading-relaxed tracking-widest mb-4">BrightSoma Technologies Ltd. All Rights Reserved. 2026.</p>
                   <a href="https://wa.me/254757956643" target="_blank" className="text-[9px] font-medium text-orange-600 tracking-widest underline decoration-orange-200">Contact Support</a>
                </div>
             </div>
          </div>
          <div className="text-center pt-10 border-t border-slate-50">
             <p className="text-[9px] font-medium text-slate-300">Built for the excellence of Kenyan learners.</p>
          </div>
        </div>
      </footer>

      {/* ─── SCROLL TO TOP ──────────────────────────────────────── */}
      <AnimatePresence>
        {showScrollTop && (
          <motion.button initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0 }}
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="fixed bottom-10 right-10 w-14 h-14 bg-slate-900 text-white rounded-3xl shadow-3xl flex items-center justify-center hover:bg-orange-600 transition-all z-[150] active:scale-95"
          >
            <ArrowUp size={24} strokeWidth={1.5} />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
