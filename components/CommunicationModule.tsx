import React, { useState, useEffect } from 'react';
import { 
  Send, MessageSquare, History, Settings, FileText, Info, Plus, 
  Loader2, X, Zap, School, UserCheck, AlertCircle, CheckCircle2,
  Download, Filter, Search, MoreHorizontal 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'react-hot-toast';
import { sendRealSMS } from '../services/smsService';
import { db, auth } from '../src/firebase';
import { collection, addDoc, serverTimestamp, query, where, onSnapshot, doc, getDoc, orderBy, limit, deleteDoc, updateDoc } from 'firebase/firestore';
import { Student } from '../types';

interface CommunicationModuleProps {
  role?: string;
}

const CommunicationModule: React.FC<CommunicationModuleProps> = ({ role }) => {
  const [activeTab, setActiveTab] = useState<'Compose' | 'History' | 'Templates' | 'Overview' | 'Support Inbox'>('Overview');
  const [message, setMessage] = useState('');
  const [recipient, setRecipient] = useState('All Parents');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [dbTemplates, setDbTemplates] = useState<any[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [schools, setSchools] = useState<any[]>([]);
  const [supportInquiries, setSupportInquiries] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [newTemplate, setNewTemplate] = useState({ title: '', body: '' });
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [currentUserData, setCurrentUserData] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const isPlatformAdmin = role === 'PLATFORM_ADMIN' || role === 'SUPER_ADMIN';

  useEffect(() => {
    let cleanups: (() => void)[] = [];

    const fetchCommsData = async () => {
      setIsLoading(true);
      
      if (isPlatformAdmin) {
        // --- PLATFORM ADMIN FETCH ---
        setRecipient('All School Directors');
        setActiveTab('Overview');
        
        cleanups.push(onSnapshot(collection(db, 'schools'), (snapshot) => {
          setSchools(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }));

        cleanups.push(onSnapshot(query(collection(db, 'sms_logs'), where('type', '==', 'Global_SaaS'), orderBy('timestamp', 'desc'), limit(50)), (snapshot) => {
          setHistory(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }));

        cleanups.push(onSnapshot(query(collection(db, 'support_inquiries'), orderBy('timestamp', 'desc'), limit(30)), (snapshot) => {
          setSupportInquiries(snapshot.empty ? [] : snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }));

        cleanups.push(onSnapshot(query(collection(db, 'sms_templates'), where('type', '==', 'Global_SaaS')), (snapshot) => {
          setDbTemplates(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }));
      } else {
        // --- SCHOOL DIRECTOR/STAFF FETCH ---
        const user = auth.currentUser;
        if (!user) return;
        
        let schoolId = user.uid;
        const staffDocRef = doc(db, 'staff', user.uid);
        const staffDocSnap = await getDoc(staffDocRef);
        if (staffDocSnap.exists()) {
          schoolId = staffDocSnap.data().schoolId;
        }

        cleanups.push(onSnapshot(query(collection(db, 'sms_logs'), where('schoolId', '==', schoolId), orderBy('timestamp', 'desc'), limit(50)), (snapshot) => setHistory(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })))));
        cleanups.push(onSnapshot(query(collection(db, 'sms_templates'), where('schoolId', '==', schoolId)), (snapshot) => setDbTemplates(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })))));
        cleanups.push(onSnapshot(query(collection(db, 'students'), where('schoolId', '==', schoolId)), (snapshot) => setStudents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student)))));
        cleanups.push(onSnapshot(query(collection(db, 'staff'), where('schoolId', '==', schoolId)), (snapshot) => {
          setStaff(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
          const currentStaff = snapshot.docs.find(doc => doc.id === user.uid);
          if (currentStaff) { setCurrentUserData(currentStaff.data()); setIsAdmin(false); } else { setIsAdmin(true); }
          setIsLoading(false);
        }));
      }
      setIsLoading(false);
    };

    fetchCommsData();
    return () => cleanups.forEach(c => c());
  }, [isPlatformAdmin, isPlatformAdmin ? '' : role]);

  const handleSendBulk = async () => {
    if (!message) {
      toast.error('Message body cannot be empty.');
      return;
    }

    let phoneNumbers: string[] = [];
    if (isPlatformAdmin) {
      // Platform Logic
      if (recipient === 'All School Directors') {
        phoneNumbers = schools.map(s => s.directorPhone).filter(p => !!p);
      } else if (recipient.includes('Kit')) {
        const edition = recipient.split(' ')[0].toLowerCase();
        phoneNumbers = schools.filter(s => s.edition === edition).map(s => s.directorPhone).filter(p => !!p);
      }
    } else {
      // School Logic
      if (recipient === 'All Parents') {
        phoneNumbers = students.map(s => s.parentInfo?.fatherPhone || s.parentInfo?.motherPhone).filter(p => !!p);
      } else if (recipient === 'All Teachers') {
        phoneNumbers = staff.map(s => s.phone).filter(p => !!p);
      } else if (recipient.startsWith('Grade')) {
        phoneNumbers = students.filter(s => s.grade === recipient).map(s => s.parentInfo?.fatherPhone || s.parentInfo?.motherPhone).filter(p => !!p);
      } else {
        const student = students.find(s => s.name === recipient);
        const p = student?.parentInfo?.fatherPhone || student?.parentInfo?.motherPhone;
        if (p) phoneNumbers = [p];
      }
    }

    if (phoneNumbers.length === 0) {
      toast.error('No valid phone numbers found for this selection.');
      return;
    }

    setIsSending(true);
    const loadingToast = toast.loading(`Sending to ${phoneNumbers.length} recipients...`);

    try {
      const result = await sendRealSMS(phoneNumbers.join(','), message);
      
      if (result.success) {
        toast.success(`Broadcasting complete! Sent to ${result.sentCount} recipients.`, { icon: '🚀' });
        
        const user = auth.currentUser;
        if (user) {
          await addDoc(collection(db, 'sms_logs'), {
            schoolId: isPlatformAdmin ? 'BRIGHTSOMA_SAAS' : user.uid,
            recipients: recipient,
            count: result.sentCount,
            message: message,
            status: 'Success',
            cost: result.cost,
            timestamp: serverTimestamp(),
            type: isPlatformAdmin ? 'Global_SaaS' : 'Bulk'
          });
        }
        setMessage('');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to send broadcast.');
    } finally {
      toast.dismiss(loadingToast);
      setIsSending(false);
    }
  };

  const tabs = [
    { name: 'Overview', icon: Info },
    { name: 'Compose', icon: Send },
    ...(isPlatformAdmin ? [{ name: 'Support Inbox', icon: MessageSquare }] : []),
    { name: 'History', icon: History },
    { name: 'Templates', icon: FileText }
  ];

  const renderSupportInbox = () => (
    <div className="space-y-6 animate-in fade-in duration-700">
      <div className="grid grid-cols-1 gap-4">
        {supportInquiries.map(inquiry => (
          <div key={inquiry.id} className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 flex items-start justify-between group hover:border-orange-200 transition-all">
            <div className="flex gap-4">
              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl text-slate-400">
                <MessageSquare size={20} />
              </div>
              <div className="text-left">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-normal dark:text-white  tracking-tight">{inquiry.schoolName}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[8px] font-normal  tracking-widest ${inquiry.status === 'Pending' ? 'bg-orange-500 text-white' : 'bg-slate-200 text-slate-500'}`}>
                    {inquiry.status}
                  </span>
                </div>
                <p className="text-[11px] font-normal text-slate-400 mb-2">From: {inquiry.sender}</p>
                <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">"{inquiry.message}"</p>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <span className="text-[10px] font-normal text-slate-400 ">
                {inquiry.timestamp instanceof Date ? inquiry.timestamp.toLocaleDateString() : 'Today'}
              </span>
              <button 
                onClick={async () => {
                  const newStatus = inquiry.status === 'Pending' ? 'Resolved' : 'Pending';
                  await updateDoc(doc(db, 'support_inquiries', inquiry.id), { status: newStatus });
                  toast.success(`Marked as ${newStatus}`);
                }}
                className="px-4 py-2 bg-slate-50 dark:bg-slate-800 hover:bg-orange-50 dark:hover:bg-orange-900/30 text-slate-600 dark:text-slate-400 hover:text-orange-600 font-normal rounded-xl text-[10px] transition-all border border-slate-100 dark:border-slate-700"
              >
                {inquiry.status === 'Pending' ? 'Mark Resolved' : 'Re-open'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderOverview = () => (
    <div className="space-y-12 animate-in fade-in duration-1000">
      <div className="bg-[#334155] rounded-[2.5rem] p-12 text-left shadow-xl border border-slate-700 relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-12 opacity-5 translate-x-1/4 translate-y-1/4 group-hover:translate-x-0 transition-transform duration-1000">
           <Send size={300} />
        </div>
        <div className="relative z-10 max-w-2xl">
          <h1 className="text-2xl font-normal text-white tracking-tight flex items-center gap-2 mb-2">
            {isPlatformAdmin ? 'Platform Partner Outreach' : 'Communication & Messaging'}
          </h1>
          <p className="text-[#94a3b8] text-sm font-medium mb-8">
             {isPlatformAdmin 
               ? 'Send global updates to partners and manage support inquiries.' 
               : 'Send instant SMS blasts to parents and teachers effortlessly.'}
          </p>
          <div className="flex flex-wrap gap-4">
            <button 
              onClick={() => setActiveTab('Compose')}
              className="bg-orange-600 text-white px-8 py-4 rounded-2xl font-normal text-sm shadow-xl shadow-orange-950/20 hover:bg-orange-700 transition-all active:scale-95"
            >
              Compose {isPlatformAdmin ? 'Global' : 'New'} Message
            </button>
            {isPlatformAdmin && (
              <button 
                onClick={() => setActiveTab('Support Inbox')}
                className="bg-white/10 text-white border border-white/20 px-8 py-4 rounded-2xl font-normal text-sm backdrop-blur-sm hover:bg-white/20 transition-all active:scale-95 flex items-center gap-2"
              >
                <MessageSquare size={18} /> View Support Requests
              </button>
            )}
          </div>
        </div>
      </div>
      
      {/* Platform Vision Stats (Admin only) */}
      {isPlatformAdmin && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
           <div className="bg-white dark:bg-slate-900 p-10 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 text-left">
              <div className="flex justify-between items-start mb-6">
                 <div className="p-4 bg-orange-50 dark:bg-orange-950/30 text-orange-600 rounded-2xl"><Send size={24} /></div>
                 <span className="text-[10px] font-normal text-slate-400 bg-slate-50 dark:bg-slate-800 px-3 py-1 rounded-full  tracking-widest">Broadcasts</span>
              </div>
              <h4 className="text-xl font-normal dark:text-white mb-1">Global Scale</h4>
              <p className="text-sm text-slate-500 font-medium">Reach {schools.length} Directors instantly via bulk SMS routes.</p>
           </div>
           <div className="bg-white dark:bg-slate-900 p-10 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 text-left">
              <div className="flex justify-between items-start mb-6">
                 <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 rounded-2xl"><MessageSquare size={24} /></div>
                 <span className="text-[10px] font-normal text-slate-400 bg-slate-50 dark:bg-slate-800 px-3 py-1 rounded-full  tracking-widest">Inquiries</span>
              </div>
              <h4 className="text-xl font-normal dark:text-white mb-1">Support Quality</h4>
              <p className="text-sm text-slate-500 font-medium">{supportInquiries.filter(i => i.status === 'Pending').length} Pending help requests needing attention.</p>
           </div>
           <div className="bg-white dark:bg-slate-900 p-10 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 text-left">
              <div className="flex justify-between items-start mb-6">
                 <div className="p-4 bg-sky-50 dark:bg-sky-950/30 text-sky-600 rounded-2xl"><Zap size={24} /></div>
                 <span className="text-[10px] font-normal text-slate-400 bg-slate-50 dark:bg-slate-800 px-3 py-1 rounded-full  tracking-widest">Updates</span>
              </div>
              <h4 className="text-xl font-normal dark:text-white mb-1">Feature Velocity</h4>
              <p className="text-sm text-slate-500 font-medium">Inform partners about upcoming Edu-Fintech transitions.</p>
           </div>
        </div>
      )}
    </div>
  );

  const renderCompose = () => (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-700">
      <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] p-8 border border-slate-100 dark:border-slate-700 shadow-sm text-left">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <div className="space-y-3">
            <label className="text-xs font-normal text-slate-500 tracking-tight ml-2">Target Recipients</label>
            <div className="relative group/select">
              <button 
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl py-3.5 px-6 text-sm font-normal flex items-center justify-between group-hover/select:border-orange-300 transition-all dark:text-white"
              >
                <div className="flex items-center gap-2">
                   <UserCheck size={16} className="text-orange-500" />
                   <span>{recipient}</span>
                </div>
                <MoreHorizontal size={16} className="text-slate-400" />
              </button>

              <AnimatePresence>
                {isDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-[60]" onClick={() => setIsDropdownOpen(false)} />
                    <motion.div 
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute left-0 mt-3 w-full bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-3xl shadow-2xl z-[70] overflow-hidden min-w-[280px]"
                    >
                      <div className="max-h-[350px] overflow-y-auto custom-scrollbar p-2">
                        {isPlatformAdmin ? (
                          <div className="space-y-1">
                            <div className="px-4 py-2 text-[10px] font-normal text-slate-400  tracking-widest">Global Outreach</div>
                            {['All School Directors', 'Starter Kit Partners', 'Professional Kit Partners', 'Elite Kit Partners'].map(opt => (
                              <button 
                                key={opt}
                                onClick={() => { setRecipient(opt); setIsDropdownOpen(false); }}
                                className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-normal transition-colors ${recipient === opt ? 'bg-orange-50 text-orange-600' : 'hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'}`}
                              >
                                {opt}
                              </button>
                            ))}
                            <div className="px-4 py-2 mt-2 text-[10px] font-normal text-slate-400  tracking-widest">Individual Schools</div>
                            {schools.map(s => (
                              <button 
                                key={s.id}
                                onClick={() => { setRecipient(s.directorPhone); setIsDropdownOpen(false); }}
                                className="w-full text-left px-4 py-2.5 rounded-xl text-xs font-normal hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
                              >
                                {s.schoolName}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <div className="px-4 py-2 text-[10px] font-normal text-slate-400  tracking-widest">Role Groups</div>
                            {isAdmin && (
                              <>
                                <button onClick={() => { setRecipient('All Parents'); setIsDropdownOpen(false); }} className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-normal ${recipient === 'All Parents' ? 'bg-orange-50 text-orange-600' : 'hover:bg-slate-50 text-slate-700 dark:text-slate-300'}`}>All Parents</button>
                                <button onClick={() => { setRecipient('All Teachers'); setIsDropdownOpen(false); }} className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-normal ${recipient === 'All Teachers' ? 'bg-orange-50 text-orange-600' : 'hover:bg-slate-50 text-slate-700 dark:text-slate-300'}`}>All Teachers</button>
                              </>
                            )}
                            <div className="px-4 py-2 mt-2 text-[10px] font-normal text-slate-400  tracking-widest">Grades</div>
                            <div className="grid grid-cols-2 gap-1 px-2">
                               {['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9'].map(g => (
                                 <button key={g} onClick={() => { setRecipient(g); setIsDropdownOpen(false); }} className={`text-left px-3 py-2 rounded-lg text-[11px] font-normal ${recipient === g ? 'bg-orange-50 text-orange-600' : 'hover:bg-slate-50 text-slate-600 dark:text-slate-400'}`}>{g}</button>
                               ))}
                            </div>
                            <div className="px-4 py-2 mt-2 text-[10px] font-normal text-slate-400  tracking-widest">Learners</div>
                            {students.slice(0, 50).map(s => (
                              <button key={s.id} onClick={() => { setRecipient(s.name); setIsDropdownOpen(false); }} className="w-full text-left px-4 py-2.5 rounded-xl text-xs font-normal hover:bg-slate-50 text-slate-700 dark:text-slate-300">{s.name}</button>
                            ))}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
          <div className="space-y-3">
             <label className="text-xs font-normal text-slate-500 tracking-tight ml-2">Quick Templates</label>
             <select 
               onChange={(e) => setMessage(e.target.value)}
               className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl py-3.5 px-5 text-sm font-normal focus:ring-2 focus:ring-orange-500 outline-none transition-all dark:text-white appearance-none"
             >
               <option value="">Select a template...</option>
               {dbTemplates.map(t => <option key={t.id} value={t.body}>{t.title}</option>)}
             </select>
          </div>
        </div>

        <div className="space-y-3 mb-8">
          <div className="flex justify-between items-center px-2">
             <label className="text-xs font-normal text-slate-500 tracking-tight ml-2">Message Body</label>
             <span className={`text-[10px] font-normal ${message.length > 160 ? 'text-orange-500' : 'text-slate-400'}`}>
                {message.length} CHARS • {Math.ceil(message.length / 160)} SMS PARTS
             </span>
          </div>
          <textarea 
            rows={5}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={isPlatformAdmin ? "Inform directors about new features or billing updates..." : "Communicate with parents or staff..."}
            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-[2rem] py-5 px-6 text-sm font-medium focus:ring-2 focus:ring-orange-500 outline-none transition-all dark:text-white resize-none"
          ></textarea>
        </div>

        <button 
          onClick={handleSendBulk}
          disabled={isSending || !message}
          className="w-full bg-orange-600 hover:bg-orange-700 text-white font-normal py-4 rounded-2xl shadow-lg shadow-orange-500/20 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3 text-sm tracking-tight"
        >
          {isSending ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
          {isSending ? 'Sending Broadcast...' : isPlatformAdmin ? 'Broadcast Global Update' : `Send Blast to ${recipient}`}
        </button>
      </div>
    </div>
  );

  return (
    <div className={`min-h-screen animate-in fade-in duration-700 font-sans text-slate-800 bg-slate-50 dark:bg-[#0f1219] ${isPlatformAdmin ? 'p-0' : 'p-4 lg:p-8'}`}>
      <div className={`w-full mx-auto space-y-8 ${isPlatformAdmin ? 'max-w-full' : 'max-w-7xl'}`}>
        
        {/* Navigation Pills */}
        <div className={`flex gap-3 overflow-x-auto scrollbar-hide pb-2 ${isPlatformAdmin ? 'px-8 pt-8' : ''}`}>
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.name;
            return (
              <button
                key={tab.name}
                onClick={() => setActiveTab(tab.name as any)}
                className={`flex items-center gap-2 px-6 py-3 rounded-full text-sm font-normal whitespace-nowrap transition-all ${
                  isActive 
                    ? 'bg-orange-600 text-white shadow-xl shadow-orange-500/10' 
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
                }`}
              >
                <Icon size={16} />
                {tab.name}
              </button>
            )
          })}
        </div>

        {/* Tab Content */}
        <div className={`min-h-[600px] ${isPlatformAdmin ? 'px-8 pb-20' : ''}`}>
          {activeTab === 'Overview' && renderOverview()}
          {activeTab === 'Compose' && renderCompose()}
          {activeTab === 'Support Inbox' && isPlatformAdmin && renderSupportInbox()}
          {activeTab === 'History' && (
             <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden text-left animate-in fade-in duration-700">
               <div className="p-8 border-b border-slate-50 dark:border-slate-700 flex justify-between items-center">
                  <h3 className="font-normal text-slate-800 dark:text-white tracking-tight text-lg">{isPlatformAdmin ? 'SaaS Broadcast Log' : 'Institutional History'}</h3>
                  <button className="text-xs font-normal text-orange-600 hover:text-orange-700 transition-colors  tracking-widest">Global Download</button>
               </div>
               <div className="overflow-x-auto">
                 <table className="w-full">
                   <thead>
                     <tr className="bg-slate-50 dark:bg-slate-900/50">
                       <th className="p-5 text-left text-[11px] font-normal text-slate-400 tracking-tight ">Timestamp</th>
                       <th className="p-5 text-left text-[11px] font-normal text-slate-400 tracking-tight ">{isPlatformAdmin ? 'Target Edition' : 'Recipient'}</th>
                       <th className="p-5 text-left text-[11px] font-normal text-slate-400 tracking-tight ">Message Payload</th>
                       <th className="p-5 text-center text-[11px] font-normal text-slate-400 tracking-tight ">Outcome</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                     {history.length === 0 ? (
                       <tr><td colSpan={5} className="p-16 text-center text-slate-400 text-sm font-medium">No system broadcasts found.</td></tr>
                     ) : history.map(log => (
                       <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors group">
                         <td className="p-5 text-xs font-normal text-slate-700 dark:text-slate-300">
                           {log.timestamp?.toDate ? log.timestamp.toDate().toLocaleDateString() : 'Today'}
                         </td>
                         <td className="p-5 font-normal text-[13px] text-orange-600">{log.recipients}</td>
                         <td className="p-5 text-xs text-slate-500 dark:text-slate-400 max-w-xs">{log.message}</td>
                         <td className="p-5 text-center">
                            <span className="px-3 py-1 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-full text-[10px] font-normal tracking-tight border border-green-100 dark:border-green-900/50">
                               {log.status}
                            </span>
                         </td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
             </div>
          )}
          {activeTab === 'Templates' && (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-bottom-4 duration-500">
               <div className="md:col-span-2 bg-gradient-to-r from-[#334155] to-slate-700 rounded-[2rem] p-8 text-white flex items-center justify-between shadow-xl mb-4">
                 <div>
                     <h3 className="text-2xl font-normal mb-1 tracking-tight leading-none">Global partner templates</h3>
                    <p className="text-slate-300 text-sm font-medium mt-2">Reusable messages for SaaS updates, maintenance, and features.</p>
                 </div>
                 <button 
                   onClick={() => setIsTemplateModalOpen(true)}
                   className="bg-orange-600 text-white px-8 py-4 rounded-2xl font-normal text-xs hover:scale-105 transition-all shadow-lg active:scale-95 flex items-center gap-2 border border-orange-500"
                 >
                   <Plus size={16} /> New SaaS Template
                 </button>
               </div>
               {dbTemplates.map(template => (
                 <div key={template.id} className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm text-left flex flex-col justify-between group hover:border-orange-200 transition-colors">
                   <div>
                     <h4 className="font-normal text-slate-800 dark:text-white tracking-tight  text-sm mb-4">{template.title}</h4>
                     <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 font-medium">"{template.body}"</p>
                   </div>
                   <button 
                     onClick={() => { setMessage(template.body); setActiveTab('Compose'); toast.success('Applied!'); }}
                     className="w-full bg-slate-50 dark:bg-slate-800 hover:bg-orange-600 hover:text-white text-slate-600 dark:text-slate-400 font-normal py-4 rounded-2xl transition-all text-[11px] flex items-center justify-center gap-2"
                   >
                     Apply to Broadcaster
                   </button>
                 </div>
               ))}
             </div>
          )}
        </div>

        {/* Template Modal */}
        {isTemplateModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-start justify-center pt-20 px-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white dark:bg-slate-800 w-full max-w-lg rounded-[2.5rem] p-8 shadow-2xl border border-slate-100 dark:border-slate-700 animate-in zoom-in-95 duration-300">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-normal text-slate-800 dark:text-white tracking-tight ">New SaaS Template</h3>
                <button onClick={() => setIsTemplateModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>
              <div className="space-y-6">
                 <div className="space-y-2 text-left">
                   <label className="text-[10px] font-normal text-slate-400 tracking-widest ml-2 ">Subject title</label>
                   <input 
                     type="text" 
                     value={newTemplate.title}
                     onChange={(e) => setNewTemplate({...newTemplate, title: e.target.value})}
                     className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl py-4 px-6 text-sm font-normal focus:ring-2 focus:ring-orange-500 outline-none transition-all dark:text-white"
                   />
                 </div>
                 <div className="space-y-2 text-left">
                   <label className="text-[10px] font-normal text-slate-400 tracking-widest ml-2 ">Message payload</label>
                   <textarea 
                     rows={4} 
                     value={newTemplate.body}
                     onChange={(e) => setNewTemplate({...newTemplate, body: e.target.value})}
                     className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-[1.5rem] py-4 px-6 text-sm font-medium focus:ring-2 focus:ring-orange-500 outline-none transition-all dark:text-white"
                   />
                 </div>
                 <button 
                  onClick={async () => {
                    if (!newTemplate.title || !newTemplate.body) {
                      toast.error('Check fields');
                      return;
                    }
                    await addDoc(collection(db, 'sms_templates'), { schoolId: 'BRIGHTSOMA_SAAS', type: 'Global_SaaS', ...newTemplate, createdAt: serverTimestamp() });
                    toast.success('SaaS Template Live!');
                    setIsTemplateModalOpen(false);
                  }}
                  className="w-full py-4 bg-orange-600 text-white font-normal rounded-2xl shadow-xl hover:bg-orange-700 transition-all text-sm "
                 >
                   Save Global Template
                 </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CommunicationModule;
