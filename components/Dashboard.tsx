import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie
} from 'recharts';
import { NAVIGATION_ITEMS } from '../constants';
import { UserRole } from '../types';
import { 
  Users, Wallet, BookOpen, Search, 
  ArrowUpRight, CheckCircle2, Calendar, 
  Zap, Home, ChevronRight, LayoutGrid, FileText, Activity, GraduationCap, UserCheck, MessageSquare, Clock, MapPin,
  Loader2, Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db, auth } from '../src/firebase';
import { collection, query, where, onSnapshot, doc, getDoc, orderBy, limit, updateDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { Bell, X, ArrowRight } from 'lucide-react';
import CommunicationModule from './CommunicationModule';

interface DashboardProps {
  role: UserRole;
  academicPeriod: string;
  setActiveTab?: (tab: string) => void;
  enabledModules?: string[];
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  isMockAuth?: boolean;
  onImpersonateTeacher?: (teacher: any) => void;
}

const toTitleCase = (str: string): string => {
  if (!str) return '';
  return str
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const Dashboard: React.FC<DashboardProps> = ({ 
  role, 
  academicPeriod, 
  setActiveTab: setMainAppTab, 
  enabledModules = [], 
  activeTab: propActiveTab, 
  onTabChange,
  isMockAuth = false,
  onImpersonateTeacher
}) => {
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
  
  const [showTeacherSwitcher, setShowTeacherSwitcher] = useState(false);
  const [switcherSearch, setSwitcherSearch] = useState('');

  const teachersList = useMemo(() => {
    return staff.filter((s: any) => s.role === 'TEACHER' && (
      (s.name || '').toLowerCase().includes(switcherSearch.toLowerCase()) ||
      (s.email || '').toLowerCase().includes(switcherSearch.toLowerCase())
    ));
  }, [staff, switcherSearch]);
  
  const [localActiveTab, setLocalActiveTab] = useState('Overview');
  const activeTab = propActiveTab || localActiveTab;
  const setActiveTab = onTabChange || setLocalActiveTab;
  const [userName, setUserName] = useState('');
  
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [learnerView, setLearnerView] = useState<'New' | 'All'>('New');
  const [learnerSearch, setLearnerSearch] = useState('');
  const [learnerGrade, setLearnerGrade] = useState('All');
  
  const [dashboardEvents, setDashboardEvents] = useState<any[]>([]);
  const [globalSearch, setGlobalSearch] = useState('');
  
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiSummary, setAiSummary] = useState('');

  const handleAskAi = async () => {
    if (!globalSearch.trim() || isAiLoading) return;
    setIsAiLoading(true);
    setAiSummary('');
    try {
      const prompt = `You are BrightSoma, an intelligent executive school management AI assistant. The user (role: ${role}) asked: "${globalSearch}". 
      Current School Stats:
      - Total Students: ${stats.totalStudents}
      - Total Staff: ${stats.totalStaff}
      - Fee Collection: ${stats.feeCollection}
      - Attendance Rate: ${stats.attendanceRate}%
      
      Provide a short, executive-style summary of school activity. Make it highly scannable with bullet points, short sentences, and a professional tone. Do not use markdown headers larger than h3. Focus on providing insights based on the stats and the user question.`;
      
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${import.meta.env.VITE_GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });
      
      const data = await response.json();
      if (data.candidates && data.candidates[0].content.parts[0].text) {
        setAiSummary(data.candidates[0].content.parts[0].text);
      } else {
        setAiSummary('Failed to generate summary.');
      }
    } catch (err) {
      setAiSummary('An error occurred while connecting to the AI.');
    } finally {
      setIsAiLoading(false);
    }
  };

  const globalSearchResults = useMemo(() => {
    if (!globalSearch.trim()) return null;
    const query = globalSearch.toLowerCase();
    return {
      students: allStudents.filter(s => s.name.toLowerCase().includes(query) || s.adm.toLowerCase().includes(query)).slice(0, 4),
      staff: staff.filter(s => s.name?.toLowerCase().includes(query)).slice(0, 4)
    };
  }, [globalSearch, allStudents, staff]);

  useEffect(() => {
    if (isMockAuth) {
      console.log('[Dashboard] DEMO MODE: Loading mock data...');
      setIsLoading(true);
      
      import('../demoData').then(demo => {
        setStats(demo.MOCK_DASHBOARD_STATS);
        const formattedMock = demo.MOCK_STUDENTS.map((s: any) => ({ ...s, name: toTitleCase(s.name) }));
        setAllStudents(formattedMock);
        setRecentEnrollments(formattedMock.slice(0, 5));
        setStaff(demo.MOCK_STAFF);
        setDashboardEvents(demo.MOCK_EVENTS);
        setUserName('Demo User');
        setIsLoading(false);
      });
      return;
    }

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
                name: toTitleCase(doc.data().name || ''), 
                adm: doc.data().admissionNumber, 
                grade: doc.data().grade, 
                balance: doc.data().balance || 0, 
                createdAt: doc.data().createdAt,
                hasFeeRecord: doc.data().hasFeeRecord
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

          const unsubEvents = onSnapshot(query(collection(db, 'events'), where('schoolId', '==', schoolId)), (snapshot) => {
              const evs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
              evs.sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
              setDashboardEvents(evs.slice(0, 3));
            }
          );

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
  }, [isMockAuth]);
  
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
    <div className="flex justify-center min-h-[calc(100vh-8rem)] animate-in fade-in duration-700 font-sans text-slate-900 dark:text-slate-100 bg-transparent p-2 lg:p-8">
      <div className="w-full max-w-[1400px] bg-transparent rounded-[2.5rem] flex flex-col border-none">
        
        {/* Content Area */}
        <div className="p-4 md:p-8 overflow-y-auto flex flex-col gap-6 h-full">
          
          {(activeTab === 'Overview' || activeTab === 'All') && (
            <>
              {/* Main Grid Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Top Left: Welcome Banner + AI Assistant */}
                <div className="lg:col-span-6 bg-white dark:bg-slate-800 rounded-[2.5rem] p-5 md:p-8 border border-slate-200 dark:border-slate-700 relative overflow-hidden flex flex-col justify-between">
                  <div className="relative z-10">
                    {/* ── Welcome Banner ────────────────────────────────── */}
                    <div className="mb-7">
                      {isMockAuth && (
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-orange-600/10 text-orange-600 rounded-full text-[9px] font-black tracking-[0.2em] mb-4 border border-orange-600/20 animate-pulse">
                          <Zap size={10} fill="currentColor" /> Live Demo Mode
                        </div>
                      )}
                      {/* Waving hand + greeting */}
                      <div className="flex items-end gap-3 mb-3">
                        <motion.span
                          animate={{ rotate: [0, 18, -8, 18, 0] }}
                          transition={{ duration: 1.6, repeat: Infinity, repeatDelay: 2.5, ease: 'easeInOut' }}
                          className="text-2xl md:text-3xl select-none"
                          style={{ display: 'inline-block', transformOrigin: '70% 80%' }}
                        >
                          👋
                        </motion.span>
                        <div>
                          <p className="text-[10px] md:text-[11px] font-bold text-orange-600 tracking-[0.2em] mb-0.5">
                            {new Date().toLocaleDateString('en-KE', { weekday: 'long', day: 'numeric', month: 'long' })}
                          </p>
                          <h2 className="text-xl md:text-3xl font-black tracking-tight text-black dark:text-white leading-tight">
                            Welcome back,{' '}
                            <span className="text-orange-600">
                              {role === 'ADMIN' ? 'Director' : role === 'TEACHER' ? 'Teacher' : role === 'PRINCIPAL' ? 'Principal' : role === 'FINANCE' ? 'Finance Officer' : 'User'}
                            </span>{' '}
                            {userName ? userName.split(' ')[0] : ''}
                          </h2>
                        </div>
                      </div>

                      {/* Thin animated progress bar */}
                      <div className="mt-4 space-y-1.5">
                        <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 tracking-widest">
                          <span>Term Progress</span>
                          <span className="text-orange-600">Week 8 of 14</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <motion.div
                            className="h-full bg-gradient-to-r from-orange-500 to-orange-400 rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: '57%' }}
                            transition={{ duration: 1.2, ease: 'easeOut', delay: 0.3 }}
                          />
                        </div>
                      </div>
                    </div>

                    {role === 'PLATFORM_ADMIN' ? (
                      <div className="mb-6">
                        <p className="text-black dark:text-slate-400 mb-6 max-w-md">
                          You are logged in with full system-wide access. Manage schools, users, and platform settings.
                        </p>
                        <div className="flex flex-wrap gap-3">
                          <button onClick={() => setMainAppTab?.('platform-admin')} className="bg-orange-600 text-white border border-orange-700 px-6 py-2.5 rounded-full text-sm font-bold shadow-lg cursor-pointer hover:bg-orange-700 transition-all transform hover:scale-105">
                            Open Management Portal
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-2">
                        <h4 className="text-sm font-bold text-black dark:text-white mb-4">What would you like to do today?</h4>
                        <div className="relative mb-6 group">
                          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-orange-600">
                             <Sparkles size={18} />
                          </div>
                          <input 
                            type="text" 
                            placeholder="e.g. Give me yesterday's summary, Show attendance performance..." 
                            value={globalSearch}
                            onChange={(e) => setGlobalSearch(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleAskAi();
                              }
                            }}
                            className="w-full pl-10 md:pl-12 pr-4 py-3 md:py-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs md:text-sm text-black dark:text-white focus:outline-none focus:ring-4 focus:ring-orange-500/20 focus:border-orange-500 font-medium transition-all"
                          />
                          <button 
                             className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-2 bg-black text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors disabled:opacity-50 flex items-center gap-2"
                             onClick={handleAskAi}
                             disabled={isAiLoading}
                          >
                            {isAiLoading ? <Loader2 className="animate-spin" size={14} /> : null}
                            Ask AI
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                           <button onClick={() => {setGlobalSearch('Summarize finance activity'); setTimeout(handleAskAi, 100);}} className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-[10px] font-bold text-slate-600 dark:text-slate-300 hover:bg-orange-50 hover:text-orange-600 transition-colors">Summarize finance activity</button>
                           <button onClick={() => {setGlobalSearch('What modules were active today?'); setTimeout(handleAskAi, 100);}} className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-[10px] font-bold text-slate-600 dark:text-slate-300 hover:bg-orange-50 hover:text-orange-600 transition-colors">Active modules</button>
                           <button onClick={() => {setGlobalSearch('Show attendance performance'); setTimeout(handleAskAi, 100);}} className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-[10px] font-bold text-slate-600 dark:text-slate-300 hover:bg-orange-50 hover:text-orange-600 transition-colors">Attendance performance</button>
                        </div>
                        
                        {(isAiLoading || aiSummary) && (
                          <div className="mt-6 bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
                             {isAiLoading ? (
                               <div className="flex items-center gap-3 text-orange-600 font-bold text-sm">
                                 <Loader2 className="animate-spin" size={18} />
                                 Generating executive summary...
                               </div>
                             ) : (
                               <div className="prose prose-sm dark:prose-invert max-w-none prose-p:text-sm prose-li:text-sm prose-headings:text-black dark:prose-headings:text-white">
                                 <div dangerouslySetInnerHTML={{ __html: aiSummary.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br/>') }} />
                               </div>
                             )}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex flex-wrap gap-3 mt-auto pt-6">
                      {enabledModules.includes('admin') && (
                        <button onClick={() => setMainAppTab?.('staff-management')} className="bg-emerald-500 text-white border border-emerald-600 px-5 py-2.5 rounded-full text-xs font-black shadow-lg shadow-emerald-500/20 cursor-pointer hover:bg-emerald-600 transition-all active:scale-95 flex items-center gap-2">
                           <Users size={14} /> Go to Staff Management
                         </button>
                      )}
                      {['ADMIN', 'DIRECTOR', 'HEADTEACHER', 'PRINCIPAL'].includes(role) && (
                        <button 
                          onClick={() => setShowTeacherSwitcher(true)} 
                          className="bg-indigo-600 text-white border border-indigo-700 px-5 py-2.5 rounded-full text-xs font-black shadow-lg shadow-indigo-500/20 cursor-pointer hover:bg-indigo-700 transition-all active:scale-95 flex items-center gap-2"
                        >
                           <ArrowRight size={14} /> Switch Portal
                        </button>
                      )}
                      {enabledModules.includes('students') && (
                        <button onClick={() => setMainAppTab?.('register-learner')} className="bg-white/80 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-2 rounded-full text-xs font-semibold text-black dark:text-slate-300 shadow-sm cursor-pointer hover:bg-white transition-colors">Register Learner</button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Top Middle: Term Progress */}
                <div className="lg:col-span-3 bg-white dark:bg-slate-800 rounded-[2rem] p-6 border border-slate-200 dark:border-slate-700 flex flex-col justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">{academicPeriod || 'Term 1, 2026'}</h3>
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Current Academic Session</p>
                  </div>
                  
                  <div className="my-6">
                    <div className="flex gap-2 mb-2 items-center text-sm font-bold text-black dark:text-slate-200">
                      <span className="text-orange-600">Week 8</span> of 14
                    </div>
                    <div className="flex gap-1 h-3 w-full rounded-full overflow-hidden">
                      <div className="bg-orange-600 w-1/3 rounded-l-full"></div>
                      <div className="bg-orange-400 w-1/4"></div>
                      <div className="bg-slate-100 dark:bg-slate-700 flex-1 rounded-r-full"></div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-xs font-semibold text-slate-600 dark:text-slate-400">
                    <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-orange-600"></div> Active</div>
                    <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-orange-400"></div> Upcoming</div>
                  </div>
                </div>

                {/* Top Right: Announcements / System Status */}
                <div className="lg:col-span-3 bg-white dark:bg-slate-800 rounded-[2rem] p-6 border border-slate-200 dark:border-slate-700">
                  <h3 className="text-lg font-bold text-black dark:text-white mb-4">System Status</h3>
                  <ul className="space-y-3 mb-6">
                    <li className="flex items-center gap-2 text-sm text-black dark:text-slate-300 font-medium">
                      <div className="bg-orange-100 text-orange-600 rounded-full p-0.5"><CheckCircle2 size={14} /></div> All Systems Operational
                    </li>
                    <li className="flex items-center gap-2 text-sm text-black dark:text-slate-300 font-medium">
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
                  {enabledModules.includes('students') && (
                    <div className="rounded-[2rem] border border-slate-200 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-800 flex flex-col relative cursor-pointer" onClick={() => setActiveTab('Students')}>
                      <button className="absolute right-4 top-4 bg-slate-100 dark:bg-slate-700 w-8 h-8 rounded-full flex items-center justify-center text-slate-900 dark:text-white transition-colors"><ArrowUpRight size={16}/></button>
                      <div className="bg-slate-50 dark:bg-slate-800 p-5 pb-4 border-b border-slate-200 dark:border-slate-700 flex items-center gap-3">
                        <Users size={18} className="text-slate-900 dark:text-white" />
                        <p className="text-sm font-medium text-slate-900 dark:text-white">Total Learners</p>
                      </div>
                      <div className="p-5 pt-4 bg-transparent flex flex-col justify-center flex-1">
                        <h4 className="text-[15px] font-normal text-slate-900 dark:text-white mb-1">{stats.totalStudents} Enrolled</h4>
                        <p className="text-xs text-slate-600 dark:text-slate-300 font-semibold flex items-center gap-2"><span className="text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/30 px-2 py-0.5 rounded-md">View Directory</span></p>
                      </div>
                    </div>
                  )}
                  {/* Stat Card 2 - Fees */}
                  {enabledModules.includes('finance') && (
                    <div className="rounded-[2rem] border border-slate-200 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-800 flex flex-col relative cursor-pointer" onClick={() => setActiveTab('Fees')}>
                      <button className="absolute right-4 top-4 bg-slate-100 dark:bg-slate-700 w-8 h-8 rounded-full flex items-center justify-center text-slate-900 dark:text-white transition-colors"><ArrowUpRight size={16}/></button>
                      <div className="bg-slate-50 dark:bg-slate-800 p-5 pb-4 border-b border-slate-200 dark:border-slate-700 flex items-center gap-3">
                        <Wallet size={18} className="text-slate-900 dark:text-white" />
                        <p className="text-sm font-medium text-slate-900 dark:text-white">Fee Collection</p>
                      </div>
                      <div className="p-5 pt-4 bg-transparent flex flex-col justify-center flex-1">
                        <h4 className="text-[15px] font-normal text-slate-900 dark:text-white truncate mb-1">KES {stats.feeCollection.toLocaleString()}</h4>
                        <p className="text-xs text-slate-600 dark:text-slate-300 font-semibold flex items-center gap-2"><span className="text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/30 px-2 py-0.5 rounded-md">View Charts</span></p>
                      </div>
                    </div>
                  )}
                  {/* Stat Card 3 - Staff */}
                  {enabledModules.includes('admin') && (
                    <div className="rounded-[2rem] border border-slate-200 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-800 flex flex-col relative cursor-pointer" onClick={() => setActiveTab('Staff')}>
                      <button className="absolute right-4 top-4 bg-slate-100 dark:bg-slate-700 w-8 h-8 rounded-full flex items-center justify-center text-slate-900 dark:text-white transition-colors"><ArrowUpRight size={16}/></button>
                      <div className="bg-slate-50 dark:bg-slate-800 p-5 pb-4 border-b border-slate-200 dark:border-slate-700 flex items-center gap-3">
                        <BookOpen size={18} className="text-slate-900 dark:text-white" />
                        <p className="text-sm font-medium text-slate-900 dark:text-white">Teaching Staff</p>
                      </div>
                      <div className="p-5 pt-4 bg-transparent flex flex-col justify-center flex-1">
                        <h4 className="text-[15px] font-normal text-slate-900 dark:text-white mb-1">{allStaffMembers.filter(s => s.role === 'TEACHER').length} Teachers</h4>
                        <p className="text-xs text-slate-600 dark:text-slate-300 font-semibold flex items-center gap-2">Institution Faculty Overview</p>
                      </div>
                    </div>
                  )}
                  {/* Stat Card 4 - Support Staff */}
                  {enabledModules.includes('admin') && (
                    <div className="rounded-[2rem] border border-slate-200 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-800 flex flex-col relative cursor-pointer" onClick={() => setActiveTab('Staff')}>
                      <button className="absolute right-4 top-4 bg-slate-100 dark:bg-slate-700 w-8 h-8 rounded-full flex items-center justify-center text-slate-900 dark:text-white transition-colors"><ArrowUpRight size={16}/></button>
                      <div className="bg-slate-50 dark:bg-slate-800 p-5 pb-4 border-b border-slate-200 dark:border-slate-700 flex items-center gap-3">
                        <Zap size={18} className="text-slate-900 dark:text-white" />
                        <p className="text-sm font-medium text-slate-900 dark:text-white">Non-Teaching Staff</p>
                      </div>
                      <div className="p-5 pt-4 bg-transparent flex flex-col justify-center flex-1">
                        <h4 className="text-[15px] font-normal text-slate-900 dark:text-white mb-1">{allStaffMembers.filter(s => s.role !== 'TEACHER').length} Support Staff</h4>
                        <p className="text-xs text-slate-600 dark:text-slate-300 font-semibold flex items-center gap-2"><span className="text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/30 px-2 py-0.5 rounded-md">View Directory</span></p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Third Row: News & Events */}
              <div className="mt-8">
                <div className="flex justify-between items-end mb-4 px-2">
                  <h3 className="text-lg font-bold dark:text-white">Upcoming News & Events</h3>
                  <button onClick={() => setMainAppTab?.('events')} className="text-sm font-bold text-orange-600 hover:text-orange-700">View All</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {dashboardEvents.length > 0 ? dashboardEvents.map(ev => (
                    <div key={ev.id} className="bg-white dark:bg-slate-800 rounded-[2rem] p-6 border border-slate-200/60 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-1 rounded-md tracking-widest">{ev.type}</span>
                        <span className="text-xs text-slate-500 font-medium">{new Date(ev.date).toLocaleDateString()}</span>
                      </div>
                      <h4 className="font-bold text-slate-900 dark:text-white mb-2">{ev.title}</h4>
                      <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 mb-4">{ev.description}</p>
                      <div className="flex items-center gap-4 text-xs font-semibold text-slate-500 dark:text-slate-400">
                        <div className="flex items-center gap-1"><Clock size={14} className="text-orange-500"/> {ev.time}</div>
                        <div className="flex items-center gap-1"><MapPin size={14} className="text-orange-500"/> {ev.location}</div>
                      </div>
                    </div>
                  )) : (
                    <div className="col-span-1 md:col-span-2 lg:col-span-3 bg-slate-50 dark:bg-slate-800/50 rounded-[2rem] p-8 text-center border border-dashed border-slate-200 dark:border-slate-700">
                       <p className="text-sm font-medium text-slate-500 dark:text-slate-400">No upcoming events scheduled. Head over to the Events module to plan one!</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {activeTab === 'Students' && (
            <div className="space-y-8 flex-1 flex flex-col">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-2">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight mb-1">Learner Directory</h2>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400 max-w-xl">
                    Manage learner profiles, track attendance trends, and monitor academic progress.
                  </p>
                </div>
                <div className="flex gap-3">
                  <div className="flex items-center gap-2 px-5 py-2.5 bg-orange-600 text-white rounded-full shadow-md text-sm font-semibold whitespace-nowrap">
                    <Users size={16} />
                    <span>Total Learners: {stats.totalStudents}</span>
                  </div>
                  <div className="flex items-center gap-2 px-5 py-2.5 bg-slate-50 dark:bg-slate-800 text-black dark:text-slate-300 rounded-full border border-slate-200 dark:border-slate-700 text-sm font-semibold whitespace-nowrap">
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
                     <button onClick={() => setLearnerView('New')} className={`text-xs font-bold px-3 py-1 rounded-full cursor-pointer transition-colors shadow-sm ${learnerView === 'New' ? 'text-white bg-orange-600' : 'text-black dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600'}`}>New Enrollments</button>
                     <button onClick={() => setLearnerView('All')} className={`text-xs font-bold px-3 py-1 rounded-full cursor-pointer transition-colors ${learnerView === 'All' ? 'text-white bg-orange-600 shadow-sm' : 'text-black dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600'}`}>All Learners</button>
                   </div>
                 </div>
                 
                 <div className="flex flex-wrap items-center gap-3">
                   {learnerView === 'All' && (
                     <>
                       <div className="relative">
                         <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-black dark:text-white" size={14} />
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
                     <tr className="border-b border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-400 dark:text-slate-500 tracking-tight">
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
                               <p className="font-bold text-slate-900 dark:text-white text-sm">{student.name}</p>
                               <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">View Profile</p>
                             </div>
                           </div>
                         </td>
                         <td className="p-4 text-sm font-semibold text-slate-900 dark:text-slate-300">
                            {student.adm}
                         </td>
                         <td className="p-4">
                           <span className="text-xs font-bold text-slate-900 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full border border-slate-200 dark:border-slate-700">
                              {student.grade}
                           </span>
                         </td>
                         <td className="p-4">
                           <div className="flex items-center gap-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                             <Calendar size={12} /> {learnerView === 'New' ? 'Recently' : (student.createdAt ? new Date(student.createdAt).toLocaleDateString() : 'N/A')}
                           </div>
                         </td>
                         <td className="p-4 text-right pr-0">
                            <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                              student.hasFeeRecord === false 
                                ? 'bg-amber-50 text-amber-600 border border-amber-100 dark:bg-amber-900/30 dark:border-amber-800'
                                : student.balance > 0 
                                ? 'bg-orange-50 text-orange-600 border border-orange-100 dark:bg-orange-900/30 dark:border-orange-800' 
                                : 'bg-green-50 text-green-600 border border-green-100 dark:bg-green-900/30 dark:border-green-800'
                            }`}>
                               {student.hasFeeRecord === false 
                                 ? 'Need Action' 
                                 : student.balance > 0 
                                 ? `KES ${student.balance.toLocaleString()}` 
                                 : 'Cleared'}
                            </span>
                         </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  
                  {learnerView === 'New' && recentEnrollments.length === 0 && (
                     <div className="py-12 text-center text-slate-900 dark:text-slate-400 text-sm font-semibold w-full">
                        No recent enrollments available in this directory preview.
                     </div>
                  )}
                  {learnerView === 'All' && allStudents.filter(s => {
                      const matchSearch = s.name.toLowerCase().includes(learnerSearch.toLowerCase()) || s.adm.toLowerCase().includes(learnerSearch.toLowerCase());
                      const matchGrade = learnerGrade === 'All' || s.grade === learnerGrade;
                      return matchSearch && matchGrade;
                  }).length === 0 && (
                     <div className="py-12 text-center text-slate-900 dark:text-slate-400 text-sm font-semibold w-full">
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
                   <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Staff Directory</h3>
                   <div className="flex gap-2">
                     <button 
                       onClick={() => setStaffFilter('TEACHER')}
                       className={`text-xs font-bold px-3 py-1 rounded-full cursor-pointer transition-all ${staffFilter === 'TEACHER' ? 'text-white bg-orange-600 shadow-sm' : 'text-slate-900 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600'}`}
                     >
                       Teaching Staff
                     </button>
                     <button 
                       onClick={() => setStaffFilter('NON_TEACHER')}
                       className={`text-xs font-bold px-3 py-1 rounded-full cursor-pointer transition-all ${staffFilter === 'NON_TEACHER' ? 'text-white bg-orange-600 shadow-sm' : 'text-slate-900 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600'}`}
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
                     <tr className="border-b border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-400 dark:text-slate-500 tracking-tight">
                       <th className="p-4 pl-0">Full Name</th>
                       <th className="p-4">Phone Number</th>
                       <th className="p-4">Role / TSC</th>
                       <th className="p-4">Staff ID</th>
                       <th className="p-4 text-right pr-0">Status</th>
                     </tr>
                   </thead>
                   <tbody className="text-sm text-slate-900 dark:text-slate-300">
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
                              <span className="text-xs font-mono bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded text-slate-900 dark:text-slate-300">
                                {member.tc || member.role}
                              </span>
                            </td>
                            <td className="p-4 text-slate-500 dark:text-slate-400 text-xs">#{member.id?.substring(0, 6)}</td>
                            <td className="p-4 text-right pr-0">
                               <span className={`text-[10px] font-bold tracking-tight px-2 py-1 rounded-md bg-green-50 text-green-600 dark:bg-green-900/20`}>
                                 Active
                               </span>
                            </td>
                          </tr>
                        ))
                     ) : (
                       <tr>
                         <td colSpan={5} className="p-8 text-center text-slate-900 dark:text-slate-400 text-xs italic">
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
                   <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Fee Collection Progress</h3>
                   <p className="text-xs text-slate-500 dark:text-slate-400">Horizontal bar analysis of targets vs collected</p>
                 </div>
                 <div className="flex gap-4">
                   <div className="flex items-center gap-2 text-[11px] font-black text-slate-600 dark:text-slate-300 tracking-tight bg-slate-50 dark:bg-slate-700 px-3 py-1.5 rounded-full">
                     <span className="w-2.5 h-2.5 rounded-full bg-[#6b8e23]"></span> Target
                   </div>
                   <div className="flex items-center gap-2 text-[11px] font-black text-slate-600 dark:text-slate-300 tracking-tight bg-slate-50 dark:bg-slate-700 px-3 py-1.5 rounded-full">
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
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">CBC Assessment Tracker</h3>
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
                            <p className="text-sm font-bold text-slate-900 dark:text-slate-300">Lower Primary</p>
                            <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 tracking-widest mt-0.5">Syllabus Covered</p>
                          </div>
                          <span className="text-lg font-bold text-orange-600">0%</span>
                       </div>
                       <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-[1.5rem] flex items-center justify-between border border-slate-100 dark:border-slate-600">
                          <div>
                            <p className="text-sm font-bold text-slate-900 dark:text-slate-300">Junior Secondary</p>
                            <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 tracking-widest mt-0.5">Syllabus Covered</p>
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
                          <div className="flex justify-between text-xs font-bold text-black dark:text-slate-300 mb-2">
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

          <AnimatePresence>
            {showTeacherSwitcher && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                {/* Backdrop overlay */}
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setShowTeacherSwitcher(false)}
                  className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm cursor-pointer"
                />

                {/* Modal box */}
                <motion.div 
                  initial={{ scale: 0.95, opacity: 0, y: 10 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.95, opacity: 0, y: 10 }}
                  transition={{ type: 'spring', duration: 0.4 }}
                  className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xl rounded-3xl p-6 max-w-md w-full mx-4 relative z-10 flex flex-col max-h-[85vh]"
                >
                  {/* Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                        <Users size={20} className="text-indigo-600" /> Switch Portal
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
                        Impersonate a teacher to view their classes & grading.
                      </p>
                    </div>
                    <button 
                      onClick={() => setShowTeacherSwitcher(false)}
                      className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors cursor-pointer"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  {/* Search Input */}
                  <div className="relative mb-4">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input 
                      type="text" 
                      placeholder="Search teacher by name or email..."
                      value={switcherSearch}
                      onChange={(e) => setSwitcherSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs md:text-sm text-black dark:text-white focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium transition-all"
                    />
                  </div>

                  {/* Teachers List */}
                  <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[200px] max-h-[40vh]">
                    {teachersList.length > 0 ? (
                      teachersList.map((t) => {
                        const initials = (t.name || 'T')
                          .split(' ')
                          .filter(Boolean)
                          .map((n: string) => n[0])
                          .slice(0, 2)
                          .join('')
                          .toUpperCase();
                        
                        return (
                          <button
                            key={t.id || t.email}
                            onClick={() => {
                              if (onImpersonateTeacher) {
                                onImpersonateTeacher(t);
                              }
                              setShowTeacherSwitcher(false);
                            }}
                            className="w-full text-left p-3 rounded-2xl border border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all flex items-center gap-3 cursor-pointer group"
                          >
                            <div className="h-10 w-10 rounded-full bg-indigo-100 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 font-bold flex items-center justify-center border border-indigo-200/20 group-hover:scale-105 transition-transform">
                              {initials}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-bold text-slate-800 dark:text-white text-sm truncate">{t.name}</p>
                              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium truncate mt-0.5">
                                {t.classTeacherOf ? `${t.classTeacherOf} ${t.stream || ''} Class Teacher` : 'Subject Teacher'}
                              </p>
                            </div>
                            <ChevronRight size={16} className="text-slate-400 group-hover:translate-x-1 transition-transform ml-auto" />
                          </button>
                        );
                      })
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-sm font-semibold text-slate-400 dark:text-slate-500">No teachers found matching your search.</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

        </div>
      </div>
    </div>
  );
};

export default Dashboard;


