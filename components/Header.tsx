
import React from 'react';
import { UserRole } from '../types';
import { ACADEMIC_PERIODS } from '../constants';
import { Search, Bell, Menu, Sun, Moon, UserCircle, Settings, Wallet, Clock, Receipt, FileText, Bus, Info, ChevronDown, Calendar, AlertTriangle, Shield, Users, LayoutDashboard, BookOpen, MessageSquare, Home, UserPlus, Banknote, ShieldCheck, Activity, Zap, Landmark, Layers, ClipboardCheck, Utensils, Stethoscope, HeartPulse, History, BarChart3, Monitor, LayoutGrid, List, Send, Palette, Briefcase } from 'lucide-react';
import { auth, db } from '../src/firebase';
import { signOut } from 'firebase/auth';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';

interface HeaderProps {
  role: UserRole;
  activeTab?: string;
  selectedStudent?: any;
  academicPeriod: string;
  setAcademicPeriod: (p: string) => void;
  setIsSidebarOpen: (o: any) => void;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  canGoBack?: boolean;
  handleBack?: () => void;
  setActiveFeeTab?: (tab: string) => void;
  activeFeeTab?: string;
  setActiveTab?: (tab: string) => void;
  dashboardTab?: string;
  setDashboardTab?: (tab: string) => void;
  studentsTab?: 'directory' | 'classrooms';
  setStudentsTab?: (tab: 'directory' | 'classrooms') => void;
  timetableTerm?: string;
  setTimetableTerm?: (term: string) => void;
  financeTab?: 'collections' | 'expenses' | 'etims' | 'analytics' | 'settings' | 'fee-per-class';
  setFinanceTab?: (tab: 'collections' | 'expenses' | 'etims' | 'analytics' | 'settings' | 'fee-per-class') => void;
  collectionsTab?: 'graph' | 'quickpay' | 'net' | 'arrears' | 'directory';
  setCollectionsTab?: (tab: 'graph' | 'quickpay' | 'net' | 'arrears' | 'directory') => void;
  bankTab?: 'overview' | 'transactions';
  setBankTab?: (tab: 'overview' | 'transactions') => void;
  academicTab?: 'hierarchy' | 'assessments' | 'reports';
  setAcademicTab?: (tab: 'hierarchy' | 'assessments' | 'reports') => void;
  boardingTab?: 'dorms' | 'exeats' | 'pocket-money' | 'meals';
  setBoardingTab?: (tab: 'dorms' | 'exeats' | 'pocket-money' | 'meals') => void;
  communicationTab?: 'Overview' | 'Compose' | 'Support Inbox' | 'History' | 'Templates';
  setCommunicationTab?: (tab: 'Overview' | 'Compose' | 'Support Inbox' | 'History' | 'Templates') => void;
  healthTab?: 'logs' | 'profiles';
  setHealthTab?: (tab: 'logs' | 'profiles') => void;
  eventsTab?: 'grid' | 'list';
  setEventsTab?: (tab: 'grid' | 'list') => void;
  assetsTab?: 'registry' | 'maintenance' | 'analytics' | 'vendors' | 'purchase-orders';
  setAssetsTab?: (tab: 'registry' | 'maintenance' | 'analytics' | 'vendors' | 'purchase-orders') => void;
  enabledModules?: string[];
}

