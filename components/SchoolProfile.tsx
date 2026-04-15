import React, { useState, useEffect } from 'react';
import { SchoolProfile as SchoolProfileType, UserRole, Student } from '../types';
import { Save, Upload, School as SchoolIcon, Shield, Loader2, Eye, EyeOff, Zap, Trash2, ShieldCheck, FileText, CheckCircle2, Download, Briefcase, Building2, Lock, ArrowRight } from 'lucide-react';
import { db, auth } from '../src/firebase';
import { collection, addDoc, onSnapshot, deleteDoc, doc, query, orderBy, where, getDocs, getDoc, setDoc } from 'firebase/firestore';
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import toast from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';

interface AccessCode {
  id: string;
  code: string;
  role: UserRole;
  staffName: string;
  active: boolean;
  createdAt: string;
  expiresAt: string;
}

interface StaffMember {
  id: string;
  name: string;
  role: UserRole;
  schoolId: string;
  createdAt: string;
}

interface SchoolProfileProps {
  academicPeriod: string;
}

const SchoolProfile: React.FC<SchoolProfileProps> = ({ academicPeriod }) => {
  const { profile: authProfile } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const defaultProfile: SchoolProfileType = {
    id: '',
    name: '',
    motto: '',
    county: '',
    subCounty: '',
    type: 'Public',
    category: 'Mixed',
    registrationNumber: '',
    paybillNumber: '',
    directorName: '',
    email: '',
    phone: '',
    grades: [],
    streams: []
  };

  const [profile, setProfile] = useState<SchoolProfileType>(defaultProfile);
  const [personalPhoto, setPersonalPhoto] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  
  const [newGrade, setNewGrade] = useState('');
  const [gradeForStream, setGradeForStream] = useState<string>('Grade 1');
  const [newStream1, setNewStream1] = useState('');
  const [newStream2, setNewStream2] = useState('');
  const [newStream3, setNewStream3] = useState('');

  const handleAddStreams = async () => {
    const streamsToAdd = [newStream1.trim(), newStream2.trim(), newStream3.trim()].filter(s => s !== '');
    if (streamsToAdd.length === 0) return;

    let updatedStreams: string[] = [];
    setProfile(prev => {
      const currentStreams = prev.streams || [];
      updatedStreams = [...currentStreams];
      
      streamsToAdd.forEach(s => {
        const streamIdentifier = `${gradeForStream}: ${s}`;
        if (!updatedStreams.includes(streamIdentifier)) {
          updatedStreams.push(streamIdentifier);
        }
      });

      return { ...prev, streams: updatedStreams };
    });

    // 🔄 Auto-save to Firestore
    try {
      const user = auth.currentUser;
      if (user) {
        const schoolId = authProfile?.schoolId || user.uid;
        await setDoc(doc(db, 'schools', schoolId), { streams: updatedStreams }, { merge: true });
        toast.success("Streams saved successfully!");
      }
    } catch (err) {
      console.error("Auto-save streams failed:", err);
    }

    setNewStream1('');
    setNewStream2('');
    setNewStream3('');
  };

  const handlePopulateStreams = async () => {
    if (!gradeForStream) return;
    const suggested = ['North', 'South', 'East', 'West', 'Central', 'A', 'B', 'C'].slice(0, 4);
    
    let updatedStreams: string[] = [];
    setProfile(prev => {
      const currentStreams = prev.streams || [];
      updatedStreams = [...currentStreams];
      
      suggested.forEach(s => {
        const streamIdentifier = `${gradeForStream}: ${s}`;
        if (!updatedStreams.includes(streamIdentifier)) {
          updatedStreams.push(streamIdentifier);
        }
      });

      return { ...prev, streams: updatedStreams };
    });

    // 🔄 Auto-save to Firestore to prevent loss on refresh
    try {
      const user = auth.currentUser;
      if (user) {
        const schoolId = authProfile?.schoolId || user.uid;
        await setDoc(doc(db, 'schools', schoolId), { streams: updatedStreams }, { merge: true });
        toast.success(`Standard streams added for ${gradeForStream}`);
      }
    } catch (err) {
      console.error("Auto-save streams failed:", err);
      toast.error("Streams added locally but failed to save to cloud.");
    }
  };
  const handleAddGrade = async () => {
    if (!newGrade.trim() || profile.grades?.includes(newGrade.trim())) return;
    const grade = newGrade.trim();
    let updatedGrades: string[] = [];
    
    setProfile(prev => {
      updatedGrades = [...(prev.grades || []), grade];
      return { ...prev, grades: updatedGrades };
    });

    // 🔄 Auto-save to Firestore
    try {
      const user = auth.currentUser;
      if (user) {
        const schoolId = authProfile?.schoolId || user.uid;
        await setDoc(doc(db, 'schools', schoolId), { grades: updatedGrades }, { merge: true });
        toast.success("Grade saved!");
      }
    } catch (err) {
      console.error("Auto-save grade failed:", err);
    }

    setNewGrade('');
  };
  
  const handleRemoveGrade = (g: string) => {
    setProfile(prev => ({ ...prev, grades: (prev.grades || []).filter(x => x !== g) }));
  };

  const handlePopulateGrades = async () => {
    const defaultGrades = ['PP1', 'PP2', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'];
    let updatedGrades: string[] = [];
    
    setProfile(prev => {
      updatedGrades = Array.from(new Set([...(prev.grades || []), ...defaultGrades]));
      return { ...prev, grades: updatedGrades };
    });

    // 🔄 Auto-save to Firestore
    try {
      const user = auth.currentUser;
      if (user) {
        const schoolId = authProfile?.schoolId || user.uid;
        await setDoc(doc(db, 'schools', schoolId), { grades: updatedGrades }, { merge: true });
        toast.success("Standard grades populated!");
      }
    } catch (err) {
      console.error("Auto-save grades failed:", err);
      toast.error("Grades added locally but failed to save to cloud.");
    }
  };

  const handleRemoveStream = (s: string) => {
    setProfile(prev => ({ ...prev, streams: (prev.streams || []).filter(x => x !== s) }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setProfile(prev => ({ ...prev, [name]: value }));
  };

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    // 🛡️ CRITICAL: Use the schoolId from the authProfile (resolved via authService)
    // For a newly registered Director, user.uid IS the schoolId.
    const schoolId = authProfile?.schoolId ?? user.uid;

    if (!schoolId) {
      console.warn("[SchoolProfile] No schoolId resolved yet, waiting...");
      return;
    }

    // Fetch school profile automatically with onSnapshot to guarantee real-time updates and eliminate propagation bugs
    const schoolDocRef = doc(db, 'schools', schoolId);
    const unsubSchool = onSnapshot(schoolDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setProfile({ ...defaultProfile, id: docSnap.id, ...data } as SchoolProfileType);
        
        // Clear fallback if exists
        if (data.name) {
          sessionStorage.removeItem('pending_school_registration');
        }
      } else {
        // Fallback for extreme latency - will be overwritten once the document propagates
        const pendingReg = sessionStorage.getItem('pending_school_registration');
        if (pendingReg) {
          try {
            const data = JSON.parse(pendingReg);
            setProfile(prev => ({ ...prev, id: schoolId, ...data }));
          } catch (e) {}
        }
      }
    });

    // Also fetch personal photo from users collection
    const fetchUserPhoto = async () => {
      try {
        const userDocRef = doc(db, 'users', user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          if (userData.profilePhoto) setPersonalPhoto(userData.profilePhoto);
        }
      } catch (err) {
        console.error("Error fetching personal photo:", err);
      }
    };
    fetchUserPhoto();

    // Listen for students (for stats)
    const qStudents = query(
      collection(db, 'students'),
      where('schoolId', '==', schoolId)
    );
    const unsubStudents = onSnapshot(qStudents, (snapshot) => {
      setStudents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student)));
    });

    return () => {
      unsubStudents();
    };
  }, [authProfile?.schoolId, auth.currentUser?.uid]);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldPassword) {
      toast.error("Please enter your current password.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match.");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("New password must be at least 6 characters.");
      return;
    }
    
    const user = auth.currentUser;
    if (!user || !user.email) {
      toast.error("You must be logged in to change your password.");
      return;
    }

    setIsUpdatingPassword(true);
    try {
      // Re-authenticate the user first
      const credential = EmailAuthProvider.credential(user.email, oldPassword);
      await reauthenticateWithCredential(user, credential);

      // Now update the password
      await updatePassword(user, newPassword);
      toast.success("Password updated successfully!");
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      console.error("Error updating password:", error);
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password') {
        toast.error("Incorrect current password.");
      } else if (error.code === 'auth/requires-recent-login') {
        toast.error("For security reasons, please log out and log back in to change your password.");
      } else {
        toast.error(error.message || "Failed to update password.");
      }
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleSaveProfile = async () => {
    const user = auth.currentUser;
    if (!user) {
      toast.error("You must be logged in to save profile.");
      return;
    }

    try {
      let schoolId = profile.id || user.uid;
      
      // Sanitization: Firestore rejects 'undefined' fields. 
      // We also ensure we don't overwrite crucial system fields if they aren't in 'profile'.
      const cleanProfile: any = {};
      Object.keys(profile).forEach(key => {
        const val = (profile as any)[key];
        if (val !== undefined && key !== 'id') {
          cleanProfile[key] = val;
        }
      });

      // Ensure onboarding is marked complete if saving for the first time
      cleanProfile.onboardingCompleted = true;

      const schoolDocRef = doc(db, 'schools', schoolId);
      await setDoc(schoolDocRef, cleanProfile, { merge: true });
      
      // Sync to users collection as well if this is the owner
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, { onboardingCompleted: true, schoolId }, { merge: true });

      localStorage.setItem('onboarding_profile_saved', Date.now().toString());
      sessionStorage.removeItem('pending_school_registration');
      window.dispatchEvent(new Event('storage'));
      
      toast.success("School profile updated successfully!", {
        style: {
          background: '#f97316',
          color: '#fff',
          fontWeight: 'black',
          borderRadius: '20px'
        }
      });
    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile. Check your connection.");
    }
  };

  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>, docName: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File too large (Max 5MB)');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      const newDoc = {
        id: crypto.randomUUID(),
        name: docName,
        type: file.type,
        url: base64, // Storing as base64 for MVP; in production this would be a Storage URL
        date: new Date().toISOString(),
        uploadedBy: auth.currentUser?.email || 'Admin'
      };

      const existingDocs = profile.documents || [];
      const updatedDocs = [...existingDocs.filter(d => d.name !== docName), newDoc];
      
      setProfile(prev => ({ ...prev, documents: updatedDocs }));
      toast.success(`${docName} uploaded. Save changes to finalize.`);
    };
    reader.readAsDataURL(file);
  };

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
        
        // Save to users collection
        const userRef = doc(db, 'users', user.uid);
        await setDoc(userRef, { profilePhoto: base64String }, { merge: true });
        
        setPersonalPhoto(base64String);
        toast.success('Personal profile photo updated!');
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Error uploading photo:", error);
      toast.error("Failed to update photo");
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">School Profile</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Configure your institution's core identity and settings.</p>
        </div>
        <button 
          onClick={handleSaveProfile}
          className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-[1.05rem] shadow-lg shadow-orange-200 dark:shadow-none transition-all font-medium"
        >
          <Save size={18} />
          Save Changes
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Logo & Basic Info */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.8rem] border border-slate-100 dark:border-slate-800 shadow-sm transition-colors">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-32 h-32 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center border-4 border-white dark:border-slate-800 shadow-xl overflow-hidden group relative">
                {profile.logo ? (
                  <img src={profile.logo} alt="School Logo" className="w-full h-full object-cover" />
                ) : (
                  <SchoolIcon size={48} className="text-slate-300 dark:text-slate-600" />
                )}
                <label className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                  <Upload size={24} className="text-white" />
                  <input 
                    type="file" 
                    className="hidden" 
                    accept="image/*" 
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        setProfile(prev => ({ ...prev, logo: reader.result as string }));
                        toast.success('School logo staged. Click "Save Changes" to apply.');
                      };
                      reader.readAsDataURL(file);
                    }} 
                  />
                </label>
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">{profile.name || 'Your School'}</h3>
                <p className="text-sm italic text-slate-500">"{profile.motto || 'No motto set'}"</p>
              </div>
            </div>
          </div>
        </div>

        {/* Configuration Form */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-8 rounded-[2.8rem] border border-slate-100 dark:border-slate-800 shadow-sm transition-colors">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 tracking-wider">Institution Name</label>
              <input 
                type="text" 
                name="name"
                value={profile.name || ''}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none transition-all text-slate-700 dark:text-slate-200"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 tracking-wider">School Motto</label>
              <input 
                type="text" 
                name="motto"
                value={profile.motto || ''}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none transition-all text-slate-700 dark:text-slate-200"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 tracking-wider">County</label>
              <input 
                type="text" 
                name="county"
                value={profile.county || ''}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none transition-all text-slate-700 dark:text-slate-200"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 tracking-wider">Sub-County</label>
              <input 
                type="text" 
                name="subCounty"
                value={profile.subCounty || ''}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none transition-all text-slate-700 dark:text-slate-200"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 tracking-wider">Registration Number</label>
              <input 
                type="text" 
                name="registrationNumber"
                value={profile.registrationNumber || ''}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none transition-all text-slate-700 dark:text-slate-200"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 tracking-wider">M-Pesa Paybill</label>
              <input 
                type="text" 
                name="paybillNumber"
                value={profile.paybillNumber || ''}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none transition-all text-slate-700 dark:text-slate-200"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 tracking-wider">Director Name</label>
              <input 
                type="text" 
                name="directorName" 
                value={profile.directorName || ''}
                onChange={handleChange}
                placeholder="Full Name of Director"
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none transition-all text-slate-700 dark:text-slate-200"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 tracking-wider">Contact Phone</label>
              <input 
                type="text" 
                name="phone"
                value={profile.phone || ''}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none transition-all text-slate-700 dark:text-slate-200"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 tracking-wider">Code Validity (Days)</label>
              <select 
                name="codeValidityDays"
                value={profile.codeValidityDays || 7}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none transition-all text-slate-700 dark:text-slate-200 cursor-pointer"
              >
                {[1, 3, 7, 14, 30].map(days => (
                  <option key={days} value={days}>{days} Days</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm transition-colors">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-1">Custom Grades</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">Define the grades offered at your school.</p>
            </div>
            <button 
              type="button" 
              onClick={handlePopulateGrades}
              className="px-3 py-1.5 bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-orange-100 transition-all flex items-center gap-1.5"
            >
              <Zap size={14} />
              Populate Automatic
            </button>
          </div>
          <div className="flex gap-2 mb-4">
            <input 
              type="text" 
              value={newGrade}
              onChange={(e) => setNewGrade(e.target.value)}
              placeholder="e.g. Grade 1"
              className="flex-1 px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none text-sm text-slate-700 dark:text-slate-200"
              onKeyDown={(e) => e.key === 'Enter' && handleAddGrade()}
            />
            <button type="button" onClick={handleAddGrade} className="px-4 py-2.5 bg-orange-100 text-orange-600 hover:bg-orange-200 rounded-xl font-bold text-sm transition-colors">+</button>
          </div>
          <div className="flex flex-wrap gap-2">
            {(profile.grades || []).map(g => (
              <span key={g} className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-medium flex items-center gap-1">
                {g} <button type="button" onClick={() => handleRemoveGrade(g)} className="text-slate-400 hover:text-rose-500 ml-1">&times;</button>
              </span>
            ))}
            {!(profile.grades?.length) && <span className="text-xs text-slate-400 italic">No custom grades added. Default CBC grades will be used.</span>}
          </div>
        </div>
        
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm transition-colors">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-1">Class Streams</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">Define the streams for each grade (e.g., Grade 4: East).</p>
            </div>
            <button 
              type="button" 
              onClick={handlePopulateStreams}
              className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-indigo-100 transition-all flex items-center gap-1.5"
            >
              <Zap size={14} />
              Populate Predicted
            </button>
          </div>
            <div className="flex flex-col gap-4 mb-8">
               <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">Select Grade</label>
                <select 
                  value={gradeForStream}
                  onChange={(e) => setGradeForStream(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-orange-500 outline-none text-sm text-slate-700 dark:text-slate-200 cursor-pointer font-bold transition-all"
                >
                  {['PP1', 'PP2', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'].map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>
              
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">Stream Names <span className="text-[9px] font-normal lowercase">(add up to 3 at once)</span></label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <input 
                    type="text" 
                    value={newStream1}
                    onChange={(e) => setNewStream1(e.target.value)}
                    placeholder="e.g. East"
                    className="px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-orange-500 outline-none text-sm text-slate-700 dark:text-slate-200 transition-all font-medium"
                  />
                  <input 
                    type="text" 
                    value={newStream2}
                    onChange={(e) => setNewStream2(e.target.value)}
                    placeholder="e.g. West"
                    className="px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-orange-500 outline-none text-sm text-slate-700 dark:text-slate-200 transition-all font-medium"
                  />
                  <input 
                    type="text" 
                    value={newStream3}
                    onChange={(e) => setNewStream3(e.target.value)}
                    placeholder="e.g. North"
                    className="px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-orange-500 outline-none text-sm text-slate-700 dark:text-slate-200 transition-all font-medium"
                  />
                </div>
              </div>

              <button 
                type="button" 
                onClick={handleAddStreams} 
                className="w-full py-3.5 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-orange-500/10 active:scale-[0.98] mt-2"
              >
                Add Streams to {gradeForStream}
              </button>
            </div>

          <div className="space-y-3">
            <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <span className="w-8 h-[1px] bg-slate-100 dark:bg-slate-800" />
              Active Streams
              <span className="flex-1 h-[1px] bg-slate-100 dark:bg-slate-800" />
            </h4>
            <div className="flex flex-wrap gap-2.5">
              {(profile.streams || []).map(s => (
                <div key={s} className="group px-4 py-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-sm border border-slate-100 dark:border-slate-700 hover:border-orange-200 dark:hover:border-orange-900/50 transition-all">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                  {s} 
                  <button type="button" onClick={() => handleRemoveStream(s)} className="p-1 text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-all">
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
              {!(profile.streams?.length) && (
                <div className="w-full py-8 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-[1.5rem] flex flex-col items-center justify-center text-slate-400 bg-slate-50/50 dark:bg-slate-900/30">
                  <p className="text-xs font-bold uppercase tracking-wider">No custom streams added</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        {/* Security Settings */}
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm transition-colors">
          <div className="mb-6">
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Shield size={20} className="text-orange-500" />
              Administrator Security
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Update your administrator account password.</p>
          </div>
          
          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 tracking-wider">Current Password</label>
              <div className="relative">
                <input 
                  type={showOldPassword ? 'text' : 'password'}
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 pr-12 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none transition-all text-slate-700 dark:text-slate-200"
                  required
                />
                <button type="button" onClick={() => setShowOldPassword(p => !p)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                  {showOldPassword ? <EyeOff size={16}/> : <Eye size={16}/>}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 tracking-wider">New Password</label>
              <div className="relative">
                <input 
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 pr-12 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none transition-all text-slate-700 dark:text-slate-200"
                  required
                />
                <button type="button" onClick={() => setShowNewPassword(p => !p)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                  {showNewPassword ? <EyeOff size={16}/> : <Eye size={16}/>}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 tracking-wider">Confirm New Password</label>
              <div className="relative">
                <input 
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 pr-12 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none transition-all text-slate-700 dark:text-slate-200"
                  required
                />
                <button type="button" onClick={() => setShowConfirmPassword(p => !p)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                  {showConfirmPassword ? <EyeOff size={16}/> : <Eye size={16}/>}
                </button>
              </div>
            </div>
            <button 
              type="submit"
              disabled={isUpdatingPassword || !oldPassword || !newPassword || !confirmPassword}
              className="px-6 py-3 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 rounded-xl font-bold transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {isUpdatingPassword ? <Loader2 size={18} className="animate-spin" /> : <Shield size={18} />}
              Update Password
            </button>
          </form>
        </div>

        {/* Personal Profile Settings */}
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm transition-colors">
          <div className="mb-6">
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Upload size={20} className="text-orange-500" />
              Personal Profile
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Individual photo for your administrator account.</p>
          </div>
          
          <div className="flex flex-col items-center justify-center p-8 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700 border-dashed">
            <div className="relative group">
              <div className="w-32 h-32 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-700 shadow-inner flex items-center justify-center border-4 border-white dark:border-slate-800">
                {personalPhoto ? (
                  <img src={personalPhoto} alt="Personal" className="w-full h-full object-cover" />
                ) : (
                  <SchoolIcon size={40} className="text-slate-400 dark:text-slate-500" />
                )}
                
                <label className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center cursor-pointer text-white">
                  {isUploadingPhoto ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : (
                    <>
                      <Upload size={20} className="mb-1" />
                      <span className="text-[10px] font-bold">Change</span>
                    </>
                  )}
                  <input 
                    type="file" 
                    className="hidden" 
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    disabled={isUploadingPhoto}
                  />
                </label>
              </div>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-4">JPG, PNG or GIF (Max 2MB)</p>
          </div>
        </div>
      </div>

      {/* Electronic Documents Vault */}
      <div className="bg-white dark:bg-slate-900 rounded-[2.8rem] border border-slate-100 dark:border-slate-800 shadow-sm p-8 mt-6">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-3 bg-orange-100 dark:bg-orange-900/20 rounded-2xl">
            <ShieldCheck className="text-orange-600" size={24} />
          </div>
          <div>
            <h3 className="text-xl font-black dark:text-white">Institution Document Vault</h3>
            <p className="text-sm text-slate-500 font-medium">Securely store and track official school documentation.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { id: 'kra', label: 'KRA PIN Certificate', icon: FileText },
            { id: 'reg', label: 'School Registration', icon: CheckCircle2 },
            { id: 'contract', label: 'Director Contract', icon: Briefcase }
          ].map(docType => {
            const existing = profile.documents?.find(d => d.name === docType.label);
            const Icon = docType.icon;
            
            return (
              <div key={docType.id} className={`group relative p-6 rounded-[2rem] border-2 border-dashed transition-all ${existing ? 'border-orange-500/20 bg-orange-50/10' : 'border-slate-200 dark:border-slate-800 hover:border-orange-500/50'}`}>
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors ${existing ? 'bg-orange-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 group-hover:text-orange-600'}`}>
                    <Icon size={24} />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm dark:text-white">{docType.label}</h4>
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black mt-1">
                      {existing ? `Verified: ${new Date(existing.date).toLocaleDateString()}` : 'Missing Document'}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <label className="cursor-pointer px-4 py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-[10px] font-black rounded-full hover:scale-105 transition-transform">
                      {existing ? 'REPLACE' : 'UPLOAD'}
                      <input 
                        type="file" 
                        className="hidden" 
                        onChange={(e) => handleDocumentUpload(e, docType.label)}
                      />
                    </label>
                    {existing && (
                      <button 
                        onClick={() => {
                          const link = document.createElement('a');
                          link.href = existing.url;
                          link.download = `${existing.name}.pdf`;
                          link.click();
                        }}
                        className="p-2 bg-orange-100 dark:bg-orange-900/30 text-orange-600 rounded-full hover:scale-110 transition-transform"
                      >
                         <Download size={14} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default SchoolProfile;
