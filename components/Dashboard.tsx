import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie
} from 'recharts';
import { NAVIGATION_ITEMS } from '../constants';
import { UserRole } from '../types';
import { 
  Users, Wallet, BookOpen, Search, 
  ArrowUpRight, CheckCircle2, Calendar, 
  Zap, Home, ChevronRight, LayoutGrid, FileText, Activity, GraduationCap, UserCheck, MessageSquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db, auth } from '../src/firebase';
import { collection, query, where, onSnapshot, doc, getDoc, orderBy, limit, updateDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { Bell, X } from 'lucide-react';
import CommunicationModule from './CommunicationModule';

interface DashboardProps {
  role: UserRole;
  academicPeriod: string;
  setActiveTab?: (tab: string) => void;
  enabledModules?: string[];
}

const Dashboard: React.FC<DashboardProps> = ({ role, academicPeriod, setActiveTab: setMainAppTab, enabledModules = [] }) => {
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalStaff: 0,
    feeCollection: 0,
    attendanceRate: 0,
  });
  const [recentEnrollments, setRecentEnrollments] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [pendingInvites, setPendingInvites] = useState<any[]>([]);
  const [staffFilter, setStaffFilter] = useState<'TEACHER' | 'NON_TEACHER'>('TEACHER');
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Overview');
  const [userName, setUserName] = useState('');
  
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [learnerView, setLearnerView] = useState<'New' | 'All'>('New');
  const [learnerSearch, setLearnerSearch] = useState('');
  const [learnerGrade, setLearnerGrade] = useState('All');
  
  const [globalSearch, setGlobalSearch] = useState('');

  const globalSearchResults = useMemo(() => {
    if (!globalSearch.trim()) return null;
    const query = globalSearch.toLowerCase();
    return {
      students: allStudents.filter(s => s.name.toLowerCase().includes(query) || s.adm.toLowerCase().includes(query)).slice(0, 4),
      staff: staff.filter(s => s.name?.toLowerCase().includes(query)).slice(0, 4)
    };
  }, [globalSearch, allStudents, staff]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setIsLoading(true);
        try {
          let schoolId = user.uid;
          const staffDocRef = doc(db, 'staff', user.uid);
          const staffDocSnap = await getDoc(staffDocRef);
          
          if (staffDocSnap.exists() && staffDocSnap.data().schoolId) { 
            schoolId = staffDocSnap.data().schoolId; 
            setUserName(staffDocSnap.data().name || '');
          } else {
            const userDocRef = doc(db, 'users', user.uid);
            const userDocSnap = await getDoc(userDocRef);
            if (userDocSnap.exists()) {
              setUserName(userDocSnap.data().fullName || '');
              if (userDocSnap.data().role === 'PLATFORM_ADMIN') {
                setIsLoading(false);
                return;
              }
              if (userDocSnap.data().schoolId) {
                schoolId = userDocSnap.data().schoolId;
              }
            }
          }

          const unsubStudents = onSnapshot(query(collection(db, 'students'), where('schoolId', '==', schoolId)), (snapshot) => {
              setStats(prev => ({ ...prev, totalStudents: snapshot.size }));
              const docs = snapshot.docs.map(doc => ({ 
                id: doc.id, 
                name: doc.data().name, 
                adm: doc.data().admissionNumber, 
                grade: doc.data().grade, 
                balance: doc.data().balance || 0, 
                createdAt: doc.data().createdAt 
              }));
              setAllStudents(docs);
              const recent = [...docs]
                .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')).slice(0, 5);
              setRecentEnrollments(recent);
            }
          );
          
          const unsubStaff = onSnapshot(query(collection(db, 'staff'), where('schoolId', '==', schoolId)), (snapshot) => {
              const staffData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), isRegistered: true }));
              setStaff(staffData);
            }
          );
          
          const unsubInvites = onSnapshot(query(collection(db, 'access_codes'), where('schoolId', '==', schoolId), where('active', '==', true)), (snapshot) => {
              const inviteData = snapshot.docs.map(doc => ({ 
                id: doc.id, 
                name: doc.data().staffName, 
                role: doc.data().role, 
                phone: doc.data().phone || '', 
                isRegistered: false,
                code: doc.data().code
              }));
              setPendingInvites(inviteData);
            }
          );

          const unsubPayments = onSnapshot(query(collection(db, 'payments'), where('schoolId', '==', schoolId)), (snapshot) => {
              const totalCollected = snapshot.docs.reduce((sum, doc) => sum + (doc.data().amount || 0), 0);
              setStats(prev => ({ ...prev, feeCollection: totalCollected }));
            }
          );
          
          const unsubNotifs = onSnapshot(
            query(collection(db, 'notifications'), where('schoolId', '==', schoolId), orderBy('timestamp', 'desc'), limit(10)),
            (snapshot) => {
              setNotifications(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            },
            (error) => {
              console.warn("[Dashboard] Notifications snapshot failed (possibly missing index):", error);
            }
          );

          // We'll need a way to unsubscribe these when the effect re-runs or unmounts.
          // Since it's inside onAuthStateChanged, we can't easily return them.
          // For now, let's keep it simple and ensure we only subscribe once.
          setIsLoading(false);
        } catch (error) { setIsLoading(false); }
      } else {
        setStats({ totalStudents: 0, totalStaff: 0, feeCollection: 0, attendanceRate: 0 });
        setRecentEnrollments([]);
        setStaff([]);
        setIsLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);
  
  // Combine staff and invites for the directory
  const allStaffMembers = useMemo(() => {
    // Filter out invites that have a corresponding registered staff member by name/phone if necessary,
    // but usually, a new staff member gets a unique UID. 
    // For now, simple merge is fine as codes are revoked/inactive upon use (though not always updated in current code)
    return [...staff, ...pendingInvites];
  }, [staff, pendingInvites]);

  useEffect(() => {
    setStats(prev => ({ 
      ...prev, 
      totalStaff: allStaffMembers.length 
    }));
  }, [allStaffMembers]);

  const FEE_PROGRESS_DATA = useMemo(() => [
    { name: 'Term 1', target: stats.totalStudents * 15000, collected: stats.feeCollection },
    { name: 'Term 2', target: 0, collected: 0 },
    { name: 'Term 3', target: 0, collected: 0 },
  ], [stats.feeCollection, stats.totalStudents]);

  const ASSESSMENT_DATA = [
    { name: 'Complete', value: 0, fill: '#334155' }, 
    { name: 'Pending', value: 100, fill: '#e2e8f0' }
  ];

  const tabs = [
    { name: 'Overview', icon: LayoutGrid, id: 'dashboard' },
    { name: 'Students', icon: Users, id: 'students' },
    { name: 'Staff', icon: BookOpen, id: 'staff-management' },
    { name: 'Fees', icon: Wallet, id: 'finance' },
    { name: 'Academics', icon: GraduationCap, id: 'academics' },
    { name: 'Communication', icon: MessageSquare, id: 'communication' },
  ].filter(tab => tab.id === 'dashboard' || enabledModules.includes(tab.id));

  return (
    <div className="flex justify-center min-h-[calc(100vh-8rem)] animate-in fade-in duration-700 font-sans text-slate-800 bg-slate-100 dark:bg-[#0f1219] p-4 lg:p-8">
      <div className="w-full max-w-[1400px] bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-xl overflow-hidden flex flex-col border border-slate-200 dark:border-slate-800">
        
        {/* Header Area */}
        <div className="p-6 md:px-8 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <h1 className="text-2xl font-bold dark:text-white">Dashboard</h1>
            <div className="flex items-center gap-4">
              <div className="relative w-full md:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text" 
                  value={globalSearch}
                  onChange={e => setGlobalSearch(e.target.value)}
                  placeholder="Search learners, staff..." 
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full py-2.5 pl-10 pr-4 text-sm focus:ring-2 focus:ring-orange-500 shadow-sm outline-none dark:text-white"
                />
                
                {/* Global Search Results Overlay */}
                <AnimatePresence>
                  {globalSearchResults && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute top-full mt-2 w-full lg:w-[400px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-3xl shadow-2xl z-50 overflow-hidden"
                    >
                      {globalSearchResults.students.length > 0 && (
                        <div className="p-2 border-b border-slate-100 dark:border-slate-800">
                          <p className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Learners</p>
                          {globalSearchResults.students.map(s => (
                            <div key={s.id} className="px-3 py-2 flex justify-between items-center hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl cursor-pointer" onClick={() => { setActiveTab('Students'); setGlobalSearch(''); }}>
                              <div>
                                <p className="text-sm font-bold text-slate-800 dark:text-white">{s.name}</p>
                                <p className="text-xs text-slate-500">{s.grade} • {s.adm}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      {globalSearchResults.staff.length > 0 && (
                        <div className="p-2">
                          <p className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Staff Members</p>
                          {globalSearchResults.staff.map(s => (
                            <div key={s.id} className="px-3 py-2 flex justify-between items-center hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl cursor-pointer" onClick={() => { setActiveTab('Staff'); setGlobalSearch(''); }}>
                              <div>
                                <p className="text-sm font-bold text-slate-800 dark:text-white">{s.name}</p>
                                <p className="text-xs text-slate-500">{s.role === 'TEACHER' ? 'Teacher' : 'Support Staff'} • {s.phone || 'N/A'}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      {globalSearchResults.students.length === 0 && globalSearchResults.staff.length === 0 && (
                        <div className="p-6 text-center text-sm font-medium text-slate-500">No results found for "{globalSearch}"</div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              {/* Notification Bell */}
              <div className="relative">
                <button 
                  onClick={() => setShowNotifications(!showNotifications)}
                  className={`p-2.5 rounded-full transition-all border ${
                    showNotifications 
                    ? 'bg-orange-50 border-orange-200 text-orange-600' 
                    : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <Bell size={20} />
                  {notifications.filter(n => n.status === 'Unread').length > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-orange-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900">
                      {notifications.filter(n => n.status === 'Unread').length}
                    </span>
                  )}
                </button>

                {/* Notifications Dropdown */}
                <AnimatePresence>
                  {showNotifications && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 mt-3 w-80 bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 z-50 overflow-hidden"
                    >
                      <div className="p-5 border-b border-slate-50 dark:border-slate-800 flex items-center justify-between">
                        <h3 className="font-bold text-sm dark:text-white">Notifications</h3>
                        <button onClick={() => setShowNotifications(false)} className="text-slate-400 hover:text-slate-600">
                           <X size={16} />
                        </button>
                      </div>
                      <div className="max-h-[400px] overflow-y-auto">
                        {notifications.length === 0 ? (
                          <div className="p-8 text-center">
                            <Bell size={32} className="mx-auto text-slate-200 mb-2" />
                            <p className="text-xs text-slate-400">No recent notifications</p>
                          </div>
                        ) : (
                          notifications.map((notif) => (
                            <div 
                              key={notif.id} 
                              className={`p-4 border-b border-slate-50 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer ${notif.status === 'Unread' ? 'bg-orange-50/30' : ''}`}
                              onClick={async () => {
                                if (notif.status === 'Unread') {
                                  await updateDoc(doc(db, 'notifications', notif.id), { status: 'Read' });
                                }
                              }}
                            >
                              <div className="flex gap-3">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                                  notif.type === 'Transit' ? 'bg-orange-100 text-orange-600' : 'bg-slate-100 text-slate-600'
                                }`}>
                                   <Activity size={14} />
                                </div>
                                <div>
                                  <p className="text-xs font-bold dark:text-white">{notif.title}</p>
                                  <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5">{notif.message}</p>
                                  <p className="text-[9px] text-slate-400 mt-1">
                                    {notif.timestamp?.toDate ? notif.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                      {notifications.length > 0 && (
                        <div className="p-3 bg-slate-50 dark:bg-slate-800/50 text-center">
                           <button className="text-[10px] font-bold text-orange-600 tracking-tight">View all activity</button>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

            </div>
          </div>

          {/* Pill Navigation */}
          <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
            {tabs.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.name || (activeTab === 'All' && tab.name === 'Overview');
              return (
                <button
                  key={tab.name}
                  onClick={() => setActiveTab(tab.name)}
                  data-id={tab.id}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold whitespace-nowrap transition-all ${
                    isActive 
                      ? 'bg-orange-600 text-white shadow-md' 
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <Icon size={16} />
                  {tab.name}
                </button>
              )
            })}
          </div>
        </div>

        {/* Content Area */}
        <div className="p-6 md:p-8 bg-slate-50/50 dark:bg-slate-900/50 overflow-y-auto flex flex-col gap-6 h-full">
          
          {(activeTab === 'Overview' || activeTab === 'All') && (
            <>
              {/* Main Grid Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Top Left: Hero Card */}
                <div className="lg:col-span-6 bg-[#334155] rounded-[2rem] p-8 shadow-sm border border-[#1f507a] relative overflow-hidden">
                  <div className="relative z-10">
                    <h2 className="text-2xl font-bold mb-6 text-white">
                      Welcome back, {userName ? userName.split(' ')[0] : (role === 'PLATFORM_ADMIN' ? 'Platform Admin' : 'Admin')}!
                    </h2>
                    
                    {role === 'PLATFORM_ADMIN' ? (
                      <div className="mb-6">
                        <p className="text-white/80 mb-6 max-w-md">
                          You are logged in with full system-wide access. Manage schools, users, and platform settings.
                        </p>
                        <div className="flex flex-wrap gap-3">
                          <button onClick={() => setMainAppTab?.('platform-admin')} className="bg-orange-600 text-white border border-orange-700 px-6 py-2.5 rounded-full text-sm font-bold shadow-lg cursor-pointer hover:bg-orange-700 transition-all transform hover:scale-105">
                            Open Management Portal
                          </button>
                          <button onClick={() => setMainAppTab?.('analytics')} className="bg-white/10 backdrop-blur-md text-white border border-white/20 px-6 py-2.5 rounded-full text-sm font-bold shadow-lg cursor-pointer hover:bg-white/20 transition-all">
                            View System Analytics
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="relative mb-6 group cursor-text" onClick={() => {
                          const mainInput = document.getElementById('globalSearchInput');
                          if (mainInput) mainInput.focus();
                        }}>
                          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                          <input 
                            type="text" 
                            id="heroSearchInput"
                            value={globalSearch}
                            onChange={(e) => setGlobalSearch(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                if (globalSearchResults?.students.length) setMainAppTab?.('students');
                                else if (globalSearchResults?.staff.length) setMainAppTab?.('staff-management');
                              }
                            }}
                            placeholder="Find a learner, employee, or record..." 
                            className="w-full bg-white/90 dark:bg-slate-800/90 backdrop-blur-md border border-slate-200 dark:border-slate-700 rounded-full py-4 pl-12 pr-4 text-sm focus:ring-2 focus:ring-orange-500 shadow-sm outline-none dark:text-white transition-all focus:bg-white"
                          />
                          <button 
                            onClick={() => {
                              if (globalSearchResults?.students.length) setMainAppTab?.('students');
                              else if (globalSearchResults?.staff.length) setMainAppTab?.('staff-management');
                            }} 
                            className="absolute right-2 top-1/2 -translate-y-1/2 bg-orange-600 hover:bg-orange-700 text-white p-2 rounded-full shadow-md transition-colors"
                          >
                            <ArrowUpRight size={18} />
                          </button>
                        </div>

                        <div className="flex flex-wrap gap-3">
                          <button onClick={() => setMainAppTab?.('staff-management')} className="bg-orange-600 text-white border border-orange-700 px-5 py-2.5 rounded-full text-xs font-black shadow-lg shadow-orange-500/20 cursor-pointer hover:bg-orange-700 transition-all active:scale-95 flex items-center gap-2">
                             <Users size={14} /> Go to Staff Management
                           </button>
                          <button onClick={() => setMainAppTab?.('register-learner')} className="bg-white/80 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-2 rounded-full text-xs font-semibold text-slate-600 dark:text-slate-300 shadow-sm cursor-pointer hover:bg-white transition-colors">Register Learner</button>
                          <button onClick={() => setMainAppTab?.('profile')} className="bg-indigo-600 text-white border border-indigo-700 px-4 py-2 rounded-full text-xs font-semibold shadow-sm cursor-pointer hover:bg-indigo-700 transition-colors flex items-center gap-1.5 animate-pulse">
                            <Zap size={14} /> Manage Plan
                          </button>
                          <button onClick={() => setMainAppTab?.('finance')} className="bg-white/80 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-2 rounded-full text-xs font-semibold text-slate-600 dark:text-slate-300 shadow-sm cursor-pointer hover:bg-white transition-colors">Record Payment</button>
                          <button onClick={() => setMainAppTab?.('analytics')} className="bg-white/80 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-2 rounded-full text-xs font-semibold text-slate-600 dark:text-slate-300 shadow-sm cursor-pointer hover:bg-white transition-colors">Generate Report</button>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Top Middle: Term Progress */}
                <div className="lg:col-span-3 bg-white dark:bg-slate-800 rounded-[2rem] p-6 shadow-sm border border-slate-200/60 dark:border-slate-700 flex flex-col justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-1">{academicPeriod || 'Term 1, 2026'}</h3>
                    <p className="text-xs font-semibold text-slate-400">Current Academic Session</p>
                  </div>
                  
                  <div className="my-6">
                    <div className="flex gap-2 mb-2 items-center text-sm font-bold text-slate-700 dark:text-slate-200">
                      <span className="text-orange-600">Week 8</span> of 14
                    </div>
                    <div className="flex gap-1 h-3 w-full rounded-full overflow-hidden">
                      <div className="bg-orange-600 w-1/3 rounded-l-full"></div>
                      <div className="bg-orange-400 w-1/4"></div>
                      <div className="bg-slate-100 dark:bg-slate-700 flex-1 rounded-r-full"></div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-xs font-semibold text-slate-500">
                    <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-orange-600"></div> Active</div>
                    <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-orange-400"></div> Upcoming</div>
                  </div>
                </div>

                {/* Top Right: Announcements / System Status */}
                <div className="lg:col-span-3 bg-white dark:bg-slate-800 rounded-[2rem] p-6 shadow-sm border border-slate-200/60 dark:border-slate-700">
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">System Status</h3>
                  <ul className="space-y-3 mb-6">
                    <li className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 font-medium">
                      <div className="bg-orange-100 text-orange-600 rounded-full p-0.5"><CheckCircle2 size={14} /></div> All Systems Operational
                    </li>
                    <li className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 font-medium">
                      <div className="bg-orange-100 text-orange-600 rounded-full p-0.5"><CheckCircle2 size={14} /></div> Real-time Database Active
                    </li>
                  </ul>
                  <button className="flex items-center gap-1 text-sm font-bold text-orange-600">
                    View Logs <ChevronRight size={16} />
                  </button>
                </div>
              </div>

              {/* Second Row: Quick Stats */}
              <div className="mt-2">
                <div className="flex justify-between items-end mb-4 px-2">
                  <h3 className="text-lg font-bold dark:text-white">Quick Statistics</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                  {/* Stat Card 1 - Students */}
                  <div className="rounded-[2rem] shadow-sm border border-slate-200/60 dark:border-slate-700 hover:shadow-md transition-shadow overflow-hidden bg-gradient-to-br from-orange-50/50 via-white to-orange-100/20 dark:from-slate-800 dark:to-slate-900 flex flex-col relative group cursor-pointer" onClick={() => setActiveTab('Students')}>
                    <button className="absolute right-4 top-4 bg-white/50 dark:bg-slate-800/50 w-8 h-8 rounded-full flex items-center justify-center text-slate-400 group-hover:text-orange-600 transition-colors"><ArrowUpRight size={16}/></button>
                    <div className="bg-slate-50/80 dark:bg-slate-800/80 p-5 pb-4 border-b border-slate-200/60 dark:border-slate-700 flex items-center gap-3">
                      <Users size={18} className="text-slate-700 dark:text-slate-300" />
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Total Learners</p>
                    </div>
                    <div className="p-5 pt-4 bg-white/50 dark:bg-slate-900/50 flex flex-col justify-center flex-1">
                      <h4 className="text-[15px] font-normal text-slate-800 dark:text-white mb-1">{stats.totalStudents} Enrolled</h4>
                      <p className="text-xs text-slate-500 font-semibold flex items-center gap-2"><span className="text-orange-600 bg-orange-50 dark:bg-orange-900/30 px-2 py-0.5 rounded-md">View Directory</span></p>
                    </div>
                  </div>
                  {/* Stat Card 2 - Fees */}
                  <div className="rounded-[2rem] shadow-sm border border-slate-200/60 dark:border-slate-700 hover:shadow-md transition-shadow overflow-hidden bg-gradient-to-br from-orange-50/50 via-white to-orange-100/20 dark:from-slate-800 dark:to-slate-900 flex flex-col relative group cursor-pointer" onClick={() => setActiveTab('Fees')}>
                    <button className="absolute right-4 top-4 bg-white/50 dark:bg-slate-800/50 w-8 h-8 rounded-full flex items-center justify-center text-slate-400 group-hover:text-orange-600 transition-colors"><ArrowUpRight size={16}/></button>
                    <div className="bg-slate-50/80 dark:bg-slate-800/80 p-5 pb-4 border-b border-slate-200/60 dark:border-slate-700 flex items-center gap-3">
                      <Wallet size={18} className="text-slate-700 dark:text-slate-300" />
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Fee Collection</p>
                    </div>
                    <div className="p-5 pt-4 bg-white/50 dark:bg-slate-900/50 flex flex-col justify-center flex-1">
                      <h4 className="text-[15px] font-normal text-slate-800 dark:text-white truncate mb-1">KES {stats.feeCollection.toLocaleString()}</h4>
                      <p className="text-xs text-slate-500 font-semibold flex items-center gap-2"><span className="text-orange-600 bg-orange-50 dark:bg-orange-900/30 px-2 py-0.5 rounded-md">View Charts</span></p>
                    </div>
                  </div>
                  {/* Stat Card 3 - Staff */}
                  <div className="rounded-[2rem] shadow-sm border border-slate-200/60 dark:border-slate-700 hover:shadow-md transition-shadow overflow-hidden bg-gradient-to-br from-orange-50/50 via-white to-orange-100/20 dark:from-slate-800 dark:to-slate-900 flex flex-col relative group cursor-pointer" onClick={() => setActiveTab('Staff')}>
                    <button className="absolute right-4 top-4 bg-white/50 dark:bg-slate-800/50 w-8 h-8 rounded-full flex items-center justify-center text-slate-400 group-hover:text-orange-600 transition-colors"><ArrowUpRight size={16}/></button>
                    <div className="bg-slate-50/80 dark:bg-slate-800/80 p-5 pb-4 border-b border-slate-200/60 dark:border-slate-700 flex items-center gap-3">
                      <BookOpen size={18} className="text-slate-700 dark:text-slate-300" />
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Teaching Staff</p>
                    </div>
                    <div className="p-5 pt-4 bg-white/50 dark:bg-slate-900/50 flex flex-col justify-center flex-1">
                      <h4 className="text-[15px] font-normal text-slate-800 dark:text-white mb-1">{allStaffMembers.filter(s => s.role === 'TEACHER').length} Teachers</h4>
                      <p className="text-xs text-slate-500 font-semibold flex items-center gap-2">Institution Faculty Overview</p>
                    </div>
                  </div>
                  {/* Stat Card 4 - Support Staff */}
                  <div className="rounded-[2rem] shadow-sm border border-slate-200/60 dark:border-slate-700 hover:shadow-md transition-shadow overflow-hidden bg-gradient-to-br from-orange-50/50 via-white to-orange-100/20 dark:from-slate-800 dark:to-slate-900 hidden md:flex flex-col relative group cursor-pointer" onClick={() => setActiveTab('Staff')}>
                    <button className="absolute right-4 top-4 bg-white/50 dark:bg-slate-800/50 w-8 h-8 rounded-full flex items-center justify-center text-slate-400 group-hover:text-orange-600 transition-colors"><ArrowUpRight size={16}/></button>
                    <div className="bg-slate-50/80 dark:bg-slate-800/80 p-5 pb-4 border-b border-slate-200/60 dark:border-slate-700 flex items-center gap-3">
                      <Zap size={18} className="text-slate-700 dark:text-slate-300" />
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Non-Teaching Staff</p>
                    </div>
                    <div className="p-5 pt-4 bg-white/50 dark:bg-slate-900/50 flex flex-col justify-center flex-1">
                      <h4 className="text-[15px] font-normal text-slate-800 dark:text-white mb-1">{allStaffMembers.filter(s => s.role !== 'TEACHER').length} Support Staff</h4>
                      <p className="text-xs text-slate-500 font-semibold flex items-center gap-2"><span className="text-orange-600 bg-orange-50 dark:bg-orange-900/30 px-2 py-0.5 rounded-md">View Directory</span></p>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'Students' && (
            <div className="space-y-8 flex-1 flex flex-col">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-2">
                <div>
                  <h2 className="text-xl font-bold text-slate-800 dark:text-white tracking-tight mb-1">Learner Directory</h2>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400 max-w-xl">
                    Manage learner profiles, track attendance trends, and monitor academic progress.
                  </p>
                </div>
                <div className="flex gap-3">
                  <div className="flex items-center gap-2 px-5 py-2.5 bg-orange-600 text-white rounded-full shadow-md text-sm font-semibold whitespace-nowrap">
                    <Users size={16} />
                    <span>Total Learners: {stats.totalStudents}</span>
                  </div>
                  <div className="flex items-center gap-2 px-5 py-2.5 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-full border border-slate-200 dark:border-slate-700 text-sm font-semibold whitespace-nowrap">
                    <UserCheck size={16} className="text-green-500" />
                    <span>Active: 100%</span>
                  </div>
                </div>
              </div>

              <div className="flex-1 flex flex-col pt-4">
                <div className="flex flex-col xl:flex-row justify-between xl:items-center gap-4 mb-6">
                 <div>
                   <h3 className="text-lg font-bold dark:text-white mb-2">{learnerView === 'New' ? 'Recent Enrollments' : 'All Learners'}</h3>
                   <div className="flex gap-2">
                     <button onClick={() => setLearnerView('New')} className={`text-xs font-bold px-3 py-1 rounded-full cursor-pointer transition-colors shadow-sm ${learnerView === 'New' ? 'text-white bg-orange-600' : 'text-slate-500 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600'}`}>New Enrollments</button>
                     <button onClick={() => setLearnerView('All')} className={`text-xs font-bold px-3 py-1 rounded-full cursor-pointer transition-colors ${learnerView === 'All' ? 'text-white bg-orange-600 shadow-sm' : 'text-slate-500 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600'}`}>All Learners</button>
                   </div>
                 </div>
                 
                 <div className="flex flex-wrap items-center gap-3">
                   {learnerView === 'All' && (
                     <>
                       <div className="relative">
                         <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                         <input type="text" value={learnerSearch} onChange={e => setLearnerSearch(e.target.value)} placeholder="Search learners..." className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-full py-2 pl-9 pr-4 text-xs focus:ring-2 focus:ring-orange-500 outline-none w-48 sm:w-64 dark:text-white" />
                       </div>
                       <select value={learnerGrade} onChange={e => setLearnerGrade(e.target.value)} className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-full py-2 px-3 text-xs outline-none dark:text-white cursor-pointer font-semibold max-w-[120px]">
                         <option value="All">All Grades</option>
                         {Array.from(new Set(allStudents.map(s => s.grade))).filter(Boolean).sort().map(g => (
                           <option key={g as string} value={g as string}>{g as string}</option>
                         ))}
                       </select>
                     </>
                   )}
                   <button onClick={() => setMainAppTab?.('register-learner')} className="text-sm font-bold text-orange-600 bg-orange-50 dark:bg-slate-700 border border-orange-100 dark:border-slate-600 rounded-full px-4 py-2 flex items-center gap-1 hover:bg-orange-100 transition-colors shadow-sm whitespace-nowrap">+ New Learner</button>
                 </div>
              </div>
              
              <div className="overflow-x-auto flex-1">
                 <table className="w-full text-left border-collapse">
                   <thead>
                     <tr className="border-b border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-400 tracking-tight">
                       <th className="p-4 pl-0">Learner Name</th>
                       <th className="p-4">Admission No.</th>
                       <th className="p-4">Grade / Class</th>
                       <th className="p-4">Enrollment Date</th>
                       <th className="p-4 text-right pr-0">Fee Balance</th>
                     </tr>
                   </thead>
                   <tbody>
                      {(learnerView === 'New' 
                          ? recentEnrollments 
                          : allStudents.filter(s => {
                              const matchSearch = s.name.toLowerCase().includes(learnerSearch.toLowerCase()) || s.adm.toLowerCase().includes(learnerSearch.toLowerCase());
                              const matchGrade = learnerGrade === 'All' || s.grade === learnerGrade;
                              return matchSearch && matchGrade;
                            })
                        ).map((student, i) => (
                        <tr key={i} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors group cursor-pointer">
                          <td className="p-4 pl-0">
                           <div className="flex items-center gap-3">
                             <div className="w-10 h-10 rounded-[1rem] bg-gradient-to-br from-orange-100 to-orange-50 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center text-orange-600 dark:text-orange-400 font-bold border border-orange-200/50 dark:border-slate-600 shadow-sm group-hover:scale-105 transition-transform">
                                {student.name.charAt(0)}
                             </div>
                             <div>
                               <p className="font-bold text-slate-800 dark:text-white text-sm">{student.name}</p>
                               <p className="text-[11px] font-semibold text-slate-400">View Profile</p>
                             </div>
                           </div>
                         </td>
                         <td className="p-4 text-sm font-semibold text-slate-600 dark:text-slate-300">
                            {student.adm}
                         </td>
                         <td className="p-4">
                           <span className="text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full border border-slate-200 dark:border-slate-700">
                              {student.grade}
                           </span>
                         </td>
                         <td className="p-4">
                           <div className="flex items-center gap-1 text-xs font-semibold text-slate-500">
                             <Calendar size={12} /> {learnerView === 'New' ? 'Recently' : (student.createdAt ? new Date(student.createdAt).toLocaleDateString() : 'N/A')}
                           </div>
                         </td>
                         <td className="p-4 text-right pr-0">
                           <span className={`text-xs font-bold px-3 py-1 rounded-full ${student.balance > 0 ? 'bg-orange-50 text-orange-600 border border-orange-100 dark:bg-orange-900/30 dark:border-orange-800' : 'bg-green-50 text-green-600 border border-green-100 dark:bg-green-900/30 dark:border-green-800'}`}>
                              {student.balance > 0 ? `KES ${student.balance.toLocaleString()}` : 'Cleared'}
                           </span>
                         </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  
                  {learnerView === 'New' && recentEnrollments.length === 0 && (
                     <div className="py-12 text-center text-slate-500 dark:text-slate-400 text-sm font-semibold w-full">
                        No recent enrollments available in this directory preview.
                     </div>
                  )}
                  {learnerView === 'All' && allStudents.filter(s => {
                      const matchSearch = s.name.toLowerCase().includes(learnerSearch.toLowerCase()) || s.adm.toLowerCase().includes(learnerSearch.toLowerCase());
                      const matchGrade = learnerGrade === 'All' || s.grade === learnerGrade;
                      return matchSearch && matchGrade;
                  }).length === 0 && (
                     <div className="py-12 text-center text-slate-500 dark:text-slate-400 text-sm font-semibold w-full">
                        No learners found matching your filter criteria.
                     </div>
                  )}
               </div>
            </div>
          </div>
          )}

          {activeTab === 'Staff' && (
            <div className="flex-1 pt-4">
              <div className="flex justify-between items-center mb-6">
                 <div>
                   <h3 className="text-lg font-bold dark:text-white mb-2">Staff Directory</h3>
                   <div className="flex gap-2">
                     <button 
                       onClick={() => setStaffFilter('TEACHER')}
                       className={`text-xs font-bold px-3 py-1 rounded-full cursor-pointer transition-all ${staffFilter === 'TEACHER' ? 'text-white bg-orange-600 shadow-sm' : 'text-slate-500 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600'}`}
                     >
                       Teaching Staff
                     </button>
                     <button 
                       onClick={() => setStaffFilter('NON_TEACHER')}
                       className={`text-xs font-bold px-3 py-1 rounded-full cursor-pointer transition-all ${staffFilter === 'NON_TEACHER' ? 'text-white bg-orange-600 shadow-sm' : 'text-slate-500 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600'}`}
                     >
                       Non-Teaching Staff
                     </button>
                   </div>
                 </div>
                 <button onClick={() => setMainAppTab?.('staff-management')} className="text-sm font-bold text-orange-600 bg-orange-50 dark:bg-slate-700 border border-orange-100 dark:border-slate-600 rounded-full px-4 py-1.5 flex items-center gap-1 hover:bg-orange-100 transition-colors shadow-sm">+ Add Staff</button>
              </div>

              <div className="overflow-x-auto">
                 <table className="w-full text-left border-collapse">
                   <thead>
                     <tr className="border-b border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-400 tracking-tight">
                       <th className="p-4 pl-0">Full Name</th>
                       <th className="p-4">Phone Number</th>
                       <th className="p-4">Role / TSC</th>
                       <th className="p-4">Staff ID</th>
                       <th className="p-4 text-right pr-0">Status</th>
                     </tr>
                   </thead>
                   <tbody className="text-sm text-slate-700 dark:text-slate-300">
                     {staff.filter(s => staffFilter === 'TEACHER' ? s.role === 'TEACHER' : s.role !== 'TEACHER').length > 0 ? (
                       staff
                        .filter(s => staffFilter === 'TEACHER' ? s.role === 'TEACHER' : s.role !== 'TEACHER')
                        .slice(0, 5)
                        .map((member, i) => (
                          <tr key={i} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors group">
                            <td className="p-4 pl-0 flex items-center gap-3">
                               <div className={`w-8 h-8 rounded-xl bg-orange-600 flex items-center justify-center text-white font-bold text-xs shadow-sm group-hover:scale-105 transition-transform`}>
                                  {member.name?.charAt(0) || 'S'}
                               </div>
                               <span className="font-bold">{member.name}</span>
                            </td>
                            <td className="p-4">{member.phone || 'N/A'}</td>
                            <td className="p-4">
                              <span className="text-xs font-mono bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded text-slate-600 dark:text-slate-300">
                                {member.tc || member.role}
                              </span>
                            </td>
                            <td className="p-4 text-slate-500 text-xs">#{member.id?.substring(0, 6)}</td>
                            <td className="p-4 text-right pr-0">
                               <span className={`text-[10px] font-bold tracking-tight px-2 py-1 rounded-md bg-green-50 text-green-600 dark:bg-green-900/20`}>
                                 Active
                               </span>
                            </td>
                          </tr>
                        ))
                     ) : (
                       <tr>
                         <td colSpan={5} className="p-8 text-center text-slate-500 text-xs italic">
                           No {staffFilter === 'TEACHER' ? 'teaching staff' : 'support staff'} found in the directory.
                         </td>
                       </tr>
                     )}
                   </tbody>
                 </table>
              </div>
            </div>
          )}

          {activeTab === 'Fees' && (
             <div className="flex-1 flex flex-col pt-4">
               <div className="flex justify-between items-center mb-6">
                 <div>
                   <h3 className="text-lg font-bold dark:text-white mb-1">Fee Collection Progress</h3>
                   <p className="text-xs text-slate-500">Horizontal bar analysis of targets vs collected</p>
                 </div>
                 <div className="flex gap-4">
                   <div className="flex items-center gap-2 text-[11px] font-black text-slate-500 tracking-tight bg-slate-50 dark:bg-slate-700 px-3 py-1.5 rounded-full">
                     <span className="w-2.5 h-2.5 rounded-full bg-[#6b8e23]"></span> Target
                   </div>
                   <div className="flex items-center gap-2 text-[11px] font-black text-slate-500 tracking-tight bg-slate-50 dark:bg-slate-700 px-3 py-1.5 rounded-full">
                     <span className="w-2.5 h-2.5 rounded-full bg-orange-600"></span> Collected
                   </div>
                 </div>
               </div>
               <div className="h-[400px] w-full mt-4 flex-1">
                 <ResponsiveContainer width="100%" height="100%">
                   <BarChart data={FEE_PROGRESS_DATA} margin={{ top: 20, right: 10, left: 10, bottom: 0 }} barGap={6}>
                     <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
                     <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11, fontWeight: 700 }} dy={10} />
                     <YAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 700 }} dx={-10} />
                     <Tooltip cursor={{ fill: '#f8fafc', opacity: 0.5 }} contentStyle={{ borderRadius: '16px', border: 'none', backgroundColor: '#0f172a', padding: '16px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }} itemStyle={{ color: '#f8fafc', fontWeight: '900', fontSize: '14px' }} />
                     <Bar dataKey="target" fill="#6b8e23" radius={[4, 4, 0, 0]} barSize={8} />
                     <Bar dataKey="collected" fill="#f97316" radius={[4, 4, 0, 0]} barSize={8} />
                   </BarChart>
                 </ResponsiveContainer>
               </div>
             </div>
          )}

          {activeTab === 'Academics' && (
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1">
               <div className="bg-white dark:bg-slate-800 rounded-[2rem] p-6 shadow-sm border border-slate-200/60 dark:border-slate-700">
                  <div className="flex justify-between items-center mb-8">
                    <h3 className="text-lg font-bold dark:text-white">CBC Assessment Tracker</h3>
                     <span className="bg-orange-50 text-orange-600 border border-orange-100 text-xs font-bold px-3 py-1 rounded-full">Term 1</span>
                  </div>
                  
                  <div className="flex items-center gap-8 mb-8">
                    <div className="h-32 w-32 shrink-0">
                       <ResponsiveContainer width="100%" height="100%">
                         <PieChart>
                           <Pie data={ASSESSMENT_DATA} innerRadius={35} outerRadius={55} paddingAngle={2} dataKey="value" stroke="none">
                             {ASSESSMENT_DATA.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.fill} />))}
                           </Pie>
                         </PieChart>
                       </ResponsiveContainer>
                    </div>
                    
                    <div className="flex-1 space-y-4">
                       <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-[1.5rem] flex items-center justify-between border border-slate-100 dark:border-slate-600">
                          <div>
                            <p className="text-sm font-bold text-slate-600 dark:text-slate-300">Lower Primary</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Syllabus Covered</p>
                          </div>
                          <span className="text-lg font-bold text-orange-600">0%</span>
                       </div>
                       <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-[1.5rem] flex items-center justify-between border border-slate-100 dark:border-slate-600">
                          <div>
                            <p className="text-sm font-bold text-slate-600 dark:text-slate-300">Junior Secondary</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Syllabus Covered</p>
                          </div>
                          <span className="text-lg font-black text-orange-600">0%</span>
                       </div>
                    </div>
                  </div>
               </div>

               <div className="bg-white dark:bg-slate-800 rounded-[2rem] p-6 shadow-sm border border-slate-200/60 dark:border-slate-700">
                  <h3 className="text-lg font-bold dark:text-white mb-6">Subject Progress Tracker</h3>
                  
                  <div className="space-y-6">
                     {[
                       { subj: 'C.R.E / I.R.E', prog: 0, col: 'bg-orange-600' },
                       { subj: 'English / Kiswahili', prog: 0, col: 'bg-orange-500' },
                       { subj: 'Mathematics', prog: 0, col: 'bg-green-500' },
                       { subj: 'Science & Technology', prog: 0, col: 'bg-orange-500' }
                     ].map(s => (
                       <div key={s.subj}>
                          <div className="flex justify-between text-xs font-bold text-slate-600 dark:text-slate-300 mb-2">
                             <span>{s.subj}</span>
                             <span>{s.prog}%</span>
                          </div>
                          <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                             <div className={`h-full ${s.col} rounded-full transition-all duration-1000`} style={{ width: `${s.prog}%` }}></div>
                          </div>
                       </div>
                     ))}
                  </div>
               </div>
             </div>
          )}

          {activeTab === 'Communication' && (
            <div className="flex-1 flex flex-col min-h-0">
              <CommunicationModule />
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default Dashboard;

