import React from 'react';
import { Home, Users, BookOpen, CreditCard, Menu } from 'lucide-react';

interface BottomNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  setIsSidebarOpen: (open: boolean) => void;
}

const BottomNav: React.FC<BottomNavProps> = ({ activeTab, setActiveTab, setIsSidebarOpen }) => {
  const navItems = [
    { id: 'dashboard', label: 'Home', icon: <Home size={20} /> },
    { id: 'students', label: 'Learners & Class', icon: <Users size={20} /> },
    { id: 'academics', label: 'Academics', icon: <BookOpen size={20} /> },
    { id: 'finance', label: 'Finance', icon: <CreditCard size={20} /> },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 lg:hidden bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex justify-around items-center p-2 z-40 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] pb-safe">
      {navItems.map((item) => {
        const isActive = activeTab === item.id;
        return (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`flex flex-col items-center justify-center w-16 h-12 rounded-xl transition-all ${
              isActive 
                ? 'text-orange-600 dark:text-orange-400' 
                : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <div className={`mb-1 transition-transform ${isActive ? 'scale-110' : ''}`}>
              {item.icon}
            </div>
            <span className={`text-[10px] font-bold ${isActive ? 'opacity-100' : 'opacity-70'}`}>
              {item.label}
            </span>
          </button>
        );
      })}
      
      {/* More / Hamburger Menu */}
      <button
        onClick={() => setIsSidebarOpen(true)}
        className="flex flex-col items-center justify-center w-16 h-12 rounded-xl text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
      >
        <div className="mb-1">
          <Menu size={20} />
        </div>
        <span className="text-[10px] font-bold opacity-70">More</span>
      </button>
    </div>
  );
};

export default BottomNav;
