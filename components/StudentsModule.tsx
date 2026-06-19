
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Users, 
  UserPlus, 
  Search, 
  Filter, 
  MoreVertical, 
  Download, 
  X, 
  Key,
  UserCircle, 
  CheckCircle2,
  Home,
  Book,
  GraduationCap,
  MapPin,
  Mail,
  Phone,
  Pencil,
  Trash2,
  Heart,
  ShieldAlert,
  UserCheck,
  MessageSquare,
  Shield,
  ShieldCheck,
  Smartphone,
  Banknote,
  Loader2,
  Eye,
  Printer,
  Receipt,
  SearchCode,
  AlertCircle,
  Plus,
  Activity,
  Check,
  ArrowRight,
  Package,
  FileText,
  ArrowLeft
} from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import { motion, AnimatePresence } from 'motion/react';
import { Student, CBCGrade, BoardingType, StudentStatus } from '../types';
import InvoiceReceipt from './InvoiceReceipt';
import { CBC_GRADES } from '../constants';
import toast from 'react-hot-toast';
import { db, auth } from '../src/firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, getDoc, onSnapshot, query, where, increment } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

interface StudentsModuleProps {
  setActiveTab: (tab: string) => void;
  setEditingStudentId?: (id: string | null) => void;
  role: 'ADMIN' | 'DIRECTOR' | 'TEACHER' | 'FINANCE' | 'PARENT' | 'SUPER_ADMIN' | 'PLATFORM_ADMIN';
  isDarkMode?: boolean;
  initialTab?: 'directory' | 'classrooms';
  moduleTab?: 'directory' | 'classrooms';
  setModuleTab?: (tab: 'directory' | 'classrooms') => void;
  isMockAuth?: boolean;
}

