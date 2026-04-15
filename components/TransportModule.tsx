import React, { useState, useEffect, useMemo } from 'react';
import { 
  Bus, 
  MapPin, 
  Users, 
  Clock, 
  ShieldCheck, 
  AlertTriangle, 
  Search, 
  Plus, 
  ChevronRight, 
  Navigation, 
  Phone, 
  CheckCircle2,
  X,
  Filter,
  MoreVertical,
  ArrowRight,
  TrendingUp,
  History,
  Info
} from 'lucide-react';
import { sendRealSMS } from '../services/smsService';
import { useAuth } from '../hooks/useAuth';
import { db, auth } from '../src/firebase';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  doc, 
  serverTimestamp, 
  getDocs,
  getDoc
} from 'firebase/firestore';
import { Student, Driver, Vehicle, Route, TransitLog, TransitEventType } from '../types';
import toast from 'react-hot-toast';

const TransportModule: React.FC = () => {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'live' | 'routes' | 'drivers' | 'vehicles' | 'history'>('live');
  const [routes, setRoutes] = useState<Route[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [transitLogs, setTransitLogs] = useState<TransitLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [activeTripType, setActiveTripType] = useState<'morning' | 'evening'>('morning');

  // Set default tab based on role
  useEffect(() => {
    if (profile) {
      const isStaff = ['TEACHER', 'DRIVER', 'CONDUCTOR'].includes(profile.role);
      if (isStaff) {
        setActiveTab('live');
      } else {
        setActiveTab('history'); // Admins/Directors default to Analytics/History
      }
    }
  }, [profile]);

  // Modals
  const [showRouteModal, setShowRouteModal] = useState(false);
  const [editingRoute, setEditingRoute] = useState<Route | null>(null);

  useEffect(() => {
    let unsubs: (() => void)[] = [];

    const fetchData = async () => {
      const user = auth.currentUser;
      if (!user) return;

      let schoolId = user.uid;
      const staffDocRef = doc(db, 'staff', user.uid);
      const staffDocSnap = await getDoc(staffDocRef);
      if (staffDocSnap.exists()) {
        schoolId = staffDocSnap.data().schoolId;
      }

      unsubs.push(onSnapshot(query(collection(db, 'routes'), where('schoolId', '==', schoolId)), (snap) => {
        setRoutes(snap.docs.map(d => ({ id: d.id, ...d.data() } as Route)));
      }));

      unsubs.push(onSnapshot(query(collection(db, 'drivers'), where('schoolId', '==', schoolId)), (snap) => {
        setDrivers(snap.docs.map(d => ({ id: d.id, ...d.data() } as Driver)));
      }));

      unsubs.push(onSnapshot(query(collection(db, 'vehicles'), where('schoolId', '==', schoolId)), (snap) => {
        setVehicles(snap.docs.map(d => ({ id: d.id, ...d.data() } as Vehicle)));
      }));

      unsubs.push(onSnapshot(query(collection(db, 'students'), where('schoolId', '==', schoolId)), (snap) => {
        setStudents(snap.docs.map(d => ({ id: d.id, ...d.data() } as Student)));
      }));

      unsubs.push(onSnapshot(query(collection(db, 'transit_logs'), where('schoolId', '==', schoolId)), (snap) => {
        setTransitLogs(snap.docs.map(d => ({ id: d.id, ...d.data() } as TransitLog)));
        setIsLoading(false);
      }));
    };

    fetchData();
    return () => unsubs.forEach(unsub => unsub());
  }, []);

  const liveStats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const todaysLogs = transitLogs.filter(l => {
        const logDate = l.timestamp?.toDate ? l.timestamp.toDate().toISOString().split('T')[0] : '';
        return logDate === today;
    });

    return {
      boardedMorning: todaysLogs.filter(l => l.eventType === 'boarded_morning').length,
      arrivedSchool: todaysLogs.filter(l => l.eventType === 'arrived_school').length,
      boardedEvening: todaysLogs.filter(l => l.eventType === 'boarded_evening').length,
      pendingConfirmation: todaysLogs.filter(l => l.eventType === 'boarded_evening' && !l.parentConfirmed).length,
    };
  }, [transitLogs]);

  const handleTransitEvent = async (studentId: string, eventType: TransitEventType) => {
    setIsProcessing(studentId);
    try {
      const user = auth.currentUser;
      if (!user) return;
      
      const student = students.find(s => s.id === studentId);
      if (!student) return;

      // Log to transit_logs
      await addDoc(collection(db, 'transit_logs'), {
        schoolId: student.schoolId,
        studentId,
        studentName: student.name,
        eventType,
        timestamp: serverTimestamp(),
        parentConfirmed: false
      });

      // Update student balance if it's a paid trip (logic for future)
      
      // Trigger SMS if enabled for this event
      const notifPrefs = (student as any).transport?.notifications;
      const primaryContact = student.parentInfo.emergencyContact;

      if (primaryContact && notifPrefs) {
        let shouldSend = false;
        let smsMessage = '';

        if (eventType === 'boarded_morning' && notifPrefs.boarded) {
          shouldSend = true;
          smsMessage = `Hello, ${student.name} has boarded the school bus for the morning commute.`;
        } else if (eventType === 'arrived_school' && notifPrefs.arrivedSchool) {
          shouldSend = true;
          smsMessage = `Hello, ${student.name} has safely arrived at school.`;
        } else if (eventType === 'boarded_evening' && notifPrefs.boarded) {
          shouldSend = true;
          smsMessage = `Hello, ${student.name} has boarded the bus home for the evening commute.`;
        } else if (eventType === 'arrived_home' && notifPrefs.dropped) {
          shouldSend = true;
          smsMessage = `Hello, ${student.name} has been dropped off at their pickup point.`;
        }

        if (shouldSend) {
          try {
            await sendRealSMS(primaryContact, smsMessage);
            toast.success(`Parent notified for ${student.name}`);
          } catch (smsErr) {
            console.error("SMS Error:", smsErr);
            toast.error("Failed to send parent notification");
          }
        }
      }

      toast.success(`${student.name} status updated: ${eventType.replace('_', ' ')}`);
    } catch (error) {
      toast.error('Failed to update status');
    } finally {
      setIsProcessing(null);
    }
  };

  const handleDispatchBusNotification = async (routeId: string) => {
    const route = routes.find(r => r.id === routeId);
    if (!route) return;
    
    const studentsOnRoute = students.filter(s => route.studentIds?.includes(s.id));
    if (studentsOnRoute.length === 0) {
      toast.error("No students assigned to this route");
      return;
    }

    toast.loading("Notifying parents of bus arrival...", { duration: 2000 });
    
    let successCount = 0;
    for (const student of studentsOnRoute) {
      const notifPrefs = (student as any).transport?.notifications;
      if (notifPrefs?.busArrived && student.parentInfo.emergencyContact) {
        try {
          await sendRealSMS(student.parentInfo.emergencyContact, 
            `Hello, the school bus (${route.name}) is approaching your pickup point. Please get ready.`);
          successCount++;
        } catch (e) { console.error(e); }
      }
    }
    
    toast.success(`Notified ${successCount} parents of bus arrival`);
  };

  const handleSaveRoute = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const routeData = {
      name: formData.get('name') as string,
      driverId: formData.get('driverId') as string,
      vehicleId: formData.get('vehicleId') as string,
      stops: (formData.get('stops') as string).split(',').map(s => s.trim()),
      studentIds: [], // To be managed separately
    };

    try {
      const user = auth.currentUser;
      if (!user) return;
      let schoolId = user.uid;
      const staffDocRef = doc(db, 'staff', user.uid);
      const staffDocSnap = await getDoc(staffDocRef);
      const staffDoc = { empty: !staffDocSnap.exists(), docs: [{ data: () => staffDocSnap.data() }] };
      if (!staffDoc.empty) schoolId = staffDoc.docs[0].data()?.schoolId || schoolId;

      if (editingRoute) {
        await updateDoc(doc(db, 'routes', editingRoute.id), routeData);
        toast.success('Route updated');
      } else {
        await addDoc(collection(db, 'routes'), { ...routeData, schoolId });
        toast.success('New route created');
      }
      setShowRouteModal(false);
      setEditingRoute(null);
    } catch (error) {
      toast.error('Failed to save route');
    }
  };

  const KpiCard = ({ title, value, icon: Icon, color }: any) => (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-[0.875rem] border border-slate-100 dark:border-slate-800 shadow-xl relative overflow-hidden group">
      <div className={`absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 rounded-full opacity-10 transition-transform group-hover:scale-110 ${color}`}></div>
      <div className="flex items-center gap-4">
        <div className={`p-4 rounded-[0.35rem] ${color} bg-opacity-10 text-opacity-100`}>
          <Icon size={24} className="text-slate-900 dark:text-slate-100" />
        </div>
        <div>
          <p className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">{title}</p>
          <p className="text-3xl font-bold text-slate-800 dark:text-slate-100">{value}</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col min-h-[calc(100vh-8rem)] bg-slate-50 dark:bg-[#0b0e14] animate-in fade-in duration-700">
      
      {/* Header Section */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-6 lg:px-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 max-w-[1600px] mx-auto">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
              <div className="p-2.5 bg-orange-100 dark:bg-orange-500/10 rounded-xl text-orange-600">
                <Bus size={24} />
              </div>
              Smart Transport Dashboard
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Real-time commute tracking and parent notification system</p>
          </div>
          
          <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800/50 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700/50">
            {(['live', 'routes', 'drivers', 'history'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-5 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === tab ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/20' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-white dark:hover:bg-slate-800'}`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="p-6 lg:p-10 max-w-[1600px] mx-auto w-full">
        {activeTab === 'live' && (
          <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <KpiCard title="Boarded (Morning)" value={liveStats.boardedMorning} icon={Clock} color="bg-blue-500" />
              <KpiCard title="Arrived at School" value={liveStats.arrivedSchool} icon={ShieldCheck} color="bg-emerald-500" />
              <KpiCard title="Boarded (Evening)" value={liveStats.boardedEvening} icon={Navigation} color="bg-orange-500" />
              <KpiCard title="Confirmation Reminders" value={liveStats.pendingConfirmation} icon={AlertTriangle} color="bg-rose-500" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Route List */}
              <div className="lg:col-span-4 space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Active Routes</h3>
                </div>
                {routes.map(route => (
                  <button
                    key={route.id}
                    onClick={() => setSelectedRouteId(route.id)}
                    className={`w-full p-5 rounded-3xl border-2 text-left transition-all ${selectedRouteId === route.id ? 'bg-white dark:bg-slate-900 border-orange-500 shadow-xl shadow-orange-500/5' : 'bg-white/50 dark:bg-slate-900/50 border-transparent hover:border-slate-200 dark:hover:border-slate-800'}`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className={`p-2 rounded-xl ${selectedRouteId === route.id ? 'bg-orange-100 text-orange-600' : 'bg-slate-100 text-slate-500'}`}>
                        <Navigation size={18} />
                      </div>
                      <span className="text-[11px] font-bold px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-600 dark:text-slate-400">
                        {route.studentIds?.length || 0} Students
                      </span>
                    </div>
                    <h4 className="font-bold text-slate-800 dark:text-white">{route.name}</h4>
                    <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5 font-medium">
                      <Phone size={12} /> {drivers.find(d => d.id === route.driverId)?.name || 'No Driver'}
                    </p>
                  </button>
                ))}
              </div>

              {/* Student Detail Matrix */}
              <div className="lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] p-8 shadow-sm">
                {!selectedRouteId ? (
                   <div className="h-full flex flex-col items-center justify-center text-center p-12 py-24 opacity-60">
                     <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6">
                       <Navigation size={32} className="text-slate-400" />
                     </div>
                     <h3 className="text-lg font-bold text-slate-700 dark:text-slate-200">No Route Selected</h3>
                     <p className="text-sm text-slate-500 max-w-xs mt-2">Select a route from the left panel to manage live student transit events.</p>
                   </div>
                ) : (
                  <div className="space-y-8">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <h3 className="text-xl font-bold text-slate-800 dark:text-white">{routes.find(r => r.id === selectedRouteId)?.name}</h3>
                        <p className="text-sm text-slate-500 font-medium">Mark student presence and send automated parent notifications.</p>
                      </div>
                      <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                        <button 
                          type="button"
                          onClick={() => setActiveTripType('morning')}
                          className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTripType === 'morning' ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm' : 'text-slate-500'}`}
                        >
                          Morning
                        </button>
                        <button 
                          type="button"
                          onClick={() => setActiveTripType('evening')}
                          className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTripType === 'evening' ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm' : 'text-slate-500'}`}
                        >
                          Evening
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 p-4 bg-orange-50 dark:bg-orange-500/5 border border-orange-100 dark:border-orange-500/10 rounded-2xl">
                      <div className="p-2.5 bg-orange-100 dark:bg-orange-500/20 text-orange-600 rounded-lg">
                        <Info size={20} />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-slate-800 dark:text-second-400">Bus Approaching Stop?</p>
                        <p className="text-xs text-slate-500 font-medium">Click dispatch to notify parents that the bus is near their pickup point.</p>
                      </div>
                      <button 
                         type="button"
                         onClick={() => handleDispatchBusNotification(selectedRouteId)}
                         className="px-6 py-2.5 bg-orange-600 text-white font-bold rounded-xl text-xs hover:bg-orange-700 transition-all shadow-lg shadow-orange-600/20 active:scale-95 flex items-center gap-2"
                      >
                         <Navigation size={14} /> Dispatch Arrival SMS
                      </button>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-slate-100 dark:border-slate-800">
                             <th className="text-left py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Learner</th>
                             <th className="text-left py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Status</th>
                             <th className="text-right py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {students.filter(s => routes.find(r => r.id === selectedRouteId)?.studentIds?.includes(s.id)).map(student => {
                            const latestLog = transitLogs
                              .filter(l => l.studentId === student.id)
                              .sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0))[0];
                            
                            return (
                              <tr key={student.id} className="border-b border-slate-50 dark:border-slate-800/50 group">
                                <td className="py-4">
                                  <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-500 font-bold text-sm">
                                      {student.name.charAt(0)}
                                    </div>
                                    <div>
                                      <p className="text-sm font-bold text-slate-800 dark:text-white uppercase">{student.name}</p>
                                      <p className="text-[11px] text-slate-400 font-medium">{student.grade} • {student.transport?.pickupPoint || 'No Stop'}</p>
                                    </div>
                                  </div>
                                </td>
                                <td className="py-4">
                                   {latestLog ? (
                                     <div className="flex items-center gap-2">
                                       <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide bg-emerald-100 text-emerald-700`}>
                                          {latestLog.eventType.replace('_', ' ')}
                                       </span>
                                       <span className="text-[10px] text-slate-400 font-medium italic">
                                          {latestLog.timestamp?.toDate ? new Date(latestLog.timestamp.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                                       </span>
                                     </div>
                                   ) : (
                                     <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">No status today</span>
                                   )}
                                </td>
                                <td className="py-4 text-right">
                                   <div className="flex items-center justify-end gap-2 text-white">
                                      {/* Only staff/conductor/platform can mark status */}
                                      {(['TEACHER', 'DRIVER', 'CONDUCTOR', 'PLATFORM_ADMIN'].includes(profile?.role || '')) ? (
                                        activeTripType === 'morning' ? (
                                          <>
                                            <button 
                                              type="button"
                                              disabled={isProcessing === student.id}
                                              onClick={() => handleTransitEvent(student.id, 'boarded_morning')}
                                              className="px-4 py-2 bg-blue-600 rounded-xl text-xs font-bold hover:bg-blue-700 transition-all shadow-sm active:scale-95"
                                            >
                                              Boarded
                                            </button>
                                            <button 
                                              type="button"
                                              disabled={isProcessing === student.id}
                                              onClick={() => handleTransitEvent(student.id, 'arrived_school')}
                                              className="px-4 py-2 bg-emerald-600 rounded-xl text-xs font-bold hover:bg-emerald-700 transition-all shadow-sm active:scale-95"
                                            >
                                              At School
                                            </button>
                                          </>
                                        ) : (
                                          <>
                                            <button 
                                              type="button"
                                              disabled={isProcessing === student.id}
                                              onClick={() => handleTransitEvent(student.id, 'boarded_evening')}
                                              className="px-4 py-2 bg-orange-600 rounded-xl text-xs font-bold hover:bg-orange-700 transition-all shadow-sm active:scale-95"
                                            >
                                              Boarded
                                            </button>
                                            <button 
                                              type="button"
                                              disabled={isProcessing === student.id}
                                              onClick={() => handleTransitEvent(student.id, 'arrived_home')}
                                              className="px-4 py-2 bg-rose-600 rounded-xl text-xs font-bold hover:bg-rose-700 transition-all shadow-sm active:scale-95"
                                            >
                                              Dropped
                                            </button>
                                          </>
                                        )
                                      ) : (
                                        <span className="text-[10px] text-slate-400 font-bold uppercase italic px-4">View Only</span>
                                      )}
                                   </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Placeholder for other tabs */}
        {activeTab !== 'live' && (
           <div className="flex flex-col items-center justify-center py-24 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] shadow-sm animate-in zoom-in-95 duration-500">
             <div className="w-20 h-20 bg-orange-50 dark:bg-orange-500/10 rounded-[1.5rem] flex items-center justify-center text-orange-600 mb-6">
               <TrendingUp size={32} />
             </div>
             <h3 className="text-xl font-bold text-slate-800 dark:text-white">Management View Coming Soon</h3>
             <p className="text-slate-500 max-w-sm text-center mt-2 px-6">We are currently perfecting the route builder and driver management experience. Stay tuned!</p>
             <button
               type="button"
               onClick={() => setActiveTab('live')}
               className="mt-8 px-8 py-3 bg-slate-800 dark:bg-white dark:text-slate-900 text-white rounded-2xl font-bold text-sm hover:shadow-xl transition-all active:scale-95 flex items-center gap-2"
             >
               Go back to Live Tracker <ArrowRight size={16} />
             </button>
           </div>
        )}
      </div>

    </div>
  );
};

export default TransportModule;

