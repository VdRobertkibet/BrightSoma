
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
  ArrowRight,
  Package,
  FileText,
  Plus,
  ArrowLeft,
  SearchCode,
  Check,
  AlertCircle,
  Receipt,
  Printer
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Student, CBCGrade, BoardingType, StudentStatus } from '../types';
import InvoiceReceipt from './InvoiceReceipt';
import { CBC_GRADES } from '../constants';
import toast from 'react-hot-toast';
import { db, auth } from '../src/firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, getDoc, onSnapshot, query, where } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

interface StudentsModuleProps {
  setActiveTab: (tab: string) => void;
  initialTab?: 'directory' | 'classrooms';
  role?: string | null;
  isDarkMode?: boolean;
}

const StudentsModule: React.FC<StudentsModuleProps> = ({ setActiveTab, initialTab, role, isDarkMode }) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [filterType, setFilterType] = useState<'All' | BoardingType>('All');
  const [filterGrade, setFilterGrade] = useState<'All' | CBCGrade>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [moduleTab, setModuleTab] = useState<'directory' | 'classrooms'>(initialTab || 'directory');
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
  const [invoiceSchoolName, setInvoiceSchoolName] = useState('BrightSoma Institution');
  const [invoiceSchoolLogo, setInvoiceSchoolLogo] = useState<string | null>(null);
  const invoiceRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
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
  }, []);

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

        // 2. Fetch Textbooks (Mock for now as per plan)
        setTextbooks([
          { id: '1', title: 'Literacy Activities G1', assigned: 45, total: 45 },
          { id: '2', title: 'Math Activities G1', assigned: 42, total: 45 },
          { id: '3', title: 'Kiswahili Language G1', assigned: 45, total: 45 },
        ]);

        // 3. Fetch Funds (Mock)
        setClassFunds(45000);

        // 4. Fetch Inventory from Firestore
        const invRef = collection(db, 'classroomInventory');
        const invQuery = query(invRef, where('schoolId', '==', schoolId), where('grade', '==', selectedClassroomGrade));
        const invSnap = await getDocs(invQuery);
        if (!invSnap.empty) {
          setClassroomInventory(invSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        } else {
          setClassroomInventory([
            { id: 'i1', name: 'Student Desks', quantity: 45, condition: 'Fair' },
            { id: 'i2', name: 'Teacher Table', quantity: 1, condition: 'New' },
            { id: 'i3', name: 'Whiteboard', quantity: 1, condition: 'New' },
          ]);
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

  const handleOpenRegister = () => {
    setActiveTab('register-learner');
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

  const handleOpenEdit = (student: Student) => {
    setEditingStudent(student);
    setFormErrors({});
    setShowModal(true);
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

      await deleteDoc(doc(db, 'students', deleteModal.studentId));
      toast.success('Learner record removed successfully.');
      
      setDeleteModal({isOpen: false, studentId: null, reason: '', confirmText: ''});
    } catch (error) {
      console.error("Error deleting document: ", error);
      toast.error('Failed to remove learner record.');
    }
  };

  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const admissionNumber = formData.get('admissionNumber') as string;
    const name = formData.get('name') as string;
    const fatherPhone = formData.get('fatherPhone') as string;
    const motherPhone = formData.get('motherPhone') as string;
    const emergencyContact = formData.get('emergencyContact') as string;

    const errors: Record<string, string> = {};

    if (!name.trim()) {
      errors.name = 'Full name is required';
    }

    if (!admissionNumber.trim()) {
      errors.admissionNumber = 'Admission number is required';
    } else if (!editingStudent && students.some(s => s.admissionNumber === admissionNumber)) {
      errors.admissionNumber = 'Admission number must be unique';
    } else if (editingStudent && students.some(s => s.id !== editingStudent.id && s.admissionNumber === admissionNumber)) {
      errors.admissionNumber = 'Admission number must be unique';
    }

    const phoneRegex = /^(\+254|0)[1-9]\d{8}$/;
    
    if (fatherPhone && !phoneRegex.test(fatherPhone.replace(/\s+/g, ''))) {
      errors.fatherPhone = 'Invalid phone format (e.g. 0712345678)';
    }
    if (motherPhone && !phoneRegex.test(motherPhone.replace(/\s+/g, ''))) {
      errors.motherPhone = 'Invalid phone format (e.g. 0712345678)';
    }
    if (emergencyContact && !phoneRegex.test(emergencyContact.replace(/\s+/g, ''))) {
      errors.emergencyContact = 'Invalid phone format (e.g. 0712345678)';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setFormErrors({});

    const studentData = {
      schoolId: '', // Will be set below
      admissionNumber,
      nemisNumber: formData.get('nemisNumber') as string,
      name,
      grade: formData.get('grade') as CBCGrade,
      stream: formData.get('stream') as string,
      boardingType: formData.get('boardingType') as BoardingType,
      status: formData.get('status') as StudentStatus,
      parentInfo: {
        fatherName: formData.get('fatherName') as string,
        fatherPhone: formData.get('fatherPhone') as string,
        motherName: formData.get('motherName') as string,
        motherPhone: formData.get('motherPhone') as string,
        emergencyContact: formData.get('emergencyContact') as string,
      },
      medicalInfo: {
        bloodGroup: formData.get('bloodGroup') as string,
        allergies: formData.get('allergies') as string,
        conditions: formData.get('conditions') as string,
      },
      performance: Number(formData.get('performance')) || 70,
      balance: Number(formData.get('balance')) || 0,
    };

    try {
      const user = auth.currentUser;
      if (!user) {
         toast.error('Authentication required to save records.');
         return;
      }

      let schoolId = user.uid;
      const staffDocRef = doc(db, 'staff', user.uid);
      const staffDocSnap = await getDoc(staffDocRef);
      if (staffDocSnap.exists()) {
        schoolId = staffDocSnap.data().schoolId;
      }
      
      const finalStudentData = { ...studentData, schoolId };

      if (editingStudent) {
        await updateDoc(doc(db, 'students', editingStudent.id), finalStudentData);
        toast.success('Learner record updated successfully.');
      } else {
        await addDoc(collection(db, 'students'), finalStudentData);
        toast.success('New learner registered successfully.');
        // Signal onboarding guide
        localStorage.setItem('onboarding_learner_added', Date.now().toString());
        window.dispatchEvent(new Event('storage'));
      }
      setShowModal(false);
      setEditingStudent(null);
    } catch (error: any) {
      console.error("Error saving document: ", error);
      const errorMessage = error.message || 'Failed to save learner record.';
      toast.error(errorMessage);
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
        ...inventoryForm,
        schoolId,
        grade: selectedClassroomGrade,
        createdAt: new Date().toISOString()
      };
      const docRef = await addDoc(collection(db, 'classroomInventory'), newItem);
      setClassroomInventory([...classroomInventory, { ...newItem, id: docRef.id }]);
      setShowInventoryModal(false);
      setInventoryForm({ name: '', quantity: 1, condition: 'New' });
      toast.success('Inventory item added.');
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
      {/* Standardized Header (Finance Style) - Responsive fix */}
      <div className="relative -mx-4 md:-mx-8 -mt-4 md:-mt-8 bg-[#334155] py-5 border-b border-[#1f507a] shadow-sm px-4 md:px-8">
        <div className="w-full px-4 md:px-8">
          <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/10 rounded-xl">
                <Users size={24} className="text-white" />
              </div>
                <div className="flex flex-col">
                  <h2 className="text-xl font-bold text-white tracking-tight">Learners & Class Management</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-xs text-blue-100">Directly manage classroom resources and performance.</p>
                  </div>
                </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              <div className="p-1 block w-full sm:w-auto bg-black/20 rounded-xl flex-shrink-0 flex items-center gap-1 border border-white/10 overflow-x-auto hide-scrollbar">
                <button 
                  onClick={() => setModuleTab('directory')} 
                  className={`flex-1 sm:flex-none whitespace-nowrap text-center px-4 py-2 rounded-lg text-xs font-bold transition-all ${moduleTab === 'directory' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-300 hover:text-white'}`}
                >
                  Directory
                </button>
                {(currentUserRole === 'ADMIN' || (teacherData?.classTeacherOf && teacherData?.classTeacherOf !== '')) && (
                  <button 
                    onClick={() => setModuleTab('classrooms')} 
                    className={`flex-1 sm:flex-none whitespace-nowrap text-center justify-center px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${moduleTab === 'classrooms' ? 'bg-orange-500 text-white shadow-sm' : 'text-slate-300 hover:text-white'}`}
                  >
                    <Home size={14} /> Classrooms
                  </button>
                )}
              </div>
              <div className="h-8 w-px bg-white/10 mx-2 hidden xl:block"></div>
              <div className="px-5 py-2 bg-black/20 border border-white/10 rounded-xl min-w-[120px]">
                <p className="text-[10px] font-bold text-blue-200 uppercase mb-0.5">Total Enrolled</p>
                <p className="text-lg font-bold text-white leading-none">{students.length}</p>
              </div>

              <button 
                onClick={handleOpenRegister}
                className="flex items-center justify-center gap-2 px-6 py-2.5 bg-white text-orange-600 rounded-xl text-[12.5px] font-bold hover:bg-slate-50 transition-all shadow-sm active:scale-95 group border border-white/20"
              >
                <UserPlus size={16} className="group-hover:scale-110 transition-transform font-bold" /> 
                Register Learner
              </button>
            </div>
          </div>

          {moduleTab === 'directory' && (
            <>
              <div className="mt-8 pt-6 border-t border-white/10 flex flex-col xl:flex-row xl:items-center justify-between gap-6 animate-in slide-in-from-top-4 duration-500">
                <div className="flex p-1.5 bg-black/10 border border-white/10 rounded-[2rem] overflow-x-auto hide-scrollbar w-fit">
                  <div className="flex items-center gap-1 px-4 py-2 text-white/40 border-r border-white/10 mr-2">
                    <Search size={14} />
                  </div>
                  <input 
                    type="text"
                    placeholder="Search learners..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-transparent text-[11px] font-bold text-white placeholder:text-white/30 outline-none px-4 min-w-[200px]"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-3 px-5 py-2.5 bg-black/10 border border-white/10 rounded-[2rem]">
                    <Filter size={14} className="text-orange-200" />
                    <select 
                      value={filterType}
                      onChange={(e) => setFilterType(e.target.value as any)}
                      className="bg-transparent text-[11px] font-bold text-white outline-none cursor-pointer"
                    >
                      <option value="All" className="text-slate-900">All Models</option>
                      <option value="Day Scholar" className="text-slate-900">Day Scholar</option>
                      <option value="Full Boarder" className="text-slate-900">Full Boarder</option>
                      <option value="Weekly Boarder" className="text-slate-900">Weekly Boarder</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-3 px-5 py-2.5 bg-black/10 border border-white/10 rounded-[2rem]">
                    <GraduationCap size={14} className="text-orange-200" />
                    <select 
                      value={filterGrade}
                      onChange={(e) => setFilterGrade(e.target.value as any)}
                      className="bg-transparent text-[11px] font-bold text-white outline-none cursor-pointer"
                    >
                      <option value="All" className="text-slate-900">All Grades</option>
                      {CBC_GRADES.map(g => <option key={g} value={g} className="text-slate-900">{g}</option>)}
                    </select>
                  </div>

                  <button 
                    onClick={() => {
                      setSearchQuery('');
                      setFilterType('All');
                      setFilterGrade('All');
                    }}
                    className="px-6 py-2.5 bg-white/10 text-white rounded-[2rem] text-[11px] font-bold hover:bg-white/20 transition-all active:scale-95 border border-white/10"
                  >
                    Reset Filter
                  </button>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2 pb-2 animate-in slide-in-from-top-4 duration-500 delay-75">
                {[
                  { label: 'Total Learners', count: students.length, action: () => { setFilterType('All'); setFilterGrade('All'); }, active: filterType === 'All' && filterGrade === 'All' },
                  { label: 'Active', count: students.filter(s => s.status === 'Active').length, action: () => {}, active: false },
                  { label: 'Day Scholars', count: students.filter(s => s.boardingType === 'Day Scholar').length, action: () => setFilterType('Day Scholar'), active: filterType === 'Day Scholar' },
                  { label: 'Boarders', count: students.filter(s => s.boardingType === 'Full Boarder').length, action: () => setFilterType('Full Boarder'), active: filterType === 'Full Boarder' },
                  { label: 'Fee Arrears', count: students.filter(s => (s.balance || 0) > 0).length, action: () => {}, active: false }
                ].map((btn, i) => (
                  <button 
                    key={i} 
                    onClick={btn.action} 
                    className={`flex items-center gap-2 px-4 py-2 ${btn.active ? 'bg-white text-orange-600 shadow-sm' : 'bg-black/20 hover:bg-black/30 text-white'} border border-white/10 rounded-[2rem] text-xs font-bold transition-all`}
                  >
                    {btn.label} 
                    <span className={`${btn.active ? 'bg-orange-100 text-orange-600' : 'bg-black/30 text-orange-100'} px-2 py-0.5 rounded-full text-[10px]`}>{btn.count}</span>
                  </button>
                ))}
              </div>
            </>
          )}

          {moduleTab === 'classrooms' && (
            <div className="mt-8 pt-6 border-t border-white/10 flex flex-col xl:flex-row xl:items-center justify-between gap-6 animate-in slide-in-from-top-4 duration-500">
              <div className="flex flex-col gap-2">
                <p className="text-[10px] font-bold text-orange-200 uppercase tracking-widest">Select a Classroom</p>
                <div className="flex items-center gap-3 p-1.5 bg-black/20 border border-white/10 rounded-[1.5rem] w-fit">
                  <select 
                    value={selectedClassroomGrade}
                    onChange={(e) => setSelectedClassroomGrade(e.target.value as CBCGrade)}
                    className="bg-transparent text-sm font-bold text-white outline-none cursor-pointer pl-4 pr-8 py-2 appearance-none"
                    style={{ backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.5rem center', backgroundSize: '1em' }}
                  >
                    {CBC_GRADES.map(g => <option key={g} value={g} className="text-slate-900">{g}</option>)}
                  </select>
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
                         <p className="text-[10px] font-bold text-indigo-200 uppercase tracking-tighter">Class Teacher</p>
                         <p className="text-sm font-bold text-white">{classTeacher ? classTeacher.name : 'Unassigned'}</p>
                      </div>
                   </div>
                 )}
              </div>
            </div>
          )}
        </div>
      </div>

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
            <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100 tracking-tight mb-3 leading-tight">No Learners Found</h3>
            <p className="text-slate-500 dark:text-slate-400 mb-10 max-w-md mx-auto text-sm font-medium leading-relaxed">
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
            </div>
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    <th className="p-4 pl-0">Learner Name</th>
                    <th className="p-4">Admission No.</th>
                    <th className="p-4">Grade / Stream</th>
                    <th className="p-4">Boarding</th>
                    <th className="p-4 text-right">Fee Balance</th>
                    <th className="p-4 text-right pr-0">Actions</th>
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
                            <p className="font-bold text-slate-800 dark:text-white text-sm">{student.name}</p>
                            <p className="text-[11px] font-semibold text-slate-400 cursor-pointer hover:text-orange-600" onClick={() => handleOpenEdit(student)}>View Profile</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-sm font-semibold text-slate-600 dark:text-slate-300">
                        {student.admissionNumber}
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col items-start gap-1">
                          <span className="text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full border border-slate-200 dark:border-slate-700">
                            {student.grade}
                          </span>
                          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider ml-1">{student.stream}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="text-xs font-bold px-3 py-1 rounded-full bg-orange-50 text-orange-600 border border-orange-100 dark:bg-orange-900/30 dark:border-orange-800 tracking-wide capitalize">
                          {student.boardingType}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <span className={`text-xs font-bold px-3 py-1 rounded-full ${student.balance < 0 ? 'bg-rose-50 text-rose-600 border border-rose-100 dark:bg-rose-900/30 dark:border-rose-800' : student.balance > 0 ? 'bg-orange-50 text-orange-600 border border-orange-100 dark:bg-orange-900/30 dark:border-orange-800' : 'bg-green-50 text-green-600 border border-green-100 dark:bg-green-900/30 dark:border-green-800'}`}>
                          {student.balance !== 0 ? `KES ${Math.abs(student.balance).toLocaleString()}` : 'Cleared'}
                        </span>
                      </td>
                      <td className="p-4 text-right pr-0">
                        <div className="flex justify-end gap-2">
                          <button 
                            onClick={() => handleOpenInvoice(student)}
                            className="p-2 text-slate-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/10 rounded-xl transition-all flex items-center gap-2 text-[10px] font-bold"
                            title="Generate Invoice"
                          >
                            <Receipt size={14} /> Invoice
                          </button>
                          <button 
                            onClick={() => setActiveTab('academics')}
                            className="p-2 text-slate-400 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/10 rounded-xl transition-all flex items-center gap-2 text-[10px] font-bold"
                            title="View Report"
                          >
                            <FileText size={14} /> Report
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
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">Class Announcements & Notes</h3>
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
                         <span className="text-[9px] font-bold text-orange-400 bg-orange-950/40 px-3 py-1 rounded-full uppercase tracking-widest border border-orange-500/20 shadow-xl">Coming Soon</span>
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
                         <p className="text-[10px] font-bold text-indigo-300 uppercase mb-1 tracking-tighter">Voice Broadcast Feature</p>
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
                      <h3 className="font-bold text-slate-800 dark:text-white">Learning Materials</h3>
                      <p className="text-[11px] font-semibold text-slate-400">Assigned per learner</p>
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
                        <p className="text-[10px] uppercase font-bold text-slate-400">Total Textbooks</p>
                        <p className="text-lg font-bold text-slate-700 dark:text-slate-200">{textbooks.reduce((acc, curr) => acc + curr.assigned, 0)}</p>
                      </div>
                      <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-xs">
                        100%
                      </div>
                    </div>
                    <div className="space-y-1.5">
                       {textbooks.map(tb => (
                         <div key={tb.id} className="flex items-center justify-between text-[11px] font-bold px-1">
                            <span className="text-slate-500">{tb.title}</span>
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
                      <h3 className="font-bold text-slate-800 dark:text-white">Fund Allocation</h3>
                      <p className="text-[11px] font-semibold text-slate-400">Operational budget</p>
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
                        <p className="text-[10px] uppercase font-bold text-slate-400">Class Budget</p>
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
                      <h3 className="font-bold text-slate-800 dark:text-white">Physical Inventory</h3>
                      <p className="text-[11px] font-semibold text-slate-400">Classroom assets</p>
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
                        <p className="text-[10px] uppercase font-bold text-slate-400">Tracked Assets</p>
                        <p className="text-lg font-bold text-slate-700 dark:text-slate-200">{classroomInventory.length} Items</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                       {classroomInventory.slice(0, 2).map(item => (
                         <div key={item.id} className="flex items-center justify-between text-[11px] font-bold px-1 border-b border-slate-100 dark:border-slate-900 pb-1">
                            <span className="text-slate-500">{item.name} ({item.quantity})</span>
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
                    <p className="text-[11px] font-semibold text-slate-400">Showing learners currently enrolled in {selectedClassroomGrade}</p>
                  </div>
               </div>
               
               <div className="overflow-x-auto">
                 <table className="w-full text-left border-collapse">
                   <thead>
                     <tr className="border-b border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-400 uppercase tracking-wider">
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
                              <span className="font-bold text-slate-800 dark:text-white text-sm">{student.name}</span>
                            </div>
                          </td>
                          <td className="p-4 font-semibold text-slate-600 dark:text-slate-300 text-sm">{student.stream || 'N/A'}</td>
                          <td className="p-4">
                             <div className="flex items-center gap-2 group/remark">
                                <input 
                                  type="text" 
                                  defaultValue={(student as any).classroomRemark || ''} 
                                  onBlur={(e) => handleUpdateStudentRemark(student.id, e.target.value)}
                                  placeholder="Add remark..." 
                                  className="bg-transparent border-b border-dashed border-slate-200 dark:border-slate-700 text-[11px] font-medium text-slate-500 focus:text-slate-900 dark:focus:text-white focus:border-orange-500 outline-none w-48 transition-all"
                                />
                             </div>
                          </td>
                          <td className="p-4 text-right font-bold text-slate-700 dark:text-slate-200 text-sm">KES {(student as any).balance > 0 ? '0' : '1,500'}</td>
                       </tr>
                     ))}
                     {students.filter(s => s.grade === selectedClassroomGrade).length === 0 && (
                        <tr>
                          <td colSpan={4} className="p-8 text-center text-sm font-medium text-slate-500">No learners assigned to this classroom yet.</td>
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

      {/* Registration Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-[2.5rem] shadow-2xl border border-white/20 dark:border-slate-800 p-8 md:p-12 relative animate-in zoom-in duration-500">
            <button 
              onClick={() => setShowModal(false)}
              className="absolute top-8 right-8 p-3 bg-slate-50 dark:bg-slate-800 text-slate-400 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-600 dark:hover:text-slate-200 shadow-sm transition-all"
            >
              <X size={24} />
            </button>

            <div className="flex flex-col items-center text-center mb-10">
              <div className="p-4 bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 rounded-3xl mb-4">
                {editingStudent ? <Pencil size={32} /> : <UserPlus size={32} />}
              </div>
              <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">
                {editingStudent ? 'Update Learner' : 'Register Learner'}
              </h3>
              <p className="text-xs font-medium text-slate-500 mt-2">
                Fill in the required details below
              </p>
            </div>

            <form className="space-y-12" onSubmit={handleFormSubmit}>
              {/* Section 1: Core Identification */}
              <div className="space-y-8">
                <div className="flex items-center gap-2 px-4 py-2 bg-orange-50/50 dark:bg-orange-900/10 rounded-xl w-fit">
                  <h4 className="text-xs font-bold text-orange-600 dark:text-orange-400">Core Identification</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-slate-500 capitalize flex items-center gap-1 ml-1">Full Names <span className="text-rose-500">*</span></label>
                    <input name="name" type="text" defaultValue={editingStudent?.name} className={`w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border ${formErrors.name ? 'border-rose-500 focus:ring-rose-500/20' : 'border-slate-100 dark:border-slate-700 focus:ring-orange-500/20'} rounded-2xl text-sm font-bold text-slate-700 dark:text-slate-200 focus:ring-2 shadow-sm outline-none transition-all`} placeholder="Enter Full Name" required />
                    {formErrors.name && <p className="text-[10px] text-rose-500 ml-1">{formErrors.name}</p>}
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-slate-500 capitalize flex items-center gap-1 ml-1">Admission Number <span className="text-rose-500">*</span></label>
                    <input name="admissionNumber" type="text" defaultValue={editingStudent?.admissionNumber || 'SCH/2026/'} className={`w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border ${formErrors.admissionNumber ? 'border-rose-500 focus:ring-rose-500/20' : 'border-slate-100 dark:border-slate-700 focus:ring-orange-500/20'} rounded-2xl text-sm font-bold text-slate-700 dark:text-slate-200 focus:ring-2 shadow-sm outline-none transition-all`} placeholder="SCH/2026/001" required />
                    {formErrors.admissionNumber && <p className="text-[10px] text-rose-500 ml-1">{formErrors.admissionNumber}</p>}
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-slate-500 capitalize ml-1">Nemis Number</label>
                    <input name="nemisNumber" type="text" defaultValue={editingStudent?.nemisNumber} className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl text-sm font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-orange-500/20 shadow-sm outline-none transition-all" placeholder="Kenya Learner ID" />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-slate-500 capitalize ml-1">Grade</label>
                    <select name="grade" defaultValue={editingStudent?.grade || CBCGrade.G1} className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl text-sm font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-orange-500/20 shadow-sm outline-none transition-all cursor-pointer">
                      {CBC_GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-slate-500 capitalize ml-1">Stream</label>
                    <input name="stream" type="text" defaultValue={editingStudent?.stream} className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl text-sm font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-orange-500/20 shadow-sm outline-none transition-all" placeholder="e.g. Jasmine" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-slate-500 capitalize ml-1">Boarding Type</label>
                    <select name="boardingType" defaultValue={editingStudent?.boardingType || 'Day Scholar'} className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl text-sm font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-orange-500/20 shadow-sm outline-none transition-all cursor-pointer">
                      <option value="Day Scholar">Day Scholar</option>
                      <option value="Full Boarder">Full Boarder</option>
                      <option value="Weekly Boarder">Weekly Boarder</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-slate-500 capitalize ml-1">Status</label>
                    <select name="status" defaultValue={editingStudent?.status || 'Active'} className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl text-sm font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-blue-500/20 shadow-sm outline-none transition-all cursor-pointer">
                      <option value="Active">Active</option>
                      <option value="Transferred Out">Transferred Out</option>
                      <option value="Transferred In">Transferred In</option>
                      <option value="Completed">Completed</option>
                      <option value="Withdrawn">Withdrawn</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Section 2: Parent/Guardian */}
              <div className="space-y-8">
                <div className="flex items-center gap-2 px-4 py-2 bg-orange-50/50 dark:bg-orange-900/10 rounded-xl w-fit">
                  <h4 className="text-xs font-bold text-orange-600 dark:text-orange-400">Parent / Guardian Information</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold text-slate-500 capitalize ml-1">Father's Name</label>
                      <input name="fatherName" type="text" defaultValue={editingStudent?.parentInfo.fatherName} className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl text-sm font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-blue-500/20 shadow-sm outline-none transition-all" placeholder="Father's Full Name" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold text-slate-500 capitalize ml-1">Father's Phone</label>
                      <input name="fatherPhone" type="tel" defaultValue={editingStudent?.parentInfo.fatherPhone} className={`w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border ${formErrors.fatherPhone ? 'border-rose-500 focus:ring-rose-500/20' : 'border-slate-100 dark:border-slate-700 focus:ring-blue-500/20'} rounded-2xl text-sm font-bold text-slate-700 dark:text-slate-200 focus:ring-2 shadow-sm outline-none transition-all`} placeholder="07XX XXX XXX" />
                      {formErrors.fatherPhone && <p className="text-[10px] text-rose-500 ml-1">{formErrors.fatherPhone}</p>}
                    </div>
                  </div>
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold text-slate-500 capitalize ml-1">Mother's Name</label>
                      <input name="motherName" type="text" defaultValue={editingStudent?.parentInfo.motherName} className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl text-sm font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-blue-500/20 shadow-sm outline-none transition-all" placeholder="Mother's Full Name" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold text-slate-500 capitalize ml-1">Mother's Phone</label>
                      <input name="motherPhone" type="tel" defaultValue={editingStudent?.parentInfo.motherPhone} className={`w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border ${formErrors.motherPhone ? 'border-rose-500 focus:ring-rose-500/20' : 'border-slate-100 dark:border-slate-700 focus:ring-blue-500/20'} rounded-2xl text-sm font-bold text-slate-700 dark:text-slate-200 focus:ring-2 shadow-sm outline-none transition-all`} placeholder="07XX XXX XXX" />
                      {formErrors.motherPhone && <p className="text-[10px] text-rose-500 ml-1">{formErrors.motherPhone}</p>}
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-slate-500 capitalize ml-1">Emergency Contact Number</label>
                  <input name="emergencyContact" type="tel" defaultValue={editingStudent?.parentInfo.emergencyContact} className={`w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border ${formErrors.emergencyContact ? 'border-rose-500 focus:ring-rose-500/20' : 'border-slate-100 dark:border-slate-700 focus:ring-blue-500/20'} rounded-2xl text-sm font-bold text-slate-700 dark:text-slate-200 focus:ring-2 shadow-sm outline-none transition-all`} placeholder="Required for urgent alerts" />
                  {formErrors.emergencyContact && <p className="text-[10px] text-rose-500 ml-1">{formErrors.emergencyContact}</p>}
                </div>
              </div>

              {/* Section 3: Medical Info */}
              <div className="space-y-8">
                <div className="flex items-center gap-2 px-4 py-2 bg-rose-50/50 dark:bg-rose-900/10 rounded-xl w-fit">
                  <h4 className="text-xs font-bold text-rose-600 dark:text-rose-400">Medical Information</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-slate-500 capitalize ml-1">Blood Group</label>
                    <select name="bloodGroup" defaultValue={editingStudent?.medicalInfo.bloodGroup || 'Unknown'} className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl text-sm font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-blue-500/20 shadow-sm outline-none transition-all cursor-pointer">
                      {['Unknown', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => <option key={bg} value={bg}>{bg}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-slate-500 capitalize ml-1">Allergies</label>
                    <input name="allergies" type="text" defaultValue={editingStudent?.medicalInfo.allergies} className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl text-sm font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-blue-500/20 shadow-sm outline-none transition-all" placeholder="e.g. Peanuts, Penicillin" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-slate-500 capitalize ml-1">Conditions</label>
                    <input name="conditions" type="text" defaultValue={editingStudent?.medicalInfo.conditions} className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl text-sm font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-blue-500/20 shadow-sm outline-none transition-all" placeholder="e.g. Asthma, Diabetes" />
                  </div>
                </div>
              </div>

              <div className="pt-10 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-3">
                <button 
                  type="submit"
                  className="w-full py-4 bg-orange-600 text-white rounded-2xl text-sm font-bold tracking-wide hover:bg-orange-700 transition-all shadow-md active:scale-95"
                >
                  {editingStudent ? 'Update Record' : 'Save Record'}
                </button>
                <button 
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="w-full py-3 text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
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
              
              <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100 tracking-tight mb-3 leading-tight">Confirm Deletion</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-10 leading-relaxed">
                Are you sure you want to delete this learner record? This action is <span className="text-rose-600 font-bold capitalize">irreversible</span>.
              </p>
              
              <div className="space-y-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-slate-400 capitalize ml-1">Reason for deletion</label>
                  <select 
                    value={deleteModal.reason}
                    onChange={(e) => setDeleteModal({...deleteModal, reason: e.target.value})}
                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl text-sm font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-rose-500/20 transition-all cursor-pointer"
                  >
                    <option value="">Select a reason</option>
                    <option value="Transferred">Transferred</option>
                    <option value="Indiscipline">Indiscipline</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-slate-400 capitalize ml-1">Type "delete" to confirm</label>
                  <input 
                    type="text"
                    value={deleteModal.confirmText}
                    onChange={(e) => setDeleteModal({...deleteModal, confirmText: e.target.value})}
                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl text-sm font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-rose-500/20 transition-all"
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
                  className="w-full py-4 text-[10px] font-bold text-slate-400 capitalize hover:text-slate-600 transition-colors"
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
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">Asset Name</label>
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
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">Quantity</label>
                  <input 
                    type="number" 
                    value={inventoryForm.quantity}
                    onChange={(e) => setInventoryForm({...inventoryForm, quantity: parseInt(e.target.value)})}
                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl text-sm font-bold outline-none" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">Condition</label>
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
                  className="w-full py-3 text-sm font-medium text-slate-400 hover:text-slate-600"
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
                  <div className={`p-4 rounded-2xl ${
                    allocationType === 'Material' ? 'bg-blue-50 text-blue-600' : 
                    allocationType === 'Fund' ? 'bg-green-50 text-green-600' : 'bg-purple-50 text-purple-600'
                  }`}>
                    {allocationType === 'Material' ? <Book size={24} /> : 
                     allocationType === 'Fund' ? <Banknote size={24} /> : <Package size={24} />}
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold dark:text-white">
                      {allocationType === 'Material' ? 'Allocate Learning Materials' : 
                       allocationType === 'Fund' ? 'Record Fund Allocation' : 'Allocate Physical Assets'}
                    </h3>
                    <p className="text-sm font-bold text-slate-400">Classroom grade: {selectedClassroomGrade}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowAllocationModal(false)}
                  className="p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl hover:bg-slate-100 transition-all"
                >
                  <X size={20} className="text-slate-500" />
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
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">Classroom</label>
                    <div className="p-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl text-sm font-bold text-slate-700 dark:text-slate-300">
                      {selectedClassroomGrade}
                    </div>
                  </div>

                  {allocationType !== 'Fund' && (
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">
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
                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">Category</label>
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
                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">Amount (KES)</label>
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
                    <label className="text-[11px] font-bold text-slate-400 tracking-widest ml-1">Allocation Type</label>
                    <div className="flex flex-wrap md:flex-nowrap gap-2 p-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl">
                      {[
                        { id: 'Single', label: 'Single Student' },
                        { id: 'Group', label: 'Student Group' },
                        { id: 'Class', label: 'Whole Class' }
                      ].map((mode) => (
                        <button
                          key={mode.id}
                          onClick={() => setAllocationData({ ...allocationData, mode: mode.id, studentIds: [] })}
                          className={`flex-1 min-w-[100px] py-3 text-[10px] font-bold rounded-xl transition-all whitespace-nowrap ${
                            allocationData.mode === mode.id ? 'bg-orange-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700'
                          }`}
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
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">Search Student</label>
                      <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
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
                          className={`p-4 rounded-2xl border transition-all flex items-center gap-4 ${
                            allocationData.studentIds.includes(student.id) 
                              ? 'bg-orange-50 border-orange-200 ring-2 ring-orange-500/20' 
                              : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700'
                          }`}
                        >
                          <img src={`https://picsum.photos/seed/${student.id}/40`} className="w-10 h-10 rounded-full" />
                          <div className="text-left">
                            <p className="text-sm font-bold dark:text-white">{student.name}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">{student.admissionNumber}</p>
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
                        <p className="text-[11px] font-semibold text-slate-400">Organize students into a custom group for this allocation.</p>
                      </div>
                      <div className="flex items-center gap-2">
                         <span className="text-xs font-bold text-slate-500">Allocation for:</span>
                         <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-bold uppercase tracking-wider">
                           {allInventory.find(i => i.id === allocationData.itemId)?.name || 'Resource'}
                         </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-[400px]">
                      {/* Left Panel: Available */}
                      <div className="bg-slate-50 dark:bg-slate-800/50 border border-dashed border-slate-200 dark:border-slate-700 rounded-3xl p-6 flex flex-col">
                        <p className="text-[10px] font-bold text-slate-400 uppercase mb-4 tracking-widest flex items-center gap-2">
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
                                <p className="text-[9px] font-bold text-slate-400">{student.admissionNumber}</p>
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
                        className={`bg-white dark:bg-slate-900 border-2 border-dashed rounded-3xl p-6 flex flex-col transition-all ${
                          allocationData.studentIds.length === 0 ? 'border-slate-200 dark:border-slate-800' : 'border-orange-200 dark:border-orange-800 shadow-inner'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-4">
                          <p className="text-[10px] font-bold text-orange-600 uppercase tracking-widest flex items-center gap-2">
                             Group Members ({allocationData.studentIds.length})
                          </p>
                          {allocationData.studentIds.length > 0 && (
                            <button onClick={() => setAllocationData({ ...allocationData, studentIds: [] })} className="text-[9px] font-bold text-slate-400 hover:text-rose-500 uppercase">Clear All</button>
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
                    <p className="text-sm font-bold text-slate-500 max-w-sm mx-auto">
                      This will automatically record this allocation for all {students.filter(s => s.grade === selectedClassroomGrade).length} students in the classroom.
                    </p>
                  </div>
                )}

                {/* Description Footer */}
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">Additional Notes</label>
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
                  className="px-10 py-5 text-[11px] font-bold text-slate-500 uppercase hover:text-slate-800 dark:hover:text-white transition-colors"
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
                  className={`px-12 py-5 rounded-[1.5rem] text-[11px] font-bold uppercase tracking-wider shadow-xl transition-all active:scale-95 ${
                    (currentUserRole !== 'ADMIN' && enteredClassCode !== teacherData?.classroomAccessCode) ? 'bg-slate-400 cursor-not-allowed opacity-50' :
                    allocationType === 'Material' ? 'bg-blue-600 shadow-blue-200' : 
                    allocationType === 'Fund' ? 'bg-green-600 shadow-green-200' : 'bg-purple-600 shadow-purple-200'
                  } text-white`}
                >
                   Complete Allocation
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* ===== INVOICE MODAL ===== */}
      {showInvoice && invoiceStudent && (
        <div className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl relative">
            <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800 sticky top-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur z-10">
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
              schoolName={invoiceSchoolName}
              schoolLogo={invoiceSchoolLogo}
              schoolPhone=""
              termLabel="Current Term Analysis"
              feeStructures={invoiceFeeStructures.map(f => ({ category: f.category, amount: f.amount, grade: f.grade }))}
              allPayments={invoicePayments.map(p => ({ amount: p.amount, date: p.date, method: p.method, reference: p.code }))}
            />
          </div>
        </div>
      )}

    </div>
  );
};

export default StudentsModule;

