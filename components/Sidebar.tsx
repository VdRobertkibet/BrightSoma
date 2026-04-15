import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart3, 
  Users, 
  BookOpen, 
  Calendar, 
  CreditCard, 
  Settings, 
  Bell, 
  LogOut, 
  ChevronRight, 
  Shield, 
  MessageSquare,
  GraduationCap,
  X,
  Menu,
  Moon,
  Sun,
  FileText,
  Zap
} from 'lucide-react';

import { UserRole } from '../types';
import { auth, db } from '../src/firebase';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { NAVIGATION_ITEMS } from '../constants';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  role: UserRole;
  edition: 'starter' | 'professional' | 'elite';
  enabledModules: readonly string[];
  logout: () => Promise<void>;
  isDarkMode: boolean;
  schoolId: string | null;
}
const TOOLTIP_TEXTS: Record<string, string> = {
  'dashboard': 'Your school\'s command center. See fees, attendance, and performance in one glance.',
  'students': 'Manage learner records, class assignments, and grade-level info.',
  'academics': 'Record CBC assessments and track learner progress per subject.',
  'finance': 'Collect fees, generate receipts, and manage M-Pesa payments.',
  'timetable': 'Build and view weekly class schedules for all teachers.',
  'communication': 'Send bulk SMS to parents and staff. Manage announcements.',
  'transport': 'Track school buses and manage student boarding in real-time.',
  'boarding': 'Manage dormitories, pocket money, and student movement.',
  'inventory': 'Track school assets, stock levels, and supplier records.',
  'health': 'Log health incidents and manage student medical records.',
  'analytics': 'Visual reports on fees, attendance, and CBC performance.',
  'profile': 'Update school info, manage admin security, and branding.',
  'platform-admin': 'Provision and manage all registered schools on BrightSoma.',
  'finance-analytics': 'View monthly and yearly revenue from all schools across the platform.',
  'teacher': 'Your personal teaching portal for CBC marks and attendance.',
  'parent': 'Track your child\'s performance, fees, and school transport.',
  'driver': 'Manage your assigned route and student boarding status.',
};

