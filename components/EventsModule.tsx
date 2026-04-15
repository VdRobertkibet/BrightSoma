import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Plus, 
  X, 
  Clock, 
  MapPin, 
  Users, 
  Trash2, 
  Search,
  LayoutGrid,
  List,
  ChevronRight,
  Zap,
  MoreHorizontal
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db, auth } from '../src/firebase';
import { collection, addDoc, onSnapshot, query, where, deleteDoc, doc, serverTimestamp, getDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';

interface SchoolEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  type: string;
  description: string;
  attendees: string;
  schoolId: string;
  createdAt: any;
}

const EventsModule: React.FC = () => {
  const [events, setEvents] = useState<SchoolEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [newEvent, setNewEvent] = useState({
    title: '',
    date: '',
    time: '',
    location: '',
    type: 'Meeting',
    description: '',
    attendees: 'All Staff & Parents'
  });

  useEffect(() => {
    let unsubscribe: () => void;

    const fetchEvents = async () => {
      const user = auth.currentUser;
      if (!user) return;

      let schoolId = user.uid;
      const staffDocRef = doc(db, 'staff', user.uid);
      const staffDocSnap = await getDoc(staffDocRef);
      if (staffDocSnap.exists()) {
        schoolId = staffDocSnap.data().schoolId;
      }

      const q = query(collection(db, 'events'), where('schoolId', '==', schoolId));
      unsubscribe = onSnapshot(q, (snapshot) => {
        const eventData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SchoolEvent));
        eventData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        setEvents(eventData);
        setIsLoading(false); // Always set false instantly on first snapshot
      }, () => {
        setIsLoading(false); // Also handle errors gracefully
      });
    };

    fetchEvents();
    return () => unsubscribe && unsubscribe();
  }, []);

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user) return;

    try {
      let schoolId = user.uid;
      const staffDocRef = doc(db, 'staff', user.uid);
      const staffDocSnap = await getDoc(staffDocRef);
      if (staffDocSnap.exists()) {
        schoolId = staffDocSnap.data().schoolId;
      }

      await addDoc(collection(db, 'events'), {
        ...newEvent,
        schoolId,
        createdAt: serverTimestamp()
      });

      toast.success('Event scheduled successfully!');
      setShowAddModal(false);
      setNewEvent({
        title: '',
        date: '',
        time: '',
        location: '',
        type: 'Meeting',
        description: '',
        attendees: 'All Staff & Parents'
      });
    } catch (error) {
      toast.error('Failed to schedule event.');
    }
  };

  const handleDeleteEvent = async (id: string) => {
    if (!window.confirm('Are you sure you want to cancel this event?')) return;
    try {
      await deleteDoc(doc(db, 'events', id));
      toast.success('Event cancelled.');
    } catch (error) {
      toast.error('Failed to cancel event.');
    }
  };

  const filteredEvents = events.filter(e => 
    e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-700 font-sans pb-20">
      {/* Premium Header */}
      <div className="relative -mx-4 md:-mx-8 -mt-4 md:-mt-8 bg-[#334155] py-8 border-b border-slate-700 shadow-sm px-4 md:px-8 overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12 translate-x-1/4">
           <Calendar size={240} className="text-white" />
        </div>
        
        <div className="w-full max-w-7xl mx-auto relative z-10">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-orange-600 rounded-2xl shadow-lg shadow-orange-900/20">
                <Calendar size={32} className="text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-normal text-white tracking-tight">Events Management</h2>
                <p className="text-sm text-slate-300 mt-1">Schedule tours, AG meetings, and official school ceremonies.</p>
              </div>
            </div>
            
            <button 
              onClick={() => setShowAddModal(true)}
              className="flex items-center justify-center gap-2 px-8 py-4 bg-orange-600 text-white rounded-2xl text-sm font-normal tracking-wide hover:bg-orange-700 transition-all shadow-xl shadow-orange-900/20 active:scale-95 group border border-orange-500/20"
            >
              <Plus size={20} className="group-hover:rotate-90 transition-transform duration-300" /> 
              Schedule Event
            </button>
          </div>

          <div className="mt-10 flex flex-col md:flex-row md:items-center justify-between gap-6 pt-8 border-t border-white/10">
            <div className="flex p-1.5 bg-black/20 border border-white/10 rounded-[2rem] overflow-hidden backdrop-blur-md w-full md:w-fit">
              <div className="flex items-center gap-3 px-5 py-2.5 text-white/50 border-r border-white/10 mr-2">
                <Search size={18} />
              </div>
              <input 
                type="text"
                placeholder="Search events..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent text-sm font-normal text-white placeholder:text-white/40 outline-none px-4 flex-1 md:min-w-[300px]"
              />
            </div>

            <div className="flex items-center gap-3 p-1 bg-black/20 rounded-2xl border border-white/10 backdrop-blur-md self-end md:self-auto">
              <button 
                onClick={() => setViewMode('grid')}
                className={`p-2.5 rounded-xl transition-all ${viewMode === 'grid' ? 'bg-white text-slate-800' : 'text-white/60 hover:text-white'}`}
              >
                <LayoutGrid size={18} />
              </button>
              <button 
                onClick={() => setViewMode('list')}
                className={`p-2.5 rounded-xl transition-all ${viewMode === 'list' ? 'bg-white text-slate-800' : 'text-white/60 hover:text-white'}`}
              >
                <List size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-12 h-12 border-4 border-orange-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm font-normal text-slate-500">Loading your calendar...</p>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-[3rem] border border-dashed border-slate-200 dark:border-slate-800 p-20 text-center animate-in fade-in zoom-in duration-700 shadow-sm max-w-4xl mx-auto mt-10">
            <div className="w-20 h-20 bg-orange-50 dark:bg-orange-900/20 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-sm">
              <Calendar size={40} className="text-orange-400 dark:text-orange-500" />
            </div>
            <h3 className="text-2xl font-normal text-slate-800 dark:text-slate-100 tracking-tight mb-3">No event has been planned</h3>
            <p className="text-slate-500 dark:text-slate-400 mb-10 max-w-md mx-auto text-sm font-normal leading-relaxed">
              Your school calendar is currently empty. Start by scheduling an AG meeting, a school tour, or any other official event.
            </p>
            <button 
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-3 px-10 py-4 bg-orange-600 text-white rounded-2xl text-[11px] font-normal tracking-wide hover:bg-orange-700 transition-all shadow-md active:scale-95 group"
            >
              <Plus size={18} className="group-hover:rotate-90 transition-transform" /> 
              Schedule First Event
            </button>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pt-4">
            {filteredEvents.map(event => (
              <motion.div 
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                key={event.id} 
                className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 group relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform duration-700">
                  <Zap size={100} />
                </div>
                
                <div className="flex justify-between items-start mb-6">
                  <div className={`px-4 py-1.5 rounded-full text-[10px] font-normal tracking-widest ${
                    event.type === 'Meeting' ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30' :
                    event.type === 'Tour' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30' :
                    'bg-orange-50 text-orange-600 dark:bg-orange-900/30'
                  }`}>
                    {event.type.toUpperCase()}
                  </div>
                  <button 
                    onClick={() => handleDeleteEvent(event.id)}
                    className="p-2 text-slate-300 hover:text-rose-500 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                <h4 className="text-xl font-normal text-slate-800 dark:text-white mb-4 leading-tight group-hover:text-orange-600 transition-colors">{event.title}</h4>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 font-normal line-clamp-2">"{event.description}"</p>

                <div className="space-y-4 pt-6 border-t border-slate-50 dark:border-slate-800">
                   <div className="flex items-center gap-3 text-slate-600 dark:text-slate-400">
                      <Clock size={16} className="text-orange-500" />
                      <span className="text-xs font-normal">{new Date(event.date).toLocaleDateString()} at {event.time}</span>
                   </div>
                   <div className="flex items-center gap-3 text-slate-600 dark:text-slate-400">
                      <MapPin size={16} className="text-orange-500" />
                      <span className="text-xs font-normal">{event.location}</span>
                   </div>
                   <div className="flex items-center gap-3 text-slate-600 dark:text-slate-400">
                      <Users size={16} className="text-orange-500" />
                      <span className="text-xs font-normal leading-none">{event.attendees}</span>
                   </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="space-y-4 pt-4">
            {filteredEvents.map(event => (
              <div key={event.id} className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between group hover:border-orange-200 transition-all">
                <div className="flex items-center gap-6">
                   <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl text-slate-400 group-hover:bg-orange-50 dark:group-hover:bg-orange-900/20 group-hover:text-orange-500 transition-all">
                      <Calendar size={24} />
                   </div>
                   <div>
                     <div className="flex items-center gap-3 mb-1">
                        <h4 className="font-normal text-slate-800 dark:text-white">{event.title}</h4>
                        <span className="text-[10px] px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500 font-normal">{event.type}</span>
                     </div>
                     <p className="text-xs text-slate-500 dark:text-slate-400">{event.location} • {new Date(event.date).toLocaleDateString()}</p>
                   </div>
                </div>
                <div className="flex items-center gap-6 mt-4 md:mt-0">
                   <div className="text-right hidden md:block">
                      <p className="text-[10px] font-normal text-slate-400 mb-1">AUDIENCE</p>
                      <p className="text-xs font-normal text-slate-600 dark:text-slate-300">{event.attendees}</p>
                   </div>
                   <button 
                    onClick={() => handleDeleteEvent(event.id)}
                    className="p-3 bg-slate-50 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-900/30 text-slate-400 hover:text-rose-500 rounded-2xl transition-all"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Event Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800"
            >
              <div className="px-8 py-6 border-b border-slate-50 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/30">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-orange-600 rounded-2xl shadow-lg shadow-orange-900/20">
                    <Plus size={24} className="text-white" />
                  </div>
                  <h3 className="text-xl font-normal text-slate-800 dark:text-white">Schedule New Event</h3>
                </div>
                <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleAddEvent} className="p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-xs font-normal text-slate-500 ml-2">Event Title</label>
                    <input 
                      type="text" 
                      required
                      value={newEvent.title}
                      onChange={e => setNewEvent({...newEvent, title: e.target.value})}
                      placeholder="e.g., Annual General Meeting (AGM)"
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl py-4 px-6 text-sm font-normal focus:ring-2 focus:ring-orange-500 outline-none transition-all dark:text-white"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-xs font-normal text-slate-500 ml-2">Date</label>
                    <input 
                      type="date" 
                      required
                      value={newEvent.date}
                      onChange={e => setNewEvent({...newEvent, date: e.target.value})}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl py-4 px-6 text-sm font-normal focus:ring-2 focus:ring-orange-500 outline-none transition-all dark:text-white"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-normal text-slate-500 ml-2">Time</label>
                    <input 
                      type="time" 
                      required
                      value={newEvent.time}
                      onChange={e => setNewEvent({...newEvent, time: e.target.value})}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl py-4 px-6 text-sm font-normal focus:ring-2 focus:ring-orange-500 outline-none transition-all dark:text-white"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-normal text-slate-500 ml-2">Location</label>
                    <input 
                      type="text" 
                      required
                      value={newEvent.location}
                      onChange={e => setNewEvent({...newEvent, location: e.target.value})}
                      placeholder="e.g., School Main Hall"
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl py-4 px-6 text-sm font-normal focus:ring-2 focus:ring-orange-500 outline-none transition-all dark:text-white"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-normal text-slate-500 ml-2">Event Type</label>
                    <select 
                      value={newEvent.type}
                      onChange={e => setNewEvent({...newEvent, type: e.target.value})}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl py-4 px-6 text-sm font-normal focus:ring-2 focus:ring-orange-500 outline-none transition-all dark:text-white"
                    >
                      <option value="Meeting">Meeting</option>
                      <option value="Tour">School Tour</option>
                      <option value="Ceremony">Ceremony</option>
                      <option value="Academic">Academic Event</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <label className="text-xs font-normal text-slate-500 ml-2">Target Audience</label>
                    <select 
                      value={newEvent.attendees}
                      onChange={e => setNewEvent({...newEvent, attendees: e.target.value})}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl py-4 px-6 text-sm font-normal focus:ring-2 focus:ring-orange-500 outline-none transition-all dark:text-white"
                    >
                      <option value="All Staff & Parents">All Staff & Parents</option>
                      <option value="Teachers Only">Teachers Only</option>
                      <option value="Parents Only">Parents Only</option>
                      <option value="Specific Grade Parents">Specific Grade Parents</option>
                      <option value="School Directors">School Directors</option>
                    </select>
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <label className="text-xs font-normal text-slate-500 ml-2">Brief Description</label>
                    <textarea 
                      required
                      value={newEvent.description}
                      onChange={e => setNewEvent({...newEvent, description: e.target.value})}
                      rows={3}
                      placeholder="Provide key details about the event..."
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-[1.5rem] py-4 px-6 text-sm font-normal focus:ring-2 focus:ring-orange-500 outline-none transition-all dark:text-white resize-none"
                    />
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-50 dark:border-slate-800 flex justify-end gap-3">
                  <button 
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-8 py-4 text-sm font-normal text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="px-12 py-4 bg-orange-600 text-white rounded-2xl text-sm font-normal tracking-wide hover:bg-orange-700 transition-all shadow-xl shadow-orange-900/20 active:scale-95 flex items-center gap-2"
                  >
                    <Zap size={18} />
                    Confirm & Publish
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default EventsModule;
