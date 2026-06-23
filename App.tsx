
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
import PayrollModule from './components/PayrollModule';
import LibraryModule from './components/LibraryModule';
import ECDELanding from './components/ECDELanding';
import ECDEAuthPage from './components/ECDEAuthPage';
import ECDECenterDashboard from './components/ECDECenterDashboard';

import CountyGovernmentDashboard from './components/CountyGovernmentDashboard';
import CountyAuthPage from './components/CountyAuthPage';
import { ACADEMIC_PERIODS, NAVIGATION_ITEMS, EDITION_MODULES } from './constants';
import { UserRole } from './types';
import PlatformAdminModule from './components/PlatformAdminModule';
import BottomNav from './components/BottomNav';
import DemoSwitcher from './components/DemoSwitcher';
import LockScreen from './components/LockScreen';
import DemoBanner from './components/DemoBanner';
import { PieChart, ArrowUp, Loader2, Shield } from 'lucide-react';
import { Toaster } from 'react-hot-toast';
import { useAuth } from './hooks/useAuth';
import AdminBootstrap from './components/AdminBootstrap';
import Joyride from './components/Joyride';
import OnboardingGuide from './components/OnboardingGuide';
import SignInPage from './components/SignInPage';
import LoginPage from './components/LoginPage';
import toast from 'react-hot-toast';
import { DEMO_PROFILES } from './demoData';


import { useNavigate, useLocation } from 'react-router-dom';

