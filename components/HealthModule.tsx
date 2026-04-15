import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  Heart,
  HeartPulse,
  Activity,
  AlertCircle,
  PlusCircle,
  Calendar,
  MapPin,
  MessageSquare,
  Banknote,
  X,
  Stethoscope,
  Phone,
  Paperclip,
  FileText,
  ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db, auth, storage } from '../src/firebase';
import { collection, addDoc, updateDoc, doc, getDoc, onSnapshot, query, where } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { onAuthStateChanged } from 'firebase/auth';
import { Student } from '../types';
import { sendRealSMS } from '../services/smsService';
import toast from 'react-hot-toast';

interface HealthModuleProps {
  setActiveTab: (tab: string) => void;
}

interface Incident {
  id: string;
  studentId: string;
  studentName: string;
  grade: string;
  date: string;
  description: string;
  clinicName: string;
  cost: number;
  status: 'Recovered' | 'Under Treatment' | 'Critical';
  parentNotified: boolean;
  schoolId: string;
  reportUrl?: string;
  reportName?: string;
}

const HealthModule: React.FC<HealthModuleProps> = ({ setActiveTab }) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setLocalTab] = useState<'logs' | 'profiles'>('logs');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'All' | 'Under Treatment' | 'Recovered'>('All');
  
  // Modal State
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [incidentDate, setIncidentDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [clinicName, setClinicName] = useState('');
  const [cost, setCost] = useState('');
  const [status, setStatus] = useState<'Recovered' | 'Under Treatment' | 'Critical'>('Under Treatment');
  const [notifyParent, setNotifyParent] = useState(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let unsubscribeStudents: (() => void) | null = null;
    let unsubscribeIncidents: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      // Clean up previous listeners if auth state changes
      if (unsubscribeStudents) unsubscribeStudents();
      if (unsubscribeIncidents) unsubscribeIncidents();

      if (!user) {
        setStudents([]);
        setIncidents([]);
        setIsLoading(false);
        return;
      }

      let schoolId = user.uid;
      const staffDocRef = doc(db, 'staff', user.uid);
      const staffDocSnap = await getDoc(staffDocRef);
      if (staffDocSnap.exists()) {
        schoolId = staffDocSnap.data().schoolId;
      }

      const qStudents = query(collection(db, 'students'), where('schoolId', '==', schoolId));
      unsubscribeStudents = onSnapshot(qStudents, (snapshot) => {
        const studentData: Student[] = [];
        snapshot.forEach((doc) => {
          studentData.push({ id: doc.id, ...doc.data() } as Student);
        });
        setStudents(studentData);
      });

      const qIncidents = query(collection(db, 'health_incidents'), where('schoolId', '==', schoolId));
      unsubscribeIncidents = onSnapshot(qIncidents, (snapshot) => {
        const incidentData: Incident[] = [];
        snapshot.forEach((doc) => {
          incidentData.push({ id: doc.id, ...doc.data() } as Incident);
        });
        incidentData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setIncidents(incidentData);
        setIsLoading(false);
      });
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeStudents) unsubscribeStudents();
      if (unsubscribeIncidents) unsubscribeIncidents();
    };
  }, []);

  const filteredIncidents = useMemo(() => {
    return incidents.filter(inc => {
      const matchesSearch = inc.studentName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            inc.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = filterStatus === 'All' || inc.status === filterStatus;
      return matchesSearch && matchesStatus;
    });
  }, [incidents, searchQuery, filterStatus]);

  const handleLogIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId) {
      toast.error('Please select a learner.');
      return;
    }
    
    const student = students.find(s => s.id === selectedStudentId);
    if (!student) return;

    setIsSubmitting(true);
    try {
      const user = auth.currentUser;
      if (!user) return;
      
      let schoolId = user.uid;
      const staffDocRef = doc(db, 'staff', user.uid);
      const staffDocSnap = await getDoc(staffDocRef);
      if (staffDocSnap.exists()) {
        schoolId = staffDocSnap.data().schoolId;
      }

      let reportUrl = '';
      let reportName = '';

      if (selectedFile) {
        const fileRef = ref(storage, `health_reports/${schoolId}/${Date.now()}_${selectedFile.name}`);
        const uploadResult = await uploadBytes(fileRef, selectedFile);
        reportUrl = await getDownloadURL(uploadResult.ref);
        reportName = selectedFile.name;
      }

      let parentNotified = false;
      if (notifyParent && student.parentInfo.emergencyContact) {
        const message = `BrightSoma Health Alert: ${student.name} is feeling unwell (${description}). They are being handled at ${clinicName || 'School Clinic'}. Please contact the school.`;
        const smsResult = await sendRealSMS(student.parentInfo.emergencyContact, message);
        if (smsResult.success) parentNotified = true;
      }

      await addDoc(collection(db, 'health_incidents'), {
        schoolId, studentId: student.id, studentName: student.name, grade: student.grade,
        date: incidentDate, description, clinicName: clinicName || 'School Clinic',
        cost: Number(cost) || 0, status, parentNotified, reportUrl, reportName
      });

      toast.success('Health incident logged successfully.');
      setShowModal(false);
      setSelectedStudentId('');
      setDescription('');
      setClinicName('');
      setCost('');
      setStatus('Under Treatment');
      setSelectedFile(null);
    } catch (error) {
       toast.error('Failed to log health incident.');
    } finally {
       setIsSubmitting(false);
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: string) => {
     try {
       await updateDoc(doc(db, 'health_incidents', id), { status: newStatus });
       toast.success('Status updated.');
     } catch (err) {
       toast.error('Failed to update status.');
     }
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-700 font-sans pb-20">
      {/* Header section */}
      <div className="relative -mx-4 md:-mx-8 -mt-4 md:-mt-8 bg-[#334155] py-5 border-b border-[#1f507a] shadow-sm px-4 md:px-8">
        <div className="w-full max-w-7xl mx-auto">
          <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/10 rounded-xl">
                <HeartPulse size={24} className="text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight">Students' Health</h2>
                <p className="text-xs text-blue-100 mt-1">Monitor learner well-being, log incidents, and notify parents.</p>
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              <div className="px-6 py-3 bg-black/20 border border-white/10 rounded-xl min-w-[140px] shadow-inner backdrop-blur-sm">
                <p className="text-[10px] font-bold text-blue-200 uppercase mb-0.5 tracking-wider">Active Cases</p>
                <p className="text-2xl font-bold text-white leading-none">{incidents.filter(i => i.status === 'Under Treatment').length}</p>
              </div>
              <button 
                onClick={() => setShowModal(true)}
                className="flex items-center gap-2 px-8 py-3.5 bg-orange-500 text-white rounded-xl text-sm font-bold hover:bg-orange-600 transition-all shadow-lg active:scale-95 border border-orange-500/20"
              >
                <PlusCircle size={18} /> 
                Log Incident
              </button>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-white/20 flex flex-col xl:flex-row xl:items-center justify-between gap-6">
            <div className="flex p-1.5 bg-black/10 border border-white/20 rounded-[2rem] backdrop-blur-sm">
              <button 
                onClick={() => setLocalTab('logs')}
                className={`px-6 py-2.5 rounded-[1.5rem] text-[11px] font-bold transition-all ${activeTab === 'logs' ? 'bg-white text-[#334155]' : 'text-white/60'}`}
              >
                Recent Logs
              </button>
              <button 
                onClick={() => setLocalTab('profiles')}
                className={`px-6 py-2.5 rounded-[1.5rem] text-[11px] font-bold transition-all ${activeTab === 'profiles' ? 'bg-white text-[#334155]' : 'text-white/60'}`}
              >
                Student Health Profiles
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-3 px-6 py-3 bg-black/10 border border-white/10 rounded-[2rem] backdrop-blur-sm">
                <Search size={14} className="text-blue-200" />
                <input 
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent text-[11px] font-bold text-white outline-none placeholder:text-white/40"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 md:px-0">
        <AnimatePresence mode="wait">
          {activeTab === 'profiles' ? (
            <motion.div 
              key="profiles"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {students.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase())).map(student => (
                <div key={student.id} className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-100 dark:border-slate-700 shadow-sm relative overflow-hidden group">
                  <div className="relative z-10">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-12 h-12 rounded-xl bg-slate-900 flex items-center justify-center text-white font-bold">{student.name.charAt(0)}</div>
                      <div>
                        <h4 className="font-bold text-slate-800 dark:text-white leading-tight">{student.name}</h4>
                        <p className="text-xs font-bold text-orange-500 uppercase">{student.grade}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="p-3 bg-rose-50 dark:bg-rose-900/10 rounded-xl border border-rose-100 dark:border-rose-800/50">
                        <p className="text-[10px] font-bold text-rose-500 uppercase mb-0.5">Blood</p>
                        <p className="text-xs font-bold text-slate-700 dark:text-slate-200">{student.medicalInfo?.bloodGroup || '-'}</p>
                      </div>
                      <div className="p-3 bg-amber-50 dark:bg-amber-900/10 rounded-xl border border-amber-100 dark:border-amber-800/50">
                        <p className="text-[10px] font-bold text-amber-500 uppercase mb-0.5">Meds</p>
                        <p className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">{student.medicalInfo?.medication || 'None'}</p>
                      </div>
                    </div>
                    <div className="text-[10px] font-bold text-slate-400 mb-1">ALLERGIES</div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mb-4">{student.medicalInfo?.allergies || 'No known allergies'}</p>
                  </div>
                </div>
              ))}
            </motion.div>
          ) : (
            <motion.div 
              key="logs"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              {isLoading ? (
                <div className="py-20 flex justify-center"><Activity className="animate-spin text-rose-500" /></div>
              ) : filteredIncidents.length === 0 ? (
                <div className="p-16 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl">
                  <Heart size={40} className="mx-auto text-slate-200 mb-4" />
                  <p className="text-slate-500 font-medium text-sm">No health incidents logged yet.</p>
                </div>
              ) : (
                <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700">
                  <div className="space-y-4">
                    {filteredIncidents.map(inc => (
                      <div key={inc.id} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                        <div className="flex gap-4 items-center flex-1">
                          <div className={`p-2 rounded-xl ${inc.status === 'Recovered' ? 'bg-green-100 text-green-600' : 'bg-rose-100 text-rose-600'}`}>
                            <Activity size={20} />
                          </div>
                          <div>
                            <div className="flex gap-2 items-center">
                              <h4 className="font-bold text-sm text-slate-800 dark:text-white">{inc.studentName}</h4>
                              <span className="text-[10px] bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded-full font-bold">{inc.grade}</span>
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">{inc.description}</p>
                            <div className="flex gap-3 mt-2">
                              <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1"><Calendar size={10} />{inc.date}</span>
                              {inc.reportUrl && (
                                <a href={inc.reportUrl} target="_blank" rel="noreferrer" className="text-[10px] font-bold text-orange-600 hover:underline flex items-center gap-1">
                                  <FileText size={10} /> View Report
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                        <select 
                          value={inc.status} 
                          onChange={(e) => handleUpdateStatus(inc.id, e.target.value)}
                          className="text-xs font-bold px-3 py-1.5 rounded-xl border appearance-none outline-none dark:bg-slate-800"
                        >
                          <option value="Under Treatment">Under Treatment</option>
                          <option value="Critical">Critical</option>
                          <option value="Recovered">Recovered</option>
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Modal section */}
      {showModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="relative bg-white dark:bg-slate-900 w-full max-w-xl rounded-[2.5rem] shadow-2xl p-8 border border-slate-100 dark:border-slate-800">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-3"><Stethoscope className="text-orange-500" /> Log Health Incident</h3>
            <form onSubmit={handleLogIncident} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Select Learner</label>
                <select value={selectedStudentId} onChange={(e) => setSelectedStudentId(e.target.value)} className="w-full p-4 bg-slate-50 dark:bg-slate-800 border rounded-2xl text-sm font-bold" required>
                  <option value="">-- Choose Learner --</option>
                  {students.map(s => <option key={s.id} value={s.id}>{s.name} ({s.grade})</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Date</label>
                  <input type="date" value={incidentDate} onChange={(e) => setIncidentDate(e.target.value)} className="w-full p-4 bg-slate-50 dark:bg-slate-800 border rounded-2xl text-sm font-bold" required />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Severity</label>
                  <select value={status} onChange={(e) => setStatus(e.target.value as any)} className="w-full p-4 bg-slate-50 dark:bg-slate-800 border rounded-2xl text-sm font-bold">
                    <option value="Under Treatment">Under Treatment</option>
                    <option value="Critical">Critical</option>
                    <option value="Recovered">Recovered</option>
                  </select>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Description</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="w-full p-4 bg-slate-50 dark:bg-slate-800 border rounded-2xl text-sm font-medium resize-none" required />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Clinic Report (Optional)</label>
                <input type="file" onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} className="w-full p-3 bg-slate-50 dark:bg-slate-800 border rounded-2xl text-xs" accept=".pdf,image/*" />
              </div>
              <div className="flex items-center justify-between p-4 bg-blue-50/50 dark:bg-blue-900/10 rounded-2xl border border-blue-100 dark:border-blue-900/30">
                <div className="flex gap-3 items-center">
                  <Phone size={16} className="text-blue-500" />
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Notify Parent via SMS</span>
                </div>
                <input type="checkbox" checked={notifyParent} onChange={(e) => setNotifyParent(e.target.checked)} className="w-5 h-5 accent-blue-600" />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="px-6 py-3 text-sm font-bold text-slate-400">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="px-10 py-3 bg-orange-500 text-white rounded-xl text-sm font-bold shadow-lg hover:bg-orange-600 transition-all disabled:bg-slate-300">
                  {isSubmitting ? 'Saving...' : 'Save Record'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default HealthModule;
