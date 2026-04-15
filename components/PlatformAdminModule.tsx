import React, { useState, useEffect, useMemo } from 'react';
import { 
  ShieldCheck, Plus, School, Users, 
  BarChart3, Settings, Search, ExternalLink,
  ChevronRight, MoreVertical, CheckCircle2,
  Clock, CreditCard, LayoutGrid, Filter,
  MessageSquare, ArrowUpRight, RefreshCcw
} from 'lucide-react';
import { collection, onSnapshot, query, addDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../src/firebase';
import { SchoolProfile } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'react-hot-toast';

const PlatformAdminModule: React.FC = () => {
  const [schools, setSchools] = useState<SchoolProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState<any>(null);
  const [activeSubTab, setActiveSubTab] = useState('overview');
  const [formData, setFormData] = useState({
    name: '',
    county: '',
    edition: 'starter',
    status: 'active',
    paymentStatus: 'pending'
  });

  const [stats, setStats] = useState({
    totalSchools: 0,
    unpaidSchools: 0,
    totalStaff: 0,
    activeRevenue: 0
  });

  useEffect(() => {
    setIsLoading(true);
    const q = query(collection(db, 'schools'));
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const schoolList = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data(),
        // Fallback for missing fields in existing data
        status: doc.data().status || 'active',
        paymentStatus: doc.data().paymentStatus || 'pending',
        edition: doc.data().edition || 'starter'
      } as any));
      setSchools(schoolList);
      
      const unpaid = schoolList.filter(s => s.paymentStatus === 'pending').length;
      setStats({
        totalSchools: snapshot.size,
        unpaidSchools: unpaid,
        totalStaff: 0, 
        activeRevenue: 0 
      });
      
      setIsLoading(false);
      console.info("PlatformAdminModule: Data snapshot received. Total schools:", schoolList.length);
    });
    return () => unsubscribe();
  }, []);

  const filteredSchools = useMemo(() => {
    return schools.filter(s => 
      s.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.county?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [schools, searchTerm]);

  const handleOpenModal = (school: any = null) => {
    if (school) {
      setSelectedSchool(school);
      setFormData({
        name: school.name || '',
        county: school.county || '',
        edition: school.edition || 'starter',
        status: school.status || 'active',
        paymentStatus: school.paymentStatus || 'pending'
      });
    } else {
      setSelectedSchool(null);
      setFormData({
        name: '',
        county: '',
        edition: 'starter',
        status: 'active',
        paymentStatus: 'pending'
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (selectedSchool) {
        await updateDoc(doc(db, 'schools', selectedSchool.id), formData);
      } else {
        await addDoc(collection(db, 'schools'), {
          ...formData,
          createdAt: new Date().toISOString()
        });
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error("Error saving school:", err);
    }
  };

  const migrateEditions = async () => {
    const confirm = window.confirm("Are you sure you want to migrate all 'standard' and 'plus' editions to 'professional' and 'elite'? This will update all existing school records.");
    if (!confirm) return;

    let updatedCount = 0;
    const loadingToast = toast.loading("Updating records...");

    try {
      // Find schools with old edition names
      const schoolsToUpdate = schools.filter(s => (s.edition as any) === 'standard' || (s.edition as any) === 'plus');
      
      for (const school of schoolsToUpdate) {
        const newEdition = (school.edition as any) === 'standard' ? 'professional' : 'elite';
        await updateDoc(doc(db, 'schools', school.id), { edition: newEdition });
        updatedCount++;
      }

      toast.success(`Migration complete! Successfully updated ${updatedCount} schools.`, { id: loadingToast });
    } catch (err) {
      console.error("Migration error:", err);
      toast.error("Migration failed. Check console for details.", { id: loadingToast });
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#0f1219] pb-20 animate-in fade-in duration-700 font-sans">
      {/* Top Navigation Row */}
      <div className="w-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-6 py-4 sticky top-0 z-40">
        <div className="max-w-full flex items-center justify-between">
          <div className="flex items-center gap-12">
            <h1 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">Platform Management</h1>
            <nav className="hidden lg:flex items-center gap-2">
              <TabButton 
                active={activeSubTab === 'overview'} 
                onClick={() => setActiveSubTab('overview')} 
                icon={<LayoutGrid size={16} />} 
                label="Overview" 
              />
              <TabButton 
                active={activeSubTab === 'schools'} 
                onClick={() => setActiveSubTab('schools')} 
                icon={<School size={16} />} 
                label="Institutions" 
              />
              <TabButton 
                active={activeSubTab === 'support'} 
                onClick={() => setActiveSubTab('support')} 
                icon={<MessageSquare size={16} />} 
                label="Support Queue" 
              />
              <TabButton 
                active={activeSubTab === 'finance'} 
                onClick={() => setActiveSubTab('finance')} 
                icon={<CreditCard size={16} />} 
                label="SaaS Finance" 
              />
            </nav>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-4">
              {schools.some(s => (s.edition as any) === 'standard' || (s.edition as any) === 'plus') && (
                <button 
                  onClick={migrateEditions}
                  className="px-6 py-2.5 bg-orange-50 text-orange-600 border border-orange-100 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-orange-100 transition-all flex items-center gap-2"
                >
                  <RefreshCcw size={14} /> Run Data Migration
                </button>
              )}
              <div className="relative group hidden sm:block">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-orange-500 transition-colors" size={16} />
                <input 
                  type="text" 
                  placeholder="Search anything..." 
                  className="pl-11 pr-6 py-2.5 bg-slate-100 dark:bg-slate-800 border-none rounded-full text-xs font-bold outline-none focus:ring-2 focus:ring-orange-500 transition-all dark:text-white"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-full mx-auto px-6 py-8 space-y-8">
        {activeSubTab === 'overview' && (
          <div className="space-y-12 animate-in fade-in duration-1000">
            {/* Premium Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
               <SparklineCard 
                 title="Total Institutions" 
                 value={stats.totalSchools.toString()} 
                 change="+2.4%" 
                 isPositive={true}
                 data={[{value: 40}, {value: 45}, {value: 42}, {value: 48}, {value: 50}, {value: 52}, {value: 55}]}
                 color="#f97316"
               />
               <SparklineCard 
                 title="System Revenue" 
                 value={`KES ${stats.activeRevenue}`} 
                 change="+18.2%" 
                 isPositive={true}
                 data={[{value: 100}, {value: 110}, {value: 105}, {value: 130}, {value: 140}, {value: 155}, {value: 180}]}
                 color="#3b82f6"
               />
               <SparklineCard 
                 title="Global Activity" 
                 value="84.2%" 
                 change="+5.1%" 
                 isPositive={true}
                 data={[{value: 70}, {value: 75}, {value: 72}, {value: 80}, {value: 78}, {value: 82}, {value: 84}]}
                 color="#10b981"
               />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
               {/* Main Activity / Revenue Chart */}
               <div className="lg:col-span-8 bg-white dark:bg-slate-900 rounded-[3rem] p-10 border border-slate-100 dark:border-slate-800 shadow-sm transition-all hover:shadow-xl group">
                  <div className="flex items-center justify-between mb-10">
                     <div>
                        <h3 className="text-xl font-black dark:text-white tracking-tight">SaaS Growth Engine</h3>
                        <p className="text-sm font-medium text-slate-400 mt-1">Institutional adoption and revenue trajectory</p>
                     </div>
                     <div className="flex gap-2">
                        <button className="px-5 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-[11px] font-black dark:text-white border border-slate-100 dark:border-slate-700">Monthly</button>
                        <button className="px-5 py-2.5 text-slate-400 text-[11px] font-bold">Quarterly</button>
                     </div>
                  </div>
                  
                  <div className="h-[300px] w-full bg-slate-50/50 dark:bg-slate-800/30 rounded-[2rem] flex items-center justify-center border border-dashed border-slate-200 dark:border-slate-700">
                     {/* Placeholder for actual chart if needed, or just descriptive text */}
                     <div className="text-center">
                        <BarChart3 className="mx-auto text-slate-200 dark:text-slate-700 mb-4" size={48} />
                        <p className="text-xs font-bold text-slate-400">Advanced Growth Analytics Interactive</p>
                        <button onClick={() => setActiveSubTab('finance')} className="mt-4 text-[10px] font-black text-orange-600 uppercase tracking-widest flex items-center gap-2 mx-auto">
                           Full Financial Audit <ChevronRight size={14} />
                        </button>
                     </div>
                  </div>
               </div>

               {/* Right Column Monitor */}
               <div className="lg:col-span-4 flex flex-col gap-8">
                  <div className="flex-1 bg-white dark:bg-slate-900 rounded-[2.5rem] p-10 border border-slate-100 dark:border-slate-800 shadow-sm">
                     <div className="flex items-center justify-between mb-8">
                        <h3 className="text-base font-bold dark:text-white">Platform Health</h3>
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_12px_rgba(16,185,129,0.5)]" />
                     </div>
                     
                     <div className="space-y-6">
                        <HealthIndicator label="Database Engine" status="Operational" />
                        <HealthIndicator label="Cloud Functions" status="Optimal" />
                        <HealthIndicator label="SMS Gateway" status="Syncing" />
                        <HealthIndicator label="Security Layer" status="Encrypted" />
                     </div>

                     <div className="mt-10 p-6 bg-slate-900 rounded-[2rem] text-white overflow-hidden relative group">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 relative z-10">System Uptime</p>
                        <h4 className="text-2xl font-black tracking-tighter relative z-10">99.98%</h4>
                        <div className="absolute top-0 right-0 w-32 h-32 bg-orange-600/20 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-1000" />
                     </div>
                  </div>
               </div>
            </div>

            {/* Quick Actions / Features */}
            <div className="bg-slate-900 dark:bg-orange-600 rounded-[3rem] p-10 text-white flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden group">
               <div className="relative z-10">
                  <h3 className="text-2xl font-black tracking-tight mb-2">Platform Power Tools</h3>
                  <p className="text-slate-400 dark:text-white/80 font-medium text-sm">Automate institutional provisioning and global broadcasts.</p>
               </div>
               <div className="flex flex-wrap gap-4 relative z-10">
                  <button onClick={() => handleOpenModal()} className="px-8 py-4 bg-white text-slate-900 rounded-2xl font-black text-xs shadow-xl active:scale-95 transition-all flex items-center gap-2">
                     <Plus size={18} /> Onboard Institution
                  </button>
                  <button className="px-8 py-4 bg-white/10 dark:bg-black/20 backdrop-blur-md rounded-2xl font-black text-xs active:scale-95 transition-all border border-white/5">
                     Global Broadcast
                  </button>
               </div>
               <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl -mr-48 -mt-48 group-hover:bg-white/10 transition-colors" />
            </div>
          </div>
        )}

        {/* Schools Table View (Integrated into second tab) */}
        {activeSubTab === 'schools' && (
          <div className="animate-in slide-in-from-bottom-6 duration-1000">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Institutional Directory</h2>
                <p className="text-slate-500 font-medium text-sm">Manage on-boarded school partners and access tiers.</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-1 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center">
                   <div className="px-4 py-2 border-r border-slate-100 dark:border-slate-700">
                      <Search size={16} className="text-slate-400" />
                   </div>
                   <input 
                     type="text"
                     placeholder="Search schools..."
                     value={searchTerm}
                     onChange={(e) => setSearchTerm(e.target.value)}
                     className="bg-transparent pl-4 pr-6 py-2 text-xs font-bold dark:text-white outline-none min-w-[200px]"
                   />
                </div>
                <button 
                  onClick={() => handleOpenModal()}
                  className="p-3.5 bg-orange-600 text-white rounded-2xl shadow-xl shadow-orange-500/20 active:scale-95 transition-all"
                >
                  <Plus size={20} />
                </button>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 dark:bg-white/5 border-b border-slate-100 dark:border-white/10">
                    <th className="p-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Institution Partner</th>
                    <th className="p-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">SaaS Tier</th>
                    <th className="p-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Annual Billing</th>
                    <th className="p-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Health Status</th>
                    <th className="p-8 py-6 text-right pr-12 text-[10px] font-black text-slate-400 uppercase tracking-widest">Management</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-white/5">
                  <AnimatePresence>
                    {filteredSchools.map((school: any) => (
                      <motion.tr 
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        key={school.id} 
                        className="hover:bg-slate-50/80 dark:hover:bg-white/5 transition-all group"
                      >
                        <td className="p-8">
                          <div className="flex items-center gap-5">
                            <div className="w-14 h-14 rounded-2xl bg-slate-900 dark:bg-white flex items-center justify-center text-white dark:text-slate-900 shadow-xl group-hover:scale-105 transition-transform duration-500">
                              <School size={24} />
                            </div>
                            <div>
                               <p className="font-black text-slate-900 dark:text-white text-lg tracking-tighter mb-0.5">{school.name}</p>
                               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{school.county} County • Provisioned {new Date(school.createdAt || Date.now()).toLocaleDateString()}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-8">
                          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black tracking-widest uppercase border ${
                            school.edition === 'elite' ? 'bg-orange-50 text-orange-600 border-orange-100' : 
                            school.edition === 'professional' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                            'bg-slate-50 text-slate-500 border-slate-100'
                          }`}>
                            {school.edition}
                          </div>
                        </td>
                        <td className="p-8">
                          <div className="space-y-1">
                             <div className={`text-xs font-black tracking-tight ${school.paymentStatus === 'paid' ? 'text-emerald-600' : 'text-orange-500'}`}>
                               {school.paymentStatus === 'paid' ? 'Settled' : 'Payment Overdue'}
                             </div>
                             <p className="text-[10px] font-bold text-slate-400">Next cycle: Apr 2026</p>
                          </div>
                        </td>
                        <td className="p-8">
                          <div className="flex items-center gap-3">
                             <div className={`w-2.5 h-2.5 rounded-full ${school.status === 'suspended' ? 'bg-rose-500' : 'bg-emerald-500'} shadow-sm`} />
                             <span className="text-[11px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-tighter">{school.status || 'Active'}</span>
                          </div>
                        </td>
                        <td className="p-8 text-right pr-12">
                           <button onClick={() => handleOpenModal(school)} className="w-10 h-10 inline-flex items-center justify-center bg-slate-50 dark:bg-slate-800 rounded-xl transition-all text-slate-400 hover:text-slate-900 dark:hover:text-white hover:shadow-md active:scale-90">
                              <Settings size={18} />
                           </button>
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
              {filteredSchools.length === 0 && (
                <div className="py-20 text-center flex flex-col items-center">
                   <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-300 mb-6 font-bold scale-150 opacity-20"><Search size={40}/></div>
                   <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">No institutions onboarded</h3>
                   <p className="text-slate-400 font-medium max-w-sm">No schools currently match your search. Start by provisioning a new partner.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Simple Support/Help View */}
        {activeSubTab === 'support' && (
          <div className="animate-in slide-in-from-bottom-6 duration-1000">
             <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-20 text-center border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col items-center">
                <div className="w-24 h-24 bg-orange-50 dark:bg-orange-900/10 rounded-full flex items-center justify-center text-orange-600 mb-8 border border-orange-100/50">
                  <MessageSquare size={48} />
                </div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight mb-4">Support Inbox Zero!</h2>
                <p className="text-slate-500 font-medium max-w-md mx-auto mb-10">All partner inquiries and technical tickets have been addressed. Your help desk is clear.</p>
                <div className="flex gap-4">
                  <button className="px-10 py-4 bg-orange-600 text-white rounded-[1.5rem] font-bold tracking-tight text-xs hover:bg-orange-700 transition-all shadow-xl shadow-orange-500/20">Check Archived</button>
                  <button className="px-10 py-4 border-2 border-slate-100 dark:border-slate-800 text-slate-400 rounded-[1.5rem] font-bold tracking-tight text-xs">Help Documentation</button>
                </div>
             </div>
          </div>
        )}
      </div>

      {/* Standard Modal Reused */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="bg-white dark:bg-slate-900 rounded-[3.5rem] w-full max-w-2xl overflow-hidden shadow-[0_35px_60px_-15px_rgba(0,0,0,0.3)] border border-slate-100 dark:border-white/10">
              <form onSubmit={handleSubmit}>
                <div className="p-12 border-b border-slate-50 dark:border-white/5 flex justify-between items-center relative overflow-hidden">
                  <div className="relative z-10">
                    <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter mb-1">{selectedSchool ? 'Project Configuration' : 'Provision New Partner'}</h2>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">SaaS Instance Deployment Wizard</p>
                  </div>
                  <div className="p-5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-3xl relative z-10 shadow-xl"><ShieldCheck size={32}/></div>
                  <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl -mr-32 -mt-32" />
                </div>

                <div className="p-12 space-y-10">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div className="space-y-4">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Partner Identity</label>
                       <input type="text" required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder="e.g. Sunshine Secondary" className="w-full bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-2xl py-5 px-8 text-sm font-bold focus:ring-2 focus:ring-orange-500 outline-none dark:text-white transition-all placeholder:text-slate-300"/>
                    </div>
                    <div className="space-y-4">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Regional Jurisdiction</label>
                       <input type="text" required value={formData.county} onChange={(e) => setFormData({...formData, county: e.target.value})} placeholder="e.g. Nairobi" className="w-full bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-2xl py-5 px-8 text-sm font-bold focus:ring-2 focus:ring-orange-500 outline-none dark:text-white transition-all placeholder:text-slate-300"/>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="space-y-4">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">License Tier</label>
                       <div className="relative">
                          <select value={formData.edition} onChange={(e) => setFormData({...formData, edition: e.target.value})} className="w-full bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-2xl py-5 px-8 text-sm font-bold outline-none dark:text-white transition-all appearance-none cursor-pointer">
                            <option value="starter" className="text-slate-900">Starter Core</option>
                            <option value="professional" className="text-slate-900">Pro</option>
                            <option value="elite" className="text-slate-900">Enterprise</option>
                          </select>
                          <ChevronRight size={16} className="absolute right-6 top-1/2 -translate-y-1/2 rotate-90 text-slate-400 pointer-events-none" />
                       </div>
                    </div>
                    <div className="space-y-4">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Access Protocol</label>
                       <div className="relative">
                          <select value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})} className="w-full bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-2xl py-5 px-8 text-sm font-bold outline-none dark:text-white transition-all appearance-none cursor-pointer">
                            <option value="active" className="text-slate-900">Live / Active</option>
                            <option value="suspended" className="text-slate-900">Suspended</option>
                          </select>
                          <ChevronRight size={16} className="absolute right-6 top-1/2 -translate-y-1/2 rotate-90 text-slate-400 pointer-events-none" />
                       </div>
                    </div>
                    <div className="space-y-4">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Billing State</label>
                       <div className="relative">
                          <select value={formData.paymentStatus} onChange={(e) => setFormData({...formData, paymentStatus: e.target.value})} className="w-full bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-2xl py-5 px-8 text-sm font-bold outline-none dark:text-white transition-all appearance-none cursor-pointer">
                            <option value="paid" className="text-slate-900">Account Paid</option>
                            <option value="pending" className="text-slate-900">Pending Dues</option>
                          </select>
                          <ChevronRight size={16} className="absolute right-6 top-1/2 -translate-y-1/2 rotate-90 text-slate-400 pointer-events-none" />
                       </div>
                    </div>
                  </div>
                </div>

                 <div className="p-12 bg-slate-100/50 dark:bg-white/5 flex gap-8 items-center border-t border-slate-100 dark:border-white/5">
                   <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-5 font-black uppercase tracking-widest text-xs text-slate-400 hover:text-slate-600 transition-colors">Abort Setup</button>
                   <button type="submit" className="flex-[2] py-5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-[2rem] font-black uppercase tracking-widest text-xs shadow-2xl active:scale-95 transition-all hover:opacity-90">
                     {selectedSchool ? 'Apply Configuration' : 'Deploy SaaS Instance'}
                   </button>
                 </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

/* Premium Redesign Helper Components */
const SparklineCard = ({ title, value, change, isPositive, data, color }: any) => {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-10 border border-slate-100 dark:border-slate-800 shadow-sm transition-all hover:shadow-xl group">
      <div className="flex justify-between items-start mb-6">
         <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{title}</p>
            <h4 className="text-3xl font-black dark:text-white tracking-tighter leading-none">{value}</h4>
         </div>
         <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black ${isPositive ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
            <ArrowUpRight size={12} />
            {change}
         </div>
      </div>
      <div className="h-[50px] w-full bg-slate-50 dark:bg-slate-800/50 rounded-2xl flex items-end p-2 px-4 gap-1">
         {/* Simple Visual Sparkline Representation since we avoid Recharts here for simplicity in this file */}
         {[0.4, 0.6, 0.5, 0.8, 0.7, 0.9, 1].map((h, i) => (
            <div key={i} className="flex-1 bg-orange-500/20 rounded-t-sm group-hover:bg-orange-500/40 transition-all" style={{ height: `${h * 100}%` }} />
         ))}
      </div>
    </div>
  );
};

const HealthIndicator = ({ label, status }: any) => (
  <div className="flex items-center justify-between py-3 border-b border-slate-50 dark:border-slate-800 last:border-0">
     <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{label}</span>
     <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">{status}</span>
  </div>
);

const TabButton = ({ active, onClick, icon, label }: any) => (
  <button 
    onClick={onClick}
     className={`flex items-center gap-3 px-6 py-3 rounded-2xl text-[13px] font-black tracking-tight transition-all duration-300 ${
       active 
         ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xl' 
         : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5'
     }`}
  >
    {icon}
    {label}
  </button>
);

const HeroAction = ({ icon, label, onClick, color }: any) => (
  <button 
    onClick={onClick}
     className={`flex items-center gap-3 px-6 py-3.5 ${color} rounded-full text-xs font-bold tracking-tight transition-all hover:scale-105 active:scale-95 shadow-xl`}
  >
    {icon}
    {label}
  </button>
);

const DashboardStatCard = ({ title, value, subtitle, actionLabel, icon }: any) => (
  <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all group">
    <div className="flex items-center justify-between mb-8">
      <div className="p-3 bg-slate-50 dark:bg-slate-800 text-slate-400 group-hover:text-orange-500 transition-colors rounded-2xl">
        {icon}
      </div>
      <ArrowUpRight className="text-slate-200 group-hover:text-orange-500 transition-colors" size={20} />
    </div>
     <div className="mb-6">
       <p className="text-[10px] font-bold text-slate-400 tracking-tight mb-1.5">{title}</p>
       <h4 className="text-xl font-bold dark:text-white tracking-tighter mb-1.5 leading-none">{value}</h4>
       <p className="text-[11px] font-medium text-slate-500">{subtitle}</p>
     </div>
     <button className="text-[10px] font-bold text-orange-600 tracking-tight flex items-center gap-2">
       {actionLabel} <ChevronRight size={12} />
     </button>
  </div>
);

// Add missing Lucide icon
const ArrowRight = ({ size }: any) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-arrow-right">
    <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
  </svg>
);

export default PlatformAdminModule;
