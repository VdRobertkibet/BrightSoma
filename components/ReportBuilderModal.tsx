import React, { useState, useRef, useEffect } from 'react';
import {
  X, Printer, Palette, Edit2, Save, Sparkles,
  ChevronRight, TrendingUp, GraduationCap, Copy,
  MessageSquare, Smartphone, CheckCircle2, Send
} from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { doc, getDoc, setDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '../src/firebase';
import toast from 'react-hot-toast';
import {
  LOWER_PRIMARY_LEARNING_AREAS,
  JUNIOR_SECONDARY_LEARNING_AREAS,
  PERFORMANCE_LEVELS
} from '../constants';

interface ReportBuilderModalProps {
  student: any;
  students?: any[];
  schoolProfile: any;
  assessments: any[];
  onClose: () => void;
  onAssessmentChange: (studentId: string, la: string, level: string) => Promise<void>;
}

// ---- Sub-level definitions ----
const SUB_LEVELS = [
  { label: 'EE1', base: 'EE', activeClass: 'bg-emerald-600 text-white border-emerald-600', dotClass: 'bg-emerald-600' },
  { label: 'EE2', base: 'EE', activeClass: 'bg-emerald-400 text-white border-emerald-400', dotClass: 'bg-emerald-400' },
  { label: 'ME1', base: 'ME', activeClass: 'bg-blue-600 text-white border-blue-600',       dotClass: 'bg-blue-600' },
  { label: 'ME2', base: 'ME', activeClass: 'bg-blue-400 text-white border-blue-400',       dotClass: 'bg-blue-400' },
  { label: 'AE1', base: 'AE', activeClass: 'bg-amber-500 text-white border-amber-500',     dotClass: 'bg-amber-500' },
  { label: 'AE2', base: 'AE', activeClass: 'bg-amber-300 text-white border-amber-300',     dotClass: 'bg-amber-300' },
  { label: 'BE1', base: 'BE', activeClass: 'bg-rose-600 text-white border-rose-600',       dotClass: 'bg-rose-600' },
  { label: 'BE2', base: 'BE', activeClass: 'bg-rose-400 text-white border-rose-400',       dotClass: 'bg-rose-400' },
];

const getBaseLevel = (level: string) => {
  if (!level) return '';
  return level.slice(0, 2); // 'EE1' -> 'EE', 'ME' -> 'ME'
};

const getLevelColor = (level: string) => {
  const base = getBaseLevel(level);
  if (base === 'EE') return 'text-emerald-600';
  if (base === 'ME') return 'text-blue-600';
  if (base === 'AE') return 'text-amber-600';
  if (base === 'BE') return 'text-rose-600';
  return 'text-slate-400';
};

const getLevelDotClass = (level: string) => {
  const sl = SUB_LEVELS.find(s => s.label === level);
  return sl?.dotClass || 'bg-slate-300';
};

// Compute overall summary level (mode of base levels)
const computeOverallLevel = (assessmentList: any[], studentId: string, subjects: string[]) => {
  const baseLevels = subjects
    .map(la => {
      const a = assessmentList.find(a => a.studentId === studentId && a.learningArea === la);
      return a?.level ? getBaseLevel(a.level) : null;
    })
    .filter(Boolean) as string[];
  if (!baseLevels.length) return null;
  const freq: Record<string, number> = {};
  baseLevels.forEach(l => { freq[l] = (freq[l] || 0) + 1; });
  return Object.entries(freq).sort((a, b) => b[1] - a[1])[0][0];
};

const ReportBuilderModal: React.FC<ReportBuilderModalProps> = ({
  student,
  students = [],
  schoolProfile,
  assessments,
  onClose,
  onAssessmentChange
}) => {
  const [currentStudent, setCurrentStudent] = useState(student);
  const [isEditing, setIsEditing] = useState(false);
  const [themeColor, setThemeColor] = useState('orange');
  const [isThemePickerOpen, setIsThemePickerOpen] = useState(false);
  const [teacherRemark, setTeacherRemark] = useState('');
  const [htRemark, setHtRemark] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [showSmsModal, setShowSmsModal] = useState(false);
  const [smsCopied, setSmsCopied] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null); // 'pct-{la}' | 'pnt-{la}'

  // Close custom dropdowns on outside click
  useEffect(() => {
    if (!openDropdown) return;
    const close = () => setOpenDropdown(null);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [openDropdown]);

  const isSample = currentStudent.id === 'sample-123';
  const reportId = `${currentStudent.id}_Term1_2026`;
  const rawSubjects = isSample
    ? LOWER_PRIMARY_LEARNING_AREAS
    : (currentStudent.grade?.startsWith('Grade 7') || currentStudent.grade?.startsWith('Grade 8') || currentStudent.grade?.startsWith('Grade 9'))
    ? JUNIOR_SECONDARY_LEARNING_AREAS
    : LOWER_PRIMARY_LEARNING_AREAS;
  // Remove Life Skills as a safety net
  const subjects = rawSubjects.filter((s: string) => s !== 'Life Skills');

  const [localAssessments, setLocalAssessments] = useState<any[]>([]);

  useEffect(() => {
    if (isSample && localAssessments.length === 0) {
      const initial = subjects.map((la: string, i: number) => ({
        studentId: currentStudent.id,
        learningArea: la,
        level: SUB_LEVELS[i % 8].label,
        percentage: 60 + (i * 5) % 40,
        pnt: (i % 10) + 1,
        remarks: 'Excellent progress'
      }));
      setLocalAssessments(initial);
    } else if (!isSample) {
      setLocalAssessments(assessments);
    }
  }, [assessments, isSample, currentStudent.id]);

  useEffect(() => {
    const fetchRemarks = async () => {
      if (isSample) { setIsLoading(false); return; }
      try {
        const docSnap = await getDoc(doc(db, 'report_remarks', reportId));
        if (docSnap.exists()) {
          const data = docSnap.data();
          setTeacherRemark(data.teacherRemark || '');
          setHtRemark(data.htRemark || '');
        } else {
          setTeacherRemark('');
          setHtRemark('');
        }
      } catch (err) {
        console.error('Error fetching remarks:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchRemarks();
  }, [currentStudent.id, isSample, reportId]);

  const handleSaveRemarks = async () => {
    if (isSample) { toast.success('Sample remarks updated locally.'); return; }
    try {
      await setDoc(doc(db, 'report_remarks', reportId), {
        studentId: currentStudent.id,
        teacherRemark,
        htRemark,
        term: 'Term 1',
        year: 2026,
        updatedAt: serverTimestamp()
      }, { merge: true });
      toast.success('Remarks saved successfully!');
    } catch (err) {
      toast.error('Failed to save remarks.');
    }
  };

  // Toggle: clicking same level clears it; clicking different sets it
  const handleSetLevel = async (la: string, targetLevel: string) => {
    if (!isEditing) return;
    const existing = localAssessments.find(a => a.studentId === currentStudent.id && a.learningArea === la);
    const newLevel = existing?.level === targetLevel ? '' : targetLevel;

    setLocalAssessments(prev => {
      const updated = [...prev];
      const idx = updated.findIndex(a => a.studentId === currentStudent.id && a.learningArea === la);
      if (idx >= 0) {
        updated[idx] = { ...updated[idx], level: newLevel };
      } else if (newLevel) {
        updated.push({ studentId: currentStudent.id, learningArea: la, level: newLevel, percentage: null, pnt: null, remarks: '' });
      }
      return updated;
    });

    if (isSample) return;
    await onAssessmentChange(currentStudent.id, la, newLevel);
  };

  const handleFieldChange = async (la: string, field: 'percentage' | 'pnt', value: number | null) => {
    setLocalAssessments(prev => {
      const updated = [...prev];
      const idx = updated.findIndex(a => a.studentId === currentStudent.id && a.learningArea === la);
      if (idx >= 0) {
        updated[idx] = { ...updated[idx], [field]: value };
      } else {
        updated.push({ studentId: currentStudent.id, learningArea: la, level: '', [field]: value, remarks: '' });
      }
      return updated;
    });

    if (isSample) return;
    const existing = assessments.find(a => a.studentId === currentStudent.id && a.learningArea === la);
    if (existing) {
      await updateDoc(doc(db, 'assessments', existing.id), { [field]: value });
    }
  };

  const handleSubjectRemarkChange = async (la: string, value: string) => {
    setLocalAssessments(prev => {
      const updated = [...prev];
      const idx = updated.findIndex(a => a.studentId === currentStudent.id && a.learningArea === la);
      if (idx >= 0) updated[idx] = { ...updated[idx], remarks: value };
      return updated;
    });
    if (isSample) return;
    const existing = assessments.find(a => a.studentId === currentStudent.id && a.learningArea === la);
    if (existing) await updateDoc(doc(db, 'assessments', existing.id), { remarks: value });
  };

  const generateAIRequest = (la: string, level: string) => {
    const base = getBaseLevel(level) || 'ME';
    const aiRemarks: any = {
      EE: `Demonstrates exceptional understanding and application of concepts in ${la}.`,
      ME: `Meets expectations consistently. Good grasp of ${la}.`,
      AE: `Approaches expectations. Requires a bit more focus to fully master ${la}.`,
      BE: `Below expectations. Needs additional support and practice in ${la}.`
    };
    handleSubjectRemarkChange(la, aiRemarks[base] || `Good effort shown in ${la}.`);
    toast.success(`AI Generated remark for ${la}`);
  };

  const generateAITeacherRemark = () => {
    const overall = computeOverallLevel(localAssessments, currentStudent.id, subjects);
    const levelLabel = overall === 'EE' ? 'exceeds expectations'
      : overall === 'ME' ? 'meets expectations'
      : overall === 'AE' ? 'is approaching expectations'
      : overall === 'BE' ? 'is below expectations' : 'is making progress';
    setTeacherRemark(`${currentStudent.name.split(' ')[0]} ${levelLabel} in most learning areas this term. They show dedication and a positive attitude towards their studies. I encourage continued effort and parental support for even better results next term.`);
    toast.success('AI Generated teacher remark');
  };

  // ---- Build SMS message ----
  const buildSmsMessage = () => {
    const schoolName = schoolProfile?.name || schoolProfile?.schoolName || 'BrightSoma Academy';
    const overall = computeOverallLevel(localAssessments, currentStudent.id, subjects);
    const overallDesc = overall === 'EE' ? 'Exceeds Expectation (EE)'
      : overall === 'ME' ? 'Meets Expectation (ME)'
      : overall === 'AE' ? 'Approaching Expectation (AE)'
      : overall === 'BE' ? 'Below Expectation (BE)'
      : 'Not yet assessed';

    const subjectLines = subjects.map((la: string, i: number) => {
      const a = localAssessments.find(a => a.studentId === currentStudent.id && a.learningArea === la);
      const level = a?.level || '—';
      const pct = a?.percentage != null ? `${a.percentage}%` : '—';
      const pnt = a?.pnt != null ? `PNT:${a.pnt}` : 'PNT:—';
      return `${i + 1}. ${la}: ${level}  ${pct}  ${pnt}`;
    }).join('\n');

    return `Dear Parent/Guardian of ${currentStudent.name},\nGrade: ${currentStudent.grade}\n${schoolName} – CBC Progress Report, Term 1 2026\n\nSubject Performance:\n${subjectLines}\n\nOverall: Your child is performing at ${overallDesc} level.\n\nClass Teacher Remarks: ${teacherRemark || 'Steady progress observed.'}\n\n– ${schoolName}`;
  };

  const handleSaveAndSendSms = async () => {
    await handleSaveRemarks();
    setShowSmsModal(true);
    setSmsCopied(false);
  };

  const smsText = buildSmsMessage();
  const parentPhone = currentStudent.parentInfo?.fatherPhone
    || currentStudent.parentInfo?.motherPhone
    || currentStudent.parentInfo?.guardianPhone
    || '';

  const cleanPhone = parentPhone.replace(/\s+/g, '').replace(/^0/, '254').replace(/[^\d+]/g, '');
  const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(smsText)}`;
  const smsUrl = `sms:${parentPhone}?body=${encodeURIComponent(smsText)}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(smsText).then(() => {
      setSmsCopied(true);
      toast.success('Message copied to clipboard!');
      setTimeout(() => setSmsCopied(false), 3000);
    });
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error('Image size should be less than 2MB'); return; }
    setIsUploadingLogo(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      try {
        if (schoolProfile?.id) {
          await updateDoc(doc(db, 'schools', schoolProfile.id), { logo: base64String });
          toast.success('School logo updated!');
        }
      } catch (err) { toast.error('Failed to update logo.'); }
      finally { setIsUploadingLogo(false); }
    };
    reader.readAsDataURL(file);
  };

  const reportRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({ contentRef: reportRef });

  const THEME_MAP: any = {
    orange:  { hex: '#ea580c', bg: 'bg-orange-600',  bgLight: 'bg-orange-50',  text: 'text-orange-600',  border: 'border-orange-100' },
    blue:    { hex: '#0284c7', bg: 'bg-blue-600',    bgLight: 'bg-blue-50',    text: 'text-blue-600',    border: 'border-blue-100' },
    emerald: { hex: '#059669', bg: 'bg-emerald-600', bgLight: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-100' },
    purple:  { hex: '#7c3aed', bg: 'bg-purple-600',  bgLight: 'bg-purple-50',  text: 'text-purple-600',  border: 'border-purple-100' },
    pink:    { hex: '#db2777', bg: 'bg-pink-600',    bgLight: 'bg-pink-50',    text: 'text-pink-600',    border: 'border-pink-100' },
    brown:   { hex: '#92400e', bg: 'bg-amber-800',   bgLight: 'bg-amber-50',   text: 'text-amber-800',   border: 'border-amber-200' },
  };
  const theme = THEME_MAP[themeColor] || THEME_MAP.orange;

  const performanceData = [
    { term: 'Term 1', score: 2.5 }, { term: 'Term 2', score: 3.0 }, { term: 'Term 3', score: 3.2 }, { term: 'Current', score: 3.8 }
  ];

  return (
    <div className="fixed inset-0 z-[1000] flex flex-col bg-slate-50 w-full h-full overflow-y-auto animate-in fade-in duration-200">

      {/* ── SMS Slide-Up Card ─────────────────────────────────── */}
      {showSmsModal && (
        <div
          className="fixed inset-0 z-[1100] flex flex-col justify-end sm:justify-center sm:items-center sm:p-4"
          style={{ background: 'rgba(0,0,0,0.55)' }}
          onClick={() => setShowSmsModal(false)}
        >
          <div
            className="w-full sm:max-w-lg rounded-t-[2.5rem] sm:rounded-[2rem] overflow-hidden shadow-2xl"
            style={{ animation: 'slideUp 0.28s cubic-bezier(.32,1.1,.65,1) both' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header — BrightSoma brand orange */}
            <div className="bg-gradient-to-br from-orange-600 via-orange-500 to-amber-500 px-6 pt-6 pb-5 text-white">
              {/* Drag handle */}
              <div className="w-10 h-1 bg-white/40 rounded-full mx-auto mb-4 sm:hidden" />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                    <MessageSquare size={22} />
                  </div>
                  <div>
                    <h3 className="font-black text-base tracking-tight">Performance SMS</h3>
                    <p className="text-[11px] text-orange-100 font-semibold mt-0.5">{currentStudent.name} &nbsp;·&nbsp; {parentPhone || <span className="opacity-60 italic">No phone saved</span>}</p>
                  </div>
                </div>
                <button onClick={() => setShowSmsModal(false)} className="p-2.5 hover:bg-white/20 rounded-xl transition-colors">
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="bg-white px-6 pt-5 pb-6 space-y-4">
              {/* Preview */}
              <div>
                <p className="text-[9px] font-black text-slate-400 tracking-widest mb-1.5">MESSAGE PREVIEW</p>
                <div className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-[11px] text-slate-700 font-medium whitespace-pre-wrap leading-relaxed max-h-52 overflow-y-auto">
                  {smsText}
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-2.5">
                {/* Copy — primary for PC */}
                <button
                  onClick={handleCopy}
                  className={`flex items-center gap-3 w-full px-5 py-3.5 rounded-2xl font-bold text-sm transition-all active:scale-[.98] ${
                    smsCopied
                      ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200'
                      : 'bg-slate-100 text-slate-800 hover:bg-slate-200'
                  }`}
                >
                  {smsCopied ? <CheckCircle2 size={18} /> : <Copy size={18} />}
                  <span>{smsCopied ? '✓ Copied! Paste into WhatsApp or SMS' : 'Copy to Clipboard  (best for PC)'}</span>
                </button>

                {/* WhatsApp — PC + Mobile */}
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => toast.success('WhatsApp opened!')}
                  className="flex items-center gap-3 w-full px-5 py-3.5 rounded-2xl font-bold text-sm bg-[#25D366] text-white hover:bg-[#20bf5a] transition-all active:scale-[.98] shadow-lg shadow-green-200"
                >
                  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current flex-shrink-0" xmlns="http://www.w3.org/2000/svg">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                  Send via WhatsApp &nbsp;<span className="text-white/70 text-[10px] font-semibold">(PC & Mobile)</span>
                </a>

                {/* Native SMS — mobile */}
                <a
                  href={smsUrl}
                  onClick={() => toast.success('SMS app opened!')}
                  className="flex items-center gap-3 w-full px-5 py-3.5 rounded-2xl font-bold text-sm bg-blue-600 text-white hover:bg-blue-700 transition-all active:scale-[.98] shadow-lg shadow-blue-200"
                >
                  <Smartphone size={18} className="flex-shrink-0" />
                  Open SMS App &nbsp;<span className="text-white/70 text-[10px] font-semibold">(Mobile only)</span>
                </a>
              </div>

              <p className="text-[10px] text-slate-400 text-center font-medium pt-1">
                💡 On PC? <strong className="text-slate-600">Copy</strong> then paste in WhatsApp Desktop or any messaging app
              </p>
            </div>
          </div>

          {/* Slide-up keyframe injected inline */}
          <style>{`@keyframes slideUp { from { transform: translateY(100%); opacity:.6 } to { transform: translateY(0); opacity:1 } }`}</style>
        </div>
      )}

      {/* ── Top Bar ─────────────────────────────────────────────── */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-4 flex items-center shadow-sm sticky top-0 z-50 overflow-x-auto whitespace-nowrap hide-scrollbar gap-4 sm:gap-6">
        <div className="flex items-center gap-4 flex-shrink-0">
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
            <X size={20} className="text-slate-500" />
          </button>
          <div>
            <h2 className="text-sm font-black text-slate-900">Report Builder</h2>
            <p className="text-[10px] font-bold text-slate-400 tracking-widest">{currentStudent.name} · {currentStudent.grade}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 ml-auto flex-shrink-0">
          {/* Theme Picker */}
          <div className="relative">
            <button onClick={() => setIsThemePickerOpen(!isThemePickerOpen)} className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition-all">
              <Palette size={18} className={theme.text} />
            </button>
            {isThemePickerOpen && (
              <div className="absolute top-12 right-0 bg-white p-3 rounded-2xl border border-slate-200 shadow-2xl flex gap-2 z-50 animate-in fade-in zoom-in duration-200">
                {['orange','blue','emerald','purple','pink','brown'].map(c => (
                  <button key={c} onClick={() => { setThemeColor(c); setIsThemePickerOpen(false); }}
                    className={`w-8 h-8 rounded-full ${THEME_MAP[c].bg} ring-2 ring-offset-2 ${themeColor === c ? 'ring-slate-400' : 'ring-transparent'} hover:scale-110 transition-transform`} />
                ))}
              </div>
            )}
          </div>

          <div className="h-8 w-px bg-slate-200 mx-1" />

          <button onClick={() => setIsEditing(!isEditing)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${isEditing ? 'bg-slate-900 text-white shadow-xl' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
            <Edit2 size={14} /> {isEditing ? 'Finish Building' : 'Start Building'}
          </button>

          {isEditing && (
            <>
              <button onClick={handleSaveRemarks}
                className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 text-white rounded-xl text-xs font-bold hover:bg-emerald-600 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all">
                <Save size={14} /> Save All
              </button>
              <button onClick={handleSaveAndSendSms}
                className="flex items-center gap-2 px-5 py-2.5 bg-teal-600 text-white rounded-xl text-xs font-bold hover:bg-teal-700 shadow-lg shadow-teal-500/20 active:scale-95 transition-all">
                <Send size={14} /> Save & Send SMS
              </button>
            </>
          )}

          <button onClick={handlePrint}
            className="flex items-center gap-2 px-5 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-200 transition-all">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
            Print Report
          </button>
        </div>
      </div>

      {/* ── Report Body ─────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-8 flex justify-center bg-slate-100/50">
        <div ref={reportRef} className="bg-white shadow-2xl border border-slate-200 p-[12mm] flex flex-col" style={{ width: '210mm', minHeight: '297mm' }}>

          {/* Header */}
          <div className="flex items-center justify-between border-b-2 border-slate-100 pb-4">
            <div className="flex items-center gap-5">
              <div className="relative group">
                {schoolProfile?.logo
                  ? <img src={schoolProfile.logo} alt="Logo" className={`w-20 h-20 object-contain rounded-2xl border border-slate-100 ${isEditing ? 'group-hover:opacity-50' : ''} transition-opacity`} />
                  : <div className={`w-20 h-20 ${theme.bg} rounded-3xl flex items-center justify-center text-white shadow-lg ${isEditing ? 'group-hover:opacity-50' : ''} transition-opacity`}><GraduationCap size={36} /></div>
                }
                {isEditing && (
                  <label className="absolute inset-0 flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 bg-slate-900/40 rounded-2xl transition-opacity">
                    <span className="text-white text-[10px] font-bold">Change</span>
                    <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} disabled={isUploadingLogo} />
                  </label>
                )}
              </div>
              <div>
                <h1 className="text-xl font-black text-slate-900 mb-1">{schoolProfile?.name || schoolProfile?.schoolName || 'BrightSoma Academy'}</h1>
                <p className="text-[10px] text-slate-500 font-medium">
                  {schoolProfile?.county ? `${schoolProfile.subCounty ? schoolProfile.subCounty + ', ' : ''}${schoolProfile.county}` : 'Nairobi, Kenya'} | {schoolProfile?.phone || '+254 700 000000'} | {schoolProfile?.email || 'info@brightsoma.com'}
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className={`inline-block px-4 py-1.5 ${theme.bgLight} ${theme.text} rounded-full text-[10px] font-black tracking-widest mb-3 border ${theme.border}`}>Progress Report</div>
              <h2 className="text-lg font-black text-slate-900 mb-0.5 tracking-tight">Term 1, 2026</h2>
            </div>
          </div>

          {/* Student Info */}
          <div className="grid grid-cols-4 gap-4 bg-slate-50/80 p-4 rounded-2xl border border-slate-100 mt-4">
            <div>
              <p className="text-[9px] font-black text-slate-400 tracking-wider mb-1">Learner Name</p>
              {isEditing && students && students.length > 0 && !isSample ? (
                <select value={currentStudent.id} onChange={e => { const s = students.find(s => s.id === e.target.value); if (s) setCurrentStudent(s); }}
                  className="w-full bg-white border border-slate-200 text-xs font-bold text-slate-900 py-1 px-2 rounded-lg outline-none focus:ring-1 focus:ring-slate-300">
                  {students.filter(s => s.grade === currentStudent.grade).map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              ) : (
                <p className="text-xs font-bold text-slate-900">{currentStudent.name}</p>
              )}
            </div>
            {[
              { label: 'Admission No', value: currentStudent.admissionNumber },
              { label: 'Grade Level', value: currentStudent.grade },
              { label: 'Term / Year', value: 'Term 1, 2026' },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-[9px] font-black text-slate-400 tracking-wider mb-1">{label}</p>
                <p className="text-xs font-bold text-slate-900">{value}</p>
              </div>
            ))}
          </div>

          {/* Assessment Table */}
          <div className="mt-4 space-y-2">
            <div className="flex items-center gap-3 px-1">
              <div className={`w-1.5 h-6 ${theme.bg} rounded-full`} />
              <h3 className="text-sm font-black text-slate-900 tracking-tight">Learning Area Assessment</h3>
              {isEditing && (
                <span className="text-[9px] font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
                  Click level to mark · Click again to clear
                </span>
              )}
            </div>

            <div className="border border-slate-100 rounded-2xl shadow-sm overflow-x-auto hide-scrollbar">
              <table className="w-full border-collapse min-w-[700px]">
                <thead>
                  <tr className="bg-slate-900 text-white text-[9px] font-black tracking-widest">
                    <th className="p-2 pl-4 text-left">No.</th>
                    <th className="p-2 text-left">Subject / Learning Area</th>
                    {/* Sub-level columns */}
                    {SUB_LEVELS.map(sl => (
                      <th key={sl.label} className="p-1 text-center w-8">{sl.label}</th>
                    ))}
                    <th className="p-2 text-center w-14">%</th>
                    <th className="p-2 text-center w-12">PNT</th>
                    <th className="p-2 pr-4 text-left">Teacher Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {subjects.map((la: string, i: number) => {
                    const assessment = localAssessments.find(a => a.studentId === currentStudent.id && a.learningArea === la);
                    const level = assessment?.level || '';
                    const pct = assessment?.percentage ?? null;
                    const pnt = assessment?.pnt ?? null;

                    return (
                      <tr key={la} className={`${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'} transition-colors`}>
                        <td className="p-2 pl-4 text-[9px] font-black text-slate-400">{i + 1}</td>
                        <td className="p-2 text-[10px] font-bold text-slate-900 whitespace-nowrap">{la}</td>

                        {/* Sub-level toggle buttons */}
                        {SUB_LEVELS.map(sl => {
                          const isActive = level === sl.label;
                          return (
                            <td key={sl.label} className={`p-1 text-center ${isEditing ? 'cursor-pointer' : ''}`}
                              onClick={isEditing ? () => handleSetLevel(la, sl.label) : undefined}>
                              {isActive ? (
                                <div className={`w-4 h-4 rounded-full mx-auto ${sl.dotClass} ring-2 ring-white shadow-sm`} />
                              ) : isEditing ? (
                                <div className="w-3 h-3 rounded-full mx-auto border-2 border-slate-200 hover:border-slate-400 opacity-40 transition-all" />
                              ) : (
                                <span className="text-[8px] text-slate-200">·</span>
                              )}
                            </td>
                          );
                        })}

                        {/* % column — using styled native select so it is never clipped */}
                        <td className="p-1 text-center" onClick={e => e.stopPropagation()}>
                          {isEditing ? (
                            <select
                              value={pct ?? ''}
                              onChange={e => handleFieldChange(la, 'percentage', e.target.value ? Number(e.target.value) : null)}
                              className="text-[9px] font-bold w-14 bg-white border border-slate-300 rounded-lg px-1 py-1 outline-none text-slate-700 text-center hover:border-orange-400 focus:ring-1 focus:ring-orange-300 transition-colors cursor-pointer appearance-none"
                            >
                              <option value="">—</option>
                              {Array.from({ length: 100 }, (_, i) => i + 1).map(n => (
                                <option key={n} value={n}>{n}%</option>
                              ))}
                            </select>
                          ) : (
                            <span className={`text-[10px] font-black ${pct != null ? 'text-slate-700' : 'text-slate-300'}`}>
                              {pct != null ? `${pct}%` : '—'}
                            </span>
                          )}
                        </td>

                        {/* PNT column — using styled native select, 1 to 8 */}
                        <td className="p-1 text-center" onClick={e => e.stopPropagation()}>
                          {isEditing ? (
                            <select
                              value={pnt ?? ''}
                              onChange={e => handleFieldChange(la, 'pnt', e.target.value ? Number(e.target.value) : null)}
                              className="text-[9px] font-bold w-12 bg-white border border-slate-300 rounded-lg px-1 py-1 outline-none text-slate-700 text-center hover:border-orange-400 focus:ring-1 focus:ring-orange-300 transition-colors cursor-pointer appearance-none"
                            >
                              <option value="">—</option>
                              {Array.from({ length: 8 }, (_, i) => i + 1).map(n => (
                                <option key={n} value={n}>{n}</option>
                              ))}
                            </select>
                          ) : (
                            <span className={`text-[10px] font-black ${pnt != null ? 'text-slate-700' : 'text-slate-300'}`}>
                              {pnt != null ? pnt : '—'}
                            </span>
                          )}
                        </td>

                        {/* Remarks */}
                        <td className="p-2 pr-4 text-[10px]" onClick={e => e.stopPropagation()}>
                          {isEditing ? (
                            <div className="flex items-center gap-2 group/remark">
                              <textarea
                                value={assessment?.remarks || ''}
                                onChange={e => handleSubjectRemarkChange(la, e.target.value)}
                                placeholder="Type remark..."
                                className="w-full bg-slate-50 border border-slate-200 px-2 py-1.5 rounded-lg outline-none resize-none focus:ring-1 focus:ring-slate-300 text-slate-700"
                                rows={1}
                              />
                              <button onClick={() => generateAIRequest(la, level || 'ME')}
                                className="opacity-0 group-hover/remark:opacity-100 p-1.5 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 transition-all flex-shrink-0"
                                title="AI Generate Remark">
                                <Sparkles size={11} />
                              </button>
                            </div>
                          ) : (
                            <span className="italic text-slate-500">{assessment?.remarks || '—'}</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                {/* Summary Footer */}
                {(() => {
                  const overall = computeOverallLevel(localAssessments, currentStudent.id, subjects);
                  const overallSl = SUB_LEVELS.find(sl => sl.base === overall);
                  if (!overall) return null;
                  return (
                    <tfoot>
                      <tr className="bg-slate-900 text-white">
                        <td colSpan={2} className="p-2 pl-4 text-[9px] font-black tracking-widest">Overall Performance</td>
                        {SUB_LEVELS.map(sl => (
                          <td key={sl.label} className="p-1 text-center">
                            {sl.base === overall ? <div className={`w-3 h-3 rounded-full mx-auto ${sl.dotClass} ring-1 ring-white`} /> : null}
                          </td>
                        ))}
                        <td colSpan={3} className="p-2 text-[9px] font-black text-orange-400">{overall} – {overall === 'EE' ? 'Exceeds Expectation' : overall === 'ME' ? 'Meets Expectation' : overall === 'AE' ? 'Approaching Expectation' : 'Below Expectation'}</td>
                      </tr>
                    </tfoot>
                  );
                })()}
              </table>
            </div>
          </div>

          {/* Remarks */}
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-[10px] font-black text-slate-400 tracking-widest">Class Teacher Remarks</h4>
                {isEditing && (
                  <button onClick={generateAITeacherRemark}
                    className="flex items-center gap-1.5 px-2.5 py-1 bg-purple-50 text-purple-600 hover:bg-purple-100 rounded-lg text-[9px] font-bold transition-colors">
                    <Sparkles size={10} /> Ask AI
                  </button>
                )}
              </div>
              {isEditing ? (
                <textarea value={teacherRemark} onChange={e => setTeacherRemark(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-medium outline-none focus:ring-2 focus:ring-slate-200 resize-none" rows={3} placeholder="Teacher feedback..." />
              ) : (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 min-h-[60px] flex items-center italic text-[11px] text-slate-600 font-medium">
                  &ldquo;{teacherRemark || (isSample ? 'Exceptional commitment shown throughout the term.' : 'Steady progress observed.')}&rdquo;
                </div>
              )}
            </div>
            <div className="space-y-2">
              <h4 className="text-[10px] font-black text-slate-400 tracking-widest">Headteacher Feedback</h4>
              {isEditing ? (
                <textarea value={htRemark} onChange={e => setHtRemark(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-medium outline-none focus:ring-2 focus:ring-slate-200 resize-none" rows={3} placeholder="HT feedback..." />
              ) : (
                <div className={`p-3 ${theme.bgLight} rounded-xl border ${theme.border} min-h-[60px] flex items-center italic text-[11px] ${theme.text} font-bold`}>
                  &ldquo;{htRemark || (isSample ? 'Promoted with distinction.' : 'Keep up the hard work.')}&rdquo;
                </div>
              )}
            </div>
          </div>

          {/* Performance Trend Chart */}
          <div className="mt-4 pt-4 border-t border-slate-100 flex-1">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp size={16} className={theme.text} />
              <h3 className="text-sm font-black text-slate-900 tracking-tight">Performance Trend Analysis</h3>
            </div>
            <div className="h-28 w-full bg-slate-50/50 rounded-2xl border border-slate-100 p-4 pb-0">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={performanceData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={theme.hex} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={theme.hex} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="term" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 700 }} dy={10} />
                  <YAxis domain={[0, 4]} ticks={[1, 2, 3, 4]} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 700 }} tickFormatter={v => v === 4 ? 'EE' : v === 3 ? 'ME' : v === 2 ? 'AE' : v === 1 ? 'BE' : ''} />
                  <Tooltip />
                  <Area type="monotone" dataKey="score" stroke={theme.hex} strokeWidth={3} fillOpacity={1} fill="url(#colorScore)" activeDot={{ r: 6, fill: theme.hex, stroke: '#fff', strokeWidth: 3 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Footer — Signature Section */}
          <div className="mt-8 pt-6 border-t border-slate-100">
            <div className="flex justify-between items-end gap-8">

              {/* Class Teacher */}
              <div className="flex-1 text-center">
                <div className="h-16 border-b-2 border-slate-800 mx-4 mb-2" />
                <p className="text-[9px] font-black text-slate-700 tracking-[0.15em] uppercase">Class Teacher</p>
                <p className="text-[8px] text-slate-400 mt-0.5">Name &amp; Signature</p>
              </div>

              {/* Date */}
              <div className="flex-1 text-center">
                <div className="h-16 border-b-2 border-slate-400 border-dashed mx-4 mb-2" />
                <p className="text-[9px] font-black text-slate-500 tracking-[0.15em] uppercase">Date</p>
              </div>

              {/* Headteacher */}
              <div className="flex-1 text-center">
                <div className="h-16 border-b-2 border-slate-800 mx-4 mb-2" />
                <p className="text-[9px] font-black text-slate-700 tracking-[0.15em] uppercase">Headteacher</p>
                <p className="text-[8px] text-slate-400 mt-0.5">Name &amp; Signature</p>
              </div>

            </div>
            {/* Stamp / watermark */}
            <div className="text-center mt-6 opacity-25">
              <p className="text-[8px] font-black tracking-[0.25em] text-slate-400 italic">e-stamp verified · brightsoma</p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default ReportBuilderModal;
