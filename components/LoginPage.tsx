import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { UserRole } from '../types';
import { 
  ShieldCheck, Users, GraduationCap, Wallet, Activity, Lock, Mail, Eye, EyeOff, 
  Loader2, CheckCircle2, ArrowLeft, ArrowRight, School as SchoolIcon, Sparkles, X
} from 'lucide-react';

import { motion, AnimatePresence } from 'motion/react';
import { db, auth } from '../src/firebase';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import toast from 'react-hot-toast';
import { resolveUserRole } from '../services/authService';

const roles = [
  { role: 'admin', title: 'School Director', icon: <ShieldCheck size={32} strokeWidth={1.5} />, color: 'from-orange-500 via-orange-600 to-amber-600', lightColor: 'bg-orange-500/10' },
  { role: 'teacher', title: 'Teacher Portal', icon: <Users size={32} strokeWidth={1.5} />, color: 'from-blue-500 via-indigo-600 to-blue-700', lightColor: 'bg-blue-500/10' },
  { role: 'principal', title: 'Principal', icon: <GraduationCap size={32} strokeWidth={1.5} />, color: 'from-emerald-500 via-teal-600 to-emerald-700', lightColor: 'bg-emerald-500/10' },
  { role: 'finance', title: 'Finance Officer', icon: <Wallet size={32} strokeWidth={1.5} />, color: 'from-violet-500 via-purple-600 to-violet-700', lightColor: 'bg-violet-500/10' },
  { role: 'platform_admin', title: 'System Owner', icon: <Activity size={32} strokeWidth={1.5} />, color: 'from-slate-700 via-slate-800 to-slate-900', lightColor: 'bg-slate-500/10' },
];

