import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { UserRole } from '../types';
import { 
  ShieldCheck, Users, GraduationCap, Wallet, Activity, Lock, Mail, Eye, EyeOff, 
  Loader2, CheckCircle2, ArrowLeft, ArrowRight, School as SchoolIcon, Sparkles, X, ChevronRight, Fingerprint
} from 'lucide-react';

import { motion, AnimatePresence } from 'motion/react';
import { db, auth } from '../src/firebase';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, sendPasswordResetEmail } from 'firebase/auth';
import toast from 'react-hot-toast';
import { resolveUserRole } from '../services/authService';

const roles = [
  { role: 'admin', title: 'School Director', icon: <ShieldCheck size={32} strokeWidth={1} />, color: 'from-orange-500 via-orange-600 to-orange-700', lightColor: 'bg-orange-500/10' },
  { role: 'teacher', title: 'Teacher Portal', icon: <Users size={32} strokeWidth={1} />, color: 'from-orange-400 via-orange-500 to-orange-600', lightColor: 'bg-orange-500/10' },
  { role: 'principal', title: 'Principal', icon: <GraduationCap size={32} strokeWidth={1} />, color: 'from-orange-500 via-orange-600 to-orange-700', lightColor: 'bg-orange-500/10' },
  { role: 'finance', title: 'Finance Officer', icon: <Wallet size={32} strokeWidth={1} />, color: 'from-orange-500 via-orange-600 to-orange-700', lightColor: 'bg-orange-500/10' },
  { role: 'parent', title: 'Parent Portal', icon: <Users size={32} strokeWidth={1} />, color: 'from-orange-500 via-orange-600 to-orange-700', lightColor: 'bg-orange-500/10' },
  { role: 'platform_admin', title: 'System Owner', icon: <Activity size={32} strokeWidth={1} />, color: 'from-slate-700 via-slate-800 to-slate-900', lightColor: 'bg-slate-500/10' },
];

