
import React from 'react';
import { 
  Settings, 
  ChevronDown, 
  User, 
  ShieldCheck, 
  Layout, 
  Zap,
  Globe,
  RefreshCcw,
  Monitor
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { UserRole } from '../types';

interface DemoSwitcherProps {
  currentRole: UserRole;
  currentEdition: 'starter' | 'professional' | 'elite';
  onSwitchRole: (role: UserRole) => void;
  onSwitchEdition: (edition: 'starter' | 'professional' | 'elite') => void;
  isDarkMode: boolean;
}

const DemoSwitcher: React.FC<DemoSwitcherProps> = ({ 
  currentRole, 
  currentEdition, 
  onSwitchRole, 
  onSwitchEdition,
  isDarkMode 
}) => {
  const [isOpen, setIsOpen] = React.useState(false);

  const roles: { value: UserRole, label: string }[] = [
    { value: 'ADMIN', label: 'School Director' },
    { value: 'TEACHER', label: 'Subject Teacher' },
    { value: 'PRINCIPAL', label: 'Principal / Headteacher' },
    { value: 'PARENT', label: 'Parent Portal' },
    { value: 'DRIVER', label: 'Transport Driver' },
    { value: 'FINANCE', label: 'Finance Officer' },
    { value: 'HEADTEACHER', label: 'Head Teacher' },
    { value: 'DIRECTOR', label: 'Director' }
  ];

  const editions: { value: 'starter' | 'professional' | 'elite', label: string }[] = [
    { value: 'starter', label: 'Starter Kit' },
    { value: 'professional', label: 'Professional Kit' },
    { value: 'elite', label: 'Elite Kit' }
  ];

  return (
    <div className="fixed bottom-24 right-8 z-[100]">
      <div className="relative">
        {/* Toggle Button */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-3 px-4 py-3 bg-slate-900 border border-slate-700/50 text-white rounded-2xl shadow-2xl shadow-orange-500/20 backdrop-blur-xl group"
        >
          <div className="w-8 h-8 bg-orange-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-orange-600/30 group-hover:rotate-12 transition-transform">
            <ShieldCheck size={18} />
          </div>
          <div className="text-left">
            <div className="text-[10px] font-black uppercase tracking-widest text-orange-400">Demo Mode</div>
            <div className="text-xs font-bold flex items-center gap-2">
              Super Admin Control
              <ChevronDown size={14} className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
            </div>
          </div>
        </motion.button>

        {/* Menu */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute bottom-full right-0 mb-4 w-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden p-2"
            >
              <div className="p-4 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Monitor size={16} className="text-orange-500" />
                  Live Demonstration Panel
                </h3>
              </div>

              {/* Role Switcher */}
              <div className="p-2 space-y-1">
                <div className="px-3 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Role</div>
                <div className="grid grid-cols-1 gap-1">
                  {roles.map((role) => (
                    <button
                      key={role.value}
                      onClick={() => {
                        onSwitchRole(role.value);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                        currentRole === role.value 
                          ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400' 
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <User size={14} />
                        {role.label}
                      </div>
                      {currentRole === role.value && <Zap size={12} className="fill-orange-500 text-orange-500" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="h-px bg-slate-100 dark:bg-slate-800 mx-4 my-2" />

              {/* Edition Switcher */}
              <div className="p-2 space-y-1">
                <div className="px-3 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">System Edition</div>
                <div className="grid grid-cols-3 gap-1 px-2">
                  {editions.map((ed) => (
                    <button
                      key={ed.value}
                      onClick={() => onSwitchEdition(ed.value)}
                      className={`px-2 py-3 rounded-xl text-[10px] font-black uppercase text-center transition-all ${
                        currentEdition === ed.value
                          ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      {ed.value}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl m-2 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Live Demo Active</span>
                </div>
                <button 
                  onClick={() => window.location.reload()}
                  className="flex items-center gap-1 text-[10px] font-bold text-orange-600 hover:underline"
                >
                  <RefreshCcw size={10} />
                  Reset State
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default DemoSwitcher;