interface LoginPageProps {
  setResolvedProfile: (profile: any) => void;
  onSelectRole: (role: UserRole) => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ setResolvedProfile, onSelectRole }) => {
  // ── FIX: App has no <Route path="/login/:role"> definitions, so useParams()
  // always returns {}. We must parse the role from the raw pathname instead.
  const location = useLocation();
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

  // Parse role from "/login/admin" → "admin"
  useEffect(() => {
    const pathParts = location.pathname.split('/').filter(Boolean);
    // Expect: ['login', '<role>']
    const roleSegment = pathParts[1]?.toLowerCase() ?? '';
    const normalizedParam = roleSegment === 'director' ? 'admin' : roleSegment;
    const found = roles.find(r => r.role === normalizedParam);
    if (found) {
      setSelectedRole(found.role.toUpperCase() as UserRole);
    } else if (roleSegment) {
      // Unknown role in URL — go back to role selector
      navigate('/signin');
    }
    // If no role segment at all, stay and show empty state (shouldn't happen normally)
  }, [location.pathname, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRole) {
      toast.error('No role selected. Please go back and choose a portal.');
      return;
    }
    setIsLoading(true); setError('');
    
    try {
      if (selectedRole === 'ADMIN' || selectedRole === 'PLATFORM_ADMIN') {
        const uc = await signInWithEmailAndPassword(auth, email, password);
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
          if (snap.exists()) firstName = (snap.data().directorName || '').split(' ')[0] || 'Director';
        }

        setSuccessName(firstName);
        setSuccessRoleLabel(resolved.role === 'PLATFORM_ADMIN' ? 'Platform Owner' : 'School Director');
        setShowSuccessCard(true);
        setResolvedProfile(resolved);
        setTimeout(() => onSelectRole(resolved.role), 2000);
      } else {
        const ev = staffEmail.trim().toLowerCase();
        const pv = staffPassword.trim();
        if (!ev || !pv) { setError('Email and password are required'); setIsLoading(false); return; }

        try {
          const uc = await signInWithEmailAndPassword(auth, ev, pv);
          const { resolveUserRole: resolveRole } = await import('../services/authService');
          const resolved = await resolveRole(uc.user.uid, uc.user.metadata.creationTime, 0, uc.user.email || '');
          
          if (resolved) {
            setSuccessName(uc.user.displayName?.split(' ')[0] || 'Staff');
            setSuccessRoleLabel(roles.find(r => r.role.toUpperCase() === selectedRole)?.title || '');
            setShowSuccessCard(true);
            setResolvedProfile(resolved);
            setTimeout(() => onSelectRole(selectedRole), 2000);
            return;
          } else {
            toast.error('Portal profile not found for this account.');
            await auth.signOut();
            setIsLoading(false);
            return;
          }
        } catch (se: any) {
          if (['auth/user-not-found','auth/invalid-credential'].includes(se.code)) {
            const sSnap = await getDocs(query(collection(db, 'staff'), where('email','==',ev)));
            if (!sSnap.empty) {
              const sd = sSnap.docs[0].data();
              const na = await createUserWithEmailAndPassword(auth, ev, pv);
              await updateProfile(na.user, { displayName: sd.name });
              const resolved = await resolveUserRole(na.user.uid, na.user.metadata.creationTime, 0, ev);
              if (resolved) {
                setSuccessName(sd.name.split(' ')[0]);
                setSuccessRoleLabel(roles.find(r => r.role.toUpperCase() === selectedRole)?.title || '');
                setShowSuccessCard(true);
                setResolvedProfile(resolved);
                setTimeout(() => onSelectRole(selectedRole), 2000);
                return;
              } else {
                toast.error('Staff profile resolution failed.');
                setIsLoading(false);
                return;
              }
            }
          }
          throw se;
        }
      }
    } catch (err: any) { 
      console.error('[LoginPage] Login Error:', err);
      const msg = ['auth/invalid-credential', 'auth/user-not-found', 'auth/wrong-password', 'auth/invalid-email'].includes(err.code)
        ? 'Invalid credentials. Please check your email and password.'
        : 'Authentication failed. Please try again or contact support.';
      setError(msg); 
      toast.error(msg);
      setIsLoading(false); 
    }
  };

  const currentRoleData = roles.find(r => r.role.toUpperCase() === selectedRole);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-orange-100 flex flex-col relative overflow-hidden">
      {/* ─── SUBTLE BACKGROUND DECOR ──────────────────────────── */}
      <div className="absolute top-0 left-0 w-full h-full z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-5%] w-[40%] h-[40%] bg-orange-500/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[30%] h-[30%] bg-slate-500/5 blur-[120px] rounded-full" />
      </div>

      {/* ─── HEADER ─────────────────────────────────────────── */}
      <header className="h-20 px-8 md:px-16 flex items-center justify-between z-10 relative border-b border-slate-100 bg-white/50 backdrop-blur-md">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-3 cursor-pointer group" 
          onClick={() => navigate('/')}
        >
          <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/20 group-hover:scale-105 transition-all">
            <SchoolIcon size={22} className="text-white" strokeWidth={2} />
          </div>
          <div className="hidden sm:block">
            <span className="text-xl font-bold tracking-tight text-slate-900">BrightSoma</span>
            <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-orange-500 block -mt-1">Secured Gateway</span>
          </div>
        </motion.div>
        
        <motion.button 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={() => navigate('/signin')} 
          className="px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-[10px] font-bold text-slate-500 hover:text-orange-600 hover:border-orange-200 transition-all tracking-wider flex items-center gap-2"
        >
          <ArrowLeft size={14} /> Switch portal
        </motion.button>
      </header>

      {/* ─── MAIN LOGIN AREA ────────────────────────────────── */}
      <main className="flex-1 flex items-center justify-center p-6 z-10 relative">
        <div className="max-w-md w-full">
          <AnimatePresence mode="wait">
            {showSuccessCard ? (
              <motion.div 
                key="success" 
                initial={{ opacity: 0, scale: 0.95 }} 
                animate={{ opacity: 1, scale: 1 }} 
                className="bg-white rounded-3xl border border-slate-100 p-12 flex flex-col items-center text-center shadow-xl"
              >
                <div className="w-20 h-20 rounded-2xl bg-orange-500 flex items-center justify-center text-white mb-8 shadow-lg shadow-orange-500/20">
                  <CheckCircle2 size={40} strokeWidth={2} />
                </div>
                <h2 className="text-3xl font-black tracking-tight mb-2 text-slate-900">Welcome back</h2>
                <p className="text-sm text-slate-500 font-bold mb-10 tracking-widest">{successName} · {successRoleLabel}</p>
                
                <div className="flex items-center gap-3 px-6 py-3 bg-slate-50 rounded-2xl border border-slate-100">
                   <Loader2 className="animate-spin text-orange-500 w-5 h-5" />
                   <span className="text-[10px] font-bold tracking-wider text-slate-500">Decrypting workspace...</span>
                </div>
              </motion.div>
            ) : !selectedRole ? (
              /* No role found in URL — redirect notice */
              <motion.div
                key="no-role"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-3xl border border-slate-100 p-12 flex flex-col items-center text-center shadow-xl"
              >
                <div className="w-16 h-16 rounded-2xl bg-orange-50 flex items-center justify-center mb-6">
                  <SchoolIcon size={32} className="text-orange-500" />
                </div>
                <h2 className="text-2xl font-black text-slate-900 mb-2">Select a portal</h2>
                <p className="text-sm text-slate-500 mb-8">Please select your role to continue.</p>
                <button
                  onClick={() => navigate('/signin')}
                  className="px-8 py-3 bg-orange-500 text-white rounded-xl font-bold text-sm hover:bg-orange-600 transition-all flex items-center gap-2"
                >
                  Choose portal <ArrowRight size={16} />
                </button>
              </motion.div>
            ) : (
              <motion.div 
                key="login-form" 
                initial={{ opacity: 0, y: 20 }} 
                animate={{ opacity: 1, y: 0 }} 
                className="bg-white rounded-3xl border border-slate-100 overflow-hidden relative shadow-2xl"
              >
                <div className="p-8 md:p-12">
                  {/* Role Header */}
                  <div className="flex flex-col items-center text-center mb-10">
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 ${currentRoleData?.lightColor} border border-orange-100/50`}>
                      <div className="text-orange-600">{currentRoleData?.icon}</div>
                    </div>
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-2">{currentRoleData?.title}</h3>
                    <p className="text-xs font-medium text-slate-500">Authenticated access only</p>
                  </div>

                  <form onSubmit={handleLogin} className="space-y-6">
                    {['ADMIN', 'PLATFORM_ADMIN'].includes(selectedRole || '') ? (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold tracking-wider text-slate-400 ml-1">Email / Username</label>
                          <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} strokeWidth={2} />
                            <input 
                              type="email" 
                              placeholder="admin@academy.edu" 
                              value={email} 
                              onChange={e => setEmail(e.target.value)} 
                              required
                              className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:border-orange-500 focus:bg-white outline-none text-sm font-bold text-slate-900 transition-all" 
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold tracking-wider text-slate-400 ml-1">Password</label>
                          <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} strokeWidth={2} />
                            <input 
                              type={showPassword ? "text" : "password"} 
                              placeholder="••••••••" 
                              value={password} 
                              onChange={e => setPassword(e.target.value)} 
                              required
                              className="w-full pl-12 pr-12 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:border-orange-500 focus:bg-white outline-none text-sm font-bold text-slate-900 transition-all" 
                            />
                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-orange-600 transition-colors">
                              {showPassword ? <EyeOff size={18} strokeWidth={2} /> : <Eye size={18} strokeWidth={2} />}
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold tracking-wider text-slate-400 ml-1">Email / Username</label>
                          <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} strokeWidth={2} />
                            <input 
                              type="email" 
                              placeholder="staff@academy.edu" 
                              value={staffEmail} 
                              onChange={e => setStaffEmail(e.target.value)} 
                              required
                              className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:border-orange-500 focus:bg-white outline-none text-sm font-bold text-slate-900 transition-all" 
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold tracking-wider text-slate-400 ml-1">Password</label>
                          <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} strokeWidth={2} />
                            <input 
                              type={showPassword ? "text" : "password"} 
                              placeholder="••••••••" 
                              value={staffPassword} 
                              onChange={e => setStaffPassword(e.target.value)} 
                              required
                              className="w-full pl-12 pr-12 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:border-orange-500 focus:bg-white outline-none text-sm font-bold text-slate-900 transition-all" 
                            />
                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-orange-600 transition-colors">
                              {showPassword ? <EyeOff size={18} strokeWidth={2} /> : <Eye size={18} strokeWidth={2} />}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {error && (
                      <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl flex items-center gap-3">
                        <X size={16} className="text-rose-600 shrink-0" />
                        <p className="text-[10px] font-bold text-rose-600 tracking-wider">{error}</p>
                      </div>
                    )}

                    <button 
                      type="submit"
                      disabled={isLoading} 
                      className="w-full py-4 bg-orange-500 text-white rounded-xl font-bold tracking-widest text-xs shadow-lg shadow-orange-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-3 hover:bg-orange-600 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {isLoading ? (
                        <Loader2 className="animate-spin w-5 h-5" />
                      ) : (
                        <>
                          <span>Access portal</span>
                          <ArrowRight size={16} />
                        </>
                      )}
                    </button>

                    {selectedRole === 'ADMIN' && (
                      <div className="mt-8 pt-8 border-t border-slate-100 flex flex-col items-center gap-3">
                        <p className="text-[10px] font-bold text-slate-400">New institution?</p>
                        <button 
                          type="button"
                          onClick={() => navigate('/')} 
                          className="text-[10px] font-bold text-orange-600 hover:underline"
                        >
                          Register your school
                        </button>
                      </div>
                    )}
                  </form>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* ─── FOOTER ────────────────────────────────────────── */}
      <footer className="h-16 flex items-center justify-center z-10 relative bg-white border-t border-slate-100">
        <p className="text-[9px] font-bold text-slate-400">
          BrightSoma security architecture v2.4.0
        </p>
      </footer>
    </div>
  );
};

export default LoginPage;
