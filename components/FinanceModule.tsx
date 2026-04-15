
import React, { useState, useMemo, useRef, useEffect } from 'react';
import InvoiceReceipt from './InvoiceReceipt';
import { 
  AreaChart, 
  Area, 
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
  Zap
} from 'lucide-react';

import { useReactToPrint } from 'react-to-print';
import toast from 'react-hot-toast';
import { db, auth } from '../src/firebase';
import { collection, query, where, onSnapshot, getDocs, addDoc, updateDoc, doc, increment, serverTimestamp, deleteDoc, getDoc } from 'firebase/firestore';
import { Student, Payment, FeeStructure, PaymentMethod, Expense, CBCGrade, FeeCategory } from '../types';

const FinanceModule: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'collections' | 'expenses' | 'etims' | 'analytics' | 'settings'>('collections');
  const [collectionsSubTab, setCollectionsSubTab] = useState<'graph' | 'quickpay' | 'net' | 'arrears' | 'directory'>('graph');
  const [viewMode, setViewMode] = useState<'Weekly' | 'Termly'>('Termly');
  const [searchQuery, setSearchQuery] = useState('');
  const [gradeFilter, setGradeFilter] = useState<string>('All');
  const [admFilter, setAdmFilter] = useState('');
  const [userRole, setUserRole] = useState<string | null>(null);
  const [schoolName, setSchoolName] = useState('BrightSoma Institution');
  const [schoolLogo, setSchoolLogo] = useState<string | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [selectedStudentProfile, setSelectedStudentProfile] = useState<Student | null>(null);
  const [showFeeModal, setShowFeeModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [editingFee, setEditingFee] = useState<FeeStructure | null>(null);
  
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
  const [smsInstructions, setSmsInstructions] = useState('Paybill: [PAYBILL], Acc: [ADM]');

  // Fetch data
  React.useEffect(() => {
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
        setStudents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student)));
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
  }, []);

  useEffect(() => {
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
  }, [auth.currentUser]);

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

  const chartData = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d.toISOString().split('T')[0];
    });

    return last7Days.map(date => {
      const dayPayments = payments.filter(p => p.date.startsWith(date));
      const total = dayPayments.reduce((sum, p) => sum + p.amount, 0);
      return {
        name: new Date(date).toLocaleDateString('en-GB', { weekday: 'short' }),
        collected: total
      };
    });
  }, [payments]);

  const totalCollected = useMemo(() => payments.reduce((sum, p) => sum + p.amount, 0), [payments]);
  const totalArrears = useMemo(() => students.reduce((sum, s) => sum + (s.balance || 0), 0), [students]);
  const feeTarget = useMemo(() => totalCollected + totalArrears, [totalCollected, totalArrears]);
  const collectionRate = useMemo(() => feeTarget > 0 ? Math.round((totalCollected / feeTarget) * 100) : 0, [totalCollected, feeTarget]);

  const totalExpenses = useMemo(() => expenses.reduce((sum, e) => sum + e.amount, 0), [expenses]);
  const totalPayables = useMemo(() => expenses.filter(e => e.status === 'Pending').reduce((sum, e) => sum + e.amount, 0), [expenses]);
  const topExpenses = useMemo(() => [...expenses].sort((a, b) => b.amount - a.amount).slice(0, 5), [expenses]);

  const historicalData = useMemo(() => [
    { term: 'Current Term', collected: totalCollected, target: feeTarget },
  ], [totalCollected, feeTarget]);

  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           s.admissionNumber.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesGrade = gradeFilter === 'All' || s.grade === gradeFilter;
      const matchesAdm = !admFilter || s.admissionNumber.toLowerCase().includes(admFilter.toLowerCase());
      
      return matchesSearch && matchesGrade && matchesAdm;
    });
  }, [students, searchQuery, gradeFilter, admFilter]);

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
            <p className="text-xs font-medium text-slate-400 mt-1">{subtitle}</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
          <div className="space-y-2">
            <p className="text-[10px] font-black text-slate-500 capitalize tracking-widest ml-1">Current Balance</p>
            <div className="flex items-baseline gap-3">
              <span className="text-xs font-black text-orange-500">KES</span>
              <p className="text-5xl font-black text-white tracking-tighter leading-none">{value.toLocaleString()}</p>
            </div>
          </div>

          <div className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-xs font-black tracking-widest capitalize transition-all duration-500 border ${
            status === 'up' 
              ? 'bg-orange-600/10 text-orange-500 border-orange-500/20' 
              : 'bg-rose-600/10 text-rose-500 border-rose-500/20'
          }`}>
            {status === 'up' ? <ArrowUpRight size={18} strokeWidth={3} /> : <ArrowDownRight size={18} strokeWidth={3} />}
            {delta}%
            <span className="text-[10px] opacity-40 uppercase ml-1">Trend</span>
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
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-1000 font-sans">
      {/* Combined Header & Filters Card */}
      <div className="w-[100vw] relative left-1/2 -ml-[50vw] -mt-4 md:-mt-8 bg-[#334155] py-5 border-b border-[#1f507a] shadow-sm">
        <div className="w-full max-w-7xl mx-auto px-4 md:px-8">
          <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center border border-white/10 shadow-inner group relative overflow-hidden">
                {personalPhoto ? (
                  <img src={personalPhoto} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <Wallet size={24} className="text-white/60" />
                )}
                <label className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer text-white">
                  {isUploadingPhoto ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus size={16} />}
                  <input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} />
                </label>
              </div>
              <div className="space-y-1">
                <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                  Finance & Payments
                </h1>
                <p className="text-[#94a3b8] text-sm font-medium">Manage school fees and track expenses</p>
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              {/* Summary Stats in Header */}
              <div className="hidden sm:flex items-center gap-2 mr-4">
                <div className="px-4 py-2 bg-black/20 border border-white/10 rounded-full flex items-center gap-2">
                  <p className="text-[10px] font-bold text-blue-200 uppercase whitespace-nowrap">Collected:</p>
                  <p className="text-sm font-bold text-white tracking-tight">{(totalCollected / 1000).toFixed(1)}K</p>
                </div>
                <div className="px-4 py-2 bg-black/20 border border-white/10 rounded-full flex items-center gap-2">
                  <p className="text-[10px] font-bold text-blue-200 uppercase whitespace-nowrap">Target:</p>
                  <p className="text-sm font-bold text-white tracking-tight">{(feeTarget / 1000000).toFixed(1)}M</p>
                </div>
              </div>

              <button 
                onClick={() => toast.success('Ledger exported successfully')}
                className="flex items-center justify-center gap-2 px-5 py-2.5 bg-white text-orange-600 rounded-xl text-[12.5px] font-bold hover:bg-slate-50 transition-all shadow-sm active:scale-95 group border border-white/20"
              >
                <Download size={16} className="group-hover:scale-110 transition-transform" /> 
                Export Ledger
              </button>
              <button 
                onClick={() => {
                  setActiveTab('collections');
                  setCollectionsSubTab('directory');
                  toast.success('Select a learner from the directory to generate an invoice');
                }}
                className="flex items-center justify-center gap-2 px-5 py-2.5 bg-white text-orange-600 rounded-xl text-[12.5px] font-bold hover:bg-slate-50 transition-all shadow-sm active:scale-95 group border border-white/20"
              >
                <Plus size={16} className="group-hover:scale-110 transition-transform" /> 
                New Invoice
              </button>
            </div>
          </div>

          {/* Thin veil separating line & Filters */}
          <div className="mt-6 pt-5 border-t border-white/10 flex flex-col gap-6">
            <div className="flex p-1.5 bg-black/10 border border-white/10 rounded-[2rem] overflow-x-auto hide-scrollbar">
              {[
                { id: 'collections', label: 'Fee Collections', icon: <Wallet size={14} strokeWidth={2.5} /> },
                { id: 'expenses', label: 'Operating Expenses', icon: <FileText size={14} strokeWidth={2.5} /> },
                { id: 'etims', label: 'KRA eTIMS', icon: <ShieldCheck size={14} strokeWidth={2.5} /> },
                { id: 'analytics', label: 'Termly Analytics', icon: <Wallet size={14} strokeWidth={2.5} /> },
                { id: 'settings', label: 'Fee Structure Setting & Planning', icon: <Banknote size={14} strokeWidth={2.5} /> }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-5 py-2 rounded-[1.5rem] text-[11px] font-bold capitalize tracking-wide transition-all duration-300 whitespace-nowrap ${
                    activeTab === tab.id 
                      ? 'bg-white text-black shadow-sm scale-105' 
                      : 'text-blue-100 hover:bg-white/10'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {activeTab === 'collections' && (
        <div className="flex flex-wrap items-center gap-3 py-4 border-b border-slate-100 dark:border-slate-800">
          {[
            { id: 'graph', label: 'Collection Velocity', icon: <Banknote size={14} /> },
            { id: 'quickpay', label: 'Quick Pay', icon: <Smartphone size={14} /> },
            { id: 'net', label: 'Net Collections', icon: <Wallet size={14} /> },
            { id: 'arrears', label: 'Projected Arrears', icon: <CreditCard size={14} /> },
            { id: 'directory', label: 'Learner Fee Directory', icon: <Search size={14} /> }
          ].map((sub) => (
            <button
              key={sub.id}
              onClick={() => setCollectionsSubTab(sub.id as any)}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[11px] font-bold transition-all duration-300 ${
                collectionsSubTab === sub.id 
                  ? 'bg-orange-600 text-white shadow-lg shadow-orange-200 dark:shadow-none scale-105' 
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
            >
              {sub.icon}
              {sub.label}
            </button>
          ))}
        </div>
      )}

      {activeTab === 'collections' && (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
          {/* Un-carded Revenue Operations Section */}
          <div className="relative py-4 group">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
              <div>
                <h2 className="text-xl font-bold text-slate-800 dark:text-white tracking-tight leading-tight mb-2">Revenue Operations</h2>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400 max-w-xl leading-relaxed">
                  Optimize school cash flow through real-time collection tracking, automated M-Pesa reconciliation, and smart arrears management.
                </p>
              </div>
            </div>
          </div>

          {collectionsSubTab === 'graph' && (
            <div className="relative overflow-hidden group">
              
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-10">
                  <div className="flex items-center gap-5">
                    <div className="w-14 h-14 bg-orange-50 dark:bg-orange-900/20 rounded-xl flex items-center justify-center">
                      <Banknote size={28} className="text-orange-600 dark:text-orange-400" strokeWidth={2.5} />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100 tracking-tight leading-none">Fee Collection Trend</h3>
                      <p className="text-xs font-medium text-slate-400 mt-1">Daily payments collected this week</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 px-4 py-2 bg-orange-50 dark:bg-orange-900/20 rounded-full border border-orange-100 dark:border-orange-900/30">
                    <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></div>
                    <span className="text-xs font-bold text-orange-600 dark:text-orange-400">Live</span>
                  </div>
                </div>
                <div className="h-96 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="velocityGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f97316" stopOpacity={0.15}/>
                          <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.05} />
                      <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 900 }} 
                        dy={15}
                      />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 900 }} />
                      <Tooltip 
                        contentStyle={{ 
                          borderRadius: '24px', 
                          border: 'none', 
                          backgroundColor: '#0f172a', 
                          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
                          padding: '16px 20px'
                        }}
                        itemStyle={{ color: '#f8fafc', fontWeight: 900, fontSize: '12px', textTransform: 'capitalize', letterSpacing: '0.1em' }}
                        labelStyle={{ color: '#94a3b8', fontWeight: 900, fontSize: '10px', textTransform: 'capitalize', letterSpacing: '0.2em', marginBottom: '8px' }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="collected" 
                        stroke="#f97316" 
                        strokeWidth={4} 
                        fillOpacity={1} 
                        fill="url(#velocityGradient)" 
                        animationDuration={2000}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {collectionsSubTab === 'quickpay' && (
            <div className="max-w-2xl mx-auto">
              <div className="bg-slate-900 dark:bg-slate-900 rounded-3xl border border-slate-800 shadow-2xl p-10 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-orange-600/10 rounded-full -mr-32 -mt-32 transition-transform duration-1000 group-hover:scale-110"></div>
                
                <div className="relative z-10">
                  <div className="flex items-center gap-5 mb-10">
                    <div className="w-14 h-14 bg-orange-600 rounded-xl flex items-center justify-center text-white shadow-xl shadow-orange-900/50">
                      <Smartphone size={28} strokeWidth={2.5} />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-white tracking-tight leading-none">Quick Pay</h3>
                      <p className="text-xs font-medium text-slate-400 mt-1">Collect fees instantly via M-Pesa</p>
                    </div>
                  </div>

                  <form className="space-y-8" onSubmit={handleExecutePayment}>
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-400 capitalize tracking-widest ml-1">Learner Adm No.</label>
                      <div className="relative group">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-orange-500 transition-colors" size={18} strokeWidth={2.5} />
                        <input 
                          list="students-list"
                          type="text" 
                          value={paymentAdmNo}
                          onChange={(e) => setPaymentAdmNo(e.target.value.toUpperCase())}
                          placeholder="Enter Admission Number" 
                          className="w-full pl-14 pr-6 py-5 bg-slate-800 border border-slate-700 rounded-xl text-sm font-bold text-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 shadow-inner transition-all placeholder:text-slate-600"
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
                      <label className="text-[10px] font-black text-slate-400 capitalize tracking-widest ml-1">Payment Amount (KES)</label>
                      <div className="relative group">
                        <Banknote className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-orange-500 transition-colors" size={18} strokeWidth={2.5} />
                        <input 
                          type="number" 
                          value={paymentAmount}
                          onChange={(e) => setPaymentAmount(e.target.value)}
                          placeholder="0.00" 
                          className="w-full pl-14 pr-6 py-5 bg-slate-800 border border-slate-700 rounded-xl text-sm font-bold text-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 shadow-inner transition-all placeholder:text-slate-600"
                        />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-400 capitalize tracking-widest ml-1">Payment Channel</label>
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
                        <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
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

                  <div className="mt-10 pt-10 border-t border-slate-800">
                    <h4 className="text-xs font-bold text-slate-500 mb-5">Quick SMS Templates</h4>
                    <div className="space-y-4">
                      <div className="p-5 bg-slate-800/50 rounded-xl border border-slate-800">
                        <p className="text-[10px] text-slate-400 font-bold leading-relaxed italic">
                          "Reminder: Fees for [Learner] are due soon. Paybill: [PAYBILL], Acc: [ADM]. Balance: KES [BAL]."
                        </p>
                      </div>
                      <div className="p-5 bg-slate-800/50 rounded-2xl border border-slate-800">
                        <p className="text-[10px] text-slate-400 font-bold leading-relaxed italic">
                          "Overdue Notice: Fee balance for [Learner] is KES [BAL]. Please clear to avoid service interruption."
                        </p>
                      </div>
                    </div>
                  </div>
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
                  <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 tracking-tight leading-none">Learner Fee Directory</h3>
                  <p className="text-xs font-medium text-slate-400 mt-1">Find any learner's fee record</p>
                </div>
                <div className="flex flex-wrap items-center gap-4 flex-1 justify-end">
                  <div className="relative group min-w-[200px] flex-1">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-orange-600 transition-colors" size={18} strokeWidth={2.5} />
                    <input 
                      type="text" 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search name..." 
                      className="w-full pl-14 pr-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-orange-500/20 shadow-sm transition-all outline-none"
                    />
                  </div>
                  <div className="relative group min-w-[150px]">
                    <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                      <Filter size={16} />
                    </div>
                    <select 
                      value={gradeFilter}
                      onChange={(e) => setGradeFilter(e.target.value)}
                      className="w-full pl-12 pr-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-orange-500/20 shadow-sm transition-all outline-none appearance-none cursor-pointer"
                    >
                      <option value="All">All Grades</option>
                      {Object.values(CBCGrade).map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
                  <div className="relative group min-w-[150px]">
                    <input 
                      type="text" 
                      value={admFilter}
                      onChange={(e) => setAdmFilter(e.target.value)}
                      placeholder="Adm No..." 
                      className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-orange-500/20 shadow-sm transition-all outline-none"
                    />
                  </div>
                  <button 
                    onClick={() => {
                      setSearchQuery('');
                      setGradeFilter('All');
                      setAdmFilter('');
                    }}
                    className="p-4 bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-orange-600 rounded-xl transition-all"
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
                      <th className="px-10 py-6 text-[10px] font-medium text-slate-500 tracking-[0.2em] capitalize">Learner</th>
                      <th className="px-6 py-6 text-[10px] font-medium text-slate-500 tracking-[0.2em] capitalize">Class Teacher</th>
                      <th className="px-6 py-6 text-[10px] font-medium text-slate-500 tracking-[0.2em] capitalize">Parent Contact</th>
                      <th className="px-6 py-6 text-[10px] font-medium text-slate-500 tracking-[0.2em] capitalize">Last Payment</th>
                      <th className="px-10 py-6 text-[10px] font-medium text-slate-500 tracking-[0.2em] capitalize text-right">Balance (Kes)</th>
                      <th className="px-10 py-6 text-[10px] font-medium text-slate-500 tracking-[0.2em] capitalize text-center">Actions</th>
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
                              <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 font-black text-xs group-hover:bg-orange-600 group-hover:text-white transition-all">
                                {student.name.charAt(0)}
                              </div>
                              <div>
                                <p className="font-medium text-sm text-slate-700 dark:text-slate-200 transition-colors">{student.name}</p>
                                <p className="text-[10px] font-medium text-slate-400 capitalize tracking-widest mt-0.5">{student.admissionNumber} • {student.grade}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-6">
                            <div className="space-y-1">
                              <p className="text-xs font-medium text-slate-700 dark:text-slate-200">
                                {staff.find(s => s.grade === student.grade && s.stream === student.stream)?.name || 'Not assigned'}
                              </p>
                              <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">Teacher</p>
                            </div>
                          </td>
                          <td className="px-6 py-6">
                            <div className="space-y-1">
                              <p className="text-xs font-medium text-slate-700 dark:text-slate-200">
                                {student.parentInfo.fatherName || student.parentInfo.motherName || student.parentInfo.guardianName}
                              </p>
                              <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">
                                {student.parentInfo.fatherPhone || student.parentInfo.motherPhone || student.parentInfo.guardianPhone}
                              </p>
                            </div>
                          </td>
                          <td className="px-6 py-6">
                            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                              {getLastPaymentDate(student.id)}
                            </p>
                          </td>
                          <td className="px-10 py-6 text-right">
                            <span className={`text-sm font-medium tracking-tight ${balance > 0 ? 'text-rose-500' : 'text-orange-500'}`}>
                              {balance > 0 ? balance.toLocaleString() : '0.00'}
                            </span>
                          </td>
                          <td className="px-10 py-6 text-center">
                            <div className="flex items-center justify-center gap-3">
                              <button 
                                onClick={() => setSelectedStudentProfile(student)}
                                className="p-3 bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-orange-600 dark:hover:text-orange-400 rounded-lg transition-all hover:scale-110"
                                title="View Student Profile"
                              >
                                <Search size={16} strokeWidth={2.5} />
                              </button>
                              <a 
                                href={`tel:${student.parentInfo.fatherPhone || student.parentInfo.motherPhone || student.parentInfo.guardianPhone}`}
                                className="p-3 bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-orange-600 dark:hover:text-orange-400 rounded-lg transition-all hover:scale-110"
                                title="Call Parent"
                              >
                                <Smartphone size={16} strokeWidth={2.5} />
                              </a>
                              <button 
                                onClick={() => {
                                  setSmsStudent(student);
                                  setShowSMSModal(true);
                                }}
                                className="p-3 bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-orange-600 dark:hover:text-orange-400 rounded-lg transition-all hover:scale-110"
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
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight leading-tight mb-1">Operating Expenses</h2>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400 max-w-xl">
                  Track, log, and approve all institutional expenditures for this term.
                </p>
              </div>
              <div className="flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-slate-900 rounded-full border border-slate-100 dark:border-slate-800 shadow-sm shrink-0">
                <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></div>
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Live Expense Tracking</span>
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
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">{stat.sublabel}</p>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-3">{stat.label}</h3>
                  <p className="text-sm font-bold text-black dark:text-white tracking-tight mt-auto">KES {(stat.value / 1000).toFixed(1)}K</p>
                  <div className={`mt-4 h-1 w-10 rounded-full ${stat.bar} group-hover:w-full transition-all duration-500`}></div>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
            <div className="lg:col-span-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-10">
              <div className="flex items-center justify-between mb-10">
                <h3 className="font-bold text-slate-800 dark:text-slate-100 tracking-tight text-xl">Expense Records</h3>
                <button className="flex items-center gap-2 px-6 py-3 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-[10px] font-black capitalize tracking-widest hover:bg-slate-100 dark:hover:bg-slate-700 transition-all">
                  <Filter size={14} className="text-orange-600" /> Filter
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50/50 dark:bg-slate-800/30 text-left border-b border-slate-100 dark:border-slate-800">
                      <th className="px-6 py-6 text-[10px] font-medium text-slate-500 tracking-widest capitalize">Date</th>
                      <th className="px-6 py-6 text-[10px] font-medium text-slate-500 tracking-widest capitalize">Category</th>
                      <th className="px-6 py-6 text-[10px] font-medium text-slate-500 tracking-widest capitalize">Description</th>
                      <th className="px-6 py-6 text-[10px] font-medium text-slate-500 tracking-widest capitalize text-right">Amount (KES)</th>
                      <th className="px-6 py-6 text-[10px] font-medium text-slate-500 tracking-widest capitalize text-center">Status</th>
                      <th className="px-6 py-6 text-[10px] font-medium text-slate-500 tracking-widest capitalize text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                    {expenses.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-slate-400 font-bold italic">No expenses recorded yet.</td>
                      </tr>
                    ) : (
                      expenses.map((exp, i) => (
                        <tr key={exp.id} className="hover:bg-slate-50/30 dark:hover:bg-slate-800/30 transition-colors group">
                          <td className="px-6 py-6 text-xs font-medium text-slate-500 dark:text-slate-400 tracking-wide">{new Date(exp.date).toLocaleDateString()}</td>
                          <td className="px-6 py-6 text-xs font-medium text-slate-800 dark:text-slate-200 tracking-tight">{exp.category}</td>
                          <td className="px-6 py-6 text-xs font-medium text-slate-500 dark:text-slate-400 tracking-wide">{exp.description}</td>
                          <td className="px-6 py-6 text-sm font-medium text-slate-800 dark:text-slate-200 text-right tracking-tight">{exp.amount.toLocaleString()}</td>
                          <td className="px-6 py-6 text-center">
                            <span className={`px-4 py-1.5 rounded-full text-[10px] font-medium tracking-widest capitalize ${
                              exp.status === 'Approved' ? 'bg-orange-50 text-orange-600' : 
                              exp.status === 'Rejected' ? 'bg-rose-50 text-rose-600' :
                              'bg-amber-50 text-amber-600'
                            }`}>
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
                                className="p-2 bg-slate-50 text-slate-400 hover:text-rose-600 rounded-lg transition-all"
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
                  <h3 className="text-xl font-black text-slate-800 dark:text-slate-100 tracking-tight leading-tight">Log Expense</h3>
                  <p className="text-[10px] font-black text-slate-400 tracking-widest capitalize mt-1">Submit for approval</p>
                </div>
              </div>
              <form className="space-y-6" onSubmit={handleSaveExpense}>
                <div className="space-y-2">
                  <div className="flex justify-between items-center px-1">
                    <label className="text-[11px] font-black text-slate-500 tracking-widest capitalize">Category</label>
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
                  <label className="text-[11px] font-black text-slate-500 tracking-widest capitalize px-1">Description</label>
                  <input name="description" required placeholder="Expense details..." className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-orange-500/20 transition-all" />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-slate-500 tracking-widest capitalize px-1">Amount (KES)</label>
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
            <div className="absolute inset-0 bg-orange-500/20 blur-3xl rounded-full animate-pulse"></div>
            <div className="relative bg-slate-900 p-8 rounded-[2.5rem] border border-slate-800 shadow-2xl">
              <ShieldCheck size={64} className="text-orange-500" strokeWidth={1.5} />
            </div>
          </div>
          <div className="text-center max-w-lg">
            <h3 className="text-3xl font-bold text-slate-800 dark:text-white tracking-tight mb-4">KRA eTIMS</h3>
            <p className="text-slate-500 dark:text-slate-400 font-medium mb-8 leading-relaxed">
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
                <span className="text-xs font-black text-orange-600 tracking-widest uppercase">CU Number Tracking</span>
              </div>
            </div>
            <div className="mt-12 p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-700">
               <p className="text-[10px] font-black text-slate-400 tracking-[0.2em] uppercase mb-4">Estimated Rollout</p>
               <div className="flex items-center justify-center gap-2">
                 <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></div>
                 <span className="text-lg font-black text-slate-700 dark:text-slate-200">Q2 2026</span>
               </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'analytics' && (
        <div className="space-y-10 animate-in fade-in duration-700">
          {/* Hero Banner */}
          <div className="bg-gradient-to-br from-orange-50 via-slate-50 to-orange-100 dark:from-slate-800 dark:to-slate-900 rounded-[2rem] p-8 shadow-sm border border-orange-200/60 dark:border-slate-700 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/5 rounded-full blur-3xl -mr-32 -mt-32 group-hover:bg-orange-500/10 transition-all duration-1000"></div>
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight leading-tight mb-1">Term Overview</h2>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400 max-w-xl">
                  A clear summary of how the school is doing financially this term.
                </p>
              </div>
              <div className="flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-slate-900 rounded-full border border-slate-100 dark:border-slate-800 shadow-sm">
                <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></div>
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Finances are stable</span>
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
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">{stat.sublabel}</p>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-3">{stat.label}</h3>
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
              <div className="absolute top-0 right-0 w-24 h-24 bg-orange-100/40 rounded-full blur-2xl -mr-10 -mt-10"></div>
              <div className="relative z-10">
                <div className="bg-slate-50/80 dark:bg-slate-800/80 p-4 pb-3 border-b border-slate-200/60 dark:border-slate-700 flex items-center gap-3 -mx-6 -mt-6 mb-5 px-6">
                  <Activity size={16} className="text-orange-500" />
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Term 1 Collection Target</p>
                </div>
                <p className="text-lg font-black text-black dark:text-white tracking-tight mb-2">KES {(feeTarget / 1000000).toFixed(1)}M</p>
                <p className="text-xs font-medium text-slate-500 mb-6">Target set for all learner fees this term</p>
                <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full bg-orange-500 rounded-full transition-all duration-1000" style={{ width: `${collectionRate}%` }}></div>
                </div>
                <div className="flex justify-between items-center mt-3">
                  <p className="text-xs font-bold text-orange-600">{collectionRate}% collected</p>
                  <p className="text-xs font-bold text-slate-400">KES {(totalCollected / 1000000).toFixed(1)}M raised</p>
                </div>
              </div>
            </div>

            {/* School Financial Health */}
            <div className="group relative bg-gradient-to-br from-orange-50/50 via-white to-orange-100/20 dark:from-slate-800 dark:to-slate-900 rounded-[2rem] border border-orange-200/60 dark:border-slate-700 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden p-6 flex flex-col">
              <div className="absolute top-0 right-0 w-24 h-24 bg-orange-100/40 rounded-full blur-2xl -mr-10 -mt-10"></div>
              <div className="relative z-10">
                <div className="bg-slate-50/80 dark:bg-slate-800/80 p-4 pb-3 border-b border-slate-200/60 dark:border-slate-700 flex items-center gap-3 -mx-6 -mt-6 mb-5 px-6">
                  <Activity size={16} className={collectionRate > 80 ? 'text-orange-500' : 'text-amber-500'} />
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Financial Health</p>
                </div>
                <div className="flex items-center gap-5">
                  <div className={`w-20 h-20 rounded-[1.5rem] border-4 flex items-center justify-center flex-shrink-0 ${collectionRate > 80 ? 'border-orange-400 bg-orange-50 dark:bg-orange-900/20' : 'border-amber-400 bg-amber-50 dark:bg-amber-900/20'}`}>
                    <span className={`text-2xl font-black ${collectionRate > 80 ? 'text-orange-600' : 'text-amber-600'}`}>{collectionRate}%</span>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-slate-800 dark:text-white">{collectionRate > 80 ? 'Excellent' : 'Moderate'}</p>
                    <p className="text-xs font-medium text-slate-500 mt-1">{collectionRate > 80 ? 'The school is collecting fees well.' : 'Collection is at a moderate pace.'}</p>
                    <span className={`mt-2 inline-block text-[10px] font-bold px-3 py-1 rounded-full ${collectionRate > 80 ? 'bg-orange-50 text-orange-600' : 'bg-amber-50 text-amber-600'}`}>
                      {collectionRate > 80 ? 'On Track' : 'Needs Attention'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Outstanding Fees */}
            <div className="group relative bg-gradient-to-br from-orange-50/50 via-white to-orange-100/20 dark:from-slate-800 dark:to-slate-900 rounded-[2rem] border border-orange-200/60 dark:border-slate-700 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden p-6 flex flex-col">
              <div className="absolute top-0 right-0 w-24 h-24 bg-rose-100/40 rounded-full blur-2xl -mr-10 -mt-10"></div>
              <div className="relative z-10">
                <div className="bg-slate-50/80 dark:bg-slate-800/80 p-4 pb-3 border-b border-slate-200/60 dark:border-slate-700 flex items-center gap-3 -mx-6 -mt-6 mb-5 px-6">
                  <ArrowDownRight size={16} className="text-rose-500" />
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Fees Not Yet Paid</p>
                </div>
                <p className="text-lg font-black text-black dark:text-white tracking-tight mb-2">KES {(totalArrears / 1000000).toFixed(1)}M</p>
                <p className="text-xs font-medium text-slate-500 mb-6">Amount still owed by learners this term</p>
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
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Fee Collection by Term</p>
                </div>
                <p className="text-xs font-medium text-slate-400 hidden sm:block">Year-on-year comparison</p>
              </div>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={historicalData} margin={{ top: 10, right: 10, left: 20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorCollected" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f97316" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.05} />
                    <XAxis dataKey="term" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} dy={15} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} tickFormatter={(val) => `${val / 1000000}M`} />
                    <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', backgroundColor: '#0f172a', padding: '14px', boxShadow: '0 20px 40px -12px rgba(0,0,0,0.5)' }} itemStyle={{ color: '#f8fafc', fontSize: '12px', fontWeight: '700' }} labelStyle={{ color: '#94a3b8', marginBottom: '6px', fontWeight: '700', fontSize: '11px' }} formatter={(value: number | undefined) => value !== undefined ? `KES ${value.toLocaleString()}` : 'N/A'} />
                    <Area type="monotone" dataKey="target" stroke="#94a3b8" strokeWidth={2} fillOpacity={0.05} fill="#94a3b8" name="Target" strokeDasharray="5 5" />
                    <Area type="monotone" dataKey="collected" stroke="#f97316" strokeWidth={3} fillOpacity={1} fill="url(#colorCollected)" name="Collected" animationDuration={2000} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="group relative bg-gradient-to-br from-orange-50/50 via-white to-orange-100/20 dark:from-slate-800 dark:to-slate-900 rounded-[2rem] border border-orange-200/60 dark:border-slate-700 shadow-sm overflow-hidden p-6 flex flex-col">
              <div className="bg-slate-50/80 dark:bg-slate-800/80 p-4 pb-3 border-b border-slate-200/60 dark:border-slate-700 flex items-center gap-3 -mx-6 -mt-6 mb-6 px-6">
                <FileText size={16} className="text-rose-500" />
                <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Highest Expenses</p>
              </div>
              <div className="space-y-3">
                {topExpenses.length === 0 ? (
                  <div className="text-center py-10">
                    <div className="w-14 h-14 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-3">
                      <FileText size={22} className="text-slate-300 dark:text-slate-600" />
                    </div>
                    <p className="text-xs font-bold text-slate-400">No expenses recorded yet</p>
                  </div>
                ) : (
                  topExpenses.map((expense, idx) => (
                    <div key={expense.id || idx} className="flex items-center gap-3 p-4 bg-white/70 dark:bg-slate-800/50 rounded-[1.5rem] border border-slate-100 dark:border-slate-700/50 hover:border-slate-200 dark:hover:border-slate-600 hover:shadow-sm transition-all duration-200">
                      <div className="w-9 h-9 bg-rose-50 dark:bg-rose-900/20 rounded-xl flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-black text-rose-500">{idx + 1}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">{expense.category}</p>
                        <p className="text-xs font-medium text-slate-400 truncate">{expense.description}</p>
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
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white">Fee Configuration</h3>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Define grade-specific billable items</p>
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
                    <th className="px-6 py-4 text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider text-left">Grade Focus</th>
                    <th className="px-6 py-4 text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider text-left">Category</th>
                    <th className="px-6 py-4 text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider text-left">Applies To</th>
                    <th className="px-6 py-4 text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">Amount (KES)</th>
                    <th className="px-6 py-4 text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center">Actions</th>
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
                          <p className="text-xs font-bold text-slate-400">No fee structures defined yet.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    feeStructures.map((fee) => (
                      <tr key={fee.id} className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-all duration-300">
                        <td className="px-6 py-5 text-sm font-medium text-slate-700 dark:text-slate-200">{fee.grade}</td>
                        <td className="px-6 py-5">
                          <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg text-[10px] font-medium uppercase tracking-wider">
                            {fee.category}
                          </span>
                        </td>
                        <td className="px-6 py-5 text-[11px] font-medium text-slate-500 capitalize">{fee.appliesTo}</td>
                        <td className="px-6 py-5 text-sm font-medium text-slate-800 dark:text-slate-100 text-right">{fee.amount.toLocaleString()}</td>
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
                              className="p-2 text-slate-400 hover:text-orange-600 dark:hover:text-orange-400 transition-all"
                            >
                              <Search size={16} />
                            </button>
                            <button 
                              onClick={() => handleDeleteFee(fee.id)}
                              className="p-2 text-slate-400 hover:text-rose-600 transition-all"
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
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white">Staff Audit Profile</h3>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Institution Finance Officer Identification</p>
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
                <h4 className="font-bold text-slate-800 dark:text-white mb-1">Upload Identification Photo</h4>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-4">A clear professional photo for financial transaction logging.</p>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Accepted: JPG, PNG (Max 2MB)</p>
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
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white">Collection Targets</h3>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Set and track revenue milestones</p>
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
                    <th className="px-6 py-4 text-[10px] font-medium text-slate-500 tracking-widest uppercase text-left">Period</th>
                    <th className="px-6 py-4 text-[10px] font-medium text-slate-500 tracking-widest uppercase text-left">Grade / Stream</th>
                    <th className="px-6 py-4 text-[10px] font-medium text-slate-500 tracking-widest uppercase text-right">Target Amount</th>
                    <th className="px-6 py-4 text-[10px] font-medium text-slate-500 tracking-widest uppercase text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                  {feeTargets.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-slate-400 text-xs font-bold">No targets defined yet.</td>
                    </tr>
                  ) : (
                    feeTargets.map((target) => (
                      <tr key={target.id} className="group hover:bg-slate-50/50 transition-all">
                        <td className="px-6 py-5">
                          <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{target.term || 'All Terms'}</p>
                          <p className="text-[10px] text-slate-400 font-medium uppercase">{target.month || 'Universal'}</p>
                        </td>
                        <td className="px-6 py-5">
                          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{target.grade || 'All Grades'}</p>
                          <p className="text-[10px] text-slate-500 font-medium">{target.stream || 'All Streams'}</p>
                        </td>
                        <td className="px-6 py-5 text-sm font-medium text-slate-800 dark:text-slate-100 text-right">KES {target.amount.toLocaleString()}</td>
                        <td className="px-6 py-5 text-center">
                          <button onClick={() => handleDeleteTarget(target.id)} className="p-2 text-slate-400 hover:text-rose-600 transition-all">
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
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white">Fee Target</h3>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Set revenue milestones for tracking</p>
                </div>
              </div>
              <button 
                onClick={() => setShowTargetModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-all"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSaveTarget} className="p-8 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider px-0.5">Term Period</label>
                  <select name="term" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all cursor-pointer">
                    <option value="">All Terms</option>
                    <option value="Term 1">Term 1</option>
                    <option value="Term 2">Term 2</option>
                    <option value="Term 3">Term 3</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider px-0.5">Specific Month</label>
                  <select name="month" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all cursor-pointer">
                    <option value="">Full Term</option>
                    {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider px-0.5">Grade Level</label>
                  <select name="grade" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all cursor-pointer">
                    <option value="">All Grades</option>
                    {Object.values(CBCGrade).map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider px-0.5">Stream</label>
                  <select name="stream" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all cursor-pointer">
                    <option value="">All Streams</option>
                    <option value="North">North</option>
                    <option value="South">South</option>
                    <option value="East">East</option>
                    <option value="West">West</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider px-0.5">Target Amount (KES)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">KES</span>
                  <input name="amount" type="number" required placeholder="0.00" className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all" />
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
                  <h3 className="text-xl font-black text-slate-800 dark:text-white tracking-tight">Fee Reminder</h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Notify Parent via SMS</p>
                </div>
              </div>
              <button 
                onClick={() => setShowSMSModal(false)}
                className="p-3 bg-white dark:bg-slate-800 text-slate-400 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-600 dark:hover:text-slate-200 transition-all border border-slate-100 dark:border-slate-700 shadow-sm"
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
                  <p className="text-sm font-black text-slate-800 dark:text-slate-100 leading-tight">{smsStudent.name}</p>
                  <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest mt-1">Arrears: KES {smsStudent.balance.toLocaleString()}</p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1">Payment Deadline</label>
                  <input 
                    type="date"
                    value={smsDeadline}
                    onChange={(e) => setSmsDeadline(e.target.value)}
                    className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-orange-500/20 outline-none transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1">Payment Instructions</label>
                  <input 
                    type="text"
                    value={smsInstructions}
                    onChange={(e) => setSmsInstructions(e.target.value)}
                    placeholder="e.g. Paybill [PAYBILL], Acc: [ADM]"
                    className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-orange-500/20 outline-none transition-all"
                  />
                </div>

                <div className="p-6 bg-slate-900 rounded-[2rem] border border-slate-800 space-y-3 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-orange-600/5 rounded-full blur-2xl -mr-12 -mt-12 group-hover:bg-orange-600/10 transition-all duration-700"></div>
                  <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest flex items-center gap-2">
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
                className="w-full py-5 bg-orange-600 hover:bg-orange-700 text-white rounded-[1.5rem] font-black text-[11px] uppercase tracking-[0.2em] shadow-xl shadow-orange-200 dark:shadow-none transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
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
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white">{editingFee ? 'Edit Fee Item' : 'Add Fee Item'}</h3>
                  <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Configure institutional fee components</p>
                </div>
              </div>
              <button 
                onClick={() => setShowFeeModal(false)} 
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-all"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveFeeStructure} className="p-8 space-y-5">
              {/* Grade Selection */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center px-0.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Grade Focus</label>
                  <button type="button" onClick={() => setIsCustomGrade(!isCustomGrade)} className="text-[10px] font-bold text-orange-600 hover:text-orange-700 tracking-wider capitalize transition-colors">
                    {isCustomGrade ? 'Select Existing' : 'Add Custom'}
                  </button>
                </div>
                {isCustomGrade ? (
                  <input name="customGrade" type="text" defaultValue={editingFee?.grade} placeholder="Enter custom grade (e.g Grade 9)" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all" required />
                ) : (
                  <select name="grade" defaultValue={editingFee?.grade || 'All'} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all appearance-none cursor-pointer">
                    <option value="All">All Grades (Universal)</option>
                    {Object.values(CBCGrade).map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                )}
              </div>

              {/* Category Selection */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center px-0.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Fee Category</label>
                  <button type="button" onClick={() => setIsCustomCategory(!isCustomCategory)} className="text-[10px] font-bold text-orange-600 hover:text-orange-700 tracking-wider capitalize transition-colors">
                    {isCustomCategory ? 'Select Existing' : 'Add Custom'}
                  </button>
                </div>
                {isCustomCategory ? (
                  <input name="customCategory" type="text" defaultValue={editingFee?.category} placeholder="Enter custom category" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all" required />
                ) : (
                  <select name="category" defaultValue={editingFee?.category} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all appearance-none cursor-pointer">
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
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider px-0.5">Billable Amount (KES)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">KES</span>
                  <input name="amount" type="number" defaultValue={editingFee?.amount} required placeholder="0.00" className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all" />
                </div>
              </div>

              {/* Applicability Selection */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center px-0.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Applicability</label>
                  <button type="button" onClick={() => setIsCustomAppliesTo(!isCustomAppliesTo)} className="text-[10px] font-bold text-orange-600 hover:text-orange-700 tracking-wider capitalize transition-colors">
                    {isCustomAppliesTo ? 'Select Existing' : 'Add Custom'}
                  </button>
                </div>
                {isCustomAppliesTo ? (
                  <input name="customAppliesTo" type="text" defaultValue={editingFee?.appliesTo} placeholder="Enter custom group (e.g New Students)" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all" required />
                ) : (
                  <select name="appliesTo" defaultValue={editingFee?.appliesTo || 'All'} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all appearance-none cursor-pointer">
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
          <div className="bg-white dark:bg-slate-900 w-full max-w-3xl rounded-[2.5rem] shadow-2xl overflow-hidden relative animate-in zoom-in-95 duration-500 max-h-[90vh] flex flex-col border border-slate-100 dark:border-slate-800">
            <div className="p-8 md:p-10 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 rounded-[1.5rem] bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center font-black text-2xl shadow-sm border border-blue-200 dark:border-blue-800/50">
                  {selectedStudentProfile.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">{selectedStudentProfile.name}</h3>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg text-[10px] font-black capitalize tracking-widest">
                      {selectedStudentProfile.admissionNumber}
                    </span>
                    <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg text-[10px] font-black capitalize tracking-widest">
                      {selectedStudentProfile.grade}
                    </span>
                  </div>
                </div>
              </div>
              <button onClick={() => setSelectedStudentProfile(null)} className="p-3 bg-white dark:bg-slate-800 text-slate-400 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-600 dark:hover:text-slate-200 transition-all shadow-sm border border-slate-100 dark:border-slate-700">
                <X size={18} strokeWidth={2.5} />
              </button>
            </div>
            <div className="p-8 md:p-10 overflow-y-auto custom-scrollbar flex-1 space-y-10">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-8 bg-slate-50 dark:bg-slate-800/50 rounded-[2rem] border border-slate-100 dark:border-slate-700/50 hover:shadow-md transition-all duration-300">
                  <p className="text-[10px] font-black text-slate-400 tracking-widest capitalize mb-3">Total Billed</p>
                  <p className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">KES {((selectedStudentProfile.balance || 0) + payments.filter(p => p.studentId === selectedStudentProfile.id).reduce((sum, p) => sum + p.amount, 0)).toLocaleString()}</p>
                </div>
                <div className="p-8 bg-orange-50 dark:bg-orange-900/20 rounded-[2rem] border border-orange-100 dark:border-orange-800/50 hover:shadow-md transition-all duration-300">
                  <p className="text-[10px] font-black text-orange-600 dark:text-orange-400 tracking-widest capitalize mb-3">Total Paid</p>
                  <p className="text-2xl font-black text-orange-600 dark:text-orange-400 tracking-tight">KES {payments.filter(p => p.studentId === selectedStudentProfile.id).reduce((sum, p) => sum + p.amount, 0).toLocaleString()}</p>
                </div>
                <div className="p-8 bg-rose-50 dark:bg-rose-900/20 rounded-[2rem] border border-rose-100 dark:border-rose-800/50 hover:shadow-md transition-all duration-300">
                  <p className="text-[10px] font-black text-rose-600 dark:text-rose-400 tracking-widest capitalize mb-3">Balance</p>
                  <p className="text-2xl font-black text-rose-600 dark:text-rose-400 tracking-tight">KES {(selectedStudentProfile.balance || 0).toLocaleString()}</p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h4 className="text-lg font-black text-slate-800 dark:text-slate-100 tracking-tight">Transaction History</h4>
                  <span className="px-4 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[10px] font-black capitalize tracking-widest rounded-full">
                    {payments.filter(p => p.studentId === selectedStudentProfile.id).length} Records
                  </span>
                </div>
                <div className="border border-slate-100 dark:border-slate-800 rounded-[2rem] overflow-hidden bg-white dark:bg-slate-900 shadow-sm">
                  <table className="w-full">
                    <thead className="bg-slate-50/50 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-800">
                      <tr>
                        <th className="px-6 py-5 text-left text-[10px] font-medium text-slate-500 capitalize tracking-widest">Date</th>
                        <th className="px-6 py-5 text-left text-[10px] font-medium text-slate-500 capitalize tracking-widest">Ref</th>
                        <th className="px-6 py-5 text-left text-[10px] font-medium text-slate-500 capitalize tracking-widest">Method</th>
                        <th className="px-6 py-5 text-left text-[10px] font-medium text-slate-500 capitalize tracking-widest">eTIMS</th>
                        <th className="px-6 py-5 text-right text-[10px] font-medium text-slate-500 capitalize tracking-widest">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                      {payments.filter(p => p.studentId === selectedStudentProfile.id).length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-12 text-center">
                            <p className="text-[11px] font-medium text-slate-400 capitalize tracking-widest">No transactions found.</p>
                          </td>
                        </tr>
                      ) : (
                        payments.filter(p => p.studentId === selectedStudentProfile.id).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(p => (
                          <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                            <td className="px-6 py-5 text-xs font-medium text-slate-500 dark:text-slate-400">{new Date(p.date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</td>
                            <td className="px-4 py-3 text-xs font-mono text-slate-400">{p.transactionCode}</td>
                            <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">{p.method}</td>
                            <td className="px-4 py-3 text-xs">
                              <span className={`px-2 py-0.5 rounded text-[8px] font-medium tracking-widest uppercase ${
                                p.etimsStatus === 'Success' ? 'bg-orange-50 text-orange-600' : 
                                p.etimsStatus === 'Failed' ? 'bg-rose-50 text-rose-600' : 
                                'bg-amber-50 text-amber-600'
                              }`}>
                                {p.etimsStatus || 'N/A'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-xs font-medium text-slate-800 dark:text-slate-200 text-right">{p.amount.toLocaleString()}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            <div className="p-8 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-end gap-3">
               <button 
                onClick={() => toast.success('Statement sent to parent')}
                className="px-6 py-2.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 rounded-[0.2625rem] text-xs font-bold shadow-sm"
              >
                Send to Parent
              </button>
              <button 
                onClick={() => window.print()}
                className="px-6 py-2.5 bg-orange-600 text-white rounded-[0.2625rem] text-xs font-bold shadow-lg shadow-orange-200"
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
              className="absolute top-8 right-8 p-3 bg-slate-50 dark:bg-slate-800 text-slate-400 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-600 dark:hover:text-slate-200 transition-all shadow-sm border border-slate-100 dark:border-slate-700"
            >
              <X size={18} strokeWidth={2.5} />
            </button>

            <div ref={receiptRef} className="p-10 space-y-8 text-slate-800 dark:text-slate-100">
              <div className="text-center border-b border-slate-100 dark:border-slate-800 pb-8">
                <h2 className="text-2xl font-black tracking-tight">Official Institution Receipt</h2>
                <p className="text-[10px] font-black text-slate-400 tracking-widest capitalize mt-2">Finance & Operations Department</p>
                <p className="text-[10px] text-slate-500 font-bold mt-2">Nairobi, Kenya</p>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between text-[11px] font-bold">
                  <span className="text-slate-400 capitalize tracking-widest">Receipt No:</span>
                  <span className="font-black text-slate-800 dark:text-slate-200">{selectedPayment.code}</span>
                </div>
                <div className="flex justify-between text-[11px] font-bold">
                  <span className="text-slate-400 capitalize tracking-widest">Date:</span>
                  <span className="font-black text-slate-800 dark:text-slate-200">{selectedPayment.date}</span>
                </div>
                <div className="flex justify-between text-[11px] font-bold">
                  <span className="text-slate-400 capitalize tracking-widest">Learner:</span>
                  <span className="font-black text-slate-800 dark:text-slate-200">{selectedPayment.student}</span>
                </div>
                <div className="flex justify-between text-[11px] font-bold">
                  <span className="text-slate-400 capitalize tracking-widest">ADM No:</span>
                  <span className="font-black text-slate-800 dark:text-slate-200">{selectedPayment.adm}</span>
                </div>
                <div className="flex justify-between text-[11px] font-bold">
                  <span className="text-slate-400 capitalize tracking-widest">Parent:</span>
                  <span className="font-black text-slate-800 dark:text-slate-200">{selectedPayment.parentName}</span>
                </div>
                <div className="flex justify-between text-[11px] font-bold">
                  <span className="text-slate-400 capitalize tracking-widest">Method:</span>
                  <span className="font-black text-slate-800 dark:text-slate-200">{selectedPayment.method}</span>
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
                  <span className="capitalize tracking-widest text-slate-400 text-[10px]">Current Balance:</span>
                  <span className="text-rose-600 dark:text-rose-400 tracking-tight text-lg">KES {selectedPayment.balance.toLocaleString()}</span>
                </div>
              </div>

              <div className="text-center pt-4">
                <p className="text-[9px] text-slate-400 font-bold capitalize tracking-widest">This is a computer-generated receipt. No signature required.</p>
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
                  className="py-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-2xl text-[10px] font-black capitalize tracking-widest hover:bg-slate-50 dark:hover:bg-slate-700 transition-all active:scale-95"
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
                <h3 className="font-bold text-slate-900 dark:text-white text-lg">Fee Invoice</h3>
                <p className="text-xs text-slate-500">{invoiceStudent.name} • {invoiceStudent.admissionNumber}</p>
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
                  className="p-2.5 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
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
                  <h3 className="text-xl font-black text-slate-800 dark:text-white tracking-tight leading-tight">Financial Audit Control</h3>
                  <p className="text-[10px] font-black text-slate-400 tracking-widest uppercase mt-1">Adjusting: {editingStudent.name}</p>
                </div>
              </div>
              <button 
                onClick={() => setShowEditModal(false)}
                className="p-3 bg-slate-50 dark:bg-slate-800 text-slate-400 rounded-2xl hover:bg-slate-100 transition-all"
              >
                <X size={18} strokeWidth={2.5} />
              </button>
            </div>

            <form onSubmit={handleAdjustBalance} className="p-10 space-y-6">
              <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-700 space-y-2">
                <p className="text-[10px] font-black text-slate-400 tracking-widest uppercase">Current Balance</p>
                <p className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">KES {(editingStudent.balance || 0).toLocaleString()}</p>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-500 tracking-widest uppercase px-1">Adjustment Amount (KES)</label>
                <input 
                  type="number" 
                  value={adjustmentAmount}
                  onChange={(e) => setAdjustmentAmount(e.target.value)}
                  placeholder="e.g. -500 to decrease, 500 to increase" 
                  className="w-full px-8 py-5 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-[1.5rem] text-sm font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-amber-500/20 shadow-sm transition-all outline-none"
                  required
                />
                <p className="text-[10px] text-slate-400 font-medium px-1">Enter a negative number to reduce the balance (e.g. credit/discount).</p>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-500 tracking-widest uppercase px-1">Reason for Adjustment</label>
                <textarea 
                  value={adjustmentReason}
                  onChange={(e) => setAdjustmentReason(e.target.value)}
                  placeholder="Explain why this change is being made..." 
                  className="w-full px-8 py-5 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-[1.5rem] text-sm font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-amber-500/20 shadow-sm transition-all outline-none min-h-[120px] resize-none"
                  required
                ></textarea>
              </div>

              <div className="pt-4 flex flex-col gap-3">
                <button 
                  type="submit"
                  disabled={isProcessing}
                  className="w-full py-5 bg-amber-600 hover:bg-amber-700 text-white rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest shadow-xl shadow-amber-200 dark:shadow-none transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
                  Authorize Adjustment & Log to Audit Trail
                </button>
                <p className="text-[9px] text-slate-400 text-center font-bold italic">
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

