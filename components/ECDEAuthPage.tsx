import React, { useState } from 'react';
import { School, ArrowLeft, Eye, EyeOff, Hash, User, LogIn, ShieldCheck, X, Mail, Lock, CheckCircle2, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import toast from 'react-hot-toast';

interface Props {
  onAuthenticated: (schoolName: string) => void;
  onBack: () => void;
}

const ECDEAuthPage: React.FC<Props> = ({ onAuthenticated, onBack }) => {
  const [centerCode, setCenterCode] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);

  // Forgot password states
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotCenterCode, setForgotCenterCode] = useState('');
  const [forgotEmail, setForgotEmail] = useState('');
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!centerCode || !password) {
      toast.error('Please enter both Center Code and Password');
      return;
    }
    
    setLoading(true);
    // Simulate auth
    await new Promise(r => setTimeout(r, 1500));
    setLoading(false);

    // For demo purposes, we'll just use a mock name
    const mockSchoolName = "Sunshine ECDE Center";
    toast.success(`Successfully logged into ${mockSchoolName}`);
    onAuthenticated(mockSchoolName);
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotCenterCode.trim() || !forgotEmail.trim()) {
      toast.error('Please fill in all fields');
      return;
    }
    setIsSendingReset(true);
    // Simulate reset link dispatch
    await new Promise(r => setTimeout(r, 1200));
    setIsSendingReset(false);
    setResetSent(true);
    toast.success('Password reset link sent to registered administrator email!');
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6 relative overflow-hidden font-sans">
      {/* Premium background accents */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-orange-600/5 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-orange-600/5 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2 pointer-events-none" />

      {/* Back button */}
      <button
        onClick={onBack}
        className="absolute top-8 left-8 flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-all text-xs font-bold tracking-widest uppercase"
      >
        <ArrowLeft size={16} /> Back
      </button>

      <div className="w-full max-w-md relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="w-20 h-20 bg-[#39396d] rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-[#39396d]/20">
            <School size={36} className="text-white" />
          </div>
          <h1 className="text-3xl font-black text-[#39396d] tracking-tight mb-3">ECDE Center Portal</h1>
          <p className="text-slate-500 text-sm font-medium px-10 leading-relaxed">
            Individual school management for Head Teachers and Administrators.
          </p>
          <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 bg-orange-50 text-orange-600 rounded-full text-[10px] font-bold uppercase tracking-widest border border-orange-100">
             <ShieldCheck size={12} /> Managed by County Oversight
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-white border border-slate-100 rounded-[3rem] p-10 shadow-3xl shadow-slate-200/50"
        >
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">Center Registry Code</label>
              <div className="relative">
                <Hash className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <input
                  type="text"
                  required
                  value={centerCode}
                  onChange={e => setCenterCode(e.target.value.toUpperCase())}
                  placeholder="e.g. NRB-ECDE-047"
                  className="w-full pl-14 pr-5 py-5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-900 placeholder-slate-300 outline-none focus:border-[#39396d] transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">Administrator Password</label>
              <div className="relative">
                <User className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <input
                  type={showPwd ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter secure password"
                  className="w-full pl-14 pr-14 py-5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-900 placeholder-slate-300 outline-none focus:border-[#39396d] transition-all"
                />
                <button 
                  type="button" 
                  onClick={() => setShowPwd(!showPwd)} 
                  className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-900 transition-colors"
                >
                  {showPwd ? <EyeOff size={20}/> : <Eye size={20}/>}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-5 bg-orange-600 hover:bg-orange-700 disabled:opacity-60 text-white rounded-2xl font-bold text-xs uppercase tracking-widest transition-all shadow-xl shadow-orange-200 active:scale-95 flex items-center justify-center gap-3"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
              ) : (
                <><LogIn size={18}/> Access Center Portal</>
              )}
            </button>
          </form>

          <div className="mt-8 pt-8 border-t border-slate-50 text-center">
            <button 
              type="button"
              onClick={() => {
                setForgotCenterCode(centerCode);
                setForgotEmail('');
                setResetSent(false);
                setShowForgotModal(true);
              }}
              className="text-[11px] font-bold text-slate-400 hover:text-[#39396d] transition-colors"
            >
              Forgot Center Code or Password?
            </button>
          </div>
        </motion.div>

        {/* Footer info */}
        <div className="mt-12 flex flex-col items-center gap-4">
           <p className="text-[9px] font-bold text-slate-300 uppercase tracking-[0.4em]">BrightSoma Unified Education System</p>
           <div className="flex items-center gap-3 grayscale opacity-40">
              <div className="w-6 h-6 bg-slate-200 rounded-lg" />
              <div className="w-6 h-6 bg-slate-200 rounded-lg" />
              <div className="w-6 h-6 bg-slate-200 rounded-lg" />
           </div>
        </div>
      </div>

      {/* ─── Forgot Password Modal ──────────────────────────── */}
      <AnimatePresence>
        {showForgotModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowForgotModal(false)}
              className="absolute inset-0 bg-[#39396d]/40 backdrop-blur-sm cursor-pointer"
            />
            
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{ type: 'spring', duration: 0.4 }}
              className="bg-white border border-slate-200 shadow-2xl rounded-3xl p-8 max-w-md w-full mx-4 relative z-10 flex flex-col"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center border border-orange-100/50">
                    <Lock size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black tracking-tight text-[#39396d]">Reset Password</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Secure recovery portal</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowForgotModal(false)}
                  className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {!resetSent ? (
                <form onSubmit={handlePasswordReset} className="space-y-6">
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Enter your Center Registry Code and the registered administrator email below to receive password recovery instructions.
                  </p>
                  
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 ml-1 tracking-widest uppercase">Center Registry Code</label>
                    <div className="relative">
                      <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input 
                        type="text" 
                        required 
                        placeholder="e.g. NRB-ECDE-047"
                        value={forgotCenterCode}
                        onChange={e => setForgotCenterCode(e.target.value.toUpperCase())}
                        className="w-full pl-11 pr-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs md:text-sm text-slate-900 focus:outline-none focus:ring-4 focus:ring-[#39396d]/20 focus:border-[#39396d] font-bold transition-all" 
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 ml-1 tracking-widest uppercase">Registered Email</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input 
                        type="email" 
                        required 
                        placeholder="admin@school.com"
                        value={forgotEmail}
                        onChange={e => setForgotEmail(e.target.value)}
                        className="w-full pl-11 pr-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs md:text-sm text-slate-900 focus:outline-none focus:ring-4 focus:ring-[#39396d]/20 focus:border-[#39396d] font-bold transition-all" 
                      />
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button 
                      type="button"
                      onClick={() => setShowForgotModal(false)}
                      className="flex-1 py-3 border border-slate-200 rounded-2xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors uppercase tracking-wider cursor-pointer"
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
                  <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-[2rem] flex items-center justify-center mx-auto border border-emerald-100/50 animate-bounce">
                    <CheckCircle2 size={32} />
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-extrabold text-sm text-slate-900">Recovery Email Sent!</h4>
                    <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">
                      A password recovery link has been sent to the registered email address for Center <span className="font-bold text-orange-600">{forgotCenterCode}</span>. Please click the link to configure your credentials.
                    </p>
                  </div>
                  <button 
                    onClick={() => setShowForgotModal(false)}
                    className="w-full py-3 bg-[#39396d] hover:bg-[#2c2c54] text-white rounded-2xl text-xs font-bold transition-colors uppercase tracking-wider cursor-pointer"
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

export default ECDEAuthPage;
