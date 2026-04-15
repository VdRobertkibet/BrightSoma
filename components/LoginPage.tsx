import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { UserRole } from '../types';
import { 
  ShieldCheck, Users, GraduationCap, Wallet, Activity, Lock, Mail, Eye, EyeOff, 
  Loader2, CheckCircle2, ArrowLeft, ArrowRight, School as SchoolIcon 
} from 'lucide-react';

import { motion, AnimatePresence } from 'motion/react';
import { db, auth } from '../src/firebase';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import toast from 'react-hot-toast';

const roles = [
  { role: 'admin', title: 'School Director', icon: <ShieldCheck size={24} strokeWidth={1.5} />, color: 'text-orange-600 bg-orange-50' },
  { role: 'teacher', title: 'Teacher', icon: <Users size={24} strokeWidth={1.5} />, color: 'text-blue-600 bg-blue-50' },
  { role: 'principal', title: 'Principal', icon: <GraduationCap size={24} strokeWidth={1.5} />, color: 'text-emerald-600 bg-emerald-50' },
  { role: 'finance', title: 'Finance Officer', icon: <Wallet size={24} strokeWidth={1.5} />, color: 'text-violet-600 bg-violet-50' },
  { role: 'platform_admin', title: 'System Owner', icon: <Activity size={24} strokeWidth={1.5} />, color: 'text-slate-600 bg-slate-50' },
];

