
import React, { useState, useEffect, useMemo } from 'react';
import { 
  AlertTriangle, 
  Clock, 
  Plus, 
  ChevronRight, 
  User, 
  Info,
  Zap,
  LayoutGrid,
  Trophy,
  BookOpen,
  Pencil,
  Trash2,
  Calendar,
  X,
  ArrowRight,
  MoreVertical,
  RotateCcw,
  Loader2
} from 'lucide-react';
import { motion } from 'motion/react';
import { CBC_GRADES, DAYS, PERIODS, LOWER_PRIMARY_LEARNING_AREAS, JUNIOR_SECONDARY_LEARNING_AREAS } from '../constants';
import { db, auth } from '../src/firebase';
import { collection, query, where, onSnapshot, getDocs, addDoc, updateDoc, deleteDoc, doc, getDoc, writeBatch } from 'firebase/firestore';
import { TimetableSlot } from '../types';
import toast from 'react-hot-toast';

interface TimetableModuleProps {
  academicPeriod: string;
}

const TERM_MONTHS: Record<string, string[]> = {
  'Term 1': ['January', 'February', 'March', 'April'],
  'Term 2': ['May', 'June', 'July', 'August'],
  'Term 3': ['September', 'October', 'November', 'December']
};

const TimetableModule: React.FC<TimetableModuleProps> = ({ academicPeriod }) => {
  const [timetable, setTimetable] = useState<TimetableSlot[]>([]);
  const [allTeachers, setAllTeachers] = useState<string[]>([]);
  const [periods, setPeriods] = useState<{id: string, time: string, label: string, type: string}[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTerm, setActiveTerm] = useState('Term 1');
  const [activeMonth, setActiveMonth] = useState('January');
  const [selectedGrade, setSelectedGrade] = useState('Grade 1');
  const [selectedStream, setSelectedStream] = useState('Jasmine');
  const [selectedTeacher, setSelectedTeacher] = useState('All Teachers');
  const [selectedDay, setSelectedDay] = useState('Weekly Board');
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [newSlotData, setNewSlotData] = useState<Partial<TimetableSlot>>({});
  const [newPeriodData, setNewPeriodData] = useState<any>({});
  const [isCustomSubject, setIsCustomSubject] = useState(false);
  const [isCustomTeacher, setIsCustomTeacher] = useState(false);
  const [isCustomGrade, setIsCustomGrade] = useState(false);
  const [swapSource, setSwapSource] = useState<TimetableSlot | null>(null);

  useEffect(() => {
    let unsubscribeTimetable: (() => void) | undefined;
    let unsubscribePeriods: (() => void) | undefined;

    const fetchData = async () => {
      setIsLoading(true);
      try {
        const user = auth.currentUser;
        if (!user) {
          // Demo mode
          setPeriods(PERIODS.map(p => ({ ...p, id: Math.random().toString() })));
          return;
        }

        let schoolId = user.uid;
        const staffDocRef = doc(db, 'staff', user.uid);
        const staffDocSnap = await getDoc(staffDocRef);
        if (staffDocSnap.exists()) {
          schoolId = staffDocSnap.data().schoolId;
        } else {
          // Check if user is a school admin in the 'users' collection
          const userDocRef = doc(db, 'users', user.uid);
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists() && userDocSnap.data().schoolId) {
            schoolId = userDocSnap.data().schoolId;
          }
        }

        // Fetch all teachers for the school (Filter role locally to avoid missing index errors)
        const teachersQuery = query(collection(db, 'staff'), where('schoolId', '==', schoolId));
        const teachersSnapshot = await getDocs(teachersQuery);
        const teacherNames = teachersSnapshot.docs
          .map(doc => doc.data())
          .filter(data => data.role === 'TEACHER')
          .map(data => data.name)
          .filter(Boolean);
        setAllTeachers(teacherNames);

        // Fetch Timetable Slots
        const q = query(collection(db, 'timetable'), where('schoolId', '==', schoolId));
        unsubscribeTimetable = onSnapshot(q, (snapshot) => {
          const slots: TimetableSlot[] = [];
          snapshot.forEach((doc) => {
            slots.push({ id: doc.id, ...doc.data() } as TimetableSlot);
          });
          setTimetable(slots);
        }, (error) => {
          console.error("Timetable snapshot error:", error);
          toast.error("Failed to sync timetable entries");
        });

        // Fetch Periods
        const periodsQuery = query(collection(db, 'timetable_periods'), where('schoolId', '==', schoolId));
        unsubscribePeriods = onSnapshot(periodsQuery, async (snapshot) => {
          if (snapshot.empty) {
            console.log('[Timetable] Seeding default periods for school:', schoolId);
            setPeriods(PERIODS.map((p, i) => ({ ...p, id: `seed-${i}` })));
            try {
              const batch = writeBatch(db);
              PERIODS.forEach(p => {
                const newDocRef = doc(collection(db, 'timetable_periods'));
                batch.set(newDocRef, { ...p, schoolId });
              });
              await batch.commit();
            } catch (err) {
              console.error("Error seeding periods:", err);
            }
          } else {
            const pList: any[] = [];
            snapshot.forEach((doc) => {
              pList.push({ id: doc.id, ...doc.data() });
            });
            pList.sort((a, b) => {
              const timeA = String(a.time || '00:00');
              const timeB = String(b.time || '00:00');
              const [hA, mA] = timeA.split(':').map(Number);
              const [hB, mB] = timeB.split(':').map(Number);
              return (hA * 60 + (mA || 0)) - (hB * 60 + (mB || 0));
            });
            setPeriods(pList);
          }
        }, (error) => {
          console.error("Periods snapshot error:", error);
          toast.error("Failed to sync timetable slots");
        });

      } catch (err: any) {
        console.error("Fetch data error:", err);
        toast.error("Init Error: " + (err.message || "Unknown error"));
      } finally {
        // We set a small delay to ensure snapshots have a chance to fire or return cached data
        setTimeout(() => setIsLoading(false), 800);
      }
    };

    fetchData();

    return () => {
      if (unsubscribeTimetable) unsubscribeTimetable();
      if (unsubscribePeriods) unsubscribePeriods();
    };
  }, []);

  const handleResetPeriods = async () => {
    if (!window.confirm("This will reset all your time slots to the school defaults (8:00 AM - 4:00 PM). Existing lessons might be hidden if their times no longer match. Continue?")) return;
    
    setIsLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) return;
      
      let schoolId = user.uid;
      const staffDocRef = doc(db, 'staff', user.uid);
      const staffDocSnap = await getDoc(staffDocRef);
      if (staffDocSnap.exists()) {
        schoolId = staffDocSnap.data().schoolId;
      }

      // Delete existing periods
      const q = query(collection(db, 'timetable_periods'), where('schoolId', '==', schoolId));
      const snap = await getDocs(q);
      const deleteBatch = writeBatch(db);
      snap.forEach(d => deleteBatch.delete(d.ref));
      await deleteBatch.commit();

      // Seed defaults
      const seedBatch = writeBatch(db);
      PERIODS.forEach(p => {
        const newDocRef = doc(collection(db, 'timetable_periods'));
        seedBatch.set(newDocRef, { ...p, schoolId });
      });
      await seedBatch.commit();
      
      toast.success("Timetable slots reset to defaults");
    } catch (error) {
      toast.error("Failed to reset periods");
    } finally {
      setIsLoading(false);
    }
  };

  const teachers = useMemo(() => {
    return ['All Teachers', ...allTeachers];
  }, [allTeachers]);

  // Advanced Conflict Detection Engine
  const timetableWithConflicts = useMemo(() => {
    return timetable.map(slot => {
      const teacherConflict = timetable.some(s => 
        s.id !== slot.id && 
        s.day === slot.day && 
        s.time === slot.time && 
        s.teacher === slot.teacher
      );
      
      const classConflict = timetable.some(s => 
        s.id !== slot.id && 
        s.day === slot.day && 
        s.time === slot.time && 
        s.grade === slot.grade && 
        s.stream === slot.stream
      );

      return {
        ...slot,
        isConflict: teacherConflict || classConflict,
        conflictDetails: teacherConflict ? 'Teacher double-booked' : classConflict ? 'Class double-booked' : null
      };
    });
  }, [timetable]);

  const filteredData = useMemo(() => {
    return timetableWithConflicts.filter(slot => {
      const termMatch = slot.term === activeTerm;
      const monthMatch = slot.month === activeMonth;
      const gradeMatch = slot.grade === selectedGrade;
      const streamMatch = slot.stream === selectedStream;
      const teacherMatch = selectedTeacher === 'All Teachers' || slot.teacher === selectedTeacher;
      return termMatch && monthMatch && gradeMatch && streamMatch && teacherMatch;
    });
  }, [timetableWithConflicts, activeTerm, activeMonth, selectedGrade, selectedStream, selectedTeacher]);

  const handleSwapSlots = async (targetSlot: TimetableSlot) => {
    if (!swapSource) return;

    const user = auth.currentUser;
    if (!user) {
      // Demo Mode swap
      const updatedTimetable = timetable.map(s => {
        if (s.id === swapSource.id) {
          return { ...s, day: targetSlot.day, time: targetSlot.time };
        }
        if (s.id === targetSlot.id) {
          return { ...s, day: swapSource.day, time: swapSource.time };
        }
        return s;
      });
      setTimetable(updatedTimetable);
      toast.success("Demo: Schedule swapped locally!");
      setSwapSource(null);
      return;
    }

    try {
      const sourceRef = doc(db, 'timetable', swapSource.id);
      const targetRef = doc(db, 'timetable', targetSlot.id);

      // Perform the swap in Firestore
      await updateDoc(sourceRef, {
        day: targetSlot.day,
        time: targetSlot.time
      });

      await updateDoc(targetRef, {
        day: swapSource.day,
        time: swapSource.time
      });

      const message = `${swapSource.teacher} swapped ${swapSource.subject} with ${targetSlot.teacher}'s ${targetSlot.subject} (${swapSource.day} ${swapSource.time} ↔ ${targetSlot.day} ${targetSlot.time})`;
      await notifyGradeTeachers(message, swapSource.grade);

      toast.success("Schedule swapped successfully!");
      setSwapSource(null);
    } catch (error) {
      console.error("Error swapping slots:", error);
      toast.error("Failed to perform swap");
    }
  };

  const handleEmptySwap = async (day: string, time: string) => {
    if (!swapSource) return;

    const user = auth.currentUser;
    if (!user) {
      // Demo Mode move
      setTimetable(timetable.map(s => s.id === swapSource.id ? { ...s, day, time } : s));
      toast.success("Demo: Lesson moved locally!");
      setSwapSource(null);
      return;
    }

    try {
      const sourceRef = doc(db, 'timetable', swapSource.id);
      await updateDoc(sourceRef, { day, time });

      const message = `${swapSource.teacher} moved ${swapSource.subject} to ${day} at ${time}`;
      await notifyGradeTeachers(message, swapSource.grade);

      toast.success("Lesson moved successfully!");
      setSwapSource(null);
    } catch (error) {
      console.error("Error moving slot:", error);
      toast.error("Failed to move lesson");
    }
  };

  const notifyGradeTeachers = async (message: string, grade: string) => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      let schoolId = user.uid;
      const staffDocRef = doc(db, 'staff', user.uid);
      const staffDocSnap = await getDoc(staffDocRef);
      if (staffDocSnap.exists()) {
        schoolId = staffDocSnap.data().schoolId;
      }

      // Find all teachers in this grade for THIS school
      const staffQuery = query(collection(db, 'staff'), where('schoolId', '==', schoolId), where('role', '==', 'TEACHER'));
      const staffSnapshot = await getDocs(staffQuery);
      
      const notifications = staffSnapshot.docs.map(staffDoc => {
        const staffData = staffDoc.data();
        return addDoc(collection(db, 'notifications'), {
          title: 'Timetable Change',
          message,
          type: 'General',
          userId: staffDoc.id,
          schoolId: staffData.schoolId,
          status: 'Unread',
          timestamp: new Date().toISOString()
        });
      });

      await Promise.all(notifications);
      toast.success("Teachers in this grade notified!");
    } catch (error) {
      console.error("Error notifying teachers:", error);
    }
  };

  const handleAssignSlot = (day: string, time: string) => {
    setNewSlotData({ day, time, term: activeTerm, month: activeMonth, grade: selectedGrade, stream: selectedStream });
    setIsCustomSubject(false);
    setIsCustomTeacher(false);
    setIsCustomGrade(false);
    setShowAssignModal(true);
  };

  const handleEditSlot = (slot: TimetableSlot) => {
    setNewSlotData(slot);
    setIsCustomSubject(true);
    setIsCustomTeacher(true);
    setIsCustomGrade(true);
    setShowAssignModal(true);
  };

  const handleEditPeriod = (period: any) => {
    setNewPeriodData(period);
    setShowPeriodModal(true);
  };

  const handleDeletePeriod = async (id: string) => {
    if (!window.confirm("Delete this time slot? This will hide any assigned lessons for this time.")) return;
    
    const user = auth.currentUser;
    if (!user) {
      setPeriods(periods.filter(p => p.id !== id));
      toast.success("Demo: Period deleted locally!");
      return;
    }

    try {
      await deleteDoc(doc(db, 'timetable_periods', id));
      toast.success("Period deleted");
    } catch (error) {
      toast.error("Failed to delete period");
    }
  };

  const handleAddPeriod = () => {
    setNewPeriodData({ time: '', label: '', type: 'academic' });
    setShowPeriodModal(true);
  };

  const handleDeleteSlot = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this slot?")) return;

    const user = auth.currentUser;
    if (!user) {
      // Demo Mode delete
      setTimetable(timetable.filter(s => s.id !== id));
      toast.success("Demo: Slot deleted locally!");
      return;
    }

    try {
      await deleteDoc(doc(db, 'timetable', id));
      toast.success("Slot deleted!");
    } catch (error) {
      console.error("Error deleting slot:", error);
      toast.error("Failed to delete slot");
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-64 w-full items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-orange-600" />
          <p className="text-sm font-bold text-slate-500 animate-pulse">Initializing Board...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700 font-sans">
      {/* Hierarchical Header */}
      <div className="w-[100vw] relative left-1/2 -ml-[50vw] -mt-4 md:-mt-8 bg-[#334155] py-5 border-b border-[#1f507a] shadow-sm">
        <div className="w-full max-w-7xl mx-auto px-4 md:px-8">
          <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/10 rounded-xl">
                <Calendar size={24} className="text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight">School Timetable</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs font-bold text-blue-200">{activeTerm}</span>
                  <ChevronRight size={14} className="text-blue-300" />
                  <span className="text-xs font-bold text-blue-50">{activeMonth}</span>
                  <ChevronRight size={14} className="text-blue-300" />
                  <span className="text-xs font-bold text-white">{selectedGrade}</span>
                </div>
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex p-1 bg-black/20 rounded-2xl border border-white/10">
                {Object.keys(TERM_MONTHS).map(term => (
                  <button
                    key={term}
                    onClick={() => {
                      setActiveTerm(term);
                      setActiveMonth(TERM_MONTHS[term][0]);
                    }}
                    className={`px-6 py-2 rounded-xl text-xs font-bold transition-all ${
                      activeTerm === term ? 'bg-white text-[#334155] shadow-sm' : 'text-white/60 hover:text-white'
                    }`}
                  >
                    {term}
                  </button>
                ))}
              </div>
              <button 
                onClick={handleResetPeriods}
                className="flex items-center justify-center gap-2 px-6 py-2.5 bg-[#475569] text-white rounded-xl text-[12.5px] font-bold hover:bg-[#1e293b] transition-all shadow-sm active:scale-95 group border border-white/10"
                title="Reset to default slots"
              >
                <RotateCcw size={16} className="group-hover:rotate-180 transition-transform duration-500" /> 
                Reset Slots
              </button>
              <button 
                onClick={handleAddPeriod}
                className="flex items-center justify-center gap-2 px-6 py-2.5 bg-white text-orange-600 rounded-xl text-[12.5px] font-bold hover:bg-slate-50 transition-all shadow-sm active:scale-95 group border border-white/20 ml-2"
              >
                <Plus size={16} className="group-hover:rotate-90 transition-transform font-bold" /> 
                Add Slot
              </button>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-white/10 flex flex-col xl:flex-row xl:items-center justify-between gap-6">
            <div className="flex p-1.5 bg-black/10 border border-white/10 rounded-[2rem] overflow-x-auto hide-scrollbar w-fit">
              {TERM_MONTHS[activeTerm].map((month) => (
                <button
                  key={month}
                  onClick={() => setActiveMonth(month)}
                  className={`flex items-center gap-2 px-6 py-2.5 rounded-[1.5rem] text-[11px] font-bold whitespace-nowrap transition-all duration-300 ${
                    activeMonth === month 
                      ? 'bg-white text-orange-600 shadow-lg scale-105' 
                      : 'text-white/60 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {month}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-3 px-5 py-2.5 bg-black/10 border border-white/10 rounded-[2rem]">
                <LayoutGrid size={14} className="text-orange-200" />
                <select 
                  value={selectedGrade}
                  onChange={(e) => setSelectedGrade(e.target.value)}
                  className="bg-transparent text-[11px] font-bold text-white outline-none cursor-pointer"
                >
                  {CBC_GRADES.map(g => <option key={g} value={g} className="text-slate-900">{g}</option>)}
                </select>
              </div>

              <div className="flex items-center gap-3 px-5 py-2.5 bg-black/10 border border-white/10 rounded-[2rem]">
                <Zap size={14} className="text-orange-200" />
                <select 
                  value={selectedStream}
                  onChange={(e) => setSelectedStream(e.target.value)}
                  className="bg-transparent text-[11px] font-bold text-white outline-none cursor-pointer"
                >
                  <option value="Jasmine" className="text-slate-900">Jasmine</option>
                  <option value="Lavender" className="text-slate-900">Lavender</option>
                  <option value="Rose" className="text-slate-900">Rose</option>
                </select>
              </div>

              <div className="flex items-center gap-3 px-5 py-2.5 bg-black/10 border border-white/10 rounded-[2rem]">
                <User size={14} className="text-orange-200" />
                <select 
                  value={selectedTeacher}
                  onChange={(e) => setSelectedTeacher(e.target.value)}
                  className="bg-transparent text-[11px] font-bold text-white outline-none cursor-pointer"
                >
                  {teachers.map(t => <option key={t} value={t} className="text-slate-900">{t}</option>)}
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Weekly Board Layout */}
      {filteredData.length === 0 && !isLoading ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-slate-900 rounded-[3rem] border-2 border-dashed border-slate-100 dark:border-slate-800 text-center min-h-[400px]">
          <div className="w-20 h-20 bg-orange-50 dark:bg-orange-900/20 rounded-[2rem] flex items-center justify-center mb-6 shadow-sm">
            <BookOpen size={40} className="text-orange-600 dark:text-orange-400" />
          </div>
          <h3 className="text-2xl font-bold text-slate-800 dark:text-white mb-3">No Lessons Scheduled</h3>
          <p className="text-slate-500 max-w-sm mb-8 font-medium">
            There are no lessons assigned for <span className="text-orange-600 font-bold">{selectedGrade} ({selectedStream})</span> in <span className="text-slate-800 dark:text-slate-200">{activeMonth}</span>.
          </p>
          <button 
            onClick={() => handleAssignSlot(DAYS[0], periods[0]?.time || '07:00')}
            className="px-8 py-3.5 bg-orange-600 text-white rounded-2xl text-[13px] font-bold hover:bg-orange-700 transition-all shadow-lg active:scale-95 flex items-center gap-2"
          >
            <Plus size={18} /> Assign first lesson
          </button>
        </div>
      ) : (
        <div className="flex gap-6 overflow-x-auto pb-8 custom-scrollbar min-h-[600px] -mx-4 px-4 md:-mx-8 md:px-8">
          {DAYS.filter(d => selectedDay === 'Weekly Board' || d === selectedDay).map(day => (
            <div key={day} className="flex-shrink-0 w-[320px] flex flex-col gap-6">
              <div className="flex flex-col gap-4">
                {periods.map(period => {
                  const slot = filteredData.find(s => s.day === day && s.time === period.time);
                  
                  return (
                    <div key={`${day}-${period.time}`}>
                      {slot ? (
                        <div className={`group relative p-8 bg-gradient-to-br from-orange-50/50 via-white to-orange-100/20 dark:from-slate-800 dark:to-slate-900 rounded-[2rem] border-2 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 ${slot.isConflict ? 'border-rose-500 shadow-lg shadow-rose-500/10' : 'border-slate-100 dark:border-slate-800 hover:border-orange-500/30'} cursor-default flex flex-col items-center text-center overflow-hidden border-orange-500/10`}>
                          <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full blur-2xl -mr-16 -mt-16 group-hover:bg-orange-500/10 transition-all duration-700" />
                          
                          {slot.isConflict && (
                            <div className="absolute top-4 right-4 px-3 py-1 bg-rose-500 text-white text-[8px] font-bold rounded-full shadow-lg flex items-center gap-1.5 animate-bounce z-10">
                              Conflict
                            </div>
                          )}

                          <div className="relative z-10 w-full flex flex-col items-center">
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-full border border-slate-100 dark:border-slate-700 shadow-sm mb-6">
                              <Clock size={12} className="text-orange-500" />
                              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{period.time}</span>
                            </div>

                            <div className="mb-6">
                              <h4 className="text-xl font-bold text-slate-800 dark:text-white leading-none tracking-tight mb-2 group-hover:text-orange-600 transition-colors">{slot.subject}</h4>
                              <p className="text-[10px] font-bold text-slate-500 uppercase">{slot.department}</p>
                            </div>

                            <div className="w-full p-4 bg-white/60 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-700 mb-6 flex flex-col items-center">
                               <div className="w-12 h-12 rounded-[1rem] bg-slate-900 flex items-center justify-center text-white text-sm font-bold mb-2 shadow-inner border border-white/10">
                                  {slot.teacher.charAt(0)}
                               </div>
                                <p className="text-xs font-bold text-slate-800 dark:text-white mb-0.5">{slot.teacher}</p>
                               <p className="text-[10px] font-semibold text-slate-500">Teacher</p>
                            </div>

                            <div className="w-full flex items-center justify-between mt-auto">
                               <div className="flex items-center gap-1.5">
                                   <span className="px-2.5 py-1 bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 text-[10px] font-bold rounded-lg border border-orange-100 dark:border-orange-800 shadow-sm">
                                      {slot.grade}
                                   </span>
                               </div>
                               
                               <div className="flex gap-1">
                                 <button 
                                   onClick={() => {
                                     if (swapSource) {
                                        handleSwapSlots(slot);
                                     } else {
                                        setSwapSource(slot);
                                     }
                                   }}
                                   className={`p-2.5 rounded-xl transition-all ${swapSource?.id === slot.id ? 'bg-orange-600 text-white animate-pulse' : 'bg-slate-50 dark:bg-slate-800 text-slate-600 hover:bg-white hover:text-orange-600 hover:shadow-md'}`}
                                 >
                                   <ArrowRight size={14} strokeWidth={3} className={swapSource?.id === slot.id ? 'rotate-90' : ''} />
                                 </button>
                                 <button 
                                   onClick={() => handleEditSlot(slot)}
                                   className="p-2.5 bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-600 rounded-xl hover:bg-white hover:text-slate-800 hover:shadow-md transition-all"
                                 >
                                   <Pencil size={14} strokeWidth={3} />
                                 </button>
                               </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <button 
                          onClick={() => {
                            if (swapSource) {
                              handleEmptySwap(day, period.time);
                            } else {
                              handleAssignSlot(day, period.time);
                            }
                          }}
                          className={`w-full py-4 border-2 border-dashed rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2 group ${swapSource ? 'border-orange-500 bg-orange-50/20 text-orange-600' : 'border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-600 hover:border-orange-500/30 hover:bg-slate-50 dark:hover:bg-slate-800/30 hover:text-orange-500'}`}
                        >
                           <Plus size={14} className="group-hover:rotate-90 transition-transform" />
                          {swapSource ? "Move here" : "Assign slot"}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {swapSource && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] px-8 py-4 bg-slate-900 text-white rounded-[2rem] shadow-2xl flex items-center gap-6 animate-in slide-in-from-bottom-10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-orange-600 rounded-full flex items-center justify-center animate-pulse">
              <Zap size={16} />
            </div>
             <p className="text-xs font-bold">
              Moving: <span className="text-orange-400">{swapSource.subject}</span>
            </p>
          </div>
          <button 
            onClick={() => setSwapSource(null)}
             className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-[10px] font-bold transition-colors"
          >
            Cancel
          </button>
        </div>
      )}
      {showAssignModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 md:p-12">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowAssignModal(false)}
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-xl"
          />
           <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 40 }}
            className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-[2.25rem] shadow-2xl border border-slate-100 dark:border-slate-800 p-10 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-40 h-40 bg-orange-50 dark:bg-orange-900/10 rounded-full -mr-20 -mt-20"></div>
            
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-10">
                <div className="flex items-center gap-5">
                  <div className="w-14 h-14 bg-orange-50 dark:bg-orange-900/20 rounded-2xl flex items-center justify-center shadow-sm">
                    <Calendar size={28} className="text-orange-600 dark:text-orange-400" strokeWidth={2.5} />
                  </div>
                  <div>
                     <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100 tracking-tight leading-none">
                      {newSlotData.id ? 'Update allocation' : 'Allocate slot'}
                    </h3>
                    <p className="text-xs font-semibold text-slate-500 mt-2">
                      {newSlotData.day} • {newSlotData.time}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowAssignModal(false)}
                  className="p-3 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-colors"
                >
                  <X size={20} className="text-slate-600" />
                </button>
              </div>

              <div className="space-y-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-slate-600 uppercase ml-1">Subject / Activity</label>
                  <div className="flex gap-3">
                    {!isCustomSubject ? (
                      <select 
                        className="flex-1 px-5 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl text-sm font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-orange-500/20 transition-all cursor-pointer"
                        value={newSlotData.subject || ''}
                        onChange={(e) => setNewSlotData({...newSlotData, subject: e.target.value})}
                      >
                        <option value="">Select Subject/Activity</option>
                        {[...new Set([...LOWER_PRIMARY_LEARNING_AREAS, ...JUNIOR_SECONDARY_LEARNING_AREAS])].map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    ) : (
                      <input 
                        type="text" 
                        placeholder="Enter Custom Subject" 
                        className="flex-1 px-5 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl text-sm font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-orange-500/20 transition-all"
                        value={newSlotData.subject || ''}
                        onChange={(e) => setNewSlotData({...newSlotData, subject: e.target.value})}
                      />
                    )}
                    <button 
                      type="button"
                      onClick={() => {
                        setIsCustomSubject(!isCustomSubject);
                        setNewSlotData({...newSlotData, subject: ''});
                      }}
                      className="px-6 py-4 bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 rounded-2xl text-[10px] font-bold hover:bg-orange-100 transition-colors"
                    >
                      {isCustomSubject ? 'Select' : 'Custom'}
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-slate-600 uppercase ml-1">Teacher</label>
                  <div className="flex gap-3">
                    {!isCustomTeacher ? (
                      <select 
                        className="flex-1 px-5 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl text-sm font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-orange-500/20 transition-all cursor-pointer"
                        value={newSlotData.teacher || ''}
                        onChange={(e) => setNewSlotData({...newSlotData, teacher: e.target.value})}
                      >
                        <option value="">Select Teacher</option>
                        {teachers.filter(t => t !== 'All Teachers').map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    ) : (
                      <input 
                        type="text" 
                        placeholder="Enter Teacher Name" 
                        className="flex-1 px-5 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl text-sm font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-orange-500/20 transition-all"
                        value={newSlotData.teacher || ''}
                        onChange={(e) => setNewSlotData({...newSlotData, teacher: e.target.value})}
                      />
                    )}
                    <button 
                      type="button"
                      onClick={() => {
                        setIsCustomTeacher(!isCustomTeacher);
                        setNewSlotData({...newSlotData, teacher: ''});
                      }}
                      className="px-6 py-4 bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 rounded-2xl text-[10px] font-bold hover:bg-orange-100 transition-colors"
                    >
                      {isCustomTeacher ? 'Select' : 'Custom'}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <label className="text-[10px] font-bold text-slate-600 uppercase ml-1">Grade</label>
                    {!isCustomGrade ? (
                      <select 
                        className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl text-sm font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-orange-500/20 transition-all cursor-pointer"
                        value={newSlotData.grade || ''}
                        onChange={(e) => setNewSlotData({...newSlotData, grade: e.target.value})}
                      >
                        <option value="">Select Grade</option>
                        {CBC_GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                      </select>
                    ) : (
                      <input 
                        type="text" 
                        placeholder="Custom Grade" 
                        className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl text-sm font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-orange-500/20 transition-all"
                        value={newSlotData.grade || ''}
                        onChange={(e) => setNewSlotData({...newSlotData, grade: e.target.value})}
                      />
                    )}
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-bold text-slate-600 uppercase ml-1">Stream</label>
                    <select 
                      className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl text-sm font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-orange-500/20 transition-all cursor-pointer"
                      value={newSlotData.stream || 'Jasmine'}
                      onChange={(e) => setNewSlotData({...newSlotData, stream: e.target.value})}
                    >
                      <option value="Jasmine">Jasmine</option>
                      <option value="Lavender">Lavender</option>
                      <option value="Rose">Rose</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3 mt-12">
                <button                   onClick={async () => {
                    if (!newSlotData.subject || !newSlotData.teacher || !newSlotData.grade) {
                      toast.error("Please fill all required fields");
                      return;
                    }
                    
                    const user = auth.currentUser;
                    let schoolId = 'demo-school';
                    
                    if (user) {
                      try {
                        schoolId = user.uid;
                        const staffDocRef = doc(db, 'staff', user.uid);
                        const staffDocSnap = await getDoc(staffDocRef);
                        if (staffDocSnap.exists()) {
                          schoolId = staffDocSnap.data().schoolId;
                        }
                      } catch (err) {
                        console.error("Error fetching schoolId:", err);
                        // Fallback to user.uid
                      }
                    }

                    // Strip UI-only fields
                    const { isConflict, conflictDetails, ...cleanSlotData } = newSlotData;
                    
                    // Normalize time to HH:mm
                    const normalizedTime = (cleanSlotData.time || '').split(':').slice(0, 2).join(':');

                    const slotData = {
                      ...cleanSlotData,
                      time: normalizedTime,
                      schoolId,
                      stream: newSlotData.stream || 'Jasmine',
                      department: newSlotData.department || 'General'
                    } as TimetableSlot;

                    try {
                      if (!user) {
                        // Demo Mode - Update local state
                        if (newSlotData.id) {
                          setTimetable(timetable.map(s => s.id === newSlotData.id ? { ...s, ...slotData } : s));
                        } else {
                          const newId = `demo-${Math.random().toString(36).substr(2, 9)}`;
                          setTimetable([...timetable, { ...slotData, id: newId }]);
                        }
                        toast.success("Demo: Slot updated locally!");
                        setShowAssignModal(false);
                        return;
                      }

                      if (newSlotData.id) {
                        const { id, ...updateData } = slotData as any;
                        await updateDoc(doc(db, 'timetable', id), updateData);
                        toast.success("Slot updated successfully!");
                      } else {
                        await addDoc(collection(db, 'timetable'), slotData as any);
                        toast.success("Slot assigned successfully!");
                      }
                      setShowAssignModal(false);
                    } catch (error) {
                      console.error("Error saving slot:", error);
                      toast.error("Failed to save slot. Check internet or permissions.");
                    }
                  }} 
                  className="w-full py-4 bg-orange-600 text-white rounded-2xl text-sm font-bold tracking-wide hover:bg-orange-700 transition-all shadow-md active:scale-95"
                >
                  {newSlotData.id ? 'Update allocation' : 'Confirm allocation'}
                </button>
                 <button 
                  onClick={() => setShowAssignModal(false)} 
                  className="w-full py-3 text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors"
                >
                  Discard changes
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {showPeriodModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 md:p-12">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowPeriodModal(false)}
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-xl"
          />
           <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 40 }}
            className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-[2.25rem] shadow-2xl border border-slate-100 dark:border-slate-800 p-10 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-50 dark:bg-orange-900/10 rounded-full -mr-16 -mt-16"></div>
            
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-10">
                <div className="flex items-center gap-5">
                  <div className="w-14 h-14 bg-orange-50 dark:bg-orange-900/20 rounded-2xl flex items-center justify-center shadow-sm">
                    <Clock size={28} className="text-orange-600 dark:text-orange-400" strokeWidth={2.5} />
                  </div>
                  <div>
                     <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100 tracking-tight leading-none">
                      {newPeriodData.id ? 'Edit time slot' : 'New time slot'}
                    </h3>
                    <p className="text-xs font-semibold text-slate-500 mt-2">Configure your schedule</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowPeriodModal(false)}
                  className="p-3 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-colors"
                >
                  <X size={20} className="text-slate-600" />
                </button>
              </div>
              
              <div className="space-y-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-slate-600 uppercase ml-1">Start Time</label>
                  <input 
                    type="time" 
                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl text-sm font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-orange-500/20 transition-all"
                    value={newPeriodData.time || ''}
                    onChange={(e) => setNewPeriodData({...newPeriodData, time: e.target.value})}
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-slate-600 uppercase ml-1">Label</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Period 1"
                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl text-sm font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-orange-500/20 transition-all"
                    value={newPeriodData.label || ''}
                    onChange={(e) => setNewPeriodData({...newPeriodData, label: e.target.value})}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-3 mt-12">
                <button 
                  onClick={async () => {
                    if (!newPeriodData.time || !newPeriodData.label) {
                      toast.error("Please fill all required fields");
                      return;
                    }
                    const user = auth.currentUser;
                    
                    try {
                      if (!user) {
                        // Demo Mode - Update local state
                        if (newPeriodData.id) {
                          setPeriods(periods.map(p => p.id === newPeriodData.id ? { ...p, ...newPeriodData } : p));
                        } else {
                          const newId = `period-${Math.random().toString(36).substr(2, 9)}`;
                          setPeriods([...periods, { ...newPeriodData, id: newId }]);
                        }
                        toast.success("Demo: Period saved locally!");
                        setShowPeriodModal(false);
                        return;
                      }

                      let schoolId = user.uid;
                      const staffDocRef = doc(db, 'staff', user.uid);
                      const staffDocSnap = await getDoc(staffDocRef);
                      if (staffDocSnap.exists()) {
                        schoolId = staffDocSnap.data().schoolId;
                      }

                      // Normalize time to HH:mm
                      const normalizedTime = (newPeriodData.time || '').split(':').slice(0, 2).join(':');
                      const finalPeriodData = { ...newPeriodData, time: normalizedTime };

                      if (newPeriodData.id) {
                        const { id, ...updateData } = finalPeriodData;
                        await updateDoc(doc(db, 'timetable_periods', id), updateData);
                        toast.success("Period updated successfully");
                      } else {
                        await addDoc(collection(db, 'timetable_periods'), { ...finalPeriodData, schoolId });
                        toast.success("Period added successfully");
                      }
                      setShowPeriodModal(false);
                    } catch (error) {
                      toast.error("Failed to save period");
                    }
                  }} 
                  className="w-full py-4 bg-orange-600 text-white rounded-2xl text-sm font-bold tracking-wide hover:bg-orange-700 transition-all shadow-md active:scale-95"
                >
                  Save Time Slot
                </button>
                <button 
                  onClick={() => setShowPeriodModal(false)} 
                  className="w-full py-3 text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors"
                >
                  Discard Changes
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default TimetableModule;

