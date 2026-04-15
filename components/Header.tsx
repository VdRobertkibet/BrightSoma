
import React from 'react';
import { UserRole } from '../types';
import { ACADEMIC_PERIODS } from '../constants';
import { Search, Bell, Menu, Sun, Moon, UserCircle, Settings } from 'lucide-react';
import { auth, db } from '../src/firebase';
import { signOut } from 'firebase/auth';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';

interface HeaderProps {
  role: UserRole;
  academicPeriod: string;
  setAcademicPeriod: (p: string) => void;
  setIsSidebarOpen: (o: any) => void;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  canGoBack?: boolean;
  handleBack?: () => void;
}

const Header: React.FC<HeaderProps> = ({ 
  role, 
  academicPeriod, 
  setAcademicPeriod, 
  setIsSidebarOpen, 
  isDarkMode, 
  toggleDarkMode,
  canGoBack,
  handleBack
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
    <header className="h-20 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between px-4 md:px-8 sticky top-0 z-30 transition-colors duration-300">
      <div className="flex items-center gap-4 flex-1">
        {canGoBack && (
          <button 
            onClick={handleBack}
            className="p-2 mr-2 text-slate-500 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/30 rounded-full transition-all flex items-center gap-1 group"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-arrow-left group-hover:-translate-x-1 transition-transform"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
            <span className="text-[11px] font-bold uppercase tracking-widest hidden sm:block">Back</span>
          </button>
        )}
        
        <div className="relative max-w-md w-full hidden md:block group">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-orange-500 transition-colors" size={18} />
          <input 
            type="text" 
            placeholder="Search Intelligence..." 
            className="w-full pl-14 pr-6 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-full text-[11px] font-bold uppercase text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:bg-white dark:focus:bg-slate-700 shadow-sm transition-all"
          />
        </div>
      </div>

      <div className="flex items-center gap-3 md:gap-6">
        <button 
          onClick={toggleDarkMode}
          className="p-3 text-slate-400 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/30 rounded-2xl transition-all"
          title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          {isDarkMode ? <Sun size={20} className="text-amber-400" /> : <Moon size={20} />}
        </button>

        <div className="hidden sm:flex items-center gap-2">
          <select 
            value={academicPeriod} 
            onChange={(e) => setAcademicPeriod(e.target.value)}
            className="text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-[1rem] px-6 py-2.5 cursor-pointer focus:ring-2 focus:ring-orange-500/20 transition-all uppercase"
          >
            {ACADEMIC_PERIODS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>

        <button className="p-3 text-slate-400 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/30 rounded-2xl transition-all relative">
          <Bell size={20} />
          <span className="absolute top-3 right-3 w-2 h-2 bg-rose-500 rounded-full border-2 border-white dark:border-slate-800 shadow-sm"></span>
        </button>

        <div className="h-8 w-[1px] bg-slate-100 dark:bg-slate-800 mx-2 hidden sm:block"></div>

        <div className="flex items-center gap-3 pl-2 group cursor-pointer relative">
          <div className="text-right hidden sm:block">
            {userName && (
              <p className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-none mb-1">
                {userName}
              </p>
            )}
            <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 leading-none uppercase tracking-widest">
              {role}
            </p>
          </div>
          <div className="w-12 h-12 rounded-[1.25rem] bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 flex items-center justify-center shadow-sm border border-orange-100 dark:border-orange-800 transition-all group-hover:rotate-6 group-hover:scale-110 overflow-hidden">
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
