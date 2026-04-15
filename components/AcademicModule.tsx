
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
import { collection, query, where, onSnapshot, getDocs, addDoc, updateDoc, doc, setDoc, getDoc, deleteDoc } from 'firebase/firestore';
import { Student, Assessment, CBCGrade } from '../types';

const AcademicModule: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'hierarchy' | 'assessments' | 'reports'>('hierarchy');
  const [selectedGrade, setSelectedGrade] = useState<CBCGrade>(CBCGrade.G4);
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [timetable, setTimetable] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [schoolProfile, setSchoolProfile] = useState<any>(null);
  const [isEditingReport, setIsEditingReport] = useState(false);
  const [reportThemeColor, setReportThemeColor] = useState('orange');
  const [isThemePickerOpen, setIsThemePickerOpen] = useState(false);
  const [reportTeacherRemark, setReportTeacherRemark] = useState('');
  const [reportHtRemark, setReportHtRemark] = useState('');
  const [showSendConfirmModal, setShowSendConfirmModal] = useState(false);

  // Only grades that have students enrolled
  const activeGradesList = useMemo(() => {
    const gradesWithStudents = [...new Set(students.map(s => s.grade as string))];
    const order = ['PP1','PP2','Grade 1','Grade 2','Grade 3','Grade 4','Grade 5','Grade 6','Grade 7','Grade 8','Grade 9','Grade 10','Grade 11','Grade 12'];
    return order.filter(g => gradesWithStudents.includes(g));
  }, [students]);

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

      unsubs.push(onSnapshot(query(collection(db, 'students'), where('schoolId', '==', schoolId)), snap => {
        setStudents(snap.docs.map(d => ({ id: d.id, ...d.data() } as Student)));
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

      unsubs.push(onSnapshot(doc(db, 'users', schoolId), docSnap => {
        if (docSnap.exists()) setSchoolProfile({ id: docSnap.id, ...docSnap.data() });
      }));
    };

    fetchData();
    return () => unsubs.forEach(unsub => unsub());
  }, []);

  const handleAssessmentChange = async (studentId: string, learningArea: string, level: any) => {
    const user = auth.currentUser;
    if (!user) return;
    let schoolId = user.uid;
    const staffDocSnap = await getDoc(doc(db, 'staff', user.uid));
    if (staffDocSnap.exists()) schoolId = staffDocSnap.data().schoolId;

    const existing = assessments.find(a => a.studentId === studentId && a.learningArea === learningArea);
    const assessmentData = { schoolId, studentId, learningArea, level, term: 'Current Term', year: new Date().getFullYear(), strand: 'General', remarks: existing?.remarks || '' };

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

  // Get subjects for grade from timetable, fallback to constants
  const getSubjectsForGrade = (grade: string): string[] => {
    const fromTimetable = [...new Set(timetable.filter(t => t.grade === grade && t.subject).map((t: any) => t.subject as string))];
    if (fromTimetable.length > 0) return fromTimetable;
    const isJunior = grade.startsWith('Grade 7') || grade.startsWith('Grade 8') || grade.startsWith('Grade 9');
    return isJunior ? JUNIOR_SECONDARY_LEARNING_AREAS : LOWER_PRIMARY_LEARNING_AREAS;
  };

  // WhatsApp send
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

  const reportRef = useRef<HTMLDivElement>(null);
  const handlePrintReport = useReactToPrint({ contentRef: reportRef });

  const handleDownloadPDF = () => { toast.success('Preparing download...'); handlePrintReport(); };

  const handleOpenReport = (student: any) => {
    setSelectedStudent(student);
    setReportTeacherRemark('');
    setReportHtRemark('');
    setShowSendConfirmModal(false);
    setIsEditingReport(false);
    setShowReportModal(true);
  };

  // -------------------- Sample performance data --------------------
  const performanceData = [
    { term: 'Term 1, 2024', score: 2.5 },
    { term: 'Term 2, 2024', score: 3.0 },
    { term: 'Term 3, 2024', score: 2.8 },
    { term: 'Term 1, 2025', score: 3.2 },
    { term: 'Term 2, 2025', score: 3.5 },
    { term: 'Term 3, 2025', score: 3.8 },
    { term: 'Term 1, 2026', score: 4.0 },
  ];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const score = payload[0].value;
      const level = score >= 3.5 ? 'EE' : score >= 2.5 ? 'ME' : score >= 1.5 ? 'AE' : 'BE';
      return (
        <div className="bg-white border border-slate-200 rounded-[1rem] p-4 shadow-xl">
          <p className="text-[10px] font-bold text-slate-500 mb-1">{label}</p>
          <p className="text-sm font-bold flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded text-[10px] ${level === 'EE' ? 'bg-orange-100 text-orange-600' : level === 'ME' ? 'bg-orange-100 text-orange-600' : level === 'AE' ? 'bg-amber-100 text-amber-600' : 'bg-rose-100 text-rose-600'}`}>{level}</span>
            Score: {score.toFixed(1)}
          </p>
        </div>
      );
    }
    return null;
  };

  // ----------------------- REPORT MODAL --------------------------
  if (showReportModal && selectedStudent) {
    const isSample = selectedStudent.id === 'sample-123';
    const subjects = isSample ? LOWER_PRIMARY_LEARNING_AREAS : getSubjectsForGrade(selectedStudent.grade);

    const THEME_MAP: any = {
      orange:  { hex: '#ea580c', bg: 'bg-orange-600',  bgLight: 'bg-orange-50',  text: 'text-orange-600',  border: 'border-orange-100',  shadow: 'shadow-orange-200'  },
      blue:    { hex: '#0284c7', bg: 'bg-blue-600',    bgLight: 'bg-blue-50',    text: 'text-blue-600',    border: 'border-blue-100',    shadow: 'shadow-blue-200'    },
      emerald: { hex: '#059669', bg: 'bg-emerald-600', bgLight: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-100', shadow: 'shadow-emerald-200' },
      purple:  { hex: '#7c3aed', bg: 'bg-purple-600',  bgLight: 'bg-purple-50',  text: 'text-purple-600',  border: 'border-purple-100',  shadow: 'shadow-purple-200'  },
    };
    const theme = THEME_MAP[reportThemeColor] || THEME_MAP.orange;
    const getThemeBg = (c: string) => (THEME_MAP[c] || THEME_MAP.orange).bg;

    const LEVELS = ['EE', 'ME', 'AE', 'BE'];
    const handleCycleLevel = async (la: string) => {
      if (!isEditingReport || isSample) return;
      const existing = assessments.find(a => a.studentId === selectedStudent.id && a.learningArea === la);
      const idx = existing?.level ? LEVELS.indexOf(existing.level) : -1;
      const next = idx < LEVELS.length - 1 ? LEVELS[idx + 1] : '';
      await handleAssessmentChange(selectedStudent.id, la, next);
    };

    const dotClass = (l: string) => l === 'EE' ? theme.bg : l === 'ME' ? theme.bg + ' opacity-70' : l === 'AE' ? 'bg-amber-500' : 'bg-rose-500';

    const handleClearReport = async () => {
      if (!isSample && window.confirm("Clear all assessments for this learner?")) {
        for (const a of assessments.filter(a => a.studentId === selectedStudent.id)) {
          await deleteDoc(doc(db, 'assessments', a.id));
        }
        toast.success("Learner's assessments cleared.");
        setIsEditingReport(false);
      }
    };

    const parentPhone = selectedStudent?.parentInfo?.fatherPhone || selectedStudent?.parentInfo?.motherPhone || '';

    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        {/* Action Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
          <button onClick={() => { setShowReportModal(false); setIsEditingReport(false); }}
            className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50 rounded-xl">
            <ChevronRight size={16} className="rotate-180" /> Back To Reports
          </button>
          <div className="flex flex-wrap items-center gap-3">
            {/* Theme */}
            <div className="relative">
              <button onClick={() => setIsThemePickerOpen(v => !v)}
                className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-200">
                <Palette size={15} /> Theme <div className={`w-3 h-3 rounded-full ${theme.bg}`} />
              </button>
              {isThemePickerOpen && (
                <div className="absolute top-12 left-0 bg-white p-3 rounded-xl border border-slate-200 flex gap-2 shadow-xl z-50">
                  {['orange','blue','emerald','purple'].map(c => (
                    <button key={c} onClick={() => { setReportThemeColor(c); setIsThemePickerOpen(false); }}
                      className={`w-7 h-7 rounded-full ring-2 ring-offset-2 transition-transform hover:scale-110 ${reportThemeColor === c ? 'ring-slate-400' : 'ring-transparent'} ${getThemeBg(c)}`} />
                  ))}
                </div>
              )}
            </div>
            <div className="h-5 w-px bg-slate-200" />
            {/* Edit */}
            <button onClick={() => setIsEditingReport(v => !v)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold ${isEditingReport ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
              <Edit2 size={15} /> {isEditingReport ? 'Done Editing' : 'Edit Report'}
            </button>
            {isEditingReport && !isSample && (
              <button onClick={handleClearReport} className="flex items-center gap-2 px-4 py-2 bg-rose-50 text-rose-600 rounded-xl text-xs font-bold hover:bg-rose-100">
                <Trash2 size={15} /> Clear Data
              </button>
            )}
            <div className="h-5 w-px bg-slate-200" />
            <button onClick={handleDownloadPDF} className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-200">
              <Download size={15} /> Download
            </button>
            <button onClick={() => handlePrintReport()} className={`flex items-center gap-2 px-4 py-2 ${theme.bg} text-white rounded-xl text-xs font-bold active:scale-95`}>
              <Printer size={15} /> Print
            </button>
            {!isSample && (
              <button onClick={() => setShowSendConfirmModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-xl text-xs font-bold hover:bg-green-600 active:scale-95">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347zm-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884zm8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                Send To Parent
              </button>
            )}
          </div>
        </div>

        {/* WhatsApp Confirm Modal */}
        {showSendConfirmModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full space-y-5">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-100 rounded-2xl flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="#16a34a"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347zm-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884zm8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Send Report To Parent</h3>
                  <p className="text-xs text-slate-500">via WhatsApp</p>
                </div>
              </div>
              <div className="bg-slate-50 p-4 rounded-2xl space-y-1 text-sm">
                <p className="font-semibold text-slate-600">Student: <span className="text-slate-900 font-bold">{selectedStudent.name}</span></p>
                <p className="font-semibold text-slate-600">Grade: <span className="text-slate-900 font-bold">{selectedStudent.grade}</span></p>
                <p className="font-semibold text-slate-600">Parent Phone: <span className="text-green-600 font-bold">{parentPhone || 'Not set'}</span></p>
              </div>
              <p className="text-xs text-slate-500">Please confirm all report data is complete. A pre-filled WhatsApp message will open for you to send.</p>
              <div className="flex gap-3">
                <button onClick={() => setShowSendConfirmModal(false)} className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-200">Cancel</button>
                <button onClick={() => handleSendToWhatsApp(selectedStudent)} className="flex-1 py-3 bg-green-500 text-white rounded-xl text-sm font-bold hover:bg-green-600 flex items-center justify-center gap-2">Confirm & Send</button>
              </div>
            </div>
          </div>
        )}

        {/* A3 Report */}
        <div className="w-full overflow-x-auto bg-slate-100 p-4 sm:p-8 rounded-3xl flex justify-center">
          <div ref={reportRef} className="bg-white shadow-lg border border-slate-200 shrink-0 mx-auto" style={{ width: '297mm', minHeight: '420mm', padding: '15mm' }}>
            {/* Header */}
            <div className="flex items-center justify-between border-b-2 border-slate-100 pb-8">
              <div className="flex items-center gap-6">
                {schoolProfile?.logoUrl
                  ? <img src={schoolProfile.logoUrl} alt="Logo" className="w-24 h-24 object-contain rounded-2xl border border-slate-100" />
                  : <div className={`w-24 h-24 ${theme.bg} rounded-3xl flex items-center justify-center text-white shadow-xl`}><GraduationCap size={44} /></div>
                }
                <div>
                  <h1 className="text-2xl font-bold text-slate-900 mb-1">{schoolProfile?.schoolName || 'BrightSoma Academy'}</h1>
                  <p className="text-xs font-bold text-slate-600 tracking-widest uppercase">Ministry Of Education: Reg/Sch/{schoolProfile?.id?.substring(0,6) || '2024'}</p>
                  <p className="text-xs text-slate-500 mt-1">{schoolProfile?.address || 'P.O Box 123-00100, Nairobi'} | info@{(schoolProfile?.schoolName?.split(' ')[0] || 'brightsoma').toLowerCase()}.edu</p>
                </div>
              </div>
              <div className="text-right">
                <div className={`inline-block px-4 py-1.5 ${theme.bgLight} ${theme.text} rounded-full text-[10px] font-bold tracking-widest mb-3 border ${theme.border}`}>Academic Progress Report</div>
                <h2 className="text-xl font-bold text-slate-900 mb-0.5">Term 1, 2026</h2>
                <p className="text-xs font-semibold text-slate-500">Academic Year: 2026</p>
              </div>
            </div>

            {/* Student Details */}
            <div className="grid grid-cols-4 gap-6 bg-slate-50 p-8 rounded-2xl border border-slate-100/50 mt-8">
              {[
                { label: 'Learner Name', value: selectedStudent.name },
                { label: 'Admission No', value: selectedStudent.admissionNumber },
                { label: 'Grade / Level', value: selectedStudent.grade },
                { label: 'Stream', value: selectedStudent.stream },
              ].map(({ label, value }) => (
                <div key={label} className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</p>
                  <p className="text-sm font-bold text-slate-800">{value}</p>
                </div>
              ))}
            </div>

            {/* Assessment Table */}
            <div className="space-y-4 mt-8">
              <div className="flex items-center gap-3">
                <div className={`h-7 w-1.5 ${theme.bg} rounded-full`}></div>
                <h3 className="text-base font-bold text-slate-900">Learning Area Performance</h3>
                {isEditingReport && <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-lg">Click row to cycle EE → ME → AE → BE</span>}
              </div>
              <div className="rounded-2xl overflow-hidden border border-slate-100 shadow-sm">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-slate-900 text-white">
                      <th className="p-3 px-4 text-left text-[10px] font-bold tracking-widest">Subject / Learning Area</th>
                      {['EE','ME','AE','BE'].map(l => (
                        <th key={l} className={`p-3 text-center text-[10px] font-bold tracking-widest w-16 ${l === 'EE' ? theme.bg : l === 'ME' ? theme.bg + ' opacity-80' : l === 'AE' ? 'bg-amber-500' : 'bg-rose-500'}`}>{l}</th>
                      ))}
                      <th className="p-3 px-4 text-left text-[10px] font-bold tracking-widest">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {subjects.map((la, i) => {
                      const sa = assessments.find(a => a.studentId === selectedStudent.id && a.learningArea === la);
                      const displayLevel = isSample ? LEVELS[i % 4] : sa?.level;
                      return (
                        <tr key={la} className={`${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'} ${isEditingReport ? 'cursor-pointer' : ''}`} onClick={() => handleCycleLevel(la)}>
                          <td className="p-3 px-4 text-xs font-bold text-slate-700">{la}</td>
                          {['EE','ME','AE','BE'].map(l => (
                            <td key={l} className="p-3 text-center">
                              {displayLevel === l
                                ? <div className={`mx-auto w-4 h-4 rounded-full ${dotClass(l)} ${isEditingReport ? 'scale-110' : ''}`}></div>
                                : isEditingReport && !isSample
                                  ? <div className="mx-auto w-4 h-4 rounded-full border-2 border-slate-200 opacity-30 hover:opacity-60"></div>
                                  : null
                              }
                            </td>
                          ))}
                          <td className="p-2 px-4" onClick={e => e.stopPropagation()}>
                            {isEditingReport && !isSample ? (
                              <textarea
                                defaultValue={sa?.remarks || ''}
                                onBlur={async e => { if (sa) await updateDoc(doc(db, 'assessments', sa.id), { remarks: e.target.value }); }}
                                placeholder="Type remark..."
                                rows={1}
                                className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-medium text-slate-700 outline-none resize-none focus:ring-1 focus:ring-slate-300"
                              />
                            ) : (
                              <p className="text-[10px] text-slate-500 italic">{sa?.remarks || (isSample ? 'Excellent understanding shown in this area.' : '—')}</p>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Teacher & HT Remarks */}
            <div className="grid grid-cols-2 gap-6 mt-8">
              <div className="space-y-2">
                <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Class Teacher's Remarks</h4>
                {isEditingReport && !isSample ? (
                  <textarea value={reportTeacherRemark} onChange={e => setReportTeacherRemark(e.target.value)} rows={3} placeholder="Type class teacher's remarks..."
                    className="w-full p-4 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 outline-none resize-none focus:ring-2 focus:ring-slate-300" />
                ) : (
                  <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 min-h-[90px] flex items-center">
                    <p className="text-xs font-semibold text-slate-700 italic">{reportTeacherRemark || (isSample ? '"An exceptionally talented learner."' : '"Progress is noted. Encouraged to maintain focus."')}</p>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Headteacher's Remark</h4>
                {isEditingReport && !isSample ? (
                  <textarea value={reportHtRemark} onChange={e => setReportHtRemark(e.target.value)} rows={3} placeholder="Type headteacher's remark..."
                    className="w-full p-4 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 outline-none resize-none focus:ring-2 focus:ring-slate-300" />
                ) : (
                  <div className={`p-6 ${theme.bgLight} rounded-2xl border ${theme.border} min-h-[90px] flex items-center`}>
                    <p className={`text-xs font-bold ${theme.text} italic`}>{reportHtRemark || (isSample ? '"Approved for promotion with distinction."' : '"Good performance. Keep striving for excellence."')}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Performance Trend */}
            <div className="mt-8 pt-6 border-t border-slate-100">
              <div className="flex items-center gap-3 mb-4">
                <TrendingUp size={18} className={theme.text} />
                <h3 className="text-base font-bold text-slate-900">Performance Analytics</h3>
              </div>
              <div className="h-52 w-full bg-slate-50 rounded-2xl border border-slate-100 p-6">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={performanceData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="cScore" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={theme.hex} stopOpacity={0.3}/>
                        <stop offset="95%" stopColor={theme.hex} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="term" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 700 }} dy={10} />
                    <YAxis domain={[0,4]} ticks={[1,2,3,4]} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 700 }}
                      tickFormatter={v => v===4?'EE':v===3?'ME':v===2?'AE':v===1?'BE':''} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="score" stroke={theme.hex} strokeWidth={3} fillOpacity={1} fill="url(#cScore)"
                      activeDot={{ r: 6, fill: theme.hex, stroke: '#fff', strokeWidth: 3 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Signatures */}
            <div className="pt-12 mt-8 flex justify-between items-end border-t border-slate-100">
              <div className="text-center space-y-3">
                <div className="w-40 border-b-2 border-slate-800 mx-auto"></div>
                <p className="text-[10px] font-bold tracking-widest text-slate-600">Class Teacher Signature</p>
              </div>
              <div className="text-center space-y-2 relative">
                <div className="absolute -top-14 left-1/2 -translate-x-1/2 opacity-20">
                  <div className={`w-28 h-28 border-[6px] ${theme.border} rounded-full flex items-center justify-center -rotate-12`}>
                    <p className={`text-[9px] font-bold ${theme.text} uppercase text-center leading-tight`}>{schoolProfile?.schoolName?.split(' ')[0] || 'School'}<br/>Official Seal</p>
                  </div>
                </div>
                <p className="text-[10px] tracking-widest text-slate-400 italic">No Stamp Required For E-Report</p>
              </div>
              <div className="text-center space-y-3">
                <div className="w-40 border-b-2 border-slate-800 mx-auto"></div>
                <p className="text-[10px] font-bold tracking-widest text-slate-600">Headteacher Signature</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ---------------------- MAIN MODULE UI -------------------------
  return (
    <div className="space-y-10 animate-in fade-in duration-700 font-sans">
      {/* Header */}
      <div className="w-[100vw] relative left-1/2 -ml-[50vw] -mt-4 md:-mt-8 bg-slate-900 py-5 border-b border-white/10 shadow-sm">
        <div className="w-full max-w-7xl mx-auto px-4 md:px-8">
          <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/10 rounded-xl"><BookOpen size={24} className="text-white" /></div>
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight">Academic Excellence</h2>
                <p className="text-xs text-blue-100 mt-1">Foundational grade assessment engine and learner performance analytics.</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="px-5 py-2.5 bg-black/20 border border-white/10 rounded-xl min-w-[120px]">
                <p className="text-xs font-bold text-blue-200 mb-0.5">Active Grades</p>
                <p className="text-lg font-bold text-white leading-none">{activeGradesList.length || CBC_GRADES.length}</p>
              </div>
            </div>
          </div>
          <div className="mt-8 pt-6 border-t border-white/10 flex flex-col xl:flex-row xl:items-center justify-between gap-6">
            <div className="flex p-1.5 bg-black/10 border border-white/10 rounded-[2rem] overflow-x-auto">
              {[
                { id: 'hierarchy', label: 'School Structure', icon: <Layers size={14} strokeWidth={2.5} /> },
                { id: 'assessments', label: 'Learner Marks', icon: <ClipboardCheck size={14} strokeWidth={2.5} /> },
                { id: 'reports', label: 'Progress Reports', icon: <FileText size={14} strokeWidth={2.5} /> },
              ].map(tab => (
                <button key={tab.id} onClick={() => setActiveSubTab(tab.id as any)}
                  className={`flex items-center gap-2 px-6 py-2.5 rounded-[1.5rem] text-[11px] font-bold whitespace-nowrap transition-all duration-300 ${activeSubTab === tab.id ? 'bg-white text-orange-600 shadow-lg scale-105' : 'text-white/60 hover:text-white hover:bg-white/5'}`}>
                  {tab.icon}{tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* School Structure Tab */}
      {activeSubTab === 'hierarchy' && (
        <div className="space-y-8 animate-in fade-in duration-700">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            {(activeGradesList.length > 0 ? activeGradesList : CBC_GRADES).map(grade => {
              const gradeStudents = students.filter(s => s.grade === grade);
              const gradeTimetable = timetable.filter(t => t.grade === grade);
              const educatorsCount = new Set(gradeTimetable.map(t => t.teacher)).size;
              const classTeacher = staff.find(s => s.role === 'TEACHER' && s.assignedGrade === grade)?.name || 'Unassigned';
              return (
                <div key={grade} className="rounded-[2rem] shadow-sm border border-slate-200/60 hover:shadow-md transition-shadow overflow-hidden bg-gradient-to-br from-orange-50/50 via-white to-orange-100/20 flex flex-col relative group cursor-pointer">
                  <button className="absolute right-4 top-4 bg-white/50 w-7 h-7 rounded-full flex items-center justify-center text-slate-400 group-hover:text-orange-600 transition-colors"><ChevronRight size={14}/></button>
                  <div className="bg-slate-50/80 p-5 pb-4 border-b border-slate-200/60 flex items-center gap-3">
                    <Layers size={18} className="text-orange-500" />
                    <p className="text-sm font-bold text-slate-700">{grade}</p>
                  </div>
                  <div className="p-5 pt-4 bg-white/50 flex flex-col gap-2">
                    <p className="text-[13px] font-semibold text-slate-800">{gradeStudents.length} Students</p>
                    <p className="text-xs text-slate-500 font-semibold">
                      <span className="text-orange-600">{educatorsCount}</span> Educators
                      <span className="mx-1 text-slate-300">|</span>
                      <span className="text-slate-500 italic truncate">{classTeacher}</span>
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Learner Marks Tab */}
      {activeSubTab === 'assessments' && (
        <div className="pt-4">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-slate-800">Cbc Assessments</h3>
            <select value={selectedGrade} onChange={e => setSelectedGrade(e.target.value as CBCGrade)}
              className="px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold outline-none">
              {(activeGradesList.length > 0 ? activeGradesList : CBC_GRADES).map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-50">
                  <th className="p-4 text-left text-[10px] font-bold text-slate-600 uppercase">Learner</th>
                  {getSubjectsForGrade(selectedGrade).slice(0, 5).map(la => (
                    <th key={la} className="p-4 text-center text-[10px] font-bold text-slate-600 uppercase">{la}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {students.filter(s => s.grade === selectedGrade).map(student => (
                  <tr key={student.id}>
                    <td className="p-4">
                      <p className="text-sm font-bold text-slate-700">{student.name}</p>
                      <p className="text-[10px] text-slate-600">{student.admissionNumber}</p>
                    </td>
                    {getSubjectsForGrade(selectedGrade).slice(0, 5).map(la => {
                      const assessment = assessments.find(a => a.studentId === student.id && a.learningArea === la);
                      return (
                        <td key={la} className="p-4 text-center">
                          <select value={assessment?.level || ''} onChange={e => handleAssessmentChange(student.id, la, e.target.value)}
                            className={`text-[10px] font-bold px-2 py-1 rounded border outline-none transition-all ${assessment?.level === 'EE' ? 'bg-orange-50 border-orange-200 text-orange-600' : assessment?.level === 'ME' ? 'bg-orange-50 border-orange-200 text-orange-600' : assessment?.level === 'AE' ? 'bg-amber-50 border-amber-200 text-amber-600' : assessment?.level === 'BE' ? 'bg-rose-50 border-rose-200 text-rose-600' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
                            <option value="">-</option>
                            <option value="EE">EE</option>
                            <option value="ME">ME</option>
                            <option value="AE">AE</option>
                            <option value="BE">BE</option>
                          </select>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Progress Reports Tab */}
      {activeSubTab === 'reports' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex flex-col gap-1">
              <p className="text-sm text-slate-500">Select a learner to view or print their summative assessment report.</p>
              <button onClick={() => handleOpenReport({ id: 'sample-123', name: 'John Doe (Sample)', admissionNumber: 'SCH/2026/000', grade: 'Grade 4', stream: 'North', status: 'Active', parentInfo: {} })}
                className="flex items-center gap-2 w-fit px-4 py-1.5 bg-orange-100 text-orange-600 rounded-lg text-xs font-bold hover:bg-orange-200">
                <FileText size={14} /> View Sample Report Card
              </button>
            </div>
            <select value={selectedGrade} onChange={e => setSelectedGrade(e.target.value as CBCGrade)}
              className="px-4 py-2 bg-white border border-slate-100 rounded-xl text-sm font-bold outline-none shadow-sm">
              {(activeGradesList.length > 0 ? activeGradesList : CBC_GRADES).map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {students.filter(s => s.grade === selectedGrade).map(student => (
              <div key={student.id} className="group relative bg-gradient-to-br from-orange-50/50 via-white to-orange-100/20 rounded-[2rem] p-8 border border-slate-200/60 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full blur-2xl -mr-16 -mt-16 group-hover:bg-orange-500/10 transition-all duration-700"></div>
                <div className="relative z-10">
                  <div className="flex items-center gap-5 mb-8">
                    <div className="w-16 h-16 rounded-[1.5rem] bg-white flex items-center justify-center text-2xl font-bold text-slate-800 border border-slate-100 shadow-sm group-hover:scale-110 transition-transform duration-500">
                      {student.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="text-xl font-bold text-slate-800 tracking-tight leading-none mb-2">{student.name}</h4>
                      <p className="text-xs font-semibold text-slate-500">Adm: {student.admissionNumber}</p>
                    </div>
                  </div>
                  <div className="p-4 bg-white/50 rounded-2xl border border-slate-100 mb-8">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-600">
                      <span>Academic Model</span>
                      <span className="text-slate-800">{student.grade} • {student.stream}</span>
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
              <div className="col-span-3 text-center py-16 text-slate-400">
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
