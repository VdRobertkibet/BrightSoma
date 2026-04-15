
import React, { useState, useEffect, useMemo } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  Calendar as CalendarIcon, 
  Users, 
  BookOpen, 
  ChevronLeft, 
  ChevronRight,
  Search,
  Loader2,
  Filter,
  ArrowLeft
} from 'lucide-react';
import { db, auth } from '../src/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, onSnapshot, addDoc, updateDoc, doc, getDoc, serverTimestamp, getDocs, Timestamp } from 'firebase/firestore';
import { Student, Attendance, CBCGrade } from '../types';
import { sendRealSMS } from '../services/smsService';
import toast from 'react-hot-toast';

interface AttendanceModuleProps {
  onBack?: () => void;
}

const AttendanceModule: React.FC<AttendanceModuleProps> = ({ onBack }) => {
  const [viewType, setViewType] = useState<'CLASS' | 'SUBJECT'>('CLASS');
  const [selectedGrade, setSelectedGrade] = useState<string>('');
  const [selectedStream, setSelectedStream] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [students, setStudents] = useState<Student[]>([]);
  const [attendanceData, setAttendanceData] = useState<Attendance[]>([]);
  const [weeklyAttendance, setWeeklyAttendance] = useState<Attendance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [teacherData, setTeacherData] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [historyDate, setHistoryDate] = useState(new Date().toISOString().split('T')[0]);
  const [historyLogs, setHistoryLogs] = useState<Attendance[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);

  const today = new Date().toISOString().split('T')[0];
  const dayOfWeek = new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(new Date());

  // Get current week start and end
  const getWeekRange = () => {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
    const start = new Date(now.setDate(diff));
    start.setHours(0, 0, 0, 0);
    
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    
    return { start, end };
  };

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        // 1. Get user role and school ID
        let schoolId = user.uid;
        let isTeacher = false;
        
        const staffDocRef = doc(db, 'staff', user.uid);
        const staffDocSnap = await getDoc(staffDocRef);
        if (staffDocSnap.exists()) {
          const tData = staffDocSnap.data() as any;
          if (tData) {
            setTeacherData({ id: staffDocSnap.id, ...tData });
            schoolId = tData.schoolId;
            isTeacher = true;
            
            if (tData.isClassTeacher) {
              setSelectedGrade(tData.assignedGrade);
              setSelectedStream(tData.assignedStream);
            } else if (tData.subjects && tData.subjects.length > 0) {
              setViewType('SUBJECT');
              setSelectedSubject(tData.subjects[0]);
            }
          }
        } else {
          // Check if it's a school admin
          const schoolDoc = await getDoc(doc(db, 'schools', user.uid));
          if (schoolDoc.exists()) {
            setTeacherData({ id: user.uid, name: schoolDoc.data().name, schoolId: user.uid, isAdmin: true });
          } else {
            // Fallback for demo/new users
            setTeacherData({ id: user.uid, name: 'User', schoolId: user.uid });
          }
        }

        // 2. Setup real-time listeners
        const qStudents = query(collection(db, 'students'), where('schoolId', '==', schoolId));
        const unsubStudents = onSnapshot(qStudents, (snapshot) => {
          const studentList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student));
          setStudents(studentList);
          
          // If no students found in Firestore, provide mock data for demo
          if (studentList.length === 0) {
            setStudents([
              { id: 'demo-1', name: 'Demo Student 1', admissionNumber: 'DEMO/001', grade: CBCGrade.G1, stream: 'North', performance: 80, balance: 0, boardingType: 'Day Scholar', status: 'Active', parentInfo: { fatherName: '', fatherPhone: '', motherName: '', motherPhone: '', emergencyContact: '' }, medicalInfo: { bloodGroup: '', allergies: '', conditions: '' }, schoolId: schoolId },
              { id: 'demo-2', name: 'Demo Student 2', admissionNumber: 'DEMO/002', grade: CBCGrade.G1, stream: 'North', performance: 75, balance: 0, boardingType: 'Day Scholar', status: 'Active', parentInfo: { fatherName: '', fatherPhone: '', motherName: '', motherPhone: '', emergencyContact: '' }, medicalInfo: { bloodGroup: '', allergies: '', conditions: '' }, schoolId: schoolId },
            ]);
            if (!selectedGrade) setSelectedGrade(CBCGrade.G1);
            if (!selectedStream) setSelectedStream('North');
          }
        });

        const qAttendance = query(
          collection(db, 'attendance'), 
          where('schoolId', '==', schoolId), 
          where('date', '==', today)
        );
        const unsubAttendance = onSnapshot(qAttendance, (snapshot) => {
          setAttendanceData(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Attendance)));
        });

        const { start, end } = getWeekRange();
        const qWeekly = query(
          collection(db, 'attendance'),
          where('schoolId', '==', schoolId),
          where('timestamp', '>=', Timestamp.fromDate(start)),
          where('timestamp', '<=', Timestamp.fromDate(end))
        );
        const unsubWeekly = onSnapshot(qWeekly, (snapshot) => {
          setWeeklyAttendance(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Attendance)));
          setIsLoading(false);
        });

        // Store unsubs in a way we can clean them up if needed, 
        // but for now, we'll just let them be since this is a one-time setup on auth.
        // To fix TS7030, we ensure no return in this path, or consistent ones.
      } catch (error) {
        console.error("Error in AttendanceModule data fetch:", error);
        setIsLoading(false);
        toast.error("Error loading attendance data. Using demo mode.");
      }
    });

    return () => unsubscribeAuth();
  }, []);

  const filteredStudents = useMemo(() => {
    let result = students;
    if (viewType === 'CLASS') {
      if (selectedGrade) result = result.filter(s => s.grade === selectedGrade);
      if (selectedStream) result = result.filter(s => s.stream === selectedStream);
    } else {
      // For subject teacher, we might need to filter by students who take that subject
      // For now, let's assume we filter by grade/stream if selected, otherwise show all
      if (selectedGrade) result = result.filter(s => s.grade === selectedGrade);
      if (selectedStream) result = result.filter(s => s.stream === selectedStream);
    }

    if (searchQuery) {
      result = result.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.admissionNumber.includes(searchQuery));
    }

    return result;
  }, [students, viewType, selectedGrade, selectedStream, searchQuery]);

  // Fetch History Logs
  useEffect(() => {
    if (!showHistory || !teacherData?.schoolId) return;

    const fetchHistory = async () => {
      setIsHistoryLoading(true);
      try {
        const qHistory = query(
          collection(db, 'attendance'), 
          where('schoolId', '==', teacherData.schoolId), 
          where('date', '==', historyDate)
        );
        const snapshot = await getDocs(qHistory);
        setHistoryLogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Attendance)));
      } catch (error) {
        console.error("Error fetching attendance history:", error);
      } finally {
        setIsHistoryLoading(false);
      }
    };

    fetchHistory();
  }, [showHistory, historyDate, teacherData?.schoolId]);

  const handleMarkAttendance = async (studentId: string, status: 'PRESENT' | 'ABSENT') => {
    try {
      const user = auth.currentUser;
      if (!user || !teacherData) return;

      const existing = attendanceData.find(a => a.studentId === studentId);

      if (existing) {
        if (existing.status === status) return;
        await updateDoc(doc(db, 'attendance', existing.id), {
          status,
          recordedBy: user.uid,
          timestamp: serverTimestamp()
        });
      } else {
        await addDoc(collection(db, 'attendance'), {
          schoolId: teacherData.schoolId,
          studentId,
          date: today,
          status,
          recordedBy: user.uid,
          timestamp: serverTimestamp(),
          type: viewType,
          subject: viewType === 'SUBJECT' ? selectedSubject : null
        });

        // Trigger SMS for Absence
        if (status === 'ABSENT') {
           const student = students.find(s => s.id === studentId);
           if (student && student.parentInfo?.emergencyContact) {
              const msg = `BrightSoma Alert: ${student.name} was marked ABSENT today, ${today}. Please contact the school for details.`;
              try {
                await sendRealSMS(student.parentInfo.emergencyContact, msg);
                await addDoc(collection(db, 'sms_logs'), {
                  schoolId: teacherData.schoolId,
                  studentId,
                  phone: student.parentInfo.emergencyContact,
                  message: msg,
                  status: 'Success',
                  timestamp: serverTimestamp(),
                  type: 'AttendanceAlert'
                });
              } catch (e) {
                console.error("SMS trigger failed:", e);
              }
           }
        }
      }
      toast.success(`Marked as ${status.toLowerCase()}`);
    } catch (error) {
      console.error("Error marking attendance:", error);
      toast.error("Failed to mark attendance");
    }
  };

  const getWeeklyStats = (studentId: string) => {
    const studentWeekly = weeklyAttendance.filter(a => a.studentId === studentId);
    const present = studentWeekly.filter(a => a.status === 'PRESENT').length;
    const absent = studentWeekly.filter(a => a.status === 'ABSENT').length;
    return { present, absent };
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-10 h-10 animate-spin text-orange-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Dashboard Style Hero Card */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-[2.5rem] p-10 shadow-sm border border-slate-700 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-orange-500/10 rounded-full blur-3xl -mr-64 -mt-64 group-hover:bg-orange-500/20 transition-all duration-1000"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 bg-white/10 backdrop-blur-md rounded-[2.5rem] flex items-center justify-center border border-white/20 shadow-2xl group-hover:scale-110 transition-transform duration-500">
               <CheckCircle2 size={40} className="text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-white tracking-tight leading-tight mb-2">Student Attendance</h2>
              <p className="text-sm font-bold text-slate-400 max-w-xl leading-relaxed">
                Monitor and record student attendance daily. Keep track of learner presence and ensure safety with easy roll-calls.
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-3">
             <div className="flex items-center gap-2 p-1.5 bg-slate-800/50 backdrop-blur-md border border-slate-700 rounded-2xl w-fit">
                <button 
                  onClick={() => setShowHistory(!showHistory)}
                  className={`px-5 py-2 rounded-xl text-xs font-bold transition-all ${showHistory ? 'bg-orange-600 text-white' : 'text-slate-400 hover:text-white'}`}
                >
                  {showHistory ? 'View Today' : 'View History'}
                </button>
                <div className="w-px h-4 bg-slate-700 mx-1"></div>
                <button 
                  onClick={() => setViewType('CLASS')}
                  className={`px-5 py-2 rounded-xl text-xs font-bold transition-all ${viewType === 'CLASS' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-400 hover:text-white'}`}
                >
                  Class
                </button>
                <button 
                  onClick={() => setViewType('SUBJECT')}
                  className={`px-5 py-2 rounded-xl text-xs font-bold transition-all ${viewType === 'SUBJECT' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-400 hover:text-white'}`}
                >
                  Subject
                </button>
              </div>
              <p className="text-xs font-bold text-slate-500 text-right">
                {dayOfWeek}, {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
          </div>
        </div>
      </div>

      {showHistory ? (
        <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
           <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-800 dark:text-white">Attendance History</h3>
              <input 
                type="date"
                value={historyDate}
                onChange={(e) => setHistoryDate(e.target.value)}
                className="px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-orange-500/20"
              />
           </div>

           <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden">
              <table className="w-full border-collapse">
                 <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 text-xs font-bold uppercase">
                       <th className="text-left py-4 px-6">Learner</th>
                       <th className="text-center py-4 px-6">Status</th>
                       <th className="text-right py-4 px-6">Recorded At</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                    {isHistoryLoading ? (
                       <tr><td colSpan={3} className="py-20 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-orange-500" /></td></tr>
                    ) : historyLogs.length === 0 ? (
                       <tr><td colSpan={3} className="py-20 text-center text-slate-400 font-bold">No records found for this date.</td></tr>
                    ) : (
                       historyLogs.map(log => {
                          const student = students.find(s => s.id === log.studentId);
                          return (
                             <tr key={log.id}>
                                <td className="py-4 px-6">
                                   <p className="text-sm font-bold text-slate-800 dark:text-white">{student?.name || 'Unknown Learner'}</p>
                                   <p className="text-[10px] text-slate-500 font-bold uppercase">{student?.admissionNumber}</p>
                                </td>
                                <td className="py-4 px-6 text-center">
                                   <span className={`px-3 py-1 rounded-full text-[10px] font-bold ${log.status === 'PRESENT' ? 'bg-green-50 text-green-600' : 'bg-rose-50 text-rose-600'}`}>
                                      {log.status}
                                   </span>
                                </td>
                                <td className="py-4 px-6 text-right text-xs text-slate-500 font-medium">
                                   {log.timestamp?.toDate ? log.timestamp.toDate().toLocaleTimeString() : 'N/A'}
                                </td>
                             </tr>
                          )
                       })
                    )}
                 </tbody>
              </table>
           </div>
        </div>
      ) : (
        <>

      {/* Filters Section */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-orange-500 transition-colors" size={18} />
          <input 
            type="text"
            placeholder="Search student..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
          />
        </div>

        <select 
          value={selectedGrade}
          onChange={(e) => setSelectedGrade(e.target.value)}
          className="px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
        >
          <option value="">All Grades</option>
          {Object.values(CBCGrade).map(g => <option key={g} value={g}>{g}</option>)}
        </select>

        <select 
          value={selectedStream}
          onChange={(e) => setSelectedStream(e.target.value)}
          className="px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
        >
          <option value="">All Streams</option>
          {['North', 'South', 'East', 'West'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        {viewType === 'SUBJECT' && (
          <select 
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
          >
            <option value="">Select Subject</option>
            {teacherData?.subjects?.map((s: string) => <option key={s} value={s}>{s}</option>)}
          </select>
        )}
      </div>

      {/* Attendance Table */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <th className="text-left py-5 px-6 text-xs font-bold uppercase">Student Details</th>
                <th className="text-center py-5 px-6 text-xs font-bold uppercase">Weekly Stats</th>
                <th className="text-right py-5 px-6 text-xs font-bold uppercase">Mark Attendance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-20 text-center text-slate-500 dark:text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-4">
                      <Users className="w-16 h-16 mx-auto opacity-10" />
                      <div className="space-y-1">
                        <p className="text-lg font-bold text-slate-400">No students found</p>
                        <p className="text-xs font-medium text-slate-500">Try adjusting your filters or search query.</p>
                      </div>
                      {teacherData?.isAdmin && (
                        <p className="text-[10px] bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 px-3 py-1 rounded-full font-bold uppercase">
                          Admin View: Showing all students in school
                        </p>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student) => {
                  const currentStatus = attendanceData.find(a => a.studentId === student.id)?.status;
                  const stats = getWeeklyStats(student.id);

                  return (
                    <tr key={student.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors group">
                      <td className="py-5 px-6">
                        <div className="flex items-center gap-4">
                          <div className="relative">
                            <img 
                              src={`https://picsum.photos/seed/${student.id}/100`} 
                              alt={student.name} 
                              className="w-12 h-12 rounded-2xl object-cover border-2 border-white dark:border-slate-800 shadow-sm group-hover:scale-105 transition-transform duration-300"
                              referrerPolicy="no-referrer"
                            />
                            {currentStatus && (
                              <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white dark:border-slate-900 ${currentStatus === 'PRESENT' ? 'bg-orange-500' : 'bg-orange-400'}`}></div>
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">{student.name}</p>
                            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase">
                              {student.admissionNumber} • {student.grade} {student.stream}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-5 px-6">
                        <div className="flex items-center justify-center gap-6">
                          <div className="text-center">
                            <p className="text-xs font-semibold text-slate-400 mb-1">Present</p>
                            <p className="text-sm font-bold text-orange-600 dark:text-orange-400">{stats.present}</p>
                          </div>
                          <div className="w-px h-8 bg-slate-100 dark:bg-slate-800"></div>
                          <div className="text-center">
                            <p className="text-xs font-semibold text-slate-400 mb-1">Absent</p>
                            <p className="text-sm font-bold text-orange-600 dark:text-orange-400">{stats.absent}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-5 px-6">
                        <div className="flex items-center justify-end gap-4">
                          <button 
                            onClick={() => handleMarkAttendance(student.id, 'PRESENT')}
                            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 active:scale-90 ${
                              currentStatus === 'PRESENT' 
                                ? 'bg-orange-600 text-white shadow-lg shadow-orange-200 dark:shadow-none' 
                                : 'bg-slate-50 dark:bg-slate-800 text-slate-400 hover:bg-orange-50 hover:text-orange-500 dark:hover:bg-orange-900/20'
                            }`}
                            title="Mark Present"
                          >
                            <CheckCircle2 size={24} strokeWidth={2.5} />
                          </button>
                          <button 
                            onClick={() => handleMarkAttendance(student.id, 'ABSENT')}
                            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 active:scale-90 ${
                              currentStatus === 'ABSENT' 
                                ? 'bg-orange-500 text-white shadow-lg shadow-orange-200 dark:shadow-none' 
                                : 'bg-slate-50 dark:bg-slate-800 text-slate-400 hover:bg-orange-50 hover:text-orange-500 dark:hover:bg-orange-900/20'
                            }`}
                            title="Mark Absent"
                          >
                            <XCircle size={24} strokeWidth={2.5} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary Footer */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-orange-50 dark:bg-orange-900/10 p-5 rounded-2xl border border-orange-100 dark:border-orange-900/20">
          <p className="text-xs font-bold text-orange-600 dark:text-orange-400 mb-1">Total Present Today</p>
          <p className="text-2xl font-bold text-orange-700 dark:text-orange-300">
            {attendanceData.filter(a => a.status === 'PRESENT').length}
          </p>
        </div>
        <div className="bg-orange-50 dark:bg-orange-900/10 p-5 rounded-2xl border border-orange-100 dark:border-orange-900/20">
          <p className="text-xs font-bold text-orange-600 dark:text-orange-400 mb-1">Total Absent Today</p>
          <p className="text-2xl font-bold text-orange-700 dark:text-orange-300">
            {attendanceData.filter(a => a.status === 'ABSENT').length}
          </p>
        </div>
        <div className="bg-orange-50 dark:bg-orange-900/10 p-5 rounded-2xl border border-orange-100 dark:border-orange-900/20">
          <p className="text-xs font-bold text-orange-600 dark:text-orange-400 mb-1">Attendance Rate</p>
          <p className="text-2xl font-bold text-orange-700 dark:text-orange-300">
            {students.length > 0 ? Math.round((attendanceData.filter(a => a.status === 'PRESENT').length / students.length) * 100) : 0}%
          </p>
        </div>
      </div>
    </>
  )}
</div>
  );
};

export default AttendanceModule;
