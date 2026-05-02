
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight, X, Shield, Users, GraduationCap, Wallet, CheckCircle, ArrowRight, BookOpen } from 'lucide-react';

interface OnboardingGuideProps {
  setActiveTab: (tab: string) => void;
}

const STEPS = [
  {
    icon: <Shield size={22} className="text-orange-600" />,
    title: 'Complete your school profile',
    description: 'Add your school logo, motto, county, and contact info. This appears on all reports and invoices.',
    selector: '[data-id="profile"]',
    tab: 'profile',
    cta: 'Go to school profile',
    localStorageSignal: 'onboarding_profile_saved',
  },
  {
    icon: <GraduationCap size={22} className="text-orange-600" />,
    title: 'Add your staff',
    description: 'Register teachers and non-teaching staff. They get access codes to login and manage their classrooms.',
    selector: '[data-id="admin"]',
    tab: 'admin',
    cta: 'Go to staff management',
    localStorageSignal: 'onboarding_staff_added',
  },
  {
    icon: <Users size={22} className="text-orange-600" />,
    title: 'Register your learners',
    description: 'Add students one by one or bulk-import from a CSV file. All records are stored securely.',
    selector: '[data-id="students"]',
    tab: 'students',
    cta: 'Go to learner directory',
    localStorageSignal: null,
  },
  {
    icon: <CheckCircle size={22} className="text-orange-600" />,
    title: "You're all set! 🎉",
    description: "Your school is configured. Explore all modules from the sidebar anytime.",
    selector: null,
    tab: null,
    cta: null,
    localStorageSignal: null,
  },
];

