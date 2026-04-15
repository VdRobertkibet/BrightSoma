import React, { useState } from 'react';
import SchoolProfile from './SchoolProfile';
import StaffManagement from './StaffManagement';
import { Shield, Users, Settings } from 'lucide-react';

interface AdminModuleProps {
  academicPeriod: string;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const AdminModule: React.FC<AdminModuleProps> = ({ academicPeriod, activeTab, setActiveTab }) => {
  const currentTab = ['profile', 'admin', 'staff-management', 'staff', 'settings'].includes(activeTab) ? 
    (['admin', 'staff-management', 'staff'].includes(activeTab) ? 'admin' : activeTab) : 'profile';

  const tabs = [
    { id: 'profile', label: 'School Profile', icon: <Shield size={16} /> },
    { id: 'admin', label: 'Staff Management', icon: <Users size={16} /> },
    { id: 'settings', label: 'System Settings', icon: <Settings size={16} /> }
  ] as const;

  return (
    <div className="flex justify-center min-h-[calc(100vh-8rem)]">
      <div className="w-full bg-white dark:bg-slate-900 rounded-2xl shadow-xl overflow-hidden flex flex-col border border-slate-200 dark:border-slate-800">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-orange-600 rounded-xl text-white shadow-lg shadow-orange-200 dark:shadow-none">
                <Shield size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Admin Dashboard</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage school profile, staff, and system settings.</p>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-8 mt-8 border-b border-slate-200 dark:border-slate-800">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                data-id={tab.id}
                className={`pb-4 text-sm font-bold tracking-wider flex items-center gap-2 transition-colors ${
                  currentTab === tab.id 
                    ? 'text-orange-600 border-b-2 border-orange-600' 
                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 md:p-8 flex-1 bg-slate-50/30 dark:bg-slate-900/20 overflow-y-auto">
          {currentTab === 'profile' && <SchoolProfile academicPeriod={academicPeriod} />}
          {currentTab === 'admin' && <StaffManagement />}
          {currentTab === 'settings' && (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <Settings size={48} className="text-slate-300 dark:text-slate-700 mb-4" />
              <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300">System Settings</h3>
              <p className="text-slate-500 dark:text-slate-400 mt-2">Configuration options coming soon.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminModule;