const Sidebar: React.FC<SidebarProps> = ({ role, activeTab, setActiveTab, logout, isDarkMode, schoolId, edition = 'starter', isSidebarOpen, setIsSidebarOpen, enabledModules }) => {
  const [profile, setProfile] = useState<any>(null);
  const [hoveredTooltip, setHoveredTooltip] = useState<{ id: string, text: string, top: number } | null>(null);

  useEffect(() => {
    if (!schoolId) return;

    let unsub: (() => void) | undefined;
    
    unsub = onSnapshot(doc(db, 'schools', schoolId), (doc) => {
      if (doc.exists()) setProfile(doc.data());
    });

    return () => unsub?.();
  }, [schoolId]);

  const navigationItems = useMemo(() => {
    return NAVIGATION_ITEMS.filter(item => 
      item.roles.includes(role) && 
      (role === 'PLATFORM_ADMIN' ? true : enabledModules.includes(item.id))
    );
  }, [role, enabledModules]);

  return (
    <>
      {/* Mobile Backdrop */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <aside 
        className={`fixed lg:relative inset-y-0 left-0 z-50 w-72 bg-white dark:bg-slate-900 border-r border-slate-100 dark:border-slate-800 flex flex-col transition-all duration-300 transform 
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        <div className="p-8 flex items-center justify-between lg:justify-start gap-3">
          <div className="flex items-center gap-3">
            {profile?.logo ? (
              <div className="w-10 h-10 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm">
                <img src={profile.logo} alt="Logo" className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="w-10 h-10 bg-orange-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-orange-500/20">
                <GraduationCap size={24} />
              </div>
            )}
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-slate-900 via-slate-700 to-slate-400 dark:from-white dark:to-slate-400 bg-clip-text text-transparent leading-none tracking-tight">
                Bright<span className="text-orange-600">Soma</span>
              </h1>
              <div className="flex items-center gap-1.5 mt-1">
                <div className={`w-2 h-2 rounded-full ${['PLATFORM_ADMIN', 'SUPER_ADMIN'].includes(role) ? 'bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]' : (edition === 'starter' ? 'bg-slate-400' : 'bg-orange-500')} animate-pulse`} />
                <span className="text-[10px] font-bold text-slate-500 capitalize italic">
                  {['PLATFORM_ADMIN', 'SUPER_ADMIN'].includes(role) ? 'Platform Owner' : `${edition} Edition`}
                </span>
              </div>
            </div>
          </div>
          <button 
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            <X size={20} />
          </button>
        </div>


        <nav className="flex-1 px-4 space-y-1 mt-4 overflow-y-auto custom-scrollbar">
          {navigationItems.map((item) => (
            <div 
              key={item.id} 
              className="relative group/nav"
              onMouseEnter={(e) => {
                if (TOOLTIP_TEXTS[item.id]) {
                  const rect = e.currentTarget.getBoundingClientRect();
                  setHoveredTooltip({ id: item.id, text: TOOLTIP_TEXTS[item.id], top: rect.top + rect.height / 2 });
                }
              }}
              onMouseLeave={() => setHoveredTooltip(null)}
            >
              <button
              onClick={() => {
                const targetId = item.id === 'staff-management' ? 'admin' : item.id;
                setActiveTab(targetId);
                if (window.innerWidth < 1024) {
                  setIsSidebarOpen(false);
                }
              }}
              data-id={item.id}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-[1.25rem] transition-all duration-200 group
                ${activeTab === item.id 
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm ring-1 ring-slate-200 dark:ring-slate-700' 
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white'}`}
            >
              <span className={`transition-colors duration-300 ${activeTab === item.id ? 'text-orange-600 dark:text-orange-400 scale-110' : 'text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200'}`}>
                {item.icon}
              </span>
              <div className="flex flex-col items-start text-left">
                <span className="font-semibold text-[13px] leading-tight tracking-tight">
                  {role === 'PLATFORM_ADMIN' ? (
                    item.id === 'platform-admin' ? 'Instance management' :
                    item.id === 'analytics' ? 'Project intelligence' :
                    item.id === 'finance-analytics' ? 'School money' :
                    item.id === 'communication' ? 'Global broadcast' :
                    item.label
                  ) : item.label}
                </span>
              </div>
            </button>
          </div>
          ))}
        </nav>


        <div className="p-6">
          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-[0.5rem] border border-slate-100 dark:border-slate-800 transition-colors">
            <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 tracking-wider mb-2">Support</p>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">Need assistance with the ERP?</p>
            <a 
              href="https://wa.me/254757956643" 
              target="_blank" 
              rel="noopener noreferrer"
              className="w-full py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-[11px] font-bold uppercase rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-all active:scale-95 shadow-sm flex items-center justify-center gap-2 mb-3"
            >
              <MessageSquare size={14} className="text-orange-500" />
              Help center
            </a>

            {['ADMIN', 'DIRECTOR', 'HEADTEACHER', 'PRINCIPAL'].includes(role) && (
              <button 
                onClick={() => setActiveTab('profile')}
                className="w-full py-3.5 bg-slate-900 dark:bg-black hover:bg-black dark:hover:bg-slate-800 text-white text-[11px] font-black uppercase rounded-2xl transition-all active:scale-95 shadow-xl flex items-center justify-center gap-2 group border border-white/10"
              >
                <Zap size={14} className="fill-white group-hover:scale-125 transition-transform" />
                Manage upgrade
              </button>
            )}
          </div>
          
          <button 
            onClick={async () => {
              try {
                await logout();
                // The useAuth listener automatically detects the logout and transitions smoothly to the LandingPage without a hard page reload.
              } catch (error) {
                console.error("Error signing out:", error);
                sessionStorage.clear();
              }
            }}
            className="w-full mt-4 py-3 bg-rose-50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-900/30 text-rose-600 dark:text-rose-400 text-[11px] font-bold uppercase rounded-2xl hover:bg-rose-100 dark:hover:bg-rose-900/20 transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            Log out
          </button>
        </div>
      </aside>

      {/* Global Portalled Tooltip to bypass overflow clipping */}
      {hoveredTooltip && (
        <div 
          className="fixed left-72 z-[100] w-52 pointer-events-none animate-in fade-in zoom-in-95 duration-200 hidden lg:block"
          style={{ top: hoveredTooltip.top, transform: 'translateY(-50%)' }}
        >
          <div className="bg-slate-900 dark:bg-slate-800 text-white text-[11px] font-medium leading-relaxed p-3 rounded-xl shadow-2xl border border-white/10 ml-3 relative">
            <div className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 bg-slate-900 dark:bg-slate-800 rotate-45 border-l border-b border-white/10 z-0"/>
            <span className="relative z-10">{hoveredTooltip.text}</span>
          </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;
