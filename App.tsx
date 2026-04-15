
import React, { useState, useEffect, useRef, useMemo } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import TimetableModule from './components/TimetableModule';
import FinanceModule from './components/FinanceModule';
import InventoryModule from './components/InventoryModule';
import BoardingModule from './components/BoardingModule';
import AcademicModule from './components/AcademicModule';
import StudentsModule from './components/StudentsModule';
import RegisterLearner from './components/RegisterLearner';
import HealthModule from './components/HealthModule';
import AdminModule from './components/AdminModule';
import LandingPage from './components/LandingPage';
import TeacherModule from './components/TeacherModule';
import AttendanceModule from './components/AttendanceModule';
import TransportModule from './components/TransportModule';
import DriverModule from './components/DriverModule';
import ParentModule from './components/ParentModule';
import AnalyticsModule from './components/AnalyticsModule';
import CommunicationModule from './components/CommunicationModule';
import EventsModule from './components/EventsModule';
import BankModule from './components/BankModule';
import AssetsModule from './components/AssetsModule';

import CountyGovernmentDashboard from './components/CountyGovernmentDashboard';
import CountyAuthPage from './components/CountyAuthPage';
import { ACADEMIC_PERIODS, NAVIGATION_ITEMS, EDITION_MODULES } from './constants';
import { UserRole } from './types';
import PlatformAdminModule from './components/PlatformAdminModule';
import BottomNav from './components/BottomNav';
import DemoSwitcher from './components/DemoSwitcher';
import LockScreen from './components/LockScreen';
import { PieChart, ArrowUp, Loader2 } from 'lucide-react';
import { Toaster } from 'react-hot-toast';
import { useAuth } from './hooks/useAuth';
import AdminBootstrap from './components/AdminBootstrap';
import Joyride from './components/Joyride';
import OnboardingGuide from './components/OnboardingGuide';
import SignInPage from './components/SignInPage';
import LoginPage from './components/LoginPage';
import toast from 'react-hot-toast';


import { useNavigate, useLocation } from 'react-router-dom';

