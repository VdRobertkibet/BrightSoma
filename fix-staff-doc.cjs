const fs = require('fs');
const path = require('path');

const filePath = path.join('c:', 'Users', 'Hp', 'Downloads', 'BrightSoma', 'components', 'StaffManagement.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Fetch school profile to get grades and streams
content = content.replace(
  `const [selectedCategory, setSelectedCategory] = useState<StaffCategory>(null);`,
  `const [selectedCategory, setSelectedCategory] = useState<StaffCategory>(null);\n  const [schoolProfile, setSchoolProfile] = useState<any>(null);`
);

content = content.replace(
  `const qStaff = query(collection(db, 'staff'), where('schoolId', '==', schoolId));`,
  `const unsubSchool = onSnapshot(doc(db, 'schools', schoolId), (docSnap) => {\n      if (docSnap.exists()) setSchoolProfile(docSnap.data());\n    });\n    const qStaff = query(collection(db, 'staff'), where('schoolId', '==', schoolId));`
);

content = content.replace(
  `return () => { unsubCodes(); unsubStaff(); };`,
  `return () => { unsubCodes(); unsubStaff(); unsubSchool(); };`
);

// Define availableGrades / Streams before they are used
content = content.replace(
  `  const generateCode = async`,
  `  const availableGrades = schoolProfile?.grades?.length ? schoolProfile.grades : CBC_GRADES;\n  const availableStreams = schoolProfile?.streams?.length ? schoolProfile.streams : STREAMS;\n\n  const generateCode = async`
);

// Replace CBC_GRADES and STREAMS in TeacherForm with availableGrades and availableStreams
content = content.replace(/CBC_GRADES\.map/g, 'availableGrades.map');
content = content.replace(/CBC_GRADES\.length/g, 'availableGrades.length');
content = content.replace(/\[\.\.\.CBC_GRADES\]/g, '[...availableGrades]');
content = content.replace(/STREAMS\.map/g, 'availableStreams.map');

// 2. Add teaching allocation to generalStaffForm
content = content.replace(
  `contractType: 'Permanent',\n    durationOfContract: ''`,
  `contractType: 'Permanent',\n    durationOfContract: '',\n    teachingGrades: [] as string[],\n    teachingSubjects: {} as Record<string, string[]>,\n    classTeacherOf: '',\n    stream: ''`
);

content = content.replace(
  `contractType: 'Permanent', durationOfContract: ''`,
  `contractType: 'Permanent', durationOfContract: '', teachingGrades: [], teachingSubjects: {}, classTeacherOf: '', stream: ''`
);

content = content.replace(
  `durationOfContract: generalStaffForm.durationOfContract`,
  `durationOfContract: generalStaffForm.durationOfContract,\n        teachingGrades: generalStaffForm.teachingGrades,\n        teachingSubjects: generalStaffForm.teachingSubjects,\n        classTeacherOf: generalStaffForm.classTeacherOf,\n        stream: generalStaffForm.stream`
);

// 3. Render teaching fields if responsibility includes 'principal' (case insensitive)
const teachingFieldsBlock = `
                  {generalStaffForm.responsibility.toLowerCase().includes('principal') && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                      <div className="col-span-1 md:col-span-2">
                        <h5 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-3">
                          <BookOpen size={16} className="text-orange-500" /> Principal Teaching Allocation
                        </h5>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Stream</label>
                        <select value={generalStaffForm.stream} onChange={e => setGeneralStaffForm(p => ({...p, stream: e.target.value}))} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-800 dark:text-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all cursor-pointer">
                          <option value="">— No stream —</option>
                          {availableStreams.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Class teacher of</label>
                        <select value={generalStaffForm.classTeacherOf} onChange={e => setGeneralStaffForm(p => ({...p, classTeacherOf: e.target.value as string}))} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-800 dark:text-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all cursor-pointer">
                          <option value="">— Not a class teacher —</option>
                          {availableGrades.map(g => <option key={g} value={g}>{g}</option>)}
                        </select>
                      </div>
                      <div className="space-y-1.5 md:col-span-2">
                         <div className="flex justify-between items-center mb-1 flex-wrap gap-2">
                          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Teaching grades</label>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {availableGrades.map(g => {
                            const selected = generalStaffForm.teachingGrades.includes(g);
                            return (
                              <button
                                key={g}
                                type="button"
                                onClick={() => setGeneralStaffForm(p => ({
                                  ...p,
                                  teachingGrades: selected
                                    ? p.teachingGrades.filter(x => x !== g)
                                    : [...p.teachingGrades, g]
                                }))}
                                className={\`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all \${selected ? 'bg-orange-600 text-white border-orange-600' : 'bg-slate-50 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700'} \`}
                              >
                                {g}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      {generalStaffForm.teachingGrades.length > 0 && (
                        <div className="space-y-4 md:col-span-2">
                          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Subjects Teaching (Per Grade)</label>
                          {generalStaffForm.teachingGrades.map((grade) => (
                            <div key={grade} className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                              <p className="text-sm font-bold text-slate-800 dark:text-white mb-3">Subjects for {grade}</p>
                              <div className="flex flex-wrap gap-2">
                                {SUBJECTS.map(subject => {
                                  const isSelected = generalStaffForm.teachingSubjects[grade]?.includes(subject);
                                  return (
                                    <button
                                      key={subject}
                                      type="button"
                                      onClick={() => {
                                          setGeneralStaffForm(p => {
                                            const gradeSubjects = p.teachingSubjects[grade] || [];
                                            const updated = isSelected ? gradeSubjects.filter(s => s !== subject) : [...gradeSubjects, subject];
                                            return { ...p, teachingSubjects: { ...p.teachingSubjects, [grade]: updated } };
                                          });
                                      }}
                                      className={\`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all \${isSelected ? 'bg-orange-600 text-white border-orange-600' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700'} \`}
                                    >
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
                  )}
`;

content = content.replace(
  `                    <div className="space-y-1.5">\n                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Duration of Contract</label>\n                      <input type="text" value={generalStaffForm.durationOfContract} onChange={e => setGeneralStaffForm(p => ({...p, durationOfContract: e.target.value}))} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-800 dark:text-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all" placeholder="e.g. 1 Year, N/A" />\n                    </div>\n                  </div>`,
  `                    <div className="space-y-1.5">\n                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Duration of Contract</label>\n                      <input type="text" value={generalStaffForm.durationOfContract} onChange={e => setGeneralStaffForm(p => ({...p, durationOfContract: e.target.value}))} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-800 dark:text-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all" placeholder="e.g. 1 Year, N/A" />\n                    </div>\n                  </div>` + teachingFieldsBlock
);

// 4. Update the row display for role to use responsibility
content = content.replace(
  `}'}>{staff.role}</span>`,
  `}'}>{(staff as any).responsibility || staff.role}</span>`
);

// 5. Add edit staff functionality
const editStaffState = `
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);
  const [editStaffForm, setEditStaffForm] = useState<Partial<StaffMember>>({});

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
`;

content = content.replace(
  `const [filterRole, setFilterRole] = useState<StaffFilter>('ALL');`,
  `const [filterRole, setFilterRole] = useState<StaffFilter>('ALL');\n` + editStaffState
);

content = content.replace(
  `import { collection, addDoc, onSnapshot, deleteDoc, doc, query, where } from 'firebase/firestore'`,
  `import { collection, addDoc, onSnapshot, deleteDoc, doc, query, where, updateDoc } from 'firebase/firestore'`
);

content = content.replace(
  `<button onClick={() => toast('Edit staff coming soon!', { icon: '✏️' })} `,
  `<button onClick={() => { setEditStaffForm(staff); setEditingStaffId(staff.id); }} `
);

// Add the Edit Modal
const editModalString = `
      {/* Edit Staff Modal */}
      {editingStaffId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="relative bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl w-full max-w-lg p-8">
            <h3 className="text-xl font-bold mb-4">Edit Staff Member</h3>
            <form onSubmit={handleEditSave} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500">Name</label>
                <input type="text" value={editStaffForm.name || ''} onChange={e => setEditStaffForm(p => ({...p, name: e.target.value}))} className="w-full p-3 border rounded-xl" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500">Phone</label>
                <input type="text" value={editStaffForm.phone || ''} onChange={e => setEditStaffForm(p => ({...p, phone: e.target.value}))} className="w-full p-3 border rounded-xl" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500">Email</label>
                <input type="email" value={editStaffForm.email || ''} onChange={e => setEditStaffForm(p => ({...p, email: e.target.value}))} className="w-full p-3 border rounded-xl" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500">Responsibility</label>
                <input type="text" value={(editStaffForm as any).responsibility || ''} onChange={e => setEditStaffForm(p => ({...p, responsibility: e.target.value}))} className="w-full p-3 border rounded-xl" />
              </div>
              <div className="flex gap-3 justify-end mt-6">
                <button type="button" onClick={() => setEditingStaffId(null)} className="px-5 py-2 hover:bg-slate-100 rounded-xl font-bold">Cancel</button>
                <button type="submit" className="px-5 py-2 bg-orange-600 text-white rounded-xl font-bold">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
`;

content = content.replace(
  `{showAddModal && (`,
  editModalString + `\n      {showAddModal && (`
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Modifications applied successfully.');