const StudentsModule: React.FC<StudentsModuleProps> = ({ 
  setActiveTab, 
  setEditingStudentId, 
  initialTab, 
  role, 
  isDarkMode, 
  moduleTab: propModuleTab, 
  setModuleTab: propSetModuleTab,
  isMockAuth = false
}) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterType, setFilterType] = useState<'All' | BoardingType>('All');
  const [filterGrade, setFilterGrade] = useState<'All' | CBCGrade>('All');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [localModuleTab, setLocalModuleTab] = useState<'directory' | 'classrooms'>(initialTab || 'directory');
  const moduleTab = propModuleTab || localModuleTab;
  const setModuleTab = propSetModuleTab || setLocalModuleTab;

  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [teacherData, setTeacherData] = useState<any>(null);
  const [enteredClassCode, setEnteredClassCode] = useState('');
  const [isCodeVerified, setIsCodeVerified] = useState(false);
  const [lockedFields, setLockedFields] = useState<Set<string>>(new Set());
  
  // Classrooms State
  const [selectedClassroomGrade, setSelectedClassroomGrade] = useState<CBCGrade>(CBCGrade.G1);
  const [classTeacher, setClassTeacher] = useState<any>(null);
  const [textbooks, setTextbooks] = useState<any[]>([]);
  const [classFunds, setClassFunds] = useState<number>(0);
  const [classroomInventory, setClassroomInventory] = useState<any[]>([]);
  const [isClassroomLoading, setIsClassroomLoading] = useState(false);
  const [classNotes, setClassNotes] = useState('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [showInventoryModal, setShowInventoryModal] = useState(false);
  const [inventoryForm, setInventoryForm] = useState({ name: '', quantity: 1, condition: 'New' });

  // Advanced Allocation State
  const [showAllocationModal, setShowAllocationModal] = useState(false);
  const [allocationType, setAllocationType] = useState<'Material' | 'Fund' | 'Physical'>('Material');
  const [allocationStep, setAllocationStep] = useState(1);
  const [allocationData, setAllocationData] = useState<any>({
    itemId: '',
    mode: 'Single',
    studentIds: [],
    amount: 0,
    category: '',
    description: '',
    quantity: 1,
    grade: selectedClassroomGrade,
    stream: ''
  });
  const [draggedStudent, setDraggedStudent] = useState<Student | null>(null);
  const [allInventory, setAllInventory] = useState<any[]>([]);

  // Invoice State
  const [showInvoice, setShowInvoice] = useState(false);
  const [invoiceStudent, setInvoiceStudent] = useState<Student | null>(null);
  const [invoiceFeeStructures, setInvoiceFeeStructures] = useState<any[]>([]);
  const [invoicePayments, setInvoicePayments] = useState<any[]>([]);
  const [invoiceSchoolName, setInvoiceSchoolName] = useState('Institution');
  const [invoiceSchoolLogo, setInvoiceSchoolLogo] = useState<string | null>(null);
  const invoiceRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isMockAuth) {
      const loadMockData = async () => {
        const { MOCK_STUDENTS } = await import('../demoData');
        setStudents(MOCK_STUDENTS);
        setIsLoading(false);
        setCurrentUserRole(role);
      };
      loadMockData();
      return;
    }

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setStudents([]);
        setIsLoading(false);
        return;
      }

      let schoolId = user.uid;
      const staffDocRef = doc(db, 'staff', user.uid);
      const staffDocSnap = await getDoc(staffDocRef);
      if (staffDocSnap.exists()) {
        const sData = staffDocSnap.data();
        schoolId = sData.schoolId;
        setTeacherData(sData);
        setCurrentUserRole(sData.role);
      } else {
        // Fallback for Admin
        setCurrentUserRole('ADMIN');
      }

      const q = query(collection(db, 'students'), where('schoolId', '==', schoolId));
      const unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
        const studentData: Student[] = [];
        snapshot.forEach((doc) => {
          studentData.push({ id: doc.id, ...doc.data() } as Student);
        });
        setStudents(studentData);
        setIsLoading(false);
      }, (error) => {
        console.error("Error fetching students: ", error);
        toast.error("Failed to load students.");
        setIsLoading(false);
      });

      return () => unsubscribeSnapshot();
    });

    return () => unsubscribeAuth();
  }, [isMockAuth]);

  // Fetch Class Teacher and classroom data
  useEffect(() => {
    if (moduleTab !== 'classrooms') return;

    const fetchClassroomData = async () => {
      setIsClassroomLoading(true);
      try {
        const user = auth.currentUser;
        if (!user) return;

        let schoolId = user.uid;
        const staffDocRef = doc(db, 'staff', user.uid);
        const staffDocSnap = await getDoc(staffDocRef);
        if (staffDocSnap.exists()) {
          schoolId = staffDocSnap.data().schoolId;
        }

        // 1. Fetch Class Teacher
        const staffRef = collection(db, 'staff');
        const teacherQuery = query(
          staffRef, 
          where('schoolId', '==', schoolId), 
          where('classTeacherOf', '==', selectedClassroomGrade)
        );
        const teacherSnap = await getDocs(teacherQuery);
        if (!teacherSnap.empty) {
          const tData = teacherSnap.docs[0].data();
          setClassTeacher({ id: teacherSnap.docs[0].id, ...tData });
          setClassNotes(tData.classAnnouncement || '');
        } else {
          // Check if it's assigned in the "grade" field instead (some legacy data might use this)
          const teacherQueryAlt = query(
            staffRef, 
            where('schoolId', '==', schoolId), 
            where('grade', '==', selectedClassroomGrade),
            where('role', '==', 'TEACHER')
          );
          const teacherSnapAlt = await getDocs(teacherQueryAlt);
          if (!teacherSnapAlt.empty) {
             const tDataAlt = teacherSnapAlt.docs[0].data();
             setClassTeacher({ id: teacherSnapAlt.docs[0].id, ...tDataAlt });
             setClassNotes(tDataAlt.classAnnouncement || '');
          } else {
             setClassTeacher(null);
             setClassNotes('');
          }
        }

        // 2. Fetch Textbooks
        setTextbooks([]);

        // 3. Fetch Funds
        setClassFunds(0);

        // 4. Fetch Inventory from Firestore
        const invRef = collection(db, 'classroomInventory');
        const invQuery = query(invRef, where('schoolId', '==', schoolId), where('grade', '==', selectedClassroomGrade));
        const invSnap = await getDocs(invQuery);
        if (!invSnap.empty) {
          setClassroomInventory(invSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        } else {
          setClassroomInventory([]);
        }

        // 5. Fetch All Inventory for selectors
        const allInvQuery = query(collection(db, 'inventory'), where('schoolId', '==', schoolId));
        const allInvSnap = await getDocs(allInvQuery);
        setAllInventory(allInvSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

        // 6. Check for Admin Locks in Allocations
        const qAllocations = query(
          collection(db, 'allocations'),
          where('schoolId', '==', schoolId),
          where('grade', '==', selectedClassroomGrade)
        );
        const allocationsSnap = await getDocs(qAllocations);
        const newLockedFields = new Set<string>();
        let adminFunds = 0;
        
        allocationsSnap.forEach(doc => {
          const data = doc.data();
          if (data.createdByRole === 'ADMIN') {
            if (data.type === 'Fund') {
              newLockedFields.add('Fund');
              adminFunds += data.amount || 0;
            }
            if (data.type === 'Material') newLockedFields.add(`Material:${data.itemId}`);
            if (data.type === 'Physical') newLockedFields.add(`Physical:${data.itemId}`);
          }
        });
        
        if (newLockedFields.has('Fund')) {
          setClassFunds(adminFunds);
        }
        setLockedFields(newLockedFields);

      } catch (error) {
        console.error("Error fetching classroom data:", error);
      } finally {
        setIsClassroomLoading(false);
      }
    };

    fetchClassroomData();
  }, [selectedClassroomGrade, moduleTab]);

  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const matchesFilter = filterType === 'All' || s.boardingType === filterType;
      const matchesGrade = filterGrade === 'All' || s.grade === filterGrade;
      const matchesSearch = (s.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                           (s.admissionNumber || '').toLowerCase().includes(searchQuery.toLowerCase());
      return matchesFilter && matchesGrade && matchesSearch;
    });
  }, [students, filterType, filterGrade, searchQuery]);

  const [showStudentDetail, setShowStudentDetail] = useState(false);
  const [selectedStudentDetail, setSelectedStudentDetail] = useState<any>(null);

  const handleOpenRegister = () => {
    setActiveTab('register-learner');
  };

  const handleOpenEdit = (student: any) => {
    if (setEditingStudentId) {
      setEditingStudentId(student.id);
      setActiveTab('edit-learner');
    }
  };

  const handleOpenDetail = (student: any) => {
    setSelectedStudentDetail(student);
    setShowStudentDetail(true);
  };

  const handleOpenInvoice = async (student: Student) => {
    setInvoiceStudent(student);
    setShowInvoice(true);
    
    try {
      const user = auth.currentUser;
      if (!user) return;

      let schoolId = user.uid;
      const staffDocRef = doc(db, 'staff', user.uid);
      const staffDocSnap = await getDoc(staffDocRef);
      if (staffDocSnap.exists()) {
        schoolId = staffDocSnap.data().schoolId;
      }
      
      const schoolDoc = await getDoc(doc(db, 'schools', schoolId));
      if (schoolDoc.exists()) {
        const sData = schoolDoc.data();
        setInvoiceSchoolName(sData.schoolName || sData.name || 'BrightSoma Institution');
        if (sData.logo || sData.schoolLogo || sData.profilePhoto) {
          setInvoiceSchoolLogo(sData.logo || sData.schoolLogo || sData.profilePhoto);
        }
      } else {
        const userDoc = await getDoc(doc(db, 'users', schoolId));
        if (userDoc.exists()) {
          const uData = userDoc.data();
          setInvoiceSchoolName(uData.schoolProfile?.name || uData.schoolName || 'BrightSoma Institution');
          if (uData.schoolProfile?.logo || uData.logo) {
            setInvoiceSchoolLogo(uData.schoolProfile?.logo || uData.logo);
          }
        }
      }

      const qFees = query(collection(db, 'fee_structures'), where('schoolId', '==', schoolId));
      const feesSnap = await getDocs(qFees);
      setInvoiceFeeStructures(feesSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      const qPayments = query(collection(db, 'payments'), where('schoolId', '==', schoolId), where('adm', '==', student.admissionNumber));
      const paySnap = await getDocs(qPayments);
      setInvoicePayments(paySnap.docs.map(d => ({ id: d.id, ...d.data() })));
      
    } catch (e) {
      console.error(e);
      toast.error('Failed to load invoice data');
    }
  };

  const handleInvoicePrint = () => {
    if (!invoiceRef.current) return;
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Fee Invoice - ${invoiceStudent?.name}</title>
            <script src="https://cdn.tailwindcss.com"></script>
          </head>
          <body onload="setTimeout(() => { window.print(); window.close(); }, 500)">
            ${invoiceRef.current.innerHTML}
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };



  const [deleteModal, setDeleteModal] = useState<{isOpen: boolean, studentId: string | null, reason: string, confirmText: string}>({isOpen: false, studentId: null, reason: '', confirmText: ''});

  const handleDelete = async () => {
    if (!deleteModal.studentId) return;
    if (deleteModal.confirmText !== 'delete') {
      toast.error('Please type "delete" to confirm.');
      return;
    }
    if (!deleteModal.reason) {
      toast.error('Please provide a reason for deletion.');
      return;
    }

    try {
      const user = auth.currentUser;
      if (!user) {
        toast.error('Authentication required to delete records.');
        return;
      }

      // 1. Fetch all payments for this student to subtract from bank balance
      const paymentsQuery = query(collection(db, 'payments'), where('studentId', '==', deleteModal.studentId));
      const paymentsSnapshot = await getDocs(paymentsQuery);
      let cashToRefund = 0;
      let bankToRefund = 0;

      const paymentDeletions: Promise<void>[] = [];
      paymentsSnapshot.forEach((pDoc) => {
        const pData = pDoc.data();
        if (pData.method === 'Cash') {
          cashToRefund += pData.amount;
        } else {
          bankToRefund += pData.amount;
        }
        paymentDeletions.push(deleteDoc(doc(db, 'payments', pDoc.id)));
      });

      // 2. Update Bank Balance
      const schoolId = user.uid; // Default if not staff
      let effectiveSchoolId = schoolId;
      const staffDocRef = doc(db, 'staff', user.uid);
      const staffDocSnap = await getDoc(staffDocRef);
      if (staffDocSnap.exists()) {
        effectiveSchoolId = staffDocSnap.data().schoolId;
      }

      const bankAccountsQuery = query(collection(db, 'bank_accounts'), where('schoolId', '==', effectiveSchoolId));
      const bankAccountsSnapshot = await getDocs(bankAccountsQuery);
      
      if (!bankAccountsSnapshot.empty) {
        const bankAccountDoc = bankAccountsSnapshot.docs[0];
        await updateDoc(doc(db, 'bank_accounts', bankAccountDoc.id), {
          cashInHand: increment(-cashToRefund),
          bankBalance: increment(-bankToRefund)
        });
      }

      // 3. Delete student and payments
      await Promise.all(paymentDeletions);
      await deleteDoc(doc(db, 'students', deleteModal.studentId));
      
      toast.success('Learner record and associated financial data removed.');
      
      setDeleteModal({isOpen: false, studentId: null, reason: '', confirmText: ''});
    } catch (error) {
      console.error("Error deleting document: ", error);
      toast.error('Failed to fully remove learner record and balances.');
    }
  };



  const saveClassNotes = async () => {
    if (!classTeacher) {
      toast.error('No class teacher assigned to save notes.');
      return;
    }
    setIsSavingNotes(true);
    try {
      await updateDoc(doc(db, 'staff', classTeacher.id), {
        classAnnouncement: classNotes
      });
      toast.success('Class notes updated.');
    } catch (e) {
      toast.error('Failed to save notes.');
    } finally {
      setIsSavingNotes(false);
    }
  };

  const handleAddInventory = async () => {
    if (!inventoryForm.name) return;
    try {
      const user = auth.currentUser;
      if (!user) return;
      let schoolId = user.uid;
      const staffDocRef = doc(db, 'staff', user.uid);
      const staffDocSnap = await getDoc(staffDocRef);
      if (staffDocSnap.exists()) schoolId = staffDocSnap.data().schoolId;

      const newItem = {
        name: inventoryForm.name,
        quantity: inventoryForm.quantity,
        condition: inventoryForm.condition,
        category: 'Classroom Asset',
        schoolId,
        grade: selectedClassroomGrade,
        status: 'Available',
        createdAt: new Date().toISOString()
      };
      
      // Add to inventory collection so it's available for allocation
      const docRef = await addDoc(collection(db, 'inventory'), newItem);
      const addedItem = { ...newItem, id: docRef.id };
      
      setClassroomInventory([...classroomInventory, addedItem]);
      setAllInventory([...allInventory, addedItem]);
      setShowInventoryModal(false);
      setInventoryForm({ name: '', quantity: 1, condition: 'New' });
      toast.success('Inventory item added and available for allocation.');
    } catch (e) {
      toast.error('Failed to add item.');
    }
  };

  const handleSaveAllocation = async () => {
    if (!allocationData.itemId && allocationType !== 'Fund') {
      toast.error('Please select an item to allocate.');
      return;
    }
    if (allocationData.mode === 'Single' && allocationData.studentIds.length === 0) {
      toast.error('Please select a student.');
      return;
    }
    if (allocationData.mode === 'Group' && allocationData.studentIds.length === 0) {
      toast.error('Please add students to the group.');
      return;
    }

    try {
      const user = auth.currentUser;
      if (!user) return;
      let schoolId = user.uid;
      const staffDocRef = doc(db, 'staff', user.uid);
      const staffDocSnap = await getDoc(staffDocRef);
      if (staffDocSnap.exists()) {
        schoolId = staffDocSnap.data().schoolId;
      }

      // Check for existing allocations of the same material for these students
      if (allocationType === 'Material' && allocationData.itemId) {
        const existingQuery = query(
          collection(db, 'allocations'), 
          where('schoolId', '==', schoolId),
          where('itemId', '==', allocationData.itemId)
        );
        const existingSnap = await getDocs(existingQuery);
        const alreadyAllocatedIds: string[] = [];
        existingSnap.forEach(doc => {
          const data = doc.data();
          if (data.studentIds && Array.isArray(data.studentIds)) {
            data.studentIds.forEach((id: string) => {
              if (allocationData.studentIds.includes(id)) {
                alreadyAllocatedIds.push(id);
              }
            });
          }
        });

        if (alreadyAllocatedIds.length > 0) {
          const names = alreadyAllocatedIds.map(id => students.find(s => s.id === id)?.name || id).join(', ');
          toast.error(`Student(s) already allocated this learning material: ${names}`, { duration: 5000 });
          return;
        }
      }

      const allocation = {
        ...allocationData,
        type: allocationType,
        schoolId,
        createdByRole: currentUserRole,
        date: new Date().toISOString(),
        status: 'Active'
      };

      await addDoc(collection(db, 'allocations'), allocation);

      // Inventory adjustment for Physical items
      if (allocationType === 'Physical' && allocationData.itemId) {
        const itemRef = doc(db, 'inventory', allocationData.itemId);
        const itemSnap = await getDoc(itemRef);
        if (itemSnap.exists()) {
          const newQty = itemSnap.data().quantity - (allocationData.quantity || 1);
          await updateDoc(itemRef, { quantity: Math.max(0, newQty) });
        }
      }

      toast.success(`${allocationType} allocation saved successfully!`);
      setShowAllocationModal(false);
      setAllocationStep(1);
      setAllocationData({
        itemId: '',
        mode: 'Single',
        studentIds: [],
        amount: 0,
        category: '',
        description: '',
        quantity: 1,
        grade: selectedClassroomGrade,
        stream: ''
      });
    } catch (error) {
      console.error("Error saving allocation:", error);
      toast.error('Failed to save allocation.');
    }
  };

  const handleUpdateStudentRemark = async (studentId: string, remark: string) => {
    try {
      await updateDoc(doc(db, 'students', studentId), {
        classroomRemark: remark
      });
      setStudents(prev => prev.map(s => s.id === studentId ? { ...s, classroomRemark: remark } : s));
      toast.success('Remark updated.');
    } catch (e) {
      toast.error('Failed to update remark.');
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-700 font-sans">

          {moduleTab === 'directory' && (
              <>
               {/* Stats Pills Row — horizontally scrollable on mobile */}
               <div className="flex flex-col gap-4 animate-in slide-in-from-top-4 duration-500">

                 {/* Row 1: Search Bar — more responsive */}
                 <div className="flex p-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[1.5rem] w-full md:max-w-sm shadow-sm">
                   <div className="flex items-center gap-1 px-4 py-2 text-slate-400 dark:text-slate-500 border-r border-slate-200 dark:border-slate-700 mr-2">
                     <Search size={14} />
                   </div>
                   <input
                     type="text"
                     placeholder="Search learners..."
                     value={searchQuery}
                     onChange={(e) => setSearchQuery(e.target.value)}
                     className="bg-transparent text-[11px] font-black text-slate-900 dark:text-white placeholder:text-slate-400 outline-none px-4 flex-1"
                   />
                 </div>

                 {/* Row 2: Stats Pills — refined horizontal scroll */}
                 <div className="flex items-center gap-3 overflow-x-auto pb-2 no-scrollbar">
                   {[
                     { label: 'Total Learners', count: students.length, action: () => { setFilterType('All'); setFilterGrade('All'); }, active: filterType === 'All' && filterGrade === 'All', icon: Users },
                     { label: 'Active', count: students.filter(s => s.status === 'Active').length, action: () => {}, active: false, icon: CheckCircle2 },
                     { label: 'Day Scholars', count: students.filter(s => s.boardingType === 'Day Scholar').length, action: () => setFilterType('Day Scholar'), active: filterType === 'Day Scholar', icon: Home },
                     { label: 'Boarders', count: students.filter(s => s.boardingType === 'Full Boarder').length, action: () => setFilterType('Full Boarder'), active: filterType === 'Full Boarder', icon: Heart },
                     { label: 'Fee Arrears', count: students.filter(s => (s.balance || 0) > 0).length, action: () => {}, active: false, icon: AlertCircle }
                   ].map((btn, i) => (
                     <button
                       key={i}
                       onClick={btn.action}
                       className={`flex-shrink-0 flex items-center gap-2.5 px-5 py-2.5 ${
                         btn.active
                           ? 'bg-orange-600 text-white shadow-lg shadow-orange-500/25'
                           : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                       } border border-slate-200 dark:border-slate-700 rounded-2xl text-[11px] font-black transition-all whitespace-nowrap active:scale-95`}
                     >
                       <btn.icon size={14} className={btn.active ? 'text-white' : 'text-orange-500'} />
                       {btn.label}
                       <span className={`ml-1 ${
                         btn.active
                           ? 'bg-white/20 text-white'
                           : 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-slate-200'
                       } px-2 py-0.5 rounded-lg text-[10px] font-bold`}>{btn.count}</span>
                     </button>
                   ))}
                 </div>

                 {/* Row 3: Grade + Type Filters — horizontal scroll */}
                 <div className="flex items-center gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                   <div className="flex-shrink-0 flex items-center gap-2 px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl">
                     <Filter size={14} className="text-slate-400" />
                     <select
                       value={filterType}
                       onChange={(e) => setFilterType(e.target.value as any)}
                       className="bg-transparent text-[11px] font-bold text-slate-900 dark:text-white outline-none cursor-pointer whitespace-nowrap"
                     >
                       <option value="All" className="text-slate-900 dark:text-slate-200">All Models</option>
                       <option value="Day Scholar" className="text-slate-900 dark:text-slate-200">Day Scholar</option>
                       <option value="Full Boarder" className="text-slate-900 dark:text-slate-200">Full Boarder</option>
                       <option value="Weekly Boarder" className="text-slate-900 dark:text-slate-200">Weekly Boarder</option>
                     </select>
                   </div>

                   <div className="flex-shrink-0 flex items-center gap-2 px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl">
                     <GraduationCap size={14} className="text-slate-400" />
                     <select
                       value={filterGrade}
                       onChange={(e) => setFilterGrade(e.target.value as any)}
                       className="bg-transparent text-[11px] font-bold text-slate-900 dark:text-white outline-none cursor-pointer"
                     >
                       <option value="All" className="text-slate-900 dark:text-slate-200">All Grades</option>
                       {CBC_GRADES.map(g => <option key={g} value={g} className="text-slate-900 dark:text-slate-200">{g}</option>)}
                     </select>
                   </div>

                   <button
                     onClick={() => {
                       setSearchQuery('');
                       setFilterType('All');
                       setFilterGrade('All');
                     }}
                     className="flex-shrink-0 px-6 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-300 rounded-[2rem] text-[11px] font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all active:scale-95 border border-slate-200 dark:border-slate-700 whitespace-nowrap"
                   >
                     Reset Filter
                   </button>
                 </div>
               </div>
              </>
          )}

          {moduleTab === 'classrooms' && (
            <div className="mt-8 pt-6 border-t border-slate-200 flex flex-col xl:flex-row xl:items-center justify-between gap-6 animate-in slide-in-from-top-4 duration-500">
              <div className="flex flex-col gap-2">
                <p className="text-[10px] font-bold text-orange-600 tracking-widest">Select a Classroom</p>
                {/* Grade buttons in a single horizontal scrollable row — no wrapping, no shrinking */}
                <div
                  className="flex items-center gap-2 overflow-x-auto pb-1"
                  style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                  {CBC_GRADES.map(g => (
                    <button
                      key={g}
                      onClick={() => setSelectedClassroomGrade(g as CBCGrade)}
                      className={`flex-shrink-0 px-4 py-2 rounded-2xl text-[11px] font-bold transition-all whitespace-nowrap border ${
                        selectedClassroomGrade === g
                          ? 'bg-orange-600 text-white border-orange-600 shadow-md shadow-orange-500/20'
                          : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-orange-400 hover:text-orange-600'
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-4">
                 {isClassroomLoading ? (
                   <div className="flex items-center gap-2 px-6 py-4">
                     <Loader2 size={20} className="animate-spin text-orange-400" />
                     <span className="text-sm font-bold text-slate-300">Loading teacher...</span>
                   </div>
                 ) : (
                   <div className="px-6 py-3 bg-indigo-500/20 border border-indigo-400/30 rounded-2xl flex items-center gap-4">
                      <div className="w-10 h-10 bg-indigo-500 rounded-full flex items-center justify-center text-white pb-0.5 shadow-lg shadow-indigo-500/30">
                         {classTeacher ? classTeacher.name.charAt(0) : <UserCircle size={20} />}
                      </div>
                      <div>
                         <p className="text-[10px] font-bold text-indigo-200 tracking-tighter">Class Teacher</p>
                         <p className="text-sm font-bold text-white">{classTeacher ? classTeacher.name : 'Unassigned'}</p>
                      </div>
                   </div>
                 )}
              </div>
            </div>
          )}

      <div className="max-w-7xl mx-auto space-y-10">
        <div className="space-y-6 pt-4">
        {moduleTab === 'directory' ? (
          <>
            {/* Loading State */}
            {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-[3rem] border border-dashed border-slate-200 dark:border-slate-800 p-20 text-center animate-in fade-in zoom-in duration-700">
            <div className="w-24 h-24 bg-slate-50 dark:bg-slate-800 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 shadow-inner transition-transform duration-500 hover:scale-110">
              <Users size={40} className="text-slate-300 dark:text-slate-600" strokeWidth={1.5} />
            </div>
            <h3 className="text-2xl font-bold text-black dark:text-slate-100 tracking-tight mb-3 leading-tight">No Learners Found</h3>
            <p className="text-black dark:text-slate-400 mb-10 max-w-md mx-auto text-sm font-medium leading-relaxed">
              We couldn't find any learners matching your current filters. Try adjusting your search or register a new learner.
            </p>
            <button 
              onClick={handleOpenRegister}
              className="inline-flex items-center gap-3 px-10 py-4 bg-orange-600 text-white rounded-2xl text-[11px] font-bold tracking-wide hover:bg-orange-700 transition-all shadow-md active:scale-95 group"
            >
              <UserPlus size={18} strokeWidth={2.5} className="group-hover:scale-110 transition-transform" /> 
              Register Learner
            </button>
          </div>
        ) : (
          /* Learner Table */
          <div className="flex-1 flex flex-col pt-4">
            <div className="flex justify-between items-center mb-6">
              <div>
                 <h3 className="text-lg font-bold dark:text-white mb-2">Learner Directory</h3>
                 <div className="flex gap-2">
                   <span className="text-xs font-bold text-white bg-orange-500 px-3 py-1 rounded-full shadow-sm">All Learners</span>
                 </div>
               </div>
               {['ADMIN', 'DIRECTOR', 'TEACHER', 'SUPER_ADMIN', 'PLATFORM_ADMIN'].includes(role) && (
                 <button 
                   onClick={handleOpenRegister}
                   className="text-xs font-bold text-orange-600 bg-orange-50 hover:bg-orange-100 dark:bg-slate-700 dark:hover:bg-slate-600 border border-orange-100 dark:border-slate-600 rounded-full px-4 py-2 flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer whitespace-nowrap"
                 >
                   <UserPlus size={14} /> + New Learner
                 </button>
               )}
            </div>
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 text-xs font-bold tracking-wider text-slate-500 dark:text-slate-400">
                    <th className="p-4 pl-0 text-slate-700 dark:text-slate-200">Learner Name</th>
                    <th className="p-4 text-slate-700 dark:text-slate-200">Admission No.</th>
                    <th className="p-4 text-slate-700 dark:text-slate-200">Grade / Stream</th>
                    <th className="p-4 text-slate-700 dark:text-slate-200">Boarding</th>
                    <th className="p-4 text-right text-slate-700 dark:text-slate-200">Fee Balance</th>
                    <th className="p-4 text-right pr-0 text-slate-700 dark:text-slate-200">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map((student) => (
                    <tr key={student.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors group cursor-default">
                      <td className="p-4 pl-0">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <img src={`https://picsum.photos/seed/${student.id}/64`} className="w-10 h-10 rounded-[1rem] object-cover shadow-sm group-hover:scale-105 transition-transform border border-slate-200 dark:border-slate-700" alt={student.name} referrerPolicy="no-referrer" />
                            <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-orange-500 border-2 border-white dark:border-slate-900 rounded-full"></div>
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 dark:text-slate-100 text-sm">{student.name}</p>
                            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 cursor-pointer hover:text-orange-600 dark:hover:text-orange-400" onClick={() => handleOpenEdit(student)}>View Profile</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-sm font-semibold text-slate-800 dark:text-slate-300">
                        {student.admissionNumber}
                      </td>
                      <td className="p-4 whitespace-nowrap">
                        <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl w-fit">
                          <GraduationCap size={14} className="text-orange-500" />
                          <div className="flex flex-col leading-none">
                            <span className="text-[11px] font-black text-slate-800 dark:text-slate-200 uppercase tracking-tight">
                              {student.grade}
                            </span>
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{student.stream}</span>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 whitespace-nowrap">
                        <div className="flex items-center gap-2 px-3 py-2 bg-orange-50/50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-900/30 rounded-xl w-fit">
                          <Home size={14} className="text-orange-500" />
                          <span className="text-[10px] font-black text-orange-700 dark:text-orange-400 uppercase tracking-wide">
                            {student.boardingType}
                          </span>
                        </div>
                      </td>
                      <td className="p-4 text-right whitespace-nowrap">
                        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border ${
                          student.balance < 0 
                            ? 'bg-rose-50 border-rose-100 text-rose-600 dark:bg-rose-900/20 dark:border-rose-900/30 dark:text-rose-400' 
                            : student.balance > 0 
                            ? 'bg-orange-50 border-orange-100 text-orange-600 dark:bg-orange-900/20 dark:border-orange-900/30 dark:text-orange-400' 
                            : 'bg-green-50 border-green-100 text-green-600 dark:bg-green-900/20 dark:border-green-900/30 dark:text-green-400'
                        }`}>
                          <Banknote size={14} />
                          <span className="text-[11px] font-black tracking-tight">
                            {student.balance !== 0 ? `KES ${Math.abs(student.balance).toLocaleString()}` : 'Cleared'}
                          </span>
                        </div>
                      </td>
                      <td className="p-4 text-right pr-0">
                        <div className="flex justify-end gap-2">
                          <button 
                            onClick={() => handleOpenInvoice(student)}
                            className="p-2 text-black dark:text-white hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/10 rounded-xl transition-all flex items-center gap-2 text-[10px] font-bold"
                            title="Generate Invoice"
                          >
                            <Receipt size={14} /> Invoice
                          </button>
                          <button 
                            onClick={() => setActiveTab('academics')}
                            className="p-2 text-black dark:text-white hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/10 rounded-xl transition-all flex items-center gap-2 text-[10px] font-bold"
                            title="View Report"
                          >
                            <FileText size={14} /> Report
                          </button>
                          <button 
                            onClick={() => handleOpenDetail(student)}
                            className="p-2 text-black dark:text-white hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/10 rounded-xl transition-all flex items-center gap-2 text-[10px] font-bold"
                            title="View Details"
                          >
                            <Eye size={14} /> View
                          </button>
                          <button onClick={() => handleOpenEdit(student)} className="p-2 bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 rounded-xl hover:bg-orange-100 transition-all"><Pencil size={14} /></button>
                          <button onClick={() => setDeleteModal({isOpen: true, studentId: student.id, reason: '', confirmText: ''})} className="p-2 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-xl hover:bg-rose-100 transition-all"><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        </>
        ) : (
          <div className="animate-in fade-in duration-500 space-y-6">
             {/* Class Announcements/Notes Row */}
             <div className="bg-slate-800/50 rounded-[2rem] p-8 border border-white/5 flex flex-col md:flex-row gap-8 items-start">
                <div className="flex-1 space-y-4">
                  <div className="flex items-center gap-3">
                    <MessageSquare size={18} className="text-orange-400" />
                    <h3 className="text-sm font-bold text-white tracking-wider">Class Announcements & Notes</h3>
                  </div>
                  <textarea 
                    value={classNotes}
                    onChange={(e) => setClassNotes(e.target.value)}
                    placeholder="General announcements for this class (e.g. Bring art supplies on Friday)..."
                    className="w-full h-24 bg-black/20 border border-white/10 rounded-2xl p-4 text-sm text-blue-50 placeholder:text-white/20 outline-none focus:ring-2 focus:ring-orange-500/20 transition-all resize-none font-medium"
                  />
                  <div className="flex flex-wrap items-center gap-4">
                    <button 
                      onClick={saveClassNotes}
                      disabled={isSavingNotes}
                      className="px-6 py-3 bg-orange-600 text-white rounded-xl text-xs font-bold hover:bg-orange-700 disabled:opacity-50 transition-all flex items-center gap-2 shadow-lg shadow-orange-950/20"
                    >
                      {isSavingNotes ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
                      Save Updates
                    </button>

                    {/* Voice Announcement Placeholder */}
                    <div className="relative group/voice">
                      <div className="absolute inset-0 bg-white/5 backdrop-blur-[2px] rounded-xl z-10 flex items-center justify-center border border-white/10 opacity-100 group-hover:opacity-0 transition-opacity pointer-events-none">
                         <span className="text-[9px] font-bold text-orange-400 bg-orange-950/40 px-3 py-1 rounded-full tracking-widest border border-orange-500/20 shadow-xl">Coming Soon</span>
                      </div>
                      <div className="flex flex-col gap-2">
                        <button 
                          className="px-6 py-3 bg-indigo-600/80 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-not-allowed group-hover:bg-indigo-600"
                        >
                          <Smartphone size={14} />
                          Push Voice Announcement
                        </button>
                      </div>
                      
                      {/* Explanatory Note on Hover/Visible */}
                      <div className="absolute top-full left-0 mt-3 w-72 p-4 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl z-20 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                         <p className="text-[10px] font-bold text-indigo-300 mb-1 tracking-tighter">Voice Broadcast Feature</p>
                         <p className="text-[11px] font-medium text-slate-300 leading-relaxed">
                           Write an announcement and push it to all classrooms via voice broadcast. Select target grades and streams for the announcement.
                         </p>
                      </div>
                    </div>
                  </div>
                </div>
             </div>

             {/* Classrooms UI Main Dashboard View */}
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* TextBooks & Learning Materials Block */}
                <div className="bg-white dark:bg-slate-800 rounded-[2rem] p-6 shadow-sm border border-slate-200/60 dark:border-slate-700 hover:shadow-md transition-shadow group">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl group-hover:scale-110 transition-transform">
                      <Book size={20} className="text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <h3 className="font-bold text-black dark:text-white">Learning Materials</h3>
                      <p className="text-[11px] font-semibold text-black dark:text-white">Assigned per learner</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <button 
                      onClick={() => { setAllocationType('Material'); setShowAllocationModal(true); setAllocationStep(1); }}
                      className="w-full py-3 bg-blue-50 dark:bg-blue-900/40 border border-blue-200 dark:border-blue-800 rounded-xl flex items-center justify-center gap-2 group/btn"
                    >
                      <Plus size={16} className="text-blue-600 dark:text-blue-400 group-hover/btn:rotate-90 transition-transform" />
                      <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400">Add Allocation</span>
                    </button>
                    <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl flex justify-between items-center">
                      <div>
                        <p className="text-[10px] font-bold text-black dark:text-white">Total Textbooks</p>
                        <p className="text-lg font-bold text-black dark:text-slate-200">{textbooks.reduce((acc, curr) => acc + curr.assigned, 0)}</p>
                      </div>
                      <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-xs">
                        100%
                      </div>
                    </div>
                    <div className="space-y-1.5">
                       {textbooks.map(tb => (
                         <div key={tb.id} className="flex items-center justify-between text-[11px] font-bold px-1">
                            <span className="text-black dark:text-white">{tb.title}</span>
                            <span className="text-blue-600">{tb.assigned}/{tb.total}</span>
                         </div>
                       ))}
                    </div>
                  </div>
                </div>

                {/* Fund Allocation Block */}
                <div className="bg-white dark:bg-slate-800 rounded-[2rem] p-6 shadow-sm border border-slate-200/60 dark:border-slate-700 hover:shadow-md transition-shadow group">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-xl group-hover:scale-110 transition-transform">
                      <Banknote size={20} className="text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <h3 className="font-bold text-black dark:text-white">Fund Allocation</h3>
                      <p className="text-[11px] font-semibold text-black dark:text-white">Operational budget</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <button 
                      onClick={() => { setAllocationType('Fund'); setShowAllocationModal(true); setAllocationStep(1); }}
                      className="w-full py-3 bg-green-50 dark:bg-green-900/40 border border-green-200 dark:border-green-800 rounded-xl flex items-center justify-center gap-2 group/btn"
                    >
                      <Plus size={16} className="text-green-600 dark:text-green-400 group-hover/btn:rotate-90 transition-transform" />
                      <span className="text-[11px] font-bold text-green-600 dark:text-green-400">Record Allocation</span>
                    </button>
                    <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl flex justify-between items-center">
                      <div>
                        <p className="text-[10px] font-bold text-black dark:text-white">Class Budget</p>
                        <p className="text-lg font-bold text-green-600 dark:text-green-400">KES {classFunds.toLocaleString()}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setActiveTab('finance')}
                      className="w-full py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-[11px] font-bold text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
                    >
                       Manage Distributions
                    </button>
                  </div>
                </div>

                {/* Inventory Block */}
                <div className="bg-white dark:bg-slate-800 rounded-[2rem] p-6 shadow-sm border border-slate-200/60 dark:border-slate-700 hover:shadow-md transition-shadow group">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-xl group-hover:scale-110 transition-transform">
                      <Package size={20} className="text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <h3 className="font-bold text-black dark:text-white">Physical Inventory</h3>
                      <p className="text-[11px] font-semibold text-black dark:text-white">Classroom assets</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <button 
                      onClick={() => { setAllocationType('Physical'); setShowAllocationModal(true); setAllocationStep(1); }}
                      className="w-full py-3 bg-purple-50 dark:bg-purple-900/40 border border-purple-200 dark:border-purple-800 rounded-xl flex items-center justify-center gap-2 group/btn"
                    >
                      <Plus size={16} className="text-purple-600 dark:text-purple-400 group-hover/btn:rotate-90 transition-transform" />
                      <span className="text-[11px] font-bold text-purple-600 dark:text-purple-400">Allocate Items</span>
                    </button>
                    <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl flex justify-between items-center">
                      <div>
                        <p className="text-[10px] font-bold text-black dark:text-white">Tracked Assets</p>
                        <p className="text-lg font-bold text-black dark:text-slate-200">{classroomInventory.length} Items</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                       {classroomInventory.slice(0, 2).map(item => (
                         <div key={item.id} className="flex items-center justify-between text-[11px] font-bold px-1 border-b border-slate-100 dark:border-slate-900 pb-1">
                            <span className="text-black dark:text-white">{item.name} ({item.quantity})</span>
                            <span className="text-purple-600">{item.condition}</span>
                         </div>
                       ))}
                    </div>
                    <button 
                      onClick={() => setShowInventoryModal(true)}
                      className="w-full py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-[11px] font-bold text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors"
                    >
                       Record New Asset
                    </button>
                  </div>
                </div>

             </div>
             
             {/* General Student List for the Classroom */}
             <div className="bg-white dark:bg-slate-800 rounded-[2rem] p-6 md:p-8 shadow-sm border border-slate-200/60 dark:border-slate-700">
               <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="text-lg font-bold dark:text-white">Class Roster</h3>
                    <p className="text-[11px] font-semibold text-black dark:text-white">Showing learners currently enrolled in {selectedClassroomGrade}</p>
                  </div>
               </div>
               
               <div className="overflow-x-auto">
                 <table className="w-full text-left border-collapse">
                   <thead>
                     <tr className="border-b border-slate-200 dark:border-slate-700 text-xs font-bold text-black dark:text-white tracking-wider">
                       <th className="p-4 pl-0">Learner Name</th>
                       <th className="p-4">Stream</th>
                       <th className="p-4">TextBooks Assigned</th>
                       <th className="p-4 text-right">Fund Contrib</th>
                     </tr>
                   </thead>
                   <tbody>
                     {students.filter(s => s.grade === selectedClassroomGrade).map((student) => (
                       <tr key={student.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors group">
                          <td className="p-4 pl-0">
                            <div className="flex items-center gap-3">
                              <img src={`https://picsum.photos/seed/${student.id}/40`} className="w-8 h-8 rounded-full object-cover" alt={student.name} referrerPolicy="no-referrer" />
                              <span className="font-bold text-black dark:text-white text-sm">{student.name}</span>
                            </div>
                          </td>
                          <td className="p-4 font-semibold text-black dark:text-slate-300 text-sm">{student.stream || 'N/A'}</td>
                          <td className="p-4">
                             <div className="flex items-center gap-2 group/remark">
                                <input 
                                  type="text" 
                                  defaultValue={(student as any).classroomRemark || ''} 
                                  onBlur={(e) => handleUpdateStudentRemark(student.id, e.target.value)}
                                  placeholder="Add remark..." 
                                  className="bg-transparent border-b border-dashed border-slate-200 dark:border-slate-700 text-[11px] font-medium text-black dark:text-white focus:text-black dark:focus:text-white focus:border-orange-500 outline-none w-48 transition-all"
                                />
                             </div>
                          </td>
                          <td className="p-4 text-right font-bold text-black dark:text-slate-200 text-sm">KES {(student as any).balance > 0 ? '0' : '1,500'}</td>
                       </tr>
                     ))}
                     {students.filter(s => s.grade === selectedClassroomGrade).length === 0 && (
                        <tr>
                          <td colSpan={4} className="p-8 text-center text-sm font-medium text-black dark:text-white">No learners assigned to this classroom yet.</td>
                        </tr>
                     )}
                   </tbody>
                 </table>
               </div>
             </div>
             
          </div>
        )}
      </div>

      </div>


      {deleteModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 md:p-12">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setDeleteModal({isOpen: false, studentId: null, reason: '', confirmText: ''})}
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-xl"
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 40 }}
            className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl border border-slate-100 dark:border-slate-800 p-10 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-rose-50 dark:bg-rose-900/10 rounded-full -mr-16 -mt-16"></div>
            
            <div className="relative z-10">
              <div className="w-16 h-16 bg-rose-50 dark:bg-rose-900/20 rounded-2xl flex items-center justify-center mb-8 shadow-sm">
                <Trash2 size={32} className="text-rose-600 dark:text-rose-400" strokeWidth={2.5} />
              </div>
              
              <h3 className="text-2xl font-bold text-black dark:text-slate-100 tracking-tight mb-3 leading-tight">Confirm Deletion</h3>
              <p className="text-black dark:text-slate-400 text-sm font-medium mb-10 leading-relaxed">
                Are you sure you want to delete this learner record? This action is <span className="text-rose-600 font-bold capitalize">irreversible</span>.
              </p>
              
              <div className="space-y-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-black dark:text-white capitalize ml-1">Reason for deletion</label>
                  <select 
                    value={deleteModal.reason}
                    onChange={(e) => setDeleteModal({...deleteModal, reason: e.target.value})}
                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl text-sm font-bold text-black dark:text-slate-200 outline-none focus:ring-2 focus:ring-rose-500/20 transition-all cursor-pointer"
                  >
                    <option value="">Select a reason</option>
                    <option value="Transferred">Transferred</option>
                    <option value="Indiscipline">Indiscipline</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-black dark:text-white capitalize ml-1">Type "delete" to confirm</label>
                  <input 
                    type="text"
                    value={deleteModal.confirmText}
                    onChange={(e) => setDeleteModal({...deleteModal, confirmText: e.target.value})}
                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl text-sm font-bold text-black dark:text-slate-200 outline-none focus:ring-2 focus:ring-rose-500/20 transition-all"
                    placeholder="delete"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-3 mt-12">
                <button 
                  onClick={handleDelete} 
                  className="w-full py-5 bg-rose-600 text-white rounded-[1.5rem] text-[11px] font-bold capitalize hover:bg-rose-700 transition-all shadow-xl shadow-rose-200 dark:shadow-none active:scale-95"
                >
                  Delete Learner Record
                </button>
                <button 
                  onClick={() => setDeleteModal({isOpen: false, studentId: null, reason: '', confirmText: ''})} 
                  className="w-full py-4 text-[10px] font-bold text-black dark:text-white capitalize hover:text-black transition-colors"
                >
                  Cancel & Keep Record
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
      {/* Inventory Modal */}
      {showInventoryModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-slate-950/60 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-[2.5rem] p-10 shadow-2xl border border-slate-100 dark:border-slate-800">
            <h3 className="text-2xl font-bold dark:text-white mb-6">Add Classroom Asset</h3>
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-black dark:text-white tracking-widest ml-1">Asset Name</label>
                <input 
                  type="text" 
                  value={inventoryForm.name}
                  onChange={(e) => setInventoryForm({...inventoryForm, name: e.target.value})}
                  className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl text-sm font-bold outline-none" 
                  placeholder="e.g. Wall Map, Bookshelf"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-black dark:text-white tracking-widest ml-1">Quantity</label>
                  <input 
                    type="number" 
                    value={inventoryForm.quantity}
                    onChange={(e) => setInventoryForm({...inventoryForm, quantity: parseInt(e.target.value)})}
                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl text-sm font-bold outline-none" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-black dark:text-white tracking-widest ml-1">Condition</label>
                  <select 
                    value={inventoryForm.condition}
                    onChange={(e) => setInventoryForm({...inventoryForm, condition: e.target.value})}
                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl text-sm font-bold outline-none cursor-pointer"
                  >
                    <option value="New">New</option>
                    <option value="Fair">Fair</option>
                    <option value="Old">Old</option>
                  </select>
                </div>
              </div>
              <div className="flex flex-col gap-3 pt-4">
                <button 
                  onClick={handleAddInventory}
                  className="w-full py-4 bg-orange-600 text-white rounded-2xl font-bold text-sm hover:bg-orange-700 transition-all active:scale-95"
                >
                  Confirm Asset Entry
                </button>
                <button 
                  onClick={() => setShowInventoryModal(false)}
                  className="w-full py-3 text-sm font-medium text-black dark:text-white hover:text-black"
                >
                  Discard
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Advanced Allocation Modal */}
      <AnimatePresence>
        {showAllocationModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xl">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-slate-900 w-full max-w-5xl h-[85vh] overflow-hidden rounded-[3rem] shadow-2xl border border-white/20 dark:border-slate-800 flex flex-col"
            >
              {/* Header */}
              <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 sticky top-0 z-10">
                <div className="flex items-center gap-4">
                  <div className={`p-4 rounded-2xl ${ allocationType === 'Material' ? 'bg-blue-50 text-blue-600' : allocationType === 'Fund' ? 'bg-green-50 text-green-600' : 'bg-purple-50 text-purple-600' }`}>
                    {allocationType === 'Material' ? <Book size={24} /> : 
                     allocationType === 'Fund' ? <Banknote size={24} /> : <Package size={24} />}
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold dark:text-white">
                      {allocationType === 'Material' ? 'Allocate Learning Materials' : 
                       allocationType === 'Fund' ? 'Record Fund Allocation' : 'Allocate Physical Assets'}
                    </h3>
                    <p className="text-sm font-bold text-black dark:text-white">Classroom grade: {selectedClassroomGrade}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowAllocationModal(false)}
                  className="p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl hover:bg-slate-100 transition-all"
                >
                  <X size={20} className="text-black dark:text-white" />
                </button>
              </div>

              {/* Form Content */}
              <div className="flex-1 overflow-y-auto p-8 lg:p-12 space-y-10">
                
                {/* Access Verification */}
                {currentUserRole !== 'ADMIN' && (
                  <div className="p-8 bg-orange-50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-900/30 rounded-[2.5rem] space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
                    <div className="flex items-center gap-3 text-orange-600 font-bold text-sm tracking-tight">
                      <div className="w-10 h-10 rounded-full bg-white dark:bg-orange-900/20 flex items-center justify-center shadow-sm border border-orange-100 dark:border-orange-800">
                        <Key size={18} />
                      </div>
                      <div>
                        <h3>Classroom Access Authorization</h3>
                        <p className="text-[10px] text-orange-400 font-medium">Verify your identity to proceed with class-level modifications</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex-1 relative">
                        <input 
                          type="password" 
                          placeholder="Enter 4-digit numeric code" 
                          maxLength={4}
                          value={enteredClassCode}
                          onChange={(e) => setEnteredClassCode(e.target.value)}
                          className="w-full px-6 py-4 bg-white dark:bg-slate-800 border border-orange-200 dark:border-orange-900/50 rounded-2xl text-2xl font-mono tracking-[0.8em] text-center outline-none focus:ring-4 focus:ring-orange-500/10 transition-all placeholder:text-slate-300 placeholder:tracking-normal placeholder:text-sm"
                        />
                      </div>
                      {enteredClassCode.length === 4 && enteredClassCode === teacherData?.classroomAccessCode && (
                        <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs animate-in zoom-in duration-300">
                          <CheckCircle2 size={16} /> Verified
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Section 1: Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-black dark:text-white tracking-widest ml-1">Classroom</label>
                    <div className="p-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl text-sm font-bold text-black dark:text-slate-300">
                      {selectedClassroomGrade}
                    </div>
                  </div>

                  {allocationType !== 'Fund' && (
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold text-black dark:text-white tracking-widest ml-1">
                        Select {allocationType === 'Material' ? 'Learning Material' : 'Inventory Item'}
                      </label>
                      <select 
                        value={allocationData.itemId}
                        onChange={(e) => setAllocationData({ ...allocationData, itemId: e.target.value })}
                        className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl text-sm font-bold outline-none ring-offset-0 focus:ring-2 focus:ring-orange-600/20"
                      >
                        <option value="">Choose item...</option>
                        {allInventory.filter(item => {
                          if (allocationType === 'Material') return item.category === 'Textbook';
                          if (allocationType === 'Physical') return item.category !== 'Textbook';
                          return true;
                        }).map(item => {
                          const isLocked = currentUserRole !== 'ADMIN' && lockedFields.has(`${allocationType}:${item.id}`);
                          return (
                            <option key={item.id} value={item.id} disabled={isLocked}>{item.name} ({item.quantity} avail) {isLocked ? '[LOCKED BY ADMIN]' : ''}</option>
                          );
                        })}
                      </select>
                      {currentUserRole !== 'ADMIN' && allocationData.itemId && lockedFields.has(`${allocationType}:${allocationData.itemId}`) && (
                        <p className="text-[9px] text-rose-500 font-bold mt-1">This item allocation was set by Admin and cannot be modified.</p>
                      )}
                    </div>
                  )}

                  {allocationType === 'Fund' && (
                    <>
                      <div className="space-y-2">
                        <label className="text-[11px] font-bold text-black dark:text-white tracking-widest ml-1">Category</label>
                        <select 
                          value={allocationData.category}
                          onChange={(e) => setAllocationData({ ...allocationData, category: e.target.value })}
                          className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl text-sm font-bold outline-none"
                        >
                          <option value="">Select category...</option>
                          <option value="Class Project">Class Project</option>
                          <option value="Learning Materials">Learning Materials</option>
                          <option value="Activities">Activities</option>
                          <option value="Maintenance">Maintenance</option>
                          <option value="Custom">Custom</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[11px] font-bold text-black dark:text-white tracking-widest ml-1">Amount (KES)</label>
                        <input 
                          type="number"
                          value={allocationData.amount}
                          onChange={(e) => setAllocationData({ ...allocationData, amount: Number(e.target.value) })}
                          disabled={currentUserRole !== 'ADMIN' && lockedFields.has('Fund')}
                          className={`w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl text-sm font-bold outline-none ${currentUserRole !== 'ADMIN' && lockedFields.has('Fund') ? 'opacity-50 cursor-not-allowed' : ''}`}
                        />
                        {currentUserRole !== 'ADMIN' && lockedFields.has('Fund') && (
                          <p className="text-[9px] text-rose-500 font-bold mt-1 text-center">Fund allocation for this class has been locked by Admin.</p>
                        )}
                      </div>
                    </>
                  )}

                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-black dark:text-white tracking-widest ml-1">Allocation Type</label>
                    <div className="flex flex-wrap md:flex-nowrap gap-2 p-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl">
                      {[
                        { id: 'Single', label: 'Single Student' },
                        { id: 'Group', label: 'Student Group' },
                        { id: 'Class', label: 'Whole Class' }
                      ].map((mode) => (
                        <button
                          key={mode.id}
                          onClick={() => setAllocationData({ ...allocationData, mode: mode.id, studentIds: [] })}
                          className={`flex-1 min-w-[100px] py-3 text-[10px] font-bold rounded-xl transition-all whitespace-nowrap ${ allocationData.mode === mode.id ? 'bg-orange-600 text-white shadow-lg' : 'text-black hover:bg-slate-100 dark:hover:bg-slate-700' }`}
                        >
                          {mode.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Section 2: Mode Specific UI */}
                {allocationData.mode === 'Single' && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">
                    <div className="space-y-2 max-w-md">
                      <label className="text-[11px] font-bold text-black dark:text-white tracking-widest ml-1">Search Student</label>
                      <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-black dark:text-white" size={16} />
                        <input 
                          type="text"
                          placeholder="Search name or admission number..."
                          onChange={(e) => {
                            const val = e.target.value.toLowerCase();
                            if (val.length < 2) return;
                            // Search logic is handled via useMemo below, but we can update state here if needed
                          }}
                          className="w-full pl-12 pr-5 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl text-sm font-bold outline-none"
                        />
                      </div>
                    </div>
                    {/* Student Select List */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {students.filter(s => s.grade === selectedClassroomGrade).map(student => (
                        <button
                          key={student.id}
                          onClick={() => setAllocationData({ ...allocationData, studentIds: [student.id] })}
                          className={`p-4 rounded-2xl border transition-all flex items-center gap-4 ${ allocationData.studentIds.includes(student.id) ? 'bg-orange-50 border-orange-200 ring-2 ring-orange-500/20' : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700' }`}
                        >
                          <img src={`https://picsum.photos/seed/${student.id}/40`} className="w-10 h-10 rounded-full" />
                          <div className="text-left">
                            <p className="text-sm font-bold dark:text-white">{student.name}</p>
                            <p className="text-[10px] font-bold text-black dark:text-white">{student.admissionNumber}</p>
                          </div>
                          {allocationData.studentIds.includes(student.id) && <Check size={16} className="text-orange-600 ml-auto" />}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {allocationData.mode === 'Group' && (
                  <div className="space-y-8 animate-in fade-in slide-in-from-top-4 duration-500">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-bold dark:text-white">Drag & Drop Group Builder</h4>
                        <p className="text-[11px] font-semibold text-black dark:text-white">Organize students into a custom group for this allocation.</p>
                      </div>
                      <div className="flex items-center gap-2">
                         <span className="text-xs font-bold text-black dark:text-white">Allocation for:</span>
                         <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-bold tracking-wider">
                           {allInventory.find(i => i.id === allocationData.itemId)?.name || 'Resource'}
                         </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-[400px]">
                      {/* Left Panel: Available */}
                      <div className="bg-slate-50 dark:bg-slate-800/50 border border-dashed border-slate-200 dark:border-slate-700 rounded-3xl p-6 flex flex-col">
                        <p className="text-[10px] font-bold text-black dark:text-white mb-4 tracking-widest flex items-center gap-2">
                          <Users size={12} /> Available Students
                        </p>
                        <div className="overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                          {students.filter(s => s.grade === selectedClassroomGrade && !allocationData.studentIds.includes(s.id)).map(student => (
                            <motion.div
                              key={student.id}
                              draggable
                              onDragStart={() => setDraggedStudent(student)}
                              className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 flex items-center gap-3 cursor-grab active:cursor-grabbing shadow-sm hover:shadow-md transition-shadow"
                            >
                              <img src={`https://picsum.photos/seed/${student.id}/40`} className="w-8 h-8 rounded-full" />
                              <div className="flex-1">
                                <p className="text-[12px] font-bold dark:text-white">{student.name}</p>
                                <p className="text-[9px] font-bold text-black dark:text-white">{student.admissionNumber}</p>
                              </div>
                              <Plus size={14} className="text-slate-300" />
                            </motion.div>
                          ))}
                        </div>
                      </div>

                      {/* Right Panel: Group Area */}
                      <div 
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={() => {
                          if (draggedStudent) {
                            setAllocationData({ ...allocationData, studentIds: [...allocationData.studentIds, draggedStudent.id] });
                            setDraggedStudent(null);
                          }
                        }}
                        className={`bg-white dark:bg-slate-900 border-2 border-dashed rounded-3xl p-6 flex flex-col transition-all ${ allocationData.studentIds.length === 0 ? 'border-slate-200 dark:border-slate-800' : 'border-orange-200 dark:border-orange-800 shadow-inner' }`}
                      >
                        <div className="flex items-center justify-between mb-4">
                          <p className="text-[10px] font-bold text-orange-600 tracking-widest flex items-center gap-2">
                             Group Members ({allocationData.studentIds.length})
                          </p>
                          {allocationData.studentIds.length > 0 && (
                            <button onClick={() => setAllocationData({ ...allocationData, studentIds: [] })} className="text-[9px] font-bold text-black dark:text-white hover:text-rose-500">Clear All</button>
                          )}
                        </div>
                        
                        <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                          {allocationData.studentIds.length === 0 ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 opacity-40">
                              <SearchCode size={32} className="mb-2" />
                              <p className="text-xs font-bold">Drag students here<br/>to build your group</p>
                            </div>
                          ) : (
                            allocationData.studentIds.map((id: string) => {
                              const s = students.find(std => std.id === id);
                              return (
                                <motion.div
                                  initial={{ scale: 0.8, opacity: 0 }}
                                  animate={{ scale: 1, opacity: 1 }}
                                  key={id}
                                  className="p-3 bg-orange-50/50 dark:bg-orange-900/10 rounded-xl border border-orange-100 dark:border-orange-900/30 flex items-center gap-3 group/member"
                                >
                                  <img src={`https://picsum.photos/seed/${id}/40`} className="w-8 h-8 rounded-full" />
                                  <div className="flex-1">
                                    <p className="text-[12px] font-bold text-orange-900 dark:text-orange-200">{s?.name}</p>
                                    <p className="text-[9px] font-bold text-orange-600/60">{s?.admissionNumber}</p>
                                  </div>
                                  <button 
                                    onClick={() => setAllocationData({ ...allocationData, studentIds: allocationData.studentIds.filter((sid: string) => sid !== id) })}
                                    className="p-1.5 hover:bg-rose-50 rounded-lg text-slate-300 hover:text-rose-500 transition-colors"
                                  >
                                    <X size={14} />
                                  </button>
                                </motion.div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    </div>
                    {/* Validation Warnings */}
                    <div className="flex items-center gap-2 p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 rounded-2xl">
                      <AlertCircle className="text-amber-600" size={16} />
                      <p className="text-[11px] font-bold text-amber-800 dark:text-amber-400">
                        System automatically validates that no student is duplicated across groups for the same material.
                      </p>
                    </div>
                  </div>
                )}

                {allocationData.mode === 'Class' && (
                  <div className="p-12 text-center bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-[3rem] animate-in fade-in zoom-in duration-500">
                    <UserCheck size={48} className="mx-auto text-blue-600 mb-6" />
                    <h4 className="text-xl font-bold dark:text-white mb-2">Whole Class Allocation</h4>
                    <p className="text-sm font-bold text-black dark:text-white max-w-sm mx-auto">
                      This will automatically record this allocation for all {students.filter(s => s.grade === selectedClassroomGrade).length} students in the classroom.
                    </p>
                  </div>
                )}

                {/* Description Footer */}
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-black dark:text-white tracking-widest ml-1">Additional Notes</label>
                  <textarea 
                    value={allocationData.description}
                    onChange={(e) => setAllocationData({ ...allocationData, description: e.target.value })}
                    placeholder="E.g. Textbook condition details or project goal..."
                    className="w-full h-32 px-6 py-5 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-3xl text-sm font-bold outline-none resize-none"
                  />
                </div>

              </div>

              {/* Footer Actions */}
              <div className="p-8 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/20 backdrop-blur-sm rounded-b-[3rem]">
                <button 
                  onClick={() => setShowAllocationModal(false)}
                  className="px-10 py-5 text-[11px] font-bold text-black dark:text-white hover:text-black dark:hover:text-white transition-colors"
                >
                  Discard Changes
                </button>
                <button 
                  onClick={() => {
                    if (currentUserRole !== 'ADMIN' && enteredClassCode !== teacherData?.classroomAccessCode) {
                      toast.error("Incorrect Classroom Access Code. Please check with your administrator.");
                      return;
                    }
                    handleSaveAllocation();
                  }}
                  className={`px-12 py-5 rounded-[1.5rem] text-[11px] font-bold tracking-wider shadow-xl transition-all active:scale-95 ${ (currentUserRole !== 'ADMIN' && enteredClassCode !== teacherData?.classroomAccessCode) ? 'bg-slate-400 cursor-not-allowed opacity-50' : allocationType === 'Material' ? 'bg-blue-600 shadow-blue-200' : allocationType === 'Fund' ? 'bg-green-600 shadow-green-200' : 'bg-purple-600 shadow-purple-200' } text-white`}
                >
                   Complete Allocation
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* ===== INVOICE MODAL — Premium View ===== */}
      {showInvoice && invoiceStudent && (
        <div className="fixed inset-0 z-[150] bg-black/70 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-[2rem] w-full max-w-2xl shadow-2xl my-8 overflow-hidden border border-slate-100 animate-in zoom-in duration-300">

            {/* ── Modal Action Bar (not printed) ── */}
            <div className="print:hidden flex items-center justify-between px-6 py-4 bg-slate-950 rounded-t-[2rem]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-orange-500 flex items-center justify-center">
                  <Receipt size={16} className="text-white" />
                </div>
                <div>
                  <p className="text-sm font-black text-white leading-none">Fee Invoice</p>
                  <p className="text-[10px] font-bold text-slate-400 mt-0.5">{invoiceStudent.name} · {invoiceStudent.admissionNumber}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleInvoicePrint()}
                  className="flex items-center gap-2 px-5 py-2.5 bg-orange-600 text-white rounded-xl text-xs font-black hover:bg-orange-700 transition-all shadow-lg shadow-orange-500/30 active:scale-95"
                >
                  <Printer size={14} /> Print / Export
                </button>
                <button
                  onClick={() => setShowInvoice(false)}
                  className="p-2.5 bg-white/10 text-white rounded-xl hover:bg-white/20 transition-all"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* ── Printable Invoice Body ── */}
            <div ref={invoiceRef} className="p-8 bg-white text-black dark:text-white font-sans" style={{ fontFamily: 'Arial, sans-serif' }}>

              {/* Header */}
              <div className="flex justify-between items-start mb-8 pb-6 border-b-2 border-orange-500">
                <div className="flex items-center gap-3">
                  {invoiceSchoolLogo ? (
                    <img src={invoiceSchoolLogo} alt="School Logo" className="w-14 h-14 object-contain rounded-xl border border-slate-100" />
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-orange-600 flex items-center justify-center text-white font-black text-2xl shadow-md">
                      {invoiceSchoolName.charAt(0)}
                    </div>
                  )}
                  <div>
                    <h1 className="text-lg font-black text-black dark:text-white tracking-tight leading-tight">{invoiceSchoolName}</h1>
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Official Fee Statement</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="inline-block px-4 py-1.5 bg-orange-100 text-orange-700 text-[10px] font-black rounded-lg uppercase tracking-widest mb-2">
                    📄 Fee Invoice
                  </div>
                  <p className="text-[11px] font-mono font-bold text-slate-500 block">
                    INV-{invoiceStudent.admissionNumber?.toUpperCase?.() || Date.now().toString().slice(-6)}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
              </div>

              {/* Student Info */}
              <div className="grid grid-cols-2 gap-4 mb-8 p-5 bg-slate-50 rounded-2xl border border-slate-100">
                <div>
                  <p className="text-[9px] uppercase tracking-widest font-black text-slate-400 mb-1">Learner Name</p>
                  <p className="font-black text-black dark:text-white text-sm leading-tight">{invoiceStudent.name}</p>
                </div>
                <div>
                  <p className="text-[9px] uppercase tracking-widest font-black text-slate-400 mb-1">Admission No.</p>
                  <p className="font-black text-black dark:text-white font-mono text-sm">{invoiceStudent.admissionNumber}</p>
                </div>
                <div>
                  <p className="text-[9px] uppercase tracking-widest font-black text-slate-400 mb-1">Grade / Stream</p>
                  <p className="font-bold text-black dark:text-white text-sm">{invoiceStudent.grade} {invoiceStudent.stream && `• ${invoiceStudent.stream}`}</p>
                </div>
                <div>
                  <p className="text-[9px] uppercase tracking-widest font-black text-slate-400 mb-1">Category</p>
                  <span className="inline-block px-3 py-1 bg-orange-100 text-orange-700 text-[10px] font-black rounded-full capitalize">
                    {invoiceStudent.boardingType || 'Day Scholar'}
                  </span>
                </div>
              </div>

              {/* Fee Breakdown Table */}
              {invoiceFeeStructures.length > 0 && (
                <div className="mb-6">
                  <p className="text-[9px] uppercase tracking-widest font-black text-slate-400 mb-3">Fee Breakdown</p>
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-slate-100">
                        <th className="text-left p-3 rounded-tl-xl font-black text-black dark:text-white text-[10px] uppercase tracking-wider">Description</th>
                        <th className="text-right p-3 rounded-tr-xl font-black text-black dark:text-white text-[10px] uppercase tracking-wider">Amount (KES)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoiceFeeStructures
                        .filter(f => !f.grade || f.grade === invoiceStudent.grade || f.grade === 'All')
                        .map((fee, i) => (
                        <tr key={i} className="border-b border-slate-100">
                          <td className="p-3 text-black dark:text-white font-medium">{fee.category}</td>
                          <td className="p-3 text-right font-mono font-bold text-black dark:text-white">
                            {(Number(fee.amount) || 0).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-orange-50">
                        <td className="p-3 font-black text-orange-700 rounded-bl-xl">Total Fees</td>
                        <td className="p-3 text-right font-black text-orange-700 font-mono rounded-br-xl">
                          KES {invoiceFeeStructures
                            .filter(f => !f.grade || f.grade === invoiceStudent.grade || f.grade === 'All')
                            .reduce((s, f) => s + (Number(f.amount) || 0), 0)
                            .toLocaleString()}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}

              {/* Payment History */}
              {invoicePayments.length > 0 && (
                <div className="mb-6">
                  <p className="text-[9px] uppercase tracking-widest font-black text-slate-400 mb-3">Payments Received</p>
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-slate-100">
                        <th className="text-left p-3 rounded-tl-xl font-black text-black dark:text-white text-[10px]">Date</th>
                        <th className="text-left p-3 font-black text-black dark:text-white text-[10px]">Method</th>
                        <th className="text-left p-3 font-black text-black dark:text-white text-[10px]">Reference</th>
                        <th className="text-right p-3 rounded-tr-xl font-black text-black dark:text-white text-[10px]">Amount (KES)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoicePayments.map((p, i) => (
                        <tr key={i} className="border-b border-slate-100">
                          <td className="p-3 text-black dark:text-white text-[11px]">
                            {new Date(p.date).toLocaleDateString('en-GB')}
                          </td>
                          <td className="p-3 text-black dark:text-white font-medium text-[11px]">{p.method}</td>
                          <td className="p-3 text-black dark:text-white font-mono text-[10px]">{p.code || p.reference || '—'}</td>
                          <td className="p-3 text-right font-mono font-bold text-green-700 text-[11px]">
                            {(p.amount || 0).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-green-50">
                        <td colSpan={3} className="p-3 font-black text-green-700 rounded-bl-xl">Total Paid</td>
                        <td className="p-3 text-right font-black text-green-700 font-mono rounded-br-xl">
                          KES {invoicePayments.reduce((s, p) => s + (p.amount || 0), 0).toLocaleString()}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}

              {/* Balance Summary */}
              {(() => {
                const totalFees = invoiceFeeStructures
                  .filter(f => !f.grade || f.grade === invoiceStudent.grade || f.grade === 'All')
                  .reduce((s, f) => s + (Number(f.amount) || 0), 0);
                const totalPaid = invoicePayments.reduce((s, p) => s + (p.amount || 0), 0);
                const balance = invoiceStudent.balance ?? (totalFees - totalPaid);
                const isCleared = balance <= 0;
                return (
                  <div className={`relative rounded-2xl p-6 border-2 mt-4 overflow-hidden ${isCleared ? 'border-green-200 bg-green-50' : 'border-rose-200 bg-rose-50'}`}>
                    {isCleared && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <span className="text-[80px] font-black text-green-200 opacity-30 rotate-[-20deg] select-none tracking-widest">PAID</span>
                      </div>
                    )}
                    <div className="relative flex items-end justify-between">
                      <div>
                        <p className={`text-[9px] uppercase tracking-widest font-black mb-1 ${isCleared ? 'text-green-600' : 'text-rose-500'}`}>
                          {isCleared ? 'Account Status' : 'Outstanding Balance'}
                        </p>
                        <p className={`text-3xl font-black tracking-tight ${isCleared ? 'text-green-600' : 'text-rose-600'}`}>
                          {isCleared ? '✅ Fully Paid' : `KES ${Math.abs(balance).toLocaleString()} Owing`}
                        </p>
                      </div>
                      {!isCleared && (
                        <div className="text-right">
                          <p className="text-[10px] font-black text-rose-500">Please clear balance</p>
                          <p className="text-[9px] text-slate-500 mt-0.5">Payment due this term</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Footer */}
              <div className="mt-8 pt-6 border-t border-slate-100 text-center">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                  This is a computer-generated document · {invoiceSchoolName}
                </p>
              </div>

            </div>{/* end printable body */}
          </div>
        </div>
      )}


      {/* Student Detail Modal */}
      {showStudentDetail && selectedStudentDetail && (
        <StudentDetailModal 
          student={selectedStudentDetail} 
          onClose={() => setShowStudentDetail(false)} 
        />
      )}
    </div>
  );
};

const StudentDetailModal: React.FC<{ student: any; onClose: () => void }> = ({ student, onClose }) => {
  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef: printRef,
  });

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white dark:bg-slate-900 w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-[2.5rem] shadow-2xl border border-white/20 dark:border-slate-800 flex flex-col relative animate-in zoom-in duration-500">
        <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between sticky top-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur z-10">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center text-blue-600 dark:text-blue-400">
              <UserCircle size={28} />
            </div>
            <div>
              <h3 className="text-xl font-bold dark:text-white">{student.name}</h3>
              <p className="text-xs font-bold text-black dark:text-white tracking-wider uppercase">{student.admissionNumber}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => handlePrint()}
              className="flex items-center gap-2 px-5 py-2.5 bg-orange-600 text-white rounded-xl text-xs font-bold hover:bg-orange-700 transition-all shadow-lg shadow-orange-500/20"
            >
              <Printer size={16} /> Generate PDF
            </button>
            <button 
              onClick={onClose}
              className="p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl hover:bg-slate-100 transition-all"
            >
              <X size={20} className="text-black dark:text-white" />
            </button>
          </div>
        </div>

        <div className="p-8 md:p-12 space-y-10" ref={printRef}>
          {/* Printable Content */}
          <div className="print:p-8">
            <div className="hidden print:flex flex-col items-center mb-10 border-b pb-8">
              <h1 className="text-2xl font-bold">STUDENT REGISTRATION DETAILS</h1>
              <p className="text-sm font-medium">BrightSoma eSchool Management Platform</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <div className="space-y-6">
                <h4 className="text-xs font-bold text-black dark:text-white uppercase tracking-[0.2em] border-b pb-2 border-slate-100">Core Information</h4>
                <div className="space-y-4">
                  {[
                    { label: 'Full Name', value: student.name },
                    { label: 'Admission No', value: student.admissionNumber },
                    { label: 'Grade', value: student.grade },
                    { label: 'Stream', value: student.stream || 'N/A' },
                    { label: 'Boarding Type', value: student.boardingType },
                    { label: 'Status', value: student.status },
                    { label: 'Date of Admission', value: student.dateOfAdmission }
                  ].map(item => (
                    <div key={item.label} className="flex justify-between items-center py-1">
                      <span className="text-[11px] font-bold text-black dark:text-white uppercase">{item.label}</span>
                      <span className="text-sm font-semibold text-black dark:text-slate-300">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-6">
                <h4 className="text-xs font-bold text-black dark:text-white uppercase tracking-[0.2em] border-b pb-2 border-slate-100">Parental Details</h4>
                <div className="space-y-4">
                   {[
                    { label: 'Father Name', value: student.parentInfo.fatherName || 'N/A' },
                    { label: 'Father Phone', value: student.parentInfo.fatherPhone || 'N/A' },
                    { label: 'Mother Name', value: student.parentInfo.motherName || 'N/A' },
                    { label: 'Mother Phone', value: student.parentInfo.motherPhone || 'N/A' },
                    { label: 'Emergency Contact', value: student.parentInfo.emergencyContact || 'N/A' }
                  ].map(item => (
                    <div key={item.label} className="flex justify-between items-center py-1">
                      <span className="text-[11px] font-bold text-black dark:text-white uppercase">{item.label}</span>
                      <span className="text-sm font-semibold text-black dark:text-slate-300">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-6 md:col-span-2">
                <h4 className="text-xs font-bold text-black dark:text-white uppercase tracking-[0.2em] border-b pb-2 border-slate-100">Medical & Special Needs</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                   {[
                    { label: 'Blood Group', value: student.medicalInfo.bloodGroup || 'Unknown' },
                    { label: 'Allergies', value: student.medicalInfo.allergies || 'None recorded' },
                    { label: 'Conditions', value: student.medicalInfo.conditions || 'None recorded' }
                  ].map(item => (
                    <div key={item.label} className="space-y-1">
                      <p className="text-[10px] font-bold text-black dark:text-white uppercase">{item.label}</p>
                      <p className="text-sm font-semibold text-black dark:text-slate-300">{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-12 p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
               <p className="text-[10px] font-bold text-black dark:text-white mb-1">Administrative Remarks</p>
               <p className="text-sm font-medium text-black dark:text-slate-400 italic">
                 {student.adminNotes || "No additional administrative notes recorded for this learner."}
               </p>
            </div>

            <div className="hidden print:block mt-20 pt-8 border-t text-center">
              <p className="text-[10px] font-bold">BrightSoma Certified Learner Record • Generated on {new Date().toLocaleDateString()}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentsModule;


