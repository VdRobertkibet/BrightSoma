import React, { useState, useEffect, useMemo } from 'react';
import { 
  Bus, 
  Users, 
  CheckCircle2, 
  MapPin, 
  Navigation, 
  LogOut,
  ChevronRight,
  Search,
  AlertCircle,
  Clock,
  RefreshCw
} from 'lucide-react';
import { db, auth } from '../src/firebase';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  serverTimestamp, 
  getDocs,
  getDoc,
  doc, 
  updateDoc 
} from 'firebase/firestore';
import { Student, Route, TransitLog, TransitEventType } from '../types';
import { sendTransitNotification } from '../services/notificationService';
import toast from 'react-hot-toast';

interface DriverModuleProps {
  user: any;
  profile: any;
}

const DriverModule: React.FC<DriverModuleProps> = ({ user, profile }) => {
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [transitLogs, setTransitLogs] = useState<TransitLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    if (!user || !profile) return;

    let unsubs: (() => void)[] = [];

    const fetchData = async () => {
      setIsLoading(true);
      try {
        const staffDocRef = doc(db, 'staff', user.uid);
        const staffDocSnap = await getDoc(staffDocRef);
        
        if (!staffDocSnap.exists()) {
          setIsLoading(false);
          return;
        }

        const schoolId = staffDocSnap.data().schoolId;

        const qRoutes = query(collection(db, 'routes'), where('schoolId', '==', schoolId));
        const qStudents = query(collection(db, 'students'), where('schoolId', '==', schoolId));
        const qLogs = query(collection(db, 'transit_logs'), where('schoolId', '==', schoolId));

        unsubs.push(onSnapshot(qRoutes, (snap) => setRoutes(snap.docs.map(d => ({ id: d.id, ...d.data() } as Route)))));
        unsubs.push(onSnapshot(qStudents, (snap) => setStudents(snap.docs.map(d => ({ id: d.id, ...d.data() } as Student)))));
        unsubs.push(onSnapshot(qLogs, (snap) => {
          setTransitLogs(snap.docs.map(d => ({ id: d.id, ...d.data() } as TransitLog)));
          setIsLoading(false);
        }));
      } catch (err) {
        console.error("[DriverModule] Data fetch error:", err);
        setIsLoading(false);
      }
    };

    fetchData();
    return () => {
      unsubs.forEach(unsub => unsub());
    };
  }, [user, profile]);

  const routeStudents = useMemo(() => {
    if (!selectedRoute) return [];
    return students.filter(s => selectedRoute.studentIds.includes(s.id));
  }, [selectedRoute, students]);

  const handleMarkTransit = async (studentId: string, eventType: TransitEventType) => {
    if (!selectedRoute) return;
    
    setIsSyncing(true);
    try {
      const student = students.find(s => s.id === studentId);
      if (!student) return;

      const logData = {
        schoolId: selectedRoute.schoolId,
        studentId,
        routeId: selectedRoute.id,
        driverId: auth.currentUser?.uid,
        eventType,
        timestamp: serverTimestamp(),
        parentConfirmed: false,
      };

      await addDoc(collection(db, 'transit_logs'), logData);
      
      // Trigger Notification
      await sendTransitNotification(selectedRoute.schoolId, studentId, student.name, eventType);
      
      toast.success(`${student.name} marked as ${eventType.replace('_', ' ')}`);
    } catch (error) {
      toast.error('Failed to update transit status');
    } finally {
      setIsSyncing(false);
    }
  };

  const isMarkedToday = (studentId: string, eventType: TransitEventType) => {
    const today = new Date().toISOString().split('T')[0];
    return transitLogs.some(l => {
      const logDate = l.timestamp?.toDate ? l.timestamp.toDate().toISOString().split('T')[0] : '';
      return l.studentId === studentId && l.eventType === eventType && logDate === today;
    });
  };

  if (!selectedRoute) {
    return (
      <div className="max-w-md mx-auto space-y-8 py-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
        <div className="text-center">
          <div className="w-20 h-20 bg-orange-100 dark:bg-orange-900/30 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <Bus size={40} className="text-orange-600 dark:text-orange-400" />
          </div>
          <h2 className="text-3xl font-black text-slate-800 dark:text-slate-100 tracking-tight">Driver Portal</h2>
          <p className="text-slate-500 mt-2 font-medium">Select your assigned route to begin</p>
        </div>

        <div className="space-y-4">
          {routes.map(route => (
            <button
              key={route.id}
              onClick={() => setSelectedRoute(route)}
              className="w-full p-6 bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-xl hover:shadow-2xl hover:scale-[1.02] transition-all text-left group"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">{route.name}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 capitalize font-bold">
                    {route.studentIds.length} Students Assigned
                  </p>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl group-hover:bg-orange-50 transition-colors">
                  <ChevronRight size={20} className="text-slate-400 group-hover:text-orange-600" />
                </div>
              </div>
            </button>
          ))}
          {routes.length === 0 && (
            <div className="text-center py-12 bg-slate-50 dark:bg-slate-800/50 rounded-[2rem] border border-dashed border-slate-200 dark:border-slate-700">
              <AlertCircle size={32} className="mx-auto text-slate-300 mb-3" />
              <p className="text-sm text-slate-400">No routes assigned to your account.</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-2xl flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setSelectedRoute(null)}
            className="p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl text-slate-400 hover:text-orange-600 transition-colors"
          >
            <LogOut size={20} className="rotate-180" />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">{selectedRoute.name}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span>
              <p className="text-[10px] font-bold text-slate-400 capitalize">Live Session Active</p>
            </div>
          </div>
        </div>
        <button 
          onClick={() => window.location.reload()}
          className={`p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-orange-600 transition-all ${isSyncing ? 'animate-spin' : ''}`}
        >
          <RefreshCw size={20} />
        </button>
      </div>

      {/* Student List */}
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-2xl overflow-hidden">
        <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h3 className="font-bold text-slate-800 dark:text-slate-100">Student Manifest</h3>
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
            <Users size={14} />
            <span>{routeStudents.length} Students</span>
          </div>
        </div>

        <div className="divide-y divide-slate-50 dark:divide-slate-800">
          {routeStudents.length === 0 ? (
            <div className="p-12 text-center text-slate-400 italic">No students assigned to this route.</div>
          ) : (
            routeStudents.map(student => (
              <div key={student.id} className="p-8 hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center font-bold text-slate-400 text-xl">
                      {student.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 dark:text-slate-100">{student.name}</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 capitalize font-bold mt-0.5">
                        {student.admissionNumber} • {student.grade}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <TransitButton 
                      label="Boarded AM" 
                      active={isMarkedToday(student.id, 'boarded_morning')}
                      onClick={() => handleMarkTransit(student.id, 'boarded_morning')}
                    />
                    <TransitButton 
                      label="At School" 
                      active={isMarkedToday(student.id, 'arrived_school')}
                      onClick={() => handleMarkTransit(student.id, 'arrived_school')}
                    />
                    <TransitButton 
                      label="Boarded PM" 
                      active={isMarkedToday(student.id, 'boarded_evening')}
                      onClick={() => handleMarkTransit(student.id, 'boarded_evening')}
                    />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

const TransitButton = ({ label, active, onClick }: { label: string, active: boolean, onClick: () => void }) => (
  <button
    onClick={onClick}
    disabled={active}
    className={`px-4 py-2.5 rounded-xl text-[10px] font-bold capitalize transition-all flex items-center gap-2 ${
      active 
        ? 'bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400 shadow-inner' 
        : 'bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-500 hover:border-orange-500 hover:text-orange-600 shadow-sm'
    }`}
  >
    {active && <CheckCircle2 size={14} />}
    {label}
  </button>
);

export default DriverModule;
