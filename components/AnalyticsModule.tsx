import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { 
  TrendingUp, TrendingDown, Users, Wallet, BookOpen, Bus, Calendar, 
  Download, ChevronRight, ArrowUpRight,
  School, Globe, CreditCard, Activity, Zap
} from 'lucide-react';
import { db, auth } from '../src/firebase';
import { collection, query, where, onSnapshot, getDoc, doc } from 'firebase/firestore';

interface AnalyticsModuleProps {
  academicPeriod: string;
  role: string;
  initialTab?: string;
}

const AnalyticsModule: React.FC<AnalyticsModuleProps> = ({ academicPeriod, role, initialTab = 'overview' }) => {
  const [adminTab, setAdminTab] = useState(initialTab);
  const [instanceTab, setInstanceTab] = useState('institutions');
  const [timeframe, setTimeframe] = useState('This Year');
  const [isLoading, setIsLoading] = useState(true);

  // Update tab when deep-linking from sidebar
  useEffect(() => {
    if (initialTab) {
      setAdminTab(initialTab);
    }
  }, [initialTab]);
  
  const [academicTrends, setAcademicTrends] = useState<any[]>([]);
  const [financialVelocity, setFinancialVelocity] = useState<any[]>([]);

  const [platformStats, setPlatformStats] = useState({
    totalSchools: 0,
    mrr: 0,
    arr: 0,
  });
  
  const [editionDistribution, setEditionDistribution] = useState<any[]>([]);

  const isPlatformAdmin = role === 'PLATFORM_ADMIN' || role === 'SUPER_ADMIN';

  useEffect(() => {
    let unsubSchools: () => void;
    let unsubPayments: () => void;
    let unsubAcademic: () => void;
    let unsubFinance: () => void;

    const fetchData = async () => {
      setIsLoading(true);
      const user = auth.currentUser;
      if (!user) return;

      if (isPlatformAdmin) {
        unsubSchools = onSnapshot(collection(db, 'schools'), (snapshot) => {
          const schools = snapshot.docs.map(d => d.data());
          const editions = schools.reduce((acc: any, s: any) => {
            const ed = s.edition || 'starter';
            acc[ed] = (acc[ed] || 0) + 1;
            return acc;
          }, {});
          setEditionDistribution([
            { name: 'Starter', value: editions.starter || 0, color: '#64748b' },
            { name: 'Standard', value: editions.standard || 0, color: '#f97316' },
            { name: 'Plus', value: editions.plus || 0, color: '#8b5cf6' },
          ]);
          setPlatformStats(prev => ({ ...prev, totalSchools: snapshot.size }));
        });
        unsubPayments = onSnapshot(collection(db, 'payments'), (snapshot) => {
          let total = 0;
          snapshot.docs.forEach(d => total += (d.data().amount || 0));
          setPlatformStats(prev => ({ ...prev, mrr: total }));
        });
        setIsLoading(false);
      } else {
        let schoolId = user.uid;
        const staffDocRef = doc(db, 'staff', user.uid);
        const staffDocSnap = await getDoc(staffDocRef);
        if (staffDocSnap.exists()) {
          const staffData = staffDocSnap.data();
          if (staffData && staffData.schoolId) schoolId = staffData.schoolId;
        }
        unsubAcademic = onSnapshot(query(collection(db, 'assessments'), where('schoolId', '==', schoolId)), () => setAcademicTrends([]));
        unsubFinance = onSnapshot(query(collection(db, 'payments'), where('schoolId', '==', schoolId)), () => setFinancialVelocity([]));
        setIsLoading(false);
      }
    };

    fetchData();
    return () => {
      if (unsubSchools) unsubSchools();
      if (unsubPayments) unsubPayments();
      if (unsubAcademic) unsubAcademic();
      if (unsubFinance) unsubFinance();
    };
  }, [academicPeriod, isPlatformAdmin]);

  // ─── PLATFORM ADMIN DASHBOARD ───────────────────────────────────────────────
    const [paAdminTab, setPaAdminTab] = React.useState('overview');
    const [activeInsight, setActiveInsight] = React.useState('alerts');

    if (isPlatformAdmin) {

    const REVENUE_DATA = [
      { month: 'Jan', arr: 220000, mrr: 18333 },
      { month: 'Feb', arr: 280000, mrr: 23333 },
      { month: 'Mar', arr: 360000, mrr: 30000 },
      { month: 'Apr', arr: 420000, mrr: 35000 },
      { month: 'May', arr: 510000, mrr: 42500 },
      { month: 'Jun', arr: 640000, mrr: 53333 },
      { month: 'Jul', arr: 780000, mrr: 65000 },
      { month: 'Aug', arr: 920000, mrr: 76667 },
      { month: 'Sep', arr: 1100000, mrr: 91667 },
      { month: 'Oct', arr: 1340000, mrr: 111667 },
      { month: 'Nov', arr: 1620000, mrr: 135000 },
      { month: 'Dec', arr: 2040000, mrr: 170000 },
    ];

    const INSTITUTIONS = [
      { name: 'St. Mary Academy', county: 'Nairobi', plan: 'Plus', users: 1240, mrr: 'KES 15,000', status: 'Active', lastActive: 'Today' },
      { name: 'Sunshine Secondary', county: 'Mombasa', plan: 'Standard', users: 820, mrr: 'KES 8,000', status: 'Active', lastActive: 'Today' },
      { name: 'Kilifi Primary STEM', county: 'Kilifi', plan: 'Starter', users: 310, mrr: 'KES 3,000', status: 'Trial', lastActive: '2 days ago' },
      { name: 'Limuru Girls High', county: 'Kiambu', plan: 'Standard', users: 690, mrr: 'KES 8,000', status: 'Active', lastActive: 'Yesterday' },
      { name: 'Rongo Academy', county: 'Migori', plan: 'Starter', users: 190, mrr: 'KES 3,000', status: 'Suspended', lastActive: '14 days ago' },
      { name: 'Nakuru Boys High', county: 'Nakuru', plan: 'Plus', users: 1580, mrr: 'KES 15,000', status: 'Active', lastActive: 'Today' },
    ];

    const ALERTS = [
      { school: 'Rongo Academy', detail: 'M-Pesa payment KES 3,000 failed — 3rd attempt', level: 'critical' },
      { school: 'Limuru Girls High', detail: 'SMS usage at 87% of monthly limit. Upgrade to avoid disruption.', level: 'warning' },
    ];

    const PIE_DATA = editionDistribution.some(e => e.value > 0) ? editionDistribution : [
      { name: 'Starter', value: 3, color: '#64748b' },
      { name: 'Standard', value: 2, color: '#f97316' },
      { name: 'Plus', value: 2, color: '#8b5cf6' },
    ];

    const planBadge: Record<string, string> = {
      'Plus': 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
      'Standard': 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
      'Starter': 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
    };
    const statusBadge: Record<string, string> = {
      'Active': 'bg-emerald-100 text-emerald-700',
      'Trial': 'bg-blue-100 text-blue-700',
      'Suspended': 'bg-red-100 text-red-700',
    };

    return (
      <div className="max-w-[1300px] mx-auto px-4 lg:px-6 animate-in fade-in duration-700 pb-20 -mt-2">

        {/* ── TOP HEADER BAR ── */}
        <div className="bg-slate-900 dark:bg-black rounded-2xl px-8 py-10 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xl border border-white/5">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-orange-600/20 rounded-2xl">
              <Globe size={24} className="text-orange-500" />
            </div>
            <div>
              <h2 className="text-white font-black text-2xl tracking-tight leading-none">School Management</h2>
              <p className="text-slate-500 text-xs font-medium mt-1.5 uppercase tracking-widest">Global Overview & Revenue</p>
            </div>
          </div>
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-slate-500 font-medium">Pending Setups:</span>
              <span className="text-orange-400 font-black">3</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-slate-500 font-medium">System Alerts:</span>
              <span className="text-red-400 font-black">2</span>
            </div>
            <div className="h-5 w-px bg-white/10 hidden md:block"/>
            <button className="flex items-center gap-2 px-4 py-2 bg-white/8 hover:bg-white/15 text-slate-300 rounded-xl text-xs font-bold border border-white/10 transition-colors">
              <Download size={13}/> Export Ledger
            </button>
            <button className="px-5 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-black shadow-lg transition-all active:scale-95">
              + Provision Tenant
            </button>
          </div>
        </div>

        {/* ── PRIMARY TABS ── */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 rounded-2xl p-1.5 mb-6 w-fit border border-slate-200 dark:border-white/5">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'institutions', label: 'School List' },
            { id: 'billing', label: 'Money & Revenue' },
            { id: 'infra', label: 'System Health' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setPaAdminTab(tab.id)}
              className={`px-5 py-2 rounded-xl text-xs font-bold transition-all ${paAdminTab === tab.id ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── FILTER PILLS ── */}
        <div className="flex items-center gap-2 mb-8 flex-wrap">
          {[
            { id: 'institutions', label: '🏫 Institutions' },
            { id: 'alerts', label: '⚠️ Alerts' },
            { id: 'revenue', label: '💰 Revenue Ledger' },
            { id: 'usage', label: '📊 Usage' },
            { id: 'settings', label: '⚙️ Settings' },
          ].map(pill => (
            <button
              key={pill.id}
              onClick={() => setActiveInsight(pill.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${activeInsight === pill.id ? 'bg-slate-900 dark:bg-orange-600 text-white border-transparent shadow-md' : 'bg-white dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-white/10 hover:border-slate-400'}`}
            >
              {pill.label}
            </button>
          ))}
        </div>

        {/* ── KPI CARDS ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          {[
            { label: 'Active Schools', value: String(platformStats.totalSchools || 7), delta: '+1 this month', bg: 'from-violet-500 to-indigo-600' },
            { label: 'Total Users', value: '4,830', delta: '+320 this week', bg: 'from-orange-500 to-rose-600' },
            { label: 'Monthly Collections (MRR)', value: 'KES 52K', delta: '+12% MoM', bg: 'from-emerald-500 to-teal-600' },
            { label: 'System Uptime', value: '99.4%', delta: 'Status: Healthy', bg: 'from-blue-500 to-cyan-600' },
          ].map(k => (
            <div key={k.label} className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${k.bg} p-5 text-white shadow-xl hover:scale-[1.02] transition-transform cursor-default`}>
              <div className="absolute -top-6 -right-6 w-24 h-24 bg-white/10 rounded-full blur-xl"/>
              <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest mb-1 relative">{k.label}</p>
              <p className="text-2xl font-black tracking-tight relative">{k.value}</p>
              <p className="text-[10px] font-bold text-white/50 mt-2 relative">{k.delta}</p>
            </div>
          ))}
        </div>

        {/* ── PRIORITY ALERTS ── */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <span className="text-red-500">⊘</span> Priority Alerts
            </h3>
            <span className="text-[10px] font-black text-red-600 bg-red-50 dark:bg-red-950/50 px-3 py-1 rounded-full border border-red-100 dark:border-red-900">
              {ALERTS.length} Needs Attention
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {ALERTS.map((alert, i) => (
              <div key={i} className={`flex items-start justify-between p-4 rounded-xl border ${alert.level === 'critical' ? 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900' : 'bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-900'}`}>
                <div>
                  <p className="font-black text-sm text-slate-900 dark:text-white">{alert.school}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{alert.detail}</p>
                </div>
                <div className="flex flex-col items-end gap-2 ml-4 shrink-0">
                  <span className={`text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider ${alert.level === 'critical' ? 'bg-red-600 text-white' : 'bg-orange-500 text-white'}`}>
                    {alert.level}
                  </span>
                  <button className="text-[10px] font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors">
                    Resolve →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── INSTITUTIONS TABLE + SIDE PANELS ── */}
        {/* ── DYNAMIC INSIGHT CONTENT ── */}
        <div className="mb-12">
          {activeInsight === 'alerts' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in slide-in-from-bottom-4 duration-500">
              <div className="md:col-span-2 space-y-6">
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-white/5 p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="font-black text-slate-900 dark:text-white flex items-center gap-2">
                      <span className="text-red-500">◆</span> Critical Exceptions
                    </h3>
                  </div>
                  <div className="space-y-4">
                    {[
                      { icon: <CreditCard className="text-red-500"/>, title: 'Payment Rejection Loop', school: 'Rongo Academy', desc: 'M-Pesa system rejecting KES 3,000 for 12 hours.', time: '2h ago' },
                      { icon: <Zap className="text-orange-500"/>, title: 'Sync Latency Spike', school: 'Limuru Girls', desc: 'Data sync lag exceeding 400ms in the last hour.', time: '14m ago' },
                      { icon: <Users className="text-blue-500"/>, title: 'Teacher Auth Error', school: 'Nakuru Boys', desc: '5 teachers unable to log in due to role mismatch.', time: '5m ago' },
                    ].map((ext, i) => (
                      <div key={i} className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/20 transition-all cursor-pointer">
                        <div className="p-2.5 bg-white dark:bg-slate-800 rounded-xl shadow-sm">{ext.icon}</div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-black text-slate-900 dark:text-white">{ext.title}</p>
                            <span className="text-[10px] font-bold text-slate-400">{ext.time}</span>
                          </div>
                          <p className="text-[11px] text-slate-500 font-medium">{ext.school} • {ext.desc}</p>
                        </div>
                        <ChevronRight size={14} className="text-slate-300"/>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="space-y-6">
                <div className="bg-slate-900 rounded-2xl p-6 border border-white/5 shadow-xl">
                  <h3 className="text-white font-black text-sm mb-4">AI Audit Summary</h3>
                  <p className="text-slate-400 text-xs leading-relaxed font-medium">
                    "System noticed a 12% drop in sync velocity across <span className="text-orange-400">Migori County</span>. Likely related to fiber maintenance in the region. Monitoring performance."
                  </p>
                  <button className="w-full mt-6 py-2.5 bg-white/10 hover:bg-white/20 text-white text-[10px] font-black rounded-lg transition-colors border border-white/10">
                    Acknowledge & Notify
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeInsight === 'institutions' && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm overflow-hidden animate-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-white/5">
                <div>
                  <h3 className="font-black text-slate-900 dark:text-white">Institution Directory</h3>
                  <p className="text-[11px] text-slate-400 font-medium mt-0.5">Select a tenant to view stats and take platform actions</p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-white/5">
                      {['Institution', 'County', 'Plan', 'Users', 'MRR', 'Status', 'Last Active', ''].map(h => (
                        <th key={h} className="px-5 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {INSTITUTIONS.map((inst, i) => (
                      <tr key={i} className="border-b border-slate-50 dark:border-white/3 hover:bg-slate-50 dark:hover:bg-white/3 transition-colors group">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white text-xs font-black shrink-0">
                              {inst.name[0]}
                            </div>
                            <span className="font-bold text-slate-900 dark:text-white text-xs">{inst.name}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-xs text-slate-500 dark:text-slate-400 font-medium">{inst.county}</td>
                        <td className="px-5 py-4">
                          <span className={`text-[10px] font-black px-2.5 py-1 rounded-full ${planBadge[inst.plan]}`}>{inst.plan}</span>
                        </td>
                        <td className="px-5 py-4 text-xs font-bold text-slate-700 dark:text-slate-300">{inst.users.toLocaleString()}</td>
                        <td className="px-5 py-4 text-xs font-bold text-emerald-600">{inst.mrr}</td>
                        <td className="px-5 py-4">
                          <span className={`text-[10px] font-black px-2.5 py-1 rounded-full ${statusBadge[inst.status]}`}>{inst.status}</span>
                        </td>
                        <td className="px-5 py-4 text-xs text-slate-400 font-medium">{inst.lastActive}</td>
                        <td className="px-5 py-4">
                          <button className="text-[10px] font-bold text-orange-600 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">Manage →</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeInsight === 'revenue' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in slide-in-from-bottom-4 duration-500">
              <div className="md:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-white/5 p-6 shadow-sm">
                <h3 className="font-black text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                  <span className="text-emerald-500">💰</span> Collection Ledger
                </h3>
                <div className="space-y-4">
                  {[
                    { school: 'St. Mary Academy', amount: 'KES 45,000', type: 'Grant', status: 'Disbursed', date: 'Today' },
                    { school: 'Limuru Girls High', amount: 'KES 120,000', type: 'Capitation', status: 'Pending Approval', date: 'Yesterday' },
                    { school: 'Sunshine Secondary', amount: 'KES 8,000', type: 'Subscription', status: 'Failed', date: '2 days ago' },
                  ].map((pay, i) => (
                    <div key={i} className="flex items-center justify-between p-4 rounded-xl border border-slate-100 dark:border-white/5">
                      <div>
                        <p className="text-xs font-black text-slate-900 dark:text-white">{pay.school}</p>
                        <p className="text-[10px] text-slate-500 font-medium mt-0.5">{pay.type} • {pay.date}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black text-slate-900 dark:text-white">{pay.amount}</p>
                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-md ${pay.status === 'Disbursed' ? 'bg-emerald-500 text-white' : pay.status === 'Failed' ? 'bg-red-500 text-white' : 'bg-slate-200 text-slate-600'}`}>{pay.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-emerald-600 rounded-2xl p-6 text-white shadow-xl flex flex-col justify-between">
                <div>
                  <h3 className="font-black text-sm mb-2 text-white/80">Pending Disbursement</h3>
                  <p className="text-3xl font-black tracking-tight">KES 482K</p>
                </div>
                <button className="w-full mt-8 py-3 bg-white text-emerald-600 text-xs font-black rounded-xl shadow-lg transition-transform active:scale-95">
                  Process Grant Batch
                </button>
              </div>
            </div>
          )}

          {activeInsight === 'usage' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-bottom-4 duration-500">
               <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-white/5 p-6 shadow-sm">
                  <h3 className="font-black text-slate-900 dark:text-white text-sm mb-6 flex items-center gap-2">
                    <TrendingUp size={16} className="text-orange-500"/> Monitoring Velocity
                  </h3>
                  <div className="space-y-4">
                    {[
                      { county: 'Nairobi', speed: '42ms', load: 82 },
                      { county: 'Mombasa', speed: '128ms', load: 45 },
                      { county: 'Kiambu', speed: '55ms', load: 68 },
                      { county: 'Nakuru', speed: '210ms', load: 92 },
                    ].map(region => (
                      <div key={region.county} className="space-y-1.5">
                        <div className="flex justify-between text-[10px] font-black">
                          <span className="text-slate-500 uppercase">{region.county}</span>
                          <span className="text-slate-900 dark:text-white">{region.speed} sync</span>
                        </div>
                        <div className="h-1.5 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all duration-1000 ${region.load > 80 ? 'bg-red-500' : 'bg-orange-500'}`} style={{ width: `${region.load}%` }}/>
                        </div>
                      </div>
                    ))}
                  </div>
               </div>
               <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-white/5 p-6 shadow-sm">
                  <h3 className="font-black text-slate-900 dark:text-white text-sm mb-6">Active Sessions</h3>
                  <div className="h-[180px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={REVENUE_DATA.slice(0, 7)}>
                         <Area type="monotone" dataKey="mrr" stroke="#f97316" fill="#f97316" fillOpacity={0.1} strokeWidth={2}/>
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="text-[10px] font-bold text-slate-400 mt-4 text-center">Simultaneous concurrent sessions by region</p>
               </div>
            </div>
          )}

          {activeInsight === 'settings' && (
            <div className="bg-slate-100 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-white/5 p-12 text-center animate-in slide-in-from-bottom-4 duration-500">
              <Globe size={48} className="mx-auto text-slate-300 mb-4 animate-pulse"/>
              <h3 className="text-lg font-black text-slate-900 dark:text-white">Decision Hub</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-2">
                Centralized platform overrides and global pricing adjustments. Coming soon to the production cloud.
              </p>
            </div>
          )}
        </div>

        {/* ── ARR GROWTH CHART ── */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-black text-slate-900 dark:text-white">Money Growth</h3>
              <p className="text-xs text-slate-400 mt-1">Projected money from all schools in 2026</p>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 rounded-xl border border-emerald-100 dark:border-emerald-900">
              <TrendingUp size={14}/>
              <span className="text-xs font-bold">+827% Growth</span>
            </div>
          </div>
          <div className="flex items-end gap-6 mb-8">
            <div>
              <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">KES 2.04M</span>
              <p className="text-xs text-slate-400 mt-1">Expected yearly total</p>
            </div>
            <div className="flex items-center gap-4 mb-1 ml-4">
              <div className="flex items-center gap-1.5"><div className="w-3 h-1.5 rounded-full bg-violet-500"/><span className="text-[10px] font-bold text-slate-500">Yearly</span></div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-1.5 rounded-full bg-orange-500"/><span className="text-[10px] font-bold text-slate-500">Monthly</span></div>
            </div>
          </div>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={REVENUE_DATA} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="paGrad1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.25}/>
                    <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="paGrad2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f97316" stopOpacity={0.25}/>
                    <stop offset="100%" stopColor="#f97316" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" strokeOpacity={0.3}/>
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} dy={10}/>
                <YAxis hide/>
                <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', backgroundColor: '#0f172a' }} itemStyle={{ color: '#fff', fontSize: '11px', fontWeight: 'bold' }} labelStyle={{ color: '#94a3b8', fontSize: '10px' }}/>
                <Area type="monotone" dataKey="arr" stroke="#8b5cf6" strokeWidth={2.5} fill="url(#paGrad1)" dot={false} name="Yearly Money" />
                <Area type="monotone" dataKey="mrr" stroke="#f97316" strokeWidth={2} fill="url(#paGrad2)" dot={false} name="Monthly Money" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    );
  }

  // ─── STANDARD SCHOOL VIEW ────────────────────────────────────────────────────
  const academicTrendsData = academicTrends.length > 0 ? academicTrends : [
    { name: 'Math', ee: 42, me: 38, ae: 20 },
    { name: 'English', ee: 35, me: 45, ae: 20 },
    { name: 'Science', ee: 50, me: 30, ae: 20 },
    { name: 'CRE', ee: 60, me: 25, ae: 15 },
  ];

  const financialVelocityData = financialVelocity.length > 0 ? financialVelocity : [
    { day: 'Mon', collected: 12000 },
    { day: 'Tue', collected: 18000 },
    { day: 'Wed', collected: 9000 },
    { day: 'Thu', collected: 22000 },
    { day: 'Fri', collected: 30000 },
    { day: 'Sat', collected: 15000 },
    { day: 'Sun', collected: 8000 },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Academic Analytics</h1>
          <p className="text-slate-500 font-medium">Performance insights for {timeframe.toLowerCase()}.</p>
        </div>
        <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
          {['This week', 'This Term', 'This Year'].map(t => (
            <button
              key={t}
              onClick={() => setTimeframe(t)}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${timeframe === t ? 'bg-orange-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { title: 'Total Learners', value: '842', trend: '+5.2%', color: 'blue' },
          { title: 'Fee Collection', value: '84%', trend: '+12.4%', color: 'green' },
          { title: 'CBC Mastery', value: '72%', trend: '+4.1%', color: 'purple' },
          { title: 'Transit Efficiency', value: '94%', trend: '+2.5%', color: 'orange' },
        ].map(k => (
          <div key={k.title} className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex items-center gap-4">
            <div className={`p-3 rounded-xl bg-${k.color}-50 dark:bg-${k.color}-900/20 text-${k.color}-600`}>
              <TrendingUp size={18}/>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">{k.title}</p>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">{k.value}</h3>
                <span className="text-xs font-bold text-emerald-500 flex items-center gap-0.5">
                  <TrendingUp size={12}/> {k.trend}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-8">Academic Trends</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={academicTrendsData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" axisLine={false} tickLine={false} />
              <YAxis axisLine={false} tickLine={false} />
              <Tooltip />
              <Bar dataKey="ee" fill="#10b981" radius={[4, 4, 0, 0]} name="Exceeding" />
              <Bar dataKey="me" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Meeting" />
              <Bar dataKey="ae" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Approaching" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-8">Financial Velocity</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={financialVelocityData}>
              <defs>
                <linearGradient id="colorVis" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="day" axisLine={false} tickLine={false} />
              <YAxis axisLine={false} tickLine={false} />
              <Tooltip />
              <Area type="monotone" dataKey="collected" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorVis)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsModule;
