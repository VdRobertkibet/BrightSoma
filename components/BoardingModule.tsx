
import React, { useState, useEffect, useMemo } from 'react';
import { 
  ShieldCheck, 
  UserPlus, 
  Home, 
  Search, 
  Filter, 
  Calendar, 
  Coffee, 
  Utensils, 
  Moon, 
  Wallet, 
  Clock, 
  CheckCircle2, 
  XCircle,
  AlertCircle,
  Plus,
  Loader2,
  X,
  User
} from 'lucide-react';
import toast from 'react-hot-toast';
import { db, auth } from '../src/firebase';
import { collection, query, where, onSnapshot, getDocs, addDoc, updateDoc, doc, deleteDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { Dormitory, Exeat, Student, PocketMoneyTransaction, MealPlan } from '../types';

const BoardingModule: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'dorms' | 'exeats' | 'pocket-money' | 'meals'>('dorms');
  const [dorms, setDorms] = useState<Dormitory[]>([]);
  const [exeats, setExeats] = useState<Exeat[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddDormModal, setShowAddDormModal] = useState(false);
  const [editingDorm, setEditingDorm] = useState<Dormitory | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [pocketMoneyTransactions, setPocketMoneyTransactions] = useState<PocketMoneyTransaction[]>([]);
  const [mealPlans, setMealPlans] = useState<MealPlan[]>([]);
  const [showPocketMoneyModal, setShowPocketMoneyModal] = useState(false);
  const [selectedStudentForPocketMoney, setSelectedStudentForPocketMoney] = useState<Student | null>(null);
  const [transactionType, setTransactionType] = useState<'Deposit' | 'Withdrawal'>('Deposit');

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const fetchData = async () => {
      let schoolId = user.uid;
      const staffDocRef = doc(db, 'staff', user.uid);
      const staffDocSnap = await getDoc(staffDocRef);
      if (staffDocSnap.exists()) {
        const data = staffDocSnap.data() as any;
        if (data?.schoolId) {
          schoolId = data.schoolId;
        }
      }

      const qDorms = query(collection(db, 'dormitories'), where('schoolId', '==', schoolId));
      const qExeats = query(collection(db, 'exeats'), where('schoolId', '==', schoolId));
      const qStudents = query(collection(db, 'students'), where('schoolId', '==', schoolId));
      const qPocketMoney = query(collection(db, 'pocket_money_transactions'), where('schoolId', '==', schoolId));
      const qMealPlans = query(collection(db, 'meal_plans'), where('schoolId', '==', schoolId));

      const unsubDorms = onSnapshot(qDorms, (snapshot) => {
        setDorms(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Dormitory)));
      });

      const unsubExeats = onSnapshot(qExeats, (snapshot) => {
        setExeats(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Exeat)));
      });

      const unsubStudents = onSnapshot(qStudents, (snapshot) => {
        setStudents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student)));
      });

      const unsubPocketMoney = onSnapshot(qPocketMoney, (snapshot) => {
        setPocketMoneyTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PocketMoneyTransaction)));
      });

      const unsubMealPlans = onSnapshot(qMealPlans, (snapshot) => {
        setMealPlans(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MealPlan)));
        setIsLoading(false);
      });

      return () => {
        unsubDorms();
        unsubExeats();
        unsubStudents();
        unsubPocketMoney();
        unsubMealPlans();
      };
    };

    let unsubscribe: () => void;
    fetchData().then(unsub => {
      unsubscribe = unsub;
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const handlePocketMoneyTransaction = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedStudentForPocketMoney) return;

    const formData = new FormData(e.currentTarget);
    const amount = Number(formData.get('amount'));
    const reason = formData.get('reason') as string;
    const currentBalance = selectedStudentForPocketMoney.pocketMoneyBalance || 0;
    
    if (transactionType === 'Withdrawal' && amount > currentBalance) {
      toast.error('Insufficient balance');
      return;
    }

    const newBalance = transactionType === 'Deposit' ? currentBalance + amount : currentBalance - amount;

    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Not authenticated");

      let schoolId = user.uid;
      const staffDocRef = doc(db, 'staff', user.uid);
      const staffDocSnap = await getDoc(staffDocRef);
      if (staffDocSnap.exists()) {
        const data = staffDocSnap.data() as any;
        if (data?.schoolId) {
          schoolId = data.schoolId;
        }
      }

      // 1. Add transaction record
      await addDoc(collection(db, 'pocket_money_transactions'), {
        schoolId,
        studentId: selectedStudentForPocketMoney.id,
        amount,
        type: transactionType,
        reason,
        date: new Date().toISOString(),
        balanceAfter: newBalance,
        createdAt: serverTimestamp()
      });

      // 2. Update student balance
      await updateDoc(doc(db, 'students', selectedStudentForPocketMoney.id), {
        pocketMoneyBalance: newBalance
      });

      toast.success(`Pocket money ${transactionType.toLowerCase()}ed successfully`);
      setShowPocketMoneyModal(false);
      setSelectedStudentForPocketMoney(null);
    } catch (error) {
      console.error("Error processing pocket money:", error);
      toast.error("Failed to process transaction");
    }
  };

  const DEFAULT_MEAL_PLAN = {
    Monday: { breakfast: '', lunch: '', supper: '' },
    Tuesday: { breakfast: '', lunch: '', supper: '' },
    Wednesday: { breakfast: '', lunch: '', supper: '' },
    Thursday: { breakfast: '', lunch: '', supper: '' },
    Friday: { breakfast: '', lunch: '', supper: '' },
    Saturday: { breakfast: '', lunch: '', supper: '' },
    Sunday: { breakfast: '', lunch: '', supper: '' },
  };

  const displayMealPlan = useMemo(() => {
    const plan: any = { ...DEFAULT_MEAL_PLAN };
    mealPlans.forEach(mp => {
      if (plan[mp.day]) {
        plan[mp.day] = {
          breakfast: mp.breakfast,
          lunch: mp.lunch,
          supper: mp.supper
        };
      }
    });
    return plan;
  }, [mealPlans]);

  const handleSaveDorm = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const dormData = {
      name: formData.get('name') as string,
      gender: formData.get('gender') as 'M' | 'F',
      capacity: Number(formData.get('capacity')),
      matronPatron: formData.get('matronPatron') as string,
      currentOccupancy: editingDorm?.currentOccupancy || 0,
      studentIds: editingDorm?.studentIds || [],
    };

    try {
      const user = auth.currentUser;
      if (!user) {
        if (editingDorm) {
          setDorms(dorms.map(d => d.id === editingDorm.id ? { ...d, ...dormData } as Dormitory : d));
          toast.success('Demo: Dormitory updated');
        } else {
          setDorms([...dorms, { id: Date.now().toString(), ...dormData, schoolId: 'demo' } as Dormitory]);
          toast.success('Demo: New dormitory added');
        }
        setShowAddDormModal(false);
        setEditingDorm(null);
        return;
      }

      let schoolId = user.uid;
      const staffDocRef = doc(db, 'staff', user.uid);
      const staffDocSnap = await getDoc(staffDocRef);
      if (staffDocSnap.exists()) {
        const data = staffDocSnap.data() as any;
        if (data?.schoolId) {
          schoolId = data.schoolId;
        }
      }

      if (editingDorm) {
        await updateDoc(doc(db, 'dormitories', editingDorm.id), dormData);
        toast.success('Dormitory updated');
      } else {
        await addDoc(collection(db, 'dormitories'), { ...dormData, schoolId });
        toast.success('New dormitory added');
      }
      setShowAddDormModal(false);
      setEditingDorm(null);
    } catch (error) {
      console.error("Error saving dorm:", error);
      toast.error("Failed to save dormitory");
    }
  };

  const handleUpdateExeatStatus = async (exeatId: string, status: 'Approved' | 'Declined') => {
    try {
      await updateDoc(doc(db, 'exeats', exeatId), { status });
      toast.success(`Exeat ${status.toLowerCase()}`);
    } catch (error) {
      console.error("Error updating exeat:", error);
      toast.error("Failed to update exeat status");
    }
  };

  const filteredResidents = useMemo(() => {
    return students.filter(s => s.boardingType !== 'Day Scholar').filter(s => 
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      s.admissionNumber.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [students, searchQuery]);

  return (
    <div className="space-y-10 animate-in fade-in duration-700 font-sans">
      {/* Standardized Header (Finance Style) */}
      <div className="w-[100vw] relative left-1/2 -ml-[50vw] -mt-4 md:-mt-8 bg-[#334155] py-5 border-b border-[#1f507a] shadow-sm">
        <div className="w-full max-w-7xl mx-auto px-4 md:px-8">
          <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/10 rounded-xl">
                <Home size={24} className="text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight">Boarding Excellence</h2>
                <p className="text-xs text-blue-100 mt-1">Manage student houses, learner welfare, and boarding logistics.</p>
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              <div className="px-5 py-2.5 bg-black/20 border border-white/10 rounded-xl min-w-[120px]">
                <p className="text-[10px] font-bold text-blue-200 uppercase mb-0.5">Total Boarders</p>
                <p className="text-lg font-bold text-white leading-none">{students.filter(s => s.boardingType !== 'Day Scholar').length}</p>
              </div>
              <button 
                onClick={() => {
                  setEditingDorm(null);
                  setShowAddDormModal(true);
                }}
                className="flex items-center justify-center gap-2 px-6 py-2.5 bg-white text-[#334155] rounded-xl text-[12.5px] font-bold hover:bg-slate-50 transition-all shadow-sm active:scale-95 group border border-white/20"
              >
                <Plus size={16} className="group-hover:scale-110 transition-transform font-bold" /> 
                Add Dormitory
              </button>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-white/10 flex flex-col xl:flex-row xl:items-center justify-between gap-6">
            <div className="flex p-1.5 bg-black/10 border border-white/10 rounded-[2rem] overflow-x-auto hide-scrollbar">
              {[
                { id: 'dorms', label: 'Houses', icon: <Home size={14} strokeWidth={2.5} /> },
                { id: 'exeats', label: 'Leave Requests', icon: <Calendar size={14} strokeWidth={2.5} /> },
                { id: 'pocket-money', label: 'Pocket Money', icon: <Wallet size={14} strokeWidth={2.5} /> },
                { id: 'meals', label: 'Meal Plan', icon: <Utensils size={14} strokeWidth={2.5} /> },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveSubTab(tab.id as any)}
                  className={`flex items-center gap-2 px-8 py-2.5 rounded-[1.5rem] text-[11px] font-bold whitespace-nowrap transition-all duration-300 ${
                    activeSubTab === tab.id 
                      ? 'bg-white text-[#334155] shadow-lg scale-105' 
                      : 'text-white/60 hover:text-white hover:bg-white/5'
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

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-10 h-10 animate-spin text-orange-600" />
        </div>
      ) : (
        <>

          {activeSubTab === 'dorms' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {dorms.length === 0 ? (
                  <div className="col-span-full bg-white dark:bg-slate-900 p-12 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-xl text-center">
                    <Home size={48} className="mx-auto text-slate-300 mb-4" />
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">No Dormitories Registered</h3>
                    <p className="text-slate-500 dark:text-slate-600 text-sm mt-2">Start by adding your school's residential houses.</p>
                  </div>
                ) : (
                  dorms.map((dorm) => (
                    <div key={dorm.id} className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/40 dark:shadow-slate-950/20 transition-all hover:-translate-y-1 group">
                      <div className="flex justify-between items-start mb-6">
                          <div className={`p-3 rounded-[0.35rem] ${dorm.gender === 'M' ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-rose-50 dark:bg-rose-900/20'}`}>
                              <Home size={24} className="text-slate-900 dark:text-slate-100" />
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold ${dorm.gender === 'M' ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300' : 'bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300'}`}>
                                {dorm.gender === 'M' ? 'Boys' : 'Girls'}
                            </span>
                            <button 
                              onClick={() => {
                                setEditingDorm(dorm);
                                setShowAddDormModal(true);
                              }}
                              className="p-1.5 text-slate-600 hover:text-orange-600 opacity-0 group-hover:opacity-100 transition-all"
                            >
                              <Search size={14} />
                            </button>
                          </div>
                      </div>
                       <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-1">{dorm.name}</h3>
                      <p className="text-[10px] font-bold text-slate-600 mb-4">Patron: {dorm.matronPatron}</p>
                      <div className="flex justify-between items-end mt-4">
                          <div>
                              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{dorm.currentOccupancy}</p>
                              <p className="text-[10px] font-bold text-slate-600 uppercase">Residents</p>
                          </div>
                          <div className="text-right">
                              <p className="text-sm font-bold text-slate-600">of {dorm.capacity}</p>
                              <p className="text-[10px] font-bold text-slate-600 uppercase">Max Cap</p>
                          </div>
                      </div>
                      <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full mt-4 overflow-hidden border border-slate-50 dark:border-slate-800">
                          <div 
                              className={`h-full rounded-full transition-all duration-1000 ${
                                  (dorm.currentOccupancy / dorm.capacity) > 0.9 ? 'bg-rose-500' : 'bg-orange-500'
                              }`}
                              style={{ width: `${(dorm.currentOccupancy / dorm.capacity) * 100}%` }}
                          />
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="pt-4">
                <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <h3 className="font-bold text-slate-800 dark:text-slate-100 text-xl tracking-tight">Resident Directory</h3>
                    <div className="flex gap-3">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
                            <input 
                                type="text" 
                                placeholder="Search resident..." 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-orange-500/20 transition-all"
                            />
                        </div>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                         <thead>
                            <tr className="bg-slate-50/50 dark:bg-slate-800/30 text-left">
                                <th className="px-8 py-5 text-[10px] font-bold text-slate-600 uppercase">Learner</th>
                                <th className="px-8 py-5 text-[10px] font-bold text-slate-600 uppercase">House</th>
                                <th className="px-8 py-5 text-[10px] font-bold text-slate-600 uppercase">Adm No</th>
                                <th className="px-8 py-5 text-[10px] font-bold text-slate-600 uppercase">Status</th>
                                <th className="px-8 py-5 text-[10px] font-bold text-slate-600 uppercase text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                            {filteredResidents.length === 0 ? (
                              <tr>
                                <td colSpan={5} className="px-8 py-12 text-center text-slate-600 text-sm font-medium">
                                  No boarders found matching your search.
                                </td>
                              </tr>
                            ) : (
                              filteredResidents.map((student) => {
                                const dorm = dorms.find(d => d.id === student.dormitoryId);
                                const activeExeat = exeats.find(e => e.studentId === student.id && e.status === 'Approved');
                                return (
                                  <tr key={student.id} className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                      <td className="px-8 py-5">
                                          <div className="flex items-center gap-3">
                                              <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden border border-slate-200 dark:border-slate-700">
                                                  <img src={`https://picsum.photos/seed/${student.name}/32/32`} alt="Resident" referrerPolicy="no-referrer" />
                                              </div>
                                              <span className="font-bold text-sm text-slate-700 dark:text-slate-200">{student.name}</span>
                                          </div>
                                      </td>
                                      <td className="px-8 py-5 text-xs font-bold text-slate-500 dark:text-slate-600">{dorm?.name || 'Unassigned'}</td>
                                      <td className="px-8 py-5 text-xs font-mono text-slate-600">{student.admissionNumber}</td>
                                      <td className="px-8 py-5">
                                          <div className="flex items-center gap-1.5">
                                              <span className={`w-2 h-2 rounded-full ${!activeExeat ? 'bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.5)]' : 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]'}`}></span>
                                              <span className="text-[10px] font-bold text-slate-600 dark:text-slate-600">{!activeExeat ? 'In Dorm' : 'On Exeat'}</span>
                                          </div>
                                      </td>
                                      <td className="px-8 py-5 text-right">
                                          <button 
                                            onClick={() => toast.success(`Viewing profile for ${student.name}`)}
                                            className="p-2 text-slate-600 hover:text-orange-600 dark:hover:text-orange-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                          >
                                              <ShieldCheck size={18} />
                                          </button>
                                      </td>
                                  </tr>
                                );
                              })
                            )}
                        </tbody>
                    </table>
                </div>
              </div>
            </div>
          )}

          {activeSubTab === 'exeats' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="lg:col-span-2 pt-4">
                <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <h3 className="font-bold text-slate-800 dark:text-slate-100 text-xl tracking-tight">Pending Leave Requests</h3>
                  <span className="px-3 py-1 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-full text-[10px] font-bold">
                    {exeats.filter(e => e.status === 'Pending').length} Pending
                  </span>
                </div>
                <div className="divide-y divide-slate-50 dark:divide-slate-800">
                  {exeats.filter(e => e.status === 'Pending').length === 0 ? (
                    <div className="p-12 text-center text-slate-600">
                      <Calendar size={48} className="mx-auto mb-4 opacity-20" />
                      <p className="text-sm font-medium">No pending exeat requests.</p>
                    </div>
                  ) : (
                    exeats.filter(e => e.status === 'Pending').map((exeat) => {
                      const student = students.find(s => s.id === exeat.studentId);
                      return (
                        <div key={exeat.id} className="p-6 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-[0.2625rem] flex items-center justify-center text-slate-600">
                              <Calendar size={20} />
                            </div>
                             <div>
                              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">{student?.name || 'Unknown Student'}</h4>
                              <p className="text-[10px] font-bold text-slate-600">{exeat.reason} • {exeat.leaveDate}</p>
                              <p className="text-xs text-slate-500 dark:text-slate-600 mt-1 italic">Return: {exeat.returnDate}</p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button 
                              onClick={() => handleUpdateExeatStatus(exeat.id, 'Approved')}
                              className="p-2 bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 rounded-[0.2625rem] hover:bg-orange-100 transition-all"
                            >
                              <CheckCircle2 size={18} />
                            </button>
                            <button 
                              onClick={() => handleUpdateExeatStatus(exeat.id, 'Declined')}
                              className="p-2 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-[0.2625rem] hover:bg-rose-100 transition-all"
                            >
                              <XCircle size={18} />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
              <div className="bg-orange-600 text-white p-8 rounded-[0.875rem] shadow-xl relative overflow-hidden">
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
                <h3 className="text-xl font-bold mb-6">Term Dates</h3>
                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="p-2 bg-white/10 rounded-xl">
                      <Clock size={20} />
                    </div>
                     <div>
                      <p className="text-[10px] font-bold opacity-70">Opening Date</p>
                      <p className="text-lg font-bold">05/01/2026</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="p-2 bg-white/10 rounded-xl">
                      <AlertCircle size={20} />
                    </div>
                     <div>
                      <p className="text-[10px] font-bold opacity-70">Half-Term Break</p>
                      <p className="text-lg font-bold">15/02/2026 — 22/02/2026</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="p-2 bg-white/10 rounded-xl">
                      <Moon size={20} />
                    </div>
                     <div>
                      <p className="text-[10px] font-bold opacity-70">Closing Date</p>
                      <p className="text-lg font-bold">08/04/2026</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSubTab === 'pocket-money' && (
            <div className="pt-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <h3 className="font-bold text-slate-800 dark:text-slate-100 text-xl tracking-tight">Pocket Money Tracker</h3>
                <p className="text-xs text-slate-500 dark:text-slate-600">Click on a student to manage their funds.</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50/50 dark:bg-slate-800/30 text-left">
                      <th className="px-8 py-5 text-[10px] font-bold text-slate-600 uppercase">Learner</th>
                      <th className="px-8 py-5 text-[10px] font-bold text-slate-600 uppercase">Adm No</th>
                      <th className="px-8 py-5 text-[10px] font-bold text-slate-600 uppercase text-right">Current Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                    {students.filter(s => s.boardingType !== 'Day Scholar').length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-8 py-12 text-center text-slate-600 text-sm font-medium">
                          No boarders registered to track pocket money.
                        </td>
                      </tr>
                    ) : (
                      students.filter(s => s.boardingType !== 'Day Scholar').map((student) => (
                        <tr 
                          key={student.id} 
                          onClick={() => {
                            setSelectedStudentForPocketMoney(student);
                            setShowPocketMoneyModal(true);
                          }}
                          className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors cursor-pointer"
                        >
                          <td className="px-8 py-5 font-bold text-sm text-slate-700 dark:text-slate-200">{student.name}</td>
                          <td className="px-8 py-5 text-xs font-mono text-slate-600">{student.admissionNumber}</td>
                          <td className="px-8 py-5 text-right">
                            <span className={`text-sm font-bold ${(student.pocketMoneyBalance || 0) < 500 ? 'text-rose-500' : 'text-orange-500'}`}>
                              KES {(student.pocketMoneyBalance || 0).toLocaleString()}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeSubTab === 'meals' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {Object.entries(displayMealPlan).map(([day, meals]: [string, any]) => (
                <div key={day} className="bg-white dark:bg-slate-900 p-6 rounded-[0.875rem] border border-slate-100 dark:border-slate-800 shadow-xl transition-all hover:shadow-orange-500/10">
                  <h3 className="text-lg font-bold text-orange-600 dark:text-orange-400 mb-6 border-b border-slate-50 dark:border-slate-800 pb-2">{day}</h3>
                  <div className="space-y-6">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-amber-50 dark:bg-amber-900/20 rounded-xl">
                        <Coffee size={18} className="text-slate-900 dark:text-slate-100" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-600">Breakfast</p>
                        <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{meals.breakfast}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-orange-50 dark:bg-orange-900/20 rounded-xl">
                        <Utensils size={18} className="text-slate-900 dark:text-slate-100" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-600">Lunch</p>
                        <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{meals.lunch}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-orange-50 dark:bg-orange-900/20 rounded-xl">
                        <Moon size={18} className="text-slate-900 dark:text-slate-100" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-600">Supper</p>
                        <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{meals.supper}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Add/Edit Dorm Modal */}
      {showAddDormModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-100 dark:bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[0.625rem] shadow-2xl overflow-hidden relative animate-in slide-in-from-bottom-8 duration-500">
            <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">{editingDorm ? 'Edit Dormitory' : 'Add New Dormitory'}</h3>
              <button onClick={() => setShowAddDormModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-[0.2625rem] transition-colors">
                <X size={20} />
              </button>
            </div>
             <form onSubmit={handleSaveDorm} className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-600 uppercase ml-1">House Name</label>
                <input 
                  name="name"
                  defaultValue={editingDorm?.name}
                  required
                  placeholder="e.g., Simba House"
                  className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-[0.25rem] text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                />
              </div>
               <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-600 uppercase ml-1">Gender</label>
                  <select 
                    name="gender"
                    defaultValue={editingDorm?.gender || 'M'}
                    className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-[0.25rem] text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                  >
                    <option value="M">Boys</option>
                    <option value="F">Girls</option>
                  </select>
                 </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-600 uppercase ml-1">Capacity</label>
                  <input 
                    name="capacity"
                    type="number"
                    defaultValue={editingDorm?.capacity || 100}
                    required
                    className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-[0.25rem] text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                  />
                </div>
               </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-600 uppercase ml-1">Matron / Patron Name</label>
                <input 
                  name="matronPatron"
                  defaultValue={editingDorm?.matronPatron}
                  required
                  placeholder="e.g., Mr. Kamau"
                  className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-[0.25rem] text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button 
                  type="submit"
                  className="flex-1 py-3.5 bg-orange-600 text-white rounded-[0.35rem] font-bold text-sm shadow-lg shadow-orange-200"
                >
                  {editingDorm ? 'Update Dormitory' : 'Add Dormitory'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Pocket Money Modal */}
      {showPocketMoneyModal && selectedStudentForPocketMoney && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-100 dark:bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[0.625rem] shadow-2xl overflow-hidden relative animate-in slide-in-from-bottom-8 duration-500">
            <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Manage Pocket Money</h3>
                <p className="text-xs text-slate-500">{selectedStudentForPocketMoney.name}</p>
              </div>
              <button onClick={() => setShowPocketMoneyModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-[0.2625rem] transition-colors">
                <X size={20} />
              </button>
            </div>
             <form onSubmit={handlePocketMoneyTransaction} className="p-8 space-y-6">
              <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-[0.2625rem]">
                <button 
                  type="button"
                  onClick={() => setTransactionType('Deposit')}
                  className={`flex-1 py-2 rounded-[0.175rem] text-xs font-bold transition-all ${transactionType === 'Deposit' ? 'bg-orange-600 text-white shadow-md' : 'text-slate-500'}`}
                >
                  Deposit
                </button>
                <button 
                  type="button"
                  onClick={() => setTransactionType('Withdrawal')}
                  className={`flex-1 py-2 rounded-[0.175rem] text-xs font-bold transition-all ${transactionType === 'Withdrawal' ? 'bg-rose-600 text-white shadow-md' : 'text-slate-500'}`}
                >
                  Withdraw
                </button>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-600 uppercase ml-1">Amount (KES)</label>
                <input 
                  name="amount"
                  type="number"
                  required
                  placeholder="0.00"
                  className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-[0.25rem] text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-600 uppercase ml-1">Reason / Description</label>
                <input 
                  name="reason"
                  required
                  placeholder="e.g., Weekly allowance"
                  className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-[0.25rem] text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                />
              </div>

               <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-[0.35rem] border border-slate-100 dark:border-slate-700">
                <p className="text-[10px] font-bold text-slate-600 uppercase mb-1">Current Balance</p>
                <p className="text-lg font-bold text-slate-800 dark:text-slate-100">KES {(selectedStudentForPocketMoney.pocketMoneyBalance || 0).toLocaleString()}</p>
              </div>

              <button 
                type="submit"
                className={`w-full py-3.5 rounded-[0.35rem] font-bold text-sm shadow-lg transition-all ${transactionType === 'Deposit' ? 'bg-orange-600 text-white shadow-orange-200' : 'bg-rose-600 text-white shadow-rose-200'}`}
              >
                Confirm {transactionType}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BoardingModule;

