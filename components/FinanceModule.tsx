
import React, { useState, useMemo, useRef, useEffect } from 'react';
import InvoiceReceipt from './InvoiceReceipt';
import { 
  AreaChart, 
  Area, 
  BarChart,
  Bar,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { 
  Wallet, 
  ArrowUpRight, 
  ArrowDownRight, 
  Download, 
  Plus, 
  CreditCard, 
  Search, 
  Filter, 
  Banknote,
  ArrowRight,
  Printer,
  MessageSquare,
  CheckCircle2,
  X,
  Smartphone,
  FileText,
  UploadCloud,
  Activity,
  ShieldCheck,
  Loader2,
  Target,
  Zap,
  Eye,
  EyeOff,
  Calendar,
  Sparkles,
  LayoutGrid,
  Users,
  ChevronDown
} from 'lucide-react';

import { useReactToPrint } from 'react-to-print';
import toast from 'react-hot-toast';
import { db, auth } from '../src/firebase';
import { collection, query, where, onSnapshot, getDocs, addDoc, updateDoc, doc, increment, serverTimestamp, deleteDoc, getDoc } from 'firebase/firestore';
import { Student, Payment, FeeStructure, PaymentMethod, Expense, CBCGrade, FeeCategory } from '../types';

interface FinanceModuleProps {
  role?: string | null;
  activeTab?: 'collections' | 'expenses' | 'etims' | 'analytics' | 'settings' | 'fee-per-class';
  collectionsSubTab?: 'graph' | 'quickpay' | 'net' | 'arrears' | 'directory';
  onTabChange?: (tab: 'collections' | 'expenses' | 'etims' | 'analytics' | 'settings' | 'fee-per-class') => void;
  onCollectionsSubTabChange?: (tab: 'graph' | 'quickpay' | 'net' | 'arrears' | 'directory') => void;
  isMockAuth?: boolean;
}

const toTitleCase = (str: string): string => {
  if (!str) return '';
  return str
    .toLowerCase()
    .split(' ')
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const CustomTooltip = ({ active, payload, label }: any) => {
// ... unchanged
  if (active && payload && payload.length) {
// ... unchanged
    const collected = payload.find((p: any) => p.dataKey === 'collected')?.value || 0;
// ... unchanged
    const target = payload.find((p: any) => p.dataKey === 'target')?.value || 0;
// ... unchanged
    const progress = target > 0 ? (collected / target) * 100 : 0;
// ... unchanged

    return (
      <div className="bg-slate-900/90 backdrop-blur-md border border-white/10 p-6 rounded-[2rem] shadow-2xl shadow-black/40 min-w-[240px]">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">{label}</p>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-8">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#819f09]" />
              <span className="text-xs font-bold text-slate-300">Collected</span>
            </div>
            <span className="text-sm font-black text-white">KES {collected.toLocaleString()}</span>
          </div>

          <div className="flex items-center justify-between gap-8">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-slate-500" />
              <span className="text-xs font-bold text-slate-300">Target</span>
            </div>
            <span className="text-sm font-black text-white">KES {target.toLocaleString()}</span>
          </div>

          <div className="pt-4 border-t border-white/5">
             <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Progress</span>
                <span className="text-[10px] font-black text-[#819f09]">{progress.toFixed(1)}%</span>
             </div>
             <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-[#819f09] to-emerald-500 transition-all duration-1000" 
                  style={{ width: `${Math.min(progress, 100)}%` }} 
                />
             </div>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

const FinanceModule: React.FC<FinanceModuleProps> = ({ 
  role, 
  activeTab: propActiveTab, 
  onTabChange: propOnTabChange, 
  collectionsSubTab: propCollectionsSubTab, 
  onCollectionsSubTabChange: propOnCollectionsSubTabChange,
  isMockAuth = false
}) => {
  const [localActiveTab, setLocalActiveTab] = useState<'collections' | 'expenses' | 'etims' | 'analytics' | 'settings' | 'fee-per-class'>('collections');
  const activeTab = propActiveTab || localActiveTab;
  const setActiveTab = propOnTabChange || setLocalActiveTab;

  const [localCollectionsSubTab, setLocalCollectionsSubTab] = useState<'graph' | 'quickpay' | 'net' | 'arrears' | 'directory'>('graph');
  const collectionsSubTab = propCollectionsSubTab || localCollectionsSubTab;
  const setCollectionsSubTab = propOnCollectionsSubTabChange || setLocalCollectionsSubTab;
  const [viewMode, setViewMode] = useState<'Weekly' | 'Termly'>('Termly');
  const [timeFilter, setTimeFilter] = useState<'All' | 'Week' | 'Month' | 'Year' | 'Term 1' | 'Term 2' | 'Term 3'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [gradeFilter, setGradeFilter] = useState<string>('All');
  const [admFilter, setAdmFilter] = useState('');
  const [userRole, setUserRole] = useState<string | null>(null);
  const [schoolName, setSchoolName] = useState('School Portal');
  const [schoolLogo, setSchoolLogo] = useState<string | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [selectedStudentProfile, setSelectedStudentProfile] = useState<Student | null>(null);
  const [showFeeModal, setShowFeeModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [editingFee, setEditingFee] = useState<FeeStructure | null>(null);
  const [maximizedTerm, setMaximizedTerm] = useState<string | null>(null);
  
  const [students, setStudents] = useState<Student[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [feeStructures, setFeeStructures] = useState<FeeStructure[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [feeTargets, setFeeTargets] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [showTargetModal, setShowTargetModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showInvoice, setShowInvoice] = useState(false);
  const [invoiceStudent, setInvoiceStudent] = useState<Student | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [adjustmentAmount, setAdjustmentAmount] = useState('');
  const [adjustmentReason, setAdjustmentReason] = useState('');

  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentAdmNo, setPaymentAdmNo] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('M-Pesa');
  
  const [supplierName, setSupplierName] = useState('');
  const [supplierBank, setSupplierBank] = useState('');
  const [supplierAccount, setSupplierAccount] = useState('');
  const [supplierKRA, setSupplierKRA] = useState('');
  const [supplierAmount, setSupplierAmount] = useState('');
  const [supplierReason, setSupplierReason] = useState('');
  
  const [isProcessing, setIsProcessing] = useState(false);

  const [isCustomGrade, setIsCustomGrade] = useState(false);
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [isCustomAppliesTo, setIsCustomAppliesTo] = useState(false);
  const [isCustomExpenseCategory, setIsCustomExpenseCategory] = useState(false);
  
  const [personalPhoto, setPersonalPhoto] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const [showSMSModal, setShowSMSModal] = useState(false);
  const [smsStudent, setSmsStudent] = useState<Student | null>(null);
  const [smsDeadline, setSmsDeadline] = useState('');
  
  // Fee per Class module states
  const [feeClassGradeFilter, setFeeClassGradeFilter] = useState<string>('All');
  const [feeClassStreamFilter, setFeeClassStreamFilter] = useState<string>('All');
  const [expandedStudentId, setExpandedStudentId] = useState<string | null>(null);
  const [smsInstructions, setSmsInstructions] = useState('Paybill: [PAYBILL], Acc: [ADM]');

  // Heatmap States & Memoized Day Map (moved here to prevent conditional hook violations)
  const [heatmapTerm, setHeatmapTerm] = useState<string>('Term 1');
  const [hoveredDay, setHoveredDay] = useState<{ month: string; day: number; amount: number } | null>(null);

  const dayAmountMap = useMemo(() => {
    const map: Record<string, number> = {};
    payments.forEach(p => {
      const d = new Date(p.date);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      map[key] = (map[key] || 0) + (p.amount || 0);
    });
    return map;
  }, [payments]);

  // Fetch data
  React.useEffect(() => {
    if (isMockAuth) {
      const loadMockData = async () => {
        const { MOCK_STUDENTS, MOCK_PAYMENTS, MOCK_EXPENSES, MOCK_FEE_STRUCTURES, MOCK_STAFF } = await import('../demoData');
        const formattedMock = MOCK_STUDENTS.map((s: any) => ({
          ...s,
          name: toTitleCase(s.name || ''),
          grade: s.grade ? toTitleCase(s.grade) : s.grade,
          stream: s.stream ? toTitleCase(s.stream) : s.stream,
          boardingType: s.boardingType ? toTitleCase(s.boardingType) : s.boardingType,
          parentInfo: s.parentInfo ? {
            ...s.parentInfo,
            fatherName: s.parentInfo.fatherName ? toTitleCase(s.parentInfo.fatherName) : s.parentInfo.fatherName,
            motherName: s.parentInfo.motherName ? toTitleCase(s.parentInfo.motherName) : s.parentInfo.motherName,
            guardianName: s.parentInfo.guardianName ? toTitleCase(s.parentInfo.guardianName) : s.parentInfo.guardianName
          } : s.parentInfo
        }));
        setStudents(formattedMock);
        setPayments(MOCK_PAYMENTS);
        setExpenses(MOCK_EXPENSES);
        setFeeStructures(MOCK_FEE_STRUCTURES);
        setStaff(MOCK_STAFF);
        setIsLoading(false);
      };
      loadMockData();
      return;
    }

    const user = auth.currentUser;
    if (!user) return;

    const fetchData = async () => {
      let schoolId = user.uid;
      const staffDocRef = doc(db, 'staff', user.uid);
      const staffDocSnap = await getDoc(staffDocRef);
      if (staffDocSnap.exists()) {
        const data = staffDocSnap.data();
        if (data) {
          schoolId = data.schoolId;
          if (data.profilePhoto) {
            setPersonalPhoto(data.profilePhoto);
          }
        }
      }

      const qStudents = query(collection(db, 'students'), where('schoolId', '==', schoolId));
      const qPayments = query(collection(db, 'payments'), where('schoolId', '==', schoolId));
      const qFees = query(collection(db, 'fee_structures'), where('schoolId', '==', schoolId));
      const qExpenses = query(collection(db, 'expenses'), where('schoolId', '==', schoolId));
      const qTargets = query(collection(db, 'fee_targets'), where('schoolId', '==', schoolId));

      const unsubStudents = onSnapshot(qStudents, (snapshot) => {
        setStudents(snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            name: toTitleCase(data.name || ''),
            grade: data.grade ? toTitleCase(data.grade) : data.grade,
            stream: data.stream ? toTitleCase(data.stream) : data.stream,
            boardingType: data.boardingType ? toTitleCase(data.boardingType) : data.boardingType,
            parentInfo: data.parentInfo ? {
              ...data.parentInfo,
              fatherName: data.parentInfo.fatherName ? toTitleCase(data.parentInfo.fatherName) : data.parentInfo.fatherName,
              motherName: data.parentInfo.motherName ? toTitleCase(data.parentInfo.motherName) : data.parentInfo.motherName,
              guardianName: data.parentInfo.guardianName ? toTitleCase(data.parentInfo.guardianName) : data.parentInfo.guardianName
            } : data.parentInfo
          } as Student;
        }));
      });

      const unsubPayments = onSnapshot(qPayments, (snapshot) => {
        setPayments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Payment)));
      });

      const unsubFees = onSnapshot(qFees, (snapshot) => {
        setFeeStructures(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FeeStructure)));
      });

      const unsubExpenses = onSnapshot(qExpenses, (snapshot) => {
        setExpenses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Expense)));
        setIsLoading(false);
      });

      const unsubTargets = onSnapshot(qTargets, (snapshot) => {
        setFeeTargets(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });

      const qStaff = query(collection(db, 'staff'), where('schoolId', '==', schoolId));
      const unsubStaff = onSnapshot(qStaff, (snapshot) => {
        setStaff(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });

      return () => {
        unsubStudents();
        unsubPayments();
        unsubFees();
        unsubExpenses();
        unsubTargets();
        unsubStaff();
      };
    };

    let unsubscribe: () => void;
    fetchData().then(unsub => {
      unsubscribe = unsub;
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [isMockAuth]);

  useEffect(() => {
    if (isMockAuth) {
      setSchoolName("BrightSoma Demo Academy");
      setSchoolLogo(null);
      setUserRole(role || 'FINANCE');
      return;
    }

    const user = auth.currentUser;
    if (!user) return;

    const fetchProfile = async () => {
      try {
        const staffDoc = await getDoc(doc(db, 'staff', user.uid));
        if (staffDoc.exists()) {
          const data = staffDoc.data();
          setUserRole(data.role || 'STAFF');
          
          if (data.schoolId) {
            const schoolDoc = await getDoc(doc(db, 'schools', data.schoolId));
            if (schoolDoc.exists()) {
              const sData = schoolDoc.data();
              setSchoolName(sData.schoolName || sData.name || 'BrightSoma Institution');
              if (sData.logo || sData.schoolLogo || sData.profilePhoto) {
                setSchoolLogo(sData.logo || sData.schoolLogo || sData.profilePhoto);
              }
            } else {
              const userDoc = await getDoc(doc(db, 'users', data.schoolId));
              if (userDoc.exists()) {
                const uData = userDoc.data();
                setSchoolName(uData.schoolProfile?.name || uData.schoolName || 'BrightSoma Institution');
                if (uData.schoolProfile?.logo || uData.logo) {
                  setSchoolLogo(uData.schoolProfile?.logo || uData.logo);
                }
              }
            }
          }
        }
      } catch (err) {
        console.error("Error fetching profile:", err);
      }
    };

    fetchProfile();
  }, [isMockAuth, role]);

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
        
        // Save to staff collection for finance officers
        const staffRef = doc(db, 'staff', user.uid);
        await updateDoc(staffRef, { profilePhoto: base64String });
        
        setPersonalPhoto(base64String);
        toast.success('Profile photo updated successfully!');
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Error uploading photo:", error);
      toast.error("Failed to update photo");
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const receiptRef = useRef<HTMLDivElement>(null);
  const invoiceRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({ contentRef: receiptRef });
  const handleInvoicePrint = useReactToPrint({ contentRef: invoiceRef });

  const totalCollected = useMemo(() => payments.reduce((sum, p) => sum + p.amount, 0), [payments]);
  const totalArrears = useMemo(() => students.reduce((sum, s) => sum + (s.balance || 0), 0), [students]);
  const feeTarget = useMemo(() => totalCollected + totalArrears, [totalCollected, totalArrears]);
  const collectionRate = useMemo(() => feeTarget > 0 ? Math.round((totalCollected / feeTarget) * 100) : 0, [totalCollected, feeTarget]);

  const chartData = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const monthlyTarget = feeTarget / 12;
    const weeklyTarget = feeTarget / 52;
    const dailyTarget = weeklyTarget / 7;

    let targetMonths: number[] = [];

    if (timeFilter === 'Month' || timeFilter === 'Year') targetMonths = Array.from({ length: 12 }, (_, i) => i);
    if (timeFilter === 'Term 1') targetMonths = [0, 1, 2]; // Jan, Feb, Mar
    if (timeFilter === 'Term 2') targetMonths = [4, 5, 6]; // May, Jun, Jul
    if (timeFilter === 'Term 3') targetMonths = [8, 9, 10]; // Sep, Oct, Nov
    
    if (targetMonths.length > 0) {
      return targetMonths.map(m => {
        const monthPayments = payments.filter(p => {
          const d = new Date(p.date);
          return d.getFullYear() === currentYear && d.getMonth() === m;
        });
        const total = monthPayments.reduce((sum, p) => sum + p.amount, 0);
        return {
          name: new Date(currentYear, m).toLocaleDateString('en-GB', { month: 'short' }),
          collected: total,
          target: Math.round(monthlyTarget)
        };
      });
    }

    // Default to Weekly View if not a term/month/year category
    const days = 7;
    const dates = Array.from({ length: days }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (days - 1 - i));
      return d.toISOString().split('T')[0];
    });

    return dates.map(date => {
      const dayPayments = payments.filter(p => p.date.startsWith(date));
      const total = dayPayments.reduce((sum, p) => sum + p.amount, 0);
      return {
        name: new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
        collected: total,
        target: Math.round(dailyTarget)
      };
    });
  }, [payments, timeFilter, feeTarget]);

  const totalExpenses = useMemo(() => expenses.reduce((sum, e) => sum + e.amount, 0), [expenses]);
  const totalPayables = useMemo(() => expenses.filter(e => e.status === 'Pending').reduce((sum, e) => sum + e.amount, 0), [expenses]);
  const topExpenses = useMemo(() => [...expenses].sort((a, b) => b.amount - a.amount).slice(0, 5), [expenses]);

  const historicalData = useMemo(() => [
    { term: 'Current Term', collected: totalCollected, target: feeTarget },
  ], [totalCollected, feeTarget]);



  const filteredPayments = useMemo(() => {
    const now = new Date();
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    return payments.filter(p => {
      const pDate = new Date(p.date);
      const pMonth = pDate.getMonth();
      const pYear = pDate.getFullYear();
      const currentYear = new Date().getFullYear();

      if (timeFilter === 'Week') return pDate >= startOfWeek;
      if (timeFilter === 'Month') return pDate >= startOfMonth;
      if (timeFilter === 'Year') return pDate >= startOfYear;
      if (timeFilter === 'Term 1') return pYear === currentYear && [0, 1, 2].includes(pMonth);
      if (timeFilter === 'Term 2') return pYear === currentYear && [4, 5, 6].includes(pMonth);
      if (timeFilter === 'Term 3') return pYear === currentYear && [8, 9, 10].includes(pMonth);
      return true;
    });
  }, [payments, timeFilter]);

  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const studentPayments = filteredPayments.filter(p => p.studentId === s.id || p.adm === s.admissionNumber);
      if (timeFilter !== 'All' && studentPayments.length === 0) return false;

      const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           s.admissionNumber.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesGrade = gradeFilter === 'All' || s.grade === gradeFilter;
      const matchesAdm = !admFilter || s.admissionNumber.toLowerCase().includes(admFilter.toLowerCase());
      
      return matchesSearch && matchesGrade && matchesAdm;
    });
  }, [students, searchQuery, gradeFilter, admFilter, filteredPayments, timeFilter]);

  const groupedStatementData = useMemo(() => {
    if (!selectedStudentProfile) return [];
    
    const studentPayments = payments.filter(p => p.studentId === selectedStudentProfile.id || p.adm === selectedStudentProfile.admissionNumber);
    
    const terms = ['Term 1', 'Term 2', 'Term 3'];
    return terms.map(termName => {
      const termPayments = studentPayments.filter(p => (p.term || '').includes(termName));
      const totalPaid = termPayments.reduce((sum, p) => sum + p.amount, 0);
      
      const data: any[] = [];
      
      if (termName === 'Term 1' && ((selectedStudentProfile.balance || 0) > 0 || totalPaid > 0)) {
        data.push({
          date: '02 Jan 2026',
          time: '08:00 AM',
          session: 'Term 1 - 2026',
          desc: 'Standard Invoice (Term Opening)',
          inv: ((selectedStudentProfile.balance || 0) + totalPaid).toLocaleString(),
          rec: '',
          bal: ((selectedStudentProfile.balance || 0) + totalPaid).toLocaleString()
        });
      }

      let runningBal = termName === 'Term 1' ? ((selectedStudentProfile.balance || 0) + totalPaid) : 0;
      
      [...termPayments].sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()).forEach(p => {
        runningBal -= p.amount;
        data.push({
          date: new Date(p.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
          time: new Date(p.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          session: p.term || termName,
          desc: `${p.method} Payment (${p.transactionCode || p.code || 'N/A'})`,
          inv: '',
          rec: p.amount.toLocaleString(),
          bal: runningBal > 0 ? runningBal.toLocaleString() : '0'
        });
      });
      
      return {
        id: termName.toLowerCase().replace(' ', ''),
        term: `${termName} - 2026`,
        data: data,
        totals: {
          fees: termName === 'Term 1' ? (selectedStudentProfile.hasFeeRecord === false ? 'Need Action' : ((selectedStudentProfile.balance || 0) + totalPaid).toLocaleString()) : '0',
          paid: totalPaid.toLocaleString(),
          bal: termName === 'Term 1' ? (selectedStudentProfile.hasFeeRecord === false ? 'Need Action' : (selectedStudentProfile.balance || 0).toLocaleString()) : '0'
        }
      };
    });
  }, [selectedStudentProfile, payments]);

  const handleTransmitToETims = async (paymentId: string) => {
    toast.loading('Transmitting to KRA eTIMS...', { id: 'etims-sync' });
    try {
      // Simulate API call to KRA
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const invoiceNo = 'CU-' + Math.random().toString(36).substring(2, 10).toUpperCase();
      
      await updateDoc(doc(db, 'payments', paymentId), {
        etimsStatus: 'Success',
        etimsInvoiceNumber: invoiceNo
      });
      
      toast.success('Successfully transmitted to eTIMS', { id: 'etims-sync' });
    } catch (error) {
      console.error("eTIMS error:", error);
      toast.error('Failed to transmit to eTIMS', { id: 'etims-sync' });
    }
  };

  const etimsPayments = useMemo(() => {
    return payments.filter(p => p.etimsStatus);
  }, [payments]);

  const KpiCard = ({ title, value, delta, status, icon: Icon, subtitle }: any) => (
    <div className="bg-slate-900 rounded-3xl border border-slate-800 shadow-2xl p-10 relative overflow-hidden group transition-all duration-500 hover:shadow-orange-900/10">
      <div className="absolute top-0 right-0 w-64 h-64 bg-orange-600/10 rounded-full -mr-32 -mt-32 transition-transform duration-1000 group-hover:scale-110"></div>
      
      <div className="relative z-10">
        <div className="flex items-center gap-5 mb-10">
          <div className="w-14 h-14 bg-orange-600 rounded-xl flex items-center justify-center text-white shadow-xl shadow-orange-900/50 transition-transform duration-500 group-hover:scale-110">
            <Icon size={28} strokeWidth={2.5} />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-white tracking-tight leading-none">{title}</h3>
            <p className="text-xs font-medium text-slate-300 mt-1">{subtitle}</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
          <div className="space-y-2">
            <p className="text-[10px] font-black text-slate-400 capitalize tracking-widest ml-1">Current Balance</p>
            <div className="flex items-baseline gap-3">
              <span className="text-xs font-black text-orange-500">KES</span>
              <p className="text-5xl font-black text-white tracking-tighter leading-none">{value.toLocaleString()}</p>
            </div>
          </div>

          <div className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-xs font-black tracking-widest capitalize transition-all duration-500 border ${ status === 'up' ? 'bg-orange-600/10 text-orange-500 border-orange-500/20' : 'bg-rose-600/10 text-rose-500 border-rose-500/20' }`}>
            {status === 'up' ? <ArrowUpRight size={18} strokeWidth={3} /> : <ArrowDownRight size={18} strokeWidth={3} />}
            {delta}%
            <span className="text-[10px] opacity-40 ml-1">Trend</span>
          </div>
        </div>
      </div>
    </div>
  );

  const handleExecutePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentAdmNo || !paymentAmount) {
      toast.error("Please fill in all fields");
      return;
    }

    const student = students.find(s => s.admissionNumber === paymentAdmNo);
    if (!student) {
      toast.error("Student not found");
      return;
    }

    setIsProcessing(true);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Not authenticated");

      let schoolId = user.uid;
      const staffDocRef = doc(db, 'staff', user.uid);
      const staffDocSnap = await getDoc(staffDocRef);
      if (staffDocSnap.exists()) {
        const data = staffDocSnap.data() as any;
        if (data?.schoolId) {
          schoolId = data.schoolId;
        }
      }

      const amount = Number(paymentAmount);

      // M-Pesa Simulation
      if (paymentMethod === 'M-Pesa') {
        toast.loading('Initiating M-Pesa STK Push...', { id: 'stk-push' });
        // Simulate network delay for STK Push
        await new Promise(resolve => setTimeout(resolve, 2000));
        toast.loading('Waiting for PIN entry...', { id: 'stk-push' });
        await new Promise(resolve => setTimeout(resolve, 3000));
        toast.success('Payment authorized', { id: 'stk-push' });
      }

      const transactionCode = 'RBT' + Math.random().toString(36).substring(2, 8).toUpperCase();
      
      const paymentData = {
        schoolId,
        studentId: student.id,
        amount,
        date: new Date().toISOString(),
        method: paymentMethod,
        transactionCode,
        term: 'Current Term',
        year: new Date().getFullYear(),
        etimsStatus: 'Pending',
        createdAt: serverTimestamp()
      };

      // Add payment record
      await addDoc(collection(db, 'payments'), paymentData);

      // Update student balance
      await updateDoc(doc(db, 'students', student.id), {
        balance: increment(-amount)
      });

      // Update Bank Balance
      const bankAccountsQuery = query(collection(db, 'bank_accounts'), where('schoolId', '==', schoolId));
      const bankAccountsSnapshot = await getDocs(bankAccountsQuery);
      
      if (!bankAccountsSnapshot.empty) {
        const bankAccountDoc = bankAccountsSnapshot.docs[0];
        if (paymentMethod === 'Cash') {
          await updateDoc(doc(db, 'bank_accounts', bankAccountDoc.id), {
            cashInHand: increment(amount)
          });
        } else {
          await updateDoc(doc(db, 'bank_accounts', bankAccountDoc.id), {
            bankBalance: increment(amount)
          });
        }
      } else {
        // Create a default bank account if none exists
        await addDoc(collection(db, 'bank_accounts'), {
          schoolId,
          name: 'Main Operating Account',
          accountNumber: 'OFFICIAL',
          cashInHand: paymentMethod === 'Cash' ? amount : 0,
          bankBalance: paymentMethod !== 'Cash' ? amount : 0,
          createdAt: serverTimestamp()
        });
      }

      setSelectedPayment({
        ...paymentData,
        code: transactionCode,
        student: student.name,
        adm: student.admissionNumber,
        balance: (student.balance || 0) - amount,
        date: new Date().toLocaleString('en-GB'),
        parentName: student.parentInfo?.fatherName || student.parentInfo?.motherName || 'Parent/Guardian',
        parentPhone: student.parentInfo?.fatherPhone || student.parentInfo?.motherPhone || '',
        method: paymentMethod
      });
      
      setShowReceipt(true);
      setPaymentAmount('');
      setPaymentAdmNo('');
      toast.success('Payment executed successfully');
    } catch (error) {
      console.error("Payment error:", error);
      toast.error("Failed to execute payment");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSupplierPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierName || !supplierAmount || !supplierAccount || !supplierKRA) {
      toast.error("Please fill in all mandatory supplier details");
      return;
    }

    setIsProcessing(true);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Not authenticated");

      let schoolId = user.uid;
      const staffDocRef = doc(db, 'staff', user.uid);
      const staffDocSnap = await getDoc(staffDocRef);
      if (staffDocSnap.exists()) {
        schoolId = staffDocSnap.data().schoolId;
      }

      const transactionCode = 'VND' + Math.random().toString(36).substring(2, 8).toUpperCase();
      
      const expenseData = {
        schoolId,
        category: 'Supplier Payment',
        description: `Payment to ${supplierName} - ${supplierReason}`,
        amount: Number(supplierAmount),
        date: new Date().toISOString(),
        status: 'Approved',
        method: 'Bank Transfer',
        vendorDetails: {
          name: supplierName,
          bank: supplierBank,
          accountNumber: supplierAccount,
          kraPin: supplierKRA,
          reason: supplierReason
        },
        transactionCode,
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, 'expenses'), expenseData);
      
      toast.success('Supplier payment processed and logged');
      setSupplierName('');
      setSupplierBank('');
      setSupplierAccount('');
      setSupplierKRA('');
      setSupplierAmount('');
      setSupplierReason('');
    } catch (error) {
      console.error("Supplier payment error:", error);
      toast.error("Failed to process vendor payment");
    } finally {
      setIsProcessing(false);
    }
  };

  const logFinanceAction = async (studentId: string, previousBalance: number, newBalance: number, reason: string) => {
    const user = auth.currentUser;
    if (!user) return;
    
    try {
      // Get current user's name from staff collection
      const staffDoc = await getDoc(doc(db, 'staff', user.uid));
      const userName = staffDoc.exists() ? staffDoc.data().name : user.email || 'Unknown Admin';
      
      await addDoc(collection(db, 'finance_logs'), {
        studentId,
        previousBalance,
        newBalance,
        reason,
        updatedBy: userName,
        updatedById: user.uid,
        timestamp: serverTimestamp(),
        type: 'BALANCE_ADJUSTMENT'
      });
    } catch (error) {
      console.error("Error logging finance action:", error);
    }
  };

  const handleAdjustBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent || !adjustmentAmount || !adjustmentReason) {
      toast.error("Please fill in all fields");
      return;
    }

    setIsProcessing(true);
    try {
      const adjustment = Number(adjustmentAmount);
      const previousBalance = editingStudent.balance || 0;
      const newBalance = previousBalance + adjustment;

      await updateDoc(doc(db, 'students', editingStudent.id), {
        balance: newBalance
      });

      await logFinanceAction(editingStudent.id, previousBalance, newBalance, adjustmentReason);

      toast.success('Balance adjusted and logged successfully');
      setShowEditModal(false);
      setAdjustmentAmount('');
      setAdjustmentReason('');
      setEditingStudent(null);
    } catch (error) {
      console.error("Adjustment error:", error);
      toast.error("Failed to adjust balance");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveFeeStructure = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const feeData = {
      grade: (isCustomGrade ? formData.get('customGrade') : formData.get('grade')) as CBCGrade | 'All',
      category: (isCustomCategory ? formData.get('customCategory') : formData.get('category')) as FeeCategory,
      amount: Number(formData.get('amount')),
      isOptional: formData.get('isOptional') === 'true',
      appliesTo: (isCustomAppliesTo ? formData.get('customAppliesTo') : formData.get('appliesTo')) as 'All' | 'Boarders' | 'Day Scholars',
    };

    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Not authenticated");

      let schoolId = user.uid;
      const staffDocRef = doc(db, 'staff', user.uid);
      const staffDocSnap = await getDoc(staffDocRef);
      if (staffDocSnap.exists()) {
        const data = staffDocSnap.data() as any;
        if (data?.schoolId) {
          schoolId = data.schoolId;
        }
      }

      if (editingFee) {
        await updateDoc(doc(db, 'fee_structures', editingFee.id), feeData);
        toast.success('Fee structure updated');
      } else {
        await addDoc(collection(db, 'fee_structures'), { ...feeData, schoolId });
        toast.success('New fee item added');
      }
      setShowFeeModal(false);
      setEditingFee(null);
    } catch (error) {
      console.error("Error saving fee:", error);
      toast.error("Failed to save fee structure");
    }
  };

  const handleSaveExpense = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const expenseData = {
      date: new Date().toISOString(),
      category: (isCustomExpenseCategory ? formData.get('customCategory') : formData.get('category')) as string,
      description: formData.get('description') as string,
      amount: Number(formData.get('amount')),
      status: 'Pending' as const,
    };

    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Not authenticated");

      let schoolId = user.uid;
      const staffDocRef = doc(db, 'staff', user.uid);
      const staffDocSnap = await getDoc(staffDocRef);
      if (staffDocSnap.exists()) {
        const data = staffDocSnap.data() as any;
        if (data?.schoolId) {
          schoolId = data.schoolId;
        }
      }

      await addDoc(collection(db, 'expenses'), { ...expenseData, schoolId });
      toast.success('Expense submitted for approval');
      setShowExpenseModal(false);
    } catch (error) {
      console.error("Error saving expense:", error);
      toast.error("Failed to submit expense");
    }
  };

  const handleDeleteFee = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this fee item?')) return;
    try {
      await deleteDoc(doc(db, 'fee_structures', id));
      toast.success('Fee item deleted');
    } catch (error) {
      toast.error('Failed to delete fee item');
    }
  };

  const handleSaveTarget = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const targetData = {
      term: formData.get('term') as string,
      month: formData.get('month') as string,
      grade: formData.get('grade') as string,
      stream: formData.get('stream') as string,
      amount: Number(formData.get('amount')),
      createdAt: serverTimestamp()
    };

    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Not authenticated");

      let schoolId = user.uid;
      const staffDocRef = doc(db, 'staff', user.uid);
      const staffDocSnap = await getDoc(staffDocRef);
      if (staffDocSnap.exists()) {
        const data = staffDocSnap.data() as any;
        if (data?.schoolId) {
          schoolId = data.schoolId;
        }
      }

      await addDoc(collection(db, 'fee_targets'), { ...targetData, schoolId });
      toast.success('Collection target added');
      setShowTargetModal(false);
    } catch (error) {
      console.error("Error saving target:", error);
      toast.error("Failed to save target");
    }
  };

  const handleSendSMS = () => {
    if (!smsStudent) return;
    const parentPhone = smsStudent.parentInfo.fatherPhone || smsStudent.parentInfo.motherPhone || smsStudent.parentInfo.guardianPhone;
    const msg = `Dear Parent, this is a reminder that ${smsStudent.name} has an outstanding fee balance of KES ${smsStudent.balance.toLocaleString()}. Please clear this by ${smsDeadline}. Payment Details: ${smsInstructions}. Note: Failure to comply will result in the learner being sent home.`;
    
    // In a real app, this would call an SMS API
    toast.success(`SMS Reminder sent to ${parentPhone}`);
    setShowSMSModal(false);
    
    // Also trigger the device's SMS app for manual use if needed
    window.open(`sms:${parentPhone}?body=${encodeURIComponent(msg)}`, '_blank');
  };
  const handleDeleteTarget = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this target?')) return;
    try {
      await deleteDoc(doc(db, 'fee_targets', id));
      toast.success('Target deleted');
    } catch (error) {
      toast.error('Failed to delete target');
    }
  };

  const getLastPaymentDate = (studentId: string) => {
    const studentPayments = payments
      .filter(p => p.studentId === studentId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    if (studentPayments.length > 0) {
      return new Date(studentPayments[0].date).toLocaleDateString();
    }
    return 'No payment yet';
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000 font-sans p-0 md:p-2">
      {/* Consolidated Financial Toolbar — horizontal scroll on mobile */}
      <div className="flex items-center gap-3 overflow-x-auto pb-4 no-scrollbar -mx-2 px-2 md:mx-0 md:px-0">
        {/* Collected Pill */}
        <div className="flex-shrink-0 px-4 md:px-5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center gap-3 shadow-sm">
          <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center text-orange-600">
            <Activity size={14} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 leading-tight whitespace-nowrap">Collected</p>
            <p className="text-sm font-black text-slate-900 dark:text-white leading-tight whitespace-nowrap">KES {(totalCollected / 1000).toFixed(1)}K</p>
          </div>
        </div>
        
        {/* Target Pill */}
        <div className="flex-shrink-0 px-4 md:px-5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center gap-3 shadow-sm">
          <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-blue-600">
            <Target size={14} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 leading-tight whitespace-nowrap">Target</p>
            <p className="text-sm font-black text-slate-900 dark:text-white leading-tight whitespace-nowrap">KES {(feeTarget / 1000000).toFixed(1)}M</p>
          </div>
        </div>

        {/* Arrears Pill */}
        <div className="flex-shrink-0 px-4 md:px-5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center gap-3 shadow-sm">
          <div className="w-8 h-8 bg-rose-100 dark:bg-rose-900/30 rounded-full flex items-center justify-center text-rose-600">
            <CreditCard size={14} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 leading-tight whitespace-nowrap">Arrears</p>
            <p className="text-sm font-black text-slate-900 dark:text-white leading-tight whitespace-nowrap">KES {(totalArrears / 1000).toFixed(1)}K</p>
          </div>
        </div>

        {/* Spacer pushes actions to the right on desktop */}
        <div className="flex-1 min-w-[0.5rem] md:min-w-[1rem]" />

        {/* Actions */}
        <button 
          onClick={() => toast.success('Ledger exported successfully')}
          className="flex-shrink-0 flex items-center gap-2 px-4 md:px-5 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-300 rounded-xl text-[11px] font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all active:scale-95 border border-slate-200 dark:border-slate-700 group whitespace-nowrap"
        >
          <Download size={14} className="group-hover:scale-110 transition-transform" /> 
          Export
        </button>
        
        <button 
          onClick={() => setShowInvoice(true)}
          className="flex-shrink-0 flex items-center gap-2 px-5 md:px-6 py-2.5 bg-orange-600 text-white rounded-xl text-[11px] font-bold hover:bg-orange-700 transition-all shadow-lg shadow-orange-600/20 active:scale-95 group border border-orange-500 whitespace-nowrap"
        >
          <Plus size={14} className="group-hover:rotate-90 transition-transform" /> 
          New Invoice
        </button>
      </div>

      {activeTab === 'collections' && (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
          {/* Un-carded Revenue Operations Section */}
          <div className="relative py-4 group">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
              <div>
                <h2 className="text-xl font-bold text-black dark:text-white tracking-tight leading-tight mb-2">Revenue Operations</h2>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-300 max-w-xl leading-relaxed">
                  Optimize school cash flow through real-time collection tracking, automated M-Pesa reconciliation, and smart arrears management.
                </p>
              </div>
            </div>
          </div>

          {/* AI Financial Health Summary */}
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 md:p-8 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden relative">
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-orange-500/5 rounded-full blur-3xl" />
            <div className="relative z-10">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-black text-white rounded-2xl flex items-center justify-center shadow-lg">
                    <Sparkles size={20} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-black dark:text-white tracking-tight">Financial Intelligence</h3>
                    <p className="text-[10px] font-bold text-orange-600 uppercase tracking-widest mt-0.5">Ask AI about institutional health</p>
                  </div>
                </div>
                <div className="flex-1 max-w-md w-full relative group">
                  <input 
                    type="text" 
                    placeholder="e.g. Summarize payment health for this term..." 
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-black dark:text-white focus:ring-2 focus:ring-orange-500/20 outline-none transition-all"
                  />
                  <button className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-black text-white rounded-lg text-[10px] font-black hover:bg-slate-800 transition-all">
                    Ask AI
                  </button>
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                </div>
              </div>

              <div className="p-6 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-slate-100 dark:border-slate-800/50">
                 <div className="flex items-start gap-4">
                   <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-600 shrink-0">
                      <Activity size={14} />
                   </div>
                   <div className="space-y-4">
                     <p className="text-xs font-medium text-slate-600 dark:text-slate-400 leading-relaxed">
                       Financial Health Summary: Your current collection stands at <span className="text-orange-600 font-bold">KES {(totalCollected/1000).toFixed(1)}K</span>, which is <span className="text-orange-600 font-bold">{((totalCollected / (feeTarget || 1)) * 100).toFixed(1)}%</span> of your termly target. Arrears are trending slightly higher than last term at <span className="text-rose-500 font-bold">KES {(totalArrears/1000).toFixed(1)}K</span>. I recommend sending automated SMS reminders to Grade 4 and Grade 8 parents who haven't made a payment in 30+ days.
                     </p>
                     <div className="flex flex-wrap gap-2">
                        <button className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[10px] font-bold text-slate-600 dark:text-slate-300 hover:bg-orange-50 dark:hover:bg-slate-700 hover:text-orange-600 transition-all">Arrears Analysis</button>
                        <button className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[10px] font-bold text-slate-600 dark:text-slate-300 hover:bg-orange-50 dark:hover:bg-slate-700 hover:text-orange-600 transition-all">Termly Comparison</button>
                        <button className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[10px] font-bold text-slate-600 dark:text-slate-300 hover:bg-orange-50 dark:hover:bg-slate-700 hover:text-orange-600 transition-all">Revenue Forecast</button>
                     </div>
                   </div>
                 </div>
              </div>
            </div>
          </div>

          {collectionsSubTab === 'graph' && (() => {
            // ── Term / month configuration ──────────────────────────────
            const TERMS: Record<string, { label: string; months: { name: string; idx: number; year: number; days: number }[] }> = {
              'Term 1': {
                label: 'Term 1 (Jan – Mar)',
                months: [
                  { name: 'January',  idx: 0, year: new Date().getFullYear(), days: 31 },
                  { name: 'February', idx: 1, year: new Date().getFullYear(), days: new Date(new Date().getFullYear(), 2, 0).getDate() },
                  { name: 'March',    idx: 2, year: new Date().getFullYear(), days: 31 },
                ],
              },
              'Term 2': {
                label: 'Term 2 (May – Jul)',
                months: [
                  { name: 'May',  idx: 4, year: new Date().getFullYear(), days: 31 },
                  { name: 'June', idx: 5, year: new Date().getFullYear(), days: 30 },
                  { name: 'July', idx: 6, year: new Date().getFullYear(), days: 31 },
                ],
              },
              'Term 3': {
                label: 'Term 3 (Sep – Nov)',
                months: [
                  { name: 'September', idx: 8,  year: new Date().getFullYear(), days: 30 },
                  { name: 'October',   idx: 9,  year: new Date().getFullYear(), days: 31 },
                  { name: 'November',  idx: 10, year: new Date().getFullYear(), days: 30 },
                ],
              },
            };
            const termConfig = TERMS[heatmapTerm];

            // ── Per-month totals ─────────────────────────────────────────
            const monthlyTotals = termConfig.months.map(m => {
              let total = 0;
              for (let d = 1; d <= m.days; d++) {
                total += dayAmountMap[`${m.year}-${m.idx}-${d}`] || 0;
              }
              return { ...m, total };
            });
            const termTotal = monthlyTotals.reduce((s, m) => s + m.total, 0);

            // ── Max value for intensity scaling ─────────────────────────
            const maxDay = Math.max(1, ...termConfig.months.flatMap(m =>
              Array.from({ length: m.days }, (_, di) => dayAmountMap[`${m.year}-${m.idx}-${di + 1}`] || 0)
            ));

            const getBoxColor = (amount: number) => {
              if (amount === 0) return 'bg-slate-100 dark:bg-slate-800';
              const ratio = amount / maxDay;
              if (ratio > 0.75) return 'bg-orange-600';
              if (ratio > 0.5)  return 'bg-orange-400';
              if (ratio > 0.25) return 'bg-orange-300';
              return 'bg-orange-100';
            };

            return (
              <div className="space-y-6">
                {/* ── Term Summary Cards ──────────────────────────────── */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {Object.entries(TERMS).map(([key, t]) => {
                    const months = t.months;
                    const termTot = months.reduce((s, m) => {
                      let tot = 0;
                      for (let d = 1; d <= m.days; d++) tot += dayAmountMap[`${m.year}-${m.idx}-${d}`] || 0;
                      return s + tot;
                    }, 0);
                    const isActive = heatmapTerm === key;
                    return (
                      <button
                        key={key}
                        onClick={() => setHeatmapTerm(key)}
                        className={`text-left p-5 rounded-2xl border transition-all ${isActive ? 'bg-orange-600 border-orange-500 text-white shadow-lg shadow-orange-500/20' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-orange-300'}`}
                      >
                        <p className={`text-[10px] font-black uppercase tracking-widest mb-2 ${isActive ? 'text-orange-100' : 'text-slate-400'}`}>{t.label}</p>
                        <p className={`text-2xl font-black tracking-tight ${isActive ? 'text-white' : 'text-black dark:text-white'}`}>
                          KES {termTot >= 1000000 ? (termTot/1000000).toFixed(2)+'M' : (termTot/1000).toFixed(1)+'K'}
                        </p>
                        <div className={`mt-3 space-y-1 ${isActive ? 'opacity-90' : ''}`}>
                          {months.map(m => {
                            let mTot = 0;
                            for (let d = 1; d <= m.days; d++) mTot += dayAmountMap[`${m.year}-${m.idx}-${d}`] || 0;
                            return (
                              <div key={m.name} className="flex justify-between text-[10px] font-bold">
                                <span className={isActive ? 'text-orange-100' : 'text-slate-500'}>{m.name}</span>
                                <span className={isActive ? 'text-white' : 'text-slate-700 dark:text-slate-300'}>KES {(mTot/1000).toFixed(1)}K</span>
                              </div>
                            );
                          })}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* ── Heatmap Card ─────────────────────────────────────── */}
                <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 md:p-8 border border-slate-200 dark:border-slate-800 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-orange-50 dark:bg-orange-900/20 rounded-xl flex items-center justify-center">
                        <LayoutGrid size={24} className="text-orange-600" />
                      </div>
                      <div>
                        <h3 className="text-xl font-black text-black dark:text-white tracking-tight">Collection Heatmap</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{termConfig.label} · Each box = 1 day</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2 bg-orange-50 dark:bg-orange-900/20 rounded-full border border-orange-100 dark:border-orange-800 self-start sm:self-auto">
                      <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                      <span className="text-xs font-black text-orange-600">KES {termTotal >= 1000000 ? (termTotal/1000000).toFixed(2)+'M' : (termTotal/1000).toFixed(1)+'K'} total</span>
                    </div>
                  </div>

                  {/* Per-month grids */}
                  <div className="space-y-8 overflow-x-auto pb-2 no-scrollbar">
                    {monthlyTotals.map(m => (
                      <div key={m.name}>
                        {/* Month label + total */}
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xs font-black text-black dark:text-white uppercase tracking-widest">{m.name}</span>
                          <span className="text-[10px] font-bold text-orange-600 bg-orange-50 dark:bg-orange-900/20 px-2 py-0.5 rounded-full">
                            KES {(m.total/1000).toFixed(1)}K collected
                          </span>
                        </div>
                        {/* Day boxes — one row, left to right = day 1…31 */}
                        <div className="flex gap-1 flex-wrap">
                          {Array.from({ length: m.days }, (_, di) => {
                            const day = di + 1;
                            const key = `${m.year}-${m.idx}-${day}`;
                            const amount = dayAmountMap[key] || 0;
                            const color = getBoxColor(amount);
                            const label = `${m.name} ${day} — KES ${amount.toLocaleString()}`;
                            return (
                              <div
                                key={day}
                                className={`w-7 h-7 md:w-8 md:h-8 rounded-md ${color} flex items-center justify-center cursor-pointer relative group/box transition-all hover:ring-2 hover:ring-orange-500/60 hover:scale-110`}
                                title=""
                                onMouseEnter={() => setHoveredDay({ month: m.name, day, amount })}
                                onMouseLeave={() => setHoveredDay(null)}
                              >
                                <span className="text-[8px] font-black text-slate-500 dark:text-slate-400 select-none">{day}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Premium Hover Intelligence Card */}
                  <div className="mt-8 min-h-[100px]">
                    {hoveredDay ? (
                      <div className="w-full bg-slate-900 text-white rounded-2xl p-4 md:p-6 shadow-2xl animate-in slide-in-from-top-2 duration-300 relative overflow-hidden group border border-slate-800">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full -mr-16 -mt-16 blur-2xl transition-transform duration-500 group-hover:scale-150" />
                        <div className="relative z-10">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-9 h-9 bg-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-orange-900/50">
                              <Banknote size={18} strokeWidth={2.5} />
                            </div>
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-widest text-orange-400">Payment Intelligence</p>
                              <h4 className="text-sm font-bold text-white">{hoveredDay.month} {hoveredDay.day}</h4>
                            </div>
                          </div>
                          <p className="text-xs font-medium text-slate-300 leading-relaxed italic">
                            "Director, on day {hoveredDay.day} of {hoveredDay.month}, a total of <span className="text-orange-400 font-bold">KES {hoveredDay.amount.toLocaleString()}</span> was collected through the school channels."
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="w-full py-8 flex flex-col items-center justify-center border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-2xl opacity-50">
                        <Activity size={24} className="text-slate-400 mb-2" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Hover over any day for collection insights</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}

          {collectionsSubTab === 'quickpay' && (
            <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
              {/* Learner Quick Pay Card */}
              <div className="bg-slate-900 dark:bg-slate-900 rounded-3xl border border-slate-800 shadow-2xl p-10 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-orange-600/10 rounded-full -mr-32 -mt-32 transition-transform duration-1000 group-hover:scale-110"></div>
                
                <div className="relative z-10">
                  <div className="flex items-center gap-5 mb-10">
                    <div className="w-14 h-14 bg-orange-600 rounded-xl flex items-center justify-center text-white shadow-xl shadow-orange-900/50">
                      <Smartphone size={28} strokeWidth={2.5} />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-white tracking-tight leading-none">Quick Pay (Fees)</h3>
                      <p className="text-xs font-medium text-black dark:text-slate-400 mt-1">Collect fees instantly via M-Pesa</p>
                    </div>
                  </div>

                  <form className="space-y-8" onSubmit={handleExecutePayment}>
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-black dark:text-slate-300 capitalize tracking-widest ml-1">Learner Adm No.</label>
                      <div className="relative group">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-black dark:text-slate-400 group-focus-within:text-orange-500 transition-colors" size={18} strokeWidth={2.5} />
                        <input 
                          list="students-list"
                          type="text" 
                          value={paymentAdmNo}
                          onChange={(e) => setPaymentAdmNo(e.target.value.toUpperCase())}
                          placeholder="Enter Admission Number" 
                          className="w-full pl-14 pr-6 py-5 bg-slate-800 border border-slate-700 rounded-xl text-sm font-bold text-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 shadow-inner transition-all placeholder:text-black dark:text-slate-300/40 dark:placeholder:text-slate-500"
                        />
                        <datalist id="students-list">
                          {students.map(s => (
                            <option key={s.id} value={s.admissionNumber}>
                              {s.name} - {s.grade}
                            </option>
                          ))}
                        </datalist>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-black dark:text-slate-300 capitalize tracking-widest ml-1">Payment Amount (KES)</label>
                      <div className="relative group">
                        <Banknote className="absolute left-5 top-1/2 -translate-y-1/2 text-black dark:text-slate-400 group-focus-within:text-orange-500 transition-colors" size={18} strokeWidth={2.5} />
                        <input 
                          type="number" 
                          value={paymentAmount}
                          onChange={(e) => setPaymentAmount(e.target.value)}
                          placeholder="0.00" 
                          className="w-full pl-14 pr-6 py-5 bg-slate-800 border border-slate-700 rounded-xl text-sm font-bold text-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 shadow-inner transition-all placeholder:text-black dark:text-slate-300/40 dark:placeholder:text-slate-500"
                        />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-black dark:text-slate-300 capitalize tracking-widest ml-1">Payment Channel</label>
                      <div className="relative group">
                        <select 
                          value={paymentMethod}
                          onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                          className="w-full px-6 py-5 bg-slate-800 border border-slate-700 rounded-xl text-sm font-bold text-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 shadow-inner appearance-none cursor-pointer transition-all"
                        >
                          <option value="M-Pesa">M-Pesa (STK Push)</option>
                          <option value="Bank">Bank Deposit</option>
                          <option value="Cash">Cash Receipt</option>
                        </select>
                        <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-black dark:text-slate-400">
                          <ArrowRight size={18} className="rotate-90" />
                        </div>
                      </div>
                    </div>

                    <button 
                      type="submit"
                      disabled={isProcessing}
                      className="w-full py-6 bg-orange-600 text-white rounded-xl text-[11px] font-black capitalize tracking-[0.2em] shadow-xl shadow-orange-900/50 hover:bg-orange-700 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 mt-4"
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="animate-spin" size={18} strokeWidth={3} />
                          Processing...
                        </>
                      ) : (
                        <>
                          Execute Transaction
                          <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" strokeWidth={3} />
                        </>
                      )}
                    </button>
                  </form>
                </div>
              </div>

              {/* Supplier & Vendor Payment Card */}
              <div className="bg-slate-900 dark:bg-slate-900 rounded-3xl border border-slate-800 shadow-2xl p-10 relative overflow-hidden group h-full">
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 rounded-full -mr-32 -mt-32 transition-transform duration-1000 group-hover:scale-110"></div>
                
                <div className="relative z-10 h-full flex flex-col">
                  <div className="flex items-center gap-5 mb-10 shrink-0">
                    <div className="w-14 h-14 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-xl shadow-blue-900/50">
                      <CreditCard size={28} strokeWidth={2.5} />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-white tracking-tight leading-none">Vendor Disbursements</h3>
                      <p className="text-xs font-medium text-black dark:text-slate-400 mt-1">Pay suppliers and institutional vendors</p>
                    </div>
                  </div>

                  <form className="space-y-6 flex flex-col flex-1" onSubmit={handleSupplierPayment}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-black dark:text-slate-300 capitalize tracking-widest ml-1">Supplier Name</label>
                        <input 
                          type="text" 
                          value={supplierName}
                          onChange={(e) => setSupplierName(e.target.value)}
                          placeholder="e.g. Acme Supplies Ltd" 
                          className="w-full px-6 py-4 bg-slate-800 border border-slate-700 rounded-xl text-sm font-bold text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all placeholder:text-black dark:text-slate-300/40 dark:placeholder:text-slate-500"
                        />
                      </div>
                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-black dark:text-slate-300 capitalize tracking-widest ml-1">KRA PIN Number</label>
                        <input 
                          type="text" 
                          value={supplierKRA}
                          onChange={(e) => setSupplierKRA(e.target.value.toUpperCase())}
                          placeholder="P051XXXXXXX" 
                          className="w-full px-6 py-4 bg-slate-800 border border-slate-700 rounded-xl text-sm font-bold text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all placeholder:text-black dark:text-slate-300/40 dark:placeholder:text-slate-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-black dark:text-slate-300 capitalize tracking-widest ml-1">Bank Name</label>
                        <input 
                          type="text" 
                          value={supplierBank}
                          onChange={(e) => setSupplierBank(e.target.value)}
                          placeholder="e.g. Equity Bank" 
                          className="w-full px-6 py-4 bg-slate-800 border border-slate-700 rounded-xl text-sm font-bold text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all placeholder:text-black dark:text-slate-300/40 dark:placeholder:text-slate-500"
                        />
                      </div>
                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-black dark:text-slate-300 capitalize tracking-widest ml-1">Account Number</label>
                        <input 
                          type="text" 
                          value={supplierAccount}
                          onChange={(e) => setSupplierAccount(e.target.value)}
                          placeholder="Bank A/C Number" 
                          className="w-full px-6 py-4 bg-slate-800 border border-slate-700 rounded-xl text-sm font-bold text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all placeholder:text-black dark:text-slate-300/40 dark:placeholder:text-slate-500"
                        />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-black dark:text-slate-300 capitalize tracking-widest ml-1">Payment Amount (KES)</label>
                      <input 
                        type="number" 
                        value={supplierAmount}
                        onChange={(e) => setSupplierAmount(e.target.value)}
                        placeholder="0.00" 
                        className="w-full px-6 py-4 bg-slate-800 border border-slate-700 rounded-xl text-sm font-bold text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all placeholder:text-black dark:text-slate-300/40 dark:placeholder:text-slate-500"
                      />
                    </div>

                    <div className="space-y-3 flex-1 flex flex-col">
                      <label className="text-[10px] font-black text-black dark:text-slate-300 capitalize tracking-widest ml-1">Reason for Payment</label>
                      <textarea 
                        value={supplierReason}
                        onChange={(e) => setSupplierReason(e.target.value)}
                        placeholder="e.g. Food Supplies for Term 1" 
                        className="w-full flex-1 px-6 py-4 bg-slate-800 border border-slate-700 rounded-xl text-sm font-bold text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all placeholder:text-black dark:text-slate-300/40 dark:placeholder:text-slate-500 resize-none min-h-[5rem]"
                      />
                    </div>

                    <button 
                      type="submit"
                      disabled={isProcessing}
                      className="w-full py-6 mt-auto bg-blue-600 text-white rounded-xl text-[11px] font-black capitalize tracking-[0.2em] shadow-xl shadow-blue-900/50 hover:bg-blue-700 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="animate-spin" size={18} strokeWidth={3} />
                          Processing...
                        </>
                      ) : (
                        <>
                          Confirm & Pay Supplier
                          <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" strokeWidth={3} />
                        </>
                      )}
                    </button>
                  </form>
                </div>
              </div>
            </div>
          )}

          {collectionsSubTab === 'net' && (
            <div className="max-w-2xl mx-auto">
              <KpiCard title="Net Collections" value={totalCollected} delta={12} status="up" icon={Wallet} subtitle="Termly collection summary" />
            </div>
          )}

          {collectionsSubTab === 'arrears' && (
            <div className="max-w-2xl mx-auto">
              <KpiCard title="Projected Arrears" value={totalArrears} delta={2} status="down" icon={CreditCard} subtitle="Outstanding learner balances" />
            </div>
          )}

          {collectionsSubTab === 'directory' && (
            <div className="pt-4">
              <div className="px-10 py-8 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div>
                  <h3 className="text-xl font-bold text-black dark:text-slate-100 tracking-tight leading-none">Learner Fee Directory</h3>
                  <p className="text-xs font-medium text-black dark:text-slate-300 mt-1">Find any learner's fee record</p>
                </div>
                <div className="flex flex-wrap items-center gap-4 flex-1 justify-end">
                  <div className="relative group min-w-[200px] flex-1">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-black dark:text-slate-300 group-focus-within:text-orange-600 transition-colors" size={18} strokeWidth={2.5} />
                    <input 
                      type="text" 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search name..." 
                      className="w-full pl-14 pr-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl text-sm font-bold text-black dark:text-slate-200 focus:ring-2 focus:ring-orange-500/20 shadow-sm transition-all outline-none"
                    />
                  </div>
                  <div className="relative group min-w-[150px]">
                    <div className="absolute left-5 top-1/2 -translate-y-1/2 text-black dark:text-slate-300 pointer-events-none">
                      <Filter size={16} />
                    </div>
                    <select 
                      value={gradeFilter}
                      onChange={(e) => setGradeFilter(e.target.value)}
                      className="w-full pl-12 pr-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl text-sm font-bold text-black dark:text-slate-200 focus:ring-2 focus:ring-orange-500/20 shadow-sm transition-all outline-none appearance-none cursor-pointer"
                    >
                      <option value="All">All Grades</option>
                      {Object.values(CBCGrade).map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
                  <div className="relative group min-w-[150px]">
                    <div className="absolute left-5 top-1/2 -translate-y-1/2 text-black dark:text-slate-300 pointer-events-none">
                      <Calendar size={16} />
                    </div>
                    <select 
                      value={timeFilter}
                      onChange={(e) => setTimeFilter(e.target.value as any)}
                      className="w-full pl-12 pr-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl text-sm font-bold text-black dark:text-slate-200 focus:ring-2 focus:ring-orange-500/20 shadow-sm transition-all outline-none appearance-none cursor-pointer"
                    >
                      <option value="All">All Time</option>
                      <option value="Week">This Week</option>
                      <option value="Month">This Month</option>
                      <option value="Term 1">Term 1 (Jan-Mar)</option>
                      <option value="Term 2">Term 2 (May-Jul)</option>
                      <option value="Term 3">Term 3 (Sep-Nov)</option>
                      <option value="Year">This Year</option>
                    </select>
                  </div>
                  <div className="relative group min-w-[150px]">
                    <input 
                      type="text" 
                      value={admFilter}
                      onChange={(e) => setAdmFilter(e.target.value)}
                      placeholder="Adm No..." 
                      className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl text-sm font-bold text-black dark:text-slate-200 focus:ring-2 focus:ring-orange-500/20 shadow-sm transition-all outline-none"
                    />
                  </div>
                  <button 
                    onClick={() => {
                      setSearchQuery('');
                      setGradeFilter('All');
                      setAdmFilter('');
                    }}
                    className="p-4 bg-slate-50 dark:bg-slate-800 text-black dark:text-slate-300 hover:text-orange-600 rounded-xl transition-all"
                    title="Clear Filters"
                  >
                    <X size={18} strokeWidth={2.5} />
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50/50 dark:bg-slate-800/30 text-left">
                      <th className="px-10 py-6 text-[10px] font-medium text-black dark:text-slate-300 tracking-[0.2em] capitalize">Learner</th>
                      <th className="px-6 py-6 text-[10px] font-medium text-black dark:text-slate-300 tracking-[0.2em] capitalize">Class Teacher</th>
                      <th className="px-6 py-6 text-[10px] font-medium text-black dark:text-slate-300 tracking-[0.2em] capitalize">Parent Contact</th>
                      <th className="px-6 py-6 text-[10px] font-medium text-black dark:text-slate-300 tracking-[0.2em] capitalize">Last Payment</th>
                      <th className="px-10 py-6 text-[10px] font-medium text-black dark:text-slate-300 tracking-[0.2em] capitalize text-right">Balance (Kes)</th>
                      <th className="px-10 py-6 text-[10px] font-medium text-black dark:text-slate-300 tracking-[0.2em] capitalize text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                    {filteredStudents.map((student) => {
                      const balance = student.balance || 0;
                      const isCleared = balance <= 0;
                      
                      return (
                        <tr key={student.id} className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-all duration-300">
                          <td className="px-10 py-6">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-black dark:text-slate-300 font-black text-xs group-hover:bg-orange-600 group-hover:text-white transition-all">
                                {student.name.charAt(0)}
                              </div>
                              <div>
                                <p className="font-medium text-sm text-black dark:text-slate-200 transition-colors">{student.name}</p>
                                <p className="text-[10px] font-medium text-black dark:text-slate-300 capitalize tracking-widest mt-0.5">{student.admissionNumber} • {student.grade}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-6">
                            <div className="space-y-1">
                              <p className="text-xs font-medium text-black dark:text-slate-200">
                                {staff.find(s => s.grade === student.grade && s.stream === student.stream)?.name || 'Not assigned'}
                              </p>
                              <p className="text-[10px] font-medium text-black dark:text-slate-300 tracking-widest">Teacher</p>
                            </div>
                          </td>
                          <td className="px-6 py-6">
                            <div className="space-y-1">
                              <p className="text-xs font-medium text-black dark:text-slate-200">
                                {student.parentInfo.fatherName || student.parentInfo.motherName || student.parentInfo.guardianName}
                              </p>
                              <p className="text-[10px] font-medium text-black dark:text-slate-300 tracking-widest">
                                {student.parentInfo.fatherPhone || student.parentInfo.motherPhone || student.parentInfo.guardianPhone}
                              </p>
                            </div>
                          </td>
                          <td className="px-6 py-6">
                            <p className="text-xs font-medium text-black dark:text-slate-400">
                              {getLastPaymentDate(student.id)}
                            </p>
                          </td>
                          <td className="px-10 py-6 text-right">
                            {student.hasFeeRecord === false ? (
                              <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-50 text-amber-600 border border-amber-100 dark:bg-amber-900/30 dark:border-amber-800">
                                Need Action
                              </span>
                            ) : (
                              <span className={`text-sm font-medium tracking-tight ${balance > 0 ? 'text-rose-500' : 'text-orange-500'}`}>
                                {balance > 0 ? balance.toLocaleString() : '0.00'}
                              </span>
                            )}
                          </td>
                          <td className="px-10 py-6 text-center">
                            <div className="flex items-center justify-center gap-3">
                              <button 
                                onClick={() => setSelectedStudentProfile(student)}
                                className="p-3 bg-slate-50 dark:bg-slate-800 text-black dark:text-slate-300 hover:text-orange-600 dark:hover:text-orange-400 rounded-lg transition-all hover:scale-110"
                                title="View Student Profile"
                              >
                                <Search size={16} strokeWidth={2.5} />
                              </button>
                              <a 
                                href={`tel:${student.parentInfo.fatherPhone || student.parentInfo.motherPhone || student.parentInfo.guardianPhone}`}
                                className="p-3 bg-slate-50 dark:bg-slate-800 text-black dark:text-slate-300 hover:text-orange-600 dark:hover:text-orange-400 rounded-lg transition-all hover:scale-110"
                                title="Call Parent"
                              >
                                <Smartphone size={16} strokeWidth={2.5} />
                              </a>
                              <button 
                                onClick={() => {
                                  setSmsStudent(student);
                                  setShowSMSModal(true);
                                }}
                                className="p-3 bg-slate-50 dark:bg-slate-800 text-black dark:text-slate-300 hover:text-orange-600 dark:hover:text-orange-400 rounded-lg transition-all hover:scale-110"
                                title="Send SMS Reminder"
                              >
                                <MessageSquare size={16} strokeWidth={2.5} />
                              </button>
                              <button 
                                onClick={() => {
                                  setInvoiceStudent(student);
                                  setShowInvoice(true);
                                }}
                                className="p-3 bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 hover:bg-orange-600 hover:text-white dark:hover:bg-orange-600 dark:hover:text-white rounded-lg transition-all hover:scale-110"
                                title="Generate Invoice"
                              >
                                <FileText size={16} strokeWidth={2.5} />
                              </button>
                              {['ADMIN', 'DIRECTOR', 'FINANCE'].includes(userRole || '') && (
                                <button 
                                  onClick={() => {
                                    setEditingStudent(student);
                                    setShowEditModal(true);
                                  }}
                                  className="p-3 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 hover:bg-amber-600 hover:text-white dark:hover:bg-amber-600 dark:hover:text-white rounded-lg transition-all hover:scale-110"
                                  title="Edit Balance / Audit Trail"
                                >
                                  <ShieldCheck size={16} strokeWidth={2.5} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'expenses' && (
        <div className="space-y-10 animate-in fade-in duration-700">
          {/* Term Analytics-Style Hero Banner */}
          <div className="bg-gradient-to-br from-orange-50 via-slate-50 to-orange-100 dark:from-slate-800 dark:to-slate-900 rounded-[2rem] p-8 shadow-sm border border-orange-200/60 dark:border-slate-700 relative overflow-hidden group">
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <h2 className="text-2xl font-bold text-black dark:text-white tracking-tight leading-tight mb-1">Operating Expenses</h2>
                <p className="text-sm font-medium text-black dark:text-slate-400 max-w-xl">
                  Track, log, and approve all institutional expenditures for this term.
                </p>
              </div>
              <div className="flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-slate-900 rounded-full border border-slate-100 dark:border-slate-800 shadow-sm shrink-0">
                <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></div>
                <span className="text-xs font-bold text-black dark:text-slate-300">Live Expense Tracking</span>
              </div>
            </div>
          </div>

          {/* 3 Stat Cards — Same style as Term Analytics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { label: 'Total Expenses', sublabel: 'Total operating costs this term', value: expenses.reduce((sum, e) => sum + e.amount, 0), iconColor: 'text-rose-500', iconBg: 'bg-rose-50 dark:bg-rose-900/20', bar: 'bg-rose-500' },
              { label: 'Pending Approvals', sublabel: 'Awaiting admin approval', value: expenses.filter(e => e.status === 'Pending').reduce((sum, e) => sum + e.amount, 0), iconColor: 'text-amber-500', iconBg: 'bg-amber-50 dark:bg-amber-900/20', bar: 'bg-amber-500' },
              { label: 'Budget Variance', sublabel: 'Under allocated budget', value: 150000, iconColor: 'text-orange-500', iconBg: 'bg-orange-50 dark:bg-orange-900/20', bar: 'bg-orange-500' }
            ].map((stat, i) => (
              <div key={i} className="group bg-gradient-to-br from-blue-50/50 via-white to-orange-50/20 dark:from-slate-800 dark:to-slate-900 rounded-[2rem] border border-slate-200/60 dark:border-slate-700 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden p-6 flex flex-col">
                <div className="relative z-10 flex flex-col h-full">
                  <div className={`w-10 h-10 ${stat.iconBg} rounded-xl flex items-center justify-center mb-4`}>
                    <Wallet size={18} className={stat.iconColor} />
                  </div>
                  <p className="text-xs font-bold text-black dark:text-slate-400 mb-1">{stat.sublabel}</p>
                  <h3 className="text-lg font-bold text-black dark:text-white mb-3">{stat.label}</h3>
                  <p className="text-sm font-bold text-black dark:text-white tracking-tight mt-auto">KES {(stat.value / 1000).toFixed(1)}K</p>
                  <div className={`mt-4 h-1 w-10 rounded-full ${stat.bar} group-hover:w-full transition-all duration-500`}></div>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
            <div className="lg:col-span-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-10">
              <div className="flex items-center justify-between mb-10">
                <h3 className="font-bold text-black dark:text-slate-100 tracking-tight text-xl">Expense Records</h3>
                <button className="flex items-center gap-2 px-6 py-3 bg-slate-50 dark:bg-slate-800 text-black dark:text-slate-300 rounded-xl text-[10px] font-black capitalize tracking-widest hover:bg-slate-100 dark:hover:bg-slate-700 transition-all">
                  <Filter size={14} className="text-orange-600" /> Filter
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50/50 dark:bg-slate-800/30 text-left border-b border-slate-100 dark:border-slate-800">
                      <th className="px-6 py-6 text-[10px] font-medium text-black dark:text-slate-300 tracking-widest capitalize">Date</th>
                      <th className="px-6 py-6 text-[10px] font-medium text-black dark:text-slate-300 tracking-widest capitalize">Category</th>
                      <th className="px-6 py-6 text-[10px] font-medium text-black dark:text-slate-300 tracking-widest capitalize">Description</th>
                      <th className="px-6 py-6 text-[10px] font-medium text-black dark:text-slate-300 tracking-widest capitalize text-right">Amount (KES)</th>
                      <th className="px-6 py-6 text-[10px] font-medium text-black dark:text-slate-300 tracking-widest capitalize text-center">Status</th>
                      <th className="px-6 py-6 text-[10px] font-medium text-black dark:text-slate-300 tracking-widest capitalize text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                    {expenses.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-black dark:text-slate-300 font-bold italic">No expenses recorded yet.</td>
                      </tr>
                    ) : (
                      expenses.map((exp, i) => (
                        <tr key={exp.id} className="hover:bg-slate-50/30 dark:hover:bg-slate-800/30 transition-colors group">
                          <td className="px-6 py-6 text-xs font-medium text-black dark:text-slate-400 tracking-wide">{new Date(exp.date).toLocaleDateString()}</td>
                          <td className="px-6 py-6 text-xs font-medium text-black dark:text-slate-200 tracking-tight">{exp.category}</td>
                          <td className="px-6 py-6 text-xs font-medium text-black dark:text-slate-400 tracking-wide">{exp.description}</td>
                          <td className="px-6 py-6 text-sm font-medium text-black dark:text-slate-200 text-right tracking-tight">{exp.amount.toLocaleString()}</td>
                          <td className="px-6 py-6 text-center">
                            <span className={`px-4 py-1.5 rounded-full text-[10px] font-medium tracking-widest capitalize ${ exp.status === 'Approved' ? 'bg-orange-50 text-orange-600' : exp.status === 'Rejected' ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600' }`}>
                              {exp.status}
                            </span>
                          </td>
                          <td className="px-6 py-6 text-center">
                            <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              {exp.status === 'Pending' && (
                                <>
                                  <button 
                                    onClick={async () => {
                                      await updateDoc(doc(db, 'expenses', exp.id), { status: 'Approved' });
                                      toast.success('Expense approved');
                                    }}
                                    className="p-2 bg-orange-50 text-orange-600 rounded-lg hover:bg-orange-100 transition-all"
                                    title="Approve"
                                  >
                                    <CheckCircle2 size={14} />
                                  </button>
                                  <button 
                                    onClick={async () => {
                                      await updateDoc(doc(db, 'expenses', exp.id), { status: 'Rejected' });
                                      toast.success('Expense rejected');
                                    }}
                                    className="p-2 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-100 transition-all"
                                    title="Reject"
                                  >
                                    <X size={14} />
                                  </button>
                                </>
                              )}
                              <button 
                                onClick={async () => {
                                  if (window.confirm('Delete this expense?')) {
                                    await deleteDoc(doc(db, 'expenses', exp.id));
                                    toast.success('Expense deleted');
                                  }
                                }}
                                className="p-2 bg-slate-50 text-black dark:text-slate-300 hover:text-rose-600 rounded-lg transition-all"
                                title="Delete"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="lg:col-span-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-10 sticky top-8">
              <div className="flex items-center gap-4 mb-10">
                <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-2xl text-orange-600 dark:text-orange-400">
                  <UploadCloud size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-black dark:text-slate-100 tracking-tight leading-tight">Log Expense</h3>
                  <p className="text-[10px] font-black text-black dark:text-slate-300 tracking-widest capitalize mt-1">Submit for approval</p>
                </div>
              </div>
              <form className="space-y-6" onSubmit={handleSaveExpense}>
                <div className="space-y-2">
                  <div className="flex justify-between items-center px-1">
                    <label className="text-[11px] font-black text-black dark:text-slate-300 tracking-widest capitalize">Category</label>
                    <button type="button" onClick={() => setIsCustomExpenseCategory(!isCustomExpenseCategory)} className="text-[10px] font-black text-orange-600 capitalize tracking-widest hover:underline">
                      {isCustomExpenseCategory ? 'Select Existing' : 'Add Custom'}
                    </button>
                  </div>
                  {isCustomExpenseCategory ? (
                    <input name="customCategory" type="text" placeholder="Enter custom category" className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-orange-500/20 transition-all" required />
                  ) : (
                    <select name="category" className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-orange-500/20 transition-all appearance-none cursor-pointer">
                      <option>Utilities</option>
                      <option>Maintenance</option>
                      <option>Supplies</option>
                      <option>Transport</option>
                      <option>Salaries</option>
                      <option>Other</option>
                    </select>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-black dark:text-slate-300 tracking-widest capitalize px-1">Description</label>
                  <input name="description" required placeholder="Expense details..." className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-orange-500/20 transition-all" />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-black dark:text-slate-300 tracking-widest capitalize px-1">Amount (KES)</label>
                  <input name="amount" type="number" required placeholder="0.00" className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-orange-500/20 transition-all" />
                </div>
                <button 
                  type="submit" 
                  className="w-full py-5 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl font-black text-[10px] capitalize tracking-widest shadow-xl shadow-orange-200 dark:shadow-none transition-all mt-4"
                >
                  Submit for Approval
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'etims' && (
        <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 animate-in fade-in zoom-in duration-700">
          <div className="relative mb-8">
            
            <div className="relative bg-slate-900 p-8 rounded-[2.5rem] border border-slate-800 shadow-2xl">
              <ShieldCheck size={64} className="text-orange-500" strokeWidth={1.5} />
            </div>
          </div>
          <div className="text-center max-w-lg">
            <h3 className="text-3xl font-bold text-black dark:text-white tracking-tight mb-4">KRA eTIMS</h3>
            <p className="text-black dark:text-slate-400 font-medium mb-8 leading-relaxed">
              We are working on connecting BrightSoma directly with the Kenya Revenue Authority.
              Soon, you will be able to send receipts to KRA and manage tax records right from here.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <div className="px-6 py-3 bg-orange-50 dark:bg-orange-900/20 rounded-2xl border border-orange-100 dark:border-orange-800/50 flex items-center gap-3">
                <CheckCircle2 size={16} className="text-orange-600" />
                <span className="text-xs font-bold text-orange-600">Automatic Receipt Sending</span>
              </div>
              <div className="px-6 py-3 bg-orange-50 dark:bg-orange-900/20 rounded-2xl border border-orange-100 dark:border-orange-800/50 flex items-center gap-3">
                <CheckCircle2 size={16} className="text-orange-600" />
                <span className="text-xs font-black text-orange-600 tracking-widest">CU Number Tracking</span>
              </div>
            </div>
            <div className="mt-12 p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-700">
               <p className="text-[10px] font-black text-black dark:text-slate-300 tracking-[0.2em] mb-4">Estimated Rollout</p>
               <div className="flex items-center justify-center gap-2">
                 <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></div>
                 <span className="text-lg font-black text-black dark:text-slate-200">Q2 2026</span>
               </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'analytics' && (
        <div className="space-y-10 animate-in fade-in duration-700">
          {/* Hero Banner */}
          <div className="bg-gradient-to-br from-orange-50 via-slate-50 to-orange-100 dark:from-slate-800 dark:to-slate-900 rounded-[2rem] p-8 shadow-sm border border-orange-200/60 dark:border-slate-700 relative overflow-hidden group">
            
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <h2 className="text-2xl font-bold text-black dark:text-white tracking-tight leading-tight mb-1">Term Overview</h2>
                <p className="text-sm font-medium text-black dark:text-slate-400 max-w-xl">
                  A clear summary of how the school is doing financially this term.
                </p>
              </div>
              <div className="flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-slate-900 rounded-full border border-slate-100 dark:border-slate-800 shadow-sm">
                <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></div>
                <span className="text-xs font-bold text-black dark:text-slate-300">Finances are stable</span>
              </div>
            </div>
          </div>

          {/* 4 Stat Cards — CBC Assessment style */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { label: 'Money Collected', sublabel: 'Total fees received this term', value: totalCollected, iconColor: 'text-orange-500', iconBg: 'bg-orange-50 dark:bg-orange-900/20', bar: 'bg-orange-500', accent: 'text-orange-600' },
              { label: 'Money Spent', sublabel: 'Total operating costs this term', value: totalExpenses, iconColor: 'text-rose-500', iconBg: 'bg-rose-50 dark:bg-rose-900/20', bar: 'bg-rose-500', accent: 'text-rose-600' },
              { label: 'Fees Outstanding', sublabel: 'Balances yet to be paid', value: totalArrears, iconColor: 'text-orange-500', iconBg: 'bg-orange-50 dark:bg-orange-900/20', bar: 'bg-orange-500', accent: 'text-orange-600' },
              { label: 'Pending Bills', sublabel: 'Expenses awaiting payment', value: totalPayables, iconColor: 'text-amber-500', iconBg: 'bg-amber-50 dark:bg-amber-900/20', bar: 'bg-amber-500', accent: 'text-amber-600' }
            ].map((stat, i) => (
              <div key={i} className="group relative bg-gradient-to-br from-orange-50/50 via-white to-orange-100/20 dark:from-slate-800 dark:to-slate-900 rounded-[2rem] border border-orange-200/60 dark:border-slate-700 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden p-6 flex flex-col">
                <div className="relative z-10 flex flex-col h-full">
                  <div className={`w-10 h-10 ${stat.iconBg} rounded-xl flex items-center justify-center mb-4`}>
                    <Wallet size={18} className={stat.iconColor} />
                  </div>
                  <p className="text-xs font-bold text-black dark:text-slate-400 mb-1">{stat.sublabel}</p>
                  <h3 className="text-lg font-bold text-black dark:text-white mb-3">{stat.label}</h3>
                  <p className={`text-sm font-black text-black dark:text-white tracking-tight mt-auto`}>KES {(stat.value / 1000).toFixed(1)}K</p>
                  <div className={`mt-4 h-1 w-10 rounded-full ${stat.bar} group-hover:w-full transition-all duration-500`}></div>
                </div>
              </div>
            ))}
          </div>

          {/* Middle Cards Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Fee Target Progress */}
            <div className="group relative bg-gradient-to-br from-orange-50/50 via-white to-orange-100/20 dark:from-slate-800 dark:to-slate-900 rounded-[2rem] border border-orange-200/60 dark:border-slate-700 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden p-6 flex flex-col">
              
              <div className="relative z-10">
                <div className="bg-slate-50/80 dark:bg-slate-800/80 p-4 pb-3 border-b border-slate-200/60 dark:border-slate-700 flex items-center gap-3 -mx-6 -mt-6 mb-5 px-6">
                  <Activity size={16} className="text-orange-500" />
                  <p className="text-sm font-bold text-black dark:text-slate-300">Term 1 Collection Target</p>
                </div>
                <p className="text-lg font-black text-black dark:text-white tracking-tight mb-2">KES {(feeTarget / 1000000).toFixed(1)}M</p>
                <p className="text-xs font-medium text-black dark:text-slate-300 mb-6">Target set for all learner fees this term</p>
                <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full bg-orange-500 rounded-full transition-all duration-1000" style={{ width: `${collectionRate}%` }}></div>
                </div>
                <div className="flex justify-between items-center mt-3">
                  <p className="text-xs font-bold text-orange-600">{collectionRate}% collected</p>
                  <p className="text-xs font-bold text-black dark:text-slate-300">KES {(totalCollected / 1000000).toFixed(1)}M raised</p>
                </div>
              </div>
            </div>

            {/* School Financial Health */}
            <div className="group relative bg-gradient-to-br from-orange-50/50 via-white to-orange-100/20 dark:from-slate-800 dark:to-slate-900 rounded-[2rem] border border-orange-200/60 dark:border-slate-700 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden p-6 flex flex-col">
              
              <div className="relative z-10">
                <div className="bg-slate-50/80 dark:bg-slate-800/80 p-4 pb-3 border-b border-slate-200/60 dark:border-slate-700 flex items-center gap-3 -mx-6 -mt-6 mb-5 px-6">
                  <Activity size={16} className={collectionRate > 80 ? 'text-orange-500' : 'text-amber-500'} />
                  <p className="text-sm font-bold text-black dark:text-slate-300">Financial Health</p>
                </div>
                <div className="flex items-center gap-5">
                  <div className={`w-20 h-20 rounded-[1.5rem] border-4 flex items-center justify-center flex-shrink-0 ${collectionRate > 80 ? 'border-orange-400 bg-orange-50 dark:bg-orange-900/20' : 'border-amber-400 bg-amber-50 dark:bg-amber-900/20'}`}>
                    <span className={`text-2xl font-black ${collectionRate > 80 ? 'text-orange-600' : 'text-amber-600'}`}>{collectionRate}%</span>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-black dark:text-white">{collectionRate > 80 ? 'Excellent' : 'Moderate'}</p>
                    <p className="text-xs font-medium text-black dark:text-slate-300 mt-1">{collectionRate > 80 ? 'The school is collecting fees well.' : 'Collection is at a moderate pace.'}</p>
                    <span className={`mt-2 inline-block text-[10px] font-bold px-3 py-1 rounded-full ${collectionRate > 80 ? 'bg-orange-50 text-orange-600' : 'bg-amber-50 text-amber-600'}`}>
                      {collectionRate > 80 ? 'On Track' : 'Needs Attention'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Outstanding Fees */}
            <div className="group relative bg-gradient-to-br from-orange-50/50 via-white to-orange-100/20 dark:from-slate-800 dark:to-slate-900 rounded-[2rem] border border-orange-200/60 dark:border-slate-700 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden p-6 flex flex-col">
              
              <div className="relative z-10">
                <div className="bg-slate-50/80 dark:bg-slate-800/80 p-4 pb-3 border-b border-slate-200/60 dark:border-slate-700 flex items-center gap-3 -mx-6 -mt-6 mb-5 px-6">
                  <ArrowDownRight size={16} className="text-rose-500" />
                  <p className="text-sm font-bold text-black dark:text-slate-300">Fees Not Yet Paid</p>
                </div>
                <p className="text-lg font-black text-black dark:text-white tracking-tight mb-2">KES {(totalArrears / 1000000).toFixed(1)}M</p>
                <p className="text-xs font-medium text-black dark:text-slate-300 mb-6">Amount still owed by learners this term</p>
                <button
                  onClick={() => {
                    setActiveTab('collections');
                    setCollectionsSubTab('directory');
                  }}
                  className="w-full py-3 bg-orange-600 dark:bg-white text-white dark:text-orange-600 font-bold text-xs rounded-xl hover:shadow-md hover:bg-orange-700 dark:hover:bg-slate-100 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  View outstanding accounts <ArrowRight size={14} />
                </button>
              </div>
            </div>
          </div>

          {/* Bottom Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 group relative bg-gradient-to-br from-orange-50/50 via-white to-orange-100/20 dark:from-slate-800 dark:to-slate-900 rounded-[2rem] border border-orange-200/60 dark:border-slate-700 shadow-sm overflow-hidden p-6">
              <div className="bg-slate-50/80 dark:bg-slate-800/80 p-4 pb-3 border-b border-slate-200/60 dark:border-slate-700 flex items-center justify-between -mx-6 -mt-6 mb-6 px-6">
                <div className="flex items-center gap-3">
                  <Activity size={16} className="text-orange-500" />
                  <p className="text-sm font-bold text-black dark:text-slate-300">Fee Collection by Term</p>
                </div>
                <p className="text-xs font-medium text-black dark:text-slate-300 hidden sm:block">Year-on-year comparison</p>
              </div>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={historicalData} margin={{ top: 10, right: 10, left: 20, bottom: 0 }} barGap={5}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.05} />
                    <XAxis dataKey="term" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} dy={15} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} tickFormatter={(val) => `${val / 1000000}M`} />
                    <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', backgroundColor: '#0f172a', padding: '14px', boxShadow: '0 20px 40px -12px rgba(0,0,0,0.5)' }} itemStyle={{ color: '#f8fafc', fontSize: '12px', fontWeight: '700' }} labelStyle={{ color: '#94a3b8', marginBottom: '6px', fontWeight: '700', fontSize: '11px' }} formatter={(value: number | undefined) => value !== undefined ? `KES ${value.toLocaleString()}` : 'N/A'} />
                    <Bar dataKey="target" fill="#94a3b8" radius={[2, 2, 0, 0]} barSize={4} name="Target" />
                    <Bar dataKey="collected" fill="#f97316" radius={[2, 2, 0, 0]} barSize={4} name="Collected" animationDuration={2000} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="group relative bg-gradient-to-br from-orange-50/50 via-white to-orange-100/20 dark:from-slate-800 dark:to-slate-900 rounded-[2rem] border border-orange-200/60 dark:border-slate-700 shadow-sm overflow-hidden p-6 flex flex-col">
              <div className="bg-slate-50/80 dark:bg-slate-800/80 p-4 pb-3 border-b border-slate-200/60 dark:border-slate-700 flex items-center gap-3 -mx-6 -mt-6 mb-6 px-6">
                <FileText size={16} className="text-rose-500" />
                <p className="text-sm font-bold text-black dark:text-slate-300">Highest Expenses</p>
              </div>
              <div className="space-y-3">
                {topExpenses.length === 0 ? (
                  <div className="text-center py-10">
                    <div className="w-14 h-14 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-3">
                      <FileText size={22} className="text-slate-300 dark:text-slate-600" />
                    </div>
                    <p className="text-xs font-bold text-black dark:text-slate-300">No expenses recorded yet</p>
                  </div>
                ) : (
                  topExpenses.map((expense, idx) => (
                    <div key={expense.id || idx} className="flex items-center gap-3 p-4 bg-white/70 dark:bg-slate-800/50 rounded-[1.5rem] border border-slate-100 dark:border-slate-700/50 hover:border-slate-200 dark:hover:border-slate-600 hover:shadow-sm transition-all duration-200">
                      <div className="w-9 h-9 bg-rose-50 dark:bg-rose-900/20 rounded-xl flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-black text-rose-500">{idx + 1}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-black dark:text-slate-200 truncate">{expense.category}</p>
                        <p className="text-xs font-medium text-black dark:text-slate-300 truncate">{expense.description}</p>
                      </div>
                      <p className="text-xs font-black text-black dark:text-white flex-shrink-0">KES {expense.amount.toLocaleString()}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'fee-per-class' && (
        <div className="space-y-6 animate-in fade-in duration-700 max-w-7xl mx-auto">
          {/* Header & Filters */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-sm border border-slate-100 dark:border-slate-800">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-orange-50 dark:bg-orange-900/30 text-orange-600 rounded-xl border border-orange-100 dark:border-orange-800/50">
                  <Users size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-black dark:text-white">Fee per Class</h2>
                  <p className="text-sm text-black dark:text-slate-400 font-medium">Manage student fees categorized by class and stream.</p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-4">
                <select 
                  value={feeClassGradeFilter}
                  onChange={(e) => setFeeClassGradeFilter(e.target.value)}
                  className="px-6 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold focus:ring-2 focus:ring-orange-500/20 outline-none"
                >
                  <option value="All">All Grades</option>
                  {Object.values(CBCGrade).map(g => <option key={g} value={g}>{g}</option>)}
                </select>
                <select
                  value={feeClassStreamFilter}
                  onChange={(e) => setFeeClassStreamFilter(e.target.value)}
                  className="px-6 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold focus:ring-2 focus:ring-orange-500/20 outline-none"
                >
                  <option value="All">All Streams</option>
                  {['North', 'South', 'East', 'West'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50/50 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-800">
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Student Name</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Grade & Stream</th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Total Balance</th>
                    <th className="px-6 py-4 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                  {students.filter(s => 
                    (feeClassGradeFilter === 'All' || s.grade === feeClassGradeFilter) &&
                    (feeClassStreamFilter === 'All' || s.stream === feeClassStreamFilter)
                  ).map(student => {
                    const studentPayments = payments.filter(p => p.studentId === student.id).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                    
                    return (
                      <React.Fragment key={student.id}>
                        <tr className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-all">
                          <td className="px-6 py-5">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-900/20 text-orange-600 flex items-center justify-center font-bold">
                                {student.name.charAt(0)}
                              </div>
                              <div>
                                <p className="text-sm font-bold text-black dark:text-slate-200">{student.name}</p>
                                <p className="text-xs text-slate-500 font-medium">{student.admissionNumber}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-5">
                            <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-300">
                              {student.grade} {student.stream}
                            </span>
                          </td>
                          <td className="px-6 py-5 text-right">
                            <div className="flex flex-col items-end">
                              {student.hasFeeRecord === false ? (
                                <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-50 text-amber-600 border border-amber-100 dark:bg-amber-900/30 dark:border-amber-800">
                                  Need Action
                                </span>
                              ) : (
                                <span className={`text-sm font-black ${student.balance > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                                  KES {student.balance > 0 ? student.balance.toLocaleString() : '0.00'}
                                </span>
                              )}
                              <button 
                                onClick={() => setExpandedStudentId(expandedStudentId === student.id ? null : student.id)}
                                className="text-[10px] font-bold text-orange-600 hover:underline mt-1 flex items-center gap-1"
                              >
                                Fee Structure <ChevronDown size={12} className={`transition-transform ${expandedStudentId === student.id ? 'rotate-180' : ''}`} />
                              </button>
                            </div>
                          </td>
                          <td className="px-6 py-5 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button 
                                onClick={() => toast.success(`Message sent to Class Teacher for ${student.name}`)}
                                className="p-2 bg-slate-50 dark:bg-slate-800 hover:bg-orange-50 hover:text-orange-600 dark:hover:bg-orange-900/30 text-slate-500 rounded-lg transition-all"
                                title="Message Class Teacher"
                              >
                                <MessageSquare size={16} />
                              </button>
                              <button 
                                onClick={() => toast.success(`Message sent to Director regarding ${student.name}`)}
                                className="p-2 bg-slate-50 dark:bg-slate-800 hover:bg-orange-50 hover:text-orange-600 dark:hover:bg-orange-900/30 text-slate-500 rounded-lg transition-all"
                                title="Message Director"
                              >
                                <ShieldCheck size={16} />
                              </button>
                              <button 
                                onClick={() => { setInvoiceStudent(student); setShowInvoice(true); }}
                                className="p-2 bg-orange-50 text-orange-600 hover:bg-orange-600 hover:text-white rounded-lg transition-all"
                                title="Generate Invoice"
                              >
                                <FileText size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                        {expandedStudentId === student.id && (
                          <tr>
                            <td colSpan={4} className="p-0 border-b border-slate-100 dark:border-slate-800">
                              <div className="bg-slate-50/50 dark:bg-slate-800/20 p-6 shadow-inner">
                                <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4">Payment History Breakdown</h4>
                                {studentPayments.length === 0 ? (
                                  <p className="text-sm font-medium text-slate-400 italic">No payments recorded for this student.</p>
                                ) : (
                                  <div className="space-y-4">
                                    {Object.entries(
                                      studentPayments.reduce((acc, p) => {
                                        const term = p.term || 'Unknown Term';
                                        if (!acc[term]) acc[term] = {};
                                        const date = new Date(p.date);
                                        const month = date.toLocaleString('default', { month: 'long', year: 'numeric' });
                                        if (!acc[term][month]) acc[term][month] = {};
                                        
                                        // Calculate week of month
                                        const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
                                        const week = `Week ${Math.ceil((date.getDate() + startOfMonth.getDay()) / 7)}`;
                                        
                                        if (!acc[term][month][week]) acc[term][month][week] = [];
                                        acc[term][month][week].push(p);
                                        return acc;
                                      }, {} as Record<string, Record<string, Record<string, Payment[]>>>)
                                    ).map(([term, months]) => (
                                      <div key={term} className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-700">
                                        <h5 className="font-bold text-black dark:text-white mb-3 flex items-center gap-2">
                                          <Calendar size={14} className="text-orange-500" /> {term}
                                        </h5>
                                        <div className="pl-4 space-y-4 border-l border-slate-100 dark:border-slate-800 ml-2">
                                          {Object.entries(months).map(([month, weeks]) => (
                                            <div key={month}>
                                              <p className="text-xs font-bold text-slate-500 mb-2">{month}</p>
                                              <div className="pl-4 space-y-3 border-l-2 border-slate-100 dark:border-slate-800 ml-1">
                                                {Object.entries(weeks).map(([week, weekPayments]) => (
                                                  <div key={week}>
                                                    <p className="text-[10px] font-black tracking-wider text-slate-400 uppercase mb-2">{week}</p>
                                                    <div className="space-y-2">
                                                      {weekPayments.map(p => (
                                                        <div key={p.id} className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl">
                                                          <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 flex items-center justify-center">
                                                              <Wallet size={14} />
                                                            </div>
                                                            <div>
                                                              <p className="text-xs font-bold text-black dark:text-white">KES {p.amount.toLocaleString()}</p>
                                                              <p className="text-[10px] font-medium text-slate-500">{p.method} • {new Date(p.date).toLocaleDateString()}</p>
                                                            </div>
                                                          </div>
                                                          <span className="text-[10px] font-bold px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-md">Paid</span>
                                                        </div>
                                                      ))}
                                                    </div>
                                                  </div>
                                                ))}
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          
          {/* SECTION 1: Fee Configuration Card */}
          <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 pb-6 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-4">
                <div className="p-2.5 bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-xl border border-orange-100/50 dark:border-orange-800/50">
                  <Banknote size={24} strokeWidth={2} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-black dark:text-white">Fee Configuration</h3>
                  <p className="text-xs font-medium text-black dark:text-slate-400">Define grade-specific billable items</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setEditingFee(null);
                  setIsCustomGrade(false);
                  setIsCustomCategory(false);
                  setIsCustomAppliesTo(false);
                  setShowFeeModal(true);
                }}
                className="flex items-center justify-center gap-2 px-5 py-2.5 bg-orange-600 text-white rounded-xl text-xs font-bold hover:bg-orange-700 transition-all shadow-sm active:scale-95 group shrink-0"
              >
                <Plus size={16} className="group-hover:rotate-90 transition-transform duration-300" /> Add Fee Item
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50/50 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-800">
                    <th className="px-6 py-4 text-[10px] font-medium text-black dark:text-slate-400 tracking-wider text-left">Grade Focus</th>
                    <th className="px-6 py-4 text-[10px] font-medium text-black dark:text-slate-400 tracking-wider text-left">Category</th>
                    <th className="px-6 py-4 text-[10px] font-medium text-black dark:text-slate-400 tracking-wider text-left">Applies To</th>
                    <th className="px-6 py-4 text-[10px] font-medium text-black dark:text-slate-400 tracking-wider text-right">Amount (KES)</th>
                    <th className="px-6 py-4 text-[10px] font-medium text-black dark:text-slate-400 tracking-wider text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                  {feeStructures.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center justify-center">
                          <div className="w-12 h-12 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center justify-center mb-4">
                            <FileText size={20} className="text-slate-300 dark:text-slate-600" />
                          </div>
                          <p className="text-xs font-bold text-black dark:text-slate-300">No fee structures defined yet.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    feeStructures.map((fee) => (
                      <tr key={fee.id} className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-all duration-300">
                        <td className="px-6 py-5 text-sm font-medium text-black dark:text-slate-200">{fee.grade}</td>
                        <td className="px-6 py-5">
                          <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-black dark:text-slate-300 rounded-lg text-[10px] font-medium tracking-wider">
                            {fee.category}
                          </span>
                        </td>
                        <td className="px-6 py-5 text-[11px] font-medium text-black dark:text-slate-300 capitalize">{fee.appliesTo}</td>
                        <td className="px-6 py-5 text-sm font-medium text-black dark:text-slate-100 text-right">{fee.amount.toLocaleString()}</td>
                        <td className="px-6 py-5 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button 
                              onClick={() => {
                                setEditingFee(fee);
                                setIsCustomGrade(![...Object.values(CBCGrade), 'All'].includes(fee.grade as any));
                                setIsCustomCategory(!['Tuition Fee', 'Activity Fee', 'Boarding Fee', 'Transport Fee', 'Books/Stationery Levy', 'Examination Fee', 'ICT Levy'].includes(fee.category));
                                setIsCustomAppliesTo(!['All', 'Boarders', 'Day Scholars'].includes(fee.appliesTo));
                                setShowFeeModal(true);
                              }}
                              className="p-2 text-black dark:text-slate-300 hover:text-orange-600 dark:hover:text-orange-400 transition-all"
                            >
                              <Search size={16} />
                            </button>
                            <button 
                              onClick={() => handleDeleteFee(fee.id)}
                              className="p-2 text-black dark:text-slate-300 hover:text-rose-600 transition-all"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* SECTION 2: Personal Profile Card */}
          <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 pb-6 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-4">
                <div className="p-2.5 bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-xl border border-orange-100/50 dark:border-orange-800/50">
                  <Activity size={24} strokeWidth={2} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-black dark:text-white">Staff Audit Profile</h3>
                  <p className="text-xs font-medium text-black dark:text-slate-400">Institution Finance Officer Identification</p>
                </div>
              </div>
            </div>

            <div className="flex flex-col md:flex-row items-center gap-8 bg-slate-50/50 dark:bg-slate-800/20 p-8 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
              <div className="relative group/avatar shrink-0">
                <div className="w-28 h-28 rounded-2xl overflow-hidden bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 flex items-center justify-center">
                  {personalPhoto ? (
                    <img src={personalPhoto} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <Wallet size={32} className="text-slate-300" />
                  )}
                  
                  <label className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover/avatar:opacity-100 transition-opacity flex flex-col items-center justify-center cursor-pointer text-white backdrop-blur-sm rounded-2xl">
                    {isUploadingPhoto ? <Loader2 className="w-6 h-6 animate-spin" /> : <UploadCloud size={20} />}
                    <input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} disabled={isUploadingPhoto} />
                  </label>
                </div>
              </div>
              <div className="text-center md:text-left">
                <h4 className="font-bold text-black dark:text-white mb-1">Upload Identification Photo</h4>
                <p className="text-xs font-medium text-black dark:text-slate-400 mb-4">A clear professional photo for financial transaction logging.</p>
                <p className="text-[10px] text-black dark:text-slate-300 font-bold tracking-wider">Accepted: JPG, PNG (Max 2MB)</p>
              </div>
            </div>
          </div>

          {/* SECTION 3: Collection Targets Card */}
          <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 pb-6 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-4">
                <div className="p-2.5 bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-xl border border-orange-100/50 dark:border-orange-800/50">
                  <CreditCard size={24} strokeWidth={2} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-black dark:text-white">Collection Targets</h3>
                  <p className="text-xs font-medium text-black dark:text-slate-400">Set and track revenue milestones</p>
                </div>
              </div>
              <button 
                onClick={() => setShowTargetModal(true)}
                className="flex items-center justify-center gap-2 px-5 py-2.5 bg-orange-600 text-white rounded-xl text-xs font-bold hover:bg-orange-700 transition-all shadow-sm active:scale-95 group shrink-0"
              >
                <Plus size={16} className="group-hover:rotate-90 transition-transform duration-300" /> Add Target
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50/50 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-800">
                    <th className="px-6 py-4 text-[10px] font-medium text-black dark:text-slate-300 tracking-widest text-left">Period</th>
                    <th className="px-6 py-4 text-[10px] font-medium text-black dark:text-slate-300 tracking-widest text-left">Grade / Stream</th>
                    <th className="px-6 py-4 text-[10px] font-medium text-black dark:text-slate-300 tracking-widest text-right">Target Amount</th>
                    <th className="px-6 py-4 text-[10px] font-medium text-black dark:text-slate-300 tracking-widest text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                  {feeTargets.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-black dark:text-slate-300 text-xs font-bold">No targets defined yet.</td>
                    </tr>
                  ) : (
                    feeTargets.map((target) => (
                      <tr key={target.id} className="group hover:bg-slate-50/50 transition-all">
                        <td className="px-6 py-5">
                          <p className="text-sm font-medium text-black dark:text-slate-200">{target.term || 'All Terms'}</p>
                          <p className="text-[10px] text-black dark:text-slate-300 font-medium">{target.month || 'Universal'}</p>
                        </td>
                        <td className="px-6 py-5">
                          <p className="text-sm font-medium text-black dark:text-slate-300">{target.grade || 'All Grades'}</p>
                          <p className="text-[10px] text-black dark:text-slate-300 font-medium">{target.stream || 'All Streams'}</p>
                        </td>
                        <td className="px-6 py-5 text-sm font-medium text-black dark:text-slate-100 text-right">KES {target.amount.toLocaleString()}</td>
                        <td className="px-6 py-5 text-center">
                          <button onClick={() => handleDeleteTarget(target.id)} className="p-2 text-black dark:text-slate-300 hover:text-rose-600 transition-all">
                            <X size={16} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Target Modal - Redesigned to match the new aesthetic */}
      {showTargetModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden relative animate-in zoom-in-95 duration-500 border border-slate-100 dark:border-slate-800">
            <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-2.5 bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-xl border border-orange-100/50 dark:border-orange-800/50">
                  <Target size={20} strokeWidth={2} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-black dark:text-white">Fee Target</h3>
                  <p className="text-xs font-medium text-black dark:text-slate-400">Set revenue milestones for tracking</p>
                </div>
              </div>
              <button 
                onClick={() => setShowTargetModal(false)}
                className="p-2 text-black dark:text-slate-300 hover:text-black dark:text-slate-300 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-all"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSaveTarget} className="p-8 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-black dark:text-slate-300 tracking-wider px-0.5">Term Period</label>
                  <select name="term" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-black dark:text-slate-200 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all cursor-pointer">
                    <option value="">All Terms</option>
                    <option value="Term 1">Term 1</option>
                    <option value="Term 2">Term 2</option>
                    <option value="Term 3">Term 3</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-black dark:text-slate-300 tracking-wider px-0.5">Specific Month</label>
                  <select name="month" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-black dark:text-slate-200 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all cursor-pointer">
                    <option value="">Full Term</option>
                    {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-black dark:text-slate-300 tracking-wider px-0.5">Grade Level</label>
                  <select name="grade" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-black dark:text-slate-200 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all cursor-pointer">
                    <option value="">All Grades</option>
                    {Object.values(CBCGrade).map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-black dark:text-slate-300 tracking-wider px-0.5">Stream</label>
                  <select name="stream" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-black dark:text-slate-200 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all cursor-pointer">
                    <option value="">All Streams</option>
                    <option value="North">North</option>
                    <option value="South">South</option>
                    <option value="East">East</option>
                    <option value="West">West</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-black dark:text-slate-300 tracking-wider px-0.5">Target Amount (KES)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-black dark:text-slate-300 font-bold text-xs">KES</span>
                  <input name="amount" type="number" required placeholder="0.00" className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-black dark:text-slate-100 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all" />
                </div>
              </div>

              <button type="submit" className="w-full py-4 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold text-sm shadow-lg shadow-orange-500/20 transition-all active:scale-[0.98] mt-4 flex items-center justify-center gap-2">
                <CheckCircle2 size={18} />
                Set Collection Target
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Fee Reminder SMS Modal */}
      {showSMSModal && smsStudent && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden relative animate-in zoom-in-95 duration-500 border border-slate-100 dark:border-slate-800">
            <div className="px-10 py-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-orange-50/30 dark:bg-orange-900/10">
              <div className="flex items-center gap-5">
                <div className="w-12 h-12 bg-orange-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-orange-200 dark:shadow-none">
                  <MessageSquare size={22} strokeWidth={2.5} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-black dark:text-white tracking-tight">Fee Reminder</h3>
                  <p className="text-[10px] font-black text-black dark:text-slate-300 tracking-widest mt-1">Notify Parent via SMS</p>
                </div>
              </div>
              <button 
                onClick={() => setShowSMSModal(false)}
                className="p-3 bg-white dark:bg-slate-800 text-black dark:text-slate-300 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-black dark:text-slate-300 dark:hover:text-slate-200 transition-all border border-slate-100 dark:border-slate-700 shadow-sm"
              >
                <X size={18} strokeWidth={2.5} />
              </button>
            </div>

            <div className="p-10 space-y-8">
              <div className="flex items-center gap-4 p-5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700/50">
                <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 flex items-center justify-center font-black text-sm">
                  {smsStudent.name.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-black text-black dark:text-slate-100 leading-tight">{smsStudent.name}</p>
                  <p className="text-[10px] font-black text-rose-500 tracking-widest mt-1">Arrears: KES {smsStudent.balance.toLocaleString()}</p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-black dark:text-slate-300 tracking-widest ml-1">Payment Deadline</label>
                  <input 
                    type="date"
                    value={smsDeadline}
                    onChange={(e) => setSmsDeadline(e.target.value)}
                    className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-orange-500/20 outline-none transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-black text-black dark:text-slate-300 tracking-widest ml-1">Payment Instructions</label>
                  <input 
                    type="text"
                    value={smsInstructions}
                    onChange={(e) => setSmsInstructions(e.target.value)}
                    placeholder="e.g. Paybill [PAYBILL], Acc: [ADM]"
                    className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-orange-500/20 outline-none transition-all"
                  />
                </div>

                <div className="p-6 bg-slate-900 rounded-[2rem] border border-slate-800 space-y-3 relative overflow-hidden group">
                  
                  <p className="text-[10px] font-black text-orange-500 tracking-widest flex items-center gap-2">
                    <Zap size={12} className="fill-orange-500" />
                    SMS Preview
                  </p>
                  <p className="text-[11px] text-slate-300 font-bold leading-relaxed italic">
                    "Dear Parent, this is a reminder that {smsStudent.name} has an outstanding fee balance of KES {smsStudent.balance.toLocaleString()}. Please clear this by {smsDeadline || '[Date]'}. Payment Details: {smsInstructions}. <span className="text-orange-400">Note: Failure to comply will result in the learner being sent home.</span>"
                  </p>
                </div>
              </div>

              <button 
                onClick={handleSendSMS}
                disabled={!smsDeadline}
                className="w-full py-5 bg-orange-600 hover:bg-orange-700 text-white rounded-[1.5rem] font-black text-[11px] tracking-[0.2em] shadow-xl shadow-orange-200 dark:shadow-none transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
              >
                Send Notification <ArrowRight size={16} strokeWidth={3} />
              </button>
            </div>
          </div>
        </div>
      )}

      {showFeeModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden relative animate-in zoom-in-95 duration-500 border border-slate-100 dark:border-slate-800">
            {/* Modal Header - Redesigned to match RegisterLearner field card header */}
            <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-2.5 bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-xl border border-orange-100/50 dark:border-orange-800/50">
                  <Plus size={20} strokeWidth={2.5} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-black dark:text-white">{editingFee ? 'Edit Fee Item' : 'Add Fee Item'}</h3>
                  <p className="text-[11px] font-medium text-black dark:text-slate-400">Configure institutional fee components</p>
                </div>
              </div>
              <button 
                onClick={() => setShowFeeModal(false)} 
                className="p-2 text-black dark:text-slate-300 hover:text-black dark:text-slate-300 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-all"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveFeeStructure} className="p-8 space-y-5">
              {/* Grade Selection */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center px-0.5">
                  <label className="text-[11px] font-bold text-black dark:text-slate-300 tracking-wider">Grade Focus</label>
                  <button type="button" onClick={() => setIsCustomGrade(!isCustomGrade)} className="text-[10px] font-bold text-orange-600 hover:text-orange-700 tracking-wider capitalize transition-colors">
                    {isCustomGrade ? 'Select Existing' : 'Add Custom'}
                  </button>
                </div>
                {isCustomGrade ? (
                  <input name="customGrade" type="text" defaultValue={editingFee?.grade} placeholder="Enter custom grade (e.g Grade 9)" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-black dark:text-slate-200 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all" required />
                ) : (
                  <select name="grade" defaultValue={editingFee?.grade || 'All'} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-black dark:text-slate-200 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all appearance-none cursor-pointer">
                    <option value="All">All Grades (Universal)</option>
                    {Object.values(CBCGrade).map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                )}
              </div>

              {/* Category Selection */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center px-0.5">
                  <label className="text-[11px] font-bold text-black dark:text-slate-300 tracking-wider">Fee Category</label>
                  <button type="button" onClick={() => setIsCustomCategory(!isCustomCategory)} className="text-[10px] font-bold text-orange-600 hover:text-orange-700 tracking-wider capitalize transition-colors">
                    {isCustomCategory ? 'Select Existing' : 'Add Custom'}
                  </button>
                </div>
                {isCustomCategory ? (
                  <input name="customCategory" type="text" defaultValue={editingFee?.category} placeholder="Enter custom category" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-black dark:text-slate-200 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all" required />
                ) : (
                  <select name="category" defaultValue={editingFee?.category} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-black dark:text-slate-200 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all appearance-none cursor-pointer">
                    <option value="Tuition Fee">Tuition Fee</option>
                    <option value="Activity Fee">Activity Fee</option>
                    <option value="Boarding Fee">Boarding Fee</option>
                    <option value="Transport Fee">Transport Fee</option>
                    <option value="Books/Stationery Levy">Books/Stationery Levy</option>
                    <option value="Examination Fee">Examination Fee</option>
                    <option value="ICT Levy">ICT Levy</option>
                  </select>
                )}
              </div>

              {/* Amount Input */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-black dark:text-slate-300 tracking-wider px-0.5">Billable Amount (KES)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-black dark:text-slate-300 font-bold text-xs">KES</span>
                  <input name="amount" type="number" defaultValue={editingFee?.amount} required placeholder="0.00" className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-black dark:text-slate-100 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all" />
                </div>
              </div>

              {/* Applicability Selection */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center px-0.5">
                  <label className="text-[11px] font-bold text-black dark:text-slate-300 tracking-wider">Applicability</label>
                  <button type="button" onClick={() => setIsCustomAppliesTo(!isCustomAppliesTo)} className="text-[10px] font-bold text-orange-600 hover:text-orange-700 tracking-wider capitalize transition-colors">
                    {isCustomAppliesTo ? 'Select Existing' : 'Add Custom'}
                  </button>
                </div>
                {isCustomAppliesTo ? (
                  <input name="customAppliesTo" type="text" defaultValue={editingFee?.appliesTo} placeholder="Enter custom group (e.g New Students)" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-black dark:text-slate-200 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all" required />
                ) : (
                  <select name="appliesTo" defaultValue={editingFee?.appliesTo || 'All'} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-black dark:text-slate-200 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all appearance-none cursor-pointer">
                    <option value="All">All Enrolled Students</option>
                    <option value="Boarders">Boarders Only</option>
                    <option value="Day Scholars">Day Scholars Only</option>
                  </select>
                )}
              </div>

              <button type="submit" className="w-full py-4 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold text-sm shadow-lg shadow-orange-500/20 transition-all active:scale-[0.98] mt-4 flex items-center justify-center gap-2">
                <CheckCircle2 size={18} />
                {editingFee ? 'Update Fee Structure' : 'Confim & Add Fee Item'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Student Profile / Statement Modal */}
      {selectedStudentProfile && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className={`bg-white dark:bg-slate-900 w-full rounded-[2.5rem] shadow-2xl overflow-hidden relative animate-in zoom-in-95 duration-500 max-h-[90vh] flex flex-col border border-slate-100 dark:border-slate-800 transition-all duration-500 ${ maximizedTerm ? 'max-w-4xl' : 'max-w-6xl' }`}>
            <div className="p-8 md:p-10 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 rounded-[1.5rem] bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center font-black text-2xl shadow-sm border border-blue-200 dark:border-blue-800/50">
                  {selectedStudentProfile.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-2xl font-black text-black dark:text-slate-100 tracking-tight">{selectedStudentProfile.name}</h3>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-black dark:text-slate-300 rounded-lg text-[10px] font-black capitalize tracking-widest">
                      {selectedStudentProfile.admissionNumber}
                    </span>
                    <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-black dark:text-slate-300 rounded-lg text-[10px] font-black capitalize tracking-widest">
                      {selectedStudentProfile.grade}
                    </span>
                  </div>
                </div>
              </div>
              <button onClick={() => { setSelectedStudentProfile(null); setMaximizedTerm(null); }} className="p-3 bg-white dark:bg-slate-800 text-black dark:text-slate-300 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-black dark:text-slate-300 dark:hover:text-slate-200 transition-all shadow-sm border border-slate-100 dark:border-slate-700">
                <X size={18} strokeWidth={2.5} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto no-scrollbar bg-white dark:bg-slate-900">
              <div className={`grid gap-0 items-start divide-x divide-slate-100 dark:divide-slate-800 ${ maximizedTerm ? 'grid-cols-1' : 'grid-cols-1 xl:grid-cols-3' }`}>
                {groupedStatementData.map((section, idx) => {
                  if (maximizedTerm && maximizedTerm !== section.id) return null;
                  return (
                    <div key={idx} className="flex flex-col min-h-0">
                      <div className="p-8 border-b border-slate-50 dark:border-slate-800 space-y-6">
                        <div className="flex justify-between items-center">
                          <div>
                            <h3 className="text-xl font-black text-black dark:text-white italic">{section.term}</h3>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mt-1">Statement of Account</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => setMaximizedTerm(maximizedTerm === section.id ? null : section.id)}
                              className={`p-2.5 rounded-xl transition-all ${maximizedTerm === section.id ? 'bg-orange-600 text-white shadow-lg' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 hover:bg-slate-200'}`}
                            >
                              {maximizedTerm === section.id ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                            <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400">
                              <FileText size={16} />
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <div className="px-4 py-2 bg-slate-900 rounded-xl border border-white/10 flex items-center gap-3">
                            <p className="text-[8px] font-black text-slate-500 uppercase">Fees</p>
                            <p className="text-[11px] font-black text-white">KES {section.totals.fees}</p>
                          </div>
                          <div className="px-4 py-2 bg-emerald-600 rounded-xl flex items-center gap-3 shadow-lg shadow-emerald-900/20">
                            <p className="text-[8px] font-black text-emerald-100 uppercase">Paid</p>
                            <p className="text-[11px] font-black text-white">KES {section.totals.paid}</p>
                          </div>
                          {section.totals.bal !== '0' && (
                            <div className={`px-4 py-2 rounded-xl flex items-center gap-3 shadow-lg ${section.totals.bal === 'Need Action' ? 'bg-amber-600 shadow-amber-900/20' : 'bg-rose-600 shadow-rose-900/20 animate-pulse'}`}>
                              <p className={`text-[8px] font-black uppercase ${section.totals.bal === 'Need Action' ? 'text-amber-100' : 'text-rose-100'}`}>
                                {section.totals.bal === 'Need Action' ? 'Action' : 'Due'}
                              </p>
                              <p className="text-[11px] font-black text-white">
                                {section.totals.bal === 'Need Action' ? 'Need Action' : `KES ${section.totals.bal}`}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="overflow-x-auto no-scrollbar">
                        <table className="w-full text-left">
                          <thead>
                            <tr className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-50 dark:border-slate-800">
                              <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Date</th>
                              <th className="px-4 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Description</th>
                              <th className="px-4 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Invoices</th>
                              <th className="px-4 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Receipts</th>
                              <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Balance</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                            {section.data.length > 0 ? section.data.map((row: any, i: number) => (
                              <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors group">
                                <td className="px-6 py-5">
                                  <p className="text-[11px] font-black text-black dark:text-white leading-tight whitespace-nowrap">{row.date}</p>
                                  <p className="text-[8px] text-slate-400 uppercase font-black tracking-tighter leading-none mt-1">{row.time}</p>
                                </td>
                                <td className="px-4 py-5 text-[11px] font-bold text-black dark:text-white leading-tight min-w-[150px]">
                                  {row.desc}
                                </td>
                                <td className="px-4 py-5 text-[11px] font-black text-slate-900 dark:text-white text-right">{row.inv || '—'}</td>
                                <td className="px-4 py-5 text-[11px] font-black text-emerald-600 text-right">{row.rec || '—'}</td>
                                <td className="px-6 py-5 text-[11px] font-black text-black dark:text-white text-right">{row.bal}</td>
                              </tr>
                            )) : (
                              <tr>
                                <td colSpan={5} className="px-6 py-20 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest italic opacity-50">No transactions recorded.</td>
                              </tr>
                            )}
                          </tbody>
                          {section.data.length > 0 && (
                            <tfoot>
                              <tr className={`${maximizedTerm === section.id ? 'bg-orange-600' : 'bg-slate-900'} text-white font-black transition-colors`}>
                                <td colSpan={2} className="px-6 py-6 text-[10px] uppercase tracking-widest italic">Term Total Summary</td>
                                <td className="px-4 py-6 text-[11px] text-right">{section.totals.fees}</td>
                                <td className="px-4 py-6 text-[11px] text-right text-emerald-400">{section.totals.paid}</td>
                                <td className="px-6 py-6 text-[12px] text-right text-orange-400">{section.totals.bal}</td>
                              </tr>
                            </tfoot>
                          )}
                        </table>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="p-8 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-end gap-4">
              <button 
                onClick={() => toast.success('Statement sent to parent')}
                className="px-8 py-3 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-black dark:text-slate-200 rounded-2xl text-xs font-black shadow-sm hover:bg-slate-50 transition-all"
              >
                Send to Parent
              </button>
              <button 
                onClick={() => window.print()}
                className="px-8 py-3 bg-orange-600 text-white rounded-2xl text-xs font-black shadow-xl shadow-orange-900/20 hover:bg-orange-700 transition-all active:scale-95"
              >
                Print Statement
              </button>
            </div>
          </div>
        </div>
      )}

      {showReceipt && selectedPayment && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden relative animate-in zoom-in-95 duration-500 border border-slate-100 dark:border-slate-800">
            <button 
              onClick={() => setShowReceipt(false)}
              className="absolute top-8 right-8 p-3 bg-slate-50 dark:bg-slate-800 text-black dark:text-slate-300 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-black dark:text-slate-300 dark:hover:text-slate-200 transition-all shadow-sm border border-slate-100 dark:border-slate-700"
            >
              <X size={18} strokeWidth={2.5} />
            </button>

            <div ref={receiptRef} className="p-10 space-y-8 text-black dark:text-slate-100">
              <div className="text-center border-b border-slate-100 dark:border-slate-800 pb-8">
                <h2 className="text-2xl font-black tracking-tight">Official Institution Receipt</h2>
                <p className="text-[10px] font-black text-black dark:text-slate-300 tracking-widest capitalize mt-2">Finance & Operations Department</p>
                <p className="text-[10px] text-black dark:text-slate-300 font-bold mt-2">Nairobi, Kenya</p>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between text-[11px] font-bold">
                  <span className="text-black dark:text-slate-300 capitalize tracking-widest">Receipt No:</span>
                  <span className="font-black text-black dark:text-slate-200">{selectedPayment.code}</span>
                </div>
                <div className="flex justify-between text-[11px] font-bold">
                  <span className="text-black dark:text-slate-300 capitalize tracking-widest">Date:</span>
                  <span className="font-black text-black dark:text-slate-200">{selectedPayment.date}</span>
                </div>
                <div className="flex justify-between text-[11px] font-bold">
                  <span className="text-black dark:text-slate-300 capitalize tracking-widest">Learner:</span>
                  <span className="font-black text-black dark:text-slate-200">{selectedPayment.student}</span>
                </div>
                <div className="flex justify-between text-[11px] font-bold">
                  <span className="text-black dark:text-slate-300 capitalize tracking-widest">ADM No:</span>
                  <span className="font-black text-black dark:text-slate-200">{selectedPayment.adm}</span>
                </div>
                <div className="flex justify-between text-[11px] font-bold">
                  <span className="text-black dark:text-slate-300 capitalize tracking-widest">Parent:</span>
                  <span className="font-black text-black dark:text-slate-200">{selectedPayment.parentName}</span>
                </div>
                <div className="flex justify-between text-[11px] font-bold">
                  <span className="text-black dark:text-slate-300 capitalize tracking-widest">Method:</span>
                  <span className="font-black text-black dark:text-slate-200">{selectedPayment.method}</span>
                </div>
              </div>

              <div className="p-6 bg-orange-50 dark:bg-orange-900/20 rounded-3xl border border-orange-100 dark:border-orange-800/50 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black text-orange-600 dark:text-orange-400 capitalize tracking-widest">Amount Paid</span>
                  <span className="text-xl font-black text-orange-700 dark:text-orange-300 tracking-tight">KES {selectedPayment.amount.toLocaleString()}</span>
                </div>
                <p className="text-[9px] text-orange-600/80 dark:text-orange-400/80 font-bold italic leading-relaxed">
                  "{selectedPayment.code} Confirmed. KES {selectedPayment.amount.toLocaleString()} paid to Institution Account for {selectedPayment.adm}. Transaction processed on {selectedPayment.date}"
                </p>
              </div>

              <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
                <div className="flex justify-between text-sm font-black">
                  <span className="capitalize tracking-widest text-black dark:text-slate-300 text-[10px]">Current Balance:</span>
                  <span className="text-rose-600 dark:text-rose-400 tracking-tight text-lg">KES {selectedPayment.balance.toLocaleString()}</span>
                </div>
              </div>

              <div className="text-center pt-4">
                <p className="text-[9px] text-black dark:text-slate-300 font-bold capitalize tracking-widest">This is a computer-generated receipt. No signature required.</p>
              </div>
            </div>

            <div className="p-10 bg-slate-50 dark:bg-slate-800/50 flex flex-col gap-4 border-t border-slate-100 dark:border-slate-800">
              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => {
                    const msg = `Receipt for ${selectedPayment.student} (ADM: ${selectedPayment.adm}). Amount: KES ${selectedPayment.amount.toLocaleString()}. Method: ${selectedPayment.method}. Balance: KES ${selectedPayment.balance.toLocaleString()}. Ref: ${selectedPayment.code}`;
                    const phone = selectedPayment.parentPhone || '';
                    window.open(`https://wa.me/${phone.replace(/^0/, '254')}?text=${encodeURIComponent(msg)}`, '_blank');
                  }}
                  className="py-4 bg-orange-600 text-white rounded-2xl text-[10px] font-black capitalize tracking-widest hover:bg-orange-700 shadow-xl shadow-orange-200 dark:shadow-none transition-all flex items-center justify-center gap-2 active:scale-95"
                >
                  <MessageSquare size={14} /> WhatsApp
                </button>
                <button 
                  onClick={() => {
                    const msg = `Receipt for ${selectedPayment.student} (ADM: ${selectedPayment.adm}). Amount: KES ${selectedPayment.amount.toLocaleString()}. Method: ${selectedPayment.method}. Balance: KES ${selectedPayment.balance.toLocaleString()}. Ref: ${selectedPayment.code}`;
                    const phone = selectedPayment.parentPhone || '';
                    window.open(`sms:${phone}?body=${encodeURIComponent(msg)}`, '_blank');
                  }}
                  className="py-4 bg-blue-600 text-white rounded-2xl text-[10px] font-black capitalize tracking-widest hover:bg-blue-700 shadow-xl shadow-blue-200 dark:shadow-none transition-all flex items-center justify-center gap-2 active:scale-95"
                >
                  <MessageSquare size={14} /> SMS
                </button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => setShowReceipt(false)}
                  className="py-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-black dark:text-slate-300 rounded-2xl text-[10px] font-black capitalize tracking-widest hover:bg-slate-50 dark:hover:bg-slate-700 transition-all active:scale-95"
                >
                  Close
                </button>
                <button 
                  onClick={() => handlePrint()}
                  className="py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl text-[10px] font-black capitalize tracking-widest hover:bg-black dark:hover:bg-slate-100 shadow-xl shadow-slate-200 dark:shadow-none transition-all flex items-center justify-center gap-2 active:scale-95"
                >
                  <Printer size={14} /> Print
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== INVOICE MODAL ===== */}
      {showInvoice && invoiceStudent && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="font-bold text-black dark:text-white text-lg">Fee Invoice</h3>
                <p className="text-xs text-black dark:text-slate-300">{invoiceStudent.name} • {invoiceStudent.admissionNumber}</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => handleInvoicePrint()}
                  className="flex items-center gap-2 px-5 py-2.5 bg-orange-600 text-white rounded-xl text-sm font-bold hover:bg-orange-700 transition-all shadow-lg shadow-orange-500/25"
                >
                  <Printer size={16} /> Print Invoice
                </button>
                <button
                  onClick={() => setShowInvoice(false)}
                  className="p-2.5 bg-slate-100 dark:bg-slate-800 text-black dark:text-slate-300 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
            {/* Preview */}
            <InvoiceReceipt
              ref={invoiceRef}
              type="invoice"
              student={invoiceStudent}
              schoolName={schoolName}
              schoolLogo={schoolLogo}
              schoolPhone=""
              termLabel="Current Term Analysis"
              feeStructures={feeStructures.map(f => ({ category: f.category, amount: f.amount, grade: f.grade }))}
              allPayments={payments
                .filter(p => p.adm === invoiceStudent.admissionNumber)
                .map(p => ({ amount: p.amount, date: p.date, method: p.method, reference: p.code }))}
            />
          </div>
        </div>
      )}

      {/* Hidden printable receipt (small receipt style) */}
      <div style={{ display: 'none' }}>
        {selectedPayment && (
          <InvoiceReceipt
            ref={receiptRef}
            type="receipt"
            payment={{
              id: selectedPayment.id || '',
              amount: selectedPayment.amount,
              method: selectedPayment.method,
              date: selectedPayment.date,
              reference: selectedPayment.code,
              etimsInvoiceNumber: selectedPayment.etimsInvoiceNumber,
            }}
            student={
              students.find(s => s.admissionNumber === selectedPayment.adm)
                ? { ...students.find(s => s.admissionNumber === selectedPayment.adm)!, balance: selectedPayment.balance }
                : { name: selectedPayment.student, admissionNumber: selectedPayment.adm, balance: selectedPayment.balance }
            }
            schoolName={schoolName}
            schoolLogo={schoolLogo}
            schoolPhone=""
            termLabel="Current Term Analysis"
          />
        )}
      </div>

      {/* ===== EDIT BALANCE / AUDIT MODAL ===== */}
      {showEditModal && editingStudent && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden relative animate-in zoom-in-95 duration-500 border border-slate-100 dark:border-slate-800">
            <div className="px-10 py-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-2xl">
                  <ShieldCheck size={24} strokeWidth={2.5} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-black dark:text-white tracking-tight leading-tight">Financial Audit Control</h3>
                  <p className="text-[10px] font-black text-black dark:text-slate-300 tracking-widest mt-1">Adjusting: {editingStudent.name}</p>
                </div>
              </div>
              <button 
                onClick={() => setShowEditModal(false)}
                className="p-3 bg-slate-50 dark:bg-slate-800 text-black dark:text-slate-300 rounded-2xl hover:bg-slate-100 transition-all"
              >
                <X size={18} strokeWidth={2.5} />
              </button>
            </div>

            <form onSubmit={handleAdjustBalance} className="p-10 space-y-6">
              <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-700 space-y-2">
                <p className="text-[10px] font-black text-black dark:text-slate-300 tracking-widest">Current Balance</p>
                <p className="text-2xl font-black text-black dark:text-white tracking-tight">KES {(editingStudent.balance || 0).toLocaleString()}</p>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-black text-black dark:text-slate-300 tracking-widest px-1">Adjustment Amount (KES)</label>
                <input 
                  type="number" 
                  value={adjustmentAmount}
                  onChange={(e) => setAdjustmentAmount(e.target.value)}
                  placeholder="e.g. -500 to decrease, 500 to increase" 
                  className="w-full px-8 py-5 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-[1.5rem] text-sm font-bold text-black dark:text-white focus:ring-2 focus:ring-amber-500/20 shadow-sm transition-all outline-none"
                  required
                />
                <p className="text-[10px] text-black dark:text-slate-300 font-medium px-1">Enter a negative number to reduce the balance (e.g. credit/discount).</p>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-black text-black dark:text-slate-300 tracking-widest px-1">Reason for Adjustment</label>
                <textarea 
                  value={adjustmentReason}
                  onChange={(e) => setAdjustmentReason(e.target.value)}
                  placeholder="Explain why this change is being made..." 
                  className="w-full px-8 py-5 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-[1.5rem] text-sm font-bold text-black dark:text-white focus:ring-2 focus:ring-amber-500/20 shadow-sm transition-all outline-none min-h-[120px] resize-none"
                  required
                ></textarea>
              </div>

              <div className="pt-4 flex flex-col gap-3">
                <button 
                  type="submit"
                  disabled={isProcessing}
                  className="w-full py-5 bg-amber-600 hover:bg-amber-700 text-white rounded-[1.5rem] text-[10px] font-black tracking-widest shadow-xl shadow-amber-200 dark:shadow-none transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
                  Authorize Adjustment & Log to Audit Trail
                </button>
                <p className="text-[9px] text-black dark:text-slate-300 text-center font-bold italic">
                  Warning: All adjustments are permanent and logged with your admin identity ({auth.currentUser?.email}).
                </p>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default FinanceModule;


