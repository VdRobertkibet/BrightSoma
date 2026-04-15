import React, { useState, useEffect, useMemo } from 'react';
import { 
  Bus, 
  MapPin, 
  ShieldCheck, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  ChevronRight, 
  Navigation, 
  Phone, 
  Home, 
  BookOpen,
  Bell,
  X,
  RefreshCw,
  ArrowRight
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
import { Student, TransitLog, TransitEventType, Notification } from '../types';
import { sendTransitNotification } from '../services/notificationService';
import toast from 'react-hot-toast';

interface ParentModuleProps {
  user: any;
  profile: any;
}

const ParentModule: React.FC<ParentModuleProps> = ({ user, profile }) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [transitLogs, setTransitLogs] = useState<TransitLog[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  useEffect(() => {
    if (!user || !profile) return;

    let unsubs: (() => void)[] = [];

    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Resolve school identity from staff/parent record
        const staffDocRef = doc(db, 'staff', user.uid);
        const staffDocSnap = await getDoc(staffDocRef);
        
        let schoolId = user.uid;
        if (staffDocSnap.exists()) {
          schoolId = staffDocSnap.data().schoolId;
        }

        const qStudents = query(collection(db, 'students'), where('schoolId', '==', schoolId));
        const qLogs = query(collection(db, 'transit_logs'), where('schoolId', '==', schoolId));
        const qNotifications = query(collection(db, 'notifications'), where('schoolId', '==', schoolId));

        unsubs.push(onSnapshot(qStudents, (snap) => {
          const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as Student));
          setStudents(data);
          if (data.length > 0 && !selectedStudent) setSelectedStudent(data[0]);
        }));

        unsubs.push(onSnapshot(qLogs, (snap) => setTransitLogs(snap.docs.map(d => ({ id: d.id, ...d.data() } as TransitLog)))));
        unsubs.push(onSnapshot(qNotifications, (snap) => {
          setNotifications(snap.docs.map(d => ({ id: d.id, ...d.data() } as Notification)));
          setIsLoading(false);
        }));
      } catch (err) {
        console.error("[ParentModule] Data fetch error:", err);
        setIsLoading(false);
      }
    };

    fetchData();
    return () => {
      unsubs.forEach(unsub => unsub());
    };
  }, [user, profile]);

  const studentLogs = useMemo(() => {
    if (!selectedStudent) return [];
    const today = new Date().toISOString().split('T')[0];
    return transitLogs.filter(l => {
      const logDate = l.timestamp?.toDate ? l.timestamp.toDate().toISOString().split('T')[0] : '';
      return l.studentId === selectedStudent.id && logDate === today;
    });
  }, [selectedStudent, transitLogs]);

  const handleConfirmReceipt = async (logId: string) => {
    try {
      await updateDoc(doc(db, 'transit_logs', logId), {
        parentConfirmed: true,
        confirmationTimestamp: serverTimestamp()
      });
      
      if (selectedStudent) {
        await sendTransitNotification(selectedStudent.schoolId, selectedStudent.id, selectedStudent.name, 'arrived_home');
      }
      
      toast.success('Arrival confirmed. Thank you!');
    } catch (error) {
      toast.error('Failed to confirm receipt');
    }
  };

  const timelineEvents = [
    { type: 'boarded_morning', label: 'Boarded Morning', icon: Bus, color: 'text-orange-600', bg: 'bg-orange-50' },
    { type: 'arrived_school', label: 'Arrived School', icon: ShieldCheck, color: 'text-orange-600', bg: 'bg-orange-50' },
    { type: 'marked_present', label: 'Present in Class', icon: BookOpen, color: 'text-blue-600', bg: 'bg-blue-50' },
    { type: 'boarded_evening', label: 'Boarded Evening', icon: Bus, color: 'text-amber-600', bg: 'bg-amber-50' },
    { type: 'arrived_home', label: 'Arrived Home', icon: Home, color: 'text-orange-600', bg: 'bg-orange-50' },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in duration-700">
      {/* Student Selector */}
      <div className="flex items-center gap-4 overflow-x-auto pb-2 custom-scrollbar no-scrollbar">
        {students.map(student => (
          <button
            key={student.id}
            onClick={() => setSelectedStudent(student)}
            className={`flex-shrink-0 px-6 py-3 rounded-[1.4rem] text-sm font-bold transition-all ${
              selectedStudent?.id === student.id 
                ? 'bg-orange-600 text-white shadow-lg shadow-orange-200' 
                : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border border-slate-100 dark:border-slate-800'
            }`}
          >
            {student.name}
          </button>
        ))}
      </div>

      {selectedStudent && (
        <div className="space-y-8 animate-in fade-in duration-500">
          {/* Status Overview */}
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[3.5rem] border border-slate-100 dark:border-slate-800 shadow-2xl">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">Live Safety Timeline</h3>
                <p className="text-[10px] font-bold text-slate-400 capitalize mt-1">Today's Activity • {new Date().toLocaleDateString()}</p>
              </div>
              <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-[1.4rem] text-orange-600 dark:text-orange-400">
                <Navigation size={24} className="animate-pulse" />
              </div>
            </div>

            <div className="space-y-12 relative before:absolute before:left-[27px] before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100 dark:before:bg-slate-800">
              {timelineEvents.map((event, i) => {
                const log = studentLogs.find(l => l.eventType === event.type);
                const isCompleted = !!log;
                const isCurrent = isCompleted && !studentLogs.some(l => {
                    const nextIndex = timelineEvents.findIndex(te => te.type === l.eventType);
                    return nextIndex > i;
                });

                return (
                  <div key={event.type} className={`relative flex items-start gap-8 transition-all duration-500 ${isCompleted ? 'opacity-100' : 'opacity-40'}`}>
                    <div className={`z-10 w-14 h-14 rounded-[1.4rem] flex items-center justify-center shadow-xl transition-all duration-500 ${
                      isCompleted ? `${event.bg} ${event.color} scale-110` : 'bg-white dark:bg-slate-800 text-slate-300 border border-slate-100 dark:border-slate-700'
                    }`}>
                      <event.icon size={24} />
                    </div>
                    <div className="flex-1 pt-2">
                      <div className="flex items-center justify-between">
                        <h4 className={`font-bold tracking-tight ${isCompleted ? 'text-slate-800 dark:text-slate-100' : 'text-slate-400'}`}>
                          {event.label}
                        </h4>
                        {isCompleted && (
                          <span className="text-[10px] font-bold text-slate-400">{log.timestamp?.toDate().toLocaleTimeString()}</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        {isCompleted ? 'Successfully verified' : 'Awaiting status update'}
                      </p>
                      
                      {event.type === 'boarded_evening' && isCompleted && !log.parentConfirmed && (
                        <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-[1.4rem] border border-amber-100 dark:border-amber-800/50 animate-in slide-in-from-top-4 duration-500">
                          <div className="flex items-center gap-3 mb-3">
                            <AlertTriangle size={18} className="text-amber-600" />
                            <p className="text-xs font-bold text-amber-800 dark:text-amber-300">Action Required</p>
                          </div>
                          <p className="text-xs text-amber-700 dark:text-amber-400/80 mb-4 leading-relaxed">
                            Your child has boarded the evening bus. Please confirm once they reach home safely.
                          </p>
                          <button 
                            onClick={() => handleConfirmReceipt(log.id)}
                            className="w-full py-3 bg-amber-600 text-white rounded-xl font-bold text-xs shadow-lg shadow-amber-200 dark:shadow-none"
                          >
                            Confirm Child Received
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Notifications */}
          <div className="bg-white dark:bg-slate-900 rounded-[3.5rem] border border-slate-100 dark:border-slate-800 shadow-2xl p-8">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">Recent Alerts</h3>
              <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-[0.875rem] text-slate-400">
                <Bell size={20} />
              </div>
            </div>

            <div className="space-y-4">
              {notifications.filter(n => n.userId === selectedStudent.id).slice(0, 5).map(notif => (
                <div key={notif.id} className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-[1.4rem] border border-slate-100 dark:border-slate-700/50">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold text-orange-600 dark:text-orange-400 capitalize">{notif.type}</span>
                    <span className="text-[10px] font-bold text-slate-400">{notif.timestamp?.toDate().toLocaleTimeString()}</span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">{notif.title}</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{notif.message}</p>
                </div>
              ))}
              {notifications.filter(n => n.userId === selectedStudent.id).length === 0 && (
                <div className="text-center py-8 text-slate-400 italic text-sm">No recent notifications.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ParentModule;
