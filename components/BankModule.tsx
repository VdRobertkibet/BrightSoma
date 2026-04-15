import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Wallet, 
  Landmark, 
  Plus, 
  ArrowUpRight, 
  ArrowDownRight,
  RefreshCw,
  MoreVertical,
  Calendar
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { db, auth } from '../src/firebase';
import { collection, query, where, onSnapshot, getDoc, doc } from 'firebase/firestore';

interface BankAccount {
  id: string;
  name: string;
  accountNumber: string;
  cashInHand: number;
  bankBalance: number;
  schoolId: string;
}

const BankModule: React.FC = () => {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);

  // Mock historical data for the chart (in a real app, this would be fetched from transactions)
  const chartData = [
    { name: 'Mon', cash: 4000, bank: 24000 },
    { name: 'Tue', cash: 3000, bank: 35000 },
    { name: 'Wed', cash: 2000, bank: 40000 },
    { name: 'Thu', cash: 2780, bank: 39000 },
    { name: 'Fri', cash: 1890, bank: 48000 },
    { name: 'Sat', cash: 2390, bank: 58000 },
    { name: 'Sun', cash: 3490, bank: 63000 },
  ];

  useEffect(() => {
    let unsubscribe: () => void;

    const fetchAccounts = async () => {
      const user = auth.currentUser;
      if (!user) return;

      let schoolId = user.uid;
      const staffDocRef = doc(db, 'staff', user.uid);
      const staffDocSnap = await getDoc(staffDocRef);
      if (staffDocSnap.exists()) {
        schoolId = staffDocSnap.data().schoolId;
      }

      const q = query(collection(db, 'bank_accounts'), where('schoolId', '==', schoolId));
      unsubscribe = onSnapshot(q, (snapshot) => {
        if (snapshot.empty) {
          // Provide some default dummy data for preview
          setAccounts([
            { id: '1', name: 'Main Operations Data', accountNumber: '0123456789', cashInHand: 45000, bankBalance: 1250000, schoolId },
            { id: '2', name: 'PTA Account', accountNumber: '9876543210', cashInHand: 12000, bankBalance: 340000, schoolId }
          ]);
        } else {
          setAccounts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BankAccount)));
        }
        setIsLoading(false);
      });
    };

    fetchAccounts();
    return () => unsubscribe && unsubscribe();
  }, []);

  const selectedAccount = selectedAccountId === 'all' 
    ? null 
    : accounts.find(a => a.id === selectedAccountId);

  const totalCash = selectedAccount 
    ? selectedAccount.cashInHand 
    : accounts.reduce((sum, a) => sum + a.cashInHand, 0);

  const totalBank = selectedAccount 
    ? selectedAccount.bankBalance 
    : accounts.reduce((sum, a) => sum + a.bankBalance, 0);

  const totalCombined = totalCash + totalBank;

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20 font-sans">
      <div className="w-[100vw] relative left-1/2 -ml-[50vw] -mt-4 md:-mt-8 bg-[#334155] py-5 border-b border-[#1f507a] shadow-sm">
        <div className="w-full max-w-7xl mx-auto px-4 md:px-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center border border-white/10 shadow-inner">
                <Landmark size={24} className="text-white/60" />
              </div>
              <div className="space-y-1">
                <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                  Banking & Cash
                </h1>
                <p className="text-[#94a3b8] text-sm font-medium">Monitor liquidity across all institutional accounts</p>
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              <div className="bg-white/5 border border-white/10 rounded-2xl flex items-center px-4 py-2 shadow-sm backdrop-blur-md">
                <span className="text-xs font-bold text-[#94a3b8] mr-3 uppercase tracking-widest">Account:</span>
                <select
                  value={selectedAccountId}
                  onChange={(e) => setSelectedAccountId(e.target.value)}
                  className="bg-transparent text-sm font-bold text-white outline-none cursor-pointer"
                >
                  <option value="all" className="text-slate-900">Consolidated Overview</option>
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id} className="text-slate-900">{acc.name} ({acc.accountNumber.slice(-4)})</option>
                  ))}
                </select>
              </div>
              <button className="flex items-center gap-2 px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl text-sm font-bold tracking-wide shadow-xl shadow-orange-900/20 transition-all active:scale-95">
                <Plus size={18} /> New Account
              </button>
            </div>
          </div>

          {/* Thin veil separating line & Nav */}
          <div className="mt-6 pt-5 border-t border-white/10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="flex p-1.5 bg-black/10 border border-white/10 rounded-[2rem] overflow-x-auto hide-scrollbar w-max">
              <button className="flex items-center gap-2 px-5 py-2 rounded-[1.5rem] text-[11px] font-bold capitalize tracking-wide transition-all duration-300 whitespace-nowrap bg-white text-black shadow-sm scale-105">
                <Landmark size={14} strokeWidth={2.5} />
                Overview
              </button>
              <button className="flex items-center gap-2 px-5 py-2 rounded-[1.5rem] text-[11px] font-bold capitalize tracking-wide transition-all duration-300 whitespace-nowrap text-blue-100 hover:bg-white/10">
                <Wallet size={14} strokeWidth={2.5} />
                Transactions
              </button>
            </div>

            {/* Summary Stats in Header as requested */}
            <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto hide-scrollbar pb-2 md:pb-0">
              <div className="px-5 py-2 bg-black/20 border border-white/10 rounded-full flex items-center gap-3">
                <Wallet size={14} className="text-slate-400" />
                <p className="text-[10px] font-bold text-slate-300 uppercase whitespace-nowrap tracking-widest">Cash In Hand:</p>
                <p className="text-sm font-bold text-white tracking-tight shrink-0">KES {totalCash.toLocaleString()}</p>
              </div>
              <div className="px-5 py-2 bg-[#9aab14]/20 border border-[#9aab14]/30 rounded-full flex items-center gap-3">
                <Building2 size={14} className="text-[#9aab14]" />
                <p className="text-[10px] font-bold text-[#9aab14] uppercase whitespace-nowrap tracking-widest">Bank Balance:</p>
                <p className="text-sm font-bold text-white tracking-tight shrink-0">KES {totalBank.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-8 mt-2">
        {/* Top Controls */}
        <div className="flex justify-end items-start">
          <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 cursor-pointer shadow-sm hover:bg-slate-100 transition-colors">
            <Calendar size={14} className="text-slate-400" />
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Last 30 days</span>
          </div>
        </div>

        {/* Chart Section */}
        <div className="bg-white dark:bg-slate-900 pt-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm relative">
          <div className="px-8 flex justify-between items-center mb-6">
            <div className="flex items-center gap-4 text-xs font-bold">
              <div className="flex items-center gap-2 text-slate-400">
                <div className="w-2.5 h-2.5 rounded-sm bg-slate-400"></div> Cash In Hand
              </div>
              <div className="flex items-center gap-2 text-[#9aab14]">
                <div className="w-2.5 h-2.5 rounded-sm bg-[#9aab14]"></div> Bank Balance
              </div>
            </div>
            <button className="text-xs font-bold text-blue-500 hover:text-blue-600 flex items-center gap-1">
              <ArrowUpRight size={14} /> View full report
            </button>
          </div>

          <div className="h-[250px] w-full px-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorBank" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#9aab14" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#9aab14" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorCash" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#94a3b8" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.3} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }} tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`} dx={-10} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px' }} itemStyle={{ fontWeight: 600 }} />
                <Area type="monotone" dataKey="bank" stroke="#9aab14" strokeWidth={2} fillOpacity={1} fill="url(#colorBank)" />
                <Area type="monotone" dataKey="cash" stroke="#94a3b8" strokeWidth={2} fillOpacity={1} fill="url(#colorCash)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Active Accounts Table */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2">
              Active Accounts <ArrowDownRight size={16} className="text-slate-400" />
            </h3>
          </div>
          
          <div className="bg-transparent overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-800/80 border-b border-t border-slate-200 dark:border-slate-700">
                  <th className="px-6 py-4 text-[10px] font-black text-[#1da1f2] tracking-widest uppercase flex items-center gap-2">
                    <Building2 size={14} /> Account Details
                  </th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-800 dark:text-white tracking-widest uppercase text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Wallet size={14} /> Cash In Hand
                    </div>
                  </th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-800 dark:text-white tracking-widest uppercase text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Landmark size={14} /> Amount In Bank
                    </div>
                  </th>
                  <th className="px-6 py-4 w-12 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                {accounts.map(acc => (
                  <tr key={acc.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors group cursor-pointer">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl">
                          <Building2 size={16} className="text-slate-500" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-800 dark:text-white tracking-tight text-blue-600 dark:text-blue-400 group-hover:underline">{acc.name}</p>
                          <p className="text-xs font-medium text-slate-500">xxxx{acc.accountNumber.slice(-4)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-sm font-bold text-slate-600 dark:text-slate-300">
                        KES {acc.cashInHand.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-sm font-bold text-slate-800 dark:text-white">
                        KES {acc.bankBalance.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <MoreVertical size={16} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity mx-auto" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BankModule;
