const fs = require('fs');

const path = 'c:/Users/Hp/Downloads/BrightSoma/components/LandingPage.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Inject X
if (!content.includes(' X,')) {
  content = content.replace("import { \n  Shield,", "import { \n  X,\n  Shield,");
}

const startStr = `<div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto items-stretch">`;
const endStr = `</section>`;

const startIndex = content.indexOf(startStr);
const endIndex = content.indexOf(endStr, startIndex);

if (startIndex !== -1 && endIndex !== -1) {
  const customGrid = `<div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto items-stretch">
            {/* Starter - Entry */}
            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-[2.5rem] p-10 border border-slate-200 dark:border-slate-800 flex flex-col relative overflow-hidden group h-full">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                <Leaf size={60} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Starter Kit</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-8">Best for nurseries and newly founded schools.</p>
              <div className="mb-2">
                <span className="text-4xl font-black text-slate-900 dark:text-white">Ksh 3,000</span>
                <span className="text-slate-500 dark:text-slate-400 text-sm"> /term</span>
              </div>
              <p className="text-[10px] font-bold text-orange-600 uppercase tracking-widest mb-8 mt-1">Up to 150 Learners</p>
              
              <ul className="space-y-4 mb-10 flex-1">
                <li className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300"><CheckCircle2 size={18} className="text-orange-500 shrink-0" /> Basic Learner & Staff Mgt</li>
                <li className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300"><CheckCircle2 size={18} className="text-orange-500 shrink-0" /> CBC Assessments & Reports</li>
                <li className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300"><CheckCircle2 size={18} className="text-orange-500 shrink-0" /> Asset Management</li>
                <li className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300"><CheckCircle2 size={18} className="text-orange-500 shrink-0" /> Core Finance Tracking</li>
                <li className="flex items-center gap-3 text-sm text-slate-400 dark:text-slate-600 line-through"><X size={16} className="text-slate-300 dark:text-slate-700 shrink-0" /> Bank Accounts Management</li>
                <li className="flex items-center gap-3 text-sm text-slate-400 dark:text-slate-600 line-through"><X size={16} className="text-slate-300 dark:text-slate-700 shrink-0" /> Timetabling & Events</li>
                <li className="flex items-center gap-3 text-sm text-slate-400 dark:text-slate-600 line-through"><X size={16} className="text-slate-300 dark:text-slate-700 shrink-0" /> SMS & Bulk Messaging</li>
                <li className="flex items-center gap-3 text-sm text-slate-400 dark:text-slate-600 line-through"><X size={16} className="text-slate-300 dark:text-slate-700 shrink-0" /> Students' Health Records</li>
              </ul>
              
              <button
                onClick={() => setRegisterEdition('starter')}
                className="w-full py-4 rounded-2xl font-bold mt-auto bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 hover:shadow-lg transition-all active:scale-95 text-sm"
              >
                Register Starter Kit
              </button>
            </div>

            {/* Professional - Most Popular */}
            <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-10 border-2 border-orange-500 shadow-2xl shadow-orange-500/10 flex flex-col relative scale-105 z-10 overflow-hidden h-full">
              <div className="absolute top-0 right-0 bg-orange-500 text-white text-[10px] font-black uppercase px-6 py-2 rounded-bl-2xl tracking-widest">
                Most Popular
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Professional Kit</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-8">Everything a primary or secondary school needs.</p>
              <div className="mb-2">
                <span className="text-4xl font-black text-slate-900 dark:text-white">Ksh 8,000</span>
                <span className="text-slate-500 dark:text-slate-400 text-sm"> /term</span>
              </div>
              <p className="text-[10px] font-bold text-orange-600 uppercase tracking-widest mb-8 mt-1">Up to 500 Learners</p>
              
              <ul className="space-y-4 mb-10 flex-1">
                <li className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-100 font-bold"><TrendingUp size={18} className="text-orange-500 shrink-0" /> Everything in Starter</li>
                <li className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-200"><CheckCircle2 size={18} className="text-orange-500 shrink-0" /> Bank Accounts Management</li>
                <li className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-200"><CheckCircle2 size={18} className="text-orange-500 shrink-0" /> Timetabling & Events</li>
                <li className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-200"><CheckCircle2 size={18} className="text-orange-500 shrink-0" /> SMS & Bulk Messaging</li>
                <li className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-200"><CheckCircle2 size={18} className="text-orange-500 shrink-0" /> Students' Health Records</li>
                <li className="flex items-center gap-3 text-sm text-slate-400 dark:text-slate-600 line-through"><X size={16} className="text-slate-300 dark:text-slate-700 shrink-0" /> Transport Fleet Tracking</li>
                <li className="flex items-center gap-3 text-sm text-slate-400 dark:text-slate-600 line-through"><X size={16} className="text-slate-300 dark:text-slate-700 shrink-0" /> Multi-Campus Dashboards</li>
                <li className="flex items-center gap-3 text-sm text-slate-400 dark:text-slate-600 line-through"><X size={16} className="text-slate-300 dark:text-slate-700 shrink-0" /> Dedicated Account Manager</li>
              </ul>
              
              <button
                onClick={() => setRegisterEdition('standard')}
                className="w-full py-4 rounded-2xl font-bold mt-auto bg-orange-600 text-white hover:bg-orange-700 shadow-xl shadow-orange-500/30 transition-all active:scale-95 flex items-center justify-center gap-2 text-sm"
              >
                <Zap size={18} /> Register Professional Kit
              </button>
            </div>

            {/* Elite - Unlimited */}
            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-[2.5rem] p-10 border border-slate-200 dark:border-slate-800 flex flex-col relative group overflow-hidden h-full">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                <Gem size={60} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Elite Kit</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-8">For large institutions and multi-campus setups.</p>
              <div className="mb-2">
                <span className="text-4xl font-black text-slate-900 dark:text-white">Ksh 15,000</span>
                <span className="text-slate-500 dark:text-slate-400 text-sm"> /term</span>
              </div>
              <p className="text-[10px] font-bold text-orange-600 uppercase tracking-widest mb-8 mt-1">Unlimited Learners</p>
              
              <ul className="space-y-4 mb-10 flex-1">
                <li className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-200 font-bold"><Award size={18} className="text-orange-500 shrink-0" /> Everything in Professional</li>
                <li className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-200"><CheckCircle2 size={18} className="text-orange-500 shrink-0" /> Transport Fleet Tracking</li>
                <li className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-200"><CheckCircle2 size={18} className="text-orange-500 shrink-0" /> Multi-Campus Dashboards</li>
                <li className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-200"><CheckCircle2 size={18} className="text-orange-500 shrink-0" /> Custom eTIMS Integration</li>
                <li className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-200 font-bold"><CheckCircle2 size={18} className="text-blue-500 shrink-0" /> Dedicated Account Manager</li>
              </ul>
              
              <button
                onClick={() => setRegisterEdition('plus')}
                className="w-full py-4 rounded-2xl font-bold mt-auto bg-slate-900 text-white hover:bg-black transition-all active:scale-95 text-sm"
              >
                Register Elite Kit
              </button>
            </div>
          </div>
        </div>
      `;

  const newContent = content.substring(0, startIndex) + customGrid + content.substring(endIndex);
  fs.writeFileSync(path, newContent, 'utf8');
  console.log('Successfully updated LandingPage.tsx components');
} else {
  console.log('Failed to find start or end index', startIndex, endIndex);
}