const App: React.FC = () => {
  // ─── Auth (consumed from service layer) ──────────────────────────────────────
  const { profile, isLoading: isAuthLoading, firebaseUser, isMockAuth, setMockProfile, setResolvedProfile, logout } = useAuth();

  const role = profile?.role ?? null;
  const edition = profile?.edition ?? 'starter';
  const rawEnabledModules = profile?.enabledModules ?? ['dashboard'];
  const editionDefaults = EDITION_MODULES[edition as keyof typeof EDITION_MODULES] || EDITION_MODULES.starter;
  const enabledModules = Array.from(new Set([...rawEnabledModules, ...editionDefaults]));
  const isPlatformAdmin = profile?.isPlatformAdmin ?? false;

  // ─── Navigation ──────────────────────────────────────────────────────────────
  const navigate = useNavigate();
  const location = useLocation();

  // ─── Hidden Admin Bootstrap (secret URL only) ─────────────────────────────
  const searchParams = new URLSearchParams(location.search);

  // ─── UI State ─────────────────────────────────────────────────────────────────
  const [demoOverride, setDemoOverride] = useState<{ role: typeof role; edition: 'starter' | 'professional' | 'elite' } | null>(null);
  const [academicPeriod, setAcademicPeriod] = useState(ACADEMIC_PERIODS[0]);
  
  const activeTab = location.pathname === '/' || location.pathname === '' ? 'dashboard' : location.pathname.substring(1).split('/')[0];
  const setActiveTab = (tab: string) => navigate(`/${tab}`);

  // ─── COUNTY PORTAL — fully isolated, bypasses school auth ────────────────
  const [countyName, setCountyName] = useState<string>(
    () => sessionStorage.getItem('countyPortalCounty') || ''
  );

  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 1024);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');
  const [isLocked, setIsLocked] = useState(() => localStorage.getItem('isLocked') === 'true');
  const [lastActivity, setLastActivity] = useState(Date.now());
  const [sessionStartTime, setSessionStartTime] = useState(Date.now());

  const handleBack = () => { navigate(-1); };



  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsSidebarOpen(true);
      } else {
        setIsSidebarOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      setShowBackToTop(container.scrollTop > 400);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  // ─── Inactivity Lock Logic ──────────────────────────────────────────────
  useEffect(() => {
    // 🔒 Supress lock during registration/onboarding or if no role is active
    const hasOnboarded = localStorage.getItem('onboardingDone') === 'true';
    if (!role || isLocked || !hasOnboarded) return;

    const INACTIVITY_TIMEOUT = 10 * 60 * 1000; // Increased to 10 minutes

    const updateActivity = () => {
      setLastActivity(Date.now());
    };

    const checkInactivity = () => {
      // ⏳ Session Grace Period: No locking for the first 10 minutes of registration/login
      const SESSION_GRACE_PERIOD = 10 * 60 * 1000;
      if (Date.now() - sessionStartTime < SESSION_GRACE_PERIOD) return;

      if (Date.now() - lastActivity > INACTIVITY_TIMEOUT) {
        setIsLocked(true);
        localStorage.setItem('isLocked', 'true');
      }
    };

    const activityEvents = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];
    activityEvents.forEach(event => window.addEventListener(event, updateActivity));

    const interval = setInterval(checkInactivity, 10000); // Check every 10 seconds

    return () => {
      activityEvents.forEach(event => window.removeEventListener(event, updateActivity));
      clearInterval(interval);
    };
  }, [role, isLocked, lastActivity, sessionStartTime]);

  // ─── Reset Session Timer on Login ──────────────────────────────────────
  useEffect(() => {
    if (role && !isLocked) {
      // When a user successfully logs in or registers (role becomes defined),
      // we reset the session clocks to ensure the 10-minute grace period starts NOW.
      setSessionStartTime(Date.now());
      setLastActivity(Date.now());
    }
  }, [role]);

  const handleUnlock = () => {
    setIsLocked(false);
    localStorage.removeItem('isLocked');
    setLastActivity(Date.now());
  };

  // ─── Auth-Driven Navigation ────────────────────────────────────────────────
  // (Moved from inline in onAuthStateChanged — this is a clean side effect on role change)

  useEffect(() => {
    // ─── Do NOT redirect the government portal — it is self-contained ───────
    if (activeTab === 'county-portal') return;

    // Only perform redirect check if we're not loading and have a verified role
    const effectiveRole = demoOverride?.role || role;
    
    if (effectiveRole && !isAuthLoading && !isMockAuth) {
      const availableTabs = NAVIGATION_ITEMS.filter(item => 
        item.roles.includes(effectiveRole) && 
        (['PLATFORM_ADMIN', 'SUPER_ADMIN'].includes(effectiveRole) ? true : enabledModules.includes(item.id))
      );
      
      const defaultTab = ['PLATFORM_ADMIN', 'SUPER_ADMIN'].includes(effectiveRole) ? 'platform-admin' : (availableTabs[0]?.id || 'dashboard');

      // Check for new user onboarding (Now Firestore-backed)
      const hasOnboarded = profile?.onboardingCompleted;
      if (!hasOnboarded && effectiveRole === 'ADMIN' && activeTab === 'dashboard') {
        setTimeout(() => {
          setActiveTab('profile');
          toast.success(`Welcome to BrightSoma! Let's get your school set up.`, {
            duration: 5000,
            position: 'top-left',
            style: {
              background: '#f97316',
              color: '#fff',
              fontWeight: 'black',
              borderRadius: '24px',
              padding: '24px 32px',
              boxShadow: '0 25px 50px -12px rgba(249, 115, 22, 0.4)',
              border: '4px solid rgba(255,255,255,0.2)',
              fontSize: '1.2rem'
            },
            icon: '🏢',
          });
        }, 1000);
      } else if (!availableTabs.some(tab => tab.id === activeTab) && !['signin', 'login', 'access-portal', 'teacher-signin', 'principal-signin', 'finance-signin', 'director-signin', 'register-learner', 'staff-management', 'class-management', 'county-portal', 'admin', 'profile', 'settings'].includes(activeTab)) {

        setActiveTab(defaultTab);
      } else if (activeTab === 'dashboard' && ['PLATFORM_ADMIN', 'SUPER_ADMIN'].includes(effectiveRole)) {
        setActiveTab('platform-admin');
      }
    }
  }, [role, activeTab, isAuthLoading, isMockAuth, demoOverride, enabledModules]);

  const effectiveRole = demoOverride?.role || role;
  const effectiveEdition = demoOverride?.edition || edition;

  useEffect(() => {
    if (role) {
      console.info("Navigation Diagnostic:", { activeTab, role, effectiveRole, isPlatformAdmin });
    }
  }, [activeTab, role, effectiveRole, isPlatformAdmin]);

  const renderedView = useMemo(() => {
    const isStaffRegistering = firebaseUser?.isAnonymous && !profile && !isAuthLoading;

    // The logic below was causing the 'Loading Portal' to flicker/mount
    // when a teacher clicks login. We remove it to keep the LandingPage mounted
    // so the teacher's session linking can finish.
    /*
    if (isStaffRegistering) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950">
          <Loader2 className="w-12 h-12 animate-spin text-orange-600 mb-4" />
          <p className="text-sm font-bold text-slate-500 dark:text-slate-400">Finalizing your secure session...</p>
        </div>
      );
    }
    */

    switch (activeTab) {
      case 'dashboard': 
        return effectiveRole 
          ? (['PLATFORM_ADMIN', 'SUPER_ADMIN'].includes(effectiveRole) 
              ? <PlatformAdminModule /> 
              : <Dashboard role={effectiveRole} academicPeriod={academicPeriod} setActiveTab={setActiveTab} enabledModules={enabledModules} />
            )
          : <LandingPage isDarkMode={isDarkMode} />;

      case 'timetable': return <TimetableModule academicPeriod={academicPeriod} />;
      case 'finance': return <FinanceModule />;
      case 'inventory': return <InventoryModule academicPeriod={academicPeriod} />;
      case 'boarding': return <BoardingModule />;
      case 'academics': return <AcademicModule />;
      case 'students': return <StudentsModule setActiveTab={setActiveTab} />;
      case 'register-learner': return <RegisterLearner setActiveTab={setActiveTab} />;
      case 'admin':
      case 'staff-management':
      case 'staff':
      case 'profile':
      case 'settings':
        const adminSubTab = activeTab === 'profile' ? 'profile' : (activeTab === 'settings' ? 'settings' : 'staff');
        return <AdminModule academicPeriod={academicPeriod} activeTab={adminSubTab} setActiveTab={setActiveTab} />;
      case 'class-management': return <StudentsModule setActiveTab={setActiveTab} initialTab="classrooms" />;
      case 'teacher': return <TeacherModule setActiveTab={setActiveTab} user={firebaseUser} profile={profile} />;
      case 'attendance-register': return <AttendanceModule onBack={() => setActiveTab('teacher')} />;
      case 'transport': return <TransportModule />;
      case 'driver': return <DriverModule user={firebaseUser} profile={profile} />;
      case 'parent': return <ParentModule user={firebaseUser} profile={profile} />;
      case 'analytics': return <AnalyticsModule key="analytics" academicPeriod={academicPeriod} role={effectiveRole!} initialTab="overview" />;
      case 'finance-analytics': return <AnalyticsModule key="finance-analytics" academicPeriod={academicPeriod} role={effectiveRole!} initialTab="billing" />;
      case 'communication': return <CommunicationModule role={effectiveRole!} />;
      case 'health': return <HealthModule setActiveTab={setActiveTab} />;
      case 'events': return <EventsModule />;
      case 'bank': return <BankModule />;
      case 'assets': return <AssetsModule />;
      case 'platform-admin': return <PlatformAdminModule />;
      case 'teacher-signin': navigate('/login/teacher'); return null;
      case 'principal-signin': navigate('/login/principal'); return null;
      case 'finance-signin': navigate('/login/finance'); return null;
      case 'director-signin': navigate('/login/admin'); return null;

      case 'county-auth': 
        return (
          <CountyAuthPage
            onAuthenticated={(county) => {
              sessionStorage.setItem('countyPortalCounty', county);
              setCountyName(county);
              navigate('/county-portal');
            }}
            onBack={() => navigate('/')}
          />
        );
      case 'county-portal': 
        return (
          <CountyGovernmentDashboard
            countyId={countyName}
            onLogout={() => {
              sessionStorage.removeItem('countyPortalCounty');
              setCountyName(''); // Clear state as well
              navigate('/');
            }}
          />
        );
      default: return <Dashboard role={role!} academicPeriod={academicPeriod} setActiveTab={setActiveTab} />;
    }
  }, [activeTab, effectiveRole, academicPeriod, enabledModules, countyName, role]);

  // ─── Early return for standalone portals (bypasses landing page/Auth check) ─
  if (['county-auth', 'county-portal'].includes(activeTab)) {
    return renderedView;
  }

  // ─── Dedicated auth pages — rendered outside the main app shell ──────────
  if (activeTab === 'signin') {
    return <SignInPage />;
  }
  if (activeTab === 'login') {
    return <LoginPage setResolvedProfile={setResolvedProfile} onSelectRole={(resolvedRole) => {
      if (resolvedRole === 'TEACHER') { navigate('/teacher-signin'); return; }
      if (resolvedRole === 'PRINCIPAL') { navigate('/principal-signin'); return; }
      if (resolvedRole === 'FINANCE') { navigate('/finance-signin'); return; }
      if (resolvedRole === 'ADMIN' || resolvedRole === 'DIRECTOR') { navigate('/dashboard'); return; }
      navigate('/dashboard');
    }} />;
  }


  // Show loading state ONLY during auth resolution (skip for anonymous staff login)
  if (isAuthLoading && !firebaseUser?.isAnonymous) {
    return (
      <div className={`flex h-screen w-full items-center justify-center ${isDarkMode ? 'bg-[#0f172a]' : 'bg-[#f8fafc]'}`}>
        <div className="flex flex-col items-center gap-6">
          <p className="text-sm font-bold text-slate-500 animate-pulse">Loading Portal...</p>
        </div>
      </div>
    );
  }

  if (!role && !isAuthLoading) {
    // Redirect stale inner-page URL to root when not authenticated
    // Skip if we are on dedicated auth pages
    const isAuthPath = ['signin', 'login'].includes(activeTab);
    if (location.pathname !== '/' && location.pathname !== '' && !isAuthPath) {

      navigate('/', { replace: true });
    }

    if (searchParams.get('setup') === 'brightsoma-admin-2024') {
      return <AdminBootstrap />;
    }

    const isDev = import.meta.env.DEV;

    return <LandingPage isDarkMode={isDarkMode} />;

  }

  return (
      <div className={`flex h-screen w-full transition-colors duration-300 antialiased overflow-hidden ${isDarkMode ? 'bg-[#0f172a] text-slate-100' : 'bg-[#f8fafc] text-slate-800'}`}>
      {!['county-portal', 'county-auth'].includes(activeTab) && (
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        isSidebarOpen={isSidebarOpen} 
        setIsSidebarOpen={setIsSidebarOpen}
        role={effectiveRole!}
        edition={effectiveEdition}
        schoolId={profile?.schoolId ?? null}
        enabledModules={enabledModules}
        logout={logout}
        isDarkMode={isDarkMode}
      />
      )}
      
      <main className="flex-1 flex flex-col transition-all duration-300 min-w-0">
        <Toaster position="top-center" toastOptions={{
          className: 'dark:bg-slate-800 dark:text-white',
          success: {
            style: {
              background: '#f97316',
              color: '#ffffff',
              fontWeight: 'black',
              borderRadius: '24px',
              padding: '16px 28px',
              border: '2px solid rgba(255,255,255,0.1)',
              boxShadow: '0 20px 40px -10px rgba(249, 115, 22, 0.3)',
              fontSize: '14px',
              letterSpacing: '-0.02em'
            },
            iconTheme: {
              primary: '#ffffff',
              secondary: '#f97316',
            },
          },
          style: {
            borderRadius: '16px',
            background: '#ffffff',
            color: '#1e293b',
            boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
          },
        }} />
        {!['county-portal', 'county-auth'].includes(activeTab) && (
        <Header 
          role={effectiveRole!} 
          academicPeriod={academicPeriod} 
          setAcademicPeriod={setAcademicPeriod}
          setIsSidebarOpen={setIsSidebarOpen}
          isDarkMode={isDarkMode}
          toggleDarkMode={() => setIsDarkMode(!isDarkMode)}
          handleBack={activeTab !== 'dashboard' ? handleBack : undefined}
          canGoBack={activeTab !== 'dashboard'}
        />
        )}
        
        <div ref={scrollContainerRef} className={`flex-1 overflow-y-auto overflow-x-hidden ${['platform-admin', 'analytics', 'county-portal', 'county-auth'].includes(activeTab) ? 'p-0' : 'p-4 md:p-8 pb-24 lg:pb-8'} relative`}>
          {['county-portal', 'county-auth'].includes(activeTab) ? (
            renderedView
          ) : (
          <div className={`${['timetable', 'health', 'students', 'communication', 'class-management', 'platform-admin', 'analytics', 'events', 'admin', 'staff-management', 'staff', 'profile', 'settings'].includes(activeTab) ? 'max-w-full' : 'max-w-7xl'} mx-auto space-y-6 transition-all duration-500`}>
            {renderedView}
          </div>
          )}

          {isPlatformAdmin && !['county-portal', 'county-auth'].includes(activeTab) && (
            <DemoSwitcher 
              currentRole={effectiveRole || 'PLATFORM_ADMIN'}
              currentEdition={effectiveEdition}
              onSwitchRole={(newRole) => setDemoOverride(prev => ({ 
                role: newRole, 
                edition: prev?.edition || edition 
              }))}
              onSwitchEdition={(newEdition) => setDemoOverride(prev => ({ 
                role: prev?.role || role || 'ADMIN', 
                edition: newEdition 
              }))}
              isDarkMode={isDarkMode}
            />
          )}

          {effectiveRole === 'ADMIN' && !['county-portal', 'county-auth'].includes(activeTab) && (
            <>
              {/* <Joyride 
                onboardingCompleted={profile?.onboardingCompleted} 
                onComplete={() => {}} 
                setActiveTab={setActiveTab} 
              /> */}
              <OnboardingGuide setActiveTab={setActiveTab} />
            </>
          )}

          {/* Back to Top Button */}
          {showBackToTop && (
            <button 
              onClick={scrollToTop}
              className={`fixed bottom-8 right-8 p-4 ${activeTab === 'county-portal' ? 'bg-blue-600' : 'bg-orange-600'} text-white rounded-2xl shadow-2xl ${activeTab === 'county-portal' ? 'shadow-blue-500/40' : 'shadow-orange-500/40'} hover:opacity-90 hover:-translate-y-1 transition-all z-50 animate-in fade-in zoom-in duration-300`}
              title="Back to Top"
            >
              <ArrowUp size={24} />
            </button>
          )}
        </div>
      </main>

      {!['county-portal', 'county-auth'].includes(activeTab) && (
      <BottomNav 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        setIsSidebarOpen={setIsSidebarOpen} 
      />
      )}

      {isLocked && role && (
        <LockScreen 
          userProfile={profile} 
          onUnlock={handleUnlock} 
          isDarkMode={isDarkMode} 
        />
      )}
    </div>
  );
};

export default App;
