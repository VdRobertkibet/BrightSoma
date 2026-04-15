import React, { useState, useMemo, useEffect } from 'react';
import { Activity, Download, Plus, ShieldAlert, ChevronRight, User, Utensils, Clock, LayoutDashboard, Users, FileText, Settings, ShieldCheck, MapPin, Zap, LogOut, Bell, Globe, Lock, Palette, ToggleLeft, Save, BarChart2, Camera, Upload, Search, Filter, Mail, Phone, Calendar, CheckCircle2, AlertCircle, X, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Props {
  countyId?: string;
  onLogout?: () => void;
}

const getTimeGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
};

const navItemsOriginal = [
  { id: 'executive-command', icon: LayoutDashboard, label: 'Overview' },
  { id: 'centre-directory', icon: Users, label: 'Schools List' },
  { id: 'nutritional-push', icon: Utensils, label: 'School Meals' },
  { id: 'automated-follow-ups', icon: Clock, label: 'Student Attendance' },
  { id: 'compliance-tracking', icon: Activity, label: 'Inspections' },
  { id: 'health-module', icon: ShieldCheck, label: 'Health Programs' },
  { id: 'staff-allocation', icon: User, label: 'Teachers & Staff' },
];

const subMenuMap: Record<string, { id: string; icon: React.ElementType; label: string }[]> = {
  'executive-command': [
    { id: 'monitoring', icon: Activity, label: 'Report Status' },
    { id: 'pending', icon: ShieldCheck, label: 'Approvals Needed' },
    { id: 'alerts', icon: ShieldAlert, label: 'Urgent Issues' },
    { id: 'ledger', icon: FileText, label: 'Funding Records' },
    { id: 'settings', icon: Settings, label: 'Settings' },
  ],
  'centre-directory': [
    { id: 'all-schools', icon: Users, label: 'All Schools' },
    { id: 'flagged', icon: ShieldAlert, label: 'Flagged' },
    { id: 'compliant', icon: ShieldCheck, label: 'Compliant' },
  ],
  'nutritional-push': [
    { id: 'meal-summary', icon: BarChart2, label: 'Meal Summary' },
    { id: 'stock-levels', icon: FileText, label: 'Stock Levels' },
  ],
};

// --- MOCK DATA ---
const MOCK_SCHOOLS = [
  { id: 'S001', name: 'Nairobi Central Academy', subcounty: 'Starehe', ward: 'Central', headteacher: 'Dr. Sarah Kamau', type: 'Separate', students: 450, staff: 12, ratio: '1:37', phone: '+254 712 345 678', email: 'central.academy@nairobi.go.ke' },
  { id: 'S002', name: 'Westlands Primary ECDE', subcounty: 'Westlands', ward: 'Parklands', headteacher: 'Peter Omondi', type: 'Hosted', students: 310, staff: 8, ratio: '1:38', phone: '+254 722 987 654', email: 'westlands.ecde@nairobi.go.ke' },
  { id: 'S003', name: 'Kibra Community Center', subcounty: 'Kibra', ward: 'Lindi', headteacher: 'Mary Wanjiku', type: 'Separate', students: 580, staff: 15, ratio: '1:38', phone: '+254 733 444 555', email: 'kibra.community@nairobi.go.ke' },
  { id: 'S004', name: 'Embakasi North School', subcounty: 'Embakasi North', ward: 'Dandora', headteacher: 'John Mutua', type: 'Hosted', students: 240, staff: 6, ratio: '1:40', phone: '+254 755 111 222', email: 'embakasi.north@nairobi.go.ke' },
];

const MOCK_MEALS = [
  { 
    school: 'Nairobi Central Academy', lunch: 'Githeri & Spinach', break: 'Milk & Bread', project: 'Cup of Milk Initiative', studentsFed: 442, studentsMissed: 8, costPerMeal: 45, foodArticles: ['Maize', 'Beans', 'Spinach', 'Milk'], missedReason: 'Absent', spendTerm: '1.2M', spendYear: '3.6M', allocatedYear: '4.0M', milk: 450, milkRemaining: 8
  },
  { 
    school: 'Westlands Primary ECDE', lunch: 'Rice & Beans', break: 'Uji (Porridge)', project: 'Mainstream Feeding', studentsFed: 295, studentsMissed: 15, costPerMeal: 38, foodArticles: ['Rice', 'Beans', 'Maize Flour', 'Sugar'], missedReason: 'Late Arrival', spendTerm: '0.8M', spendYear: '2.4M', allocatedYear: '3.0M', milk: 310, milkRemaining: 15
  },
];

const MOCK_INSPECTIONS = [
  { date: '2026-03-25', school: 'Kibra Community Center', inspector: 'Officer James M.', status: 'Fail', findings: 'Kitchen hygiene standards below par.', resolution: 'Re-inspection on April 5th', addressed: false, subcounty: 'Kibra' },
  { date: '2026-03-28', school: 'Nairobi Central Academy', inspector: 'Officer Alice W.', status: 'Pass', findings: 'All systems compliant. Adequate staffing.', resolution: 'N/A', addressed: true, subcounty: 'Starehe' },
];

const MOCK_STAFF = [
  { id: 'T001', name: 'Gladys Atieno', school: 'Nairobi Central Academy', role: 'Lead Teacher', tsc: 'TSC/4521/20', qualification: 'Degree in Early Childhood', phone: '+254 711 000 111' },
  { id: 'T002', name: 'Samuel Kiprop', school: 'Westlands Primary ECDE', role: 'Assistant Teacher', tsc: 'TSC/8892/21', qualification: 'Diploma in Education', phone: '+254 722 000 222' },
  { id: 'T003', name: 'Mercy Wamae', school: 'Kibra Community Center', role: 'School Head', tsc: 'TSC/1234/18', qualification: 'Masters in Admin', phone: '+254 733 000 333' },
];

const MOCK_HEALTH = [
  { id: 'H001', program: 'Polio Vaccination Drive', status: 'In Progress', reached: '840', target: '1000', type: 'Vaccine', nextDate: '2026-04-10', provider: 'County Health Dept' },
  { id: 'H002', program: 'Vitamin A Supplementation', status: 'Completed', reached: '2450', target: '2500', type: 'Supplement', nextDate: '2026-06-15', provider: 'UNICEF Partnership' },
  { id: 'H003', program: 'Deworming Exercise', status: 'Planned', reached: '0', target: '3200', type: 'Supplement', nextDate: '2026-04-20', provider: 'Ministry of Health' },
];