const OnboardingGuide: React.FC<OnboardingGuideProps> = ({ setActiveTab }) => {
  const [show, setShow] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [step, setStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    const done = localStorage.getItem('onboardingDone');
    if (!done) {
      const t = setTimeout(() => setShowWelcome(true), 1000);
      return () => clearTimeout(t);
    }
    return undefined;
  }, []);

  // Listen for profile completion signal from SchoolProfile component
  useEffect(() => {
    const handleStorageChange = () => {
      // Step 0 -> 1: Profile saved -> Show Add Staff guide
      const profileSaved = localStorage.getItem('onboarding_profile_saved');
      if (profileSaved && step === 0) {
        setStep(1);
        setShow(true);
        localStorage.removeItem('onboarding_profile_saved');
        setActiveTab('staff-management'); // Automatically navigate to staff management
        return;
      }
      // Step 1 -> 2: Staff added -> Show Register Learners guide
      const staffAdded = localStorage.getItem('onboarding_staff_added');
      if (staffAdded && step === 1) {
        setStep(2);
        setShow(true);
        localStorage.removeItem('onboarding_staff_added');
        setActiveTab('students'); // Automatically navigate to learner registration
        return;
      }
      // Step 2 -> 3: Learner added -> Show Final guide
      const learnerAdded = localStorage.getItem('onboarding_learner_added');
      if (learnerAdded && step === 2) {
        setStep(3);
        setShow(true);
        localStorage.removeItem('onboarding_learner_added');
      }
    };

    window.addEventListener('storage', handleStorageChange);
    handleStorageChange();
    
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [step, show]);

  // Find and track the sidebar target element whenever the step changes
  useEffect(() => {
    if (!show) return;
    const updateRect = () => {
      const sel = STEPS[step].selector;
      if (!sel) { setTargetRect(null); return; }
      const el = document.querySelector<HTMLElement>(sel);
      if (el && el.offsetParent !== null) { // Ensure element is visible
        setTargetRect(el.getBoundingClientRect());
      } else {
        setTargetRect(null);
      }
    };

    // Use ResizeObserver for perfect tracking during layout shifts/resizes
    const observer = new ResizeObserver(() => {
      if (window.innerWidth < 1024) { setTargetRect(null); return; }
      updateRect();
    });

    const sidebar = document.querySelector('[data-id="sidebar"]');
    if (sidebar) observer.observe(sidebar);
    
    // Initial rect
    const t = setTimeout(updateRect, 300);
    window.addEventListener('resize', updateRect);
    
    return () => {
      clearTimeout(t);
      observer.disconnect();
      window.removeEventListener('resize', updateRect);
    };
  }, [show, step]);

  // Calculate pop-card position: appear to the right of the sidebar element
  const getCardStyle = (): React.CSSProperties => {
    if (!targetRect) return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
    const cardwidth = 320;
    const gap = 18;
    const top = Math.min(targetRect.top, window.innerHeight - 320);
    const left = targetRect.right + gap;
    // If it would overflow right edge, show on left
    const finalLeft = left + cardwidth > window.innerWidth ? targetRect.left - cardwidth - gap : left;
    return { top, left: finalLeft };
  };

  const handleStart = () => {
    setShowWelcome(false);
    setTimeout(() => setShow(true), 200);
  };

  const handleSkipAll = () => {
    setShowWelcome(false);
    setShow(false);
    localStorage.setItem('onboardingDone', 'true');
  };

  const handleNext = () => {
    if (step < STEPS.length - 1) {
      setStep(s => s + 1);
    } else {
      handleComplete();
    }
  };

  const handleGoThere = () => {
    const cur = STEPS[step];
    if (cur.tab) setActiveTab(cur.tab);
    
    // For school profile, we close the guide and wait for them to save
    if (step === 0) {
      setShow(false);
      // We don't call handleNext() yet; we wait for the save signal
    } else {
      handleNext();
    }
  };

  const handleComplete = () => {
    setShow(false);
    localStorage.setItem('onboardingDone', 'true');
  };

  const current = STEPS[step];
  const cardStyle = getCardStyle();

  return (
    <>
      {/* Welcome Modal */}
      <AnimatePresence>
        {showWelcome && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.88, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0, transition: { type: 'spring', damping: 22, stiffness: 200 } }}
              exit={{ scale: 0.92, opacity: 0 }}
              className="bg-[#0b3d2e] rounded-[2rem] shadow-2xl max-w-sm w-full p-8 relative overflow-hidden text-white"
            >
              {/* Corner decoration */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-bl-[3rem] opacity-20 pointer-events-none" />

              <div className="relative z-10">
                <h2 className="text-2xl font-black text-white tracking-tight mb-2">Welcome to BrightSoma! 👋</h2>
                <p className="text-sm font-medium text-emerald-100/70 leading-relaxed mb-8">
                  Let's get your school set up in a few quick steps.
                </p>
                <div className="flex flex-col gap-3">
                  <button
                    onClick={handleStart}
                    className="w-full py-4 bg-white text-[#0b3d2e] rounded-2xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-emerald-50 transition-all shadow-lg active:scale-95"
                  >
                    Start guided setup <ChevronRight size={18} />
                  </button>
                  <button
                    onClick={handleSkipAll}
                    className="w-full py-3 text-emerald-200/60 font-semibold text-sm hover:text-white transition-all"
                  >
                    Explore on my own
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Step Cards — pinned next to sidebar item */}
      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9998] pointer-events-none"
          >
            {/* Spotlight highlight on the target element */}
            {targetRect && (
              <motion.div
                layoutId="ob-highlight"
                className="absolute border-2 border-orange-500 rounded-2xl bg-orange-500/5 shadow-[0_0_0_9999px_rgba(15,23,42,0.45)]"
                initial={false}
                animate={{
                  top: targetRect.top - 6,
                  left: targetRect.left - 6,
                  width: targetRect.width + 12,
                  height: targetRect.height + 12,
                }}
                transition={{ type: 'spring', damping: 28, stiffness: 250 }}
              />
            )}

            {/* Dim overlay (not on sidebar spotlight) */}
            <div
              className="absolute inset-0 pointer-events-auto"
              onClick={handleSkipAll}
            />

            {/* Pop card */}
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: -12, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1, transition: { type: 'spring', damping: 22, stiffness: 220 } }}
                exit={{ opacity: 0, x: 12, scale: 0.95 }}
                className="absolute pointer-events-auto bg-white rounded-[1.5rem] shadow-2xl border border-slate-100 p-7 w-[338px]"
                style={cardStyle}
              >
                {/* Dismiss */}
                <button
                  onClick={handleSkipAll}
                  className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
                >
                  <X size={16} />
                </button>

                {/* Progress dots */}
                <div className="flex gap-1.5 mb-5">
                  {STEPS.map((_, i) => (
                    <div
                      key={i}
                      className={`h-1 rounded-full transition-all duration-500 ${
                        i === step ? 'w-6 bg-orange-500' : i < step ? 'w-3 bg-orange-300' : 'w-3 bg-slate-200'
                      }`}
                    />
                  ))}
                </div>

                {/* Icon + content */}
                <div className="w-10 h-10 bg-orange-50 border border-orange-100 rounded-xl flex items-center justify-center mb-4">
                  {current.icon}
                </div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">
                  Step {step + 1} of {STEPS.length}
                </p>
                <h3 className="text-base font-black text-slate-900 tracking-tight mb-1.5">{current.title}</h3>
                <p className="text-xs font-medium text-slate-500 leading-relaxed mb-5">{current.description}</p>

                {/* Actions */}
                <div className={`flex ${current.cta && current.cta.length > 18 ? 'flex-col' : 'flex-row'} gap-2.5 mt-2`}>
                  {current.cta && (
                    <button
                      onClick={handleGoThere}
                      className="flex-1 py-4 bg-orange-600 text-white rounded-xl font-bold text-[11px] uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-orange-700 transition-all active:scale-95 shadow-lg shadow-orange-500/20 px-6"
                    >
                      {current.cta} <ArrowRight size={14} className="shrink-0" />
                    </button>
                  )}
                  <button
                    onClick={handleNext}
                    className={`${current.cta ? 'px-6' : 'flex-1'} py-3.5 bg-slate-50 border border-slate-200 text-slate-500 rounded-xl font-bold text-[11px] uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-slate-100 transition-all active:scale-95`}
                  >
                    {step === STEPS.length - 1 ? 'Done' : 'Skip'}
                    {step < STEPS.length - 1 && <ChevronRight size={14} />}
                  </button>
                </div>
              </motion.div>
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default OnboardingGuide;
