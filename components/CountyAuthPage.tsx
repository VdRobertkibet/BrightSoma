import React, { useState } from 'react';
import { ShieldCheck, ArrowLeft, Eye, EyeOff, ChevronDown, MapPin, Activity, LogIn, UserPlus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import toast from 'react-hot-toast';

const KENYA_COUNTIES = [
  'Baringo','Bomet','Bungoma','Busia','Elgeyo-Marakwet','Embu','Garissa',
  'Homa Bay','Isiolo','Kajiado','Kakamega','Kericho','Kiambu','Kilifi',
  'Kirinyaga','Kisii','Kisumu','Kitui','Kwale','Laikipia','Lamu','Machakos',
  'Makueni','Mandera','Marsabit','Meru','Migori','Mombasa','Murang\'a',
  'Nairobi','Nakuru','Nandi','Narok','Nyamira','Nyandarua','Nyeri',
  'Samburu','Siaya','Taita-Taveta','Tana River','Tharaka-Nithi','Trans Nzoia',
  'Turkana','Uasin Gishu','Vihiga','Wajir','West Pokot',
];

type AuthMode = 'select' | 'login' | 'register';

interface Props {
  onAuthenticated: (county: string) => void;
  onBack: () => void;
}

const CountyAuthPage: React.FC<Props> = ({ onAuthenticated, onBack }) => {
  const [mode,       setMode]       = useState<AuthMode>('select');
  const [county,     setCounty]     = useState('');
  const [showPwd,    setShowPwd]    = useState(false);
  const [searching,  setSearching]  = useState('');
  const [showDrop,   setShowDrop]   = useState(false);
  const [loading,    setLoading]    = useState(false);
  const [form,       setForm]       = useState({ name:'', email:'', password:'', designation:'' });

  const filteredCounties = KENYA_COUNTIES.filter(c =>
    c.toLowerCase().includes(searching.toLowerCase())
  );

  const handleContinue = () => {
    if (!county) { toast.error('Please select your county'); return; }
    setMode('login');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email || !form.password) { toast.error('Enter email and password'); return; }
    setLoading(true);
    await new Promise(r => setTimeout(r, 1200));
    setLoading(false);
    toast.success(`Welcome back! Logging into ${county} County Portal`);
    onAuthenticated(county);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password || !form.designation) {
      toast.error('Please fill all fields'); return;
    }
    setLoading(true);
    await new Promise(r => setTimeout(r, 1500));
    setLoading(false);
    toast.success(`Account created! Welcome to ${county} County Portal`);
    onAuthenticated(county);
  };

  return (
    <div className="min-h-screen bg-[#fcfaf2] flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Background blobs */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-stone-200/40 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/4 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500/5 rounded-full blur-[120px] translate-y-1/2 -translate-x-1/4 pointer-events-none" />

      {/* Back button */}
      <button
        onClick={onBack}
        className="absolute top-6 left-6 flex items-center gap-2 text-stone-600 hover:text-stone-900 transition-colors text-sm font-bold"
      >
        <ArrowLeft size={16} /> Back to Home
      </button>

      <div className="w-full max-w-md relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-stone-900 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-stone-900/10">
            <ShieldCheck size={28} className="text-[#fcfaf2]" />
          </div>
          <h1 className="text-2xl font-black text-stone-900 tracking-tight">County ECDE Portal</h1>
          <p className="text-stone-500 text-sm mt-1 font-medium italic">
            {mode === 'select'   ? 'Select your county to begin executive session'   :
             mode === 'login'    ? `Sign in — ${county} County Executive`            :
                                   `Register — ${county} County Administration`}
          </p>
        </div>

        <AnimatePresence mode="wait">
          {/* ── COUNTY SELECT ── */}
          {mode === 'select' && (
            <motion.div key="select" initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-12}} transition={{duration:0.2}}>
              <div className="bg-white border border-stone-100 rounded-[2rem] p-8 shadow-2xl shadow-stone-900/5">
                <label className="block text-[11px] font-black text-stone-400 tracking-widest uppercase mb-3 text-center leading-none">Official Jurisdiction</label>
                <div className="relative mb-6">
                  <button
                    type="button"
                    onClick={() => setShowDrop(!showDrop)}
                    className="w-full flex items-center justify-between px-4 py-4 bg-stone-50 border border-stone-100 rounded-2xl text-sm font-bold text-stone-900 hover:bg-stone-100 transition-all shadow-inner"
                  >
                    <span className="flex items-center gap-2">
                       <MapPin size={16} className="text-[#1DA1F2]" />
                       {county || <span className="text-stone-400 font-normal">Select County Portal...</span>}
                    </span>
                    <ChevronDown size={16} className={`text-stone-400 transition-transform ${showDrop?'rotate-180':''}`} />
                  </button>

                  {showDrop && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="p-3 border-b border-stone-100 bg-stone-50">
                        <input
                          autoFocus
                          type="text"
                          placeholder="Find your county..."
                          value={searching}
                          onChange={e => setSearching(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-stone-100 rounded-xl text-sm text-stone-900 placeholder-stone-400 outline-none font-bold"
                        />
                      </div>
                      <div className="max-h-52 overflow-y-auto no-scrollbar">
                        {filteredCounties.map(c => (
                          <button
                            key={c}
                            onClick={() => { setCounty(c); setShowDrop(false); setSearching(''); }}
                            className={`w-full text-left px-4 py-3 text-sm font-bold transition-all border-b border-stone-50 last:border-none ${c===county?'bg-[#1DA1F2] text-white':'text-stone-600 hover:bg-stone-50'}`}
                          >
                            {c}
                          </button>
                        ))}
                        {filteredCounties.length === 0 && <p className="px-4 py-4 text-stone-400 text-xs italic text-center text-balance leading-none font-bold">The requested jurisdiction was not found in the Gov-Tech registry.</p>}
                      </div>
                    </div>
                  )}
                </div>

                <button
                  onClick={handleContinue}
                  className="w-full py-4 bg-sky-600 hover:bg-sky-700 text-white rounded-2xl font-bold text-sm uppercase tracking-widest transition-all shadow-xl shadow-sky-500/20 active:scale-95"
                >
                  Continue to Credentials
                </button>
              </div>
            </motion.div>
          )}

          {/* ── LOGIN ── */}
          {mode === 'login' && (
            <motion.div key="login" initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-12}} transition={{duration:0.2}}>
              <div className="bg-white border border-stone-100 rounded-[2rem] p-8 shadow-2xl shadow-stone-900/5">
                <form onSubmit={handleLogin} className="space-y-5">
                  <div>
                    <label className="block text-[10px] font-black text-stone-500 uppercase tracking-widest mb-2 leading-none">Security Identifier (Email)</label>
                    <input
                      type="email"
                      required
                      value={form.email}
                      onChange={e => setForm({...form, email:e.target.value})}
                      placeholder="officer@county.go.ke"
                      className="w-full px-4 py-3.5 bg-stone-50 border border-stone-100 rounded-2xl text-sm text-stone-900 placeholder-stone-400 outline-none focus:border-[#1DA1F2] transition-all font-bold shadow-inner"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-stone-500 uppercase tracking-widest mb-2 leading-none">Administrative Password</label>
                    <div className="relative">
                      <input
                        type={showPwd ? 'text' : 'password'}
                        required
                        value={form.password}
                        onChange={e => setForm({...form, password:e.target.value})}
                        placeholder="Enter credentials"
                        className="w-full px-4 py-3.5 pr-12 bg-stone-50 border border-stone-100 rounded-2xl text-sm text-stone-900 placeholder-stone-400 outline-none focus:border-[#1DA1F2] transition-all font-bold shadow-inner"
                      />
                      <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-900 transition-colors">
                        {showPwd ? <EyeOff size={18}/> : <Eye size={18}/>}
                      </button>
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-4 bg-sky-600 hover:bg-sky-700 disabled:opacity-60 text-white rounded-2xl font-bold text-sm uppercase tracking-widest transition-all shadow-xl shadow-sky-500/20 active:scale-95 flex items-center justify-center gap-2"
                  >
                    {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : <><LogIn size={18}/> Establish Session</>}
                  </button>
                </form>
                <div className="mt-6 flex flex-col gap-3 text-center">
                  <button className="text-[11px] text-stone-400 hover:text-stone-900 transition-colors font-bold tracking-tight">Request Access Recovery</button>
                  <button onClick={() => setMode('register')} className="text-[11px] font-black text-[#1DA1F2] hover:text-[#1991DB] transition-colors flex items-center gap-1 justify-center uppercase tracking-widest">
                    <UserPlus size={14}/> Provision New Account
                  </button>
                  <button onClick={() => setMode('select')} className="text-[10px] text-stone-400 hover:text-stone-900 transition-colors mt-2 font-bold uppercase tracking-[0.2em]">
                    ← Change Registry
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── REGISTER ── */}
          {mode === 'register' && (
            <motion.div key="register" initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-12}} transition={{duration:0.2}}>
              <div className="bg-white border border-stone-100 rounded-[2rem] p-8 shadow-2xl shadow-stone-900/5 overflow-y-auto max-h-[65vh] no-scrollbar">
                <form onSubmit={handleRegister} className="space-y-4">
                  {[
                    { label:'Full Official Name',  key:'name',        type:'text',     placeholder:'Hon. Director James Mwangi' },
                    { label:'Government Email',    key:'email',       type:'email',    placeholder:'james@county.go.ke' },
                    { label:'Strategic Role',      key:'designation', type:'text',     placeholder:'County ECDE Director' },
                  ].map(field => (
                    <div key={field.key}>
                      <label className="block text-[10px] font-black text-stone-500 uppercase tracking-widest mb-2 leading-none">{field.label}</label>
                      <input
                        type={field.type}
                        required
                        value={(form as any)[field.key]}
                        onChange={e => setForm({...form, [field.key]:e.target.value})}
                        placeholder={field.placeholder}
                        className="w-full px-4 py-3 bg-stone-50 border border-stone-100 rounded-2xl text-sm text-stone-900 placeholder-stone-400 outline-none focus:border-[#1DA1F2] transition-all font-bold shadow-inner"
                      />
                    </div>
                  ))}
                  <div>
                    <label className="block text-[10px] font-black text-stone-500 uppercase tracking-widest mb-2 leading-none">Security Keycard (Password)</label>
                    <div className="relative">
                      <input
                        type={showPwd ? 'text' : 'password'}
                        required
                        value={form.password}
                        onChange={e => setForm({...form, password:e.target.value})}
                        placeholder="Establish secure keycard"
                        className="w-full px-4 py-3 pr-12 bg-stone-50 border border-stone-100 rounded-2xl text-sm text-stone-900 placeholder-stone-400 outline-none focus:border-[#1DA1F2] transition-all font-bold shadow-inner"
                      />
                      <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-900">
                        {showPwd ? <EyeOff size={18}/> : <Eye size={18}/>}
                      </button>
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-4 bg-sky-600 hover:bg-sky-700 disabled:opacity-60 text-white rounded-2xl font-bold text-sm uppercase tracking-widest transition-all shadow-xl shadow-sky-500/20 active:scale-95 flex items-center justify-center gap-2"
                  >
                    {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : <><UserPlus size={18}/> Request Provisioning</>}
                  </button>
                </form>
                <div className="mt-6 text-center space-y-3">
                  <button onClick={() => setMode('login')} className="text-[11px] font-black text-[#1DA1F2] hover:text-[#1991DB] transition-colors flex items-center gap-1 justify-center mx-auto uppercase tracking-widest">
                    <LogIn size={14}/> Already Provisioned? Sign In
                  </button>
                  <button onClick={() => setMode('select')} className="text-[10px] text-stone-400 hover:text-stone-900 transition-colors mt-2 font-bold uppercase tracking-[0.2em]">
                    ← Change Registry
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer */}
        <p className="text-center text-[10px] text-stone-400 mt-8 font-black tracking-[0.3em] uppercase opacity-60">
          Secured · Kenya Gov-Tech · Executive ECDE Intelligence
        </p>
      </div>
    </div>
  );

};

export default CountyAuthPage;
