import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Users, GraduationCap, Wallet, Activity, ArrowLeft, School as SchoolIcon } from 'lucide-react';
import { motion } from 'motion/react';

const roles = [
  { role: 'ADMIN', title: 'School Director', description: 'Institutional Oversight And Strategy.', icon: <ShieldCheck size={24} strokeWidth={1.5} />, color: 'text-orange-600 bg-orange-50' },
  { role: 'TEACHER', title: 'Teacher', description: 'Cbc Assessments And Learner Growth.', icon: <Users size={24} strokeWidth={1.5} />, color: 'text-blue-600 bg-blue-50' },
  { role: 'PRINCIPAL', title: 'Principal', description: 'Academic Health And Staff Performance.', icon: <GraduationCap size={24} strokeWidth={1.5} />, color: 'text-emerald-600 bg-emerald-50' },
  { role: 'FINANCE', title: 'Finance Officer', description: 'Fee Collection And Etims Compliance.', icon: <Wallet size={24} strokeWidth={1.5} />, color: 'text-violet-600 bg-violet-50' },
  { role: 'PLATFORM_ADMIN', title: 'System Owner', description: 'Global Platform Control.', icon: <Activity size={24} strokeWidth={1.5} />, color: 'text-slate-600 bg-slate-50' },
];

const SignInPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-orange-100 flex flex-col">
      {/* ─── HEADER ─────────────────────────────────────────── */}
      <header className="h-20 px-6 flex items-center justify-between border-b border-slate-50">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
          <div className="w-10 h-10 rounded-2xl bg-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/10">
            <SchoolIcon size={22} className="text-white" strokeWidth={1.5} />
          </div>
          <span className="text-xl font-medium tracking-tight">Bright<span className="text-orange-500">Soma</span></span>
        </div>
        <button onClick={() => navigate('/')} className="flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-slate-900 transition-colors uppercase tracking-widest">
          <ArrowLeft size={16} /> Back To Home
        </button>
      </header>

      {/* ─── CONTENT ────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 bg-slate-50/30">
        <div className="max-w-6xl w-full">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="mb-20">
            <h1 className="text-5xl md:text-7xl font-medium tracking-tight mb-6 text-slate-900 leading-[0.9]">Select Portal.</h1>
            <p className="text-xl text-slate-500 font-medium max-w-2xl leading-relaxed">Access Your Specific Dashboard With Institutional-Grade Security.</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 mb-20">
            {roles.map((item, i) => (
              <motion.button
                key={item.role}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1, duration: 0.6 }}
                onClick={() => navigate(`/login/${item.role.toLowerCase()}`)}
                className="group relative p-10 rounded-[3.5rem] bg-white border border-slate-100 transition-all hover:border-orange-500/30 hover:shadow-[0_20px_50px_-15px_rgba(249,115,22,0.1)] text-left flex flex-col items-start"
              >
                <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center mb-8 shadow-sm group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500 ${item.color}`}>
                  {item.icon}
                </div>
                <h3 className="text-2xl font-medium mb-3 tracking-tight text-slate-900">{item.title}</h3>
                <p className="text-xs text-slate-400 font-medium leading-relaxed">{item.description}</p>
              </motion.button>
            ))}
          </div>

          <div className="text-center pt-10 border-t border-slate-100">
             <p className="text-[10px] font-medium text-slate-300 uppercase tracking-[0.4em]">© 2026 BrightSoma Technologies Ltd. SECURED ACCESS.</p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default SignInPage;
