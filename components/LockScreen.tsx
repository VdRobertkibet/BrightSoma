
import React, { useState } from 'react';
import { Lock, Eye, EyeOff, LogOut, ShieldCheck, Loader2 } from 'lucide-react';
import { auth } from '../src/firebase';
import { EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { motion, AnimatePresence } from 'motion/react';
import toast from 'react-hot-toast';

interface LockScreenProps {
  userProfile: any;
  onUnlock: () => void;
  isDarkMode: boolean;
}

const LockScreen: React.FC<LockScreenProps> = ({ userProfile, onUnlock, isDarkMode }) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [error, setError] = useState('');

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;

    setIsUnlocking(true);
    setError('');

    try {
      const user = auth.currentUser;
      if (!user || !user.email) {
        throw new Error("Session expired. Please log in again.");
      }

      // Re-authenticate to verify password
      const credential = EmailAuthProvider.credential(user.email, password);
      await reauthenticateWithCredential(user, credential);
      
      toast.success("Welcome back!");
      onUnlock();
    } catch (err: any) {
      console.error("Unlock error:", err);
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError("Incorrect password. Please try again.");
      } else {
        setError(err.message || "Failed to unlock session.");
      }
    } finally {
      setIsUnlocking(false);
    }
  };

  const handleLogout = async () => {
    if (confirm("Are you sure you want to log out? Any unsaved changes will be lost.")) {
      await auth.signOut();
      window.location.reload();
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/40 backdrop-blur-xl transition-all duration-500"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 via-transparent to-blue-500/10" />
      
      <motion.div 
        initial={{ y: 20, scale: 0.95 }}
        animate={{ y: 0, scale: 1 }}
        className="relative w-full max-w-md p-10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-[3rem] border border-white/20 dark:border-slate-800/50 shadow-2xl flex flex-col items-center gap-8"
      >
        {/* Profile Section */}
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center text-orange-600 dark:text-orange-400 border-4 border-white dark:border-slate-800 shadow-xl overflow-hidden">
              {userProfile?.profilePhoto ? (
                <img src={userProfile.profilePhoto} alt="User" className="w-full h-full object-cover" />
              ) : (
                <span className="text-3xl font-black">{userProfile?.name?.charAt(0) || 'U'}</span>
              )}
            </div>
            <div className="absolute -bottom-1 -right-1 p-2 bg-orange-600 text-white rounded-full border-4 border-white dark:border-slate-900">
              <Lock size={14} />
            </div>
          </div>
          <div className="text-center">
            <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight leading-tight">Session Locked</h2>
            <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mt-1 uppercase tracking-widest">{userProfile?.name}</p>
          </div>
        </div>

        {/* Form Section */}
        <form onSubmit={handleUnlock} className="w-full space-y-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1">Password</label>
            <div className="relative group">
              <input 
                autoFocus
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password to unlock"
                className="w-full px-6 py-4 bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-white focus:outline-none focus:ring-4 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-bold"
              />
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                title={showPassword ? "Hide Password" : "Show Password"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <AnimatePresence>
            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-900/30 p-3 rounded-xl flex items-center gap-2 text-rose-600 dark:text-rose-400 text-xs font-bold"
              >
                <Lock size={14} />
                <span>{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <button 
            type="submit"
            disabled={isUnlocking}
            className="w-full py-4.5 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl font-black shadow-xl shadow-orange-500/25 transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50"
          >
            {isUnlocking ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              <>
                <ShieldCheck size={20} />
                Unlock Portal
              </>
            )}
          </button>
        </form>

        {/* Footer Actions */}
        <div className="flex items-center gap-6">
          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 text-[10px] font-black text-slate-400 hover:text-rose-500 dark:text-slate-500 dark:hover:text-rose-400 transition-colors uppercase tracking-[0.15em]"
          >
            <LogOut size={14} />
            Logout & Exit
          </button>
        </div>

        {/* Brand */}
        <div className="pt-4 flex items-center gap-2 opacity-30 grayscale hover:grayscale-0 hover:opacity-100 transition-all">
          <span className="text-sm font-black text-slate-900 dark:text-white">Bright<span className="text-orange-600">Soma</span> Security</span>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default LockScreen;
