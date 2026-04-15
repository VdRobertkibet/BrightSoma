import React, { useState, useEffect } from 'react';
import { 
  Building, 
  Bus, 
  Monitor, 
  Archive, 
  Plus, 
  Search, 
  LayoutGrid, 
  List, 
  Briefcase,
  Trash2,
  Box,
  MapPin,
  ArrowUpRight,
  ArrowDownRight,
  PieChart,
  Activity,
  History,
  TrendingUp,
  Settings,
  Download,
  Zap,
  Loader2,
  X,
  Sparkles,
  CheckCircle2,
  ChevronRight,
  School,
  GraduationCap,
  Hammer,
  Shield
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  Pie
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { db, auth } from '../src/firebase';
import { collection, addDoc, onSnapshot, query, where, deleteDoc, doc, serverTimestamp, getDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';


interface Asset {
  id: string;
  name: string;
  category: string;
  value: number;
  condition: string;
  location: string;
  purchaseDate: string;
  schoolId: string;
  depreciationRate?: number;
  isCustom?: boolean;
}

interface MaintenanceLog {
  id: string;
  assetId: string;
  assetName: string;
  date: string;
  description: string;
  cost: number;
  performedBy: string;
  schoolId: string;
}

const AssetsModule: React.FC = () => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<'registry' | 'maintenance' | 'analytics'>('registry');
  const [analyticsSubTab, setAnalyticsSubTab] = useState<'overview' | 'valuation'>('overview');
  const [maintenanceLogs, setMaintenanceLogs] = useState<MaintenanceLog[]>([]);
  const [showLogModal, setShowLogModal] = useState(false);
  const [selectedAssetId, setSelectedAssetId] = useState<string>('');
  const [showSuccessCard, setShowSuccessCard] = useState(false);
  const [lastAddedAsset, setLastAddedAsset] = useState<string | null>(null);
  const { profile } = useAuth();
  
  const SuccessCard = ({ name, onDone }: { name: string, onDone: () => void }) => (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={onDone}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="relative bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl p-10 max-w-sm border border-slate-100 dark:border-slate-800 w-full overflow-hidden"
      >
        <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
          <Sparkles size={120} className="text-orange-500" />
        </div>

        <div className="space-y-6 text-center">
          <div className="w-20 h-20 bg-orange-50 dark:bg-orange-900/20 rounded-3xl flex items-center justify-center mx-auto shadow-sm border border-orange-100 dark:border-orange-800/30">
            <CheckCircle2 className="text-orange-600 dark:text-orange-400" size={40} />
          </div>
          
          <div>
            <h3 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight leading-tight mb-2">
              Asset Registered!
            </h3>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 leading-relaxed px-4">
              <span className="text-orange-600 dark:text-orange-400 font-bold">{name}</span> has been successfully added to your school's asset registry.
            </p>
          </div>

          <div className="pt-2">
            <button 
              onClick={onDone}
              className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-slate-800 dark:hover:bg-slate-50 transition-all active:scale-95 shadow-xl shadow-slate-900/10"
            >
              Continue to Registry
              <ChevronRight size={18} />
            </button>
          </div>

          <div className="flex gap-1 justify-center pt-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className={`h-1 rounded-full bg-orange-600 transition-all duration-1000 ${i === 1 ? 'w-8' : 'w-2 opacity-20'}`} />
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
  
  const toTitleCase = (str: string) => {
    if (!str) return '';
    return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
  };

  const KpiCard = ({ title, value, delta, status, icon: Icon, subtitle }: any) => (
    <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm p-8 relative overflow-hidden group transition-all duration-500 hover:shadow-orange-900/10">
      <div className="absolute top-0 right-0 w-48 h-48 bg-orange-500/5 rounded-full -mr-24 -mt-24 transition-transform duration-1000 group-hover:scale-110"></div>
      
      <div className="relative z-10">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-xl flex items-center justify-center text-orange-600 dark:text-orange-400 shadow-sm transition-transform duration-500 group-hover:scale-110">
            <Icon size={24} strokeWidth={2.5} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white tracking-tight leading-none">{title}</h3>
            <p className="text-[10px] font-medium text-slate-400 mt-1 capitalize tracking-widest">{subtitle}</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="space-y-1">
            <p className="text-[9px] font-black text-slate-400 capitalize tracking-widest ml-1">Asset Value</p>
            <div className="flex items-baseline gap-2">
              <span className="text-[10px] font-medium text-orange-600">KES</span>
              <p className="text-2xl font-medium text-slate-900 dark:text-white tracking-tighter leading-none">{value.toLocaleString()}</p>
            </div>
          </div>

          <div className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-[10px] font-black tracking-widest transition-all duration-500 border ${
            status === 'up' 
              ? 'bg-orange-50 text-orange-600 border-orange-100' 
              : 'bg-rose-50 text-rose-600 border-rose-100'
          }`}>
            {status === 'up' ? <ArrowUpRight size={14} strokeWidth={3} /> : <ArrowDownRight size={14} strokeWidth={3} />}
            {delta}%
          </div>
        </div>
      </div>
    </div>
  );

  const [newAsset, setNewAsset] = useState<any>({
    name: '',
    category: 'Furniture',
    value: '',
    condition: 'Excellent',
    location: '',
    purchaseDate: new Date().toISOString().split('T')[0],
    depreciationRate: '5'
  });
  const [isCustomCategory, setIsCustomCategory] = useState(false);

  const [newLog, setNewLog] = useState({
    assetId: '',
    date: new Date().toISOString().split('T')[0],
    description: '',
    cost: '',
    performedBy: ''
  });

  useEffect(() => {
    let unsubscribeAssets: () => void;
    let unsubscribeLogs: () => void;
    
    // 🛡️ CRITICAL: Wait for profile.schoolId to avoid temporary Permission Denied errors
    const schoolId = profile?.schoolId;
    if (!schoolId) {
      console.log("[AssetsModule] Waiting for schoolId resolution...");
      return;
    }

    console.log("[AssetsModule] Initializing listeners for school:", schoolId);

    const q = query(collection(db, 'assets'), where('schoolId', '==', schoolId));
    unsubscribeAssets = onSnapshot(q, (snapshot) => {
      const assetData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Asset));
      setAssets(assetData);
      setIsLoading(false);
    }, (error) => {
      console.error("[AssetsModule] Asset listener error:", error);
    });

    const qLogs = query(collection(db, 'maintenance_logs'), where('schoolId', '==', schoolId));
    unsubscribeLogs = onSnapshot(qLogs, (snapshot) => {
      const logData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MaintenanceLog));
      setMaintenanceLogs(logData);
    }, (error) => {
      console.error("[AssetsModule] Maintenance listener error:", error);
    });

    return () => {
      if (unsubscribeAssets) unsubscribeAssets();
      if (unsubscribeLogs) unsubscribeLogs();
    };
  }, [profile?.schoolId]);

  const handleAddAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAsset.name || !newAsset.value || !newAsset.location) {
      toast.error('Please fill in all required fields.');
      return;
    }

    setIsProcessing(true);
    try {
      const user = auth.currentUser;
      if (!user) return;

      let schoolId = user.uid;
      const staffDocRef = doc(db, 'staff', user.uid);
      const staffDocSnap = await getDoc(staffDocRef);
      if (staffDocSnap.exists()) {
        schoolId = staffDocSnap.data().schoolId;
      }

      await addDoc(collection(db, 'assets'), {
        ...newAsset,
        value: Number(newAsset.value),
        depreciationRate: Number(newAsset.depreciationRate || 0),
        isCustom: isCustomCategory,
        schoolId: profile?.schoolId || user.uid,
        createdAt: serverTimestamp()
      });

      setLastAddedAsset(newAsset.name);
      setShowSuccessCard(true);
      setShowAddModal(false);
      setNewAsset({
        name: '',
        category: 'Furniture',
        value: '',
        condition: 'Excellent',
        location: '',
        purchaseDate: new Date().toISOString().split('T')[0]
      });
    } catch (error: any) {
      console.error("Asset registration failed: ", error);
      toast.error('Failed to add asset: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLog.assetId || !newLog.cost || !newLog.description) {
      toast.error('Please fill in all required fields.');
      return;
    }

    setIsProcessing(true);
    try {
      const user = auth.currentUser;
      if (!user) return;

      let schoolId = user.uid;
      const staffDocRef = doc(db, 'staff', user.uid);
      const staffDocSnap = await getDoc(staffDocRef);
      if (staffDocSnap.exists()) {
        schoolId = staffDocSnap.data().schoolId;
      }

      const assetName = assets.find(a => a.id === newLog.assetId)?.name || 'Unknown Asset';

      await addDoc(collection(db, 'maintenance_logs'), {
        ...newLog,
        assetName,
        cost: Number(newLog.cost),
        schoolId,
        createdAt: serverTimestamp()
      });

      toast.success('Maintenance log added!');
      setShowLogModal(false);
      setNewLog({
        assetId: '',
        date: new Date().toISOString().split('T')[0],
        description: '',
        cost: '',
        performedBy: ''
      });
    } catch (error) {
      toast.error('Failed to add maintenance log.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteAsset = async (id: string) => {
    if (!window.confirm('Are you sure you want to remove this asset? This action cannot be undone.')) return;
    try {
      await deleteDoc(doc(db, 'assets', id));
      toast.success('Asset removed successfully.');
    } catch (error) {
      toast.error('Failed to remove asset.');
    }
  };

  const filteredAssets = assets.filter(a => {
    const matchesSearch = a.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          a.location.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === 'All' || a.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const totalValue = assets.reduce((sum, a) => sum + Number(a.value), 0);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Vehicle': return <Bus size={24} className="text-blue-500" />;
      case 'Real Estate': return <Building size={24} className="text-orange-500" />;
      case 'Equipment': return <Monitor size={24} className="text-purple-500" />;
      case 'Furniture': return <Archive size={24} className="text-orange-500" />;
      default: return <Box size={24} className="text-slate-500" />;
    }
  };

  const totalMaintCost = maintenanceLogs.reduce((sum, l) => sum + Number(l.cost), 0);
  const criticalAssets = assets.filter(a => a.condition === 'Poor').length;

  const chartData = assets.reduce((acc: any[], asset) => {
    const existing = acc.find(i => i.name === asset.category);
    if (existing) {
      existing.value += Number(asset.value);
    } else {
      acc.push({ name: asset.category, value: Number(asset.value) });
    }
    return acc;
  }, []);

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-1000 font-sans pb-20">
      {/* Combined Header & Filters Card */}
      <div className="w-[100vw] relative left-1/2 -ml-[50vw] -mt-4 md:-mt-8 bg-[#334155] py-5 border-b border-[#1f507a] shadow-sm">
        <div className="w-full max-w-7xl mx-auto px-4 md:px-8">
          <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center border border-white/10 shadow-inner group relative overflow-hidden">
                <Briefcase size={24} className="text-white/60" />
              </div>
              <div className="space-y-1">
                <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                  Asset Registry & Inventory
                </h1>
                <p className="text-[#94a3b8] text-sm font-medium">Physical asset tracking and maintenance logs</p>
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 mr-4">
                <div className="px-4 py-2 bg-black/20 border border-white/10 rounded-full flex items-center gap-2">
                  <p className="text-[10px] font-bold text-emerald-200 capitalize whitespace-nowrap">Portfolio Value:</p>
                  <p className="text-sm font-bold text-white tracking-tight">KES {(totalValue / 1000000).toFixed(1)}M</p>
                </div>
              </div>

              <button 
                onClick={() => toast.success('Registry exported successfully')}
                className="flex items-center justify-center gap-2 px-5 py-2.5 bg-white text-orange-600 rounded-xl text-[12.5px] font-bold hover:bg-slate-50 transition-all shadow-sm active:scale-95 group border border-white/20"
              >
                <Download size={16} className="group-hover:scale-110 transition-transform" /> 
                Export Registry
              </button>
              <button 
                onClick={() => setShowAddModal(true)}
                className="flex items-center justify-center gap-2 px-5 py-2.5 bg-white text-orange-600 rounded-xl text-[12.5px] font-bold hover:bg-slate-50 transition-all shadow-sm active:scale-95 group border border-white/20"
              >
                <Plus size={16} className="group-hover:scale-110 transition-transform" /> 
                Add New Asset
              </button>
            </div>
          </div>

          <div className="mt-6 pt-5 border-t border-white/10 flex flex-col gap-6">
            <div className="flex p-1.5 bg-black/10 border border-white/10 rounded-[2rem] overflow-x-auto hide-scrollbar scrollbar-hide">
              {[
                { id: 'registry', label: 'Asset Registry', icon: <Briefcase size={14} strokeWidth={2.5} /> },
                { id: 'maintenance', label: 'Maintenance History', icon: <History size={14} strokeWidth={2.5} /> },
                { id: 'analytics', label: 'Asset Analytics', icon: <Activity size={14} strokeWidth={2.5} /> }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-6 py-2 rounded-[1.5rem] text-[11px] font-bold capitalize tracking-wide transition-all duration-300 whitespace-nowrap ${
                    activeTab === tab.id 
                      ? 'bg-white text-black shadow-sm scale-105' 
                      : 'text-blue-100 hover:bg-white/10'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 mt-10">
        {/* Un-carded Registry Operations Section */}
        <div className="relative py-4 group">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
            <div>
              <h2 className="text-xl font-bold text-slate-800 dark:text-white tracking-tight leading-tight mb-2">Registry Operations</h2>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400 max-w-xl leading-relaxed">
                Maintain absolute control over your institution's physical assets. Track valuations, monitor condition health, and manage maintenance lifecycles from a unified dashboard.
              </p>
            </div>
          </div>
        </div>
      </div>

      {activeTab === 'registry' ? (
        <div className="space-y-10">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <KpiCard title="Registry Value" value={totalValue} delta={8} status="up" icon={Briefcase} subtitle="Total Asset Valuation" />
            <KpiCard title="Maint. Spend" value={totalMaintCost} delta={12} status="up" icon={TrendingUp} subtitle="Historical Costs" />
            <KpiCard title="Critical Health" value={criticalAssets} delta={2} status="down" icon={Activity} subtitle="Assets in Poor Condition" />
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm mt-10">
            <div className="p-10 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-50/30">
              <div>
                <h3 className="text-xl font-bold text-slate-800 dark:text-white tracking-tight mb-1">Asset Inventory Directory</h3>
                <p className="text-xs text-slate-500 font-medium tracking-wide">Comprehensive record of all institutional property</p>
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <div className="relative group min-w-[240px]">
                  <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-orange-500 transition-colors" size={18} />
                  <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search assets..." className="w-full pl-14 pr-6 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 transition-all placeholder:text-slate-400" />
                </div>
                <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="px-6 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 transition-all appearance-none cursor-pointer min-w-[160px]">
                  <option value="All">All Categories</option>
                  <option value="Real Estate">Real Estate</option>
                  <option value="Vehicle">Vehicles</option>
                  <option value="Equipment">Equipment</option>
                  <option value="Furniture">Furniture</option>
                </select>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800">
                    <th className="px-8 py-5 text-[10px] font-bold text-slate-400 tracking-widest capitalize">Asset Identification</th>
                    <th className="px-8 py-5 text-[10px] font-bold text-slate-400 tracking-widest capitalize">Valuation</th>
                    <th className="px-8 py-5 text-[10px] font-bold text-slate-400 tracking-widest capitalize">Condition & Health</th>
                    <th className="px-8 py-5 text-[10px] font-bold text-slate-400 tracking-widest capitalize">Location</th>
                    <th className="px-8 py-5 text-[10px] font-bold text-slate-400 tracking-widest capitalize text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                  {filteredAssets.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-8 py-20 text-center">
                        <div className="flex flex-col items-center gap-4">
                          <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-slate-300">
                            <Archive size={32} />
                          </div>
                          <p className="text-slate-400 font-bold capitalize tracking-widest text-[10px]">No Assets Found</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredAssets.map(asset => (
                      <tr key={asset.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors group">
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center text-orange-600 shrink-0">
                                {getCategoryIcon(asset.category)}
                            </div>
                            <div>
                                <p className="text-sm font-bold text-slate-800 dark:text-white leading-none">{toTitleCase(asset.name)}</p>
                                <p className="text-[10px] font-medium text-slate-400 mt-1.5">{toTitleCase(asset.category)}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-[10px] font-medium text-orange-500">KES</span>
                            <span className="text-[13px] font-medium text-slate-700 dark:text-slate-200 tracking-tight">{asset.value.toLocaleString()}</span>
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg border ${
                            asset.condition === 'Excellent' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                            asset.condition === 'Good' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                            asset.condition === 'Fair' ? 'bg-orange-50 text-orange-600 border-orange-100' : 'bg-rose-50 text-rose-600 border-rose-100'
                          }`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${
                              asset.condition === 'Excellent' ? 'bg-emerald-500' :
                              asset.condition === 'Good' ? 'bg-blue-500' :
                              asset.condition === 'Fair' ? 'bg-orange-500' : 'bg-rose-500'
                            }`}></div>
                            <span className="text-[10px] font-bold tracking-tight">{toTitleCase(asset.condition)}</span>
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-2 text-slate-500">
                            <MapPin size={14} className="opacity-50" />
                            <span className="text-xs font-medium">{toTitleCase(asset.location)}</span>
                          </div>
                        </td>
                        <td className="px-8 py-5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button onClick={() => { setSelectedAssetId(asset.id); setShowLogModal(true); setNewLog(prev => ({ ...prev, assetId: asset.id })); }} className="p-2 text-slate-400 hover:text-orange-600 transition-colors bg-slate-50 dark:bg-slate-800 rounded-lg" title="Log Maintenance">
                              <History size={14} />
                            </button>
                            <button onClick={() => handleDeleteAsset(asset.id)} className="p-2 text-slate-400 hover:text-rose-500 transition-colors bg-slate-50 dark:bg-slate-800 rounded-lg" title="Remove Asset">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : activeTab === 'analytics' ? (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 p-8 shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/5 rounded-full -mr-32 -mt-32"></div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-orange-50 dark:bg-orange-900/30 rounded-xl flex items-center justify-center text-orange-600 dark:text-orange-400"><TrendingUp size={24} /></div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-800 dark:text-white tracking-tight">Valuation by Category</h3>
                      <p className="text-xs text-slate-500 font-medium">Inventory value distribution</p>
                    </div>
                  </div>
                </div>
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="valGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f97316" stopOpacity={0.15}/>
                          <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} dy={15} />
                      <YAxis hide />
                      <Tooltip contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #f1f5f9', borderRadius: '12px', fontSize: '10px', fontWeight: 700 }} itemStyle={{ color: '#f97316' }} />
                      <Area type="monotone" dataKey="value" stroke="#f97316" strokeWidth={3} fillOpacity={1} fill="url(#valGradient)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 p-8 shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-64 h-64 bg-rose-500/5 rounded-full -mr-32 -mt-32"></div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-rose-50 dark:bg-rose-900/30 rounded-xl flex items-center justify-center text-rose-600 dark:text-rose-400"><Activity size={24} /></div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-800 dark:text-white tracking-tight">Asset Condition Health</h3>
                      <p className="text-xs text-slate-500 font-medium">State of institutional properties</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-6">
                  {['Excellent', 'Good', 'Fair', 'Poor'].map((cond) => {
                    const count = assets.filter(a => a.condition === cond).length;
                    const percent = assets.length > 0 ? (count / assets.length) * 100 : 0;
                    return (
                      <div key={cond} className="space-y-2">
                        <div className="flex justify-between items-center text-[10px] font-black tracking-widest uppercase">
                          <span className="text-slate-400">{cond} Condition</span>
                          <span className="text-slate-700 dark:text-slate-200">{count} Assets ({Math.round(percent)}%)</span>
                        </div>
                        <div className="h-2 bg-slate-50 dark:bg-slate-800 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }} 
                            animate={{ width: `${percent}%` }} 
                            className={`h-full rounded-full ${ 
                              cond === 'Excellent' ? 'bg-emerald-500' : 
                              cond === 'Good' ? 'bg-blue-500' : 
                              cond === 'Fair' ? 'bg-orange-500' : 
                              'bg-rose-500' 
                            }`} 
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
            <div className="p-10 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/30">
              <div>
                <h3 className="text-xl font-bold text-slate-800 dark:text-white tracking-tight mb-1">Maintenance History</h3>
                <p className="text-xs text-slate-500 font-medium tracking-wide">Historical logs of asset repairs and servicing</p>
              </div>
              <div className="hidden md:flex items-center gap-4">
                <div className="px-6 py-3 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3">
                  <span className="text-[10px] font-bold text-rose-500 capitalize tracking-widest">Total Lifecycle Cost:</span>
                  <span className="text-[15px] font-medium text-rose-600 tracking-tighter">KES {totalMaintCost.toLocaleString()}</span>
                </div>
                <button onClick={() => setShowLogModal(true)} className="flex items-center gap-3 px-6 py-3 bg-slate-900 text-white dark:bg-white dark:text-slate-900 rounded-2xl text-[11px] font-bold hover:bg-slate-800 dark:hover:bg-slate-100 transition-all active:scale-95 shadow-sm capitalize tracking-widest">
                  <Plus size={16} /> Log Service
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800">
                    <th className="px-8 py-5 text-[10px] font-bold text-slate-400 tracking-widest capitalize">Asset Involved</th>
                    <th className="px-8 py-5 text-[10px] font-bold text-slate-400 tracking-widest capitalize">Service Date</th>
                    <th className="px-8 py-5 text-[10px] font-bold text-slate-400 tracking-widest capitalize">Description</th>
                    <th className="px-8 py-5 text-[10px] font-bold text-slate-400 tracking-widest capitalize">Service Cost</th>
                    <th className="px-8 py-5 text-[10px] font-bold text-slate-400 tracking-widest capitalize text-right">Performed By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                  {maintenanceLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-8 py-20 text-center">
                        <div className="flex flex-col items-center gap-4">
                          <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-slate-300"><History size={32} /></div>
                          <p className="text-slate-400 font-bold capitalize tracking-widest text-[10px]">No Maintenance Records Found</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    maintenanceLogs.map(log => (
                      <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors group">
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                            <span className="text-sm font-bold text-slate-800 dark:text-white leading-tight">{toTitleCase(log.assetName)}</span>
                          </div>
                        </td>
                        <td className="px-8 py-5 text-[11px] font-medium text-slate-500">{new Date(log.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                        <td className="px-8 py-5 text-[11px] font-normal text-slate-500 max-w-xs">{log.description}</td>
                        <td className="px-8 py-5">
                          <span className="text-[13px] font-medium text-rose-500 tracking-tight">KES {Number(log.cost).toLocaleString()}</span>
                        </td>
                        <td className="px-8 py-5 text-right">
                          <span className="text-[10px] font-bold text-slate-500 capitalize tracking-widest bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-100 dark:border-slate-700">{toTitleCase(log.performedBy)}</span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}


      {/* Add Asset Modal */}
      {/* Add Asset Modal - Overhauled to match Events style */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800"
            >
              <div className="px-8 py-6 border-b border-slate-50 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/30">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-orange-600 rounded-2xl shadow-lg shadow-orange-900/20">
                    <Plus size={24} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-normal text-slate-800 dark:text-white">Register New Asset</h3>
                    <p className="text-[10px] font-black text-slate-500 capitalize tracking-widest mt-1">Institutional Property & Equipment</p>
                  </div>
                </div>
                <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                  <X size={20} className="dark:text-white" />
                </button>
              </div>

              <form onSubmit={handleAddAsset} className="p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2 md:col-span-2">
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-xs font-normal text-slate-500 ml-2">Asset Name</label>
                    </div>
                    <input 
                      type="text" 
                      required 
                      value={newAsset.name} 
                      onChange={e => setNewAsset({...newAsset, name: e.target.value})} 
                      placeholder="e.g. Mercedes Benz Bus KCS 123G" 
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl py-4 px-6 text-sm font-normal focus:ring-2 focus:ring-orange-500 outline-none transition-all dark:text-white" 
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-xs font-normal text-slate-500 ml-2">Category</label>
                      <button 
                        type="button"
                        onClick={() => setIsCustomCategory(!isCustomCategory)}
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md transition-all ${isCustomCategory ? 'bg-orange-100 text-orange-600' : 'bg-slate-100 text-slate-500'}`}
                      >
                        {isCustomCategory ? 'Use Preset' : 'Custom'}
                      </button>
                    </div>
                    {isCustomCategory ? (
                      <input 
                        type="text"
                        required
                        value={newAsset.category}
                        onChange={e => setNewAsset({...newAsset, category: e.target.value})}
                        placeholder="Enter custom category"
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl py-4 px-6 text-sm font-normal focus:ring-2 focus:ring-orange-500 outline-none transition-all dark:text-white"
                      />
                    ) : (
                      <select 
                        value={newAsset.category} 
                        onChange={e => setNewAsset({...newAsset, category: e.target.value})} 
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl py-4 px-6 text-sm font-normal focus:ring-2 focus:ring-orange-500 outline-none transition-all dark:text-white"
                      >
                        <option value="Real Estate">Real Estate & Land</option>
                        <option value="Vehicle">Vehicle</option>
                        <option value="Equipment">Equipment & Tech</option>
                        <option value="Furniture">Furniture</option>
                        <option value="Other">Other</option>
                      </select>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-normal text-slate-500 ml-2">Valuation (KES)</label>
                    <input 
                      type="number" 
                      required 
                      value={newAsset.value} 
                      onChange={e => setNewAsset({...newAsset, value: e.target.value})} 
                      placeholder="0.00" 
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl py-4 px-6 text-sm font-normal focus:ring-2 focus:ring-orange-500 outline-none transition-all dark:text-white" 
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-normal text-slate-500 ml-2">Depreciation Rate (%)</label>
                    <div className="relative">
                      <input 
                        type="number" 
                        required 
                        value={newAsset.depreciationRate} 
                        onChange={e => setNewAsset({...newAsset, depreciationRate: e.target.value})} 
                        placeholder="5" 
                        min="0"
                        max="100"
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl py-4 px-6 text-sm font-normal focus:ring-2 focus:ring-orange-500 outline-none transition-all dark:text-white" 
                      />
                      <span className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 font-bold">%</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-normal text-slate-500 ml-2">Condition</label>
                    <select 
                      value={newAsset.condition} 
                      onChange={e => setNewAsset({...newAsset, condition: e.target.value})} 
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl py-4 px-6 text-sm font-normal focus:ring-2 focus:ring-orange-500 outline-none transition-all dark:text-white"
                    >
                      <option value="Excellent">Excellent</option>
                      <option value="Good">Good</option>
                      <option value="Fair">Fair</option>
                      <option value="Poor">Poor/Maintenance Required</option>
                    </select>
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <label className="text-xs font-normal text-slate-500 ml-2">Location / Department</label>
                    <input 
                      type="text" 
                      required 
                      value={newAsset.location} 
                      onChange={e => setNewAsset({...newAsset, location: e.target.value})} 
                      placeholder="e.g. Main Campus / Science Lab" 
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl py-4 px-6 text-sm font-normal focus:ring-2 focus:ring-orange-500 outline-none transition-all dark:text-white" 
                    />
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-50 dark:border-slate-800 flex justify-end gap-3">
                  <button 
                    type="button" 
                    onClick={() => setShowAddModal(false)} 
                    className="px-8 py-4 text-sm font-normal text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={isProcessing} 
                    className="px-12 py-4 bg-orange-600 text-white rounded-2xl text-sm font-normal tracking-wide hover:bg-orange-700 transition-all shadow-xl shadow-orange-900/20 active:scale-95 flex items-center gap-2"
                  >
                    {isProcessing && <Loader2 size={18} className="animate-spin" />}
                    {isProcessing ? 'Processing...' : 'Confirm Registration'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showLogModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative bg-white dark:bg-slate-900 w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800">
              <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/30">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-orange-500/10 text-orange-500 rounded-2xl border border-orange-500/20">
                    <History size={20} strokeWidth={2.5} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-800 dark:text-white tracking-tight">Log Maintenance</h3>
                    <p className="text-[10px] font-black text-slate-500 capitalize tracking-widest mt-1">Document Service Or Repair Activity</p>
                  </div>
                </div>
              </div>
              <form onSubmit={handleAddLog} className="p-10 space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Select Asset</label>
                  <select required value={newLog.assetId} onChange={e => setNewLog({...newLog, assetId: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl py-4 px-6 text-sm font-bold text-slate-800 dark:text-white outline-none">
                    <option value="">Select Asset</option>
                    {assets.map(asset => (
                      <option key={asset.id} value={asset.id}>{asset.name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Service Date</label>
                    <input type="date" required value={newLog.date} onChange={e => setNewLog({...newLog, date: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl py-4 px-6 text-sm font-bold text-slate-800 dark:text-white outline-none" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Cost (KES)</label>
                    <input type="number" required value={newLog.cost} onChange={e => setNewLog({...newLog, cost: e.target.value})} placeholder="0.00" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl py-4 px-6 text-sm font-bold text-slate-800 dark:text-white outline-none" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Description</label>
                  <textarea required value={newLog.description} onChange={e => setNewLog({...newLog, description: e.target.value})} placeholder="Describe the maintenance performed..." className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl py-4 px-6 text-sm font-bold text-slate-800 dark:text-white outline-none h-24 resize-none" />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Performed By</label>
                  <input type="text" required value={newLog.performedBy} onChange={e => setNewLog({...newLog, performedBy: e.target.value})} placeholder="Technician or Company" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl py-4 px-6 text-sm font-bold text-slate-800 dark:text-white outline-none" />
                </div>

                <div className="pt-6 flex gap-4">
                  <button type="button" onClick={() => setShowLogModal(false)} className="flex-1 px-8 py-4 bg-slate-50 dark:bg-slate-800 text-slate-500 rounded-2xl text-[10px] font-black tracking-widest capitalize transition-all">Cancel</button>
                  <button type="submit" disabled={isProcessing} className="flex-2 px-8 py-4 bg-orange-600 text-white rounded-2xl text-[10px] font-black tracking-widest capitalize shadow-xl hover:-translate-y-1 transition-all flex justify-center items-center">
                    {isProcessing ? 'Saving...' : 'Save Log'}
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

export default AssetsModule;
