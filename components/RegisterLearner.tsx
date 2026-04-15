import React, { useState } from 'react';
import {
  UserPlus, ArrowLeft, GraduationCap, Wallet, Home,
  Users, Activity, FileText, Bus, FileEdit, UploadCloud, X, CheckCircle2,
  UserCheck, Download, Bell, Package, BookOpen
} from 'lucide-react';
import { CBCGrade, BoardingType, StudentStatus } from '../types';
import { CBC_GRADES } from '../constants';
import toast from 'react-hot-toast';
import { db, auth } from '../src/firebase';
import { collection, addDoc, getDoc, doc, query, where, orderBy, limit, getDocs, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../src/firebase';
import { sendRealSMS } from '../services/smsService';

interface RegisterLearnerProps {
  setActiveTab: (tab: string) => void;
}

const RegisterLearner: React.FC<RegisterLearnerProps> = ({ setActiveTab }) => {
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [transportRequired, setTransportRequired] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, File>>({});
  const [autoAdmissionNumber, setAutoAdmissionNumber] = useState(`SCH/${new Date().getFullYear()}/`);
  const [isGeneratingAdmn, setIsGeneratingAdmn] = useState(true);
  const [isBoarding, setIsBoarding] = useState(false);
  const [boardingEquipment, setBoardingEquipment] = useState<{id: string, item: string, checked: boolean}[]>([
    { id: '1', item: 'Mattress (3x6)', checked: false },
    { id: '2', item: 'Metal Box', checked: false },
    { id: '3', item: 'Basin & Bucket', checked: false },
    { id: '4', item: '2 Blankets & Bed Sheets', checked: false },
    { id: '5', item: 'Mosquito Net', checked: false }
  ]);
  const [dayScholarChecklist, setDayScholarChecklist] = useState<{id: string, item: string, checked: boolean}[]>([
    { id: '1', item: 'English Textbook', checked: false },
    { id: '2', item: 'Math Textbook', checked: false },
    { id: '3', item: 'Exercise Books (Set of 12)', checked: false },
    { id: '4', item: 'School Uniform (Full Set)', checked: false },
    { id: '5', item: 'Mathematical Set', checked: false }
  ]);
  const [allocatedItems, setAllocatedItems] = useState<{id: string, item: string, checked: boolean}[]>([
    { id: '1', item: 'Library Card', checked: false },
    { id: '2', item: 'School Diary', checked: false },
    { id: '3', item: 'Locker Key', checked: false }
  ]);
  const [newEquipment, setNewEquipment] = useState('');
  const [newDayItem, setNewDayItem] = useState('');
  const [newAllocatedItem, setNewAllocatedItem] = useState('');
  const [transportNotifs, setTransportNotifs] = useState({
    busArrived: true,
    boarded: true,
    arrivedSchool: true,
    dropped: true
  });
  
  const [selectedGrade, setSelectedGrade] = useState<CBCGrade>(CBC_GRADES[0] as CBCGrade);
  const [classTeacher, setClassTeacher] = useState<any>(null);
  const [otherTeachers, setOtherTeachers] = useState<any[]>([]);
  const [isLoadingTeachers, setIsLoadingTeachers] = useState(false);
  const [dorms, setDorms] = useState<any[]>([]);
  const [selectedDormId, setSelectedDormId] = useState<string>('');
  const [availableStreams, setAvailableStreams] = useState<string[]>([]);

  React.useEffect(() => {
    const fetchStreams = async () => {
      if (!selectedGrade) return;
      try {
        const user = auth.currentUser;
        if (!user) return;
        let schoolId = user.uid;
        const staffDocRef = doc(db, 'staff', user.uid);
        const staffDocSnap = await getDoc(staffDocRef);
        if (staffDocSnap.exists()) {
          schoolId = staffDocSnap.data().schoolId;
        }
        
        const profileRef = doc(db, 'schools', schoolId);
        const profileSnap = await getDoc(profileRef);
        if (profileSnap.exists()) {
          const streams = profileSnap.data().streams || [];
          const filtered = streams
            .filter((s: string) => s.startsWith(`${selectedGrade}:`))
            .map((s: string) => s.split(':')[1].trim());
          setAvailableStreams(filtered);
        }
      } catch (err) {
        console.error("Error fetching streams:", err);
      }
    };
    fetchStreams();
  }, [selectedGrade]);

  React.useEffect(() => {
    const fetchLatestAdmissionNumber = async () => {
      try {
        const user = auth.currentUser;
        let schoolId = 'mock-school-id';
        if (user) {
          schoolId = user.uid;
        }

        const currentYear = new Date().getFullYear();
        const prefix = `SCH/${currentYear}/`;

        if (user) {
          const q = query(
            collection(db, 'students'),
            where('schoolId', '==', schoolId)
          );

          const querySnapshot = await getDocs(q);
          let maxNum = 0;

          querySnapshot.forEach((doc) => {
            const admn = doc.data().admissionNumber as string;
            if (admn && admn.startsWith(prefix)) {
              const parts = admn.split('/');
              const lastNum = parseInt(parts[parts.length - 1], 10);
              if (!isNaN(lastNum) && lastNum > maxNum) {
                maxNum = lastNum;
              }
            }
          });

          const nextNum = (maxNum + 1).toString().padStart(3, '0');
          setAutoAdmissionNumber(`${prefix}${nextNum}`);
        } else {
          setAutoAdmissionNumber(`${prefix}001`);
        }
      } catch (error) {
        console.error("Error fetching latest admission number:", error);
        setAutoAdmissionNumber(`SCH/${new Date().getFullYear()}/001`);
      } finally {
        setIsGeneratingAdmn(false);
      }
    };

    fetchLatestAdmissionNumber();
  }, []);

  // Fetch Class Teacher and Grade Teachers
  React.useEffect(() => {
    const fetchGradeStaff = async () => {
      if (!selectedGrade) return;
      setIsLoadingTeachers(true);
      try {
        const user = auth.currentUser;
        if (!user) return;
        const schoolId = user.uid;

        const q = query(
          collection(db, 'staff'),
          where('schoolId', '==', schoolId),
          where('role', '==', 'TEACHER')
        );

        const snap = await getDocs(q);
        const teachers: any[] = [];
        snap.forEach(doc => teachers.push({ id: doc.id, ...doc.data() }));

        const classT = teachers.find(t => t.classTeacherOf === selectedGrade);
        const others = teachers.filter(t => 
          t.classTeacherOf !== selectedGrade && 
          (t.teachingGrades?.includes(selectedGrade))
        );

        setClassTeacher(classT || null);
        setOtherTeachers(others);
      } catch (error) {
        console.error("Error fetching grade staff:", error);
      } finally {
        setIsLoadingTeachers(false);
      }
    };

    fetchGradeStaff();
  }, [selectedGrade]);

  // Fetch Dormitories for selection
  React.useEffect(() => {
    const fetchDorms = async () => {
      try {
        const user = auth.currentUser;
        if (!user) return;
        
        let schoolId = user.uid;
        const staffDocRef = doc(db, 'staff', user.uid);
        const staffDocSnap = await getDoc(staffDocRef);
        if (staffDocSnap.exists()) {
          schoolId = staffDocSnap.data().schoolId;
        }

        const q = query(collection(db, 'dormitories'), where('schoolId', '==', schoolId));
        const snap = await getDocs(q);
        const dormList: any[] = [];
        snap.forEach(doc => dormList.push({ id: doc.id, ...doc.data() }));
        setDorms(dormList);
      } catch (error) {
        console.error("Error fetching dorms:", error);
      }
    };
    fetchDorms();
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, fieldName: string) => {
    if (e.target.files && e.target.files[0]) {
      setUploadedFiles(prev => ({
        ...prev,
        [fieldName]: e.target.files![0]
      }));
    }
  };

  const removeFile = (fieldName: string) => {
    setUploadedFiles(prev => {
      const newFiles = { ...prev };
      delete newFiles[fieldName];
      return newFiles;
    });
  };

  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const admissionNumber = formData.get('admissionNumber') as string;
    const name = formData.get('name') as string;
    const emergencyContact = formData.get('emergencyContact') as string;
    const fatherPhone = formData.get('fatherPhone') as string;
    const motherPhone = formData.get('motherPhone') as string;
    const guardianPhone = formData.get('guardianPhone') as string;

    const errors: Record<string, string> = {};

    if (!name.trim()) {
      errors.name = 'Full name is required';
    }

    if (!admissionNumber.trim()) {
      errors.admissionNumber = 'Admission number is required';
    }

    const kenyanPhoneRegex = /^(?:254|\+254|0)?([17]\d{8})$/;

    if (!emergencyContact.trim()) {
      errors.emergencyContact = 'Emergency contact is required';
    } else if (!kenyanPhoneRegex.test(emergencyContact.replace(/\s+/g, ''))) {
      errors.emergencyContact = 'Invalid Kenyan phone number format';
    }

    if (fatherPhone && !kenyanPhoneRegex.test(fatherPhone.replace(/\s+/g, ''))) {
      errors.fatherPhone = 'Invalid Kenyan phone number format';
    }

    if (motherPhone && !kenyanPhoneRegex.test(motherPhone.replace(/\s+/g, ''))) {
      errors.motherPhone = 'Invalid Kenyan phone number format';
    }

    if (guardianPhone && !kenyanPhoneRegex.test(guardianPhone.replace(/\s+/g, ''))) {
      errors.guardianPhone = 'Invalid Kenyan phone number format';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      toast.error('Please fix the errors in the form.');
      return;
    }

    setFormErrors({});

    const initialAmountPaidStr = formData.get('initialAmountPaid') as string;
    const initialAmountPaid = parseFloat(initialAmountPaidStr) || 0;
    const paymentMethod = formData.get('paymentMethod') as string || 'Cash';

    const studentData = {
      schoolId: '', // Will be set below
      admissionNumber,
      nemisNumber: formData.get('nemisNumber') as string,
      birthCertificateNumber: formData.get('birthCertificateNumber') as string,
      dateOfBirth: formData.get('dateOfBirth') as string,
      gender: formData.get('gender') as string,
      nationality: formData.get('nationality') as string,
      name,
      grade: formData.get('grade') as CBCGrade,
      stream: formData.get('stream') as string,
      boardingType: formData.get('boardingType') as BoardingType,
      boardingDetails: isBoarding ? {
        dormId: selectedDormId,
        dormName: dorms.find(d => d.id === selectedDormId)?.name || '',
        matronName: formData.get('matronName') as string,
        equipmentChecklist: boardingEquipment
      } : null,
      dayScholarDetails: !isBoarding ? {
        checklist: dayScholarChecklist
      } : null,
      allocatedItems: allocatedItems,
      classTeacherInfo: classTeacher ? {
        id: classTeacher.id,
        name: classTeacher.name,
      } : null,
      dateOfAdmission: formData.get('dateOfAdmission') as string,
      status: formData.get('status') as StudentStatus,
      parentInfo: {
        fatherName: formData.get('fatherName') as string,
        fatherPhone: formData.get('fatherPhone') as string,
        fatherId: formData.get('fatherId') as string,
        motherName: formData.get('motherName') as string,
        motherPhone: formData.get('motherPhone') as string,
        motherId: formData.get('motherId') as string,
        guardianName: formData.get('guardianName') as string,
        guardianPhone: formData.get('guardianPhone') as string,
        emergencyContact: emergencyContact,
      },
      medicalInfo: {
        bloodGroup: formData.get('bloodGroup') as string,
        allergies: formData.get('allergies') as string,
        conditions: formData.get('conditions') as string,
        specialNeeds: formData.get('specialNeeds') as string,
        medication: formData.get('medication') as string,
      },
      transport: transportRequired ? {
        required: true,
        route: formData.get('route') as string,
        pickupPoint: formData.get('pickupPoint') as string,
        busNumber: formData.get('busNumber') as string,
        notifications: transportNotifs
      } : { required: false },
      adminNotes: formData.get('adminNotes') as string,
      performance: 0,
      balance: -initialAmountPaid,
      createdAt: new Date().toISOString(),
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

      // Upload files
      const fileUrls: Record<string, string> = {};
      for (const [fieldName, file] of Object.entries(uploadedFiles) as [string, File][]) {
        const fileRef = ref(storage, `students/${schoolId}/${admissionNumber}/${fieldName}_${file.name}`);
        await uploadBytes(fileRef, file);
        const downloadURL = await getDownloadURL(fileRef);
        fileUrls[fieldName] = downloadURL;
      }

      // Add file URLs to student data
      const studentDataWithFiles = {
        ...finalStudentData,
        files: fileUrls
      };

      const newStudentRef = await addDoc(collection(db, 'students'), studentDataWithFiles);

      // Update Dormitory Occupancy
      if (isBoarding && selectedDormId) {
        try {
          const dormRef = doc(db, 'dormitories', selectedDormId);
          const dormSnap = await getDoc(dormRef);
          if (dormSnap.exists()) {
            const currentDormData = dormSnap.data();
            const updatedStudentIds = [...(currentDormData.studentIds || []), newStudentRef.id];
            await updateDoc(dormRef, {
              studentIds: updatedStudentIds,
              currentOccupancy: updatedStudentIds.length
            });
          }
        } catch (dormErr) {
          console.error("Failed to update dorm occupancy:", dormErr);
        }
      }

      if (initialAmountPaid > 0) {
        await addDoc(collection(db, 'payments'), {
          schoolId,
          studentId: newStudentRef.id,
          studentName: name,
          admissionNumber: admissionNumber,
          amount: initialAmountPaid,
          date: new Date().toISOString(),
          method: paymentMethod,
          term: 'Term 1 2026',
          year: new Date().getFullYear(),
          type: 'Admission Payment',
          status: 'Completed'
        });
      }

      // 🛡️ Generate Parent Access Code for the new learner
      const parentCode = `PAR-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      const parentName = studentData.parentInfo.motherName || studentData.parentInfo.fatherName || studentData.parentInfo.guardianName || 'Parent';
      const parentEmail = (studentData.parentInfo.motherPhone || studentData.parentInfo.fatherPhone || studentData.parentInfo.guardianPhone || admissionNumber) + "@brightsoma.com";
      
      const expiresDate = new Date();
      expiresDate.setFullYear(expiresDate.getFullYear() + 1); // 1 year validity

      await addDoc(collection(db, 'access_codes'), {
        code: parentCode,
        role: 'PARENT',
        staffName: parentName,
        username: admissionNumber, // Use admission number as username for parents
        email: parentEmail,
        schoolId,
        active: true,
        createdAt: new Date().toISOString(),
        expiresAt: expiresDate.toISOString(),
        learnerId: newStudentRef.id,
        learnerName: name
      });

      // Automated Welcome SMS with Credentials
      if (emergencyContact) {
        const welcomeMessage = `Welcome to our school! ${name} has been enrolled (Adm: ${admissionNumber}). Login to the Parent Portal with Username: ${admissionNumber} & Access Code: ${parentCode}.`;
        try {
          await sendRealSMS(emergencyContact, welcomeMessage);
          // Log SMS
          await addDoc(collection(db, 'sms_logs'), {
            schoolId,
            phone: emergencyContact,
            message: welcomeMessage,
            status: 'Success',
            timestamp: new Date().toISOString(),
            type: 'EnrollmentWelcome'
          });
        } catch (smsErr) {
          console.error('Welcome SMS failed:', smsErr);
        }
      }

      toast.success('Enrollment Successful. Learner profile has been created.');
      setActiveTab('students');
    } catch (error: any) {
      console.error("Error saving document: ", error);
      const errorMessage = error.message || 'Failed to save learner record.';
      toast.error(errorMessage);
    }
  };

  const renderFileUpload = (label: string, fieldName: string) => (
    <div className="flex flex-col gap-2">
      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{label}</label>
      {uploadedFiles[fieldName] ? (
        <div className="flex items-center justify-between p-3 bg-orange-50/50 border border-orange-100 rounded-xl">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="p-2 bg-white rounded-lg shadow-sm">
              <FileText size={16} className="text-orange-600" />
            </div>
            <div className="truncate">
              <p className="text-xs font-bold text-slate-700 truncate">{uploadedFiles[fieldName].name}</p>
              <p className="text-[10px] text-slate-500">{(uploadedFiles[fieldName].size / 1024).toFixed(1)} KB</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => removeFile(fieldName)}
            className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      ) : (
        <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-slate-200 hover:border-orange-400 hover:bg-orange-50/30 rounded-xl cursor-pointer transition-all group">
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <UploadCloud size={20} className="text-slate-400 group-hover:text-orange-500 mb-2 transition-colors" />
            <p className="text-[11px] text-slate-500 group-hover:text-orange-600 font-medium">Click to upload</p>
          </div>
          <input type="file" className="hidden" onChange={(e) => handleFileUpload(e, fieldName)} accept=".pdf,.jpg,.jpeg,.png" />
        </label>
      )}
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8 bg-slate-50/50 min-h-screen">
      {/* Floating Header - No Card */}
      <div className="relative py-6 mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 bg-orange-100 dark:bg-orange-900/30 rounded-2xl flex items-center justify-center text-orange-600 dark:text-orange-400 border border-orange-200/50 dark:border-orange-800 shrink-0">
            <GraduationCap size={28} strokeWidth={1.5} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-white tracking-tight leading-tight mb-1">Learner Registration</h2>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 leading-relaxed">
              Onboard new learners and capture all required demographic data.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => {
              const headers = "name,admissionNumber,grade,stream,gender,boardingType,phone\n";
              const sampleRow = "John Doe,AUTO-123,Grade 4,A,Male,Day Scholar,0712345678\n";
              const blob = new Blob([headers + sampleRow], { type: 'text/csv' });
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'learner_import_template.csv';
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              window.URL.revokeObjectURL(url);
              toast.success("Learner template downloaded!");
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 rounded-xl font-bold text-sm hover:bg-slate-50 transition-all cursor-pointer active:scale-95"
            title="Download CSV Template"
          >
            <Download size={16} />
            <span className="hidden sm:inline">Template</span>
          </button>
          <label className="flex items-center gap-2 px-5 py-2.5 bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-800 rounded-xl font-bold text-sm hover:bg-orange-100 transition-all cursor-pointer active:scale-95">
            <UploadCloud size={16} />
            Bulk Import CSV
            <input 
              type="file" 
              accept=".csv" 
              className="hidden" 
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                
                const reader = new FileReader();
                reader.onload = async (event) => {
                  const csvText = event.target?.result as string;
                  const { parseCSV } = await import('../utils/CSVUtils');
                  const rows = parseCSV(csvText);
                  
                  if (rows.length === 0) {
                    toast.error('CSV file is empty or invalid.');
                    return;
                  }

                  const user = auth.currentUser;
                  if (!user) {
                    toast.error('Authentication required.');
                    return;
                  }

                  let schoolId = user.uid;
                  const staffDocRef = doc(db, 'staff', user.uid);
                  const staffDocSnap = await getDoc(staffDocRef);
                  if (staffDocSnap.exists()) {
                    schoolId = staffDocSnap.data().schoolId;
                  }

                  let successCount = 0;
                  let failCount = 0;
                  const failures: string[] = [];
                  const loadingToast = toast.loading(`Processing ${rows.length} learners...`);

                  try {
                    for (let i = 0; i < rows.length; i++) {
                      const row = rows[i];
                      const rowNum = i + 1;

                      try {
                        // 1. Validation
                        if (!row.name || !row.name.trim()) {
                          throw new Error(`Row ${rowNum}: Name is missing.`);
                        }
                        
                        // 2. Prepare Data
                        const studentData = {
                          schoolId,
                          admissionNumber: row.admissionNumber || `AUTO-${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
                          name: row.name.trim(),
                          grade: row.grade || 'Grade 1',
                          stream: row.stream || 'A',
                          gender: row.gender || 'Other',
                          status: 'Active',
                          boardingType: row.boardingType || 'Day Scholar',
                          createdAt: new Date().toISOString(),
                          parentInfo: {
                            emergencyContact: row.phone || '',
                          }
                        };

                         // 3. Save
                         const studentRef = await addDoc(collection(db, 'students'), studentData);
                         
                         // 🛡️ Generate Parent Access Code for bulk import
                         const parentCode = `PAR-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
                         const expiresDate = new Date();
                         expiresDate.setFullYear(expiresDate.getFullYear() + 1);

                         await addDoc(collection(db, 'access_codes'), {
                           code: parentCode,
                           role: 'PARENT',
                           staffName: 'Parent',
                           username: studentData.admissionNumber,
                           email: (row.phone || studentData.admissionNumber) + "@brightsoma.com",
                           schoolId,
                           active: true,
                           createdAt: new Date().toISOString(),
                           expiresAt: expiresDate.toISOString(),
                           learnerId: studentRef.id,
                           learnerName: row.name.trim()
                         });

                         // Trigger Welcome SMS for bulk import with Credentials
                         if (row.phone) {
                           const welcomeMsg = `Welcome to our school! ${row.name.trim()} has been enrolled (Adm: ${studentData.admissionNumber}). Parent Portal Login - Username: ${studentData.admissionNumber}, Access Code: ${parentCode}.`;
                           try {
                             await sendRealSMS(row.phone, welcomeMsg);
                             await addDoc(collection(db, 'sms_logs'), {
                               schoolId,
                               phone: row.phone,
                               message: welcomeMsg,
                               status: 'Success',
                               timestamp: new Date().toISOString(),
                               type: 'BulkEnrollmentWelcome'
                             });
                           } catch (e) {
                             console.error('Bulk Welcome SMS failed:', e);
                           }
                         }

                         successCount++;
                      } catch (rowErr: any) {
                        console.error(`Import failure at Row ${rowNum}:`, rowErr);
                        failCount++;
                        failures.push(rowErr.message || `Row ${rowNum}: Unexpected error`);
                      }
                    }

                    toast.dismiss(loadingToast);
                    
                    if (failCount === 0) {
                      toast.success(`Successfully imported all ${successCount} learners!`);
                    } else if (successCount > 0) {
                      toast.success(`Import Complete: ${successCount} success, ${failCount} failed.`, { duration: 6000 });
                      console.warn('Import Failures:', failures);
                    } else {
                      toast.error(`Import Failed: All ${failCount} rows had errors.`);
                    }
                    
                    if (successCount > 0) setActiveTab('students');
                  } catch (err) {
                    toast.dismiss(loadingToast);
                    toast.error('Critical error during bulk import process.');
                    console.error(err);
                  }
                };
                reader.readAsText(file);
              }} 
            />
          </label>
          <button
            type="button"
            onClick={() => setActiveTab('students')}
            className="flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-sm hover:bg-slate-50 transition-all active:scale-95 shrink-0"
          >
            <ArrowLeft size={16} /> Back to Learners
          </button>
        </div>
      </div>

      <form onSubmit={handleFormSubmit} className="space-y-6">

        {/* SECTION 1: Core Identification */}
        <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
            <div className="p-2.5 bg-orange-50 text-orange-600 rounded-xl border border-orange-100/50">
              <UserCheck size={20} strokeWidth={2} className="text-slate-800" />
            </div>
            <h3 className="text-lg font-bold text-slate-800">Core Identification</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Full Names <span className="text-rose-500">*</span></label>
              <input name="name" type="text" className={`w-full px-4 py-3 bg-slate-50 border ${formErrors.name ? 'border-rose-500' : 'border-slate-200'} rounded-xl text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all`} placeholder="Enter Full Name" required />
              {formErrors.name && <p className="text-xs text-rose-500 mt-1">{formErrors.name}</p>}
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Admission Number <span className="text-rose-500">*</span></label>
              <input
                name="admissionNumber"
                type="text"
                defaultValue={autoAdmissionNumber}
                key={autoAdmissionNumber} // Force re-render when value changes
                className={`w-full px-4 py-3 bg-slate-50 border ${formErrors.admissionNumber ? 'border-rose-500' : 'border-slate-200'} rounded-xl text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all`}
                required
                disabled={isGeneratingAdmn}
              />
              {formErrors.admissionNumber && <p className="text-xs text-rose-500 mt-1">{formErrors.admissionNumber}</p>}
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">NEMIS Number</label>
              <input name="nemisNumber" type="text" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all" placeholder="Optional" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Birth Certificate Number</label>
              <input name="birthCertificateNumber" type="text" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Date of Birth</label>
              <input name="dateOfBirth" type="date" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Gender</label>
              <select name="gender" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all cursor-pointer">
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Nationality</label>
              <input name="nationality" type="text" defaultValue="Kenyan" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all" />
            </div>
          </div>
        </div>

        {/* SECTION 2: Academic Placement */}
        <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
            <div className="p-2.5 bg-orange-50 text-orange-600 rounded-xl border border-orange-100/50">
              <GraduationCap size={20} strokeWidth={2} className="text-slate-800" />
            </div>
            <h3 className="text-lg font-bold text-slate-800">Academic Placement</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">CBC Grade</label>
              <select 
                name="grade" 
                value={selectedGrade}
                onChange={(e) => setSelectedGrade(e.target.value as CBCGrade)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all cursor-pointer"
              >
                {CBC_GRADES.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Stream</label>
              {availableStreams.length > 0 ? (
                <select name="stream" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all cursor-pointer">
                  {availableStreams.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              ) : (
                <input name="stream" type="text" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all" placeholder="e.g. North" />
              )}
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Boarding Model</label>
              <select name="boardingType" onChange={(e) => setIsBoarding(e.target.value === 'Boarding')} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all cursor-pointer">
                <option value="Day Scholar">Day Scholar</option>
                <option value="Boarding">Boarding</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Date of Admission</label>
              <input name="dateOfAdmission" type="date" defaultValue={new Date().toISOString().split('T')[0]} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Status</label>
              <select name="status" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all cursor-pointer">
                <option value="Active">Active</option>
                <option value="Pending">Pending</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>

          {/* Teacher Discovery Info */}
          {(classTeacher || otherTeachers.length > 0) && (
            <div className="mt-8 p-6 bg-slate-50/80 rounded-2xl border border-slate-100 flex flex-col gap-5 animate-in fade-in slide-in-from-top-4 duration-500">
              <div className="flex items-center gap-2">
                <BookOpen size={16} className="text-orange-600" />
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Teacher Assignments for {selectedGrade}</h4>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {classTeacher && (
                  <div className="bg-white p-4 rounded-xl border border-orange-100 shadow-sm flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 shrink-0">
                      <UserCheck size={20} />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-orange-600 uppercase tracking-tight">Class Teacher</span>
                      <p className="text-sm font-bold text-slate-800">{classTeacher.name}</p>
                      <p className="text-[11px] text-slate-500 italic">
                        Teaching: {classTeacher.teachingSubjects?.[selectedGrade]?.join(', ') || 'General Subjects'}
                      </p>
                    </div>
                  </div>
                )}
                
                {otherTeachers.map(teacher => (
                  <div key={teacher.id} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
                      <GraduationCap size={20} />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">Subject Teacher</span>
                      <p className="text-sm font-bold text-slate-800">{teacher.name}</p>
                      <p className="text-[11px] text-slate-500 italic">
                        Teaching: {teacher.teachingSubjects?.[selectedGrade]?.join(', ') || 'Assigned Subjects'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {isLoadingTeachers && (
            <div className="mt-8 flex items-center gap-2 justify-center text-slate-400 py-4">
              <Activity size={16} className="animate-spin" />
              <span className="text-xs font-medium italic">Discovering teachers for {selectedGrade}...</span>
            </div>
          )}
        </div>

        {/* SECTION 2B: Boarding Allocation (Conditional) */}
        {isBoarding && (
          <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
              <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100/50">
                <Home size={20} strokeWidth={2} className="text-slate-800" />
              </div>
              <h3 className="text-lg font-bold text-slate-800">Boarding Allocation & Checklist</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6 pb-6 border-b border-slate-100">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Dormitory Allocated</label>
                <select 
                  name="dormId" 
                  value={selectedDormId}
                  onChange={(e) => setSelectedDormId(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all cursor-pointer"
                  required={isBoarding}
                >
                  <option value="">Select House/Dorm</option>
                  {dorms.map(dorm => (
                    <option key={dorm.id} value={dorm.id}>
                      {dorm.name} ({dorm.currentOccupancy || 0}/{dorm.capacity || '?'})
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Matron / Patron Name</label>
                <input name="matronName" type="text" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all" placeholder="e.g. Mrs. Jane" />
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4">Boarding Equipment Received</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
                {boardingEquipment.map(eq => (
                  <label key={eq.id} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${eq.checked ? 'bg-orange-50 border-orange-200 text-orange-800 shadow-sm' : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-orange-300'}`}>
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 text-orange-600 rounded border-slate-300 focus:ring-orange-500"
                      checked={eq.checked}
                      onChange={(e) => setBoardingEquipment(prev => prev.map(p => p.id === eq.id ? { ...p, checked: e.target.checked } : p))}
                    />
                    <span className="text-sm font-semibold line-clamp-1">{eq.item}</span>
                  </label>
                ))}
              </div>
              
              <div className="flex items-center gap-2 max-w-md">
                <input 
                  type="text" 
                  value={newEquipment}
                  onChange={e => setNewEquipment(e.target.value)}
                  placeholder="Add custom item (e.g. Padlock)" 
                  className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-500/20 transition-all"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (newEquipment.trim()) {
                        setBoardingEquipment(prev => [...prev, { id: Date.now().toString(), item: newEquipment.trim(), checked: true }]);
                        setNewEquipment('');
                      }
                    }
                  }}
                />
                <button 
                  type="button"
                  onClick={() => {
                    if (newEquipment.trim()) {
                      setBoardingEquipment(prev => [...prev, { id: Date.now().toString(), item: newEquipment.trim(), checked: true }]);
                      setNewEquipment('');
                    }
                  }}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-sm font-bold rounded-xl transition-all shadow-sm active:scale-95"
                >
                  Add Item
                </button>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 2C: Day Scholar Checklist (Conditional) */}
        {!isBoarding && (
           <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
              <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl border border-blue-100/50">
                <BookOpen size={20} strokeWidth={2} className="text-slate-800" />
              </div>
              <h3 className="text-lg font-bold text-slate-800">Day Scholar Checklist</h3>
            </div>
            
            <div>
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4">Items Brought by Student</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
                {dayScholarChecklist.map(eq => (
                  <label key={eq.id} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${eq.checked ? 'bg-blue-50 border-blue-200 text-blue-800 shadow-sm' : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-blue-300'}`}>
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                      checked={eq.checked}
                      onChange={(e) => setDayScholarChecklist(prev => prev.map(p => p.id === eq.id ? { ...p, checked: e.target.checked } : p))}
                    />
                    <span className="text-sm font-semibold line-clamp-1">{eq.item}</span>
                  </label>
                ))}
              </div>
              
              <div className="flex items-center gap-2 max-w-md">
                <input 
                  type="text" 
                  value={newDayItem}
                  onChange={e => setNewDayItem(e.target.value)}
                  placeholder="Add custom item (e.g. Geometry Set)" 
                  className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 transition-all"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (newDayItem.trim()) {
                        setDayScholarChecklist(prev => [...prev, { id: Date.now().toString(), item: newDayItem.trim(), checked: true }]);
                        setNewDayItem('');
                      }
                    }
                  }}
                />
                <button 
                  type="button"
                  onClick={() => {
                    if (newDayItem.trim()) {
                      setDayScholarChecklist(prev => [...prev, { id: Date.now().toString(), item: newDayItem.trim(), checked: true }]);
                      setNewDayItem('');
                    }
                  }}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-sm font-bold rounded-xl transition-all shadow-sm active:scale-95"
                >
                  Add Item
                </button>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 2D: School Allocated Items */}
        <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100/50">
              <Package size={20} strokeWidth={2} className="text-slate-800" />
            </div>
            <h3 className="text-lg font-bold text-slate-800">School Allocated Items</h3>
          </div>
          
          <div>
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4">Items Provided by School</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
              {allocatedItems.map(eq => (
                <label key={eq.id} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${eq.checked ? 'bg-indigo-50 border-indigo-200 text-indigo-800 shadow-sm' : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-indigo-300'}`}>
                  <input 
                    type="checkbox" 
                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                    checked={eq.checked}
                    onChange={(e) => setAllocatedItems(prev => prev.map(p => p.id === eq.id ? { ...p, checked: e.target.checked } : p))}
                  />
                  <span className="text-sm font-semibold line-clamp-1">{eq.item}</span>
                </label>
              ))}
            </div>
            
            <div className="flex items-center gap-2 max-w-md">
              <input 
                type="text" 
                value={newAllocatedItem}
                onChange={e => setNewAllocatedItem(e.target.value)}
                placeholder="Add allocated item (e.g. Lab Coat)" 
                className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (newAllocatedItem.trim()) {
                      setAllocatedItems(prev => [...prev, { id: Date.now().toString(), item: newAllocatedItem.trim(), checked: true }]);
                      setNewAllocatedItem('');
                    }
                  }
                }}
              />
              <button 
                type="button"
                onClick={() => {
                  if (newAllocatedItem.trim()) {
                    setAllocatedItems(prev => [...prev, { id: Date.now().toString(), item: newAllocatedItem.trim(), checked: true }]);
                    setNewAllocatedItem('');
                  }
                }}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-sm font-bold rounded-xl transition-all shadow-sm active:scale-95"
              >
                Allocate
              </button>
            </div>
          </div>
        </div>

        {/* SECTION 3: Parent / Guardian Information */}
        <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
            <div className="p-2.5 bg-orange-50 text-orange-600 rounded-xl border border-orange-100/50">
              <Users size={20} strokeWidth={2} className="text-slate-800" />
            </div>
            <h3 className="text-lg font-bold text-slate-800">Parent / Guardian Information</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-x-5 gap-y-6">
            <div className="space-y-4 p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Father's Details</h4>
              <div className="space-y-3">
                <input name="fatherName" type="text" placeholder="Full Name" className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-800 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all" />
                <div>
                  <input name="fatherPhone" type="tel" placeholder="Phone Number" className={`w-full px-4 py-2.5 bg-white border ${formErrors.fatherPhone ? 'border-rose-500' : 'border-slate-200'} rounded-lg text-sm font-medium text-slate-800 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all`} />
                  {formErrors.fatherPhone && <p className="text-xs text-rose-500 mt-1">{formErrors.fatherPhone}</p>}
                </div>
                <input name="fatherId" type="text" placeholder="ID Number" className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-800 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all" />
              </div>
            </div>

            <div className="space-y-4 p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Mother's Details</h4>
              <div className="space-y-3">
                <input name="motherName" type="text" placeholder="Full Name" className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-800 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all" />
                <div>
                  <input name="motherPhone" type="tel" placeholder="Phone Number" className={`w-full px-4 py-2.5 bg-white border ${formErrors.motherPhone ? 'border-rose-500' : 'border-slate-200'} rounded-lg text-sm font-medium text-slate-800 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all`} />
                  {formErrors.motherPhone && <p className="text-xs text-rose-500 mt-1">{formErrors.motherPhone}</p>}
                </div>
                <input name="motherId" type="text" placeholder="ID Number" className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-800 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all" />
              </div>
            </div>

            <div className="space-y-4 p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Guardian Details</h4>
              <div className="space-y-3">
                <input name="guardianName" type="text" placeholder="Full Name (Optional)" className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-800 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all" />
                <div>
                  <input name="guardianPhone" type="tel" placeholder="Phone Number" className={`w-full px-4 py-2.5 bg-white border ${formErrors.guardianPhone ? 'border-rose-500' : 'border-slate-200'} rounded-lg text-sm font-medium text-slate-800 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all`} />
                  {formErrors.guardianPhone && <p className="text-xs text-rose-500 mt-1">{formErrors.guardianPhone}</p>}
                </div>
                <div className="pt-2">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1 mb-1">Emergency Contact <span className="text-rose-500">*</span></label>
                  <input name="emergencyContact" type="tel" placeholder="Required" className={`w-full px-4 py-2.5 bg-white border ${formErrors.emergencyContact ? 'border-rose-500' : 'border-slate-200'} rounded-lg text-sm font-medium text-slate-800 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all`} required />
                  {formErrors.emergencyContact && <p className="text-xs text-rose-500 mt-1">{formErrors.emergencyContact}</p>}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 4: Medical Information */}
        <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
            <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl border border-rose-100/50">
              <Activity size={20} strokeWidth={2} className="text-slate-800" />
            </div>
            <h3 className="text-lg font-bold text-slate-800">Medical Information</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5 md:col-span-2 lg:col-span-1">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Blood Group</label>
              <select name="bloodGroup" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all cursor-pointer">
                {['Unknown', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => <option key={bg} value={bg}>{bg}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Allergies</label>
              <textarea name="allergies" rows={2} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all resize-none" placeholder="List any allergies..." />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Medical Conditions</label>
              <textarea name="conditions" rows={2} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all resize-none" placeholder="Any chronic conditions..." />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Special Needs / Disability</label>
              <textarea name="specialNeeds" rows={2} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all resize-none" placeholder="Any special requirements..." />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Medication Required</label>
              <textarea name="medication" rows={2} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all resize-none" placeholder="Current medications..." />
            </div>
          </div>
        </div>

        {/* SECTION 5: Document Uploads */}
        <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100/50">
              <FileText size={20} strokeWidth={2} className="text-slate-800" />
            </div>
            <h3 className="text-lg font-bold text-slate-800">Document Uploads</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {renderFileUpload('Passport Photo', 'passportPhoto')}
            {renderFileUpload('Birth Certificate', 'birthCertificate')}
            {renderFileUpload('Parent ID', 'parentId')}
            {renderFileUpload('Medical Report', 'medicalReport')}
            {renderFileUpload('Previous Report Card', 'reportCard')}
          </div>
        </div>

        {/* SECTION 6: Transport Enrollment */}
        <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl border border-amber-100/50">
                <Bus size={20} strokeWidth={2} className="text-slate-800" />
              </div>
              <h3 className="text-lg font-bold text-slate-800">Transport Enrollment</h3>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold text-slate-600">Transport Required?</span>
              <button
                type="button"
                onClick={() => setTransportRequired(!transportRequired)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${transportRequired ? 'bg-orange-600' : 'bg-slate-200'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${transportRequired ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
          </div>

          {transportRequired && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Route</label>
                <input name="route" type="text" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all" placeholder="e.g. Route A" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Pickup Point</label>
                <input name="pickupPoint" type="text" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all" placeholder="e.g. Main Gate" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Bus Number</label>
                <input name="busNumber" type="text" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all" placeholder="e.g. KCA 123A" />
              </div>

              <div className="md:col-span-3 pt-4 border-t border-slate-100">
                <div className="flex items-center gap-2 mb-4">
                  <Bell size={16} className="text-orange-600" />
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">SMS Enrollment Notifications</h4>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { id: 'busArrived', label: 'Bus Arrived' },
                    { id: 'boarded', label: 'Child Boarded' },
                    { id: 'arrivedSchool', label: 'Arrived School' },
                    { id: 'dropped', label: 'Child Dropped' }
                  ].map(notif => (
                    <label key={notif.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer hover:bg-white hover:border-orange-300 transition-all">
                      <input 
                        type="checkbox"
                        checked={transportNotifs[notif.id as keyof typeof transportNotifs]}
                        onChange={(e) => setTransportNotifs(p => ({ ...p, [notif.id]: e.target.checked }))}
                        className="w-4 h-4 text-orange-600 rounded border-slate-300 focus:ring-orange-500"
                      />
                      <span className="text-xs font-bold text-slate-600">{notif.label}</span>
                    </label>
                  ))}
                </div>
                <p className="text-[10px] text-slate-500 mt-3 font-medium flex items-center gap-1.5">
                  <Bell size={10} />
                  Parent will receive real-time SMS alerts for the selected events.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* SECTION 7: Fee Invoice / Initial Payment */}
        <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100/50">
              <Wallet size={20} strokeWidth={2} className="text-slate-800" />
            </div>
            <h3 className="text-lg font-bold text-slate-800">Fee Invoice & Initial Payment</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Initial Amount Paid (KES)</label>
              <input name="initialAmountPaid" type="number" min="0" step="any" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all" placeholder="0.00" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Payment Method</label>
              <select name="paymentMethod" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all cursor-pointer">
                <option value="M-Pesa">M-Pesa (Paybill / Till)</option>
                <option value="Bank">Bank Deposit</option>
                <option value="Cash">Cash</option>
              </select>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-4 leading-relaxed">
            * Entering an amount here will automatically generate an initial payment receipt and credit the learner's fee balance.
          </p>
        </div>

        {/* SECTION 8: Additional Notes */}
        <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
            <div className="p-2.5 bg-slate-100 text-slate-600 rounded-xl border border-slate-200/50">
              <FileEdit size={20} strokeWidth={2} className="text-slate-800" />
            </div>
            <h3 className="text-lg font-bold text-slate-800">Additional Notes</h3>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Administrative Notes</label>
            <textarea name="adminNotes" rows={3} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all resize-none" placeholder="Any other relevant information..." />
          </div>
        </div>

        {/* BOTTOM ACTION BUTTONS */}
        <div className="flex flex-col sm:flex-row items-center justify-end gap-4 pt-6">
          <button
            type="button"
            onClick={() => setActiveTab('students')}
            className="w-full sm:w-auto px-8 py-3.5 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-50 transition-all"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="w-full sm:w-auto px-8 py-3.5 bg-orange-500 text-white rounded-xl font-bold text-sm hover:bg-orange-600 transition-all shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2"
          >
            <CheckCircle2 size={18} />
            Generate Enrollment
          </button>
        </div>
      </form>
    </div>
  );
};

export default RegisterLearner;

