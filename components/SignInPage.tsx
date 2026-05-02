import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ShieldCheck, Users, GraduationCap, Wallet, Activity, 
  ArrowLeft, School as SchoolIcon, ChevronRight, Sparkles 
} from 'lucide-react';
import { motion } from 'motion/react';

const roles = [
  { 
    role: 'ADMIN', 
    title: 'School director', 
    description: 'Strategic institutional oversight.', 
    icon: <ShieldCheck size={32} strokeWidth={1.5} />, 
    color: 'from-orange-500 via-orange-600 to-amber-600',
    lightColor: 'bg-orange-500/10'
  },
  { 
    role: 'TEACHER', 
    title: 'Teacher portal', 
    description: 'CBC assessments and learner growth.', 
    icon: <Users size={32} strokeWidth={1.5} />, 
    color: 'from-orange-400 via-orange-500 to-orange-600',
    lightColor: 'bg-orange-500/5'
  },
  { 
    role: 'PRINCIPAL', 
    title: 'Principal', 
    description: 'Academic health and performance.', 
    icon: <GraduationCap size={32} strokeWidth={1.5} />, 
    color: 'from-emerald-500 via-teal-600 to-emerald-700',
    lightColor: 'bg-emerald-500/10'
  },
  { 
    role: 'FINANCE', 
    title: 'Finance hub', 
    description: 'Fees and eTIMS compliance.', 
    icon: <Wallet size={32} strokeWidth={1.5} />, 
    color: 'from-violet-500 via-purple-600 to-violet-700',
    lightColor: 'bg-violet-500/10'
  },
  { 
    role: 'PLATFORM_ADMIN', 
    title: 'System owner', 
    description: 'Global infrastructure control.', 
    icon: <Activity size={32} strokeWidth={1.5} />, 
    color: 'from-slate-700 via-slate-800 to-slate-900',
    lightColor: 'bg-slate-500/10'
  },
];

const SignInPage: React.FC = () => {
  const navigate = useNavigate();

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
          onClick={() => navigate('/')} 
          className="px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-[10px] font-bold text-slate-500 hover:text-orange-600 hover:border-orange-200 transition-all uppercase tracking-wider flex items-center gap-2"
        >
          <ArrowLeft size={14} /> Back Home
        </motion.button>
      </header>

      {/* ─── MAIN ────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col items-center justify-center p-8 z-10 relative">
        <div className="max-w-6xl w-full">
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            className="mb-16 text-center"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-600 text-[10px] font-bold mb-6">
              <Sparkles size={14} /> Institutional Gateways
            </div>
            <h1 className="text-4xl md:text-6xl font-black tracking-tight mb-4 text-slate-900">
              Access your <span className="text-orange-500">workspace.</span>
            </h1>
            <p className="text-base text-slate-500 font-medium max-w-xl mx-auto">
              Secure institutional access with real-time data synchronization.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {roles.map((item, i) => (
              <motion.button
                key={item.role}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => navigate(`/login/${item.role.toLowerCase()}`)}
                className="group relative p-8 rounded-3xl bg-white border border-slate-100 hover:border-orange-500 hover:shadow-xl hover:shadow-orange-500/5 transition-all text-left flex flex-col items-start"
              >
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-8 ${item.lightColor} border border-orange-100/50 group-hover:scale-105 transition-transform`}>
                   <div className="text-orange-600">
                     {item.icon}
                   </div>
                </div>
                
                <h3 className="text-lg font-bold mb-2 tracking-tight text-slate-900 group-hover:text-orange-600 transition-colors">{item.title}</h3>
                <p className="text-[11px] text-slate-500 font-medium leading-relaxed mb-8">{item.description}</p>
                
                <div className="mt-auto flex items-center gap-2 text-[10px] font-bold text-slate-400 group-hover:text-orange-600 transition-colors">
                  Open portal <ChevronRight size={14} />
                </div>
              </motion.button>
            ))}
          </div>

          <div className="mt-20 text-center">
             <div className="h-px w-24 bg-slate-200 mx-auto mb-4" />
             <p className="text-[9px] font-bold text-slate-400">BrightSoma Unified Security architecture v2.4.0</p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default SignInPage;
