import React, { useState, useEffect, useMemo } from 'react';
import { 
  BookOpen, 
  GraduationCap,
  Users, 
  Calendar as CalendarIcon, 
  CheckCircle2, 
  Clock, 
  FileText, 
  Award,
  ChevronRight,
  ChevronLeft,
  MessageSquare,
  Loader2,
  Search,
  ArrowUpRight,
  MoreVertical,
  BadgeCheck,
  Plus,
  LayoutDashboard,
  ArrowRight,
  Wallet,
  Smartphone
} from 'lucide-react';

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { CBC_GRADES, PERIODS } from '../constants';
import toast from 'react-hot-toast';
import { db, auth } from '../src/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, onSnapshot, getDocs, addDoc, updateDoc, doc, serverTimestamp, getDoc, limit } from 'firebase/firestore';
import { Student, Assessment, TimetableSlot, CBCGrade } from '../types';
import { sendTransitNotification } from '../services/notificationService';

interface TeacherModuleProps {
  setActiveTab?: (tab: string) => void;
  user: any;
  profile: any;
}

const TeacherModule: React.FC<TeacherModuleProps> = ({ setActiveTab, user, profile }) => {
  const [activeTab, setActiveTabInternal] = useState<'overview' | 'classes' | 'grading'>('overview');
  const [timetableFilter, setTimetableFilter] = useState('Today');
  const [students, setStudents] = useState<Student[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [timetable, setTimetable] = useState<TimetableSlot[]>([]);
  const [teacherData, setTeacherData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [attendanceLogs, setAttendanceLogs] = useState<any[]>([]);
  const [personalPhoto, setPersonalPhoto] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const isClassTeacher = useMemo(() => {
    return teacherData?.classTeacherOf && teacherData?.stream;
  }, [teacherData]);

  const classStudents = useMemo(() => {
    if (!isClassTeacher || !teacherData) return [];
    return students.filter(s => s.grade === teacherData.classTeacherOf && s.stream === teacherData.stream);
  }, [students, teacherData, isClassTeacher]);

  useEffect(() => {
    if (!user || !profile) return;

    let unsubs: (() => void)[] = [];

    const setupData = async () => {
      setIsLoading(true);
      try {
        console.log("[TeacherModule] Setting up data for UID:", user.uid);
        let staffDocSnap = await getDoc(doc(db, 'staff', user.uid));
        let tData: any = null;

        if (staffDocSnap.exists()) {
          tData = staffDocSnap.data();
        } else if (user.email) {
          // Fallback to email lookup if UID document doesn't exist (common for staff added manually)
          const qStaff = query(collection(db, 'staff'), where('email', '==', user.email.toLowerCase().trim()), limit(1));
          const staffQuerySnap = await getDocs(qStaff);
          if (!staffQuerySnap.empty) {
            tData = staffQuerySnap.docs[0].data();
            console.log("[TeacherModule] Resolved staff via email fallback");
          }
        }
        
        if (!tData) {
          console.error("[TeacherModule] No staff record found for user:", user.uid, user.email);
          setIsLoading(false);
          return;
        }

        setTeacherData({ id: staffDocSnap.id || user.uid, ...tData });
        if (tData.profilePhoto) {
          setPersonalPhoto(tData.profilePhoto);
        }
        const schoolId = tData.schoolId;

        const qStudents = query(collection(db, 'students'), where('schoolId', '==', schoolId));
        const qAssessments = query(collection(db, 'assessments'), where('schoolId', '==', schoolId));
        const qTimetable = query(collection(db, 'timetable'), where('schoolId', '==', schoolId));
        const qAttendance = query(collection(db, 'attendance'), where('schoolId', '==', schoolId), where('date', '==', new Date().toISOString().split('T')[0]));

        const unsubStudents = onSnapshot(qStudents, (snapshot) => {
          setStudents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student)));
        });
        unsubs.push(unsubStudents);

        const unsubAssessments = onSnapshot(qAssessments, (snapshot) => {
          setAssessments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Assessment)));
        });
        unsubs.push(unsubAssessments);

        const unsubTimetable = onSnapshot(qTimetable, (snapshot) => {
          setTimetable(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TimetableSlot)));
        });
        unsubs.push(unsubTimetable);

        const unsubAttendance = onSnapshot(qAttendance, (snapshot) => {
          setAttendanceLogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
          setIsLoading(false);
        });
        unsubs.push(unsubAttendance);
      } catch (err) {
        console.error("[TeacherModule] Data fetch error:", err);
        setIsLoading(false);
      }
    };

    setupData();
    return () => {
      unsubs.forEach(unsub => unsub());
    };
  }, [user, profile]);

  const teacherSchedule = useMemo(() => {
    if (!teacherData) return [];
    // In a real app, we'd filter by teacher name or ID in the timetable
    return timetable
      .filter(slot => slot.teacher === teacherData.name)
      .sort((a, b) => a.time.localeCompare(b.time))
      .map(slot => {
        const periodIndex = PERIODS.findIndex(p => p.time === slot.time);
        const nextPeriod = PERIODS[periodIndex + 1];
        const endTime = nextPeriod ? nextPeriod.time : '15:20';
        
        const currentHour = new Date().getHours();
        const slotHour = parseInt(slot.time.split(':')[0]);
        let status = 'Upcoming';
        if (slotHour < currentHour) status = 'Completed';
        else if (slotHour === currentHour) status = 'In Progress';
        
        return { ...slot, endTime, status };
      });
  }, [timetable, teacherData]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) { // 2MB limit
      toast.error('Image size should be less than 2MB');
      return;
    }

    const user = auth.currentUser;
    if (!user) {
      toast.error('You must be logged in to upload a photo');
      return;
    }

    setIsUploadingPhoto(true);

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        
        // Save to staff collection for teachers
        const staffRef = doc(db, 'staff', user.uid);
        await updateDoc(staffRef, { profilePhoto: base64String });
        
        setPersonalPhoto(base64String);
        toast.success('Personnel photo updated!');
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Error uploading photo:", error);
      toast.error("Failed to update photo");
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const teacherClasses = useMemo(() => {
    if (!teacherData) return [];
    // Derive classes from timetable slots assigned to this teacher
    const classesMap = new Map();
    teacherSchedule.forEach(slot => {
      const key = `${slot.grade}-${slot.stream}-${slot.subject}`;
      if (!classesMap.has(key)) {
        const classStudents = students.filter(s => s.grade === slot.grade && s.stream === slot.stream);
        classesMap.set(key, {
          grade: slot.grade,
          stream: slot.stream,
          subject: slot.subject,
          studentCount: classStudents.length,
          avgScore: classStudents.length > 0 
            ? Math.round(classStudents.reduce((acc, s) => acc + (s.performance || 0), 0) / classStudents.length) 
            : 0
        });
      }
    });
    return Array.from(classesMap.values());
  }, [teacherSchedule, students, teacherData]);

  const gradingStudents = useMemo(() => {
    if (!selectedClass) return [];
    const [grade, stream] = selectedClass.split('|');
    return students.filter(s => s.grade === grade && s.stream === stream);
  }, [students, selectedClass]);

  const handleSaveMarks = async (studentId: string, score: number, level: any, remarks: string) => {
    try {
      const user = auth.currentUser;
      if (!user || !teacherData) return;

      const [grade, stream, subject] = selectedClass.split('|');

      await addDoc(collection(db, 'assessments'), {
        schoolId: teacherData.schoolId,
        studentId,
        learningArea: subject || 'General',
        strand: 'Summative',
        level,
        term: 'Term 1', // Should be dynamic
        year: 2026,
        remarks,
        score,
        teacherId: user.uid,
        createdAt: serverTimestamp()
      });

      // Also update student's aggregate performance for dashboard
      await updateDoc(doc(db, 'students', studentId), {
        performance: score
      });

      toast.success('Marks saved successfully');
    } catch (error) {
      console.error("Error saving marks:", error);
      toast.error('Failed to save marks');
    }
  };

  const handleMarkAttendance = async (studentId: string, studentName: string, status: 'PRESENT' | 'ABSENT') => {
    try {
      const user = auth.currentUser;
      if (!user || !teacherData) return;

      const today = new Date().toISOString().split('T')[0];
      const existingLog = attendanceLogs.find(l => l.studentId === studentId && l.date === today);

      if (existingLog) {
        if (existingLog.status === status) {
          toast.error(`Attendance already marked as ${status}`);
          return;
        }
        // Update existing log
        await updateDoc(doc(db, 'attendance', existingLog.id), {
          status,
          recordedBy: user.uid,
          timestamp: serverTimestamp()
        });
      } else {
        // Create new log
        await addDoc(collection(db, 'attendance'), {
          schoolId: teacherData.schoolId,
          studentId,
          date: today,
          status,
          recordedBy: user.uid,
          timestamp: serverTimestamp()
        });
      }

      // Optional: Send notification for presence
      if (status === 'PRESENT') {
        await sendTransitNotification(teacherData.schoolId, studentId, studentName, 'marked_present');
      }
      
      toast.success(`${studentName} marked as ${status}`);
    } catch (error) {
      console.error("Error marking attendance:", error);
      toast.error('Failed to mark attendance');
    }
  };





  const StatCard = ({ title, value, icon, color, subtitle }: any) => (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/60 dark:border-slate-800 hover:shadow-lg hover:shadow-slate-200/40 dark:hover:shadow-none transition-all duration-300 group relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-slate-50 to-transparent dark:from-slate-800/50 dark:to-transparent rounded-full -mr-16 -mt-16 transition-transform duration-700 group-hover:scale-110 opacity-50"></div>
      <div className="relative z-10 flex items-center justify-between">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center shadow-sm`}>
              {React.cloneElement(icon, { size: 20 })}
            </div>
            <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">{title}</span>
          </div>
          <div className="space-y-1">
            <p className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">{value}</p>
            {subtitle && <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{subtitle}</p>}
          </div>
        </div>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-10 h-10 animate-spin text-orange-600" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Standardized Header (Learners Style) */}
      <div className="w-[100vw] relative left-1/2 -ml-[50vw] -mt-4 md:-mt-8 bg-[#334155] py-5 border-b border-[#1f507a] shadow-sm">
        <div className="w-full max-w-7xl mx-auto px-4 md:px-8">
          <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/10 rounded-xl">
                <GraduationCap size={24} className="text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight">Teachers Portal & Dashboard</h2>
                <p className="text-xs text-blue-100 mt-1">
                  {teacherData?.name ? `Welcome, ${teacherData.name}` : 'Welcome back'} • {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
                </p>
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-2">
              {[
                ...(isClassTeacher ? [{ label: 'My Learners', count: classStudents.length }] : []),
                { label: 'Periods Today', count: teacherSchedule.filter(s => s.status === 'In Progress' || s.status === 'Upcoming').length },
              ].map((btn, i) => (
                <div key={i} className="flex items-center gap-2 px-4 py-2 bg-black/20 hover:bg-black/30 text-white border border-white/10 rounded-[2rem] text-xs font-bold transition-all">
                  {btn.label}
                  <span className="bg-black/30 text-blue-100 px-2 py-0.5 rounded-full text-[10px]">{btn.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl">
        {[
          { id: 'overview', label: 'Dashboard', icon: <LayoutDashboard size={14} strokeWidth={2.5} /> },
          ...(isClassTeacher ? [{ id: 'classes', label: 'My Class', icon: <Users size={14} strokeWidth={2.5} /> }] : []),
          { id: 'grading', label: 'Grading Hub', icon: <Award size={14} strokeWidth={2.5} /> },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTabInternal(tab.id as any)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 ${
              activeTab === tab.id
                ? 'bg-[#334155] text-white shadow-md shadow-slate-500/25 scale-105'
                : 'text-slate-500 hover:bg-white dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
        <div className="ml-auto flex gap-2 pr-1">
          <button
            onClick={() => setActiveTab ? setActiveTab('attendance-register') : setActiveTabInternal('grading' as any)}
            className="flex items-center gap-2 px-4 py-2 bg-[#334155]/10 text-[#334155] dark:text-slate-300 rounded-xl text-xs font-bold hover:bg-[#334155]/20 transition-all"
          >
            <CheckCircle2 size={14} strokeWidth={2.5} /> Attendance
          </button>
          <button
            onClick={() => setActiveTabInternal('grading' as any)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-xs font-bold hover:opacity-90 transition-all"
          >
            <Plus size={14} strokeWidth={2.5} /> New Assessment
          </button>
        </div>
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-8">
          {/* CBC-style Quick Action Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              {
                title: 'Subject Hub',
                value: teacherClasses.length,
                subtitle: 'Active subjects this term',
                icon: <BookOpen size={22} />,
                color: 'bg-orange-500',
                lightColor: 'bg-orange-50 dark:bg-orange-900/20',
                textColor: 'text-orange-600 dark:text-orange-400',
                action: () => setActiveTabInternal('classes' as any),
                tag: 'Gradiing & Material'
              },
              ...(isClassTeacher ? [
                {
                  title: 'My Class',
                  value: classStudents.length,
                  subtitle: `${classStudents.filter(s => s.status === 'Active').length} active learners`,
                  icon: <Users size={22} />,
                  color: 'bg-blue-500',
                  lightColor: 'bg-blue-50 dark:bg-blue-900/20',
                  textColor: 'text-blue-600 dark:text-blue-400',
                  action: () => setActiveTab ? setActiveTab('students') : null,
                  tag: 'Class Roster'
                },
                {
                   title: 'Class Fees',
                   value: `KES ${classStudents.reduce((acc, s) => acc + (s.balance || 0), 0).toLocaleString()}`,
                   subtitle: 'Total outstanding balance',
                   icon: <Wallet size={22} />,
                   color: 'bg-green-500',
                   lightColor: 'bg-green-50 dark:bg-green-900/20',
                   textColor: 'text-green-600 dark:text-green-400',
                   action: () => setActiveTab ? setActiveTab('finance') : null,
                   tag: 'View Arrears'
                }
              ] : []),
              {
                title: 'Assessments',
                value: assessments.filter(a => a.teacherId === auth.currentUser?.uid).length,
                subtitle: 'Your marks recorded',
                icon: <Award size={22} />,
                color: 'bg-green-500',
                lightColor: 'bg-green-50 dark:bg-green-900/20',
                textColor: 'text-green-600 dark:text-green-400',
                action: () => setActiveTabInternal('grading' as any),
                tag: 'Enter Marks'
              },
              ...(isClassTeacher ? [
                {
                  title: 'Attendance',
                  value: `${attendanceLogs.filter(l => l.status === 'PRESENT').length}/${classStudents.length}`,
                  subtitle: 'Present today',
                  icon: <CheckCircle2 size={22} />,
                  color: 'bg-orange-500',
                  lightColor: 'bg-orange-50 dark:bg-orange-900/20',
                  textColor: 'text-orange-600 dark:text-orange-400',
                  action: () => setActiveTab ? setActiveTab('attendance-register') : null,
                  tag: 'Mark Attendance'
                }
              ] : []),
              {
                title: 'Timetable',
                value: teacherSchedule.filter(s => s.status !== 'Completed').length,
                subtitle: 'Remaining periods today',
                icon: <CalendarIcon size={22} />,
                color: 'bg-amber-500',
                lightColor: 'bg-amber-50 dark:bg-amber-900/20',
                textColor: 'text-amber-600 dark:text-amber-400',
                action: () => setActiveTab ? setActiveTab('timetable') : null,
                tag: 'View Schedule'
              },
            ].map((card, idx) => (
              <div
                key={idx}
                onClick={card.action}
                className="group relative bg-gradient-to-br from-blue-50/50 via-white to-orange-50/20 dark:from-slate-800 dark:to-slate-900 rounded-[2rem] p-8 border border-slate-200/60 dark:border-slate-700 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full blur-2xl -mr-16 -mt-16 group-hover:bg-orange-500/10 transition-all duration-700" />
                <div className="relative z-10">
                  <div className="flex items-center gap-5 mb-8">
                    <div className={`w-16 h-16 rounded-[1.5rem] bg-white dark:bg-slate-900 ${card.textColor} flex items-center justify-center border border-slate-100 dark:border-slate-800 shadow-sm group-hover:scale-110 transition-transform duration-500`}>
                      {card.icon}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-0.5">{card.title}</p>
                      <p className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">{card.value}</p>
                    </div>
                  </div>
                  <div className="p-4 bg-white/60 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700 mb-8">
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{card.subtitle}</p>
                  </div>
                  <button className={`w-full py-3.5 bg-[#334155] dark:bg-white text-white dark:text-[#334155] font-bold text-xs rounded-xl hover:shadow-lg hover:bg-slate-800 transition-all active:scale-95 flex items-center justify-center gap-2`}>
                    {card.tag} <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Today's Schedule */}
          {teacherSchedule.length > 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800 p-6">
              <h3 className="text-sm font-bold text-slate-500 uppercase mb-4">Today's Schedule</h3>
              <div className="space-y-3">
                {teacherSchedule.slice(0, 5).map((slot, i) => (
                  <div key={i} className="flex items-center gap-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-orange-50 dark:hover:bg-orange-900/10 transition-colors">
                    <div className="text-center w-16 shrink-0">
                      <p className="text-xs font-bold text-orange-600">{slot.time}</p>
                      <p className="text-[10px] text-slate-400">{slot.endTime}</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-slate-900 dark:text-white truncate">{slot.subject}</p>
                      <p className="text-xs text-slate-500">{slot.grade} • {slot.stream}</p>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                      slot.status === 'In Progress' ? 'bg-green-100 text-green-700' :
                      slot.status === 'Completed' ? 'bg-slate-100 text-slate-400' :
                      'bg-orange-50 text-orange-600'
                    }`}>
                      {slot.status === 'In Progress' ? '● In Progress' : slot.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Comparative Subject Progress */}
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-8 border border-slate-200/60 dark:border-slate-800 shadow-sm relative overflow-hidden">
             <div className="relative z-10">
               <div className="flex justify-between items-center mb-8">
                 <div>
                   <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest leading-none mb-2">Performance Benchmarking</h3>
                   <p className="text-[11px] font-bold text-slate-400">Comparing your subject averages across the school</p>
                 </div>
               </div>
               
               <div className="space-y-6">
                 {teacherClasses.map((cls, idx) => {
                    const otherAssessments = assessments.filter(a => a.learningArea === cls.subject && a.teacherId !== auth.currentUser?.uid);
                    const avgOther = otherAssessments.length > 0 
                      ? Math.round(otherAssessments.reduce((acc, a) => acc + (a.score || 0), 0) / otherAssessments.length)
                      : 0;
                    
                    return (
                      <div key={idx} className="space-y-2">
                        <div className="flex justify-between items-center text-xs font-bold">
                          <span className="text-slate-700 dark:text-slate-200">{cls.subject} ({cls.grade})</span>
                          <span className={`${cls.avgScore >= avgOther ? 'text-green-600' : 'text-orange-600'}`}>
                            Your Avg: {cls.avgScore}% • Peer Avg: {avgOther}%
                          </span>
                        </div>
                        <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex gap-1">
                           <div className="h-full bg-[#334155] transition-all rounded-full" style={{ width: `${cls.avgScore}%` }}></div>
                           <div className="h-full bg-slate-300 dark:bg-slate-600 transition-all opacity-30 rounded-full" style={{ width: `${avgOther}%` }}></div>
                        </div>
                      </div>
                    );
                 })}
                 {teacherClasses.length === 0 && (
                   <p className="text-center py-6 text-sm font-medium text-slate-500">No subject data available for benchmarking.</p>
                 )}
               </div>
             </div>
          </div>
        </div>
      )}

      {activeTab === 'classes' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {teacherClasses.map((cls, idx) => (
            <div key={idx} className="group relative bg-gradient-to-br from-blue-50/50 via-white to-orange-50/20 dark:from-slate-800 dark:to-slate-900 rounded-[2rem] p-8 border border-slate-200/60 dark:border-slate-700 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden cursor-pointer">
              <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full blur-2xl -mr-16 -mt-16 group-hover:bg-orange-500/10 transition-all duration-700"></div>
              
              <div className="relative z-10">
                  <div className="flex items-center gap-5 mb-8">
                    <div className="w-16 h-16 rounded-[1.5rem] bg-white dark:bg-slate-900 flex items-center justify-center text-orange-600 dark:text-orange-400 border border-slate-100 dark:border-slate-800 shadow-sm group-hover:scale-110 transition-transform duration-500">
                      <BookOpen size={32} />
                    </div>
                    <div>
                      <h4 className="text-xl font-bold text-slate-800 dark:text-white tracking-tight leading-none mb-2">{cls.subject}</h4>
                      <p className="text-[10px] font-bold text-slate-500 uppercase">{cls.grade} • {cls.stream}</p>
                    </div>
                  </div>

                <div className="grid grid-cols-2 gap-4 p-4 bg-white/50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700 mb-8">
                  <div>
                    <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Learners</p>
                    <p className="text-xl font-bold text-slate-900 dark:text-white">{cls.studentCount}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Avg Score</p>
                    <p className="text-xl font-bold text-orange-600 dark:text-orange-400">{cls.avgScore}%</p>
                  </div>
                </div>

                <button 
                  onClick={() => setActiveTabInternal('grading')}
                  className="w-full py-3.5 bg-[#334155] dark:bg-white text-white dark:text-[#334155] font-bold text-xs rounded-xl hover:shadow-lg hover:bg-slate-800 dark:hover:bg-slate-100 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  Enter Marks <ArrowRight size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'grading' && (
        <div className="bg-white dark:bg-slate-900 p-8 md:p-10 rounded-3xl border border-slate-200/60 dark:border-slate-800 shadow-sm transition-all">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <div className="w-20 h-20 bg-white dark:bg-slate-900 rounded-[2rem] flex items-center justify-center border-4 border-white dark:border-slate-800 shadow-xl overflow-hidden group relative">
            {personalPhoto ? (
              <img src={personalPhoto} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <Users size={32} className="text-slate-300 dark:text-slate-600" />
            )}
            <label className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer text-white">
              {isUploadingPhoto ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus size={20} />}
              <input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} />
            </label>
          </div>
          <div>
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight leading-tight">
              Welcome back, {teacherData?.name || 'Teacher'}
            </h2>
            <p className="text-sm font-bold text-slate-500 mt-1 capitalize">
              {teacherData?.classTeacherOf} {teacherData?.stream} • Educator Dashboard
            </p>
          </div>
        </div>
      </div>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-10">
            <div>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight leading-none mb-2">Summative Assessment Report</h3>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Enter comprehensive marks and CBC performance levels</p>
            </div>
            <div className="flex gap-4 flex-wrap">
              <select className="px-6 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-orange-500/20 shadow-sm cursor-pointer transition-all hover:border-orange-200 dark:hover:border-orange-800">
                <option>Term 1</option>
                <option>Term 2</option>
                <option>Term 3</option>
              </select>
              <select 
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="px-6 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-orange-500/20 shadow-sm cursor-pointer transition-all hover:border-orange-200 dark:hover:border-orange-800"
              >
                <option value="">Select Class</option>
                {teacherClasses.map((cls, idx) => (
                  <option key={idx} value={`${cls.grade}|${cls.stream}|${cls.subject}`}>
                    {cls.grade} {cls.stream} - {cls.subject}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {!selectedClass ? (
            <div className="text-center py-20 text-slate-500 dark:text-slate-400">
              <div className="w-24 h-24 bg-slate-50 dark:bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm border border-slate-200/60 dark:border-slate-700">
                <FileText size={40} className="text-slate-400 dark:text-slate-500" strokeWidth={1.5} />
              </div>
              <p className="text-sm font-medium">Please select a class to enter marks.</p>
            </div>
          ) : (
            <div className="overflow-x-auto hide-scrollbar">
              <table className="w-full min-w-[800px] border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 border-b border-slate-200/60 dark:border-slate-700">
                    <th className="text-left py-4 px-6 text-xs font-semibold uppercase rounded-tl-2xl">Learner</th>
                    <th className="text-left py-4 px-6 text-xs font-semibold uppercase">Adm No</th>
                    <th className="text-left py-4 px-6 text-xs font-semibold uppercase">Score / 100</th>
                    <th className="text-left py-4 px-6 text-xs font-semibold uppercase">CBC Level</th>
                    <th className="text-left py-4 px-6 text-xs font-semibold uppercase">Comprehensive Remarks</th>
                    <th className="text-right py-4 px-6 text-xs font-semibold uppercase rounded-tr-2xl">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                  {gradingStudents.map((student, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors group">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-4">
                          <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${student.admissionNumber}`} alt={student.name} className="w-10 h-10 rounded-full object-cover shadow-sm group-hover:scale-110 transition-transform duration-500 border border-slate-200 dark:border-slate-700" />
                          <span className="text-sm font-semibold text-slate-900 dark:text-white tracking-tight">{student.name}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-sm font-medium text-slate-500 dark:text-slate-400">{student.admissionNumber}</td>
                      <td className="py-4 px-6">
                        <input 
                          type="number" 
                          id={`score-${student.id}`}
                          defaultValue={student.performance} 
                          className="w-24 px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all text-center shadow-sm" 
                        />
                      </td>
                      <td className="py-4 px-6">
                        <select 
                          id={`level-${student.id}`}
                          defaultValue={student.performance >= 80 ? 'EE' : student.performance >= 60 ? 'ME' : student.performance >= 40 ? 'AE' : 'BE'}
                          className="w-full min-w-[140px] px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all cursor-pointer shadow-sm"
                        >
                          <option value="EE">EE (Exceeds)</option>
                          <option value="ME">ME (Meets)</option>
                          <option value="AE">AE (Approaches)</option>
                          <option value="BE">BE (Below)</option>
                        </select>
                      </td>
                      <td className="py-4 px-6">
                        <textarea 
                          id={`remarks-${student.id}`}
                          rows={1} 
                          placeholder="Add comprehensive remark..." 
                          className="w-full min-w-[240px] px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all resize-none shadow-sm placeholder:text-slate-400"
                        ></textarea>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <button 
                          onClick={() => {
                            const score = Number((document.getElementById(`score-${student.id}`) as HTMLInputElement).value);
                            const level = (document.getElementById(`level-${student.id}`) as HTMLSelectElement).value;
                            const remarks = (document.getElementById(`remarks-${student.id}`) as HTMLTextAreaElement).value;
                            handleSaveMarks(student.id, score, level, remarks);
                          }}
                          className="text-[11px] font-bold text-white transition-all px-4 py-2 bg-[#334155] dark:bg-white dark:text-[#334155] rounded-xl shadow-sm hover:shadow-md active:scale-95"
                        >
                          Save Marks
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TeacherModule;

