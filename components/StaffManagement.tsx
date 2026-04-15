import React, { useState, useEffect, useRef } from 'react';
import { Users, Key, Plus, Trash2, Copy, CheckCircle2, Loader2, X, UserPlus, Mail, Phone, Calendar, BookOpen, Shield, Briefcase, ChevronDown, Download, Edit2, Search, Printer, GraduationCap, ArrowLeft, User, ArrowRight, MapPin, ShieldCheck, FileText } from 'lucide-react';
import { db, auth } from '../src/firebase';
import { collection, addDoc, onSnapshot, deleteDoc, doc, query, where, updateDoc, getDoc, getDocs } from 'firebase/firestore';
import { sendRealSMS } from '../services/smsService';
import { UserRole } from '../types';
import toast from 'react-hot-toast';
import { CBC_GRADES, SUBJECTS, CONTRACT_TYPES } from '../constants';
import { useAuth } from '../hooks/useAuth';
import { motion, AnimatePresence } from 'motion/react';

// Custom Dropdown Component - Fixed outside to prevent re-creation on render
const SmoothDropdown = ({ 
  label, value, onChange, options, icon: Icon, placeholder = "Select...", showSearch = false 
}: { 
  label: string, value: string, onChange: (val: string) => void, options: string[], icon: any, placeholder?: string, showSearch?: boolean 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const filteredOptions = options ? options.filter(opt => 
    opt.toLowerCase().includes(search.toLowerCase())
  ) : [];

  return (
    <div className="space-y-2 relative" ref={dropdownRef}>
      <label className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-1 uppercase tracking-tight">{label}</label>
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`w-full flex items-center justify-between pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border rounded-xl text-slate-900 dark:text-white transition-all font-medium ${
            isOpen ? 'border-orange-500 ring-2 ring-orange-500/10' : 'border-slate-200 dark:border-slate-700 hover:border-orange-500/50'
          }`}
        >
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
            <Icon size={18} />
          </div>
          <span className={`text-sm ${!value ? 'text-slate-400' : ''}`}>
            {value || placeholder}
          </span>
          <ChevronDown size={18} className={`text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="absolute left-0 right-0 top-full mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-[100] overflow-hidden flex flex-col min-w-[200px]"
            >
              {showSearch && (
                <div className="p-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                    <input
                      type="text"
                      placeholder="Search..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none focus:ring-2 focus:ring-orange-500 text-slate-900 dark:text-white"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                </div>
              )}
              <div className="max-h-60 overflow-y-auto p-1.5 custom-scrollbar">
                {filteredOptions.length > 0 ? (
                  filteredOptions.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => {
                        onChange(opt);
                        setIsOpen(false);
                        setSearch('');
                      }}
                      className={`w-full text-left px-4 py-2.5 rounded-xl text-sm transition-all flex items-center justify-between group ${
                        value === opt 
                          ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 font-bold' 
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-orange-600'
                      }`}
                    >
                      {opt}
                      {value === opt && <CheckCircle2 size={14} className="text-orange-500" />}
                    </button>
                  ))
                ) : (
                  <div className="p-4 text-center text-slate-400 text-[10px] italic">
                    {(!options || options.length === 0) ? "No options available" : "No results found"}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};


interface AccessCode {
  id: string;
  code: string;
  role: UserRole;
  staffName: string;
  username: string;
  email: string;
  active: boolean;
  createdAt: string;
  expiresAt: string;
}

interface StaffMember {
  id: string;
  name: string;
  username: string;
  role: UserRole;
  schoolId: string;
  createdAt: string;
  email: string;
  phone?: string;
  grade?: string;
  teachingGrades?: string[];
  teachingSubjects?: Record<string, string[]>;
  contractType?: string;
  classTeacherOf?: string;
  accessCode?: string;
  classroomAccessCode?: string; // Keep both for backward compatibility with old docs
  employmentDate?: string;
  gender?: string;
  stream?: string;
  documents?: Array<{
    id: string;
    name: string;
    type: string;
    url: string;
    date: string;
    uploadedBy?: string;
  }>;
}

type StaffCategory = 'TEACHER' | 'PRINCIPAL' | 'FINANCE' | 'NON_STAFF' | 'SPECIAL' | null;
type StaffFilter = 'ALL' | 'TEACHING' | 'NON_TEACHING';


const StaffManagement: React.FC = () => {
  const { profile } = useAuth();
  const [accessCodes, setAccessCodes] = useState<AccessCode[]>([]);
  const [registeredStaff, setRegisteredStaff] = useState<StaffMember[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [generalStaffForm, setGeneralStaffForm] = useState({
    name: '',
    responsibility: '',
    employmentDate: new Date().toISOString().split('T')[0],
    contractType: 'Permanent',
    durationOfContract: '',
    teachingGrades: [] as string[],
    teachingSubjects: {} as Record<string, string[]>,
    classTeacherOf: '',
    stream: '',
    phone: '',
    email: '',
    documents: [] as any[]
  });
  const [newStaffRole, setNewStaffRole] = useState<UserRole>('TEACHER');
  const [view, setView] = useState<'list' | 'add'>('list');
  const [selectedCategory, setSelectedCategory] = useState<StaffCategory>(null);
  const [schoolProfile, setSchoolProfile] = useState<any>(null);

  const [filterRole, setFilterRole] = useState<StaffFilter>('ALL');

  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);
  const [editStaffForm, setEditStaffForm] = useState<Partial<StaffMember>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [printingStaff, setPrintingStaff] = useState<any>(null);

  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaffId) return;
    try {
      await updateDoc(doc(db, 'staff', editingStaffId), {
        ...editStaffForm
      });
      toast.success("Staff details updated!");
      setEditingStaffId(null);
    } catch (err) {
      toast.error("Failed to update staff.");
    }
  };

  const handleDeleteStaff = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to remove ${name} from the staff portal?`)) return;
    try {
      // 1. Get the staff doc to find the access code
      const staffRef = doc(db, 'staff', id);
      const staffSnap = await getDoc(staffRef);
      
      if (staffSnap.exists()) {
        const staffData = staffSnap.data();
        const code = staffData.accessCode;
        
        if (code) {
          // 2. Delete the invitation code
          const codesRef = collection(db, 'access_codes');
          const q = query(codesRef, where('code', '==', code));
          const codeSnap = await getDocs(q);
          codeSnap.forEach(async (d) => {
            await deleteDoc(d.ref);
          });
        }
      }

      // 3. Delete the staff record
      await deleteDoc(staffRef);
      toast.success(`${name} has been removed.`);
    } catch (err) {
      toast.error('Failed to remove staff member.');
    }
  };

  const handleDeleteInvitation = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete the invitation for ${name}?`)) return;
    try {
      await deleteDoc(doc(db, 'access_codes', id));
      toast.success('Invitation deleted.');
    } catch (err) {
      toast.error('Failed to delete invitation.');
    }
  };

  const handleSendCredentialsEmail = (staff: any) => {
    const subject = `Your BrightSoma Login Credentials - ${staff.name || staff.staffName}`;
    const body = `Hello ${staff.name || staff.staffName},\n\nYour account has been created on BrightSoma ERP.\n\nUsername: ${staff.username}\nTemporary Password: ${staff.classroomAccessCode || staff.code || 'N/A'}\n\nPlease login at: ${window.location.origin}\n\nRegards,\nSchool Administration`;
    
    // Check if staff has email
    const email = staff.email || "";
    if (!email) {
      toast.error("Staff member has no email address assigned.");
      return;
    }

    window.location.href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    toast.success("Opening email client...");
  };

  const handlePrintCredentials = (staff: any) => {
    setPrintingStaff(staff);
  };


  // Teacher form state
  const [teacherForm, setTeacherForm] = useState<{
    name: string; tc: string; gender: string;
    teachingGrades: string[]; teachingSubjects: Record<string, string[]>; phone: string; email: string;
    employmentDate: string; contractType: string; classTeacherOf: string; classroomAccessCode: string;
    stream: string;
    username: string;
    documents?: any[];
  }>({
    name: '', tc: '', gender: 'Male',
    teachingGrades: [], teachingSubjects: {}, phone: '', email: '', 
    employmentDate: new Date().toISOString().split('T')[0], 
    contractType: 'TSC', classTeacherOf: '',
    classroomAccessCode: '', stream: '', username: '',
    documents: []
  });

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;
    
    // 🛡️ CRITICAL: Use the schoolId from the resolved profile (works for all roles)
    // Fallback to user.uid only for the School Admin (profile owner)
    // We prioritize the auth UID if the profile isn't fully ready yet to show initial data
    const schoolId = profile?.schoolId || user.uid;
    console.log('[StaffManagement] useEffect triggered. Resolved schoolId:', schoolId, ' (from profile:', profile?.schoolId, ' or user.uid:', user.uid, ')');
    
    if (!schoolId) {
      console.warn("[StaffManagement] No schoolId resolved yet.");
      return;
    }

    const qCodes = query(collection(db, 'access_codes'), where('schoolId', '==', schoolId));
    const unsubCodes = onSnapshot(qCodes, (snapshot) => {
      setAccessCodes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AccessCode)));
    });
    const unsubSchool = onSnapshot(doc(db, 'schools', schoolId), (docSnap) => {
      if (docSnap.exists()) setSchoolProfile(docSnap.data());
    });
    const qStaff = query(collection(db, 'staff'), where('schoolId', '==', schoolId));
    console.log('[StaffManagement] Starting staff listener for schoolId:', schoolId);

    const unsubStaff = onSnapshot(qStaff, (snapshot) => {
      console.log(`[StaffManagement] Staff Snapshot: ${snapshot.docs.length} records found for schoolId: ${schoolId}`);
      if (snapshot.docs.length > 0) {
        console.log('[StaffManagement] First staff record detail:', {
          id: snapshot.docs[0].id,
          name: snapshot.docs[0].data().name,
          role: snapshot.docs[0].data().role,
          schoolId: snapshot.docs[0].data().schoolId
        });
      }

      const staff = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as StaffMember));
      
      const rolePriority: Record<string, number> = {
        'PRINCIPAL': 1,
        'TEACHER': 2,
        'FINANCE': 3,
        'ADMIN': 4,
        'DIRECTOR': 5
      };

      const sortedStaff = staff.sort((a, b) => {
        const priorityA = rolePriority[a.role] || 10;
        const priorityB = rolePriority[b.role] || 10;
        if (priorityA !== priorityB) return priorityA - priorityB;
        return (a.name || '').localeCompare(b.name || '');
      });

      setRegisteredStaff(sortedStaff);
    }, (error) => {
      console.error('[StaffManagement] Firestore Staff Listener Error:', error);
    });
    return () => { unsubCodes(); unsubStaff(); unsubSchool(); };
  }, [profile?.schoolId, auth.currentUser?.uid]); // Re-run when schoolId or UID is resolved

  const generateUsername = (name: string) => {
    const schoolPrefix = schoolProfile?.name?.substring(0, 2).toUpperCase() || 'BS';
    const cleanName = name.split(' ')[0].replace(/[^a-zA-Z]/g, '');
    const random = Math.floor(Math.random() * 90) + 10;
    return `${schoolPrefix}-${cleanName}-${random}`.toLowerCase();
  };

  
  

  const generateCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!generalStaffForm.name.trim()) { toast.error("Please enter the staff member's name."); return; }
    const user = auth.currentUser;
    if (!user) { toast.error("Authentication required."); return; }
    const schoolId = profile?.schoolId || user.uid;
    if (!schoolId) { toast.error("School context not loaded."); return; }
    setIsGenerating(true);
    try {
      const randomString = Math.random().toString(36).substring(2, 6).toUpperCase();
      const prefix = newStaffRole.substring(0, 3).toUpperCase();
      const newCode = `${prefix}-${randomString}`;
      
      const username = generateUsername(generalStaffForm.name);
      // In the general form, we might need an email field too. 
      // For now, I'll add logic to check if a hidden email is provided or generated.
      const email = `${username.toLowerCase()}@brightsoma.com`; 

      const days = schoolProfile?.codeValidityDays || 7;
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + Number(days));

      await addDoc(collection(db, 'access_codes'), {
        code: newCode, 
        role: newStaffRole, 
        staffName: generalStaffForm.name.trim(),
        username,
        email,
        schoolId, 
        active: true, 
        createdAt: new Date().toISOString(), 
        expiresAt: expiresAt.toISOString()
      });
      toast.success(`${newStaffRole} temporary password generated for ${generalStaffForm.name}!`);
      setGeneralStaffForm(p => ({ ...p, name: '' }));
    } catch (error) {
      toast.error("Failed to generate code.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleTeacherSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacherForm.name.trim()) { toast.error('Teacher name is required.'); return; }
    const user = auth.currentUser;
    if (!user) { toast.error("Authentication required."); return; }
    const schoolId = profile?.schoolId || user.uid;
    if (!schoolId) { toast.error("School context not loaded."); return; }
    setIsGenerating(true);

    // Phone validation: 10 digits starting with 0, or 13 characters starting with +254
    const phoneRegex = /^0\d{9}$|^\+254\d{9}$/;
    if (teacherForm.phone && !phoneRegex.test(teacherForm.phone)) {
      toast.error('Invalid phone number. Use 10 digits (07...) or 13 characters (+254...).');
      setIsGenerating(false);
      return;
    }

    // ✅ OPTIMISTIC UI: Add to local state immediately so it appears instantly
    // Generate username and email
    const username = teacherForm.username.trim() || generateUsername(teacherForm.name);
    const email = (teacherForm.email?.trim() || `${username.toLowerCase()}@brightsoma.com`).toLowerCase();

    const optimisticId = `optimistic-${Date.now()}`;
    const optimisticStaff: StaffMember = {
      id: optimisticId,
      name: teacherForm.name,
      username,
      email,
      role: 'TEACHER',
      schoolId,
      phone: teacherForm.phone,
      teachingGrades: teacherForm.teachingGrades,
      teachingSubjects: teacherForm.teachingSubjects,
      contractType: teacherForm.contractType,
      classTeacherOf: teacherForm.classTeacherOf,
      employmentDate: teacherForm.employmentDate,
      gender: teacherForm.gender,
      stream: teacherForm.stream,
      createdAt: new Date().toISOString(),
    };
    setRegisteredStaff(prev => [optimisticStaff, ...prev]);

    // Close modal immediately for instant feel
    setView('list');
    setSelectedCategory(null);
    toast.success(`${teacherForm.name} registered! Syncing...`);

    try {
      // Generate access code for teacher
      const randomString = Math.random().toString(36).substring(2, 6).toUpperCase();
      const newCode = teacherForm.classroomAccessCode?.trim().toUpperCase() || `TCH-${randomString}`;
      
      const days = schoolProfile?.codeValidityDays || 7;
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + Number(days));

      await addDoc(collection(db, 'access_codes'), {
        code: newCode, 
        role: 'TEACHER', 
        staffName: teacherForm.name,
        username,
        email,
        schoolId, 
        active: true, 
        createdAt: new Date().toISOString(), 
        expiresAt: expiresAt.toISOString(),
        teacherDetails: { ...teacherForm }
      });

      // Save staff record to Firestore (onSnapshot will replace the optimistic entry)
      await addDoc(collection(db, 'staff'), {
        name: teacherForm.name,
        username,
        role: 'TEACHER',
        schoolId,
        email,
        phone: teacherForm.phone,
        teachingGrades: teacherForm.teachingGrades,
        teachingSubjects: teacherForm.teachingSubjects,
        contractType: teacherForm.contractType,
        classTeacherOf: teacherForm.classTeacherOf,
        employmentDate: teacherForm.employmentDate,
        tscNumber: teacherForm.tc,
        gender: teacherForm.gender,
        stream: teacherForm.stream,
        accessCode: newCode,
        createdAt: new Date().toISOString(),
        documents: teacherForm.documents || []
      });

      // Signal onboarding guide
      localStorage.setItem('onboarding_staff_added', Date.now().toString());
      window.dispatchEvent(new Event('storage'));

      // Automated Invite SMS
      if (teacherForm.phone) {
        const inviteMsg = `Hello ${teacherForm.name}, you have been invited to join our school portal. Your temporary password is: ${newCode}. Please use this to log in to your account.`;
        try {
          await sendRealSMS(teacherForm.phone, inviteMsg);
          await addDoc(collection(db, 'sms_logs'), {
            schoolId, phone: teacherForm.phone, message: inviteMsg,
            status: 'Success', timestamp: new Date().toISOString(), type: 'StaffInvite'
          });
        } catch (e) {}
      }

      toast.success(`✅ ${teacherForm.name} synced! Temporary password: ${newCode}`);
      setTeacherForm({ 
        name: '', tc: '', gender: 'Male',
        teachingGrades: [], teachingSubjects: {}, phone: '', email: '', 
        employmentDate: new Date().toISOString().split('T')[0], 
        contractType: 'TSC', classTeacherOf: '',
        classroomAccessCode: '', stream: '', username: ''
      });
    } catch (error) {
      // Rollback optimistic entry on failure
      setRegisteredStaff(prev => prev.filter(s => s.id !== optimisticId));
      toast.error("Failed to register teacher.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGeneralStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!generalStaffForm.name.trim()) { toast.error("Please enter the staff member's name."); return; }
    const roleMap: Record<string, UserRole> = { 
      'PRINCIPAL': 'PRINCIPAL',
      'FINANCE': 'FINANCE', 
      'NON_STAFF': 'DIRECTOR', 
      'SPECIAL': 'ADMIN' 
    };
    const role = roleMap[selectedCategory as string] || 'DIRECTOR';
    const user = auth.currentUser;
    if (!user) { toast.error("Authentication required."); return; }
    const schoolId = profile?.schoolId || user.uid;
    if (!schoolId) { toast.error("School context not loaded."); return; }
    
    // Phone validation: 10 digits starting with 0, or 13 characters starting with +254
    const phoneRegex = /^0\d{9}$|^\+254\d{9}$/;
    if (generalStaffForm.phone && !phoneRegex.test(generalStaffForm.phone)) {
      toast.error('Invalid phone number. Use 10 digits (07...) or 13 characters (+254...).');
      return;
    }

    setIsGenerating(true);

    // Generate username and email
    const username = generateUsername(generalStaffForm.name.trim());
    const email = generalStaffForm.email.trim() || `${username.toLowerCase()}@brightsoma.com`;

    const optimisticId = `optimistic-${Date.now()}`;
    const optimisticStaff: StaffMember = {
      id: optimisticId,
      name: generalStaffForm.name.trim(),
      username,
      email,
      role,
      schoolId,
      phone: generalStaffForm.phone,
      createdAt: new Date().toISOString(),
    };
    setRegisteredStaff(prev => [optimisticStaff, ...prev]);
    setView('list');
    setSelectedCategory(null);
    toast.success(`${generalStaffForm.name.trim()} added! Syncing...`);

    try {
      const randomString = Math.random().toString(36).substring(2, 6).toUpperCase();
      const prefix = (selectedCategory as string).substring(0, 3).toUpperCase();
      const newCode = `${prefix}-${randomString}`;
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);
      await addDoc(collection(db, 'access_codes'), {
        code: newCode, 
        role, 
        staffName: generalStaffForm.name.trim(),
        username,
        email,
        staffCategory: selectedCategory, 
        schoolId, 
        active: true,
        createdAt: new Date().toISOString(), 
        expiresAt: expiresAt.toISOString()
      });
      await addDoc(collection(db, 'staff'), {
        name: generalStaffForm.name.trim(),
        username,
        email,
        role,
        staffCategory: selectedCategory,
        schoolId,
        accessCode: newCode,
        createdAt: new Date().toISOString(),
        responsibility: generalStaffForm.responsibility,
        employmentDate: generalStaffForm.employmentDate,
        contractType: generalStaffForm.contractType,
        durationOfContract: generalStaffForm.durationOfContract,
        teachingGrades: generalStaffForm.teachingGrades,
        teachingSubjects: generalStaffForm.teachingSubjects,
        classTeacherOf: generalStaffForm.classTeacherOf,
        stream: generalStaffForm.stream,
        phone: generalStaffForm.phone,
        documents: generalStaffForm.documents || []
      });
      // Signal onboarding guide
      localStorage.setItem('onboarding_staff_added', Date.now().toString());
      window.dispatchEvent(new Event('storage'));
      toast.success(`✅ ${generalStaffForm.name.trim()} synced!`);
      setGeneralStaffForm({
        name: '', responsibility: '', employmentDate: new Date().toISOString().split('T')[0],
        contractType: 'Permanent', durationOfContract: '', teachingGrades: [], teachingSubjects: {}, classTeacherOf: '', stream: '', phone: '', email: '',
        documents: []
      });
    } catch (error) {
      setRegisteredStaff(prev => prev.filter(s => s.id !== optimisticId));
      toast.error("Failed to generate code.");
    } finally {
      setIsGenerating(false);
    }
  };
  const copyToClipboard = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    toast.success("Code copied to clipboard!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleStaffDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>, isTeacher: boolean) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File too large (Max 5MB)');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      const newDoc = {
        id: crypto.randomUUID(),
        name: file.name,
        type: file.type,
        url: base64,
        date: new Date().toISOString(),
        uploadedBy: auth.currentUser?.email || 'Admin'
      };

      if (isTeacher) {
        setTeacherForm(prev => ({
          ...prev,
          documents: [...(prev.documents || []), newDoc]
        }));
      } else {
        setGeneralStaffForm(prev => ({
          ...prev,
          documents: [...(prev.documents || []), newDoc]
        }));
      }
      toast.success(`Document "${file.name}" staged.`);
    };
    reader.readAsDataURL(file);
  };

  const categoryOptions = [
    { id: 'TEACHER', label: 'Teacher', icon: <BookOpen size={20} className="text-orange-600" />, color: 'border-orange-200 bg-orange-50 hover:bg-orange-100' },
    { id: 'PRINCIPAL', label: 'Principal / Headteacher', icon: <GraduationCap size={20} className="text-orange-600" />, color: 'border-orange-200 bg-orange-50 hover:bg-orange-100' },
    { id: 'FINANCE', label: 'Finance Officer', icon: <Briefcase size={20} className="text-amber-600" />, color: 'border-amber-200 bg-amber-50 hover:bg-amber-100' },
    { id: 'SPECIAL', label: 'Management / Director', icon: <Shield size={20} className="text-orange-600" />, color: 'border-orange-200 bg-orange-50 hover:bg-orange-100' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {view === 'list' ? (
        <>
          {/* Floating Header - Un-carded */}
          <div className="relative py-4 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 shrink-0">
                <Users size={28} strokeWidth={1.5} />
              </div>
              <div>
                <div className="flex items-center gap-4">
                  <h2 className="text-xl font-bold text-slate-800 dark:text-white tracking-tight leading-tight">Staff Management</h2>
                  <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-bold rounded-full border border-slate-200 dark:border-slate-700">
                    {registeredStaff.length} Active
                  </span>
                  <span className="px-3 py-1 bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 text-xs font-bold rounded-full border border-orange-100 dark:border-orange-800">
                    {accessCodes.length} Pending
                  </span>
                </div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">Manage workforce, generate access invites, and oversee departmental roles.</p>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={() => {
                  const headers = "name,role,email,phone\n";
                  const sampleRow = "John Doe,TEACHER,john@example.com,0712345678\n";
                  const blob = new Blob([headers + sampleRow], { type: 'text/csv' });
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'staff_import_template.csv';
                  document.body.appendChild(a); a.click(); document.body.removeChild(a);
                  window.URL.revokeObjectURL(url);
                  toast.success("Staff template downloaded!");
                }}
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-slate-200 dark:bg-slate-800 dark:border-slate-700 text-slate-600 dark:text-slate-400 rounded-xl text-[12.5px] font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-all cursor-pointer active:scale-95"
                title="Download CSV Template"
              >
                <Download size={16} />
                <span className="hidden sm:inline">Template</span>
              </button>
              <label className="flex items-center justify-center gap-2 px-6 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-xl text-[12.5px] font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all cursor-pointer active:scale-95">
                <UserPlus size={16} /> Bulk Import
                <input type="file" accept=".csv" className="hidden" onChange={async (e) => {
                  const file = e.target.files?.[0]; if (!file) return;
                  const reader = new FileReader();
                  reader.onload = async (event) => {
                    const csvText = event.target?.result as string;
                    const { parseCSV } = await import('../utils/CSVUtils');
                    const rows = parseCSV(csvText);
                    if (rows.length === 0) { toast.error('CSV file is empty.'); return; }
                    const user = auth.currentUser; if (!user) return;
                    const schoolId = profile?.schoolId || user.uid;
                    const loadingToast = toast.loading(`Processing ${rows.length} staff members...`);
                    try {
                      let successCount = 0;
                      for (const row of rows) {
                        if (!row.name) continue;
                        const randomString = Math.random().toString(36).substring(2, 6).toUpperCase();
                        const role = (row.role || 'TEACHER') as UserRole;
                        const newCode = `${role.substring(0, 3)}-${randomString}`;
                        const username = generateUsername(row.name);
                        await addDoc(collection(db, 'access_codes'), { code: newCode, role, staffName: row.name, schoolId, active: true, createdAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 7*24*60*60*1000).toISOString() });
                        await addDoc(collection(db, 'staff'), { name: row.name, username, role, schoolId, accessCode: newCode, createdAt: new Date().toISOString(), phone: row.phone || '' });
                        successCount++;
                      }
                      toast.dismiss(loadingToast);
                      toast.success(`Imported ${successCount} staff members!`);
                    } catch (err) { toast.dismiss(loadingToast); toast.error('Import failed.'); }
                  };
                  reader.readAsText(file);
                }} />
              </label>
              <button
                onClick={() => setView('add')}
                className="flex items-center justify-center gap-2 px-6 py-2.5 bg-orange-600 text-white rounded-xl text-[12.5px] font-bold hover:bg-orange-700 transition-all shadow-sm active:scale-95 shrink-0"
              >
                <Plus size={16} /> Add Staff Member
              </button>
            </div>
          </div>

          {/* Registered Staff List */}
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm transition-colors">
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Users size={20} className="text-orange-500" /> Registered Staff
              </h3>
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input type="text" placeholder="Search staff..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-800 border-none rounded-2xl text-xs font-medium outline-none transition-all dark:text-white" />
                </div>
                <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl gap-1">
                  {(['ALL', 'TEACHING', 'NON_TEACHING'] as StaffFilter[]).map(f => (
                    <button key={f} onClick={() => setFilterRole(f)} className={`px-5 py-2 rounded-xl text-xs font-bold transition-all ${filterRole === f ? 'bg-orange-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}>
                      {f === 'ALL' ? 'All' : f === 'TEACHING' ? 'Teaching' : 'Non-Teaching'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px]">
                <thead>
                  <tr className="border-b border-slate-50 dark:border-slate-800">
                    <th className="text-left py-4 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Name / Username</th>
                    <th className="text-left py-4 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Role</th>
                    <th className="text-left py-4 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Phone / Email</th>
                    <th className="text-left py-4 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Class Teacher</th>
                    <th className="text-left py-4 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Subjects</th>
                    <th className="text-right py-4 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {registeredStaff.filter(s => {
                    const matchesRole = filterRole === 'ALL' || (filterRole === 'TEACHING' ? s.role === 'TEACHER' : s.role !== 'TEACHER');
                    const matchesSearch = (s.name || '').toLowerCase().includes(searchTerm.toLowerCase());
                    return matchesRole && matchesSearch;
                  }).map(staff => (
                    <tr key={staff.id} className="border-b border-slate-50 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-all">
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-600 font-bold shrink-0">{(staff.name || 'U').charAt(0)}</div>
                          <div>
                            <p className="text-sm font-bold text-slate-800 dark:text-white leading-none">{staff.name}</p>
                            <p className="text-[10px] font-mono text-slate-400 mt-1">@{staff.username}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className={`px-2 py-1 rounded-lg text-[10px] font-bold border ${staff.role === 'TEACHER' ? 'bg-orange-50 border-orange-100 text-orange-600' : 'bg-slate-50 border-slate-100 text-slate-500'}`}>{staff.role}</span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex flex-col gap-0.5">
                          <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">{staff.phone || '—'}</p>
                          <p className="text-[10px] text-slate-400 truncate max-w-[120px]">{staff.email || '—'}</p>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-xs font-bold text-slate-700 dark:text-slate-300">
                        {staff.classTeacherOf || '—'}
                      </td>
                      <td className="py-4 px-4">
                        {staff.teachingSubjects && Object.keys(staff.teachingSubjects).length > 0 ? (
                           <p className="text-[10px] font-medium text-slate-500 truncate max-w-[150px]">{Object.values(staff.teachingSubjects).flat().join(', ')}</p>
                        ) : '—'}
                      </td>
                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => handlePrintCredentials(staff)} className="p-2 text-slate-400 hover:text-orange-500 transition-colors bg-slate-100 dark:bg-slate-800 rounded-lg"><Printer size={14} /></button>
                          <button onClick={() => { setEditStaffForm(staff); setEditingStaffId(staff.id); }} className="p-2 text-slate-400 hover:text-blue-500 transition-colors bg-slate-100 dark:bg-slate-800 rounded-lg"><Edit2 size={14} /></button>
                          <button onClick={() => handleDeleteStaff(staff.id, staff.name)} className="p-2 text-slate-400 hover:text-rose-500 transition-colors bg-slate-100 dark:bg-slate-800 rounded-lg"><Trash2 size={14} /></button>
                          {(staff.documents?.length || 0) > 0 && (
                            <button 
                              onClick={() => {
                                // Simple list-all-docs toast or quick view
                                staff.documents?.forEach((d: any) => {
                                  const link = document.createElement('a');
                                  link.href = d.url;
                                  link.download = d.name;
                                  link.click();
                                });
                                toast.success(`Downloading ${staff.documents?.length} documents for ${staff.name}`);
                              }}
                              className="p-2 text-orange-600 hover:text-orange-700 bg-orange-50 dark:bg-orange-900/20 rounded-lg"
                              title="Download All Documents"
                            >
                              <Download size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Access Code Invitations Restoration */}
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm">
            <div className="flex items-center gap-2 mb-6">
              <Key size={20} className="text-orange-500" />
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Pending Passwords</h3>
            </div>
            {accessCodes.length === 0 ? (
              <div className="text-center py-10 opacity-50">
                <Key size={32} className="mx-auto mb-3" />
                <p className="text-sm">No pending passwords.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {accessCodes.map((item) => {
                  const isExpired = new Date(item.expiresAt) < new Date();
                  return (
                    <div key={item.id} className={`p-5 rounded-3xl border transition-all ${isExpired ? 'opacity-50 grayscale' : 'bg-slate-50 dark:bg-slate-800/40 border-slate-100 dark:border-slate-700'}`}>
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h4 className="font-bold text-slate-800 dark:text-white">{item.staffName}</h4>
                          <p className="text-[10px] text-slate-400 font-mono mt-0.5">{item.role}</p>
                        </div>
                        <button onClick={() => handleDeleteInvitation(item.id, item.staffName)} className="p-1.5 text-slate-400 hover:text-rose-500"><Trash2 size={14} /></button>
                      </div>
                      <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-100 dark:border-slate-700 flex items-center justify-between">
                        <span className="text-lg font-mono font-black text-orange-600">{item.code}</span>
                        <button onClick={() => copyToClipboard(item.code, item.id)} className="text-slate-400 hover:text-orange-600 transition-colors">
                          {copiedId === item.id ? <CheckCircle2 size={16} /> : <Copy size={16} />}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-8 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-6">
              <button 
                onClick={() => { setView('list'); setSelectedCategory(null); }}
                className="w-12 h-12 flex items-center justify-center bg-white dark:bg-slate-800 text-slate-400 hover:text-orange-600 dark:hover:text-orange-400 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 transition-all active:scale-95"
              >
                <ArrowLeft size={24} />
              </button>
              <div>
                <h3 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Staff Registration</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">Add a new member to your school's workforce.</p>
              </div>
            </div>
            <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-orange-50 dark:bg-orange-900/20 rounded-full border border-orange-100 dark:border-orange-800/30">
              <span className="text-orange-600 dark:text-orange-400 text-[10px] font-bold uppercase tracking-widest">Registry Workspace</span>
            </div>
          </div>

          <div className="py-2">
            {!selectedCategory && (
              <div className="max-w-4xl mx-auto py-10">
                <div className="text-center mb-12">
                   <h4 className="text-xl font-bold text-slate-900 dark:text-white">Who are you registering?</h4>
                   <p className="text-sm text-slate-500 mt-2">Select a category to continue with the appropriate registration form.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {categoryOptions.map((cat: any) => (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id as StaffCategory)}
                      className={`flex flex-col items-center justify-center gap-6 p-10 rounded-[2.5rem] border-2 transition-all group hover:scale-[1.02] active:scale-[0.98] bg-white dark:bg-slate-900/50 ${selectedCategory === cat.id ? 'border-orange-600' : 'border-slate-100 dark:border-slate-800 hover:border-orange-500/30'}`}
                    >
                      <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center group-hover:bg-orange-50 dark:group-hover:bg-orange-900/20 group-hover:text-orange-600 transition-colors">{cat.icon}</div>
                      <div className="text-center">
                        <span className="block text-lg font-bold text-slate-800 dark:text-white mb-1 group-hover:text-orange-600 transition-colors">{cat.label}</span>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Initialize Member</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="max-w-5xl mx-auto">
               {/* Teacher Form */}
              {selectedCategory === 'TEACHER' && (
                <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10 pb-6 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-4">
                      <button type="button" onClick={() => setSelectedCategory(null)} className="text-slate-400 hover:text-orange-600 transition-colors flex items-center gap-2 text-sm font-bold">
                        <ArrowLeft size={16} /> Back to selection
                      </button>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-xl flex items-center justify-center text-orange-600"><BookOpen size={20} /></div>
                      <div>
                        <h4 className="text-xl font-bold text-slate-900 dark:text-white">Teacher Registration</h4>
                        <p className="text-xs text-slate-500 font-medium">Capture professional and contact details.</p>
                      </div>
                    </div>
                  </div>

                  <form onSubmit={handleTeacherSubmit} className="space-y-12">
                    <div className="bg-white dark:bg-slate-800/50 rounded-[2rem] p-8 md:p-10 border border-slate-200/60 dark:border-slate-700/60 shadow-sm">
                      <h5 className="text-sm font-bold text-slate-900 dark:text-white mb-8 flex items-center gap-2 uppercase tracking-widest">
                        <span className="w-1.5 h-6 bg-orange-600 rounded-full"></span>
                        Professional Profile
                      </h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6">
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-1 uppercase tracking-tight">Full Name</label>
                          <div className="relative">
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input type="text" value={teacherForm.name} onChange={e => setTeacherForm(p => ({...p, name: e.target.value}))} className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all font-medium" placeholder="e.g. John Doe" required />
                          </div>
                        </div>

                        <SmoothDropdown 
                          label="Gender"
                          value={teacherForm.gender}
                          onChange={val => setTeacherForm(p => ({...p, gender: val}))}
                          options={['Male', 'Female', 'Other']}
                          icon={Users}
                        />

                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-1 uppercase tracking-tight">TSC / License Number</label>
                          <div className="relative">
                            <Shield className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input type="text" value={teacherForm.tc} onChange={e => setTeacherForm(p => ({...p, tc: e.target.value}))} className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all font-medium" placeholder="TSC/XXXXXX" />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-1 uppercase tracking-tight">Phone Number</label>
                          <div className="relative">
                            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input type="tel" value={teacherForm.phone} onChange={e => setTeacherForm(p => ({...p, phone: e.target.value}))} className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all font-medium" placeholder="07XXXXXXXX" />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-1 uppercase tracking-tight">Email Address</label>
                          <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input type="email" value={teacherForm.email} onChange={e => setTeacherForm(p => ({...p, email: e.target.value}))} className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all font-medium" placeholder="teacher@school.com" />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-1 uppercase tracking-tight">Employment Date</label>
                          <div className="relative">
                            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input type="date" value={teacherForm.employmentDate} onChange={e => setTeacherForm(p => ({...p, employmentDate: e.target.value}))} className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all font-medium" />
                          </div>
                        </div>

                        <SmoothDropdown 
                          label="Contract Type"
                          value={teacherForm.contractType}
                          onChange={val => setTeacherForm(p => ({...p, contractType: val}))}
                          options={CONTRACT_TYPES}
                          icon={Briefcase}
                        />

                        <SmoothDropdown 
                          label="Class Teacher Of"
                          value={teacherForm.classTeacherOf}
                          onChange={val => setTeacherForm(p => ({...p, classTeacherOf: val}))}
                          options={schoolProfile?.grades?.length ? schoolProfile.grades : CBC_GRADES}
                          icon={GraduationCap}
                          placeholder="Select Grade"
                          showSearch
                        />

                        <SmoothDropdown 
                          label="Assign Stream"
                          value={teacherForm.stream}
                          onChange={val => setTeacherForm(p => ({...p, stream: val}))}
                          options={
                            teacherForm.classTeacherOf 
                              ? (schoolProfile?.streams || []).filter((s: string) => s.startsWith(teacherForm.classTeacherOf))
                              : (schoolProfile?.streams || [])
                          }
                          icon={MapPin}
                          placeholder={
                            teacherForm.classTeacherOf 
                              ? `Select Stream for ${teacherForm.classTeacherOf}` 
                              : (schoolProfile?.streams?.length ? "Select Stream" : "No streams configured")
                          }
                          showSearch
                        />
                      </div>
                    </div>

                    {/* Academic Assignments */}
                    <div className="bg-white dark:bg-slate-800/50 rounded-[2rem] p-8 md:p-10 border border-slate-200/60 dark:border-slate-700/60 shadow-sm relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none">
                        <GraduationCap size={120} />
                      </div>
                      <h5 className="text-sm font-bold text-slate-900 dark:text-white mb-8 flex items-center gap-2 uppercase tracking-widest">
                        <span className="w-1.5 h-6 bg-orange-600 rounded-full"></span>
                        Academic Assignments
                      </h5>
                      
                      <div className="space-y-8">
                        <div>
                          <label className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-1 uppercase tracking-widest mb-4 block">Select Grades {teacherForm.name ? `of ${teacherForm.name}` : ''}</label>
                          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                            {(schoolProfile?.grades?.length ? schoolProfile.grades : CBC_GRADES).map((grade: string) => {
                              const isSelected = teacherForm.teachingGrades.includes(grade);
                              return (
                                <button
                                  key={grade}
                                  type="button"
                                  onClick={() => {
                                    setTeacherForm(prev => {
                                      const grades = prev.teachingGrades.includes(grade)
                                        ? prev.teachingGrades.filter(g => g !== grade)
                                        : [...prev.teachingGrades, grade];
                                      return { ...prev, teachingGrades: grades };
                                    });
                                  }}
                                  className={`py-3 px-2 rounded-xl text-xs font-bold transition-all border-2 ${
                                    isSelected 
                                      ? 'bg-orange-600 border-orange-600 text-white shadow-lg shadow-orange-500/20' 
                                      : 'bg-slate-50 dark:bg-slate-900/50 border-slate-100 dark:border-slate-800 text-slate-500 hover:border-orange-500/30'
                                  }`}
                                >
                                  {grade}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {teacherForm.teachingGrades.length > 0 && (
                          <div className="pt-6 border-t border-slate-100 dark:border-slate-800 space-y-8">
                            {teacherForm.teachingGrades.map(grade => (
                              <div key={grade} className="animate-in fade-in slide-in-from-left-4 duration-300">
                                <label className="text-xs font-bold text-orange-600 dark:text-orange-400 ml-1 uppercase tracking-widest mb-4 block">Subjects for {grade}</label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                  {SUBJECTS.map(subject => {
                                    const isSelected = teacherForm.teachingSubjects[grade]?.includes(subject);
                                    return (
                                      <button
                                        key={subject}
                                        type="button"
                                        onClick={() => {
                                          setTeacherForm(prev => {
                                            const subjects = prev.teachingSubjects[grade] || [];
                                            const newSubjects = subjects.includes(subject)
                                              ? subjects.filter(s => s !== subject)
                                              : [...subjects, subject];
                                            return {
                                              ...prev,
                                              teachingSubjects: { ...prev.teachingSubjects, [grade]: newSubjects }
                                            };
                                          });
                                        }}
                                        className={`py-3 px-4 rounded-xl text-[11px] font-bold text-left transition-all border-2 flex items-center gap-2 ${
                                          isSelected
                                            ? 'bg-slate-900 border-slate-900 text-white shadow-lg shadow-slate-900/10'
                                            : 'bg-white dark:bg-slate-900/50 border-slate-100 dark:border-slate-800 text-slate-500 hover:border-orange-500/30'
                                        }`}
                                      >
                                        <div className={`w-2 h-2 rounded-full ${isSelected ? 'bg-orange-500' : 'bg-slate-200 dark:bg-slate-700'}`}></div>
                                        {subject}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Registration Documents Section */}
                    <div className="bg-white dark:bg-slate-800/50 rounded-[2rem] p-8 md:p-10 border border-slate-200/60 dark:border-slate-700/60 shadow-sm">
                      <h5 className="text-sm font-bold text-slate-900 dark:text-white mb-8 flex items-center gap-2 uppercase tracking-widest">
                        <span className="w-1.5 h-6 bg-blue-600 rounded-full"></span>
                        Onboarding Documents
                      </h5>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="p-6 rounded-[2rem] border-2 border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center gap-4 hover:border-orange-500/50 transition-all group">
                          <div className="w-16 h-16 bg-slate-50 dark:bg-slate-900 rounded-2xl flex items-center justify-center text-slate-400 group-hover:text-orange-600 transition-colors">
                            <Briefcase size={28} />
                          </div>
                          <div className="text-center">
                            <h6 className="text-sm font-bold dark:text-white">Professional Contract</h6>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">PDF, JPG (Max 5MB)</p>
                          </div>
                          <label className="cursor-pointer px-6 py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-black rounded-full hover:scale-105 transition-transform">
                            {teacherForm.documents?.length ? 'ADD MORE' : 'ATTACH CONTRACT'}
                            <input type="file" className="hidden" onChange={(e) => handleStaffDocumentUpload(e, true)} />
                          </label>
                        </div>

                        {teacherForm.documents && teacherForm.documents.length > 0 && (
                          <div className="space-y-3">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Staged Documents ({teacherForm.documents.length})</p>
                            <div className="space-y-2 overflow-y-auto max-h-[150px] pr-2 custom-scrollbar">
                              {teacherForm.documents.map((doc: any, i: number) => (
                                <div key={doc.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800">
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center text-orange-600">
                                      <FileText size={14} />
                                    </div>
                                    <span className="text-xs font-bold truncate max-w-[120px] dark:text-slate-300">{doc.name}</span>
                                  </div>
                                  <button type="button" onClick={() => setTeacherForm(p => ({...p, documents: p.documents?.filter((_, idx) => idx !== i)}))} className="text-slate-400 hover:text-rose-500">
                                    <X size={14} />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 pt-6">
                      <button type="submit" disabled={isGenerating} className="flex-1 bg-orange-600 text-white py-5 rounded-[2rem] font-bold text-base hover:bg-orange-700 transition-all shadow-xl shadow-orange-500/20 flex items-center justify-center gap-3 active:scale-95 disabled:opacity-70 group">
                        {isGenerating ? <Loader2 className="animate-spin" /> : <><CheckCircle2 size={24} className="group-hover:scale-110 transition-transform" /> Finalize Registration & Generate Password</>}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* General Form */}
              {selectedCategory && selectedCategory !== 'TEACHER' && (
                 <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10 pb-6 border-b border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-4">
                        <button type="button" onClick={() => setSelectedCategory(null)} className="text-slate-400 hover:text-orange-600 transition-colors flex items-center gap-2 text-sm font-bold">
                          <ArrowLeft size={16} /> Back to selection
                        </button>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-xl flex items-center justify-center text-orange-600"><Briefcase size={20} /></div>
                        <div>
                          <h4 className="text-xl font-bold text-slate-900 dark:text-white">{selectedCategory} Registration</h4>
                          <p className="text-xs text-slate-500 font-medium">Capture administrative and role details.</p>
                        </div>
                      </div>
                    </div>

                    <form onSubmit={handleGeneralStaffSubmit} className="space-y-12">
                      <div className="bg-white dark:bg-slate-800/50 rounded-[2rem] p-8 md:p-10 border border-slate-200/60 dark:border-slate-700/60 shadow-sm">
                        <h5 className="text-sm font-bold text-slate-900 dark:text-white mb-8 flex items-center gap-2 uppercase tracking-widest">
                          <span className="w-1.5 h-6 bg-slate-400 rounded-full"></span>
                          Employment Details
                        </h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-6">
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-1 uppercase tracking-tight">Full Name</label>
                            <div className="relative">
                              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                              <input type="text" value={generalStaffForm.name} onChange={e => setGeneralStaffForm(p => ({...p, name: e.target.value}))} className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all font-medium" placeholder="e.g. Jane Doe" required />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-1 uppercase tracking-tight">Position / Responsibility</label>
                            <div className="relative">
                              <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                              <input type="text" value={generalStaffForm.responsibility} onChange={e => setGeneralStaffForm(p => ({...p, responsibility: e.target.value}))} className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all font-medium" placeholder="e.g. Bursar" />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-1 uppercase tracking-tight">Phone Number</label>
                            <div className="relative">
                              <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                              <input type="tel" value={generalStaffForm.phone} onChange={e => setGeneralStaffForm(p => ({...p, phone: e.target.value}))} className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all font-medium" placeholder="07XXXXXXXX" />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-1 uppercase tracking-tight">Employment Date</label>
                            <div className="relative">
                              <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                              <input type="date" value={generalStaffForm.employmentDate} onChange={e => setGeneralStaffForm(p => ({...p, employmentDate: e.target.value}))} className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all font-medium" />
                            </div>
                          </div>
                          <SmoothDropdown 
                            label="Contract Type"
                            value={generalStaffForm.contractType}
                            onChange={val => setGeneralStaffForm(p => ({...p, contractType: val}))}
                            options={['Permanent', 'Temporary', 'Contract', 'Part-Time', 'Relief', 'Board of Management (BOM)']}
                            icon={Briefcase}
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-4 pt-6">
                        <button type="submit" disabled={isGenerating} className="flex-1 bg-slate-900 text-white py-5 rounded-[2rem] font-bold text-base hover:bg-black transition-all shadow-xl shadow-slate-900/10 flex items-center justify-center gap-3 active:scale-95 disabled:opacity-70 group">
                          {isGenerating ? <Loader2 className="animate-spin" /> : <><Key size={24} className="group-hover:rotate-12 transition-transform" /> Secure Invite & Generate Password</>}
                        </button>
                      </div>
                    </form>
                 </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Staff Modal */}
      {editingStaffId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="relative bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-lg p-10">
            <h3 className="text-2xl font-black text-slate-800 dark:text-white mb-6">Edit Staff Details</h3>
            <form onSubmit={handleEditSave} className="space-y-5">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                <input type="text" value={editStaffForm.name || ''} onChange={e => setEditStaffForm(p => ({...p, name: e.target.value}))} className="w-full p-4 border-2 border-slate-100 dark:border-slate-700 rounded-2xl font-bold bg-slate-50 dark:bg-slate-800 focus:bg-white outline-none transition-all" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Phone</label>
                <input type="text" value={editStaffForm.phone || ''} onChange={e => setEditStaffForm(p => ({...p, phone: e.target.value}))} className="w-full p-4 border-2 border-slate-100 dark:border-slate-700 rounded-2xl font-bold bg-slate-50 dark:bg-slate-800 focus:bg-white outline-none transition-all" />
              </div>
              <div className="flex gap-3 justify-end mt-8">
                <button type="button" onClick={() => setEditingStaffId(null)} className="px-6 py-3 font-bold text-slate-500 rounded-xl hover:bg-slate-100">Cancel</button>
                <button type="submit" className="px-8 py-3 bg-orange-600 text-white rounded-xl font-bold shadow-lg shadow-orange-500/20">Sync Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Print Credentials Modal */}
      {printingStaff && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-300">
          <div className="relative bg-white dark:bg-slate-900 w-full max-w-md rounded-[3rem] p-10 shadow-2xl animate-in zoom-in-95 duration-200 border border-slate-100 dark:border-slate-800">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-xl font-black dark:text-white tracking-tight">Print Credentials</h3>
              <button 
                onClick={() => setPrintingStaff(null)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div id="credentials-slip" className="p-8 bg-slate-50 rounded-[2.5rem] border-2 border-dashed border-slate-200 text-center">
              <div className="w-16 h-16 bg-orange-600 rounded-3xl flex items-center justify-center text-white mx-auto mb-5 shadow-xl shadow-orange-500/20">
                <GraduationCap size={32} />
              </div>
              <h4 className="text-xl font-black text-slate-800 mb-1">{printingStaff.name || printingStaff.staffName}</h4>
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-8">Security Credentials</p>
              
              <div className="space-y-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Username</p>
                  <p className="text-lg font-mono font-black text-slate-800">{printingStaff.username}</p>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm ring-4 ring-orange-500/5">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Login Password</p>
                  <p className="text-3xl font-mono font-black text-orange-600 tracking-tighter">{printingStaff.accessCode || printingStaff.code || 'N/A'}</p>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-slate-100">
                <p className="text-[10px] text-slate-400 leading-relaxed italic font-medium">
                  Confidential document. Keep this key secure and do not share your credentials with unauthorized personnel.
                </p>
              </div>
            </div>

            <div className="flex gap-4 mt-10">
              <button 
                onClick={() => setPrintingStaff(null)}
                className="flex-1 py-4 text-slate-500 text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-800 rounded-2xl transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={() => window.print()}
                className="flex-1 py-4 bg-slate-900 text-white text-sm font-black uppercase rounded-2xl hover:bg-black transition-all active:scale-95 shadow-lg flex items-center justify-center gap-3"
              >
                <Printer size={18} />
                Print Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffManagement;
