/**
 * @component AdminBootstrap
 * @description ONE-TIME setup tool for creating the Platform Admin account in Firestore.
 * Accessible ONLY via the secret URL: /?setup=brightsoma-admin-2024
 * 
 * This page is NOT linked anywhere in the app. Once setup is complete,
 * the admin logs in normally via School Director and is auto-detected.
 */
import React, { useState, useEffect } from 'react';
import { auth, db } from '../src/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { ShieldCheck, CheckCircle2, AlertCircle, Loader2, Eye, EyeOff } from 'lucide-react';

const AdminBootstrap: React.FC = () => {
  const [step, setStep] = useState<'login' | 'confirm' | 'done' | 'error'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [uid, setUid] = useState('');
  const [existingRole, setExistingRole] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    // Check if already logged in
    const user = auth.currentUser;
    if (user) {
      setUid(user.uid);
      checkExistingRole(user.uid);
      setStep('confirm');
    }
  }, []);

  const checkExistingRole = async (userId: string) => {
    const snap = await getDoc(doc(db, 'users', userId));
    if (snap.exists()) {
      setExistingRole(snap.data().role ?? '(no role field)');
    } else {
      setExistingRole('(document does not exist)');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const user = cred.user;
      setUid(user.uid);
      await checkExistingRole(user.uid);
      setStep('confirm');
    } catch (err: any) {
      setErrorMsg(err.message ?? 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBootstrap = async () => {
    setIsLoading(true);
    try {
      await setDoc(doc(db, 'users', uid), {
        role: 'PLATFORM_ADMIN',
        email: auth.currentUser?.email ?? '',
        displayName: auth.currentUser?.displayName ?? 'Platform Owner',
        createdAt: new Date().toISOString(),
      }, { merge: true });
      setStep('done');
    } catch (err: any) {
      setErrorMsg(err.message ?? 'Failed to write to Firestore');
      setStep('error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex p-4 bg-indigo-600 rounded-3xl mb-4 shadow-2xl shadow-indigo-900/50">
            <ShieldCheck size={40} className="text-white" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">Platform Admin Setup</h1>
          <p className="text-slate-400 text-sm mt-1 font-medium">One-time account bootstrap tool</p>
          <div className="mt-2 px-3 py-1 bg-red-900/30 border border-red-800/50 rounded-full text-[10px] font-bold text-red-400 uppercase tracking-widest inline-block">
            ⚠ Internal Tool — Do Not Share This URL
          </div>
        </div>

        <div className="bg-slate-900 rounded-[2.5rem] border border-slate-800 overflow-hidden shadow-2xl">
          
          {/* Step 1: Login */}
          {step === 'login' && (
            <form onSubmit={handleLogin} className="p-8 space-y-6">
              <div>
                <p className="text-slate-400 text-sm font-medium mb-6 leading-relaxed">
                  Log in with your platform admin email. This will create or update your 
                  Firestore record to grant <span className="text-indigo-400 font-bold">PLATFORM_ADMIN</span> access.
                </p>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Email</label>
                  <input
                    type="email" required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="admin@yourdomain.com"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'} required
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3 pr-12 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="••••••••"
                    />
                    <button type="button" onClick={() => setShowPassword(s => !s)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                      {showPassword ? <EyeOff size={16}/> : <Eye size={16}/>}
                    </button>
                  </div>
                </div>
              </div>
              {errorMsg && (
                <div className="flex items-start gap-2 p-3 bg-red-900/20 border border-red-800/50 rounded-xl">
                  <AlertCircle size={14} className="text-red-400 shrink-0 mt-0.5" />
                  <p className="text-red-400 text-xs font-medium">{errorMsg}</p>
                </div>
              )}
              <button
                type="submit" disabled={isLoading}
                className="w-full py-3.5 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-indigo-900/40"
              >
                {isLoading ? <Loader2 size={18} className="animate-spin" /> : <ShieldCheck size={18} />}
                {isLoading ? 'Authenticating...' : 'Continue'}
              </button>
            </form>
          )}

          {/* Step 2: Confirm */}
          {step === 'confirm' && (
            <div className="p-8 space-y-6">
              <div>
                <h2 className="text-lg font-black text-white mb-2">Confirm Setup</h2>
                <p className="text-slate-400 text-sm font-medium leading-relaxed">
                  This will write <span className="text-indigo-400 font-bold">PLATFORM_ADMIN</span> to your Firestore user document.
                </p>
              </div>
              <div className="bg-slate-800 rounded-2xl p-4 space-y-3">
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">System UID</p>
                  <p className="text-xs font-mono text-slate-300 break-all">{uid}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Current Role in Firestore</p>
                  <p className="text-sm font-bold text-orange-400">{existingRole ?? 'Loading...'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">New Role After Setup</p>
                  <p className="text-sm font-bold text-indigo-400">PLATFORM_ADMIN</p>
                </div>
              </div>
              {errorMsg && (
                <div className="flex items-start gap-2 p-3 bg-red-900/20 border border-red-800/50 rounded-xl">
                  <AlertCircle size={14} className="text-red-400 shrink-0 mt-0.5"/>
                  <p className="text-red-400 text-xs font-medium">{errorMsg}</p>
                </div>
              )}
              <button
                onClick={handleBootstrap} disabled={isLoading}
                className="w-full py-3.5 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-indigo-900/40"
              >
                {isLoading ? <Loader2 size={18} className="animate-spin" /> : <ShieldCheck size={18} />}
                {isLoading ? 'Setting up...' : 'Grant PLATFORM_ADMIN Access'}
              </button>
              <button onClick={() => setStep('login')} className="w-full py-2 text-slate-500 text-sm font-bold hover:text-slate-300 transition-colors">
                ← Use a different account
              </button>
            </div>
          )}

          {/* Step 3: Done */}
          {step === 'done' && (
            <div className="p-8 text-center space-y-6">
              <div className="flex justify-center">
                <div className="p-4 bg-emerald-900/30 rounded-3xl border border-emerald-800/50">
                  <CheckCircle2 size={40} className="text-emerald-400" />
                </div>
              </div>
              <div>
                <h2 className="text-xl font-black text-white mb-2">Setup Complete!</h2>
                <p className="text-slate-400 text-sm font-medium leading-relaxed">
                  Your account now has <span className="text-emerald-400 font-bold">PLATFORM_ADMIN</span> access.<br/>
                  Close this tab and log in normally.
                </p>
              </div>
              <div className="bg-slate-800 rounded-2xl p-5 text-left space-y-2">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Next Steps</p>
                <p className="text-sm text-slate-300 font-medium">1. Go to <span className="text-orange-400">brightsoma-5f407.web.app</span></p>
                <p className="text-sm text-slate-300 font-medium">2. Click <span className="text-orange-400">School Director</span></p>
                <p className="text-sm text-slate-300 font-medium">3. Enter your email &amp; password</p>
                <p className="text-sm text-slate-300 font-medium">4. You will land on the <span className="text-indigo-400 font-bold">Platform Admin Dashboard</span> 🚀</p>
              </div>
            </div>
          )}

          {/* Error */}
          {step === 'error' && (
            <div className="p-8 text-center space-y-4">
              <AlertCircle size={40} className="text-red-400 mx-auto" />
              <h2 className="text-xl font-black text-white">Setup Failed</h2>
              <p className="text-red-400 text-sm font-medium">{errorMsg}</p>
              <button onClick={() => setStep('confirm')} className="w-full py-3 bg-slate-800 text-white font-bold rounded-2xl hover:bg-slate-700 transition-all">
                Try Again
              </button>
            </div>
          )}
        </div>

        <p className="text-center text-slate-600 text-xs mt-6 font-medium">
          BrightSoma Platform · Internal Admin Bootstrap · v1.0
        </p>
      </div>
    </div>
  );
};

export default AdminBootstrap;
