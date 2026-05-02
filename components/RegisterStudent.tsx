import React, { useState } from 'react';
import { UserPlus, ArrowLeft, GraduationCap, Wallet, Home, Users, Activity, FileText, Bus, FileEdit, UploadCloud, X, CheckCircle2, UserCheck, Download, Bell, Package, BookOpen } from 'lucide-react';
import { CBCGrade, BoardingType, StudentStatus } from '../types';
import { CBC_GRADES } from '../constants';
import toast from 'react-hot-toast';
import { db, auth } from '../src/firebase';
import { collection, addDoc, getDoc, doc, query, where, orderBy, limit, getDocs, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../src/firebase';
import { sendRealSMS } from '../services/smsService';

interface RegisterStudentProps {
  setActiveTab: (tab: string) => void;
}

const RegisterStudent: React.FC<RegisterStudentProps> = ({ setActiveTab }) => {
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

  const [selectedGrade, setSelectedGrade] = useState<CBCGrade>(CBC_GRADES[0] as CBCGrade);
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

  return (
    <div className="p-8 bg-white rounded-3xl shadow-xl border border-slate-100">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => setActiveTab('students')} className="p-3 rounded-2xl bg-slate-50 text-slate-400 hover:text-slate-900 transition-all">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Register New Student</h2>
          <p className="text-sm font-medium text-slate-500 uppercase tracking-widest">Admission Hub</p>
        </div>
      </div>
      
      <div className="bg-orange-50 border border-orange-100 p-10 rounded-[2rem] text-center">
        <UserPlus className="mx-auto text-orange-600 mb-6" size={48} strokeWidth={1.5} />
        <h3 className="text-xl font-bold text-slate-900 mb-2">Registration Form Restoring...</h3>
        <p className="text-slate-500 max-w-md mx-auto">We are recovering the full student registration form. Please check back in a moment.</p>
      </div>
    </div>
  );
};

export default RegisterStudent;