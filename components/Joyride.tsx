
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight, X, Sparkles, School, Users, GraduationCap, Wallet } from 'lucide-react';
import { db, auth } from '../src/firebase';
import { doc, updateDoc } from 'firebase/firestore';

interface JoyrideStep {
  title: string;
  description: string;
  selector: string;
  icon: React.ReactNode;
  position: 'bottom' | 'top' | 'left' | 'right';
  tabId?: string;
}

interface JoyrideProps {
  onComplete: () => void;
  setActiveTab: (tab: string) => void;
  onboardingCompleted?: boolean;
}

const STEPS: JoyrideStep[] = [
  {
    title: "Complete School Profile",
    description: "Start by adding your school's logo, address, and MOTTO. This will appear on all your official reports and invoices.",
    selector: '[data-id="profile"]',
    icon: <School className="text-orange-600" size={24} />,
    position: 'bottom',
    tabId: 'profile'
  },
  {
    title: "Onboard Students",
    description: "Add your learners one by one or use our bulk CSV import to get your entire school database ready in seconds.",
    selector: '[data-id="students"]',
    icon: <Users className="text-blue-600" size={24} />,
    position: 'right',
    tabId: 'students'
  },
  {
    title: "Staff Management",
    description: "Invite your teachers and non-teaching staff. Generate unique access codes to keep your school data secure.",
    selector: '[data-id="staff-management"]',
    icon: <GraduationCap className="text-emerald-600" size={24} />,
    position: 'bottom',
    tabId: 'staff-management'
  },
  {
    title: "Finance & Payments",
    description: "Track fee collections, generate invoices, and monitor your school's financial health in real-time.",
    selector: '[data-id="finance"]',
    icon: <Wallet className="text-purple-600" size={24} />,
    position: 'right',
    tabId: 'finance'
  }
];

const Joyride: React.FC<JoyrideProps> = ({ onComplete, setActiveTab, onboardingCompleted }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    // Only show on PC
    if (window.innerWidth < 1024) return undefined;
    
    // Check localStorage first for instant response
    const hasSeen = localStorage.getItem('hasSeenJoyride');
    if (hasSeen === 'true') return undefined;

    // Trigger based on persistent database flag
    if (onboardingCompleted === false) {
      console.log('[Joyride] Activating due to onboardingCompleted: false');
      const timer = setTimeout(() => setIsVisible(true), 1500);
      return () => clearTimeout(timer);
    }
    
    // Fallback: If localStorage says we haven't seen it, and we are an ADMIN
    // (This is a safety net if onboardingCompleted is null/undefined during hydration)
    if (!hasSeen && onboardingCompleted === undefined) {
       const timer = setTimeout(() => setIsVisible(true), 3000); // Wait longer for state to settle
       return () => clearTimeout(timer);
    }

    return undefined;
  }, [onboardingCompleted]);

  useEffect(() => {
    if (isVisible) {
      const handleResize = () => updateTargetPosition();
      window.addEventListener('resize', handleResize);
      window.addEventListener('scroll', handleResize, true);
      
      // Update position multiple times as elements might lazy-load or animate
      updateTargetPosition();
      const interval = setInterval(updateTargetPosition, 500);
      
      return () => {
        window.removeEventListener('resize', handleResize);
        window.removeEventListener('scroll', handleResize, true);
        clearInterval(interval);
      };
    }
    return undefined;
  }, [isVisible, currentStep]);

  const updateTargetPosition = () => {
    const step = STEPS[currentStep];
    const element = document.querySelector(step.selector) as HTMLElement | null;

    if (element && element.offsetParent !== null) {
      const rect = element.getBoundingClientRect();
      // Only update if it actually moved to avoid unnecessary re-renders
      setTargetRect(prev => {
        if (!prev || prev.top !== rect.top || prev.left !== rect.left || prev.width !== rect.width || prev.height !== rect.height) {
          return rect;
        }
        return prev;
      });
    } else {
      setTargetRect(null);
    }
  };

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      const nextStep = STEPS[currentStep + 1];
      if (nextStep.tabId) {
        setActiveTab(nextStep.tabId);
      }
      setCurrentStep(v => v + 1);
    } else {
      handleComplete();
    }
  };

  const handleComplete = async () => {
    setIsVisible(false);
    
    // Update Local Storage as secondary cache
    localStorage.setItem('hasSeenJoyride', 'true');
    
    // Update Firestore as primary source of truth
    const user = auth.currentUser;
    if (user) {
      try {
        // Try updating school document first
        await updateDoc(doc(db, 'schools', user.uid), { onboardingCompleted: true });
        // Also update user document
        await updateDoc(doc(db, 'users', user.uid), { onboardingCompleted: true });
      } catch (e) {
        console.warn('Failed to persist onboarding status to Firestore:', e);
      }
    }
    
    onComplete();
  };

  if (!isVisible) return null;

  const step = STEPS[currentStep];

  return (
    <div className="fixed inset-0 z-[9999] pointer-events-none">
      {/* Overlay backdrop with hole */}
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px] pointer-events-auto" onClick={handleComplete} />
      
      {/* Highlight Hole */}
      {targetRect && (
        <motion.div 
          layoutId="joyride-highlight"
          className="absolute bg-white/10 border-2 border-orange-500 rounded-2xl shadow-[0_0_0_9999px_rgba(15,23,42,0.6)]"
          initial={false}
          animate={{
            top: targetRect.top - 8,
            left: targetRect.left - 8,
            width: targetRect.width + 16,
            height: targetRect.height + 16,
          }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        />
      )}

      {/* Tooltip */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ 
            opacity: 1, 
            scale: 1, 
            y: 0,
            transition: { delay: 0.2 }
          }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="absolute pointer-events-auto bg-white rounded-[2rem] shadow-2xl p-8 max-w-sm border border-slate-100"
          style={{
            top: targetRect ? (step.position === 'bottom' ? targetRect.bottom + 24 : (step.position === 'top' ? targetRect.top - 250 : targetRect.top)) : '50%',
            left: targetRect ? (step.position === 'right' ? targetRect.right + 24 : (step.position === 'left' ? targetRect.left - 400 : targetRect.left)) : '50%',
            transform: targetRect ? '' : 'translate(-50%, -50%)'
          }}
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center shadow-sm border border-slate-100">
                {step.icon}
              </div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-3 py-1 rounded-full">Step {currentStep + 1} of {STEPS.length}</p>
            </div>
            
            <div>
              <h3 className="text-xl font-black text-slate-800 tracking-tight leading-tight mb-2 flex items-center gap-2">
                {step.title}
                {currentStep === 0 && <Sparkles size={18} className="text-orange-500 animate-pulse" />}
              </h3>
              <p className="text-sm font-medium text-slate-500 leading-relaxed">
                {step.description}
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button 
                onClick={handleNext}
                className="flex-1 bg-sky-600 text-white py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-sky-700 transition-all active:scale-95"
              >
                {currentStep === STEPS.length - 1 ? "Finish Tour" : "Continue"}
                <ChevronRight size={18} />
              </button>
              <button 
                onClick={handleComplete}
                className="p-3.5 bg-slate-100 text-slate-500 rounded-2xl hover:bg-slate-200 transition-all active:scale-95"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Progress dots */}
          <div className="flex gap-1.5 mt-6 justify-center">
            {STEPS.map((_, i) => (
              <div key={i} className={`h-1 rounded-full transition-all duration-500 ${i === currentStep ? 'w-8 bg-orange-600' : 'w-2 bg-slate-200'}`} />
            ))}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default Joyride;