interface LoginPageProps {
  setResolvedProfile: (profile: any) => void;
  setMockProfile?: (profile: any | null) => void;
  onSelectRole: (role: UserRole) => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ setResolvedProfile, setMockProfile, onSelectRole }) => {
  // ── FIX: App has no <Route path="/login/:role"> definitions, so useParams()
  // always returns {}. We must parse the role from the raw pathname instead.
  const location = useLocation();
  const navigate = useNavigate();

  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [staffEmail, setStaffEmail] = useState('');
  const [staffPassword, setStaffPassword] = useState('');
  const [loginStep, setLoginStep] = useState<1 | 2>(1);
  const [rememberMe, setRememberMe] = useState(false);
  const [resolvedSchoolInfo, setResolvedSchoolInfo] = useState<{name: string, logoUrl: string | null} | null>(null);
  
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResolvingEmail, setIsResolvingEmail] = useState(false);
  const [showSuccessCard, setShowSuccessCard] = useState(false);
  const [successName, setSuccessName] = useState('');
  const [successRoleLabel, setSuccessRoleLabel] = useState('');
  const [isDevMode, setIsDevMode] = useState(false);
  const isDevEnvironment = import.meta.env.DEV;

  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetError, setResetError] = useState('');

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

  const openForgotPassword = () => {
    const currentEmail = (selectedRole === 'ADMIN' || selectedRole === 'PLATFORM_ADMIN') ? email : staffEmail;
    setForgotEmail(currentEmail);
    setResetError('');
    setResetSent(false);
    setShowForgotModal(true);
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) {
      setResetError('Email address is required.');
      return;
    }
    setIsSendingReset(true);
    setResetError('');
    try {
      await sendPasswordResetEmail(auth, forgotEmail.trim());
      setResetSent(true);
      toast.success('Password reset link sent successfully!');
    } catch (err: any) {
      console.error('[LoginPage] Password reset error:', err);
      let errMsg = 'Failed to send reset email. Please try again.';
      if (err.code === 'auth/user-not-found') {
        errMsg = 'No user account found with this email.';
      } else if (err.code === 'auth/invalid-email') {
        errMsg = 'Invalid email address.';
      }
      setResetError(errMsg);
    } finally {
      setIsSendingReset(false);
    }
  };

  const handleNextStep = async (e: React.FormEvent) => {
    e.preventDefault();
    const ev = (selectedRole === 'ADMIN' || selectedRole === 'PLATFORM_ADMIN') ? email.trim() : staffEmail.trim();
    if (!ev) { setError('Please enter your email or username'); return; }
    
    setError('');
    setIsResolvingEmail(true);

    try {
      // NOTE: Firestore queries here run BEFORE authentication.
      // Only `schools` and `staff` allow unauthenticated reads (via rules).
      // We do NOT fail if school branding can't be resolved — just proceed to Step 2.
      let schoolIdToFetch: string | null = null;

      if (selectedRole === 'ADMIN' || selectedRole === 'PLATFORM_ADMIN') {
        try {
          const sSnap = await getDocs(query(collection(db, 'schools'), where('directorEmail', '==', ev.toLowerCase())));
          if (!sSnap.empty) schoolIdToFetch = sSnap.docs[0].id;
        } catch (_) { /* rules may block unauthenticated — proceed silently */ }
      } else if (selectedRole === 'PARENT') {
        // For parents we skip Firestore look up — just move to Step 2
        schoolIdToFetch = null;
      } else {
        // TEACHER / PRINCIPAL / FINANCE — look up by email or username
        try {
          const sSnap = await getDocs(query(collection(db, 'staff'), where('email', '==', ev.toLowerCase())));
          if (!sSnap.empty) {
            schoolIdToFetch = sSnap.docs[0].data().schoolId;
          } else {
            const uSnap = await getDocs(query(collection(db, 'staff'), where('username', '==', ev.toLowerCase())));
            if (!uSnap.empty) schoolIdToFetch = uSnap.docs[0].data().schoolId;
          }
        } catch (_) { /* rules may block unauthenticated — proceed silently */ }
      }

      // Try to load school branding (logo/name) — non-blocking
      if (schoolIdToFetch) {
        try {
          const schoolDoc = await getDoc(doc(db, 'schools', schoolIdToFetch));
          if (schoolDoc.exists()) {
            setResolvedSchoolInfo({
              name: schoolDoc.data().name || 'BrightSoma School',
              logoUrl: schoolDoc.data().logoUrl || null
            });
          }
        } catch (_) { /* silently ignore */ }
      }

      if (!resolvedSchoolInfo) {
        setResolvedSchoolInfo({ name: 'Secure Portal', logoUrl: null });
      }

      setLoginStep(2);
    } catch (err) {
      console.error('[LoginPage] handleNextStep error:', err);
      // Always proceed to Step 2 — actual auth check happens at login
      setLoginStep(2);
    } finally {
      setIsResolvingEmail(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRole) {
      toast.error('No role selected. Please go back and choose a portal.');
      return;
    }
    setIsLoading(true); setError('');
    
    try {
      if (selectedRole === 'ADMIN' || selectedRole === 'PLATFORM_ADMIN') {
        const ev = email.trim().toLowerCase();
        try {
          const uc = await signInWithEmailAndPassword(auth, ev, password);
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
        } catch (adminErr: any) {
          console.error('[LoginPage] Admin login failed:', adminErr);
          if (['auth/invalid-credential', 'auth/user-not-found', 'auth/wrong-password'].includes(adminErr.code)) {
            setError('Invalid credentials. Please check your email and password.');
          } else {
            setError(`Authentication failed: ${adminErr.message || adminErr.code}`);
          }
          setIsLoading(false);
        }
      } else if (selectedRole === 'PARENT') {
        // ─── PARENT LOGIN ───────────────────────────────────────────────────
        const ev = staffEmail.trim().toLowerCase(); 
        const pv = staffPassword.trim();
        if (!ev || !pv) { setError('Email and access code are required'); setIsLoading(false); return; }

        try {
          const uc = await signInWithEmailAndPassword(auth, ev, pv);
          const resolved = await resolveUserRole(uc.user.uid, uc.user.metadata.creationTime, 0, uc.user.email || '');
          if (resolved) {
            setResolvedProfile(resolved);
            setSuccessName(uc.user.displayName?.split(' ')[0] || 'Parent');
            setSuccessRoleLabel('Parent');
            setShowSuccessCard(true);
            setTimeout(() => onSelectRole('PARENT'), 2000);
            return;
          }
        } catch (se: any) {
          const isFirstTime = ['auth/user-not-found', 'auth/invalid-credential', 'auth/invalid-login-credentials', 'auth/wrong-password'].includes(se.code);
          
          if (isFirstTime) {
            try {
              // Step 2: First-time parent login — create auth first to bypass read rules
              const na = await createUserWithEmailAndPassword(auth, ev, pv);
              
              console.log('[LoginPage] Parent: Checking access code for', ev);
              const qAccess = query(
                collection(db, 'access_codes'), 
                where('email', '==', ev),
                where('code', '==', pv.toUpperCase()),
                where('role', '==', 'PARENT'),
                where('active', '==', true)
              );
              const aSnap = await getDocs(qAccess);

              if (aSnap.empty) {
                await na.user.delete();
                setError('Invalid email or access code. Please check your credentials.');
                setIsLoading(false);
                return;
              }

              const accessDoc = aSnap.docs[0];
              const ad = accessDoc.data();

              await updateProfile(na.user, { displayName: ad.staffName || 'Parent' });
              
              const resolved = {
                role: 'PARENT' as UserRole,
                schoolId: ad.schoolId,
                edition: 'starter' as any,
                enabledModules: ['parent-dashboard', 'parent-fees', 'parent-communications', 'parent-attendance', 'parent-health', 'profile'],
                isPlatformAdmin: false,
                onboardingCompleted: true,
              };

              setResolvedProfile(resolved);
              setSuccessName(ad.staffName?.split(' ')[0] || 'Parent');
              setSuccessRoleLabel('Parent');
              setShowSuccessCard(true);
              setTimeout(() => onSelectRole('PARENT'), 2000);
              return;
            } catch (createErr: any) {
              if (createErr.code === 'auth/email-already-in-use') {
                setError('Invalid email or password.');
              } else if (createErr.code === 'auth/weak-password') {
                setError('Invalid email or access code.');
              } else {
                setError(createErr.message || 'Failed to initialize parent session.');
              }
              setIsLoading(false);
              return;
            }
          } else {
            setError('Authentication failed. Please check your credentials.');
            setIsLoading(false);
            return;
          }
        }
      } else {
        // ─── STAFF / TEACHER LOGIN ────────────────────────────────────────────
        const ev = staffEmail.trim().toLowerCase();
        const pv = staffPassword.trim();
        if (!ev || !pv) { setError('Email and password are required'); setIsLoading(false); return; }

        try {
          const uc = await signInWithEmailAndPassword(auth, ev, pv);
          const resolved = await resolveUserRole(uc.user.uid, uc.user.metadata.creationTime, 0, uc.user.email || '');
          if (resolved) {
            setResolvedProfile(resolved);
            setSuccessName(uc.user.displayName?.split(' ')[0] || 'Staff');
            setSuccessRoleLabel(roles.find(r => r.role.toUpperCase() === resolved.role)?.title || resolved.role);
            setShowSuccessCard(true);
            setTimeout(() => onSelectRole(resolved.role), 2000);
            return;
          }
        } catch (se: any) {
          console.error('[LoginPage] Teacher initial sign-in failed:', se.code, se.message);
          const isFirstTime = [
            'auth/user-not-found',
            'auth/invalid-credential',
            'auth/invalid-login-credentials',
            'auth/wrong-password',
          ].includes(se.code);

          if (isFirstTime) {
            try {
              // 1. Create auth first to bypass read rules
              const na = await createUserWithEmailAndPassword(auth, ev, pv);

              // 2. Now authenticated, look up staff record (CASE-INSENSITIVE)
              const staffQuery = query(collection(db, 'staff'), where('email', '==', ev));
              const sSnap = await getDocs(staffQuery);
              
              if (sSnap.empty) {
                // Try original case just in case
                const sSnapOrig = await getDocs(query(collection(db, 'staff'), where('email', '==', staffEmail.trim())));
                if (sSnapOrig.empty) {
                  await na.user.delete();
                  setError(`No staff record found for "${ev}". Please contact your administrator.`);
                  setIsLoading(false);
                  return;
                }
                // Use the original case snap if found
                var finalStaffSnap = sSnapOrig;
              } else {
                var finalStaffSnap = sSnap;
              }

              const staffDoc = finalStaffSnap.docs[0];
              const sd = staffDoc.data();
              const accessCode = pv.trim().toUpperCase();
              const storedCode = (sd.accessCode || '').trim().toUpperCase();
              
              if (accessCode !== storedCode && pv.length < 6) {
                await na.user.delete();
                setError('Invalid password or access code.');
                setIsLoading(false);
                return;
              }

              await updateProfile(na.user, { displayName: sd.name });
              
              const { setDoc, deleteDoc, doc: fsDoc } = await import('firebase/firestore');
              
              // Migrate staff record: Create new doc with UID and delete old one
              try {
                console.log('[LoginPage] Staff: Migrating staff record to UID:', na.user.uid);
                await setDoc(fsDoc(db, 'staff', na.user.uid), {
                  ...sd,
                  firebaseUid: na.user.uid,
                  updatedAt: new Date().toISOString()
                });
                await deleteDoc(staffDoc.ref);
                console.log('[LoginPage] Staff: Migration complete.');
              } catch (migErr: any) {
                console.warn('[LoginPage] Non-critical migration error:', migErr.message);
                // We proceed anyway because the auth account is created and the resolved profile is enough
              }

              const resolved = {
                role: (sd.role || 'TEACHER') as any,
                schoolId: sd.schoolId,
                edition: 'starter' as any,
                enabledModules: ['dashboard', 'students', 'academics', 'timetable', 'attendance-register', 'profile'],
                isPlatformAdmin: false,
                onboardingCompleted: true,
              };

              setResolvedProfile(resolved);
              setSuccessName(sd.name?.split(' ')[0] || 'Staff');
              setSuccessRoleLabel(roles.find(r => r.role.toUpperCase() === sd.role)?.title || sd.role);
              setShowSuccessCard(true);
              setTimeout(() => onSelectRole(sd.role || 'TEACHER'), 2000);
              return;
            } catch (createErr: any) {
              console.error('[LoginPage] Teacher first-time registration failed:', createErr);
              if (createErr.code === 'auth/email-already-in-use') {
                setError('Incorrect password. If this is your first time logging in, please use the access code provided by your admin. Otherwise, click "Forgot password?" below to reset it.');
              } else if (createErr.code === 'auth/weak-password') {
                setError('The password or access code is too weak.');
              } else {
                setError(`Registration failed: ${createErr.message || 'Unknown error'}`);
              }
              setIsLoading(false);
              return;
            }
          }
          
          setError('Invalid credentials. Please check your email and password.');
          setIsLoading(false);
        }
      }
    } catch (err: any) { 
      console.error('[LoginPage] Login Error:', err);
      const msg = ['auth/invalid-credential', 'auth/user-not-found', 'auth/wrong-password', 'auth/invalid-email'].includes(err.code)
        ? 'Invalid credentials. Please check your email and password.'
        : `Authentication failed: ${err.message || err.code || 'Unknown error'}. Please contact support.`;
      setError(msg); 
      toast.error(msg);
      setIsLoading(false); 
    }
  };

  const currentRoleData = roles.find(r => r.role.toUpperCase() === selectedRole);

  return (
    <div className="min-h-screen bg-white text-black dark:text-white font-sans selection:bg-orange-100 flex flex-col relative overflow-hidden">
      {/* ─── SUBTLE BACKGROUND DECOR ──────────────────────────── */}
      <div className="absolute top-0 left-0 w-full h-full z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-5%] w-[40%] h-[40%] bg-[#0462b4]/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[30%] h-[30%] bg-slate-500/5 blur-[120px] rounded-full" />
      </div>

      {/* ─── HEADER ─────────────────────────────────────────── */}
      <header className="h-20 px-8 md:px-16 flex items-center justify-between z-10 relative">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-3 cursor-pointer group" 
          onClick={() => navigate('/')}
        >
          <span className="text-xl font-bold tracking-tight text-black dark:text-white">Bright<span className="text-orange-600">Soma</span></span>
        </motion.div>
        
        <div className="flex items-center gap-4">
          <motion.button 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={() => navigate('/signin')} 
            className="px-5 py-2.5 rounded-full border border-slate-200 bg-white text-[11px] font-bold text-slate-500 hover:text-black hover:border-slate-300 transition-all flex items-center gap-2"
          >
            <ArrowLeft size={14} /> Switch portal
          </motion.button>
          <motion.button 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={() => navigate('/county-auth')} 
            className="px-5 py-2.5 rounded-xl bg-slate-900 text-[10px] font-bold text-white hover:bg-black transition-all tracking-wider flex items-center gap-2"
          >
            <ShieldCheck size={14} /> County Oversight
          </motion.button>
        </div>
      </header>

      {/* ─── MAIN LOGIN AREA ────────────────────────────────── */}
      <main className="flex-1 flex items-center justify-center p-6 z-10 relative">
        <div className="max-w-md w-full">
          <AnimatePresence mode="wait">
            {showSuccessCard ? (
              <motion.div 
                key="success" 
                initial={{ opacity: 0, y: 10 }} 
                animate={{ opacity: 1, y: 0 }} 
                className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 p-12 flex flex-col items-center text-center shadow-2xl relative overflow-hidden"
              >
                {/* Subtle background glow */}
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-orange-500/5 rounded-full blur-3xl pointer-events-none" />
                
                <motion.span
                  animate={{ rotate: [0, 18, -8, 18, 0] }}
                  transition={{ duration: 1.6, repeat: Infinity, repeatDelay: 2, ease: 'easeInOut' }}
                  className="text-5xl select-none mb-8"
                  style={{ display: 'inline-block', transformOrigin: '70% 80%' }}
                >
                  👋
                </motion.span>

                <h2 className="text-3xl md:text-4xl font-black tracking-tight mb-2 text-black dark:text-white">
                  Welcome back, <span className="text-orange-600">{successRoleLabel}</span>
                </h2>
                <p className="text-lg text-slate-500 dark:text-slate-400 font-bold mb-12 tracking-wide">{successName}</p>
                
                <div className="w-full max-w-[240px] space-y-3">
                   <div className="flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
                     <span>Decrypting workspace</span>
                     <span className="text-orange-600">85%</span>
                   </div>
                   <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: '100%' }}
                        transition={{ duration: 2, ease: "easeInOut" }}
                        className="h-full bg-gradient-to-r from-orange-600 to-orange-400 rounded-full shadow-[0_0_10px_rgba(234,88,12,0.3)]"
                      />
                   </div>
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
                <div className="w-16 h-16 rounded-full bg-orange-50 flex items-center justify-center mb-6">
                  <SchoolIcon size={32} className="text-orange-600" />
                </div>
                <h2 className="text-2xl font-black text-black dark:text-white mb-2">Select a portal</h2>
                <p className="text-sm text-black dark:text-white mb-8">Please select your role to continue.</p>
                <button
                  onClick={() => navigate('/signin')}
                  className="px-8 py-3 bg-black text-white rounded-full font-bold text-sm hover:bg-slate-800 transition-all flex items-center gap-2"
                >
                  Choose portal <ArrowRight size={16} />
                </button>
              </motion.div>
            ) : (
              <motion.div 
                key="login-form" 
                initial={{ opacity: 0, y: 20 }} 
                animate={{ opacity: 1, y: 0 }} 
                className="bg-white rounded-[2rem] border border-slate-100 overflow-hidden relative shadow-2xl"
              >
                <div className="p-8 md:p-12">
                  {/* Dynamic Header */}
                  <div className="flex flex-col items-center text-center mb-10">
                    {loginStep === 2 && resolvedSchoolInfo?.logoUrl ? (
                      <img src={resolvedSchoolInfo.logoUrl} alt="School Logo" className="w-20 h-20 object-contain mb-4 drop-shadow-sm" />
                    ) : loginStep === 2 && resolvedSchoolInfo?.name ? (
                       <div className="w-16 h-16 rounded-full bg-orange-50 flex items-center justify-center mb-4 text-orange-600 text-xl font-black border border-orange-100">
                          {resolvedSchoolInfo.name.charAt(0)}
                       </div>
                    ) : (
                      <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${currentRoleData?.lightColor}`}>
                        <div className="text-orange-600">{currentRoleData?.icon}</div>
                      </div>
                    )}
                    
                    <h3 className="text-xl font-black text-black dark:text-white tracking-tight mb-1">
                      {loginStep === 2 ? (resolvedSchoolInfo?.name || currentRoleData?.title) : currentRoleData?.title}
                    </h3>
                    <p className="text-[11px] font-medium text-slate-400">
                      {loginStep === 2 ? 'Enter your password to continue' : 'Sign in to access your dashboard'}
                    </p>
                  </div>

                  <form onSubmit={loginStep === 1 ? handleNextStep : handleLogin} className="space-y-5">
                    {loginStep === 1 ? (
                      <motion.div key="step1" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Email / Username</label>
                          <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} strokeWidth={2} />
                            <input 
                              type="text" 
                              placeholder={selectedRole === 'ADMIN' ? "director@school.com" : "username or email"} 
                              value={selectedRole === 'ADMIN' ? email : staffEmail} 
                              onChange={e => selectedRole === 'ADMIN' ? setEmail(e.target.value) : setStaffEmail(e.target.value)} 
                              required
                              className="w-full pl-11 pr-4 py-3.5 bg-transparent border border-slate-200 rounded-2xl focus:border-orange-500 focus:ring-4 focus:ring-orange-50 outline-none text-sm font-medium text-black dark:text-white transition-all placeholder:text-slate-300" 
                            />
                          </div>
                        </div>
                        <div className="flex justify-end px-1">
                          <button type="button" onClick={openForgotPassword} className="text-[10px] font-bold text-orange-600 hover:underline">Forgot password?</button>
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div key="step2" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="space-y-5">
                        <div className="flex items-center justify-between px-4 py-3 bg-slate-50 rounded-2xl border border-slate-100">
                           <div className="flex items-center gap-3">
                             <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center border border-slate-200 shadow-sm shrink-0">
                               <Users size={14} className="text-slate-500" />
                             </div>
                             <span className="text-xs font-bold text-black truncate max-w-[180px]">
                               {selectedRole === 'ADMIN' ? email : staffEmail}
                             </span>
                           </div>
                           <button type="button" onClick={() => { setLoginStep(1); setError(''); setPassword(''); setStaffPassword(''); }} className="text-[10px] font-bold text-orange-600 hover:underline">Change</button>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Password</label>
                          <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} strokeWidth={2} />
                            <input 
                              type={showPassword ? "text" : "password"} 
                              placeholder="••••••••" 
                              value={selectedRole === 'ADMIN' ? password : staffPassword} 
                              onChange={e => selectedRole === 'ADMIN' ? setPassword(e.target.value) : setStaffPassword(e.target.value)} 
                              required
                              className="w-full pl-11 pr-11 py-3.5 bg-transparent border border-slate-200 rounded-2xl focus:border-orange-500 focus:ring-4 focus:ring-orange-50 outline-none text-sm font-medium text-black dark:text-white transition-all placeholder:text-slate-300" 
                            />
                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-black transition-colors">
                              {showPassword ? <EyeOff size={16} strokeWidth={2} /> : <Eye size={16} strokeWidth={2} />}
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center justify-between px-1">
                          <label className="flex items-center gap-2 cursor-pointer group">
                            <div className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${rememberMe ? 'bg-orange-600 border-orange-600' : 'bg-white border-slate-300 group-hover:border-orange-500'}`}>
                              {rememberMe && <CheckCircle2 size={12} className="text-white" strokeWidth={3} />}
                            </div>
                            <span className="text-[10px] font-bold text-slate-500">Remember me</span>
                            <input type="checkbox" className="hidden" checked={rememberMe} onChange={() => setRememberMe(!rememberMe)} />
                          </label>
                          <button type="button" onClick={openForgotPassword} className="text-[10px] font-bold text-orange-600 hover:underline">Forgot password?</button>
                        </div>
                      </motion.div>
                    )}

                    {error && (
                      <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-start gap-3">
                        <X size={14} className="text-rose-600 shrink-0 mt-0.5" />
                        <p className="text-[11px] font-bold text-rose-700 leading-tight">{error}</p>
                      </div>
                    )}

                    <button 
                      type="submit"
                      disabled={loginStep === 1 ? isResolvingEmail : isLoading} 
                      className="w-full py-4 bg-orange-600 text-white rounded-2xl font-bold tracking-wide text-xs shadow-lg shadow-orange-500/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2 hover:bg-orange-700 disabled:opacity-60 disabled:cursor-not-allowed mt-2"
                    >
                      {loginStep === 1 ? (
                        isResolvingEmail ? <Loader2 className="animate-spin w-4 h-4" /> : <>Continue <ChevronRight size={16} /></>
                      ) : (
                        isLoading ? <Loader2 className="animate-spin w-4 h-4" /> : <>Sign In <ArrowRight size={16} /></>
                      )}
                    </button>

                    {selectedRole === 'ADMIN' && loginStep === 1 && (
                      <div className="mt-8 pt-8 border-t border-slate-100 flex flex-col items-center gap-2">
                        <p className="text-[10px] font-medium text-slate-400">New institution?</p>
                        <button 
                          type="button"
                          onClick={() => navigate('/')} 
                          className="text-[11px] font-bold text-black hover:text-orange-600 transition-colors"
                        >
                          Register your school
                        </button>
                      </div>
                    )}

                    {/* Dev Mode Switcher for Parent Portal */}
                    {isDevEnvironment && selectedRole === 'PARENT' && (
                      <div className="mt-8 pt-6 border-t border-slate-100">
                        <div className="flex items-center justify-between mb-4">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Developer Tools</span>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                              type="checkbox" 
                              className="sr-only peer" 
                              checked={isDevMode} 
                              onChange={() => setIsDevMode(!isDevMode)} 
                            />
                            <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-orange-500"></div>
                          </label>
                        </div>
                        
                        {isDevMode && (
                          <button
                            type="button"
                            onClick={() => {
                              if (setMockProfile) {
                                setMockProfile({
                                  role: 'PARENT',
                                  schoolId: 'demo-school-id',
                                  edition: 'professional',
                                  enabledModules: ['parent-dashboard', 'parent-fees', 'parent-attendance', 'parent-health', 'parent-contact'],
                                  isPlatformAdmin: false,
                                  onboardingCompleted: true,
                                  name: 'Dev Parent (Simulated)',
                                  learnerId: 'dev-learner-001'
                                });
                                toast.success('Dev Mode: Simulated Parent login');
                                onSelectRole('PARENT' as UserRole);
                              }
                            }}
                            className="w-full py-3 bg-orange-50 border border-orange-200 text-orange-600 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-orange-100 transition-all flex items-center justify-center gap-2"
                          >
                            <Activity size={14} /> Simulate Parent Login
                          </button>
                        )}
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
        <p className="text-[9px] font-bold text-black dark:text-white">
          Institutional security architecture v2.4.0
        </p>
      </footer>

      {/* ─── Forgot Password Modal ──────────────────────────── */}
      <AnimatePresence>
        {showForgotModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowForgotModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm cursor-pointer"
            />
            
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{ type: 'spring', duration: 0.4 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl rounded-3xl p-8 max-w-md w-full mx-4 relative z-10 flex flex-col"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-orange-50 dark:bg-orange-500/10 text-orange-600 flex items-center justify-center border border-orange-100/50">
                    <Lock size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black tracking-tight text-black dark:text-white">Reset Password</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Secure recovery portal</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowForgotModal(false)}
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {!resetSent ? (
                <form onSubmit={handlePasswordReset} className="space-y-6">
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Enter your institutional email address below. We'll send you a link to reset your password and gain portal access.
                  </p>
                  
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 ml-1 tracking-widest uppercase">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input 
                        type="email" 
                        required 
                        placeholder="yourname@school.com"
                        value={forgotEmail}
                        onChange={e => setForgotEmail(e.target.value)}
                        className="w-full pl-11 pr-5 py-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs md:text-sm text-black dark:text-white focus:outline-none focus:ring-4 focus:ring-orange-500/20 focus:border-orange-500 font-medium transition-all" 
                      />
                    </div>
                  </div>

                  {resetError && (
                    <div className="p-4 bg-rose-50 border border-rose-105 rounded-2xl flex items-start gap-3">
                      <X size={14} className="text-rose-600 shrink-0 mt-0.5" />
                      <p className="text-[10px] font-bold text-rose-700 leading-tight">{resetError}</p>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button 
                      type="button"
                      onClick={() => setShowForgotModal(false)}
                      className="flex-1 py-3 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors uppercase tracking-wider cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit"
                      disabled={isSendingReset}
                      className="flex-1 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl text-xs font-bold transition-all shadow-md active:scale-95 disabled:opacity-60 flex items-center justify-center gap-2 uppercase tracking-wider cursor-pointer"
                    >
                      {isSendingReset ? <Loader2 className="animate-spin w-4 h-4" /> : 'Send Link'}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-6 text-center py-4">
                  <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 rounded-[2rem] flex items-center justify-center mx-auto border border-emerald-100/50 animate-bounce">
                    <CheckCircle2 size={32} />
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-extrabold text-sm text-black dark:text-white">Email Sent!</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-sm mx-auto">
                      A password reset link has been sent to <span className="font-bold text-orange-600">{forgotEmail}</span>. Please click the link in the email to select your new secure password.
                    </p>
                  </div>
                  <button 
                    onClick={() => setShowForgotModal(false)}
                    className="w-full py-3 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-2xl text-xs font-bold transition-colors uppercase tracking-wider cursor-pointer"
                  >
                    Back to Sign In
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LoginPage;


