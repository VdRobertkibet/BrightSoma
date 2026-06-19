
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { 
  GraduationCap, 
  Book, 
  Layers, 
  ChevronRight, 
  User, 
  ClipboardCheck, 
  FileText, 
  Printer, 
  Download, 
  Search, 
  Filter, 
  Star,
  CheckCircle2,
  X,
  Plus,
  TrendingUp,
  BookOpen,
  ArrowRight,
  Edit2,
  Save,
  Palette,
  Trash2,
  Send
} from 'lucide-react';
import toast from 'react-hot-toast';
import { 
  CBC_GRADES, 
  PERFORMANCE_LEVELS, 
  LOWER_PRIMARY_LEARNING_AREAS, 
  JUNIOR_SECONDARY_LEARNING_AREAS
} from '../constants';
import { useReactToPrint } from 'react-to-print';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { db, auth } from '../src/firebase';
import { collection, query, where, onSnapshot, getDocs, addDoc, updateDoc, doc, setDoc, getDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { Student, Assessment, CBCGrade } from '../types';

import ReportBuilderModal from './ReportBuilderModal';

interface AcademicModuleProps {
  activeTab?: 'hierarchy' | 'assessments' | 'reports';
  onTabChange?: (tab: 'hierarchy' | 'assessments' | 'reports') => void;
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

const AcademicModule: React.FC<AcademicModuleProps> = ({ activeTab: propActiveTab, onTabChange: propOnTabChange }) => {
  const [localActiveTab, setLocalActiveTab] = useState<'hierarchy' | 'assessments' | 'reports'>('hierarchy');
  const activeTab = propActiveTab || localActiveTab;
  const setActiveTab = propOnTabChange || setLocalActiveTab;

  const [selectedGrade, setSelectedGrade] = useState<CBCGrade>(CBCGrade.G4);
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [timetable, setTimetable] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [schoolProfile, setSchoolProfile] = useState<any>(null);
  const [showSendConfirmModal, setShowSendConfirmModal] = useState(false);

  // Only grades that have students enrolled
  const activeGradesList = useMemo(() => {
    const gradesWithStudents = [...new Set(students.map(s => s.grade as string))];
    const order = ['PP1','PP2','Grade 1','Grade 2','Grade 3','Grade 4','Grade 5','Grade 6','Grade 7','Grade 8','Grade 9','Grade 10','Grade 11','Grade 12'];
    return order.filter(g => gradesWithStudents.includes(g));
  }, [students]);

  useEffect(() => {
    let unsubs: (() => void)[] = [];

    const unsubscribeAuth = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      unsubs.forEach(unsub => unsub()); // Clear previous listeners
      unsubs = [];

      let schoolId = user.uid;
      const staffDocRef = doc(db, 'staff', user.uid);
      const staffDocSnap = await getDoc(staffDocRef);
      if (staffDocSnap.exists()) {
        schoolId = staffDocSnap.data().schoolId;
      }

      unsubs.push(onSnapshot(query(collection(db, 'students'), where('schoolId', '==', schoolId)), snap => {
        setStudents(snap.docs.map(d => {
          const s = d.data() as Student;
          return { ...s, id: d.id, name: toTitleCase(s.name) };
        }));
      }));

      unsubs.push(onSnapshot(query(collection(db, 'assessments'), where('schoolId', '==', schoolId)), snap => {
        setAssessments(snap.docs.map(d => ({ id: d.id, ...d.data() } as Assessment)));
        setIsLoading(false);
      }));

      unsubs.push(onSnapshot(query(collection(db, 'staff'), where('schoolId', '==', schoolId)), snap => {
        setStaff(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      }));

      unsubs.push(onSnapshot(query(collection(db, 'timetable'), where('schoolId', '==', schoolId)), snap => {
        setTimetable(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      }));

      unsubs.push(onSnapshot(doc(db, 'schools', schoolId), docSnap => {
        if (docSnap.exists()) setSchoolProfile({ id: docSnap.id, ...docSnap.data() });
      }));
    });

    return () => {
      unsubscribeAuth();
      unsubs.forEach(unsub => unsub());
    };
  }, []);

  const handleAssessmentChange = async (studentId: string, learningArea: string, level: any) => {
    const user = auth.currentUser;
    if (!user) return;
    let schoolId = user.uid;
    const staffDocSnap = await getDoc(doc(db, 'staff', user.uid));
    if (staffDocSnap.exists()) schoolId = staffDocSnap.data().schoolId;

    const existing = assessments.find(a => a.studentId === studentId && a.learningArea === learningArea);

    try {
      if (!level) {
        // Clear / delete
        if (existing) {
          await deleteDoc(doc(db, 'assessments', existing.id));
        }
        // Optimistic local update
        setAssessments(prev => prev.filter(a => !(a.studentId === studentId && a.learningArea === learningArea)));
      } else {
        const assessmentData = {
          schoolId, studentId, learningArea, level,
          term: 'Term 1', year: 2026, strand: 'General',
          remarks: existing?.remarks || ''
        };
        if (existing) {
          await updateDoc(doc(db, 'assessments', existing.id), assessmentData);
        } else {
          await addDoc(collection(db, 'assessments'), assessmentData);
        }
      }
    } catch (error) {
      console.error('Error saving assessment:', error);
      toast.error('Failed to save assessment');
    }
  };

  // Get subjects for grade from timetable, fallback to constants
  const getSubjectsForGrade = (grade: string): string[] => {
    const fromTimetable = [...new Set(timetable.filter(t => t.grade === grade && t.subject).map((t: any) => t.subject as string))];
    if (fromTimetable.length > 0) return fromTimetable;
    const isJunior = grade.startsWith('Grade 7') || grade.startsWith('Grade 8') || grade.startsWith('Grade 9');
    return isJunior ? JUNIOR_SECONDARY_LEARNING_AREAS : LOWER_PRIMARY_LEARNING_AREAS;
  };

  const handleOpenReport = async (student: any) => {
    setSelectedStudent(student);
    setShowSendConfirmModal(false);
    setShowReportModal(true);
  };

  const handleSendToWhatsApp = (student: any) => {
    const phone = student.parentInfo?.fatherPhone || student.parentInfo?.motherPhone || '';
    if (!phone) { toast.error('No parent phone number found for this learner.'); return; }
    const cleaned = phone.replace(/\s+/g, '').replace(/^0/, '254').replace(/[^\d+]/g, '');
    const schoolName = schoolProfile?.schoolName || 'BrightSoma Academy';
    const msg = encodeURIComponent(
      `Dear Parent/Guardian of *${student.name}*,\n\nPlease find the CBC Progress Report from *${schoolName}*.\n\nTerm: Term 1, 2026\nGrade: ${student.grade} | Stream: ${student.stream}\n\nKindly contact the class teacher for any queries.\n\nRegards,\n${schoolName}`
    );
    window.open(`https://wa.me/${cleaned}?text=${msg}`, '_blank');
    setShowSendConfirmModal(false);
    toast.success('WhatsApp message opened for parent delivery!');
  };

  // ----------------------- REPORT MODAL --------------------------
  if (showReportModal && selectedStudent) {
    return (
      <ReportBuilderModal
        student={selectedStudent}
        students={students}
        schoolProfile={schoolProfile}
        assessments={assessments}
        onClose={() => setShowReportModal(false)}
        onAssessmentChange={handleAssessmentChange}
      />
    );
  }

  // ---------------------- MAIN MODULE UI -------------------------
  return (
    <div className="space-y-10 animate-in fade-in duration-700 font-sans">
      {/* Consolidated Academic Toolbar */}
      <div className="flex flex-wrap items-center gap-4 animate-in slide-in-from-top-4 duration-500">
        {/* Stats Section */}
        <div className="flex items-center gap-2">
          <div className="px-5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl flex items-center gap-3">
            <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center text-orange-600">
              <TrendingUp size={14} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 leading-tight">Active Grades</p>
              <p className="text-sm font-black text-slate-900 dark:text-white leading-tight">{activeGradesList.length || CBC_GRADES.length}</p>
            </div>
          </div>
        </div>

        {/* Grade Selector (Only show for Assessments & Reports) */}
        {(activeTab === 'assessments' || activeTab === 'reports') && (
          <div className="flex items-center gap-3 ml-auto">
            <div className="flex items-center gap-3 px-5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl">
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 tracking-widest">Select Model:</span>
              <select
                value={selectedGrade}
                onChange={(e) => setSelectedGrade(e.target.value as CBCGrade)}
                className="bg-transparent text-sm font-bold text-slate-900 dark:text-white outline-none cursor-pointer"
              >
                {(activeGradesList.length > 0 ? activeGradesList : CBC_GRADES).map(g => (
                  <option key={g} value={g} className="text-black dark:text-white">{g}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* School Structure Tab */}
      {activeTab === 'hierarchy' && (
        <div className="space-y-8 animate-in fade-in duration-700">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            {(activeGradesList.length > 0 ? activeGradesList : CBC_GRADES).map(grade => {
              const gradeStudents = students.filter(s => s.grade === grade);
              const gradeTimetable = timetable.filter(t => t.grade === grade);
              const educatorsCount = new Set(gradeTimetable.map(t => t.teacher)).size;
              const classTeacher = staff.find(s => s.role === 'TEACHER' && s.assignedGrade === grade)?.name || 'Unassigned';
              return (
                <div 
                  key={grade} 
                  onClick={() => {
                    setSelectedGrade(grade as CBCGrade);
                    setActiveTab('assessments');
                  }}
                  className="rounded-[2rem] shadow-sm border border-slate-200/60 dark:border-slate-700 hover:shadow-md transition-shadow overflow-hidden bg-white dark:bg-slate-800 flex flex-col relative group cursor-pointer"
                >
                  <button className="absolute right-4 top-4 bg-white/50 dark:bg-slate-800/50 w-7 h-7 rounded-full flex items-center justify-center text-black dark:text-white group-hover:text-orange-600 transition-colors"><ChevronRight size={14}/></button>
                  <div className="bg-slate-50 dark:bg-slate-900 p-5 pb-4 border-b border-slate-200/60 dark:border-slate-700 flex items-center gap-3">
                    <Layers size={18} className="text-orange-500" />
                    <p className="text-sm font-bold text-black dark:text-white">{grade}</p>
                  </div>
                  <div className="p-5 pt-4 bg-white dark:bg-slate-800 flex flex-col gap-2">
                    <p className="text-[13px] font-semibold text-black dark:text-white">{gradeStudents.length} Students</p>
                    <p className="text-xs text-slate-600 dark:text-slate-300 font-semibold">
                      <span className="text-orange-600">{educatorsCount}</span> Educators
                      <span className="mx-1 text-slate-300">|</span>
                      <span className="text-slate-800 dark:text-slate-300 italic truncate">{classTeacher}</span>
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'assessments' && (
        <div className="pt-4">
          <h3 className="text-lg font-bold text-black dark:text-white mb-4">CBC Assessments</h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-4 font-medium">
            Click a level button to mark · Click the same button again to clear · 
            <span className="ml-2 inline-flex gap-1 items-center">
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded text-[9px] font-bold">EE</span>Exceeds &nbsp;
              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-[9px] font-bold">ME</span>Meets &nbsp;
              <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-[9px] font-bold">AE</span>Approaching &nbsp;
              <span className="px-2 py-0.5 bg-rose-100 text-rose-700 rounded text-[9px] font-bold">BE</span>Below
            </span>
          </p>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white">
                  <th className="p-3 text-left text-[9px] font-bold tracking-wider rounded-tl-xl sticky left-0 bg-slate-900 z-10">Learner</th>
                  {getSubjectsForGrade(selectedGrade).map(la => (
                    <th key={la} className="p-2 text-center text-[8px] font-bold tracking-wider whitespace-nowrap max-w-[100px]">
                      <span className="block truncate">{la}</span>
                    </th>
                  ))}
                  <th className="p-3 text-right text-[9px] font-bold tracking-wider rounded-tr-xl">Report</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {students.filter(s => s.grade === selectedGrade).map((student, si) => (
                  <tr key={student.id} className={si % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50/50 dark:bg-slate-800/30'}>
                    <td className="p-3 sticky left-0 bg-inherit z-10 min-w-[140px]">
                      <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">{student.name}</p>
                      <p className="text-[9px] text-slate-400">{student.admissionNumber}</p>
                    </td>
                    {getSubjectsForGrade(selectedGrade).map(la => {
                      const assessment = assessments.find(a => a.studentId === student.id && a.learningArea === la);
                      const currentLevel = assessment?.level || '';
                      const baseOf = (l: string) => l.slice(0, 2); // 'EE1' -> 'EE'
                      
                      const SUB_LEVELS: { label: string; base: string; num: string; activeClass: string; hoverClass: string }[] = [
                        { label: 'EE1', base: 'EE', num: '1', activeClass: 'bg-emerald-600 text-white border-emerald-600 shadow-emerald-200 shadow-lg', hoverClass: 'hover:bg-emerald-50 hover:border-emerald-400 hover:text-emerald-700' },
                        { label: 'EE2', base: 'EE', num: '2', activeClass: 'bg-emerald-400 text-white border-emerald-400 shadow-emerald-100 shadow-md', hoverClass: 'hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-600' },
                        { label: 'ME1', base: 'ME', num: '1', activeClass: 'bg-blue-600 text-white border-blue-600 shadow-blue-200 shadow-lg', hoverClass: 'hover:bg-blue-50 hover:border-blue-400 hover:text-blue-700' },
                        { label: 'ME2', base: 'ME', num: '2', activeClass: 'bg-blue-400 text-white border-blue-400 shadow-blue-100 shadow-md', hoverClass: 'hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600' },
                        { label: 'AE1', base: 'AE', num: '1', activeClass: 'bg-amber-500 text-white border-amber-500 shadow-amber-200 shadow-lg', hoverClass: 'hover:bg-amber-50 hover:border-amber-400 hover:text-amber-700' },
                        { label: 'AE2', base: 'AE', num: '2', activeClass: 'bg-amber-300 text-white border-amber-300 shadow-amber-100 shadow-md', hoverClass: 'hover:bg-amber-50 hover:border-amber-300 hover:text-amber-600' },
                        { label: 'BE1', base: 'BE', num: '1', activeClass: 'bg-rose-600 text-white border-rose-600 shadow-rose-200 shadow-lg', hoverClass: 'hover:bg-rose-50 hover:border-rose-400 hover:text-rose-700' },
                        { label: 'BE2', base: 'BE', num: '2', activeClass: 'bg-rose-400 text-white border-rose-400 shadow-rose-100 shadow-md', hoverClass: 'hover:bg-rose-50 hover:border-rose-300 hover:text-rose-600' },
                      ];

                      return (
                        <td key={la} className="p-1.5 text-center">
                          <div className="flex flex-wrap gap-0.5 justify-center max-w-[170px]">
                            {SUB_LEVELS.map(sl => {
                              const isActive = currentLevel === sl.label;
                              return (
                                <button
                                  key={sl.label}
                                  onClick={() => handleAssessmentChange(
                                    student.id, la,
                                    isActive ? '' : sl.label
                                  )}
                                  title={isActive ? `Clear ${sl.label}` : `Set ${sl.label}`}
                                  className={`text-[8px] font-black px-1.5 py-0.5 rounded border transition-all duration-150 ${
                                    isActive
                                      ? sl.activeClass
                                      : `bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 ${sl.hoverClass}`
                                  }`}
                                >
                                  {sl.label}
                                </button>
                              );
                            })}
                          </div>
                        </td>
                      );
                    })}
                    <td className="p-3 text-right">
                      <button
                        onClick={() => handleOpenReport(student)}
                        className="p-2 hover:bg-orange-50 dark:hover:bg-slate-700 text-slate-400 hover:text-orange-600 dark:hover:text-orange-400 rounded-lg transition-colors group"
                        title="Open report builder"
                      >
                        <Palette size={16} className="group-hover:scale-110 transition-transform" />
                      </button>
                    </td>
                  </tr>
                ))}
                {students.filter(s => s.grade === selectedGrade).length === 0 && (
                  <tr>
                    <td colSpan={getSubjectsForGrade(selectedGrade).length + 2} className="py-16 text-center text-slate-400 text-sm font-semibold">
                      No learners enrolled in {selectedGrade} yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Progress Reports Tab */}
      {activeTab === 'reports' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex flex-col gap-1">
              <p className="text-sm text-black dark:text-white">Select a learner to view or print their summative assessment report.</p>
              <button onClick={() => handleOpenReport({ id: 'sample-123', name: 'John Doe (Sample)', admissionNumber: 'SCH/2026/000', grade: 'Grade 4', stream: 'North', status: 'Active', parentInfo: {} })}
                className="flex items-center gap-2 w-fit px-4 py-1.5 bg-orange-100 text-orange-600 rounded-lg text-xs font-bold hover:bg-orange-200">
                <FileText size={14} /> View Sample Report Card
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {students.filter(s => s.grade === selectedGrade).map(student => (
              <div key={student.id} className="group relative bg-white dark:bg-slate-800 rounded-[2rem] p-8 border border-slate-200/60 dark:border-slate-700 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden">
                <div className="relative z-10">
                  <div className="flex items-center gap-5 mb-8">
                    <div className="w-16 h-16 rounded-[1.5rem] bg-slate-50 dark:bg-slate-900 flex items-center justify-center text-2xl font-bold text-black dark:text-white border border-slate-100 dark:border-slate-800 shadow-sm group-hover:scale-110 transition-transform duration-500">
                      {student.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="text-xl font-bold text-black dark:text-white tracking-tight leading-none mb-2">{student.name}</h4>
                      <p className="text-xs font-semibold text-black dark:text-white">Adm: {student.admissionNumber}</p>
                    </div>
                  </div>
                  <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 mb-8">
                    <div className="flex items-center justify-between text-[11px] font-bold text-black dark:text-white">
                      <span>Academic Model</span>
                      <span className="text-black dark:text-white">{student.grade} • {student.stream}</span>
                    </div>
                  </div>
                  <button onClick={() => handleOpenReport(student)}
                    className="w-full py-3.5 bg-orange-600 text-white font-bold text-xs rounded-xl hover:shadow-lg hover:bg-orange-700 transition-all active:scale-95 flex items-center justify-center gap-2">
                    View Report Card <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            ))}
            {students.filter(s => s.grade === selectedGrade).length === 0 && (
              <div className="col-span-3 text-center py-16 text-black dark:text-white">
                <GraduationCap size={48} className="mx-auto mb-4 opacity-30" />
                <p className="font-semibold">No learners enrolled in {selectedGrade} yet.</p>
                <p className="text-sm">Add learners via the Learner Management module.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AcademicModule;


