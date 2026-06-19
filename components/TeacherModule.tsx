import React, { useState, useEffect, useMemo } from 'react';
import { 
  BookOpen, 
  GraduationCap,
  Users, 
  Calendar as CalendarIcon, 
  CheckCircle2, 
  XCircle,
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
  Smartphone,
  Palette,
  Sparkles,
  TrendingUp,
  Target,
  Lock,
  ShieldCheck,
  Bell,
  Phone,
  Mail,
  Send
} from 'lucide-react';

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { CBC_GRADES, PERIODS } from '../constants';
import toast from 'react-hot-toast';
import { db, auth } from '../src/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, onSnapshot, getDocs, addDoc, updateDoc, doc, serverTimestamp, getDoc, limit, setDoc, Timestamp } from 'firebase/firestore';
import { Student, Assessment, TimetableSlot, CBCGrade } from '../types';
import { sendTransitNotification } from '../services/notificationService';
import ReportBuilderModal from './ReportBuilderModal';

interface TeacherModuleProps {
  setActiveTab?: (tab: string) => void;
  user: any;
  profile: any;
  isMockAuth?: boolean;
}

const toTitleCase = (str: string): string => {
  if (!str) return '';
  return str
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const TeacherModule: React.FC<TeacherModuleProps> = ({ setActiveTab, user, profile, isMockAuth = false }) => {
  const [activeTab, setActiveTabInternal] = useState<'overview' | 'classes' | 'subjects' | 'grading' | 'attendance' | 'finance'>('overview');
  const [timetableFilter, setTimetableFilter] = useState('Today');
  const [selectedTerm, setSelectedTerm] = useState('Term 1');
  const [students, setStudents] = useState<Student[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [timetable, setTimetable] = useState<TimetableSlot[]>([]);
  const [teacherData, setTeacherData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedStudentForMessage, setSelectedStudentForMessage] = useState<Student | null>(null);
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [customMessageText, setCustomMessageText] = useState('');
  const [customReminderAmount, setCustomReminderAmount] = useState('');
  const [attendanceLogs, setAttendanceLogs] = useState<any[]>([]);
  const [personalPhoto, setPersonalPhoto] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedStudentForReport, setSelectedStudentForReport] = useState<Student | null>(null);
  const [schoolProfile, setSchoolProfile] = useState<any>(null);

  // --- Attendance tab state ---
  const [attSubView, setAttSubView] = useState<'take-attendance' | 'weekly' | 'monthly' | 'term'>('take-attendance');
  const [selectedAttClass, setSelectedAttClass] = useState<string | null>(null);
  const [selectedAttSubject, setSelectedAttSubject] = useState<string | null>(null);
  const [selectedAttType, setSelectedAttType] = useState<'CLASS' | 'SUBJECT' | null>(null);
  const [allAttendanceLogs, setAllAttendanceLogs] = useState<any[]>([]);
  const [attIsLoading, setAttIsLoading] = useState(false);
  const [attSelectedMonth, setAttSelectedMonth] = useState(new Date().getMonth());
  const [attSelectedYear, setAttSelectedYear] = useState(new Date().getFullYear());
  const [attSelectedTermLocal, setAttSelectedTermLocal] = useState('Term 1');

  // --- Academic Calendar Weekly states ---
  const [weeklyYear, setWeeklyYear] = useState(2026);
  const [weeklyTerm, setWeeklyTerm] = useState('Term 1');
  const [weeklyMonth, setWeeklyMonth] = useState(0); // 0 = January
  const [weeklyWeekSegment, setWeeklyWeekSegment] = useState(1);

  // Sync weekly calendar term and month selections
  useEffect(() => {
    if (weeklyTerm === 'Term 1') setWeeklyMonth(0);
    else if (weeklyTerm === 'Term 2') setWeeklyMonth(4);
    else if (weeklyTerm === 'Term 3') setWeeklyMonth(8);
    setWeeklyWeekSegment(1);
  }, [weeklyTerm]);

  useEffect(() => {
    setWeeklyWeekSegment(1);
  }, [weeklyMonth]);

  // --- Fees privacy state ---
  const [classTotalFee, setClassTotalFee] = useState(0);
  const [feeLoaded, setFeeLoaded] = useState(false);

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
        if (isMockAuth) {
          console.log("[TeacherModule] Loading mock data for demo mode");
          const { TEACHER_MOCK_DATA, MOCK_STUDENTS, MOCK_TIMETABLE, MOCK_ATTENDANCE } = await import('../demoData');
          
          const targetTeacher = (profile && profile.role === 'TEACHER' && profile.isImpersonated)
            ? profile
            : TEACHER_MOCK_DATA;
          setTeacherData(targetTeacher);
          setStudents(MOCK_STUDENTS.map(s => ({
            ...s,
            name: toTitleCase(s.name || ''),
            grade: toTitleCase(s.grade || '') as any,
            stream: toTitleCase(s.stream || ''),
            boardingType: toTitleCase(s.boardingType || '') as any,
            status: toTitleCase(s.status || '') as any
          })));
          setTimetable(MOCK_TIMETABLE);
          setAttendanceLogs(MOCK_ATTENDANCE);
          setSchoolProfile({
            name: "BrightSoma Academy (Demo)",
            motto: "Excellence in CBC",
            logo: "/assets/logo.png"
          });
          setIsLoading(false);
          return;
        }

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
          setStudents(snapshot.docs.map(doc => {
            const s = doc.data() as Student;
            return {
              ...s,
              id: doc.id,
              name: toTitleCase(s.name || ''),
              grade: toTitleCase(s.grade || '') as any,
              stream: toTitleCase(s.stream || ''),
              boardingType: toTitleCase(s.boardingType || '') as any,
              status: toTitleCase(s.status || '') as any
            };
          }));
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

        const unsubSchool = onSnapshot(doc(db, 'schools', schoolId), snap => {
          if (snap.exists()) setSchoolProfile({ id: snap.id, ...snap.data() });
        });
        unsubs.push(unsubSchool);
      } catch (err) {
        console.error("[TeacherModule] Data fetch error:", err);
        setIsLoading(false);
      }
    };

    setupData();
    return () => {
      unsubs.forEach(unsub => unsub());
    };
  }, [user, profile, isMockAuth]);

  // Fetch last 60 days of attendance for weekly/monthly/term views
  useEffect(() => {
    if (!teacherData?.schoolId) return;
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
    const q = query(
      collection(db, 'attendance'),
      where('schoolId', '==', teacherData.schoolId),
      where('timestamp', '>=', Timestamp.fromDate(sixtyDaysAgo))
    );
    const unsub = onSnapshot(q, snap => {
      setAllAttendanceLogs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [teacherData?.schoolId]);

  // Fetch fee structures for class teacher's grade
  useEffect(() => {
    if (!teacherData?.schoolId || !teacherData?.classTeacherOf || isMockAuth) return;
    const fetchFees = async () => {
      try {
        const snap = await getDocs(query(
          collection(db, 'fee_structures'),
          where('schoolId', '==', teacherData.schoolId)
        ));
        const grade = teacherData.classTeacherOf;
        let total = 0;
        snap.docs.forEach(d => {
          const fd = d.data();
          if (fd.grade === grade || fd.grade === 'All') total += (fd.amount || 0);
        });
        setClassTotalFee(total);
        setFeeLoaded(true);
      } catch (e) { console.error('Fee fetch error:', e); }
    };
    fetchFees();
  }, [teacherData?.schoolId, teacherData?.classTeacherOf, isMockAuth]);

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
    if (!teacherData || !teacherData.teachingSubjects) return [];
    
    const classes: any[] = [];
    const subjectsMap = teacherData.teachingSubjects; // Record<string, string[]>
    
    Object.keys(subjectsMap).forEach(grade => {
      const subjects = subjectsMap[grade];
      const stream = teacherData.stream || '';
      
      subjects.forEach((subject: string) => {
        const classStudents = students.filter(s => s.grade === grade && s.stream === stream);
        
        // Calculate average score for this specific subject/grade/stream
        const subjectAssessments = assessments.filter(a => 
          a.learningArea === subject && 
          classStudents.some(s => s.id === a.studentId)
        );
        
        const avgScore = subjectAssessments.length > 0
          ? Math.round(subjectAssessments.reduce((acc, a) => acc + (a.score || 0), 0) / subjectAssessments.length)
          : (classStudents.length > 0 
              ? Math.round(classStudents.reduce((acc, s) => acc + (s.performance || 0), 0) / classStudents.length)
              : 0);

        classes.push({
          grade,
          stream,
          subject,
          studentCount: classStudents.length,
          avgScore
        });
      });
    });
    
    return classes;
  }, [teacherData, students, assessments]);

  const selectedSubject = useMemo(() => {
    if (!selectedClass) return '';
    const parts = selectedClass.split('|');
    return parts[2] || '';
  }, [selectedClass]);

  const gradingStudents = useMemo(() => {
    if (!selectedClass) return [];
    const [grade, stream] = selectedClass.split('|');
    return students.filter(s => s.grade === grade && s.stream === stream);
  }, [students, selectedClass]);

  const handleAssessmentChange = async (studentId: string, learningArea: string, level: any) => {
    const user = auth.currentUser;
    if (!user || !teacherData) return;
    const schoolId = teacherData.schoolId;

    const existing = assessments.find(a => a.studentId === studentId && a.learningArea === learningArea);
    const assessmentData = { 
      schoolId, 
      studentId, 
      learningArea, 
      level, 
      term: 'Term 1', 
      year: 2026, 
      strand: 'General', 
      remarks: existing?.remarks || '',
      updatedAt: serverTimestamp()
    };

    try {
      if (existing) {
        await updateDoc(doc(db, 'assessments', existing.id), assessmentData);
      } else if (level) {
        await addDoc(collection(db, 'assessments'), assessmentData);
      }
    } catch (error) {
      console.error('Error saving assessment:', error);
    }
  };

  const handleSaveMarks = async (studentId: string, score: number, level: string, remarks: string) => {
    if (!selectedSubject) { toast.error("Please select a subject first."); return; }
    
    await handleAssessmentChange(studentId, selectedSubject, level);
    
    // Also update score and remarks specifically for this subject
    const existing = assessments.find(a => a.studentId === studentId && a.learningArea === selectedSubject);
    if (existing) {
      await updateDoc(doc(db, 'assessments', existing.id), { score, remarks });
    }
    toast.success("Marks saved successfully!");
  };

  const handleMarkAttendance = async (
    studentId: string, 
    studentName: string, 
    status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED', 
    type: 'CLASS' | 'SUBJECT' = 'CLASS', 
    subject?: string
  ) => {
    try {
      const user = auth.currentUser;
      if (!user || !teacherData) return;

      const today = new Date().toISOString().split('T')[0];
      const dayOfWeek = new Date().toLocaleDateString('en-US', { weekday: 'long' });
      const month = new Date().getMonth() + 1;
      const termLabel = month <= 3 ? 'Term 1' : month <= 7 ? 'Term 2' : 'Term 3';
      const year = new Date().getFullYear();

      let targetGrade = teacherData.classTeacherOf || '';
      let targetStream = teacherData.stream || '';
      if (selectedAttClass) {
        const [g, s] = selectedAttClass.split('|');
        targetGrade = g;
        targetStream = s;
      }

      // For class roll, find existing log of same type+date; for subject, also match subject
      const existingLog = attendanceLogs.find(l =>
        l.studentId === studentId &&
        l.date === today &&
        l.type === type &&
        (type === 'SUBJECT' ? l.subject === subject : true)
      );

      const basePayload: any = {
        schoolId: teacherData.schoolId,
        studentId,
        date: today,
        dayOfWeek,
        status,
        type,
        grade: targetGrade,
        stream: targetStream,
        term: termLabel,
        year,
        recordedBy: user.uid,
        timestamp: serverTimestamp()
      };
      if (type === 'SUBJECT' && subject) basePayload.subject = subject;

      if (existingLog) {
        if (existingLog.status === status) { toast.error(`Already marked as ${status}`); return; }
        await updateDoc(doc(db, 'attendance', existingLog.id), { status, recordedBy: user.uid, timestamp: serverTimestamp() });
      } else {
        await addDoc(collection(db, 'attendance'), basePayload);
      }

      // Auto-sync: If marking PRESENT, LATE, or EXCUSED for a SUBJECT, also mark PRESENT for CLASS
      if (type === 'SUBJECT' && status !== 'ABSENT') {
        const classLog = attendanceLogs.find(l => l.studentId === studentId && l.date === today && l.type === 'CLASS');
        if (!classLog) {
          await addDoc(collection(db, 'attendance'), {
            ...basePayload,
            type: 'CLASS',
            status: 'PRESENT',
            subject: null
          });
        }
      }

      if (status === 'PRESENT') {
        await sendTransitNotification(teacherData.schoolId, studentId, studentName, 'marked_present');
      }
      toast.success(`${studentName} marked as ${status}`);
    } catch (error) {
      console.error('Error marking attendance:', error);
      toast.error('Failed to mark attendance');
    }
  };





  // --- Attendance utilities ---
  const WEEK_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const getWeekDays = () => {
    const now = new Date();
    const day = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
    return WEEK_DAYS.map((name, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return { name: name.slice(0, 3), date: d.toISOString().split('T')[0] };
    });
  };
  const getTermRange = (term: string, year: number) => {
    if (term === 'Term 1') return { start: `${year}-01-01`, end: `${year}-03-31` };
    if (term === 'Term 2') return { start: `${year}-05-01`, end: `${year}-07-31` };
    return { start: `${year}-09-01`, end: `${year}-11-30` };
  };
  const getMonthSchoolDays = (month: number, year: number) => {
    const days: string[] = [];
    const d = new Date(year, month, 1);
    while (d.getMonth() === month) {
      const dow = d.getDay();
      if (dow !== 0 && dow !== 6) days.push(d.toISOString().split('T')[0]);
      d.setDate(d.getDate() + 1);
    }
    return days;
  };
  const getFeeStatus = (student: Student) => {
    if (!feeLoaded || classTotalFee <= 0) return { label: 'N/A', color: 'bg-slate-100 text-slate-500 border-slate-200' };
    const paid = (student.totalFeesPaidTillNow || 0) + (student.feePaidOnEnrollment || 0);
    const pct = Math.round((paid / classTotalFee) * 100);
    if (pct >= 100) return { label: 'Paid âœ“', color: 'bg-green-100 text-green-700 border-green-200' };
    if (pct === 0) return { label: 'Unpaid', color: 'bg-rose-100 text-rose-600 border-rose-200' };
    return { label: `${Math.min(pct, 99)}%`, color: 'bg-amber-100 text-amber-700 border-amber-200' };
  };

  const StatCard = ({ title, value, icon, color, subtitle }: any) => (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 transition-all duration-300 relative overflow-hidden">
      <div className="relative z-10 flex items-center justify-between">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center shadow-sm`}>
              {React.cloneElement(icon, { size: 20 })}
            </div>
            <span className="text-sm font-semibold text-black dark:text-slate-400">{title}</span>
          </div>
          <div className="space-y-1">
            <p className="text-3xl font-bold text-black dark:text-white tracking-tight">{value}</p>
            {subtitle && <p className="text-xs font-medium text-black dark:text-slate-400">{subtitle}</p>}
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
      <div className="w-[100vw] relative left-1/2 -ml-[50vw] -mt-4 md:-mt-8 bg-white dark:bg-slate-900 py-5 border-b border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="w-full max-w-7xl mx-auto px-4 md:px-8">
          <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-slate-100 dark:bg-white/10 rounded-xl">
                <GraduationCap size={24} className="text-black dark:text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-black dark:text-white tracking-tight">Teachers Portal & Dashboard</h2>
                <p className="text-xs text-black dark:text-blue-100 mt-1">
                  {teacherData?.name ? `Welcome, ${teacherData.name}` : 'Welcome back'} · {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
                </p>
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-2">
              {[
                ...(isClassTeacher ? [{ label: 'My Learners', count: classStudents.length }] : []),
                { label: 'Periods Today', count: teacherSchedule.filter(s => s.status === 'In Progress' || s.status === 'Upcoming').length },
              ].map((btn, i) => (
                <div key={i} className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-black/20 dark:hover:bg-black/30 text-black dark:text-white border border-slate-200 dark:border-white/10 rounded-[2rem] text-xs font-bold transition-all">
                  {btn.label}
                  <span className="bg-slate-200 dark:bg-black/30 text-black dark:text-blue-100 px-2 py-0.5 rounded-full text-[10px]">{btn.count}</span>
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
          { id: 'subjects', label: 'My Subjects', icon: <BookOpen size={14} strokeWidth={2.5} /> },
          { id: 'grading', label: 'Grading Hub', icon: <Award size={14} strokeWidth={2.5} /> },
          { id: 'attendance', label: 'Attendance', icon: <CheckCircle2 size={14} strokeWidth={2.5} /> },
          ...(isClassTeacher ? [{ id: 'finance', label: 'Class Fees', icon: <Wallet size={14} strokeWidth={2.5} /> }] : []),
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTabInternal(tab.id as any)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 ${ activeTab === tab.id ? 'bg-orange-600 text-white shadow-md shadow-orange-500/25 scale-105' : 'text-black dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 hover:text-black dark:hover:text-slate-200' }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
        <div className="ml-auto flex gap-2 pr-1">
          <button
            onClick={() => setActiveTabInternal('grading' as any)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-xl text-xs font-bold hover:bg-emerald-600 transition-all shadow-sm active:scale-95 shadow-emerald-500/20"
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
                  action: () => setActiveTabInternal('finance'),
                  tag: 'View Ledger'
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
                  value: `${attendanceLogs.filter(l => ['PRESENT', 'LATE', 'EXCUSED'].includes(l.status)).length}/${classStudents.length}`,
                  subtitle: 'Present today',
                  icon: <CheckCircle2 size={22} />,
                  color: 'bg-orange-500',
                  lightColor: 'bg-orange-50 dark:bg-orange-900/20',
                  textColor: 'text-orange-600 dark:text-orange-400',
                  action: () => setActiveTabInternal('attendance'),
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
                className="group relative bg-white dark:bg-slate-800 rounded-[2rem] p-8 border border-slate-200 dark:border-slate-700 transition-all duration-300 cursor-pointer overflow-hidden"
              >
                <div className="relative z-10">
                  <div className="flex items-center gap-5 mb-8">
                    <div className={`w-16 h-16 rounded-[1.5rem] bg-slate-50 dark:bg-slate-800 ${card.textColor} flex items-center justify-center border border-slate-100 dark:border-slate-700 group-hover:scale-110 transition-transform duration-500`}>
                      {card.icon}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-0.5">{card.title}</p>
                      <p className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">{card.value}</p>
                    </div>
                  </div>
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700 mb-8">
                    <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">{card.subtitle}</p>
                  </div>
                  <button className={`w-full py-3.5 bg-emerald-500 text-white font-bold text-xs rounded-xl hover:shadow-lg hover:bg-emerald-600 transition-all active:scale-95 flex items-center justify-center gap-2 shadow-emerald-500/20`}>
                    {card.tag} <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Today's Schedule */}
          {teacherSchedule.length > 0 && (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
              <h3 className="text-sm font-bold text-black dark:text-white mb-4">Today's Schedule</h3>
              <div className="space-y-3">
                {teacherSchedule.slice(0, 5).map((slot, i) => (
                  <div key={i} className="flex items-center gap-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-orange-50 dark:hover:bg-orange-900/10 transition-colors">
                    <div className="text-center w-16 shrink-0">
                      <p className="text-xs font-bold text-orange-600">{slot.time}</p>
                      <p className="text-[10px] text-black dark:text-white">{slot.endTime}</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-black dark:text-white truncate">{slot.subject}</p>
                      <p className="text-xs text-black dark:text-white">{slot.grade} · {slot.stream}</p>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${ slot.status === 'In Progress' ? 'bg-green-100 text-green-700' : slot.status === 'Completed' ? 'bg-slate-100 text-black' : 'bg-orange-50 text-orange-600' }`}>
                      {slot.status === 'In Progress' ? '● In Progress' : slot.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Comparative Subject Progress */}
          <div className="bg-white dark:bg-slate-800 rounded-[2rem] p-8 border border-slate-200 dark:border-slate-700 relative overflow-hidden">
             <div className="relative z-10">
               <div className="flex justify-between items-center mb-8">
                 <div>
                   <h3 className="text-sm font-bold text-black dark:text-white tracking-widest leading-none mb-2">Performance Benchmarking</h3>
                   <p className="text-[11px] font-bold text-black dark:text-white">Comparing your subject averages across the school</p>
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
                          <span className="text-black dark:text-slate-200">{cls.subject} ({cls.grade})</span>
                          <span className={`${cls.avgScore >= avgOther ? 'text-green-600' : 'text-orange-600'}`}>
                            Your Avg: {cls.avgScore}% · Peer Avg: {avgOther}%
                          </span>
                        </div>
                        <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex gap-1">
                           <div className="h-full bg-orange-600 transition-all rounded-full" style={{ width: `${cls.avgScore}%` }}></div>
                           <div className="h-full bg-slate-300 dark:bg-slate-600 transition-all opacity-30 rounded-full" style={{ width: `${avgOther}%` }}></div>
                        </div>
                      </div>
                    );
                 })}
                 {teacherClasses.length === 0 && (
                   <p className="text-center py-6 text-sm font-medium text-black dark:text-white">No subject data available for benchmarking.</p>
                 )}
               </div>
             </div>
          </div>
        </div>
      )}

      {activeTab === 'classes' && (
        <div className="space-y-8 animate-in slide-in-from-bottom-6 duration-500">
          {/* AI SUMMARY CARD (Inspired by Fees Heatmap) */}
          {isClassTeacher && (
            <div className="relative group overflow-hidden bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-200 dark:border-slate-700 p-8">
              <div className="relative z-10">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-10">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-orange-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-orange-500/20 group-hover:scale-110 transition-transform duration-500">
                      <Sparkles size={28} />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-black dark:text-white tracking-tight">AI Class Teacher Insight</h3>
                      <p className="text-xs font-bold text-orange-600 mt-0.5">Summary for {teacherData.classTeacherOf} {teacherData.stream}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                    <span className="text-[10px] font-black text-black dark:text-slate-300">LIVE SYNC ACTIVE</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {/* Attendance Intelligence */}
                  <div className="p-6 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/60 dark:border-slate-700 transition-all duration-300">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
                        <Users size={16} />
                      </div>
                      <span className="text-[10px] font-black text-slate-400 dark:text-slate-300 tracking-widest">Attendance</span>
                    </div>
                    <p className="text-2xl font-black text-black dark:text-white mb-1">
                      {Math.round((attendanceLogs.filter(l => ['PRESENT', 'LATE', 'EXCUSED'].includes(l.status)).length / Math.max(classStudents.length, 1)) * 100)}%
                    </p>
                    <div className="flex items-center gap-1.5">
                      <TrendingUp size={12} className="text-emerald-500" />
                      <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">{attendanceLogs.filter(l => ['PRESENT', 'LATE', 'EXCUSED'].includes(l.status)).length} learners present today</span>
                    </div>
                  </div>

                  {/* Syllabus Progress (Mocked based on periods) */}
                  <div className="p-6 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/60 dark:border-slate-700 transition-all duration-300">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-lg">
                        <BookOpen size={16} />
                      </div>
                      <span className="text-[10px] font-black text-slate-400 dark:text-slate-300 tracking-widest">Subject Progress</span>
                    </div>
                    <p className="text-2xl font-black text-black dark:text-white mb-1">
                      {teacherClasses.length > 0 ? "On Track" : "N/A"}
                    </p>
                    <div className="flex items-center gap-1.5">
                      <Clock size={12} className="text-orange-500" />
                      <span className="text-[10px] font-bold text-orange-600 dark:text-orange-400">{teacherClasses.length} subjects being taught</span>
                    </div>
                  </div>

                  {/* CBC Assessment Summary */}
                  <div className="p-6 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/60 dark:border-slate-700 transition-all duration-300">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg">
                        <Award size={16} />
                      </div>
                      <span className="text-[10px] font-black text-slate-400 dark:text-slate-300 tracking-widest">Performance</span>
                    </div>
                    <p className="text-2xl font-black text-black dark:text-white mb-1">
                      {classStudents.length > 0 
                        ? Math.round(classStudents.reduce((acc, s) => acc + (s.performance || 0), 0) / classStudents.length) 
                        : 0}%
                    </p>
                    <div className="flex items-center gap-1.5">
                      <BadgeCheck size={12} className="text-blue-500" />
                      <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400">Class Average Score</span>
                    </div>
                  </div>

                  {/* Status / Assigned Role */}
                  <div className="p-6 bg-orange-600 rounded-3xl border border-orange-500 shadow-sm transition-all duration-300">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-white/20 text-white rounded-lg">
                        <Target size={16} />
                      </div>
                      <span className="text-[10px] font-black text-orange-100 tracking-widest">Primary Role</span>
                    </div>
                    <p className="text-xl font-black text-white mb-1 leading-tight">
                      Class Teacher
                    </p>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold text-orange-100">{teacherData.classTeacherOf} {teacherData.stream} Registry</span>
                    </div>
                  </div>
                </div>

                <div className="mt-8 p-5 bg-orange-50 dark:bg-orange-900/20 rounded-2xl border border-orange-100/50 dark:border-orange-800/30 flex items-start gap-4">
                  <div className="p-2 bg-white dark:bg-slate-900 rounded-xl text-orange-600 shrink-0">
                    <FileText size={18} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-black dark:text-slate-300 leading-relaxed">
                      AI Analysis: Your class has <span className="text-orange-600 dark:text-orange-400">{Math.round((attendanceLogs.filter(l => ['PRESENT', 'LATE', 'EXCUSED'].includes(l.status)).length / Math.max(classStudents.length, 1)) * 100)}% attendance</span> today. 
                      Performance is stable at <span className="text-emerald-600 dark:text-emerald-400 font-black">{classStudents.length > 0 ? Math.round(classStudents.reduce((acc, s) => acc + (s.performance || 0), 0) / classStudents.length) : 0}% avg</span>. 
                      You have {teacherSchedule.filter(s => s.status === 'Upcoming').length} more periods to cover today.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Class Roster / Student List */}
          <div className="bg-white dark:bg-slate-800 rounded-[2rem] border border-slate-200 dark:border-slate-700 p-8">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h4 className="text-xl font-bold text-black dark:text-white tracking-tight">Class Roster</h4>
                <p className="text-xs text-black dark:text-slate-400 mt-1 font-medium">Students in {teacherData.classTeacherOf} {teacherData.stream}</p>
              </div>
              <div className="px-4 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs font-bold text-black dark:text-slate-300 border border-slate-100 dark:border-slate-700">
                {classStudents.length} Students
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {classStudents.map((student) => (
                <div key={student.id} className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-700 flex items-center gap-4 hover:border-orange-500/30 transition-all group">
                  <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${student.admissionNumber}`} className="w-10 h-10 rounded-full bg-white dark:bg-slate-900" />
                  <div>
                    <p className="text-sm font-bold text-black dark:text-white leading-none">{student.name}</p>
                    <p className="text-[10px] text-slate-500 mt-1">{student.admissionNumber}</p>
                  </div>
                </div>
              ))}
              {classStudents.length === 0 && (
                <p className="col-span-full text-center py-10 text-sm font-medium text-slate-400">No students found in this class registry.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'subjects' && (
        <div className="space-y-8 animate-in slide-in-from-bottom-6 duration-500">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-bold text-black dark:text-white tracking-tight">Assigned Subjects</h3>
              <p className="text-sm text-slate-500 mt-1">Subjects you are currently teaching this term.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {teacherClasses.map((cls, idx) => (
              <div key={idx} className="group relative bg-white dark:bg-slate-800 rounded-[2rem] p-8 border border-slate-200 dark:border-slate-700 transition-all duration-300 overflow-hidden cursor-pointer">
                <div className="relative z-10">
                    <div className="flex items-center gap-5 mb-8">
                      <div className="w-16 h-16 rounded-[1.5rem] bg-white dark:bg-slate-800 flex items-center justify-center text-orange-600 dark:text-orange-400 border border-slate-100 dark:border-slate-700 group-hover:scale-110 transition-transform duration-500">
                        <BookOpen size={32} />
                      </div>
                      <div>
                        <h4 className="text-xl font-bold text-black dark:text-white tracking-tight leading-none mb-2">{cls.subject}</h4>
                        <p className="text-[10px] font-bold text-black dark:text-white">{cls.grade} · {cls.stream}</p>
                      </div>
                    </div>

                  <div className="grid grid-cols-2 gap-4 p-4 bg-white/50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700 mb-8">
                    <div>
                      <p className="text-[10px] font-bold text-black dark:text-slate-400 mb-1">Learners</p>
                      <p className="text-xl font-bold text-black dark:text-white">{cls.studentCount}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-black dark:text-slate-400 mb-1">Avg Score</p>
                      <p className="text-xl font-bold text-orange-600 dark:text-orange-400">{cls.avgScore}%</p>
                    </div>
                  </div>

                  <button 
                    onClick={() => setActiveTabInternal('grading')}
                    className="w-full py-3.5 bg-orange-600 dark:bg-white text-white dark:text-slate-800 font-bold text-xs rounded-xl hover:shadow-lg hover:bg-orange-700 dark:hover:bg-slate-100 transition-all active:scale-95 flex items-center justify-center gap-2"
                  >
                    Enter Marks <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            ))}
            {teacherClasses.length === 0 && (
              <div className="col-span-full text-center py-20 bg-slate-50 dark:bg-slate-800/50 rounded-[2rem] border border-dashed border-slate-200 dark:border-slate-700">
                <BookOpen size={40} className="mx-auto text-slate-300 mb-4" />
                <p className="text-sm font-medium text-slate-500">No subjects assigned in your current timetable.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'attendance' && (() => {
        // Find all unique classes a teacher teaches
        const uniqueClasses = [
          ...(isClassTeacher && teacherData?.classTeacherOf ? [{ grade: teacherData.classTeacherOf, stream: teacherData.stream || '' }] : [])
        ];
        
        teacherClasses.forEach(c => {
          const alreadyAdded = uniqueClasses.some(x => x.grade === c.grade && x.stream === c.stream);
          if (!alreadyAdded) {
            uniqueClasses.push({ grade: c.grade, stream: c.stream });
          }
        });

        // Weekly academic calendar logic
        const TERM_MONTHS: Record<string, { name: string; index: number }[]> = {
          'Term 1': [
            { name: 'January', index: 0 },
            { name: 'February', index: 1 },
            { name: 'March', index: 2 }
          ],
          'Term 2': [
            { name: 'May', index: 4 },
            { name: 'June', index: 5 },
            { name: 'July', index: 6 }
          ],
          'Term 3': [
            { name: 'September', index: 8 },
            { name: 'October', index: 9 },
            { name: 'November', index: 10 }
          ]
        };

        const getMonthWeeks = (year: number, month: number) => {
          const weeksList: string[][] = [];
          let currentWeek: string[] = [];
          
          const numDays = new Date(year, month + 1, 0).getDate();
          for (let dNum = 1; dNum <= numDays; dNum++) {
            const dateObj = new Date(year, month, dNum);
            const dow = dateObj.getDay();
            if (dow !== 0 && dow !== 6) { // Weekdays only
              const dateString = dateObj.toISOString().split('T')[0];
              if (dow === 1 && currentWeek.length > 0) {
                weeksList.push(currentWeek);
                currentWeek = [];
              }
              currentWeek.push(dateString);
            }
          }
          if (currentWeek.length > 0) {
            weeksList.push(currentWeek);
          }
          return weeksList;
        };

        const weeks = getMonthWeeks(weeklyYear, weeklyMonth);
        const activeWeekDays = (() => {
          if (weeks.length === 0) return [];
          const clampedSegment = Math.min(Math.max(weeklyWeekSegment, 1), weeks.length);
          const dayStrings = weeks[clampedSegment - 1] || [];
          return dayStrings.map(dateStr => {
            const dObj = new Date(dateStr);
            const name = dObj.toLocaleDateString('en-US', { weekday: 'long' }).slice(0, 3);
            return { name, date: dateStr };
          });
        })();

        return (
          <div className="space-y-6 animate-in slide-in-from-bottom-6 duration-500">
            {/* Sub-view Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-2xl font-bold text-black dark:text-white tracking-tight">Attendance Register</h3>
                <p className="text-xs text-slate-500 dark:text-slate-300 mt-1">
                  Manage class and subject rolls, track weekly schedules, and monitor term heatmaps.
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5 p-1.5 bg-slate-100 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700">
                {[
                  { id: 'take-attendance', label: 'Take Attendance' },
                  { id: 'weekly', label: 'This Week' },
                  { id: 'monthly', label: 'Monthly' },
                  { id: 'term', label: 'Term' },
                ].map(sv => (
                  <button 
                    key={sv.id} 
                    onClick={() => {
                      setAttSubView(sv.id as any);
                      // Clear navigation states when switching subviews
                      if (sv.id !== 'take-attendance') {
                        setSelectedAttClass(null);
                        setSelectedAttSubject(null);
                        setSelectedAttType(null);
                      }
                    }}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${attSubView === sv.id ? 'bg-orange-600 text-white shadow shadow-orange-500/25 scale-105' : 'text-black dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800'}`}
                  >
                    {sv.label}
                  </button>
                ))}
              </div>
            </div>

            {/* -- TAKE ATTENDANCE FLOW -- */}
            {attSubView === 'take-attendance' && (
              <div className="space-y-6">
                {/* Breadcrumb Navigation Bar */}
                <div className="flex items-center gap-2 mb-2 text-xs font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-5 py-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                  <button 
                    onClick={() => {
                      setSelectedAttClass(null);
                      setSelectedAttSubject(null);
                      setSelectedAttType(null);
                    }}
                    className={`hover:text-orange-600 transition-colors ${!selectedAttClass ? 'text-orange-600 font-extrabold' : ''}`}
                  >
                    Daily Roll
                  </button>
                  {selectedAttClass && (
                    <>
                      <ChevronRight size={14} className="text-slate-300" />
                      <button 
                        onClick={() => {
                          setSelectedAttSubject(null);
                          setSelectedAttType(null);
                        }}
                        className={`hover:text-orange-600 transition-colors ${selectedAttClass && !selectedAttSubject && !selectedAttType ? 'text-orange-600 font-extrabold' : ''}`}
                      >
                        {selectedAttClass.replace('|', ' ')}
                      </button>
                    </>
                  )}
                  {(selectedAttSubject || selectedAttType === 'CLASS') && (
                    <>
                      <ChevronRight size={14} className="text-slate-300" />
                      <span className="text-orange-600 font-extrabold">
                        {selectedAttType === 'CLASS' ? 'Class Roll' : selectedAttSubject}
                      </span>
                    </>
                  )}
                </div>

                {/* Level 1: Class Selection */}
                {!selectedAttClass && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {uniqueClasses.map((cls, idx) => {
                      const isTeacherOwnClass = isClassTeacher && cls.grade === teacherData?.classTeacherOf && cls.stream === teacherData?.stream;
                      const subjectsInClass = teacherClasses.filter(c => c.grade === cls.grade && c.stream === cls.stream).map(c => c.subject);
                      
                      return (
                        <div 
                          key={idx}
                          onClick={() => {
                            setSelectedAttClass(`${cls.grade}|${cls.stream}`);
                            setSelectedAttSubject(null);
                            setSelectedAttType(null);
                          }}
                          className="group relative bg-white dark:bg-slate-800 rounded-[2rem] p-8 border border-slate-200 dark:border-slate-700 transition-all duration-300 cursor-pointer overflow-hidden"
                        >
                          <div className="relative z-10">
                            <div className="flex items-center gap-4 mb-6">
                              <div className="w-12 h-12 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-600 dark:text-orange-400 font-bold shadow-sm">
                                <Users size={24} />
                              </div>
                              <div>
                                <h4 className="text-lg font-bold text-black dark:text-white tracking-tight leading-none">{cls.grade} {cls.stream}</h4>
                                {isTeacherOwnClass && (
                                  <span className="inline-block mt-1.5 px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 rounded-full text-[9px] font-black">
                                    MY CLASS
                                  </span>
                                )}
                              </div>
                            </div>
                            
                            <div className="space-y-3 mb-6">
                              <p className="text-[10px] font-bold text-slate-400 tracking-widest">Available Registers</p>
                              {isTeacherOwnClass && (
                                <div className="mb-2">
                                  <span className="inline-block px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-800/60 rounded-xl text-[10px] font-extrabold text-emerald-700 dark:text-emerald-400 shadow-sm animate-pulse">
                                    Daily Class Roll
                                  </span>
                                </div>
                              )}
                              <div className="flex flex-wrap gap-1.5 pt-2.5 border-t border-slate-100 dark:border-slate-800/50">
                                {subjectsInClass.map((sub, sIdx) => (
                                  <span key={sIdx} className="px-2.5 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-lg text-[10px] font-bold text-slate-600 dark:text-slate-300">
                                    {sub}
                                  </span>
                                ))}
                              </div>
                            </div>

                            <button className="w-full py-3 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-xl shadow-md shadow-orange-500/10 flex items-center justify-center gap-1.5 transition-all">
                              Manage Attendance <ChevronRight size={14} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                    {uniqueClasses.length === 0 && (
                      <div className="col-span-full text-center py-16 bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-700 rounded-[2rem]">
                        <Users size={32} className="mx-auto text-slate-300 mb-4" />
                        <p className="text-sm font-medium text-slate-500">No classes assigned for attendance.</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Level 2: Subject/Roll Type Selection */}
                {selectedAttClass && !selectedAttSubject && !selectedAttType && (() => {
                  const [targetGrade, targetStream] = selectedAttClass.split('|');
                  const isTeacherOwnClass = isClassTeacher && targetGrade === teacherData?.classTeacherOf && targetStream === teacherData?.stream;
                  const classSubjects = teacherClasses.filter(c => c.grade === targetGrade && c.stream === targetStream);
                  
                  return (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <h4 className="text-lg font-bold text-black dark:text-white">Select Register for {targetGrade} {targetStream}</h4>
                        <button 
                          onClick={() => {
                            setSelectedAttClass(null);
                            setSelectedAttSubject(null);
                            setSelectedAttType(null);
                          }}
                          className="text-xs font-bold text-orange-600 hover:underline flex items-center gap-1"
                        >
                          <ChevronLeft size={14} /> Back to Classes
                        </button>
                                           {isTeacherOwnClass ? (
                        <div className="mb-10">
                          <p className="text-xs font-black text-slate-400 tracking-widest mb-3">Primary Register</p>
                          <div 
                            onClick={() => {
                              setSelectedAttType('CLASS');
                              setSelectedAttSubject(null);
                            }}
                            className="group relative bg-white dark:bg-slate-800 rounded-[2rem] p-8 border border-emerald-200/60 dark:border-slate-800 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer overflow-hidden max-w-xl"
                          >
                            <div className="relative z-10">
                              <div className="flex items-center gap-4 mb-6">
                                <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold shadow-sm">
                                  <ShieldCheck size={24} />
                                </div>
                                <div>
                                  <h4 className="text-lg font-bold text-black dark:text-white tracking-tight leading-none">Daily Class Roll</h4>
                                  <p className="text-[10px] text-slate-400 font-bold mt-1">Class Teacher Registry</p>
                                </div>
                              </div>
                              <p className="text-xs text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">
                                Take the overall daily attendance roll call for all students registered in {targetGrade} {targetStream}.
                              </p>
                              <button className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-500/10 flex items-center justify-center gap-1.5 transition-all">
                                Mark Class Roll <ChevronRight size={14} />
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : null}
                      
                      <div>
                        <p className="text-xs font-black text-slate-400 tracking-widest mb-3">Subject Lesson Registers</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          {classSubjects.map((sub, idx) => (
                            <div 
                              key={idx}
                              onClick={() => {
                                setSelectedAttType('SUBJECT');
                                setSelectedAttSubject(sub.subject);
                              }}
                              className="group relative bg-white dark:bg-slate-800 rounded-[2rem] p-8 border border-indigo-200/60 dark:border-indigo-800 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer overflow-hidden"
                            >
                              <div className="relative z-10">
                                <div className="flex items-center gap-4 mb-6">
                                  <div className="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-950/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold shadow-sm">
                                    <BookOpen size={24} />
                                  </div>
                                  <div>
                                    <h4 className="text-lg font-bold text-black dark:text-white tracking-tight leading-none">{sub.subject}</h4>
                                    <p className="text-[10px] text-slate-400 font-bold mt-1">Subject Lesson Roll</p>
                                  </div>
                                </div>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">
                                  Take the specific attendance register for lessons taught in {sub.subject} today.
                                </p>
                                <button className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-500/10 flex items-center justify-center gap-1.5 transition-all">
                                  Mark Subject Roll <ChevronRight size={14} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>     </div>
                    </div>
                  );
                })()}

                {/* Level 3: Roster Roll Call Grid */}
                {selectedAttClass && (selectedAttSubject || selectedAttType === 'CLASS') && (() => {
                  const [targetGrade, targetStream] = selectedAttClass.split('|');
                  const targetStudents = students.filter(s => s.grade === targetGrade && s.stream === targetStream);
                  const todayDate = new Date().toISOString().split('T')[0];
                  
                  // Calculate summary stats
                  const classLogsToday = attendanceLogs.filter(l => 
                    l.date === todayDate && 
                    l.type === selectedAttType && 
                    (selectedAttType === 'SUBJECT' ? l.subject === selectedAttSubject : true)
                  );
                  const pCount = classLogsToday.filter(l => l.status === 'PRESENT').length;
                  const aCount = classLogsToday.filter(l => l.status === 'ABSENT').length;
                  const lCount = classLogsToday.filter(l => l.status === 'LATE').length;
                  const eCount = classLogsToday.filter(l => l.status === 'EXCUSED').length;

                  return (
                    <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                      <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                          <h4 className="font-bold text-black dark:text-white text-base">
                            {selectedAttType === 'CLASS' 
                              ? `Daily Class Roll — ${targetGrade} ${targetStream}` 
                              : `${selectedAttSubject} Lesson Roll — ${targetGrade} ${targetStream}`}
                          </h4>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
                          <span className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30 rounded-xl">{pCount} Present</span>
                          <span className="px-3 py-1.5 bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 border border-rose-100 dark:border-rose-900/30 rounded-xl">{aCount} Absent</span>
                          <span className="px-3 py-1.5 bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border border-amber-100 dark:border-amber-900/30 rounded-xl">{lCount} Late</span>
                          <span className="px-3 py-1.5 bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400 border border-blue-100 dark:border-blue-900/30 rounded-xl">{eCount} Excused</span>
                        </div>
                      </div>
                      
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="bg-slate-50 dark:bg-slate-800/50 text-[10px] font-black uppercase tracking-wider text-slate-400 text-left">
                              <th className="py-4 px-6">Student</th>
                              <th className="py-4 px-6">Adm No</th>
                              <th className="py-4 px-6 text-center">Status</th>
                              <th className="py-4 px-6 text-right">Mark Attendance</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                            {targetStudents.map(student => {
                              const log = attendanceLogs.find(l => 
                                l.studentId === student.id && 
                                l.date === todayDate && 
                                l.type === selectedAttType && 
                                (selectedAttType === 'SUBJECT' ? l.subject === selectedAttSubject : true)
                              );
                              const status = log?.status;
                              
                              let statusBadgeColor = 'bg-slate-100 text-slate-400';
                              if (status === 'PRESENT') statusBadgeColor = 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800';
                              else if (status === 'ABSENT') statusBadgeColor = 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-800';
                              else if (status === 'LATE') statusBadgeColor = 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-800';
                              else if (status === 'EXCUSED') statusBadgeColor = 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border border-blue-200 dark:border-blue-800';

                              return (
                                <tr key={student.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                  <td className="py-4 px-6 flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-600 font-bold text-xs shrink-0">{student.name.charAt(0)}</div>
                                    <span className="text-sm font-bold text-black dark:text-white">{student.name}</span>
                                  </td>
                                  <td className="py-4 px-6 text-xs font-mono text-slate-500">{student.admissionNumber}</td>
                                  <td className="py-4 px-6 text-center">
                                    {status ? (
                                      <span className={`px-3 py-1 rounded-full text-[10px] font-bold ${statusBadgeColor}`}>
                                        {status}
                                      </span>
                                    ) : (
                                      <span className="text-[10px] text-slate-400 font-bold">—</span>
                                    )}
                                  </td>
                                  <td className="py-4 px-6">
                                    <div className="flex items-center justify-end gap-1.5">
                                      <button 
                                        onClick={() => handleMarkAttendance(student.id, student.name, 'PRESENT', selectedAttType as any, selectedAttSubject || undefined)}
                                        className={`w-9 h-9 rounded-xl flex items-center justify-center border transition-all ${status === 'PRESENT' ? 'bg-emerald-600 border-emerald-600 text-white shadow shadow-emerald-500/20' : 'border-slate-200 dark:border-slate-700 text-slate-400 hover:border-emerald-500 hover:text-emerald-500 bg-white dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/20'}`}
                                        title="Mark Present"
                                      >
                                        <CheckCircle2 size={16} />
                                      </button>
                                      <button 
                                        onClick={() => handleMarkAttendance(student.id, student.name, 'ABSENT', selectedAttType as any, selectedAttSubject || undefined)}
                                        className={`w-9 h-9 rounded-xl flex items-center justify-center border transition-all ${status === 'ABSENT' ? 'bg-rose-600 border-rose-600 text-white shadow shadow-rose-500/20' : 'border-slate-200 dark:border-slate-700 text-slate-400 hover:border-rose-500 hover:text-rose-500 bg-white dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/20'}`}
                                        title="Mark Absent"
                                      >
                                        <XCircle size={16} />
                                      </button>
                                      <button 
                                        onClick={() => handleMarkAttendance(student.id, student.name, 'LATE', selectedAttType as any, selectedAttSubject || undefined)}
                                        className={`w-9 h-9 rounded-xl flex items-center justify-center border transition-all ${status === 'LATE' ? 'bg-amber-500 border-amber-500 text-white shadow shadow-amber-500/20' : 'border-slate-200 dark:border-slate-700 text-slate-400 hover:border-amber-500 hover:text-amber-500 bg-white dark:bg-slate-800 hover:bg-amber-50 dark:hover:bg-amber-950/20'}`}
                                        title="Mark Late"
                                      >
                                        <Clock size={16} />
                                      </button>
                                      <button 
                                        onClick={() => handleMarkAttendance(student.id, student.name, 'EXCUSED', selectedAttType as any, selectedAttSubject || undefined)}
                                        className={`w-9 h-9 rounded-xl flex items-center justify-center border transition-all ${status === 'EXCUSED' ? 'bg-blue-500 border-blue-500 text-white shadow shadow-blue-500/20' : 'border-slate-200 dark:border-slate-700 text-slate-400 hover:border-blue-500 hover:text-blue-500 bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/20'}`}
                                        title="Mark Excused"
                                      >
                                        <ShieldCheck size={16} />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                            {targetStudents.length === 0 && (
                              <tr>
                                <td colSpan={4} className="py-16 text-center text-sm text-slate-400">
                                  No students found in class registry.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                      
                      <div className="px-8 py-4 bg-slate-50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase">Total</p>
                          <p className="text-xl font-bold text-black dark:text-white">{targetStudents.length}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-emerald-600 uppercase">Present</p>
                          <p className="text-xl font-bold text-emerald-700 dark:text-emerald-400">{pCount}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-rose-600 uppercase">Absent</p>
                          <p className="text-xl font-bold text-rose-700 dark:text-rose-400">{aCount}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-amber-600 uppercase">Late</p>
                          <p className="text-xl font-bold text-amber-700 dark:text-amber-400">{lCount}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-blue-600 uppercase">Excused</p>
                          <p className="text-xl font-bold text-blue-700 dark:text-blue-400">{eCount}</p>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* -- WEEKLY ACADEMIC CALENDAR SUMMARY -- */}
            {attSubView === 'weekly' && (() => {
              const studentsList = isClassTeacher ? classStudents : students.filter(s => s.grade === teacherData?.classTeacherOf);
              return (
                <div className="space-y-6">
                  {/* Calendar Hierarchy Selectors */}
                  <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 p-6 shadow-sm flex flex-wrap gap-4 items-center justify-between">
                    <div className="flex flex-wrap gap-3 items-center">
                      {/* Year Selector */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-black text-slate-400 tracking-widest">Academic Year</label>
                        <select 
                          value={weeklyYear} 
                          onChange={e => setWeeklyYear(Number(e.target.value))}
                          className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-black dark:text-white outline-none cursor-pointer"
                        >
                          {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                      </div>

                      {/* Term Selector */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-black text-slate-400 tracking-widest">Term</label>
                        <select 
                          value={weeklyTerm} 
                          onChange={e => setWeeklyTerm(e.target.value)}
                          className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-black dark:text-white outline-none cursor-pointer"
                        >
                          <option>Term 1</option>
                          <option>Term 2</option>
                          <option>Term 3</option>
                        </select>
                      </div>

                      {/* Month Selector */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-black text-slate-400 tracking-widest">Month</label>
                        <select 
                          value={weeklyMonth} 
                          onChange={e => setWeeklyMonth(Number(e.target.value))}
                          className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-black dark:text-white outline-none cursor-pointer"
                        >
                          {(TERM_MONTHS[weeklyTerm] || []).map(m => (
                            <option key={m.index} value={m.index}>{m.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Week Segment selector - Matches Fees segmented design */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-black text-slate-400 tracking-widest mb-1.5">Select Week</label>
                      <div className="flex bg-slate-100 dark:bg-slate-800/80 p-1.5 rounded-2xl gap-1 border border-slate-200 dark:border-slate-700">
                        {weeks.map((_, idx) => {
                          const weekNum = idx + 1;
                          const isActive = weeklyWeekSegment === weekNum;
                          return (
                            <button
                              key={idx}
                              onClick={() => setWeeklyWeekSegment(weekNum)}
                              className={`px-4 py-2 text-xs font-black rounded-xl transition-all ${
                                isActive 
                                  ? 'bg-orange-600 text-white shadow shadow-orange-500/25 scale-105' 
                                  : 'text-black dark:text-slate-400 hover:bg-white dark:hover:bg-slate-700'
                              }`}
                            >
                              Week {weekNum}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Weekly Table View */}
                  <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                    <div className="px-8 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between flex-wrap gap-4">
                      <h4 className="font-bold text-black dark:text-white text-base">Weekly Roster View</h4>
                      {activeWeekDays.length > 0 ? (
                        <span className="text-xs font-bold text-slate-500">
                          {activeWeekDays[0].date} — {activeWeekDays[activeWeekDays.length - 1].date}
                        </span>
                      ) : (
                        <span className="text-xs font-bold text-rose-500">No weekdays in selected segment</span>
                      )}
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[600px]">
                        <thead>
                          <tr className="bg-slate-50 dark:bg-slate-800/50 text-[10px] font-black uppercase text-slate-400">
                            <th className="text-left py-4 px-6">Student</th>
                            {activeWeekDays.map(d => (
                              <th key={d.date} className="py-4 px-4 text-center">
                                {d.name}<br />
                                <span className="font-medium text-[9px] text-slate-400">{d.date.slice(8)}</span>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                          {studentsList.map(student => (
                            <tr key={student.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                              <td className="py-3.5 px-6 text-sm font-bold text-black dark:text-white">{student.name}</td>
                              {activeWeekDays.map(d => {
                                const log = allAttendanceLogs.find(l => 
                                  l.studentId === student.id && 
                                  l.date === d.date && 
                                  (!l.type || l.type === 'CLASS')
                                );
                                
                                let circleBg = 'bg-slate-200 dark:bg-slate-700';
                                let titleStr = 'Not marked';
                                if (log?.status === 'PRESENT') { circleBg = 'bg-emerald-500'; titleStr = 'Present'; }
                                else if (log?.status === 'ABSENT') { circleBg = 'bg-rose-500'; titleStr = 'Absent'; }
                                else if (log?.status === 'LATE') { circleBg = 'bg-amber-500'; titleStr = 'Late'; }
                                else if (log?.status === 'EXCUSED') { circleBg = 'bg-blue-500'; titleStr = 'Excused'; }

                                return (
                                  <td key={d.date} className="py-3.5 px-4 text-center">
                                    <span 
                                      className={`inline-block w-5 h-5 rounded-full ${circleBg} transition-transform hover:scale-125`} 
                                      title={titleStr} 
                                    />
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                          {studentsList.length === 0 && (
                            <tr>
                              <td colSpan={6} className="py-12 text-center text-sm text-slate-400">
                                No students found.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                    <div className="px-8 py-4 bg-slate-50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800 flex flex-wrap gap-6 text-[10px] font-bold">
                      <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" /> Present</span>
                      <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-rose-500 inline-block" /> Absent</span>
                      <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-amber-500 inline-block" /> Late</span>
                      <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-blue-500 inline-block" /> Excused</span>
                      <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-slate-300 inline-block" /> Not marked</span>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* -- MONTHLY REPORT WITH STATUS HEATMAPS -- */}
            {attSubView === 'monthly' && (() => {
              const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
              const schoolDays = getMonthSchoolDays(attSelectedMonth, attSelectedYear);
              const studentsList = isClassTeacher ? classStudents : [];
              return (
                <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                  <div className="px-8 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between flex-wrap gap-3">
                    <h4 className="font-bold text-black dark:text-white">Monthly Attendance Heatmap</h4>
                    <div className="flex items-center gap-2">
                      <select 
                        value={attSelectedMonth} 
                        onChange={e => setAttSelectedMonth(Number(e.target.value))} 
                        className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-black dark:text-white outline-none cursor-pointer"
                      >
                        {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
                      </select>
                      <select 
                        value={attSelectedYear} 
                        onChange={e => setAttSelectedYear(Number(e.target.value))} 
                        className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-black dark:text-white outline-none cursor-pointer"
                      >
                        {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="space-y-6">
                      {studentsList.map(student => {
                        const presentCount = schoolDays.filter(d => {
                          const log = allAttendanceLogs.find(l => 
                            l.studentId === student.id && 
                            l.date === d && 
                            (!l.type || l.type === 'CLASS')
                          );
                          return log && ['PRESENT', 'LATE', 'EXCUSED'].includes(log.status);
                        }).length;
                        const pct = schoolDays.length > 0 ? Math.round((presentCount / schoolDays.length) * 100) : 0;
                        return (
                          <div key={student.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-50/50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700 transition-colors">
                            <div className="flex-shrink-0 w-48">
                              <h5 className="text-sm font-bold text-black dark:text-white truncate">{student.name}</h5>
                              <p className="text-[10px] font-bold text-slate-400 tracking-widest">{pct}% Attendance</p>
                            </div>
                            
                            <div className="flex-1 flex gap-1.5 flex-wrap">
                              {schoolDays.map(d => {
                                const log = allAttendanceLogs.find(l => 
                                  l.studentId === student.id && 
                                  l.date === d && 
                                  (!l.type || l.type === 'CLASS')
                                );
                                
                                return (
                                  <div 
                                    key={d}
                                    title={`${d}: ${log?.status || 'No data'}`}
                                    className={`w-4 h-4 rounded-[3px] transition-all cursor-pointer hover:scale-125 hover:z-10 ${
                                      log?.status === 'PRESENT' ? 'bg-emerald-500 shadow-sm shadow-emerald-500/20' : 
                                      log?.status === 'ABSENT' ? 'bg-rose-500 shadow-sm shadow-rose-500/20' : 
                                      log?.status === 'LATE' ? 'bg-amber-500 shadow-sm shadow-amber-500/20' : 
                                      log?.status === 'EXCUSED' ? 'bg-blue-500 shadow-sm shadow-blue-500/20' : 
                                      'bg-slate-200 dark:bg-slate-700'
                                    }`}
                                  />
                                );
                              })}
                            </div>
                            
                            <div className="flex-shrink-0 text-right">
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${pct >= 75 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400' : 'bg-rose-100 text-rose-700 dark:bg-rose-950/20 dark:text-rose-400'}`}>
                                {presentCount} Days Present
                              </span>
                            </div>
                          </div>
                        );
                      })}
                      {studentsList.length === 0 && (
                        <div className="py-12 text-center text-sm text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                          No students — only class teachers see the monthly report.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* -- TERM REPORT WITH STATUS HEATMAPS -- */}
            {attSubView === 'term' && (() => {
              const { start, end } = getTermRange(attSelectedTermLocal, new Date().getFullYear());
              const studentsList = isClassTeacher ? classStudents : [];
              const termLogs = allAttendanceLogs.filter(l => l.date >= start && l.date <= end && (!l.type || l.type === 'CLASS'));
              const termDays = [...new Set(termLogs.map(l => l.date))].sort();
              return (
                <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                  <div className="px-8 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between flex-wrap gap-3">
                    <h4 className="font-bold text-black dark:text-white">Term Attendance Heatmap</h4>
                    <select 
                      value={attSelectedTermLocal} 
                      onChange={e => setAttSelectedTermLocal(e.target.value)} 
                      className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-black dark:text-white outline-none cursor-pointer"
                    >
                      <option>Term 1</option>
                      <option>Term 2</option>
                      <option>Term 3</option>
                    </select>
                  </div>
                  <div className="p-6">
                    <div className="space-y-6">
                      {studentsList.map(student => {
                        const presentCount = termLogs.filter(l => 
                          l.studentId === student.id && 
                          ['PRESENT', 'LATE', 'EXCUSED'].includes(l.status)
                        ).length;
                        const total = termDays.length;
                        const pct = total > 0 ? Math.round((presentCount / total) * 100) : 0;
                        return (
                          <div key={student.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-50/50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700 transition-colors">
                            <div className="flex-shrink-0 w-48">
                              <h5 className="text-sm font-bold text-black dark:text-white truncate">{student.name}</h5>
                              <p className="text-[10px] font-bold text-slate-400 tracking-widest">{pct}% Attendance</p>
                            </div>
                            
                            <div className="flex-1 flex gap-1.5 flex-wrap">
                              {termDays.map(d => {
                                const log = termLogs.find(l => l.studentId === student.id && l.date === d);
                                return (
                                  <div 
                                    key={d}
                                    title={`${d}: ${log?.status || 'No data'}`}
                                    className={`w-3.5 h-3.5 rounded-[3px] transition-all cursor-pointer hover:scale-125 hover:z-10 ${
                                      log?.status === 'PRESENT' ? 'bg-emerald-500 shadow-sm shadow-emerald-500/20' : 
                                      log?.status === 'ABSENT' ? 'bg-rose-500 shadow-sm shadow-rose-500/20' : 
                                      log?.status === 'LATE' ? 'bg-amber-500 shadow-sm shadow-amber-500/20' : 
                                      log?.status === 'EXCUSED' ? 'bg-blue-500 shadow-sm shadow-blue-500/20' : 
                                      'bg-slate-200 dark:bg-slate-700'
                                    }`}
                                  />
                                );
                              })}
                              {termDays.length === 0 && <span className="text-xs text-slate-400 italic">No attendance data recorded yet</span>}
                            </div>
                            
                            <div className="flex-shrink-0 text-right flex flex-col items-end gap-1">
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${pct >= 75 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400' : 'bg-rose-100 text-rose-700 dark:bg-rose-950/20 dark:text-rose-400'}`}>
                                {presentCount} / {total} Days
                              </span>
                              {pct >= 75 ? (
                                <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                                  <CheckCircle2 size={10} /> Good Standing
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold text-rose-600 flex items-center gap-1">
                                  <XCircle size={10} /> Needs Attention
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                      {studentsList.length === 0 && (
                        <div className="py-12 text-center text-sm text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                          Term report is only visible to class teachers.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        );
      })()}




      {activeTab === 'grading' && (
        <div className="bg-white dark:bg-slate-900 p-8 md:p-10 rounded-3xl border border-slate-200/60 dark:border-slate-800 shadow-sm transition-all">

          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-10">
            <div>
              <h3 className="text-2xl font-bold text-black dark:text-white tracking-tight leading-none mb-2">Summative Assessment Report</h3>
              <div className="flex items-center gap-3 mt-1">
                <p className="text-sm font-medium text-black dark:text-slate-400">Enter comprehensive marks and CBC performance levels</p>
                <button 
                  onClick={() => {
                    setSelectedStudentForReport({ id: 'sample-123', name: 'John Doe (Sample)', admissionNumber: 'SCH/2026/000', grade: 'Grade 4', stream: 'North' } as any);
                    setShowReportModal(true);
                  }}
                  className="flex items-center gap-2 px-3 py-1 bg-orange-100 text-orange-600 rounded-lg text-[10px] font-bold hover:bg-orange-200 transition-colors"
                >
                  <FileText size={12} /> View Sample Report
                </button>
              </div>
            </div>
            <div className="flex gap-4 flex-wrap">
              <select 
                value={selectedTerm}
                onChange={(e) => setSelectedTerm(e.target.value)}
                className="px-6 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 rounded-xl text-sm font-semibold text-black dark:text-slate-200 outline-none focus:ring-2 focus:ring-orange-500/20 shadow-sm cursor-pointer transition-all hover:border-orange-200 dark:hover:border-orange-800"
              >
                <option>Term 1</option>
                <option>Term 2</option>
                <option>Term 3</option>
              </select>
              <select 
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="px-6 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 rounded-xl text-sm font-semibold text-black dark:text-slate-200 outline-none focus:ring-2 focus:ring-orange-500/20 shadow-sm cursor-pointer transition-all hover:border-orange-200 dark:hover:border-orange-800"
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
            <div className="text-center py-20 text-black dark:text-slate-400">
              <div className="w-24 h-24 bg-slate-50 dark:bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm border border-slate-200/60 dark:border-slate-700">
                <FileText size={40} className="text-black dark:text-slate-500" strokeWidth={1.5} />
              </div>
              <p className="text-sm font-medium">Please select a class to enter marks.</p>
            </div>
          ) : (
            <div className="overflow-x-auto hide-scrollbar">
              <table className="w-full min-w-[800px] border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/50 text-black dark:text-slate-400 border-b border-slate-200/60 dark:border-slate-700">
                    <th className="text-left py-4 px-6 text-xs font-semibold rounded-tl-2xl">Learner</th>
                    <th className="text-left py-4 px-6 text-xs font-semibold">Adm No</th>
                    <th className="text-left py-4 px-6 text-xs font-semibold">Score / 100</th>
                    <th className="text-left py-4 px-6 text-xs font-semibold">CBC Level</th>
                    <th className="text-left py-4 px-6 text-xs font-semibold">Comprehensive Remarks</th>
                    <th className="text-right py-4 px-6 text-xs font-semibold rounded-tr-2xl">Builder</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                  {gradingStudents.map((student, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors group">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-4">
                          <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${student.admissionNumber}`} alt={student.name} className="w-10 h-10 rounded-full object-cover shadow-sm group-hover:scale-110 transition-transform duration-500 border border-slate-200 dark:border-slate-700" />
                          <span className="text-sm font-semibold text-black dark:text-white tracking-tight">{student.name}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-sm font-medium text-black dark:text-slate-400">{student.admissionNumber}</td>
                      <td className="py-4 px-6">
                        <input 
                          type="number" 
                          id={`score-${student.id}`}
                          defaultValue={student.performance} 
                          className="w-24 px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-700 rounded-xl text-sm font-semibold text-black dark:text-white outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all text-center shadow-sm" 
                        />
                      </td>
                      <td className="py-4 px-6">
                        <select 
                          id={`level-${student.id}`}
                          defaultValue={student.performance >= 80 ? 'EE' : student.performance >= 60 ? 'ME' : student.performance >= 40 ? 'AE' : 'BE'}
                          className="w-full min-w-[140px] px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-700 rounded-xl text-sm font-semibold text-black dark:text-white outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all cursor-pointer shadow-sm"
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
                          className="w-full min-w-[240px] px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-700 rounded-xl text-sm font-medium text-black dark:text-white outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all resize-none shadow-sm placeholder:text-black"
                        ></textarea>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => {
                              const score = Number((document.getElementById(`score-${student.id}`) as HTMLInputElement).value);
                              const level = (document.getElementById(`level-${student.id}`) as HTMLSelectElement).value;
                              const remarks = (document.getElementById(`remarks-${student.id}`) as HTMLTextAreaElement).value;
                              handleSaveMarks(student.id, score, level, remarks);
                            }}
                            className="text-[11px] font-bold text-white transition-all px-4 py-2 bg-emerald-500 rounded-xl shadow-sm hover:shadow-md active:scale-95 shadow-emerald-500/10"
                          >
                            Save
                          </button>
                          <button 
                            onClick={() => {
                              setSelectedStudentForReport(student);
                              setShowReportModal(true);
                            }}
                            className="p-2 hover:bg-orange-50 text-slate-400 hover:text-orange-600 rounded-lg transition-colors group"
                            title="Open report builder"
                          >
                            <Palette size={18} className="group-hover:scale-110 transition-transform" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {showReportModal && selectedStudentForReport && (
            <ReportBuilderModal
              student={selectedStudentForReport}
              students={students}
              schoolProfile={schoolProfile}
              assessments={assessments}
              onClose={() => setShowReportModal(false)}
              onAssessmentChange={handleAssessmentChange}
            />
          )}
        </div>
      )}

      {/* Finance Tab */}
      {activeTab === 'finance' && isClassTeacher && (
        <div className="space-y-8 animate-in slide-in-from-bottom-6 duration-500">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-bold text-black dark:text-white tracking-tight">Class Fees Ledger</h3>
              <p className="text-sm text-slate-500 mt-1">Manage parent communication and fee collection for {teacherData?.classTeacherOf} {teacherData?.stream}.</p>
            </div>
            <div className="px-4 py-2 bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 font-bold rounded-xl text-sm shadow-sm border border-orange-200/50 dark:border-orange-900/30">
              KES {classStudents.reduce((acc, s) => acc + (s.balance || 0), 0).toLocaleString()} Outstanding
            </div>
          </div>

          {/* Director / Finance Directives Inbox */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <Bell size={20} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-black dark:text-white">Admin Directives Inbox</h4>
                <p className="text-xs text-slate-500">Active instructions regarding fee collection.</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="p-4 bg-orange-50/50 dark:bg-orange-950/10 border border-orange-100 dark:border-orange-900/30 rounded-2xl relative overflow-hidden">
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-orange-600 dark:text-orange-400 uppercase">From: Director</span>
                      <span className="text-[10px] text-slate-400">{new Date().toLocaleDateString()}</span>
                    </div>
                    <span className="px-2 py-0.5 bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-300 rounded-full text-[9px] font-black tracking-wider animate-pulse border border-orange-200 dark:border-orange-800">ACTIVE CAMPAIGN</span>
                  </div>
                  <h5 className="text-sm font-bold text-black dark:text-white mb-1">Clear Term Balance Reminder</h5>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed italic">"Dear Class Teachers, please review your class registers and send fee clearance reminders to all parents who have pending balances above KES 0. Ensure all communications are polite but firm. Thank you."</p>
                </div>
              </div>
              <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-700 rounded-2xl">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-slate-600 dark:text-slate-300 uppercase">From: Finance Dept</span>
                    <span className="text-[10px] text-slate-400">Previous Week</span>
                  </div>
                  <span className="px-2 py-0.5 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full text-[9px] font-black tracking-wider">INFORMATIONAL</span>
                </div>
                <h5 className="text-sm font-bold text-black dark:text-white mb-1">Payment Method Updates</h5>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed italic">"We have updated our official M-Pesa Paybill matching. When parents ask, advise them to use the school Paybill with the student's admission number as the account number. Do not accept direct cash payments."</p>
              </div>
            </div>
          </div>

          {/* Student Register Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-[2rem] p-6 sm:p-8 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h4 className="text-lg font-bold text-black dark:text-white">Learner Fee Register</h4>
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Search learner..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none w-full sm:w-64"
                />
              </div>
            </div>

            <div className="overflow-x-auto hide-scrollbar">
               <table className="w-full min-w-[900px] border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200/60 dark:border-slate-700 text-slate-800 dark:text-white text-xs font-semibold">
                    <th className="text-left py-4 px-6 rounded-tl-2xl">Learner</th>
                    <th className="text-left py-4 px-6">Grade</th>
                    <th className="text-left py-4 px-6">Parent / Guardian</th>
                    <th className="text-left py-4 px-6">Contact Info</th>
                    <th className="text-right py-4 px-6">Balance (KES)</th>
                    <th className="text-right py-4 px-6 rounded-tr-2xl">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                  {classStudents.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.admissionNumber.toLowerCase().includes(searchQuery.toLowerCase())).map((student, idx) => {
                    const parentName = student.parentInfo?.fatherName || student.parentInfo?.motherName || student.parentInfo?.guardianName || 'N/A';
                    const parentPhone = student.parentInfo?.fatherPhone || student.parentInfo?.motherPhone || student.parentInfo?.guardianPhone || student.parentPhone || 'N/A';
                    const isFullyPaid = (student.balance || 0) <= 0;
                    
                    return (
                      <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors group">
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-4">
                            <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${student.admissionNumber}`} alt={student.name} className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 object-cover shadow-sm group-hover:scale-110 transition-transform duration-500 border border-slate-200 dark:border-slate-700" />
                            <div>
                              <p className="text-sm font-semibold text-black dark:text-white tracking-tight leading-none mb-1">{student.name}</p>
                              <p className="text-[10px] text-slate-500 font-medium tracking-wider">{student.admissionNumber}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <span className="text-xs font-medium text-slate-600 dark:text-slate-300">{student.grade} {student.stream}</span>
                        </td>
                        <td className="py-4 px-6">
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{parentName}</span>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
                              <Phone size={11} className="text-slate-400" /> {parentPhone}
                            </div>
                            <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400">
                              <Mail size={11} className="text-slate-300 dark:text-slate-600" /> parent@example.com
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6 text-right">
                          {isFullyPaid ? (
                            <span className="inline-block px-3 py-1.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-lg text-xs font-black shadow-sm border border-emerald-200 dark:border-emerald-800">
                              NIL
                            </span>
                          ) : (
                            <span className="inline-block text-sm font-black text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 px-3 py-1.5 rounded-lg border border-rose-100 dark:border-rose-900/50">
                              {student.balance.toLocaleString()}
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-6 text-right">
                          <button 
                            onClick={() => {
                              setSelectedStudentForMessage(student);
                              setCustomMessageText(`Dear ${parentName}, hope you are well. As per the director's instructions, we kindly request you to clear the outstanding fee balance of KES ${student.balance.toLocaleString()} for ${student.name} to ensure uninterrupted learning. Thank you, Class Teacher.`);
                              setCustomReminderAmount('');
                              setIsMessageModalOpen(true);
                            }}
                            disabled={isFullyPaid}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-bold transition-all ml-auto ${isFullyPaid ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed opacity-50' : 'bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-900/60 shadow-sm border border-orange-100 dark:border-orange-900/50 active:scale-95'}`}
                          >
                            <MessageSquare size={14} /> {isFullyPaid ? 'Cleared' : 'Send Reminder'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {classStudents.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-sm font-medium text-slate-400">
                        <Users size={32} className="mx-auto mb-3 text-slate-300" />
                        No students found in your class register.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          
          {/* Send Reminder Modal */}
          {isMessageModalOpen && selectedStudentForMessage && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-200">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200 relative overflow-hidden">
                <div className="relative z-10">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-14 h-14 rounded-2xl bg-orange-100 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 flex items-center justify-center border border-orange-200/30 shadow-sm">
                      <MessageSquare size={24} />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-black dark:text-white leading-tight tracking-tight">Send Reminder</h3>
                      <p className="text-xs font-medium text-slate-500 mt-1">To: {selectedStudentForMessage.parentInfo?.fatherName || selectedStudentForMessage.parentInfo?.motherName || 'Parent'}</p>
                    </div>
                  </div>

                  <div className="space-y-5 mb-8">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Specific Amount (Optional)</label>
                      <input 
                        type="number" 
                        value={customReminderAmount}
                        onChange={(e) => setCustomReminderAmount(e.target.value)}
                        placeholder={`Default: KES ${selectedStudentForMessage.balance.toLocaleString()}`}
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 rounded-xl text-sm font-medium focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none text-black dark:text-white transition-all placeholder:text-slate-400"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Message Body</label>
                      <textarea 
                        value={customMessageText}
                        onChange={(e) => setCustomMessageText(e.target.value)}
                        rows={5}
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 rounded-xl text-sm font-medium focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none resize-none text-black dark:text-white leading-relaxed transition-all"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button 
                      onClick={() => {
                        setIsMessageModalOpen(false);
                        setSelectedStudentForMessage(null);
                      }}
                      className="flex-1 py-3.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-sm rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all border border-transparent dark:border-slate-700"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={() => {
                        toast.success(`Reminder notification successfully sent to ${selectedStudentForMessage.parentInfo?.fatherName || selectedStudentForMessage.parentInfo?.motherName || 'Parent'}!`, {
                          icon: '📨',
                          style: {
                            borderRadius: '1rem',
                            background: '#333',
                            color: '#fff',
                            fontSize: '14px',
                            fontWeight: 'bold'
                          },
                        });
                        setIsMessageModalOpen(false);
                        setSelectedStudentForMessage(null);
                      }}
                      className="flex-1 py-3.5 bg-orange-600 text-white font-bold text-sm rounded-xl hover:bg-orange-700 shadow-md shadow-orange-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                      <Send size={16} /> Dispatch SMS
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TeacherModule;