const CountyGovernmentDashboard: React.FC<Props> = ({ countyId = 'KE-NRB-047', onLogout }) => {
  const [activeTab, setActiveTab] = useState('executive-command');
  const [activeInsight, setActiveInsight] = useState('alerts');
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [aiInput, setAiInput] = useState('');
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [isAddingMeal, setIsAddingMeal] = useState(false);
  const [ladderIndex, setLadderIndex] = useState(0);
  const [countySlogan, setCountySlogan] = useState('A City of Order and Dignity');
  const [navItems, setNavItems] = useState(navItemsOriginal);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [subcountyFilter, setSubcountyFilter] = useState('');
  const [wardFilter, setWardFilter] = useState('');
  
  // Attendance Drill-down State
  const [attendanceViewType, setAttendanceViewType] = useState('general');
  const [attendanceSelectedSchool, setAttendanceSelectedSchool] = useState('All Schools');
  const [attendanceSearch, setAttendanceSearch] = useState('');
  const [isSearchingSchool, setIsSearchingSchool] = useState(false);

  // Health & Nutrition State
  const [healthFilter, setHealthFilter] = useState('Active');
  const [mealSubTab, setMealSubTab] = useState('meal-summary');
  const [inspectionFilter, setInspectionFilter] = useState('Recent');
  const ladderPhrases = [
    "Analyzing school meal efficiency...",
    "Querying student attendance logs...",
    "Checking capitation audit status...",
    "Syncing with ministry databases..."
  ];

  const mealLadderPhrases = [
    "Auditing nutritional content...",
    "Cross-referencing school delivery logs...",
    "Calculating regional wastage...",
    "Validating capitation usage per meal...",
    "Generating nutritional scorecards..."
  ];

  useEffect(() => {
    if (!isAiThinking) return;
    const interval = setInterval(() => {
      setLadderIndex(prev => (prev + 1) % (activeTab === 'nutritional-push' ? mealLadderPhrases.length : ladderPhrases.length));
    }, 1500);
    return () => clearInterval(interval);
  }, [isAiThinking, activeTab]);

  const handleAiSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiInput.trim()) return;
    setIsAiThinking(true);
    setTimeout(() => {
      setIsAiThinking(false);
      setAiInput('');
    }, 4500);
  };

  const greeting = useMemo(() => getTimeGreeting(), []);
  const currentSubTabs = subMenuMap[activeTab] || [];

  const handleTabChange = (id: string) => {
    setActiveTab(id);
    const subs = subMenuMap[id];
    if (subs && subs.length > 0) setActiveInsight(subs[0].id);
  };

  const renderAddMealModal = () => (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-stone-900/40 backdrop-blur-sm">
       <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
         className="w-full max-w-lg bg-white rounded-[3rem] p-10 shadow-2xl relative">
          <button onClick={() => setIsAddingMeal(false)} className="absolute top-8 right-8 text-stone-300 hover:text-stone-900 transition-colors">
             <X size={24} />
          </button>
          
          <div className="space-y-8">
             <div>
                <h3 className="text-2xl font-light text-stone-900 tracking-tight">Add school to meal program</h3>
                <p className="text-[12px] font-bold text-stone-400 mt-2">Set up meals and budget for a new school.</p>
             </div>

             <div className="space-y-6">
                <div className="space-y-2">
                   <label className="text-[10px] font-bold text-stone-400 font-black tracking-wide pl-2">Facility Name</label>
                   <select className="w-full px-5 py-4 bg-stone-50 border border-stone-100 rounded-2xl text-[13px] font-bold text-stone-900 outline-none focus:border-[#1DA1F2]">
                      <option>Select school from registry...</option>
                      {MOCK_SCHOOLS.map(s => <option key={s.id}>{s.name}</option>)}
                   </select>
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-bold text-stone-400 font-black tracking-wide pl-2">Meal Program Type</label>
                   <div className="grid grid-cols-2 gap-4">
                      <button className="px-5 py-4 bg-[#1DA1F2] text-white rounded-2xl text-[12px] font-bold shadow-lg shadow-[#1DA1F2]/20">Standard Lunch</button>
                      <button className="px-5 py-4 bg-stone-50 border border-stone-100 rounded-2xl text-[12px] font-bold text-stone-400">Cup of Milk</button>
                   </div>
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-bold text-stone-400 font-black tracking-wide pl-2">Annual Allocation (KES)</label>
                   <input type="number" placeholder="e.g. 1,000,000" className="w-full px-5 py-4 bg-stone-50 border border-stone-100 rounded-2xl text-[13px] font-bold text-stone-900 outline-none focus:border-[#1DA1F2]" />
                </div>
             </div>

             <div className="flex gap-4 pt-4">
                <button onClick={() => setIsAddingMeal(false)} className="flex-1 py-4 bg-stone-900 text-white rounded-2xl text-[13px] font-black tracking-widest uppercase hover:bg-stone-800 transition-all shadow-xl shadow-stone-900/20">
                   Activate Enrollment
                </button>
             </div>
          </div>
       </motion.div>
    </div>
  );

  const renderSchoolsList = () => {
    const filteredSchools = MOCK_SCHOOLS.filter(s => 
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
      (subcountyFilter === '' || s.subcounty === subcountyFilter) &&
      (wardFilter === '' || s.ward === wardFilter)
    );

    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-700 pt-10">
        <div className="flex flex-col md:flex-row gap-4 items-end justify-between bg-white border border-stone-100 p-6 rounded-[2rem] shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1">
             <div className="space-y-2">
                <label className="text-[10px] font-bold text-stone-400 font-black tracking-wide pl-2">Find school</label>
                <div className="relative">
                   <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-300" size={16} />
                   <input type="text" placeholder="Search by name..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-stone-50 border border-stone-100 rounded-xl text-[13px] font-bold outline-none focus:border-[#1DA1F2]" />
                </div>
             </div>
             <div className="space-y-2">
                <label className="text-[10px] font-bold text-stone-400 font-black tracking-wide pl-2">Sub-county</label>
                <select className="w-full px-4 py-3 bg-stone-50 border border-stone-100 rounded-xl text-[13px] font-bold outline-none focus:border-[#1DA1F2]"
                  value={subcountyFilter} onChange={(e) => setSubcountyFilter(e.target.value)}>
                   <option value="">All subcounties</option>
                   <option value="Starehe">Starehe</option>
                   <option value="Westlands">Westlands</option>
                   <option value="Kibra">Kibra</option>
                </select>
             </div>
             <div className="space-y-2">
                <label className="text-[10px] font-bold text-stone-400 font-black tracking-wide pl-2">Ward</label>
                <select className="w-full px-4 py-3 bg-stone-50 border border-stone-100 rounded-xl text-[13px] font-bold outline-none focus:border-[#1DA1F2]"
                  value={wardFilter} onChange={(e) => setWardFilter(e.target.value)}>
                   <option value="">All wards</option>
                   <option value="Central">Central</option>
                   <option value="Parklands">Parklands</option>
                   <option value="Lindi">Lindi</option>
                </select>
             </div>
          </div>
        </div>

        <div className="bg-white border border-stone-100 rounded-[2.5rem] overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead className="bg-stone-50 border-b border-stone-100 text-stone-400">
               <tr>
                  <th className="py-5 px-8 text-[10px] font-black font-black tracking-wide">School & Location</th>
                  <th className="py-5 px-6 text-[10px] font-black font-black tracking-wide">Headteacher</th>
                  <th className="py-5 px-6 text-[10px] font-black font-black tracking-wide">Hosting</th>
                  <th className="py-5 px-6 text-[10px] font-black font-black tracking-wide text-center">Pupils</th>
                  <th className="py-5 px-6 text-[10px] font-black font-black tracking-wide text-center">Staff</th>
                  <th className="py-5 px-6 text-[10px] font-black font-black tracking-wide">Ratio</th>
                  <th className="py-5 px-6 text-[10px] font-black font-black tracking-wide">Contact</th>
               </tr>
            </thead>
            <tbody>
              {filteredSchools.map((s, i) => (
                <tr key={i} className="hover:bg-stone-50/50 transition-colors border-b border-stone-50 last:border-0">
                  <td className="py-6 px-8">
                     <p className="font-bold text-stone-900 leading-none">{s.name}</p>
                     <p className="text-[10px] font-bold text-stone-400 mt-2">{s.subcounty} — {s.ward}</p>
                  </td>
                  <td className="py-6 px-6 font-bold text-stone-600">{s.headteacher}</td>
                  <td className="py-6 px-6">
                     <span className={`px-3 py-1 rounded-full text-[9px] font-black font-black tracking-wide
                        ${s.type === 'Separate' ? 'bg-[#1DA1F2]/5 text-[#1DA1F2]' : 'bg-stone-100 text-stone-400'}`}>
                        {s.type}
                     </span>
                  </td>
                  <td className="py-6 px-6 text-center font-bold text-stone-900">{s.students}</td>
                  <td className="py-6 px-6 text-center font-bold text-stone-900">{s.staff}</td>
                  <td className="py-6 px-6 font-bold text-stone-600">{s.ratio}</td>
                  <td className="py-6 px-6 space-y-1">
                     <div className="flex items-center gap-2 text-[10px] font-bold text-stone-500">
                        <Phone size={12} /> {s.phone}
                     </div>
                     <div className="flex items-center gap-2 text-[10px] font-bold text-stone-500">
                        <Mail size={12} /> {s.email}
                     </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };
  const renderAttendance = () => {
    return (
      <div className="space-y-12 animate-in fade-in slide-in-from-bottom-2 duration-700 pt-10">
        <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-center justify-between">
           <div className="flex items-center gap-4">
              <p className="text-[10px] font-bold text-stone-600 border-r border-stone-200 pr-4">Filter View</p>
              <div className="flex items-center gap-2">
                 {['Day', 'Week', 'Month', 'Term'].map(t => (
                    <button key={t} className={`px-5 py-2 rounded-xl text-[11px] font-bold transition-all border
                      ${t === 'Term' ? 'bg-[#1DA1F2] text-white border-[#1DA1F2] shadow-lg shadow-[#1DA1F2]/20' : 'bg-white border-stone-100 text-stone-400 hover:text-stone-900'}`}>
                      {t}
                    </button>
                 ))}
              </div>
           </div>
           
           <div className="flex items-center gap-4 relative">
              <div className="space-y-1 text-right mr-2">
                 <p className="text-[9px] font-bold text-stone-600">Focus Analysis</p>
                 <p className="text-[11px] font-bold text-stone-500">Drill-down by Facility</p>
              </div>
              
              <div className="relative group min-w-[240px]">
                 <div className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-300 pointer-events-none group-focus-within:text-[#1DA1F2] transition-colors"><Search size={14} /></div>
                 <input type="text" placeholder="Search school to focus..." value={attendanceSearch} 
                   onChange={(e) => { setAttendanceSearch(e.target.value); setIsSearchingSchool(true); }}
                   onFocus={() => setIsSearchingSchool(true)}
                   className="w-full pl-10 pr-4 py-3 bg-white border border-stone-100 rounded-xl text-[12px] font-bold text-stone-900 outline-none focus:border-[#1DA1F2] shadow-sm transition-all" />
                 
                 <AnimatePresence>
                    {isSearchingSchool && (
                       <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                         className="absolute top-full left-0 right-0 mt-2 bg-white border border-stone-100 rounded-2xl shadow-2xl overflow-hidden z-50 max-h-60 overflow-y-auto">
                          <button onClick={() => { setAttendanceSelectedSchool('All Schools'); setAttendanceViewType('general'); setAttendanceSearch(''); setIsSearchingSchool(false); }}
                            className="w-full text-left px-5 py-4 hover:bg-stone-50 border-b border-stone-50 transition-colors">
                             <p className="text-[11px] font-bold text-[#1DA1F2]">Show All Schools</p>
                          </button>
                          {MOCK_SCHOOLS.filter(s => s.name.toLowerCase().includes(attendanceSearch.toLowerCase())).map(s => (
                             <button key={s.id} onClick={() => { setAttendanceSelectedSchool(s.name); setAttendanceViewType('specific'); setAttendanceSearch(s.name); setIsSearchingSchool(false); }}
                               className="w-full text-left px-5 py-4 hover:bg-stone-50 border-b border-stone-50 transition-colors last:border-0">
                                <p className="text-[12px] font-black text-stone-900">{s.name}</p>
                                <p className="text-[10px] font-bold text-stone-400 mt-0.5">{s.subcounty} — {s.ward}</p>
                             </button>
                          ))}
                          {MOCK_SCHOOLS.filter(s => s.name.toLowerCase().includes(attendanceSearch.toLowerCase())).length === 0 && (
                             <div className="p-5 text-center"><p className="text-[11px] font-bold text-stone-400">No facilities found.</p></div>
                          )}
                       </motion.div>
                    )}
                 </AnimatePresence>
              </div>
           </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Male Attendance', value: attendanceViewType === 'general' ? '18,420' : '214', percent: '94%', color: 'text-[#1DA1F2]', icon: Users, accent: 'bg-[#1DA1F2]/5' },
            { label: 'Female Attendance', value: attendanceViewType === 'general' ? '19,105' : '228', percent: '97%', color: 'text-pink-600', icon: Users, accent: 'bg-pink-50' },
            { label: 'Current Average', value: attendanceViewType === 'general' ? '95.5%' : '98.2%', percent: attendanceViewType === 'general' ? '0.4% Up' : 'Target Met', color: 'text-stone-900', icon: Activity, accent: 'bg-stone-50' },
            { label: 'Reporting Rate', value: '100%', percent: 'No Delay', color: 'text-[#1DA1F2]', icon: ShieldCheck, accent: 'bg-stone-50' },
          ].map((m, i) => (
            <div key={i} className="bg-white border border-stone-100 py-4 px-5 rounded-2xl shadow-sm transition-all cursor-default group flex items-center gap-4">
               <div className={`w-10 h-10 rounded-xl ${m.accent} flex items-center justify-center shrink-0`}>
                  <m.icon size={16} className={m.color} />
               </div>
               <div className="space-y-0.5">
                  <p className="text-[10px] font-bold text-stone-600">{m.label}</p>
                  <div className="flex items-baseline gap-2">
                     <span className={`text-sm font-bold text-stone-900`}>{m.value}</span>
                     <span className="text-[10px] font-bold text-stone-500">{m.percent}</span>
                  </div>
               </div>
            </div>
          ))}
        </div>

        <div className="space-y-6">
           <div className="flex items-center justify-between">
              <div>
                 <h3 className="text-xl font-bold text-stone-900 tracking-tight">Today's attendance list</h3>
                 <p className="text-[11px] font-bold text-stone-500 mt-0.5">Daily attendance updates from all areas.</p>
              </div>
              <p className="text-[11px] font-bold text-[#1DA1F2] underline cursor-pointer">Export Full Log</p>
           </div>
           <div className="bg-white border border-stone-100 rounded-[2.5rem] overflow-hidden shadow-sm">
              <table className="w-full text-left border-collapse">
                 <thead className="bg-stone-50 border-b border-stone-100">
                    <tr>
                       <th className="py-5 px-8 text-[10px] font-bold text-stone-600">Reporting Center</th>
                       <th className="py-5 px-6 text-[10px] font-bold text-stone-600">Enrolled</th>
                       <th className="py-5 px-6 text-[10px] font-bold text-stone-600">Present</th>
                       <th className="py-5 px-6 text-[10px] font-bold text-stone-600">Rate</th>
                       <th className="py-5 px-8 text-[10px] font-bold text-stone-600 text-right">Status</th>
                    </tr>
                 </thead>
                 <tbody>
                    {MOCK_SCHOOLS.map((s, i) => (
                       <tr key={i} className="border-b border-stone-50 last:border-0 hover:bg-stone-50 transition-all">
                          <td className="py-5 px-8 font-bold text-stone-900">{s.name}</td>
                          <td className="py-5 px-6 font-bold text-stone-500">{s.students}</td>
                          <td className="py-5 px-6 font-bold text-stone-900">{Math.floor(s.students * 0.95)}</td>
                          <td className="py-5 px-6">
                             <div className="flex items-center gap-2">
                                <span className="text-[11px] font-black text-stone-900">95%</span>
                                <div className="w-16 h-1 bg-stone-100 rounded-full overflow-hidden">
                                   <div className="h-full bg-[#1DA1F2]" style={{ width: '95%' }} />
                                </div>
                             </div>
                          </td>
                          <td className="py-5 px-8 text-right">
                             <span className="px-3 py-1 rounded-full bg-green-50 text-green-600 text-[9px] font-bold">Success</span>
                          </td>
                       </tr>
                    ))}
                 </tbody>
              </table>
           </div>
        </div>

        <div className="bg-[#1DA1F2]/5 border border-[#1DA1F2]/10 rounded-[4rem] p-12 relative overflow-hidden group">
           <div className="absolute top-0 right-0 p-16 opacity-[0.03] group-hover:scale-110 transition-transform duration-1000"><BarChart2 size={200} className="text-[#1DA1F2]" /></div>
           <div className="relative z-10">
              <div className="flex items-center justify-between mb-8">
                 <div className="max-w-2xl">
                    <h3 className="text-2xl font-black text-stone-900 tracking-tight">{attendanceViewType === 'general' ? 'Attendance trends and predictions' : `${attendanceSelectedSchool} attendance`}</h3>
                    <p className="text-[12px] font-bold text-[#1DA1F2] mt-1">Checking patterns to help with school resources, funds, and meals.</p>
                 </div>
                 <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-[#1DA1F2]" /><span className="text-[10px] font-bold text-stone-600">Active Data</span></div>
                    <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-[#1DA1F2]/20" /><span className="text-[10px] font-bold text-stone-600">County Baseline</span></div>
                 </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
                 {[
                    { label: 'Weekly Average', value: '94.2%', trend: '+1.2%', color: 'text-stone-900' },
                    { label: 'Monthly Average', value: '91.8%', trend: '-0.5%', color: 'text-stone-700' },
                    { label: 'Termly Performance', value: '93.5%', trend: 'On Track', color: 'text-[#1DA1F2]' },
                    { label: 'Annual Forecast', value: '92.1%', trend: 'Target Met', color: 'text-green-600' },
                 ].map((m, i) => (
                    <div key={i} className="bg-white/50 border border-[#1DA1F2]/10 p-5 rounded-3xl backdrop-blur-sm">
                       <p className="text-[10px] font-bold text-stone-500 mb-1">{m.label}</p>
                       <div className="flex items-baseline gap-2">
                          <span className={`text-lg font-black ${m.color}`}>{m.value}</span>
                          <span className="text-[9px] font-bold text-stone-400">{m.trend}</span>
                       </div>
                    </div>
                 ))}
              </div>

              <div className="h-64 flex items-end justify-between gap-3 px-12 pb-10 border-b border-stone-200/50">
                 {[72, 85, 55, 92, 80, 88, 95, 75, 82, 98, 65, 77, 89, 94, 73, 81, 92, 88, 76, 95].map((h, i) => (
                    <div key={i} className="w-3.5 relative group h-full flex flex-col justify-end">
                       <div className="absolute inset-0 flex flex-col justify-end pointer-events-none">
                          <div style={{ height: `90%` }} className="w-full bg-[#1DA1F2]/10 rounded-t-lg" />
                       </div>
                       <motion.div initial={{ height: 0 }} animate={{ height: `${h}%` }} transition={{ delay: i * 0.02, duration: 0.8 }} 
                         className="w-full bg-[#1DA1F2] rounded-t-lg shadow-md relative z-10 group-hover:brightness-110 transition-all cursor-pointer">
                           <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-stone-900 text-white text-[10px] font-bold px-3 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-all shadow-xl -translate-y-2 group-hover:translate-y-0 z-[60]">
                              {h}%
                           </div>
                       </motion.div>
                    </div>
                 ))}
              </div>
              <div className="flex justify-between mt-6 px-10">
                 {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun', 'Mon', 'Tue', 'Wed'].map((d, i) => (
                    <span key={i} className="text-[10px] font-bold text-stone-500">{d}</span>
                 ))}
              </div>
           </div>
        </div>
      </div>
    );
  };


  const renderInspections = () => {
    const filteredInspections = MOCK_INSPECTIONS.filter(ins => {
       if (inspectionFilter === 'Recent') return true;
       if (inspectionFilter === 'Failed') return ins.status === 'Fail';
       if (inspectionFilter === 'Compliant') return ins.status === 'Pass';
       if (inspectionFilter === 'Scheduled') return false; // Mock scheduled state
       return true;
    });

    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-700 pt-10">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
           <div className="space-y-1">
              <h2 className="text-xl font-bold text-stone-900 tracking-tight">School standards and health checks</h2>
              <p className="text-[11px] font-bold text-stone-600">Checking standards across all active schools.</p>
           </div>
           <button className="flex items-center gap-2 px-6 py-2.5 bg-stone-900 text-white rounded-xl text-[11px] font-bold shadow-xl shadow-stone-900/10 hover:scale-105 transition-all">
              <Plus size={14} /> Plan Facility Audit
           </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
           {[
              { label: 'Total Audits', value: '142', sub: 'Term 1 Cycle', icon: FileText, color: 'text-stone-900' },
              { label: 'Critical Issues', value: '4', sub: 'Action Required', icon: ShieldAlert, color: 'text-red-600' },
              { label: 'Pending Resolution', value: '12', sub: 'Assigned', icon: Activity, color: 'text-[#1DA1F2]' },
              { label: 'Risk Level', value: 'Low', sub: 'County-wide', icon: ShieldCheck, color: 'text-green-600' },
           ].map((m, i) => (
              <div key={i} className="bg-white border border-stone-100 p-6 rounded-[2rem] shadow-sm">
                 <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-stone-50 flex items-center justify-center text-stone-400"><m.icon size={14} /></div>
                    <p className="text-[9px] font-bold text-stone-600">{m.label}</p>
                 </div>
                 <p className={`text-xl font-bold ${m.color}`}>{m.value}</p>
                 <p className="text-[10px] font-bold text-stone-500 mt-1">{m.sub}</p>
              </div>
           ))}
        </div>

        <div className="flex items-center gap-4 py-2 border-b border-stone-50">
           <p className="text-[10px] font-bold text-stone-400 uppercase pr-4 border-r border-stone-200">Filter Logic</p>
           <div className="flex items-center gap-2">
              {['Recent', 'Failed', 'Compliant', 'Scheduled'].map(t => (
                 <button key={t} onClick={() => setInspectionFilter(t)} className={`px-5 py-2 rounded-xl text-[11px] font-bold transition-all border
                   ${inspectionFilter === t ? 'bg-[#1DA1F2] text-white border-[#1DA1F2] shadow-lg shadow-[#1DA1F2]/20' : 'bg-transparent border-transparent text-stone-400 hover:text-stone-900'}`}>
                   {t}
                 </button>
              ))}
           </div>
        </div>

        <div className="bg-white border border-stone-100 rounded-[2.5rem] overflow-hidden shadow-sm">
           <table className="w-full text-left border-collapse">
              <thead className="bg-stone-50 border-b border-stone-100">
                 <tr>
                    <th className="py-5 px-8 text-[10px] font-bold text-stone-600">Log Details</th>
                    <th className="py-5 px-6 text-[10px] font-bold text-stone-600">Inspector</th>
                    <th className="py-5 px-6 text-[10px] font-bold text-stone-600">Facility</th>
                    <th className="py-5 px-6 text-[10px] font-bold text-stone-600">Findings</th>
                    <th className="py-5 px-6 text-[10px] font-bold text-stone-600">Status</th>
                    <th className="py-5 px-8 text-[10px] font-bold text-stone-600 text-right">Action</th>
                 </tr>
              </thead>
              <tbody>
                 {filteredInspections.map((ins, i) => (
                    <tr key={i} className="border-b border-stone-50 last:border-0 hover:bg-stone-50 transition-all group">
                       <td className="py-6 px-8">
                          <div className="flex items-center gap-3">
                             <Calendar size={14} className="text-[#1DA1F2]" />
                             <span className="font-bold text-stone-900">{ins.date}</span>
                          </div>
                       </td>
                       <td className="py-6 px-6 font-bold text-stone-600">
                          <div className="flex items-center gap-2">
                             <div className="w-6 h-6 rounded-full bg-stone-100 flex items-center justify-center text-[8px]">{ins.inspector[0]}</div>
                             {ins.inspector}
                          </div>
                       </td>
                       <td className="py-6 px-6">
                          <p className="font-bold text-stone-900">{ins.school}</p>
                          <p className="text-[10px] font-bold text-stone-400 mt-1">{ins.subcounty}</p>
                       </td>
                       <td className="py-6 px-6">
                          <p className="text-[11px] font-medium text-stone-500 italic max-w-[200px] leading-relaxed">"{ins.findings}"</p>
                       </td>
                       <td className="py-6 px-6">
                          <div className={`flex items-center gap-2 px-3 py-1 rounded-full w-max text-[9px] font-bold
                             ${ins.status === 'Pass' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                             {ins.status === 'Pass' ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                             {ins.status}
                          </div>
                       </td>
                       <td className="py-6 px-8 text-right">
                          <div className="space-y-1">
                             <button className={`text-[11px] font-black ${ins.addressed ? 'text-stone-300 cursor-default' : 'text-[#1DA1F2] hover:underline'}`}>
                                {ins.addressed ? 'Finalized' : 'Resolve'}
                             </button>
                             <p className="text-[9px] font-bold text-stone-400 italic block">{ins.resolution}</p>
                          </div>
                       </td>
                    </tr>
                 ))}
              </tbody>
           </table>
        </div>
      </div>
    );
  };

  const renderMeals = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-700 pt-10">
      <div className="flex items-center justify-between">
         <div className="space-y-1">
            <h2 className="text-xl font-bold text-stone-900 tracking-tight">School meal management</h2>
            <p className="text-[11px] font-bold text-stone-400">Managing budgets and meals for schools.</p>
         </div>
         <div className="flex items-center gap-3">
            {[{id: 'meal-summary', label: 'Summary'}, {id: 'stock-levels', label: 'Stock Levels'}].map(t => (
               <button key={t.id} onClick={() => setMealSubTab(t.id)} className={`px-5 py-2 rounded-xl text-[11px] font-bold transition-all border
                 ${mealSubTab === t.id ? 'bg-stone-900 text-white border-stone-900 shadow-lg shadow-stone-900/20' : 'bg-white border-stone-100 text-stone-400 hover:text-stone-900'}`}>
                 {t.label}
               </button>
            ))}
            <button onClick={() => setIsAddingMeal(true)} className="ml-4 flex items-center gap-2 px-6 py-2.5 bg-[#1DA1F2] text-white rounded-xl text-[11px] font-bold shadow-xl shadow-[#1DA1F2]/20">
               <Plus size={14} /> Enroll Facility
            </button>
         </div>
      </div>

      {mealSubTab === 'meal-summary' ? (
         <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {MOCK_MEALS.map((meal, i) => (
               <div key={i} className="bg-white border border-stone-100 rounded-[3rem] p-10 hover:shadow-xl transition-all group relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-10 opacity-[0.03] group-hover:scale-110 transition-transform duration-1000"><Utensils size={120} /></div>
                  <div className="space-y-8 relative z-10">
                     <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-stone-50 flex items-center justify-center text-stone-400 group-hover:bg-[#1DA1F2]/10 group-hover:text-[#1DA1F2] transition-colors"><MapPin size={24} /></div>
                        <div>
                           <h3 className="text-[17px] font-bold text-stone-900 tracking-tight">{meal.school}</h3>
                           <p className="text-[10px] font-bold text-[#1DA1F2] uppercase">{meal.project}</p>
                        </div>
                     </div>

                     <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-stone-50 rounded-[2rem] border border-stone-100 space-y-3">
                           <p className="text-[9px] font-bold text-stone-600">Menu</p>
                           <div className="space-y-2">
                              <p className="text-[11px] font-bold text-stone-900 leading-tight">Break: <span className="text-stone-500 font-medium">{meal.break}</span></p>
                              <p className="text-[11px] font-bold text-stone-900 leading-tight">Lunch: <span className="text-stone-500 font-medium">{meal.lunch}</span></p>
                           </div>
                        </div>
                        <div className="p-4 bg-stone-50 rounded-[2rem] border border-stone-100 space-y-3">
                           <p className="text-[9px] font-bold text-stone-600">Financials</p>
                           <div className="space-y-2">
                              <p className="text-[11px] font-bold text-stone-900 leading-tight">Term: <span className="text-[#1DA1F2]">{meal.spendTerm}</span></p>
                              <p className="text-[11px] font-bold text-stone-900 leading-tight">Year: <span className="text-stone-700">{meal.spendYear}</span></p>
                              <p className="text-[9px] font-bold text-stone-400">Budget: {meal.allocatedYear}</p>
                           </div>
                        </div>
                     </div>

                     <div className="p-4 bg-[#1DA1F2]/5 rounded-[2rem] border border-[#1DA1F2]/10 relative group-hover:bg-[#1DA1F2]/10 transition-colors">
                        <div className="flex items-center justify-between mb-3">
                           <div className="flex items-center gap-2">
                              <ShieldCheck size={14} className="text-[#1DA1F2]" />
                              <p className="text-[9px] font-bold text-[#1DA1F2]">Milk Inventory Feed</p>
                           </div>
                           <span className="text-[10px] font-bold text-[#1DA1F2]">{meal.milk} Given</span>
                        </div>
                        <div className="w-full h-1.5 bg-white rounded-full overflow-hidden">
                           <div className="h-full bg-[#1DA1F2]" style={{ width: `${((meal.milk - meal.milkRemaining) / meal.milk) * 100}%` }} />
                        </div>
                        <p className="text-[9px] font-bold text-stone-400 mt-2 italic">* {meal.milkRemaining} Packets warehouse balance (absence offset)</p>
                     </div>

                     <div className="pt-4 flex items-center justify-between border-t border-stone-100">
                        <div className="flex gap-6">
                           <div>
                              <p className="text-[13px] font-black text-stone-900">{meal.studentsFed}</p>
                              <p className="text-[9px] font-bold text-stone-400 font-black">Ate today</p>
                           </div>
                           <div>
                              <p className="text-[13px] font-black text-[#1DA1F2]">{meal.costPerMeal}</p>
                              <p className="text-[9px] font-bold text-stone-400 font-black">Cost/Meal</p>
                           </div>
                        </div>
                        <button className="text-[10px] font-bold text-[#1DA1F2] hover:underline flex items-center gap-1">Live Feed <ChevronRight size={12} /></button>
                     </div>
                  </div>
               </div>
            ))}
         </div>
      ) : (
         <div className="bg-white border border-stone-100 rounded-[3rem] overflow-hidden shadow-sm">
            <table className="w-full text-left">
               <thead className="bg-stone-50 border-b border-stone-100">
                  <tr>
                     <th className="py-5 px-8 text-[10px] font-bold text-stone-600">School</th>
                     <th className="py-5 px-6 text-[10px] font-bold text-stone-600">Stock Item</th>
                     <th className="py-5 px-6 text-[10px] font-bold text-stone-600">Warehouse Bal</th>
                     <th className="py-5 px-6 text-[10px] font-bold text-stone-600">Last Delivery</th>
                     <th className="py-5 px-8 text-[10px] font-bold text-stone-600 text-right">Status</th>
                  </tr>
               </thead>
               <tbody>
                  {MOCK_MEALS.map((m, i) => (
                     <tr key={i} className="border-b border-stone-50 last:border-0 hover:bg-stone-50 transition-all">
                        <td className="py-6 px-8 font-bold text-stone-900">{m.school}</td>
                        <td className="py-6 px-6 font-bold text-stone-600">Standard Milk (250ml)</td>
                        <td className="py-6 px-6 font-black text-[#1DA1F2]">{m.milkRemaining} Units</td>
                        <td className="py-6 px-6 font-bold text-stone-400 text-[11px]">Mar 28, 2026</td>
                        <td className="py-6 px-8 text-right">
                           <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${m.milkRemaining < 10 ? 'bg-amber-50 text-amber-600' : 'bg-green-50 text-green-600'}`}>
                              {m.milkRemaining < 10 ? 'Low Stock' : 'Optimized'}
                           </span>
                        </td>
                     </tr>
                  ))}
               </tbody>
            </table>
         </div>
      )}
    </div>
  );

  const renderHealth = () => {
    const filteredHealth = MOCK_HEALTH.filter(h => {
       if (healthFilter === 'Active') return h.status === 'In Progress';
       return h.status === healthFilter;
    });

    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-700 pt-10">
        <div className="flex items-center justify-between">
           <div className="space-y-1">
              <h2 className="text-xl font-bold text-stone-900 tracking-tight">County health programs</h2>
              <p className="text-[11px] font-bold text-stone-400">Tracking vaccinations and child health in schools.</p>
           </div>
           <div className="flex items-center gap-3">
              {['Active', 'Planned', 'Completed'].map(t => (
                 <button key={t} onClick={() => setHealthFilter(t)} className={`px-5 py-2 rounded-xl text-[11px] font-bold transition-all border
                   ${healthFilter === t ? 'bg-[#1DA1F2] text-white border-[#1DA1F2] shadow-lg shadow-[#1DA1F2]/30' : 'bg-white border-stone-100 text-stone-400 hover:text-stone-900'}`}>
                   {t}
                 </button>
              ))}
           </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           {filteredHealth.map((h, i) => (
              <div key={i} className="bg-white border border-stone-100 p-8 rounded-[3rem] shadow-sm hover:shadow-xl transition-all group relative overflow-hidden">
                 <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:scale-110 transition-transform duration-1000"><ShieldCheck size={100} /></div>
                 <div className="space-y-8 relative z-10">
                    <div className="flex items-center justify-between">
                       <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${h.status === 'In Progress' ? 'bg-blue-50 text-blue-600' : h.status === 'Completed' ? 'bg-green-50 text-green-600' : 'bg-stone-50 text-stone-400'}`}>{h.status}</span>
                       <span className="text-[10px] font-bold text-stone-400 group-hover:text-stone-900 transition-colors uppercase tracking-widest">{h.type}</span>
                    </div>
                    <div>
                       <h3 className="text-[17px] font-bold text-stone-900 leading-snug">{h.program}</h3>
                       <p className="text-[11px] font-bold text-[#1DA1F2] mt-1 italic">Provider: {h.provider}</p>
                    </div>
                    
                    <div className="space-y-2">
                       <div className="flex items-center justify-between text-[11px] font-black">
                          <span className="text-stone-900">{h.reached} / {h.target} Reached</span>
                          <span className="text-[#1DA1F2]">{Math.floor((parseInt(h.reached) / parseInt(h.target)) * 100)}%</span>
                       </div>
                       <div className="w-full h-1.5 bg-stone-50 rounded-full overflow-hidden">
                          <div className="h-full bg-[#1DA1F2]" style={{ width: `${(parseInt(h.reached) / parseInt(h.target)) * 100}%` }} />
                       </div>
                    </div>

                    <div className="pt-6 border-t border-stone-50 flex items-center justify-between">
                       <div className="flex items-center gap-2">
                          <Calendar size={12} className="text-stone-300" />
                          <span className="text-[10px] font-bold text-stone-400">Next: {h.nextDate}</span>
                       </div>
                       <button className="text-[10px] font-black uppercase tracking-widest text-[#1DA1F2] hover:underline">Full Audit</button>
                    </div>
                 </div>
              </div>
           ))}
        </div>
      </div>
    );
  };  const renderStaffAllocation = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-700 pt-10">
      <div className="flex items-center justify-between">
         <div className="space-y-1">
            <h2 className="text-xl font-bold text-stone-900 tracking-tight">Teachers and staff list</h2>
            <p className="text-[11px] font-bold text-stone-400">Checking teacher details and staff numbers across the county.</p>
         </div>
         <button className="flex items-center gap-2 px-6 py-2.5 bg-stone-900 text-white rounded-xl text-[11px] font-bold shadow-xl shadow-stone-900/10 hover:scale-105 transition-all">
            <Plus size={14} /> Add Staff Record
         </button>
      </div>

      <div className="bg-white border border-stone-100 rounded-[2.5rem] overflow-hidden shadow-sm">
         <table className="w-full text-left border-collapse">
            <thead className="bg-stone-50 border-b border-stone-100">
               <tr>
                  <th className="py-5 px-8 text-[10px] font-black text-stone-400 uppercase tracking-widest">Officer Name</th>
                  <th className="py-5 px-6 text-[10px] font-black text-stone-400 uppercase tracking-widest">Station</th>
                  <th className="py-5 px-6 text-[10px] font-black text-stone-400 uppercase tracking-widest">TSC Number</th>
                  <th className="py-5 px-6 text-[10px] font-black text-stone-400 uppercase tracking-widest">Qualification</th>
                  <th className="py-5 px-8 text-[10px] font-black text-stone-400 uppercase tracking-widest text-right">Contact</th>
               </tr>
            </thead>
            <tbody>
               {MOCK_STAFF.map((staff, i) => (
                  <tr key={i} className="border-b border-stone-50 last:border-0 hover:bg-stone-50 transition-all">
                     <td className="py-6 px-8">
                        <p className="font-bold text-stone-900">{staff.name}</p>
                        <p className="text-[10px] font-bold text-[#1DA1F2] mt-1">{staff.role}</p>
                     </td>
                     <td className="py-6 px-6 font-bold text-stone-600 truncate max-w-[180px]">{staff.school}</td>
                     <td className="py-6 px-6">
                        <span className="px-3 py-1 rounded-full bg-stone-100 text-stone-500 text-[10px] font-black uppercase tracking-widest">{staff.tsc}</span>
                     </td>
                     <td className="py-6 px-6 font-bold text-stone-500 text-[11px]">{staff.qualification}</td>
                     <td className="py-6 px-8 text-right font-bold text-stone-400 text-[11px]">{staff.phone}</td>
                  </tr>
               ))}
            </tbody>
         </table>
      </div>
    </div>
  );
  const renderSettingsPage = () => (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-2 duration-700 pt-10">
      <div className="flex items-center justify-between">
         <div className="space-y-1">
            <h2 className="text-xl font-bold text-stone-900 tracking-tight">County Administrative Settings</h2>
            <p className="text-[11px] font-bold text-stone-400">Manage your executive identity, slogans, and platform-wide branding preferences.</p>
         </div>
         <button className="flex items-center gap-2 px-6 py-2.5 bg-[#1DA1F2] text-white rounded-xl text-[11px] font-bold shadow-xl shadow-[#1DA1F2]/20 hover:scale-105 transition-all">
            <Save size={14} /> Save Changes
         </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         <div className="lg:col-span-2 space-y-8">
            <div className="bg-white border border-stone-100 rounded-[3rem] p-10 space-y-8 shadow-sm">
               <div className="space-y-6">
                  <div className="space-y-2">
                     <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest pl-2">Executive Identity</label>
                     <div className="flex items-center gap-4 p-4 bg-stone-50 border border-stone-100 rounded-[2rem]">
                        <div className="w-16 h-16 rounded-2xl bg-white border border-stone-100 flex items-center justify-center text-stone-300">
                           <Camera size={24} />
                        </div>
                        <div>
                           <p className="text-[13px] font-black text-stone-900">County Seal / Logo</p>
                           <p className="text-[10px] font-bold text-stone-400 mt-1">Recommended: PNG or SVG (Transparent)</p>
                        </div>
                        <button className="ml-auto px-5 py-2 bg-white border border-stone-100 rounded-xl text-[10px] font-bold text-stone-600 hover:bg-stone-100 transition-colors">Replace Seal</button>
                     </div>
                  </div>

                  <div className="space-y-2">
                     <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest pl-2">County Slogan</label>
                     <input type="text" value={countySlogan} onChange={(e) => setCountySlogan(e.target.value)} 
                       className="w-full px-6 py-4 bg-stone-50 border border-stone-100 rounded-[2rem] text-[13px] font-bold text-stone-900 outline-none focus:border-[#1DA1F2] transition-colors" />
                     <p className="text-[9px] font-bold text-stone-400 pl-4 mt-1 italic">* This slogan appears in the global header for all administrative users.</p>
                  </div>
               </div>

               <div className="pt-8 border-t border-stone-50 grid grid-cols-2 gap-6">
                  <div className="space-y-3">
                     <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest pl-2">Current Palette</p>
                     <div className="flex items-center gap-3 p-4 bg-stone-50 rounded-2xl">
                        <div className="w-4 h-4 rounded-full bg-[#1DA1F2]" />
                        <span className="text-[11px] font-bold text-stone-600">Twitter Blue (Executive)</span>
                     </div>
                  </div>
                  <div className="space-y-3">
                     <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest pl-2">Platform Mode</p>
                     <button className="w-full flex items-center justify-between p-4 bg-white border border-stone-100 rounded-2xl">
                        <div className="flex items-center gap-3">
                           <Palette size={14} className="text-stone-400" />
                           <span className="text-[11px] font-bold text-stone-900">Light Mode</span>
                        </div>
                        <ToggleLeft className="text-stone-200" size={20} />
                     </button>
                  </div>
               </div>
            </div>
         </div>

         <div className="space-y-8">
            <div className="bg-stone-900 rounded-[3rem] p-10 text-white relative overflow-hidden group shadow-2xl">
               <div className="absolute top-0 right-0 p-8 opacity-[0.05] group-hover:scale-110 transition-transform duration-1000">
                  <Lock size={120} />
               </div>
               <div className="relative z-10 space-y-6">
                  <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center">
                     <ShieldCheck size={24} className="text-[#1DA1F2]" />
                  </div>
                  <h3 className="text-[18px] font-bold tracking-tight">Security & Oversight</h3>
                  <p className="text-[13px] font-medium text-stone-400 leading-relaxed">Ensure all school-level data follows county privacy protocols. Only authorized directors can modify branding.</p>
                  <div className="pt-4">
                     <button className="w-full py-4 bg-[#1DA1F2] text-white rounded-2xl text-[12px] font-black uppercase tracking-widest shadow-xl shadow-[#1DA1F2]/20">Audit Access Log</button>
                  </div>
               </div>
            </div>
         </div>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'centre-directory': return renderSchoolsList();
      case 'nutritional-push': return renderMeals();
      case 'automated-follow-ups': return renderAttendance();
      case 'compliance-tracking': return renderInspections();
      case 'health-module': return renderHealth();
      case 'staff-allocation': return renderStaffAllocation();
      case 'executive-command':
        if (activeInsight === 'settings') return renderSettingsPage();
        
        const renderMonitoring = () => (
         <div className="space-y-10 animate-in fade-in duration-500">
            <div className="bg-[#1DA1F2]/5 border border-[#1DA1F2]/10 rounded-[3rem] p-10 relative overflow-hidden group shadow-xl shadow-[#1DA1F2]/5">
               <div className="absolute top-0 right-0 p-12 opacity-[0.05] group-hover:rotate-12 transition-transform duration-1000"><Zap size={140} className="text-[#1DA1F2]" /></div>
               <div className="relative z-10 flex flex-col lg:flex-row gap-12">
                  <div className="flex-1 space-y-6">
                     <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-[#1DA1F2] flex items-center justify-center text-white shadow-lg shadow-[#1DA1F2]/30"><Activity size={24} /></div>
                        <div>
                           <h3 className="text-xl font-bold text-stone-900 tracking-tight">Executive AI Summary</h3>
                           <p className="text-[10px] font-bold text-[#1DA1F2] mt-1">Live Intelligence Active</p>
                        </div>
                     </div>
                     <p className="text-[16px] font-medium text-stone-700 leading-relaxed max-w-2xl italic">"General Performance: <span className="text-stone-900 font-bold underline decoration-[#1DA1F2]/30 text-underline-offset-4 decoration-2">Success (92%)</span>. High focus needed in <span className="text-[#1DA1F2] font-black">Westlands</span> where audits are pending. Food funds usage is up by <span className="text-[#1DA1F2] font-bold">14%</span>."</p>
                     <div className="flex gap-4 pt-4">
                        <button className="px-7 py-3 bg-[#1DA1F2] text-white rounded-2xl text-[11px] font-bold shadow-xl shadow-[#1DA1F2]/20 hover:scale-105 transition-all">Update Audit Now</button>
                        <button className="px-7 py-3 bg-white border border-[#1DA1F2]/10 text-stone-600 rounded-2xl text-[11px] font-bold hover:bg-white/80 transition-all shadow-sm">Send This Info</button>
                     </div>
                  </div>
                  <div className="lg:w-[380px] bg-white border border-[#1DA1F2]/10 rounded-[2.5rem] p-8 flex flex-col justify-between shadow-2xl shadow-[#1DA1F2]/5">
                     <div>
                        <p className="text-[10px] font-bold text-stone-600 mb-6">Operations Report</p>
                        <div className="h-20 relative overflow-hidden mb-6">
                           <AnimatePresence mode="wait">
                              <motion.div key={isAiThinking ? ladderIndex : 'idle'} initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -20, opacity: 0 }} transition={{ duration: 0.5, ease: "easeInOut" }} className="absolute inset-0 flex flex-col"><p className="text-[12px] font-bold text-stone-500 leading-relaxed italic">{isAiThinking ? ladderPhrases[ladderIndex] : "Type a command to check on schools right now..."}</p></motion.div>
                           </AnimatePresence>
                        </div>
                     </div>
                     <form onSubmit={handleAiSubmit} className="relative">
                        <input type="text" value={aiInput} onChange={(e) => setAiInput(e.target.value)} placeholder={isAiThinking ? "Checking now..." : "Ask your assistant..."} disabled={isAiThinking} className="w-full pl-5 pr-12 py-4 bg-stone-50 border border-stone-100 rounded-2xl text-[11px] font-bold outline-none focus:border-[#1DA1F2] transition-all shadow-inner" />
                        <button type="submit" disabled={isAiThinking} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#1DA1F2] hover:scale-110 transition-transform"><Zap size={18} fill={isAiThinking ? "currentColor" : "none"} className={isAiThinking ? 'animate-pulse' : ''} /></button>
                     </form>
                  </div>
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                 { title: 'Kibra Attendance Drop', sub: 'Urgent Action Needed', level: 'Problem Found', color: 'text-red-600 bg-red-50', icon: ShieldAlert },
                 { title: 'Westlands Food Stock Low', sub: 'Action Required', level: 'Warning', color: 'text-[#1DA1F2] bg-[#1DA1F2]/5', icon: Utensils },
                 { title: 'Reporting Completed', sub: 'Everything On Track', level: 'Success', color: 'text-stone-900 bg-white border border-stone-200 shadow-sm', icon: CheckCircle2 },
              ].map((card, i) => (
                 <div key={i} className={`p-8 rounded-[2.5rem] relative overflow-hidden group hover:scale-[1.02] transition-all cursor-default ${card.color.includes('bg-white') ? 'bg-white' : card.color.split(' ')[1]}`}>
                    <div className="flex flex-col h-full justify-between gap-8">
                       <div>
                          <div className="flex items-center justify-between">
                             <span className={`px-4 py-1.5 rounded-full text-[9px] font-bold ${card.color.split(' ')[1].includes('white') ? 'bg-stone-50 border border-stone-100' : ''} ${card.color.split(' ')[0]}`}>{card.level}</span>
                             <card.icon size={16} className={card.color.split(' ')[0]} />
                          </div>
                          <h4 className="text-[17px] font-bold text-stone-900 mt-5 leading-snug">{card.title}</h4>
                          <p className="text-[12px] font-bold text-stone-400 mt-1.5">{card.sub}</p>
                       </div>
                       <button className="flex items-center gap-2 text-[10px] font-bold text-stone-500 group-hover:text-stone-900 transition-colors">See Full Report <ChevronRight size={14} /></button>
                    </div>
                 </div>
              ))}
            </div>
         </div>
      );

      const renderAlertsView = () => (
         <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="bg-red-50 border border-red-100 rounded-[2.5rem] p-10 flex items-center justify-between">
               <div className="flex items-center gap-6">
                  <div className="w-14 h-14 rounded-2xl bg-red-100 flex items-center justify-center text-red-600 shadow-lg shadow-red-600/10"><ShieldAlert size={28} /></div>
                  <div>
                     <h3 className="text-xl font-bold text-red-900 tracking-tight">Critical Security & Health Alerts</h3>
                     <p className="text-[12px] font-bold text-red-600/60 mt-1">Immediate Administrative Action Required</p>
                  </div>
               </div>
               <button className="px-6 py-2.5 bg-red-600 text-white rounded-xl text-[11px] font-bold shadow-xl shadow-red-600/20">Acknowledge All</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               {[
                  { school: 'Kibra Community ECDE', alert: 'Health Breach', detail: 'Cholera warning in sub-county per MOH. Water testing required.', time: '12m ago', priority: 'High' },
                  { school: 'Nairobi Central Academy', alert: 'Stock Depletion', detail: 'Milk supply delayed by 48h. Feeding schedule compromised.', time: '1h ago', priority: 'High' },
                  { school: 'Westlands Primary', alert: 'Staff Absence', detail: '3 lead teachers reported absent without sub-county clearance.', time: '3h ago', priority: 'Medium' },
               ].map((a, i) => (
                  <div key={i} className="bg-white border border-stone-100 p-8 rounded-[2.5rem] shadow-sm hover:shadow-xl transition-all group">
                     <div className="flex items-center justify-between mb-4">
                        <span className={`px-3 py-1 rounded-full text-[9px] font-bold ${a.priority === 'High' ? 'bg-red-600 text-white' : 'bg-amber-500 text-white'}`}>{a.priority} Priority</span>
                        <span className="text-[10px] font-bold text-stone-500">{a.time}</span>
                     </div>
                     <h4 className="text-[16px] font-bold text-stone-900">{a.alert}: {a.school}</h4>
                     <p className="text-[13px] font-medium text-stone-500 mt-2 leading-relaxed">{a.detail}</p>
                     <div className="mt-6 pt-6 border-t border-stone-50 flex items-center justify-between">
                        <button className="text-[11px] font-bold text-[#1DA1F2] hover:underline">Deploy Resources</button>
                        <ChevronRight size={16} className="text-stone-300 transition-transform group-hover:translate-x-1" />
                     </div>
                  </div>
               ))}
            </div>
         </div>
      );

      const renderFinanceLedger = () => (
         <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               {[
                  { label: 'Total Capitation', value: 'KES 42.5M', sub: 'Term 1 Allocation', icon: FileText, color: 'text-stone-900' },
                  { label: 'Funds Disbursed', value: 'KES 31.2M', sub: '73% Complete', icon: Activity, color: 'text-[#1DA1F2]' },
                  { label: 'Remaining Balance', value: 'KES 11.3M', sub: 'In Reserve', icon: Zap, color: 'text-stone-400' },
               ].map((m, i) => (
                  <div key={i} className="bg-white border border-stone-100 p-8 rounded-[3rem] shadow-sm">
                     <div className="flex items-center gap-4 mb-6">
                        <div className="w-10 h-10 rounded-xl bg-stone-50 flex items-center justify-center text-stone-400"><m.icon size={18} /></div>
                        <p className="text-[10px] font-bold text-stone-600">{m.label}</p>
                     </div>
                     <p className={`text-2xl font-black ${m.color}`}>{m.value}</p>
                     <p className="text-[11px] font-bold text-stone-400 mt-2">{m.sub}</p>
                  </div>
               ))}
            </div>
            <div className="bg-white border border-stone-100 rounded-[3rem] overflow-hidden shadow-sm">
               <table className="w-full text-left">
                  <thead className="bg-stone-50 border-b border-stone-100">
                     <tr>
                        <th className="py-5 px-8 text-[10px] font-bold text-stone-600">Sub-County</th>
                        <th className="py-5 px-6 text-[10px] font-bold text-stone-600">Programs</th>
                        <th className="py-5 px-6 text-[10px] font-bold text-stone-600">Budgeted</th>
                        <th className="py-5 px-6 text-[10px] font-bold text-stone-600">Expended</th>
                        <th className="py-5 px-8 text-[10px] font-bold text-stone-600 text-right">Burn Rate</th>
                     </tr>
                  </thead>
                  <tbody>
                     {['Starehe', 'Westlands', 'Kibra', 'Embakasi North'].map((loc, i) => (
                        <tr key={i} className="border-b border-stone-50 last:border-0 hover:bg-stone-50/50 transition-all">
                           <td className="py-6 px-8 font-bold text-stone-900">{loc}</td>
                           <td className="py-6 px-6"><span className="px-3 py-1 bg-[#1DA1F2]/5 text-[#1DA1F2] text-[10px] font-bold rounded-full">3 Active</span></td>
                           <td className="py-6 px-6 font-bold text-stone-600">KES 8.4M</td>
                           <td className="py-6 px-6 font-bold text-stone-900">KES 6.2M</td>
                           <td className="py-6 px-8 text-right">
                              <div className="flex items-center justify-end gap-3 text-[11px] font-bold text-stone-900">
                                 74% <div className="w-16 h-1 bg-stone-100 rounded-full overflow-hidden"><div className="h-full bg-[#1DA1F2]" style={{ width: '74%' }} /></div>
                              </div>
                           </td>
                        </tr>
                     ))}
                  </tbody>
               </table>
            </div>
         </div>
      );

      const renderApprovalsQueue = () => (
         <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="flex items-center justify-between">
               <h3 className="text-xl font-bold text-stone-900 tracking-tight">Presidential Approval Queue</h3>
               <p className="text-[11px] font-bold text-[#1DA1F2]">3 Pending Authorization</p>
            </div>
            <div className="space-y-4">
               {[
                  { title: 'Emergency Food Fund Release', ref: 'EFF/2026/04', detail: 'Additional KES 1.2M for Westlands sub-county logistics.', type: 'Financial' },
                  { title: 'Lead Teacher Appointment', ref: 'STAFF/NRB/992', detail: 'Assignment of Dr. Sarah Kamau to Nairobi Central Academy.', type: 'Administrative' },
                  { title: 'Ward Development Grant', ref: 'WDG/KBR/004', detail: 'Authorization for facility repair budget in Kibra Ward.', type: 'Budgetary' },
               ].map((req, i) => (
                  <div key={i} className="bg-white border border-stone-100 p-8 rounded-[2.5rem] shadow-sm hover:border-[#1DA1F2]/30 transition-all flex items-center justify-between group">
                     <div className="space-y-2">
                        <div className="flex items-center gap-3">
                           <span className="px-3 py-1 bg-stone-900 text-white text-[9px] font-bold rounded-full">{req.type}</span>
                           <span className="text-[10px] font-bold text-stone-400">Ref: {req.ref}</span>
                        </div>
                        <h4 className="text-[17px] font-bold text-stone-900">{req.title}</h4>
                        <p className="text-[13px] font-medium text-stone-500">{req.detail}</p>
                     </div>
                     <div className="flex items-center gap-4 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="p-3 bg-stone-50 text-stone-400 rounded-full hover:bg-red-50 hover:text-red-500 transition-colors"><X size={20} /></button>
                        <button className="p-3 bg-stone-900 text-white rounded-full hover:bg-stone-800 transition-colors shadow-lg"><CheckCircle2 size={20} /></button>
                     </div>
                  </div>
               ))}
            </div>
         </div>
      );

      return (
         <div className="space-y-12 pt-10">
            <div className="flex items-center gap-4 py-2">
               <p className="text-[10px] font-bold text-stone-400 pr-4 border-r border-stone-200">View Module</p>
               <div className="flex items-center gap-3">
                  {currentSubTabs.map((sub) => {
                     const isActive = activeInsight === sub.id;
                     const Icon = sub.icon;
                     return (
                        <button key={sub.id} onClick={() => setActiveInsight(sub.id)} className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-[11px] font-bold transition-all border ${isActive ? 'bg-white border-stone-200 text-stone-900 shadow-sm' : 'bg-transparent border-transparent text-stone-500 hover:text-stone-900 hover:bg-stone-50'}`}>
                           <Icon size={14} strokeWidth={2.5} className={isActive ? 'text-[#1DA1F2]' : 'text-stone-300'} />
                           {sub.label}
                        </button>
                     );
                  })}
               </div>
            </div>

            {activeInsight === 'monitoring' && renderMonitoring()}
            {activeInsight === 'alerts' && renderAlertsView()}
            {activeInsight === 'ledger' && renderFinanceLedger()}
            {activeInsight === 'pending' && renderApprovalsQueue()}
         </div>
      );
    default: return null;
    }
  };

  return (
    <div className="h-screen overflow-y-auto bg-white font-sans antialiased text-stone-800" onClick={() => setShowProfileMenu(false)}>
      <AnimatePresence>{isAddingMeal && renderAddMealModal()}</AnimatePresence>

      <header className="bg-[#fcfaf2]/60 border-b border-stone-200/50 py-4 px-8 relative z-10 overflow-hidden">
        <div className="max-w-[1400px] mx-auto w-full flex items-center justify-between">
          <div className="flex items-center gap-6">
             <div className="w-10 h-10 rounded-xl bg-[#1DA1F2]/10 flex items-center justify-center text-[#1DA1F2] shadow-sm flex-shrink-0"><Globe size={20} strokeWidth={2} /></div>
             <div className="flex flex-col border-r border-stone-200 pr-8 mr-4">
                <h1 className="text-[17px] font-black text-stone-900 tracking-tight whitespace-nowrap leading-none mb-1.5">
                   {countyId === 'KE-NRB-047' ? 'Nairobi City County' : 'County Government'}
                </h1>
                <span className="text-[11px] font-bold text-stone-400 opacity-70 italic whitespace-nowrap">{countySlogan}</span>
             </div>
             <div className="flex items-center gap-10">
                {[
                  { label: 'Learners', value: '42,850', icon: Users },
                  { label: 'Funding', value: '14.8M', icon: ShieldCheck },
                  { label: 'Spent', value: '12.4M', icon: Activity },
                ].map((m, i) => {
                   const Icon = m.icon;
                   return (
                    <div key={i} className="flex items-center gap-2.5">
                      <div className="text-stone-400 opacity-60"><Icon size={14} strokeWidth={2} /></div>
                      <div className="flex flex-col"><span className="text-[8px] font-bold text-stone-500 mb-0.5 leading-none">{m.label}</span><span className="text-[11px] font-bold text-stone-900 leading-none">{m.value}</span></div>
                    </div>
                   );
                })}
             </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 px-4 py-1.5 bg-red-100/50 border border-red-200/50 rounded-lg"><ShieldAlert size={12} className="text-red-500" /><span className="text-[9px] font-bold text-red-600">03 Priority Alerts</span></div>
            <div className="flex items-center gap-2 pl-6 border-l border-stone-200">
               <button className="flex items-center gap-2 text-[10px] font-bold text-stone-500 hover:text-stone-900 transition-colors"><Download size={13} /> Export</button>
               <button className="flex items-center gap-2 px-4 py-2 bg-[#1DA1F2] text-white rounded-lg text-[9px] font-bold shadow-lg shadow-[#1DA1F2]/20"><Plus size={12} strokeWidth={3} /> New Center</button>
            </div>
          </div>
        </div>
      </header>

      <div className="sticky top-0 z-30 bg-white border-b border-stone-200 px-8">
        <div className="max-w-[1400px] mx-auto w-full flex items-center justify-between">
          <nav className="flex items-center gap-1 flex-1 py-3 overflow-x-auto no-scrollbar">
             {navItems.map((tab) => {
                const isActive = activeTab === tab.id;
                const Icon = tab.icon;
                return (
                  <button key={tab.id} onClick={() => handleTabChange(tab.id)} className={`relative flex items-center gap-2 px-5 py-3 rounded-xl transition-all duration-300 ${isActive ? 'bg-[#1DA1F2] text-white shadow-xl shadow-[#1DA1F2]/30' : 'text-stone-900 hover:bg-stone-50'}`}>
                    <Icon size={14} strokeWidth={2} className={isActive ? 'text-white' : 'text-stone-400'} />
                    <span className="text-[12px] font-bold whitespace-nowrap">{tab.label}</span>
                  </button>
                );
             })}
             <button className="w-10 h-10 rounded-xl bg-stone-50 border border-stone-100 flex items-center justify-center text-stone-400 hover:bg-stone-100 hover:text-stone-900 transition-all ml-4"><Plus size={18} strokeWidth={2} /></button>
          </nav>

          <div className="flex items-center gap-8">
             <div className="flex items-center gap-4 border-r border-stone-100 pr-6">
                <button onClick={() => { setActiveTab('executive-command'); setActiveInsight('settings'); }} className="w-9 h-9 rounded-full bg-stone-50 flex items-center justify-center text-stone-400 hover:text-[#1DA1F2] hover:bg-[#1DA1F2]/5 transition-all" title="Settings"><Settings size={18} /></button>
                <button className="w-9 h-9 rounded-full bg-stone-50 flex items-center justify-center text-stone-400 hover:text-[#1DA1F2] relative transition-all" title="Notifications"><Bell size={18} /><div className="absolute top-2 right-2 w-1.5 h-1.5 bg-red-500 rounded-full border border-white" /></button>
                <button onClick={onLogout} className="w-9 h-9 rounded-full bg-red-50 flex items-center justify-center text-red-500 hover:bg-red-100 hover:text-red-700 transition-all ml-2" title="Logout"><LogOut size={16} strokeWidth={2.5} /></button>
             </div>
             
             <div className="relative">
                <button onClick={(e) => { e.stopPropagation(); setShowProfileMenu(!showProfileMenu); }} className="flex items-center gap-4 py-2 rounded-full hover:bg-stone-50 transition-all text-right group">
                  <div className="flex flex-col items-end leading-tight text-right pr-1">
                     <span className="text-[9px] font-bold text-stone-400">{greeting}</span>
                     <p className="text-[13px] font-bold text-stone-900 whitespace-nowrap">James Mwangi</p>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-stone-900 border-2 border-white shadow-xl flex items-center justify-center text-white font-black text-[15px] overflow-hidden group-hover:scale-105 transition-transform">J</div>
                </button>
                <AnimatePresence>{showProfileMenu && (<motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="absolute right-0 top-full mt-3 w-64 bg-white border border-stone-100 rounded-[2rem] shadow-2xl overflow-hidden z-50 transition-all"><div className="p-6 bg-stone-50 border-b border-stone-100"><p className="text-[14px] font-black text-stone-900">James Mwangi</p><p className="text-[11px] font-bold text-stone-400 mt-1">james@county.go.ke</p></div><div className="p-3"><button onClick={onLogout} className="w-full flex items-center gap-3 px-4 py-4 text-[13px] font-bold text-red-500 hover:bg-red-50 rounded-2xl transition-all"><LogOut size={16} /> Sign out session</button></div></motion.div>)}</AnimatePresence>
             </div>
          </div>
        </div>
      </div>

      <main className="max-w-[1400px] mx-auto w-full px-10 pb-32">
        <AnimatePresence mode="wait">
          <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3 }}>{renderContent()}</motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
};

export default CountyGovernmentDashboard;