const Header: React.FC<HeaderProps> = ({ 
  role, 
  activeTab,
  selectedStudent,
  academicPeriod, 
  setAcademicPeriod, 
  setIsSidebarOpen, 
  isDarkMode, 
  toggleDarkMode,
  canGoBack,
  handleBack,
  setActiveFeeTab,
  activeFeeTab,
  setActiveTab,
  dashboardTab,
  setDashboardTab,
  studentsTab,
  setStudentsTab,
  timetableTerm,
  setTimetableTerm,
  financeTab,
  setFinanceTab,
  collectionsTab,
  setCollectionsTab,
  bankTab,
  setBankTab,
  academicTab,
  setAcademicTab,
  boardingTab,
  setBoardingTab,
  communicationTab,
  setCommunicationTab,
  healthTab,
  setHealthTab,
  eventsTab,
  setEventsTab,
  assetsTab,
  setAssetsTab,
  enabledModules = []
}) => {
  const [profilePhoto, setProfilePhoto] = React.useState<string | null>(null);
  const [userName, setUserName] = React.useState<string | null>(null);

  React.useEffect(() => {
    let unsubscribeUser: () => void;
    let unsubscribeStaff: () => void;

    const setupListeners = async () => {
      const user = auth.currentUser;
      if (!user) return;

      // Listen to the users collection
      unsubscribeUser = onSnapshot(doc(db, 'users', user.uid), (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.profilePhoto) setProfilePhoto(data.profilePhoto);
          if (data.name || data.displayName) setUserName(data.name || data.displayName);
        }
      });

      // Listen to the staff collection (for teachers/finance)
      unsubscribeStaff = onSnapshot(doc(db, 'staff', user.uid), (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.profilePhoto) setProfilePhoto(data.profilePhoto);
          if (data.name || data.staffName) setUserName(data.name || data.staffName);
        }
      });
    };

    setupListeners();

    return () => {
      if (unsubscribeUser) unsubscribeUser();
      if (unsubscribeStaff) unsubscribeStaff();
    };
  }, []);

  return (
    <header className={`min-h-[5rem] h-auto py-5 ${['PARENT', 'ADMIN', 'DIRECTOR'].includes(role) ? 'bg-slate-950' : 'bg-orange-600'} dark:bg-slate-900 border-b border-white/10 flex items-center justify-between px-4 md:px-8 sticky top-0 z-[100] transition-all duration-300`}>
      <div className="flex items-center gap-4 flex-1">
        <button 
          onClick={() => setIsSidebarOpen((prev: boolean) => !prev)}
          className="p-3 text-white/80 hover:text-white hover:bg-white/10 rounded-2xl transition-all"
          title="Open Navigation"
        >
          <Menu size={24} />
        </button>

        {/* Mobile Brand/Title */}
        <div className="md:hidden">
          <p className="text-sm font-black text-white tracking-widest">
            {(() => {
              const tabLabels: Record<string, string> = {
                dashboard: 'Dashboard',
                home: 'Dashboard',
                finance: 'Fees & Finance',
                students: 'Students',
                academics: 'Academics',
                timetable: 'Timetable',
                boarding: 'Boarding',
                communication: 'Communication',
                health: 'Student Health',
                attendance: 'Attendance',
                'attendance-register': 'Attendance',
                transport: 'Transport Services',
                driver: 'Driver Portal',
                inventory: 'Inventory',
                assets: 'Assets',
                analytics: 'Analytics',
                'finance-analytics': 'Finance Analytics',
                events: 'News & Events',
                bank: 'Bank Accounts',
                admin: 'Administration',
                staff: 'Staff Management',
                'staff-management': 'Staff Management',
                'class-management': 'Class Management',
                profile: 'School Profile',
                settings: 'Settings',
                teacher: 'Teacher Portal',
                'register-learner': 'Register Learner',
                'edit-learner': 'Edit Learner',
              };
              if (activeTab && tabLabels[activeTab]) return tabLabels[activeTab];
              if (activeTab?.startsWith('parent')) return 'Parent Portal';
              return 'BrightSoma';
            })()}
          </p>
        </div>
        
        {/* Search - Only on Dashboard or non-parent roles */}
        {(role !== 'PARENT' || activeTab === 'parent-dashboard') && (
          <div className="relative max-w-md w-full hidden md:block group">
            <input 
              type="text" 
              placeholder="Search Intelligence..." 
              className="w-full px-6 py-3.5 bg-white/10 dark:bg-slate-800 border border-white/10 dark:border-slate-700 rounded-full text-sm font-medium text-white placeholder:text-white/40 focus:outline-none focus:ring-4 focus:ring-white/10 focus:bg-white/20 dark:focus:bg-slate-700 shadow-sm transition-all"
            />
          </div>
        )}

        {/* Global Navigation Shortcuts for Admin/Director - Only on Dashboard */}
        {['ADMIN', 'DIRECTOR', 'PRINCIPAL', 'HEADTEACHER'].includes(role) && activeTab === 'dashboard' && (
          <div className="hidden xl:flex items-center gap-1.5 ml-6 overflow-x-auto no-scrollbar">
             {[
               { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
               { id: 'students', label: 'Students', icon: Users },
               { id: 'finance', label: 'Fees', icon: Wallet },
               { id: 'academics', label: 'Academics', icon: BookOpen },
               { id: 'communication', label: 'Communication', icon: MessageSquare }
             ].filter(item => item.id === 'dashboard' || enabledModules.includes(item.id)).map(item => (
               <button 
                 key={item.id} 
                 onClick={() => {
                   setDashboardTab?.(item.label);
                   setActiveTab?.('dashboard');
                 }}
                 className={`px-4 py-2 flex items-center gap-2 text-[11px] font-black rounded-xl transition-all whitespace-nowrap ${ (activeTab === 'dashboard' && dashboardTab === item.label) || (item.id === 'dashboard' && activeTab === 'dashboard' && !dashboardTab) ? 'text-white bg-white/20 shadow-lg border border-white/10' : 'text-white/60 hover:text-white hover:bg-white/10' }`}
               >
                 <item.icon size={12} />
                 {item.label}
               </button>
             ))}
          </div>
        )}

        {/* Specialized Parent Fees Header Content */}
        {role === 'PARENT' && activeTab === 'parent-fees' && (
          <div className="hidden xl:flex items-center gap-3 ml-6 overflow-x-auto no-scrollbar">
             <button className="flex items-center gap-2 px-5 py-2 bg-emerald-500 text-white font-black rounded-xl shadow-lg text-[11px] hover:bg-emerald-600 transition-all active:scale-95 whitespace-nowrap">
               <Wallet size={14} /> Pay School Fees
             </button>

             <div className="h-8 w-px bg-white/10 mx-2" />

             {/* Arrears Indicator */}
             <div className="flex items-center gap-2 px-4 py-2 bg-red-600/90 text-white rounded-xl shadow-lg border border-red-500/50 animate-pulse">
                <AlertTriangle size={12} className="text-white" />
                <div className="flex flex-col">
                   <p className="text-[7px] font-black leading-none opacity-80">School Fees Arrears</p>
                   <p className="text-[11px] font-black leading-none">21,200</p>
                </div>
             </div>

             <div className="h-8 w-px bg-white/10 mx-2" />

             <div className="flex items-center gap-1.5">
                {[
                  { id: 'due', label: 'Due Payments', icon: Clock, color: 'bg-rose-600' },
                  { id: 'receipts', label: 'Transactions', icon: Receipt },
                  { id: 'structure', label: 'Fee Structure', icon: FileText },
                  { id: 'transport', label: 'Transport', icon: Bus },
                  { id: 'policy', icon: Info, label: 'Policy' },
                  { id: 'term1', label: 'Term 1', icon: Calendar },
                  { id: 'term2', label: 'Term 2', icon: Calendar },
                  { id: 'term3', label: 'Term 3', icon: Calendar },
                  { id: 'year', label: '2026', icon: Calendar }
                ].map(item => (
                  <button 
                    key={item.id} 
                    onClick={() => setActiveFeeTab && setActiveFeeTab(item.id)}
                    className={`px-3 py-2 flex items-center gap-2 text-[10px] font-bold rounded-xl transition-all whitespace-nowrap ${ activeFeeTab === item.id ? (item.id === 'due' ? 'text-white bg-rose-600 shadow-xl' : 'text-white bg-white/20 shadow-lg') : 'text-white/60 hover:text-white hover:bg-white/10' }`}
                  >
                    <item.icon size={12} />
                    {item.label}
                  </button>
                ))}
             </div>
          </div>
        )}

        {/* Specialized Academic Header Content */}
        {['ADMIN', 'DIRECTOR', 'PRINCIPAL', 'HEADTEACHER'].includes(role) && activeTab === 'academics' && (
          <div className="hidden xl:flex items-center gap-1.5 ml-6 overflow-x-auto no-scrollbar">
             {[
               { id: 'hierarchy', label: 'School Structure', icon: Layers },
               { id: 'assessments', label: 'Learner Marks', icon: ClipboardCheck },
               { id: 'reports', label: 'Progress Reports', icon: FileText }
             ].map(item => (
               <button 
                 key={item.id} 
                 onClick={() => setAcademicTab && setAcademicTab(item.id as any)}
                 className={`px-5 py-2.5 flex items-center gap-2 text-[11px] font-black rounded-full transition-all whitespace-nowrap ${ academicTab === item.id ? 'text-white bg-white/20 shadow-lg border border-white/10' : 'text-white/60 hover:text-white hover:bg-white/10' }`}
               >
                 <item.icon size={13} />
                 {item.label}
               </button>
             ))}
          </div>
        )}

        {/* Specialized Boarding Header Content */}
        {['ADMIN', 'DIRECTOR', 'PRINCIPAL', 'HEADTEACHER'].includes(role) && activeTab === 'boarding' && (
          <div className="hidden xl:flex items-center gap-1.5 ml-6 overflow-x-auto no-scrollbar">
             {[
               { id: 'dorms', label: 'Houses', icon: Home },
               { id: 'exeats', label: 'Leave Requests', icon: Calendar },
               { id: 'pocket-money', label: 'Pocket Money', icon: Wallet },
               { id: 'meals', label: 'Meal Plan', icon: Utensils }
             ].map(item => (
               <button 
                 key={item.id} 
                 onClick={() => setBoardingTab && setBoardingTab(item.id as any)}
                 className={`px-5 py-2.5 flex items-center gap-2 text-[11px] font-black rounded-full transition-all whitespace-nowrap ${ boardingTab === item.id ? 'text-white bg-white/20 shadow-lg border border-white/10' : 'text-white/60 hover:text-white hover:bg-white/10' }`}
               >
                 <item.icon size={13} />
                 {item.label}
               </button>
             ))}
          </div>
        )}

        {/* Specialized Banking Header Content */}
        {['ADMIN', 'DIRECTOR', 'PRINCIPAL', 'HEADTEACHER'].includes(role) && activeTab === 'bank' && (
          <div className="hidden xl:flex items-center gap-1.5 ml-6 overflow-x-auto no-scrollbar">
             {[
               { id: 'overview', label: 'Overview', icon: Landmark },
               { id: 'transactions', label: 'Transactions', icon: Wallet }
             ].map(item => (
               <button 
                 key={item.id} 
                 onClick={() => setBankTab && setBankTab(item.id as any)}
                 className={`px-5 py-2.5 flex items-center gap-2 text-[11px] font-black rounded-full transition-all whitespace-nowrap ${ bankTab === item.id ? 'text-white bg-white/20 shadow-lg border border-white/10' : 'text-white/60 hover:text-white hover:bg-white/10' }`}
               >
                 <item.icon size={13} />
                 {item.label}
               </button>
             ))}
          </div>
        )}

        {/* Specialized Finance Header Content */}
        {['ADMIN', 'DIRECTOR', 'PRINCIPAL', 'HEADTEACHER', 'FINANCE'].includes(role) && ['finance', 'fee-per-class'].includes(activeTab || '') && (
          <div className="hidden xl:flex flex-col gap-3 ml-2 py-2">
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
               {[
                 { id: 'collections', label: 'Fee Collections', icon: Wallet },
                 { id: 'expenses', label: 'Operating Expenses', icon: Banknote },
                 { id: 'etims', label: 'KRA eTIMS', icon: ShieldCheck },
                 { id: 'analytics', label: 'Termly Analytics', icon: Activity },
                 { id: 'settings', label: 'Fee Structure', icon: Settings },
                 { id: 'fee-per-class', label: 'Fee per Class', icon: Users }
               ].map(item => {
                 const isSubActive = (activeTab === 'fee-per-class' && item.id === 'fee-per-class') || (activeTab === 'finance' && financeTab === item.id);
                 return (
                   <button 
                     key={item.id} 
                     onClick={() => {
                       if (setFinanceTab) setFinanceTab(item.id as any);
                       if (setActiveTab) {
                         if (item.id === 'fee-per-class') {
                           setActiveTab('fee-per-class');
                         } else {
                           setActiveTab('finance');
                         }
                       }
                     }}
                     className={`px-4 py-2 flex items-center gap-2 text-[10px] font-black rounded-full transition-all whitespace-nowrap ${ isSubActive ? 'text-white bg-white/20 shadow-lg border border-white/10' : 'text-white/60 hover:text-white hover:bg-white/10' }`}
                   >
                     <item.icon size={12} />
                     {item.label}
                   </button>
                 );
               })}
            </div>
            
            {activeTab === 'finance' && financeTab === 'collections' && (
              <div className="flex items-center gap-2 mt-1 overflow-x-auto no-scrollbar pb-1">
                {[
                  { id: 'graph', label: 'Collection Velocity', icon: Activity },
                  { id: 'quickpay', label: 'Quick Pay', icon: Zap },
                  { id: 'net', label: 'Net Collections', icon: Wallet },
                  { id: 'arrears', label: 'Projected Arrears', icon: AlertTriangle },
                  { id: 'directory', label: 'Learner Fee Directory', icon: Users }
                ].map(sub => (
                  <button 
                     key={sub.id} 
                     onClick={() => setCollectionsTab && setCollectionsTab(sub.id as any)}
                     className={`px-4 py-2 flex items-center gap-2 text-[11px] font-black rounded-xl transition-all whitespace-nowrap border ${ collectionsTab === sub.id ? 'text-orange-600 bg-white shadow-xl border-white scale-105' : 'text-white bg-white/10 hover:bg-white/20 border-white/5' }`}
                  >
                     <sub.icon size={12} className={collectionsTab === sub.id ? 'text-orange-600' : 'text-white/70'} />
                     {sub.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Specialized Timetable Header Content */}
        {['ADMIN', 'DIRECTOR', 'PRINCIPAL', 'HEADTEACHER', 'TEACHER'].includes(role) && activeTab === 'timetable' && (
          <div className="hidden xl:flex items-center gap-1.5 ml-6 overflow-x-auto no-scrollbar">
             {['Term 1', 'Term 2', 'Term 3'].map(term => (
               <button 
                 key={term} 
                 onClick={() => setTimetableTerm && setTimetableTerm(term)}
                 className={`px-5 py-2.5 flex items-center gap-2 text-[11px] font-black rounded-full transition-all whitespace-nowrap ${ timetableTerm === term ? 'text-white bg-white/20 shadow-lg border border-white/10' : 'text-white/60 hover:text-white hover:bg-white/10' }`}
               >
                 <Calendar size={13} />
                 {term}
               </button>
             ))}
          </div>
        )}

        {/* Specialized Students Header Content */}
        {['ADMIN', 'DIRECTOR', 'PRINCIPAL', 'HEADTEACHER', 'TEACHER'].includes(role) && (activeTab === 'students' || activeTab === 'class-management') && (
          <div className="hidden xl:flex items-center gap-1.5 ml-6 overflow-x-auto no-scrollbar">
             {[
               { id: 'directory', label: 'Directory', icon: Users },
               { id: 'classrooms', label: 'Classrooms', icon: Home }
             ].map(item => (
               <button 
                 key={item.id} 
                 onClick={() => setStudentsTab && setStudentsTab(item.id as any)}
                 className={`px-5 py-2.5 flex items-center gap-2 text-[11px] font-black rounded-full transition-all whitespace-nowrap ${ studentsTab === item.id ? 'text-white bg-white/20 shadow-lg border border-white/10' : 'text-white/60 hover:text-white hover:bg-white/10' }`}
               >
                 <item.icon size={13} />
                 {item.label}
               </button>
             ))}
             
             <div className="h-8 w-[1px] bg-white/10 mx-2"></div>
             
             <button 
               onClick={() => setActiveTab && setActiveTab('register-learner')}
               className="flex items-center gap-2 px-6 py-2.5 bg-orange-600 text-white rounded-full text-[11px] font-black hover:bg-orange-700 transition-all shadow-lg shadow-orange-600/20 active:scale-95 whitespace-nowrap"
             >
               <UserPlus size={14} />
               Register Learner
             </button>
          </div>
        )}

        {/* Specialized Admin/Profile Header Content */}
        {['ADMIN', 'DIRECTOR', 'PRINCIPAL', 'HEADTEACHER'].includes(role) && ['admin', 'staff-management', 'staff', 'profile', 'settings'].includes(activeTab || '') && (
          <div className="hidden xl:flex items-center gap-1.5 ml-6 overflow-x-auto no-scrollbar">
             {[
               { id: 'profile', label: 'School Profile', icon: Shield },
               { id: 'admin', label: 'Staff Management', icon: Users },
               { id: 'settings', label: 'System Settings', icon: Settings }
             ].map(item => (
               <button 
                 key={item.id} 
                 onClick={() => setActiveTab && setActiveTab(item.id)}
                 className={`px-4 py-2 flex items-center gap-2 text-[11px] font-black rounded-xl transition-all whitespace-nowrap ${ (activeTab === item.id || (item.id === 'admin' && ['staff-management', 'staff'].includes(activeTab || ''))) ? 'text-white bg-white/20 shadow-lg border border-white/10' : 'text-white/60 hover:text-white hover:bg-white/10' }`}
               >
                 <item.icon size={12} />
                 {item.label}
               </button>
             ))}
          </div>
        )}

        {/* Specialized Communication Header Content */}
        {['ADMIN', 'DIRECTOR', 'PRINCIPAL', 'HEADTEACHER', 'TEACHER', 'FINANCE'].includes(role) && activeTab === 'communication' && (
          <div className="hidden xl:flex items-center gap-1.5 ml-6 overflow-x-auto no-scrollbar">
             {[
               { id: 'Overview', label: 'Overview', icon: Info },
               { id: 'Compose', label: 'Compose', icon: Send },
               ...(role === 'ADMIN' || role === 'DIRECTOR' || role === 'PLATFORM_ADMIN' ? [{ id: 'Support Inbox', label: 'Support Inbox', icon: MessageSquare }] : []),
               { id: 'History', label: 'History', icon: History },
               { id: 'Templates', label: 'Templates', icon: FileText }
             ].map(item => (
               <button 
                 key={item.id} 
                 onClick={() => setCommunicationTab && setCommunicationTab(item.id as any)}
                 className={`px-5 py-2.5 flex items-center gap-2 text-[11px] font-black rounded-full transition-all whitespace-nowrap ${ communicationTab === item.id ? 'text-white bg-white/20 shadow-lg border border-white/10' : 'text-white/60 hover:text-white hover:bg-white/10' }`}
               >
                 <item.icon size={13} />
                 {item.label}
               </button>
             ))}
          </div>
        )}

        {/* Specialized Health Header Content */}
        {['ADMIN', 'DIRECTOR', 'PRINCIPAL', 'HEADTEACHER', 'TEACHER'].includes(role) && activeTab === 'health' && (
          <div className="hidden xl:flex items-center gap-1.5 ml-6 overflow-x-auto no-scrollbar">
             {[
               { id: 'logs', label: 'Recent Logs', icon: Activity },
               { id: 'profiles', label: 'Health Profiles', icon: HeartPulse }
             ].map(item => (
               <button 
                 key={item.id} 
                 onClick={() => setHealthTab && setHealthTab(item.id as any)}
                 className={`px-5 py-2.5 flex items-center gap-2 text-[11px] font-black rounded-full transition-all whitespace-nowrap ${ healthTab === item.id ? 'text-white bg-white/20 shadow-lg border border-white/10' : 'text-white/60 hover:text-white hover:bg-white/10' }`}
               >
                 <item.icon size={13} />
                 {item.label}
               </button>
             ))}
          </div>
        )}

        {/* Specialized Events Header Content */}
        {['ADMIN', 'DIRECTOR', 'PRINCIPAL', 'HEADTEACHER', 'TEACHER'].includes(role) && activeTab === 'events' && (
          <div className="hidden xl:flex items-center gap-1.5 ml-6 overflow-x-auto no-scrollbar">
             {[
               { id: 'grid', label: 'Grid View', icon: LayoutGrid },
               { id: 'list', label: 'List View', icon: List }
             ].map(item => (
               <button 
                 key={item.id} 
                 onClick={() => setEventsTab && setEventsTab(item.id as any)}
                 className={`px-5 py-2.5 flex items-center gap-2 text-[11px] font-black rounded-full transition-all whitespace-nowrap ${ eventsTab === item.id ? 'text-white bg-white/20 shadow-lg border border-white/10' : 'text-white/60 hover:text-white hover:bg-white/10' }`}
               >
                 <item.icon size={13} />
                 {item.label}
               </button>
             ))}
          </div>
        )}

        {/* Specialized Assets Header Content */}
        {['ADMIN', 'DIRECTOR', 'PRINCIPAL', 'HEADTEACHER', 'FINANCE'].includes(role) && activeTab === 'assets' && (
          <div className="hidden xl:flex items-center gap-1.5 ml-6 overflow-x-auto no-scrollbar">
             {[
               { id: 'registry', label: 'Asset Registry', icon: Briefcase },
               { id: 'maintenance', label: 'Maintenance History', icon: History },
               { id: 'analytics', label: 'Asset Analytics', icon: BarChart3 },
               { id: 'vendors', label: 'Vendors', icon: Users },
               { id: 'purchase-orders', label: 'Purchase Orders', icon: FileText }
             ].map(item => (
               <button 
                 key={item.id} 
                 onClick={() => setAssetsTab && setAssetsTab(item.id as any)}
                 className={`px-5 py-2.5 flex items-center gap-2 text-[11px] font-black rounded-full transition-all whitespace-nowrap ${ assetsTab === item.id ? 'text-white bg-white/20 shadow-lg border border-white/10' : 'text-white/60 hover:text-white hover:bg-white/10' }`}
               >
                 <item.icon size={13} />
                 {item.label}
               </button>
             ))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 md:gap-6">
        <button 
          onClick={toggleDarkMode}
          className="p-3 text-white/80 hover:text-white hover:bg-white/10 rounded-2xl transition-all"
          title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          {isDarkMode ? <Sun size={20} className="text-amber-400" /> : <Moon size={20} />}
        </button>

        {/* Academic Period & Bell - Only on Dashboard or non-parent roles */}
        {(role !== 'PARENT' || activeTab === 'parent-dashboard') && (
          <>
            <div className="hidden sm:flex items-center gap-2">
              <select 
                value={academicPeriod} 
                onChange={(e) => setAcademicPeriod(e.target.value)}
                className="text-[12px] font-bold text-white dark:text-slate-400 bg-white/10 dark:bg-slate-800 border border-white/10 dark:border-slate-700 rounded-[1rem] px-6 py-2.5 cursor-pointer focus:ring-2 focus:ring-white/20 transition-all appearance-none"
              >
                {ACADEMIC_PERIODS.map(p => <option key={p} value={p} className="text-slate-900 dark:text-slate-200">{p}</option>)}
              </select>
            </div>

            <button className="p-3 text-white/80 hover:text-white hover:bg-white/10 rounded-2xl transition-all relative">
              <Bell size={20} />
              <span className="absolute top-3 right-3 w-2 h-2 bg-rose-500 rounded-full border-2 border-orange-600 dark:border-slate-800 shadow-sm"></span>
            </button>
          </>
        )}

        <div className="h-8 w-[1px] bg-white/10 dark:bg-slate-800 mx-2 hidden sm:block"></div>

        <div className="flex items-center gap-3 pl-2 group cursor-pointer relative">
          {/* Profile Name - Only on Dashboard or non-parent roles */}
          {(role !== 'PARENT' || activeTab === 'parent-dashboard') && (
            <div className="text-right hidden sm:block">
              {userName && (
                <p className="text-sm font-bold text-white leading-none mb-1">
                  Welcome Back, {userName.split(' ').map(n => n.charAt(0).toUpperCase() + n.slice(1).toLowerCase()).join(' ')}
                </p>
              )}
              <p className="text-[11px] font-bold text-white/60 leading-none tracking-widest">
                {role.charAt(0).toUpperCase() + role.slice(1).toLowerCase()}
              </p>
            </div>
          )}
          <div className="w-12 h-12 rounded-[1.25rem] bg-white/10 text-white flex items-center justify-center shadow-sm border border-white/10 transition-all group-hover:rotate-6 group-hover:scale-110 overflow-hidden">
            {profilePhoto ? (
              <img src={profilePhoto} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <UserCircle size={28} />
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;