interface LoginPageProps {
  setResolvedProfile: (profile: any) => void;
  onSelectRole: (role: UserRole) => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ setResolvedProfile, onSelectRole }) => {
  const { role: roleParam } = useParams<{ role: string }>();
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [staffEmail, setStaffEmail] = useState('');
  const [staffPassword, setStaffPassword] = useState('');
  
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccessCard, setShowSuccessCard] = useState(false);
  const [successName, setSuccessName] = useState('');
  const [successRoleLabel, setSuccessRoleLabel] = useState('');

  useEffect(() => {
    if (roleParam) {
      const normalizedParam = roleParam.toLowerCase() === 'director' ? 'admin' : roleParam.toLowerCase();
      const found = roles.find(r => r.role === normalizedParam);
      if (found) setSelectedRole(found.role.toUpperCase() as UserRole);
      else navigate('/signin');
    }
  }, [roleParam, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRole) return;
    setIsLoading(true); setError('');
    
    try {
      if (selectedRole === 'ADMIN' || selectedRole === 'PLATFORM_ADMIN') {
        const uc = await signInWithEmailAndPassword(auth, email, password);
        const { resolveUserRole } = await import('../services/authService');
        const resolved = await resolveUserRole(uc.user.uid, uc.user.metadata.creationTime, 0, uc.user.email || '');
        
        if (!resolved) { 
          toast.error('Profile Not Found.'); 
          await auth.signOut(); 
          setIsLoading(false); 
          return; 
        }

        let firstName = resolved.role === 'PLATFORM_ADMIN' ? 'Owner' : 'Director';
        if (resolved.role === 'ADMIN') {
          const snap = await getDoc(doc(db, 'schools', uc.user.uid));
          if (snap.exists()) firstName = (snap.data().directorName || '').split(' ')[0];
        }

        setSuccessName(firstName);
        setSuccessRoleLabel(resolved.role === 'PLATFORM_ADMIN' ? 'Platform Owner' : 'School Director');
        setShowSuccessCard(true);
        setResolvedProfile(resolved);
        setTimeout(() => onSelectRole(resolved.role), 2000);
      } else {
        const ev = staffEmail.trim().toLowerCase();
        const pv = staffPassword.trim();
        if (!ev || !pv) { setError('Email And Password Required'); setIsLoading(false); return; }

        try {
          const uc = await signInWithEmailAndPassword(auth, ev, pv);
          const { resolveUserRole } = await import('../services/authService');
          const resolved = await resolveUserRole(uc.user.uid, uc.user.metadata.creationTime, 0, uc.user.email || '');
          
          if (resolved) {
            setSuccessName(uc.user.displayName?.split(' ')[0] || 'Staff');
            setSuccessRoleLabel(roles.find(r => r.role.toUpperCase() === selectedRole)?.title || '');
            setShowSuccessCard(true);
            setResolvedProfile(resolved);
            setTimeout(() => onSelectRole(selectedRole), 2000);
            return;
          }
        } catch (se: any) {
          if (['auth/user-not-found','auth/invalid-credential'].includes(se.code)) {
            const sSnap = await getDocs(query(collection(db, 'staff'), where('email','==',ev)));
            if (!sSnap.empty) {
              const sd = sSnap.docs[0].data();
              const na = await createUserWithEmailAndPassword(auth, ev, pv);
              await updateProfile(na.user, { displayName: sd.name });
              const { resolveUserRole } = await import('../services/authService');
              const resolved = await resolveUserRole(na.user.uid, na.user.metadata.creationTime, 0, ev);
              if (resolved) {
                setSuccessName(sd.name.split(' ')[0]);
                setSuccessRoleLabel(roles.find(r => r.role.toUpperCase() === selectedRole)?.title || '');
                setShowSuccessCard(true);
                setResolvedProfile(resolved);
                setTimeout(() => onSelectRole(selectedRole), 2000);
                return;
              }
            }
          }
          throw se;
        }
      }
    } catch (err: any) { 
      setError(err.message); 
      setIsLoading(false); 
    }
  };

  const currentRoleData = roles.find(r => r.role.toUpperCase() === selectedRole);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans selection:bg-orange-100 italic-none">
      {/* ─── HEADER ─────────────────────────────────────────── */}
      <header className="h-20 px-6 flex items-center justify-between bg-white border-b border-slate-100">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
          <div className="w-10 h-10 rounded-2xl bg-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/10">
            <SchoolIcon size={22} className="text-white" strokeWidth={1.5} />
          </div>
          <span className="text-xl font-medium tracking-tight">Bright<span className="text-orange-500">Soma</span></span>
        </div>
        <button onClick={() => navigate('/signin')} className="flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-slate-900 transition-colors uppercase tracking-widest">
          <ArrowLeft size={16} /> Other Portals
        </button>
      </header>

      {/* ─── MAIN LOGIN AREA ────────────────────────────────── */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-[3.5rem] shadow-2xl shadow-slate-200/50 border border-slate-100 overflow-hidden relative">
          <div className="p-10 md:p-14">
            <AnimatePresence mode="wait">
              {showSuccessCard ? (
                <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="py-10 flex flex-col items-center text-center">
                  <div className="w-24 h-24 rounded-[2.5rem] bg-orange-600 flex items-center justify-center text-white mb-10 shadow-3xl shadow-orange-500/40 animate-bounce">
                    <CheckCircle2 size={48} strokeWidth={1.5} />
                  </div>
                  <h2 className="text-4xl font-medium tracking-tight mb-4 text-slate-900">Welcome Back.</h2>
                  <p className="text-lg text-slate-500 font-medium mb-12 uppercase tracking-widest">{successName} · {successRoleLabel}</p>
                  <div className="flex items-center gap-3 px-8 py-4 bg-slate-50 rounded-2xl">
                     <Loader2 className="animate-spin text-orange-600 w-5 h-5" />
                     <span className="text-[10px] font-medium uppercase tracking-widest text-slate-500">Decrypting Portal...</span>
                  </div>
                </motion.div>
              ) : (
                <motion.div key="login-form" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex flex-col">
                  <div className="flex items-center gap-6 mb-12">
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-md ${currentRoleData?.color}`}>
                      {currentRoleData?.icon}
                    </div>
                    <div>
                      <h3 className="text-3xl font-medium text-slate-900 tracking-tight leading-none mb-2">{currentRoleData?.title}</h3>
                      <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">Secured Identity Gateway</p>
                    </div>
                  </div>

                  <form onSubmit={handleLogin} className="space-y-6">
                    {['ADMIN', 'PLATFORM_ADMIN'].includes(selectedRole || '') ? (
                      <>
                        <div className="space-y-3">
                          <label className="text-[10px] font-medium uppercase tracking-widest text-slate-400">Institutional Email</label>
                          <div className="relative">
                            <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} strokeWidth={1.5} />
                            <input type="email" placeholder="admin@academy.edu" value={email} onChange={e => setEmail(e.target.value)} className="w-full pl-14 pr-6 py-5 rounded-2xl bg-slate-50 border border-transparent focus:border-orange-500/20 focus:bg-white outline-none text-sm font-medium transition-all" />
                          </div>
                        </div>
                        <div className="space-y-3">
                          <label className="text-[10px] font-medium uppercase tracking-widest text-slate-400">Master Password</label>
                          <div className="relative">
                            <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} strokeWidth={1.5} />
                            <input type={showPassword ? "text" : "password"} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} className="w-full pl-14 pr-12 py-5 rounded-2xl bg-slate-50 border border-transparent focus:border-orange-500/20 focus:bg-white outline-none text-sm font-medium transition-all" />
                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-600">
                              {showPassword ? <EyeOff size={18} strokeWidth={1.5} /> : <Eye size={18} strokeWidth={1.5} />}
                            </button>
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="space-y-3">
                          <label className="text-[10px] font-medium uppercase tracking-widest text-slate-400">Staff Identity (Email)</label>
                          <div className="relative">
                            <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} strokeWidth={1.5} />
                            <input type="email" placeholder="staff@academy.edu" value={staffEmail} onChange={e => setStaffEmail(e.target.value)} className="w-full pl-14 pr-6 py-5 rounded-2xl bg-slate-50 border border-transparent focus:border-orange-500/20 focus:bg-white outline-none text-sm font-medium transition-all" />
                          </div>
                        </div>
                        <div className="space-y-3">
                          <label className="text-[10px] font-medium uppercase tracking-widest text-slate-400">Secured Access Key</label>
                          <div className="relative">
                            <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} strokeWidth={1.5} />
                            <input type={showPassword ? "text" : "password"} placeholder="••••••••" value={staffPassword} onChange={e => setStaffPassword(e.target.value)} className="w-full pl-14 pr-12 py-5 rounded-2xl bg-slate-50 border border-transparent focus:border-orange-500/20 focus:bg-white outline-none text-sm font-medium transition-all" />
                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-600">
                              {showPassword ? <EyeOff size={18} strokeWidth={1.5} /> : <Eye size={18} strokeWidth={1.5} />}
                            </button>
                          </div>
                        </div>
                      </>
                    )}

                    {error && <p className="text-[11px] font-medium text-rose-500 px-5 py-3 bg-rose-50 rounded-2xl italic-none">{error}</p>}

                    <button disabled={isLoading} className="w-full py-6 mt-8 bg-slate-900 text-white rounded-[1.5rem] font-medium uppercase tracking-[0.2em] text-[11px] shadow-2xl shadow-slate-900/20 active:scale-95 transition-all flex items-center justify-center gap-3 group">
                      {isLoading ? <Loader2 className="animate-spin w-5 h-5 text-orange-500" /> : (
                        <>Sign In To Dashboard <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" /></>
                      )}
                    </button>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>

      {/* ─── FOOTER ────────────────────────────────────────── */}
      <footer className="h-20 flex items-center justify-center text-[10px] font-medium text-slate-300 uppercase tracking-[0.4em]">
        BrightSoma SECURED GATEWAY · V2.0
      </footer>
    </div>
  );
};

export default LoginPage;