const App: React.FC = () => {
  // ─── Auth (consumed from service layer) ──────────────────────────────────────
  const { 
    profile, 
    isLoading: isAuthLoading, 
    firebaseUser, 
    isMockAuth, 
    setMockProfile, 
    setResolvedProfile, 
    logout,
    refreshAuth
  } = useAuth();

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
  const [demoOverride, setDemoOverride] = useState<{ role: UserRole | null; edition: 'starter' | 'professional' | 'elite' } | null>(null);
  const [impersonatedTeacher, setImpersonatedTeacher] = useState<any | null>(null);
  const getCurrentTerm = () => {
    const month = new Date().getMonth() + 1;
    const year = new Date().getFullYear();
    if (month >= 1 && month <= 4) return `Term 1 ${year}`;
    if (month >= 5 && month <= 8) return `Term 2 ${year}`;
    return `Term 3 ${year}`;
  };

  const [academicPeriod, setAcademicPeriod] = useState(() => {
    const saved = localStorage.getItem('brightsoma_academicPeriod');
    return saved || getCurrentTerm();
  });

  useEffect(() => {
    localStorage.setItem('brightsoma_academicPeriod', academicPeriod);
  }, [academicPeriod]);
  
  const activeTab = location.pathname === '/' || location.pathname === '' 
    ? 'home'
    : location.pathname.substring(1).split('/')[0];

  useEffect(() => {
    const demoParam = searchParams.get('demo');
    const roleParam = searchParams.get('role')?.toLowerCase();
    
    if (demoParam === 'true' && roleParam && !isMockAuth && !profile) {
      const triggerDemo = () => {
        try {
          const mockProfile = DEMO_PROFILES[roleParam as keyof typeof DEMO_PROFILES];
          if (mockProfile) {
            setMockProfile(mockProfile);
            toast.success(`Welcome to the ${roleParam.toUpperCase()} Demo!`, { icon: '🚀' });
          }
        } catch (err) {
          console.error("[App] URL Demo trigger failed:", err);
        }
      };
      triggerDemo();
    }
  }, [location.search, isMockAuth, profile]);

  useEffect(() => {
    if (activeTab && activeTab !== 'dashboard' && activeTab !== 'home') {
      localStorage.setItem('last_active_tab', activeTab);
    }
  }, [activeTab]);

  const setActiveTab = (tab: string) => {
    navigate(`/${tab}`);
  };

  // ─── COUNTY PORTAL — fully isolated, bypasses school auth ────────────────
  const [countyName, setCountyName] = useState<string>(
    () => sessionStorage.getItem('countyPortalCounty') || ''
  );
  const [ecdeCenterName, setEcdeCenterName] = useState<string>('');

  const [activeFeeTab, setActiveFeeTab] = useState('due');
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [dashboardTab, setDashboardTab] = useState('Overview');
  const [studentsTab, setStudentsTab] = useState<'directory' | 'classrooms'>('directory');
  const [timetableTerm, setTimetableTerm] = useState('Term 1');
  const [financeTab, setFinanceTab] = useState<'collections' | 'expenses' | 'etims' | 'analytics' | 'settings' | 'fee-per-class'>('collections');
  const [collectionsTab, setCollectionsTab] = useState<'graph' | 'quickpay' | 'net' | 'arrears' | 'directory'>('graph');
  const [bankTab, setBankTab] = useState<'overview' | 'transactions'>('overview');
  const [academicTab, setAcademicTab] = useState<'hierarchy' | 'assessments' | 'reports'>('hierarchy');
  const [boardingTab, setBoardingTab] = useState<'dorms' | 'exeats' | 'pocket-money' | 'meals'>('dorms');
  const [communicationTab, setCommunicationTab] = useState<'Overview' | 'Compose' | 'Support Inbox' | 'History' | 'Templates'>('Overview');
  const [healthTab, setHealthTab] = useState<'logs' | 'profiles'>('logs');
  const [eventsTab, setEventsTab] = useState<'grid' | 'list'>('grid');
  const [assetsTab, setAssetsTab] = useState<'registry' | 'maintenance' | 'analytics' | 'vendors' | 'purchase-orders'>('registry');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');
  const [isLocked, setIsLocked] = useState(() => localStorage.getItem('isLocked') === 'true');
  const [lastActivity, setLastActivity] = useState(Date.now());
  const [sessionStartTime, setSessionStartTime] = useState(Date.now());

  const handleBack = () => { navigate(-1); };



  // Removed forced sidebar resize logic to allow manual toggle on all screens

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

  useEffect(() => {
    // If a role is present, ensure we're not stuck on guest-only pages
    const guestOnlyPages = ['home', '', 'signin', 'login', 'register', 'onboarding'];
    if (role && guestOnlyPages.includes(activeTab)) {
      console.log('[App] Role detected on guest-only page. Redirecting to dashboard...');
      setActiveTab('dashboard');
    }
  }, [role, activeTab]);

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

  // ─── Connectivity Monitoring ───────────────────────────────────────────
  useEffect(() => {
    const handleOnline = () => {
      toast.success('You are back online!', { icon: '🌐', duration: 4000 });
    };
    const handleOffline = () => {
      toast.error('You are currently offline. Changes will sync when you reconnect.', { icon: '📡', duration: 6000 });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // ─── Sign-In Redirect Side Effects ──────────────────────────────────────
  useEffect(() => {
    if (activeTab === 'teacher-signin') navigate('/login/teacher');
    else if (activeTab === 'principal-signin') navigate('/login/principal');
    else if (activeTab === 'finance-signin') navigate('/login/finance');
    else if (activeTab === 'director-signin') navigate('/login/admin');
    else if (activeTab === 'parent-signin') navigate('/login/parent');
  }, [activeTab, navigate]);

  // ─── Auth-Driven Navigation ────────────────────────────────────────────────
  // (Moved from inline in onAuthStateChanged — this is a clean side effect on role change)

  useEffect(() => {
    // ─── Do NOT redirect the government portal — it is self-contained ───────
    if (activeTab === 'county-portal') return;

    // Only perform redirect check if we're not loading and have a verified role
    const effectiveRole = impersonatedTeacher ? 'TEACHER' : (demoOverride?.role || role);
    
    if (effectiveRole && !isAuthLoading) {
      const availableTabs = NAVIGATION_ITEMS.filter(item => 
        item.roles.includes(effectiveRole) && 
        (['PLATFORM_ADMIN', 'SUPER_ADMIN'].includes(effectiveRole) ? true : enabledModules.includes(item.id))
      );
      
      const defaultTab = ['PLATFORM_ADMIN', 'SUPER_ADMIN'].includes(effectiveRole) ? 'platform-admin' : (availableTabs[0]?.id || 'dashboard');

      // Check for new user onboarding (Now Firestore-backed)
      const hasOnboarded = profile?.onboardingCompleted;
      const hasSeenWelcome = sessionStorage.getItem('hasSeenWelcomeToast');

      if (!hasOnboarded && effectiveRole === 'ADMIN' && activeTab === 'dashboard' && !hasSeenWelcome) {
        sessionStorage.setItem('hasSeenWelcomeToast', 'true');
        setTimeout(() => {
          setActiveTab('profile');
          toast.success(`Welcome to BrightSoma! Let's get your school set up.`, {
            duration: 5000,
            position: 'top-left',
            style: {
              background: '#0462b4',
              color: '#fff',
              fontWeight: 'black',
              borderRadius: '24px',
              padding: '24px 32px',
              boxShadow: '0 25px 50px -12px rgba(4, 98, 180, 0.4)',
              border: '4px solid rgba(255,255,255,0.1)',
              fontSize: '1.1rem'
            },
            icon: '🏢',
          });
        }, 1000);
      } else if (!availableTabs.some(tab => tab.id === activeTab) && !['signin', 'login', 'access-portal', 'parent-dashboard', 'parent-fees', 'parent-attendance', 'parent-performance', 'parent-communications', 'parent-timetable', 'teacher', 'attendance-register', 'driver', 'teacher-signin', 'principal-signin', 'finance-signin', 'director-signin', 'parent-signin', 'register-learner', 'edit-learner', 'staff-management', 'class-management', 'county-portal', 'admin', 'profile', 'settings'].includes(activeTab)) {

        setActiveTab(defaultTab);
      } else if (activeTab === 'dashboard' && ['PLATFORM_ADMIN', 'SUPER_ADMIN'].includes(effectiveRole)) {
        setActiveTab('platform-admin');
      } else if (activeTab === 'dashboard' && effectiveRole === 'PARENT') {
        setActiveTab('parent-dashboard');
      }
    }
  }, [role, activeTab, isAuthLoading, isMockAuth, demoOverride, enabledModules, impersonatedTeacher]);

  const effectiveRole = impersonatedTeacher ? 'TEACHER' : (demoOverride?.role || role);
  const effectiveEdition = demoOverride?.edition || edition;

  useEffect(() => {
    if (role) {
      console.info("Navigation Diagnostic:", { activeTab, role, effectiveRole, isPlatformAdmin });
    }
  }, [activeTab, role, effectiveRole, isPlatformAdmin]);

  const renderedView = useMemo(() => {
    console.log('[App] Resolving renderedView for activeTab:', activeTab, 'EffectiveRole:', effectiveRole);
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
              : <Dashboard role={effectiveRole} academicPeriod={academicPeriod} setActiveTab={setActiveTab} enabledModules={enabledModules} activeTab={dashboardTab} onTabChange={setDashboardTab} isMockAuth={isMockAuth} onImpersonateTeacher={(teacher) => { setImpersonatedTeacher(teacher); setActiveTab('teacher'); }} />
            )
          : (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-[#0b0e14] p-10 text-center">
              <div className="w-20 h-20 bg-orange-100 dark:bg-orange-500/10 rounded-[2rem] flex items-center justify-center text-orange-600 mb-8 animate-pulse">
                <Shield size={32} />
              </div>
              <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Resolving Access...</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs mx-auto">Verifying your institutional credentials.</p>
            </div>
          );

      case 'timetable': return <TimetableModule academicPeriod={academicPeriod} activeTerm={timetableTerm} onTermChange={setTimetableTerm} />;
      case 'finance': 
        return <FinanceModule 
          role={effectiveRole} 
          activeTab={financeTab} 
          onTabChange={setFinanceTab} 
          collectionsSubTab={collectionsTab} 
          onCollectionsSubTabChange={setCollectionsTab} 
          isMockAuth={isMockAuth}
        />;
      case 'inventory': return <InventoryModule academicPeriod={academicPeriod} />;
      case 'payroll': return <PayrollModule />;
      case 'library': return <LibraryModule />;
      case 'boarding': return <BoardingModule activeTab={boardingTab} onTabChange={setBoardingTab} />;
      case 'academics': return <AcademicModule activeTab={academicTab} onTabChange={setAcademicTab} />;
      case 'students': 
        return <StudentsModule 
          setActiveTab={setActiveTab} 
          setEditingStudentId={setEditingStudentId}
          role={effectiveRole as any} 
          isDarkMode={isDarkMode} 
          moduleTab={studentsTab} 
          setModuleTab={setStudentsTab} 
          isMockAuth={isMockAuth}
        />;
      case 'register-learner': return <RegisterLearner setActiveTab={setActiveTab} isMockAuth={isMockAuth} />;
      case 'edit-learner': return <RegisterLearner setActiveTab={setActiveTab} studentId={editingStudentId} isMockAuth={isMockAuth} />;
      case 'admin':
      case 'staff-management':
      case 'staff':
      case 'profile':
      case 'settings':
        const adminSubTab = activeTab === 'profile' ? 'profile' : (activeTab === 'settings' ? 'settings' : 'staff');
        return <AdminModule academicPeriod={academicPeriod} activeTab={adminSubTab} setActiveTab={setActiveTab} />;
      case 'class-management': 
        return <StudentsModule 
          setActiveTab={setActiveTab} 
          setEditingStudentId={setEditingStudentId}
          initialTab="classrooms" 
          role={effectiveRole as any} 
          isDarkMode={isDarkMode} 
          moduleTab={studentsTab} 
          setModuleTab={setStudentsTab} 
          isMockAuth={isMockAuth}
        />;
      case 'teacher': {
        const targetUser = impersonatedTeacher 
          ? { uid: impersonatedTeacher.id || impersonatedTeacher.uid, email: impersonatedTeacher.email } 
          : firebaseUser;
        const targetProfile = impersonatedTeacher 
          ? { ...impersonatedTeacher, role: 'TEACHER', isImpersonated: true } 
          : profile;
        return (
          <TeacherModule 
            setActiveTab={setActiveTab} 
            user={targetUser} 
            profile={targetProfile} 
            isMockAuth={isMockAuth} 
          />
        );
      }
      case 'attendance-register': {
        const handleAttendanceBack = () => {
          if (effectiveRole === 'TEACHER') {
            setActiveTab('teacher');
          } else {
            setActiveTab('dashboard');
          }
        };
        return <AttendanceModule onBack={handleAttendanceBack} isMockAuth={isMockAuth} />;
      }
      case 'transport': return <TransportModule />;
      case 'driver': return <DriverModule user={firebaseUser} profile={profile} />;
      case 'parent-dashboard':
      case 'parent-session':
      case 'parent-communications':
      case 'parent-circulars':
      case 'parent-fees':
      case 'parent-events':
      case 'parent-assignments':
      case 'parent-exam-report':
      case 'parent-timetable':
      case 'parent-revision':
      case 'parent-exam-schedule':
      case 'parent-deferment':
      case 'parent-subject-registration':
      case 'parent-payment-plans':
      case 'parent-assessment':
      case 'parent-performance':
      case 'parent-attendance':
      case 'parent-health':
      case 'parent-contact':
      case 'parent': return <ParentModule activeTab={activeTab} setActiveTab={setActiveTab} user={firebaseUser} profile={profile} activeFeeTab={activeFeeTab} setActiveFeeTab={setActiveFeeTab} isMockAuth={isMockAuth} />;
      case 'analytics': return <AnalyticsModule key="analytics" academicPeriod={academicPeriod} role={effectiveRole!} initialTab="overview" isMockAuth={isMockAuth} />;
      case 'finance-analytics': return <AnalyticsModule key="finance-analytics" academicPeriod={academicPeriod} role={effectiveRole!} initialTab="billing" isMockAuth={isMockAuth} />;
      case 'communication': return <CommunicationModule role={effectiveRole!} activeTab={communicationTab} onTabChange={setCommunicationTab} isMockAuth={isMockAuth} />;
      case 'health': return <HealthModule activeTab={healthTab} onTabChange={setHealthTab} />;
      case 'events': return <EventsModule activeTab={eventsTab} onTabChange={setEventsTab} />;
      case 'bank': return <BankModule activeTab={bankTab} onTabChange={setBankTab} />;
      case 'assets': return <AssetsModule activeTab={assetsTab} onTabChange={setAssetsTab} />;
      case 'platform-admin': return <PlatformAdminModule />;
      case 'fee-per-class':
        return <FinanceModule 
          role={effectiveRole} 
          activeTab="fee-per-class" 
          onTabChange={setFinanceTab} 
          collectionsSubTab={collectionsTab} 
          onCollectionsSubTabChange={setCollectionsTab} 
          isMockAuth={isMockAuth}
        />;
      case 'teacher-signin':
      case 'principal-signin':
      case 'finance-signin':
      case 'director-signin':
      case 'parent-signin':
        return (
          <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-[#0b0e14]">
            <Loader2 className="w-12 h-12 animate-spin text-orange-600" />
            <p className="text-sm font-bold text-slate-500 mt-4 font-sans">Redirecting to sign in...</p>
          </div>
        );

      case 'home':
        if (effectiveRole) {
           return <Dashboard role={effectiveRole} academicPeriod={academicPeriod} setActiveTab={setActiveTab} enabledModules={enabledModules} isMockAuth={isMockAuth} onImpersonateTeacher={(teacher) => { setImpersonatedTeacher(teacher); setActiveTab('teacher'); }} />;
        }
        return <LandingPage isDarkMode={isDarkMode} profile={profile} isAuthLoading={isAuthLoading} setResolvedProfile={setResolvedProfile} setMockProfile={setMockProfile} />;

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
      case 'ecde-portal': 
        return <ECDELanding />;
      
      case 'ecde-center-auth':
        return <ECDEAuthPage onBack={() => setActiveTab('landing')} onAuthenticated={(name) => { setEcdeCenterName(name); setActiveTab('ecde-center-dashboard'); }} />;
      
      case 'ecde-center-dashboard':
        return <ECDECenterDashboard schoolName={ecdeCenterName} onLogout={() => { setEcdeCenterName(''); setActiveTab('landing'); }} />;

      default: return <Dashboard role={role!} academicPeriod={academicPeriod} setActiveTab={setActiveTab} isMockAuth={isMockAuth} onImpersonateTeacher={(teacher) => { setImpersonatedTeacher(teacher); setActiveTab('teacher'); }} />;
    }
  }, [activeTab, effectiveRole, academicPeriod, enabledModules, countyName, ecdeCenterName, role]);

  // ─── Early return for standalone portals (bypasses landing page/Auth check) ─
  if (['county-auth', 'county-portal', 'ecde-portal', 'ecde-center-auth', 'ecde-center-dashboard'].includes(activeTab)) {
    return renderedView;
  }

  // ─── Dedicated auth pages — rendered outside the main app shell ──────────
  if (activeTab === 'signin') {
    return <SignInPage />;
  }
  if (activeTab === 'login') {
    return <LoginPage setMockProfile={setMockProfile} setResolvedProfile={setResolvedProfile} onSelectRole={(resolvedRole) => {
      if (resolvedRole === 'TEACHER') { navigate('/teacher'); return; }
      if (resolvedRole === 'PRINCIPAL') { navigate('/principal'); return; }
      if (resolvedRole === 'FINANCE') { navigate('/finance'); return; }
      if (resolvedRole === 'PARENT') { navigate('/parent-dashboard'); return; }
      if (resolvedRole === 'ADMIN' || resolvedRole === 'DIRECTOR' || resolvedRole === 'HEADTEACHER') { navigate('/dashboard'); return; }
      navigate('/dashboard');
    }} />;
  }

  // Show loading state during auth resolution
  if (isAuthLoading) {
    console.log('[App] Auth is loading. Showing Loading Portal... Status:', { firebaseUser: firebaseUser?.uid, isMockAuth });
    return (
      <div className={`flex h-screen w-full items-center justify-center ${isDarkMode ? 'bg-[#0f172a]' : 'bg-[#f8fafc]'}`}>
        <div className="flex flex-col items-center gap-6">
          <p className="text-sm font-bold text-slate-500 animate-pulse">Loading Portal...</p>
        </div>
      </div>
    );
  }

  if ((activeTab === 'home' || activeTab === '') && !role) {
    return (
      <LandingPage 
        isDarkMode={isDarkMode} 
        profile={profile} 
        isAuthLoading={isAuthLoading} 
        setResolvedProfile={setResolvedProfile}
        setMockProfile={setMockProfile}
      />
    );
  }

  if (!role && !isAuthLoading && firebaseUser) {
    // Guard: Don't show rejection screen for brand new accounts or pending registrations.
    // Firestore writes can take a few seconds to propagate after account creation.
    const isPendingReg = sessionStorage.getItem('pending_registration') === 'true';
    const accountAgeMs = firebaseUser.metadata.creationTime
      ? Date.now() - new Date(firebaseUser.metadata.creationTime).getTime()
      : 999999;
    const isVeryNewAccount = accountAgeMs < 30000;

    if (isPendingReg || isVeryNewAccount) {
      return (
        <div className={`flex h-screen w-full items-center justify-center ${isDarkMode ? 'bg-[#0f172a]' : 'bg-[#f8fafc]'}`}>
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-orange-100 flex items-center justify-center animate-pulse">
              <Shield size={24} className="text-orange-600" />
            </div>
            <p className="text-sm font-bold text-slate-500">Setting up your portal...</p>
            <p className="text-xs text-slate-400">This may take a few seconds</p>
          </div>
        </div>
      );
    }

    return (
      <div className={`min-h-screen flex flex-col items-center justify-center ${isDarkMode ? 'bg-slate-950' : 'bg-slate-50'} p-10 text-center`}>
        <div className="w-20 h-20 bg-rose-100 dark:bg-rose-500/10 rounded-[2rem] flex items-center justify-center text-rose-600 mb-8">
          <Shield size={32} />
        </div>
        <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-4">No Portal Access</h2>
        <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-8 font-bold">
          We found your account ({firebaseUser.email}), but it isn't linked to a school portal yet.
        </p>
        <div className="flex flex-col gap-4 w-full max-w-xs mx-auto">
          <button 
            onClick={() => refreshAuth()}
            className="w-full py-4 bg-orange-600 text-white rounded-2xl font-bold hover:bg-orange-700 transition-all flex items-center justify-center gap-2"
          >
            <Shield size={18} />
            Check My Access Again
          </button>
          <button 
            onClick={() => window.location.assign('/')}
            className="w-full py-4 bg-slate-800 text-white rounded-2xl font-bold hover:bg-slate-900 transition-all"
          >
            Back to Landing Page
          </button>
          <button 
            onClick={() => logout()}
            className="w-full py-4 border-2 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl font-bold hover:bg-slate-100 dark:hover:bg-slate-900 transition-all"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  if (!role && !isAuthLoading) {
    return <LandingPage isDarkMode={isDarkMode} profile={profile} isAuthLoading={isAuthLoading} setResolvedProfile={setResolvedProfile} setMockProfile={setMockProfile} />;
  }

  console.log('[App] Rendering main UI. Role:', effectiveRole, 'Tab:', activeTab, 'isMockAuth:', isMockAuth);
  return (
      <div className={`flex h-screen w-full transition-colors duration-300 antialiased overflow-hidden ${isDarkMode ? 'bg-[#0f172a] text-slate-100' : 'bg-[#fdfbf7] text-slate-800'} ${isMockAuth ? 'pt-10' : ''}`}>
      {isMockAuth && <DemoBanner onExit={() => { logout(); navigate('/'); }} />}
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
      
      <main className={`flex-1 flex flex-col transition-all duration-500 min-w-0 ${isSidebarOpen ? 'lg:ml-72' : ''}`}>
        <Toaster 
          position="top-center" 
          toastOptions={{
            className: 'font-sans',
            success: {
              duration: 5000,
              style: {
                background: '#000000',
                color: '#ffffff',
                fontWeight: '900',
                borderRadius: '24px',
                padding: '20px 32px',
                border: '1px solid rgba(255,255,255,0.1)',
                boxShadow: '0 30px 60px -12px rgba(0,0,0,0.5)',
                fontSize: '15px',
                letterSpacing: '-0.01em',
              },
              iconTheme: {
                primary: '#ffffff',
                secondary: '#000000',
              },
            },
            error: {
              duration: 6000,
              style: {
                background: '#000000',
                color: '#ffffff',
                fontWeight: '900',
                borderRadius: '24px',
                padding: '20px 32px',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                boxShadow: '0 30px 60px -12px rgba(0,0,0,0.5)',
                fontSize: '15px',
              },
              iconTheme: {
                primary: '#ef4444',
                secondary: '#ffffff',
              },
            },
            style: {
              borderRadius: '24px',
              background: '#000000',
              color: '#ffffff',
              boxShadow: '0 30px 60px -12px rgba(0,0,0,0.5)',
              fontWeight: '900',
              padding: '20px 32px',
              border: '1px solid rgba(255,255,255,0.1)',
              fontSize: '15px',
            },
          }} 
        />
        {!['county-portal', 'county-auth'].includes(activeTab) && (
        <Header 
          role={effectiveRole!} 
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          academicPeriod={academicPeriod} 
          setAcademicPeriod={setAcademicPeriod}
          setIsSidebarOpen={setIsSidebarOpen}
          isDarkMode={isDarkMode}
          toggleDarkMode={() => setIsDarkMode(!isDarkMode)}
          handleBack={activeTab !== 'dashboard' ? handleBack : undefined}
          canGoBack={activeTab !== 'dashboard'}
          activeFeeTab={activeFeeTab}
          setActiveFeeTab={setActiveFeeTab}
          dashboardTab={dashboardTab}
          setDashboardTab={setDashboardTab}
          studentsTab={studentsTab}
          setStudentsTab={setStudentsTab}
          timetableTerm={timetableTerm}
          setTimetableTerm={setTimetableTerm}
          financeTab={financeTab}
          setFinanceTab={setFinanceTab}
          collectionsTab={collectionsTab}
          setCollectionsTab={setCollectionsTab}
          bankTab={bankTab}
          setBankTab={setBankTab}
          academicTab={academicTab}
          setAcademicTab={setAcademicTab}
          boardingTab={boardingTab}
          setBoardingTab={setBoardingTab}
          communicationTab={communicationTab}
          setCommunicationTab={setCommunicationTab}
          healthTab={healthTab}
          setHealthTab={setHealthTab}
          eventsTab={eventsTab}
          setEventsTab={setEventsTab}
          assetsTab={assetsTab}
          setAssetsTab={setAssetsTab}
          enabledModules={enabledModules}
        />
        )}
        
        {impersonatedTeacher && (
          <div className="bg-indigo-600 dark:bg-indigo-900 text-white px-6 py-2.5 flex items-center justify-between border-b border-indigo-500/30 text-xs font-semibold shadow-md animate-in slide-in-from-top duration-300">
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
              </span>
              <span>
                Viewing Teacher Portal as: <span className="font-extrabold text-yellow-300 underline underline-offset-2">{impersonatedTeacher.name}</span>
              </span>
            </div>
            <button 
              onClick={() => {
                setImpersonatedTeacher(null);
                setActiveTab('dashboard');
              }}
              className="bg-indigo-700 hover:bg-indigo-800 dark:bg-indigo-800 dark:hover:bg-indigo-700 px-3.5 py-1.5 rounded-full text-[10px] font-black tracking-wider uppercase transition-all shadow-inner border border-indigo-500/20 active:scale-95 cursor-pointer"
            >
              Exit Impersonation
            </button>
          </div>
        )}
        
        <div ref={scrollContainerRef} className={`flex-1 overflow-y-auto overflow-x-hidden ${['platform-admin', 'analytics', 'county-portal', 'county-auth'].includes(activeTab) ? 'p-0' : 'p-4 md:p-8 pb-24 lg:pb-8'} relative`}>
          {['county-portal', 'county-auth'].includes(activeTab) ? (
            renderedView
          ) : (
          <div className={`${(['timetable', 'health', 'students', 'communication', 'class-management', 'platform-admin', 'analytics', 'events', 'admin', 'staff-management', 'staff', 'profile', 'settings'].includes(activeTab) || activeTab.startsWith('parent')) ? 'max-w-full' : 'max-w-7xl'} mx-auto space-y-6 transition-all duration-500`}>
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
                onClick={() => {
                const targetId = item.id === 'staff-management' ? 'admin' : item.id;
                setActiveTab(targetId);
                // Removed setIsSidebarOpen(false) to make sidebar persistent
              }}/> */}
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
          onLogout={logout}
          isDarkMode={isDarkMode} 
        />
      )}
    </div>
  );
};

export default App;
