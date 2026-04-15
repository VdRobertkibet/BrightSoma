
import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  Tag, 
  Box, 
  ArrowRight, 
  Search, 
  Filter, 
  Plus, 
  BookOpen, 
  FlaskConical, 
  Palette, 
  ClipboardList,
  Loader2,
  X,
  CheckCircle2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { db, auth } from '../src/firebase';
import { collection, query, where, onSnapshot, getDocs, addDoc, updateDoc, doc, deleteDoc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { InventoryItem } from '../types';

interface InventoryModuleProps {
  academicPeriod: string;
}

const InventoryModule: React.FC<InventoryModuleProps> = ({ academicPeriod }) => {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'all' | 'healthy' | 'critical'>('all');

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      let schoolId = user.uid;
      const staffDocRef = doc(db, 'staff', user.uid);
      const staffDocSnap = await getDoc(staffDocRef);
      if (staffDocSnap.exists()) {
        const staffData = staffDocSnap.data();
        if (staffData?.schoolId) {
          schoolId = staffData.schoolId;
        }
      }

      const q = query(collection(db, 'inventory'), where('schoolId', '==', schoolId));
      const unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
        const items: InventoryItem[] = [];
        snapshot.forEach((doc) => {
          items.push({ id: doc.id, ...doc.data() } as InventoryItem);
        });
        setInventory(items);
        setIsLoading(false);
      }, (error) => {
        console.error("Error fetching inventory:", error);
        toast.error("Failed to load inventory.");
        setIsLoading(false);
      });

      return () => unsubscribeSnapshot();
    });

    return () => unsubscribeAuth();
  }, []);

  const handleSaveItem = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const itemData = {
      name: formData.get('name') as string,
      category: formData.get('category') as string,
      quantity: Number(formData.get('quantity')),
      lowStockThreshold: Number(formData.get('lowStockThreshold')),
      condition: formData.get('condition') as any,
    };

    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Not authenticated");

      let schoolId = user.uid;
      const staffDocRef = doc(db, 'staff', user.uid);
      const staffDocSnap = await getDoc(staffDocRef);
      if (staffDocSnap.exists()) {
        const staffData = staffDocSnap.data();
        if (staffData?.schoolId) {
          schoolId = staffData.schoolId;
        }
      }

      if (editingItem) {
        await updateDoc(doc(db, 'inventory', editingItem.id), itemData);
        toast.success('Inventory item updated');
      } else {
        await addDoc(collection(db, 'inventory'), { ...itemData, schoolId });
        toast.success('New item added to inventory');
      }
      setShowAddModal(false);
      setEditingItem(null);
    } catch (error) {
      console.error("Error saving inventory item:", error);
      toast.error("Failed to save item");
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return;
    try {
      await deleteDoc(doc(db, 'inventory', id));
      toast.success('Item removed from inventory');
    } catch (error) {
      console.error("Error deleting item:", error);
      toast.error("Failed to delete item");
    }
  };

  const criticalItems = inventory.filter(item => item.quantity <= item.lowStockThreshold);

  const filteredInventory = inventory.filter(item => {
    if (activeSubTab === 'all') return true;
    if (activeSubTab === 'healthy') return item.quantity > item.lowStockThreshold;
    if (activeSubTab === 'critical') return item.quantity <= item.lowStockThreshold;
    return true;
  });

  return (
    <div className="space-y-10 animate-in fade-in duration-700 font-sans">
      {/* Dashboard Style Hero Card */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-[2.5rem] p-10 shadow-sm border border-slate-700 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-3xl -mr-64 -mt-64 group-hover:bg-blue-500/20 transition-all duration-1000"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div>
            <h2 className="text-3xl font-bold text-white tracking-tight leading-tight mb-2">School Inventory</h2>
            <p className="text-sm font-bold text-slate-400 max-w-xl leading-relaxed">
              Track school books, learning equipment, and stationary with easy visibility.
            </p>
          </div>
          <div className="flex gap-4">
            <div className="p-6 bg-slate-800/50 rounded-[2rem] border border-slate-700 shadow-sm min-w-[140px]">
              <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Total Items</p>
              <p className="text-xl font-bold text-white tracking-tight">{inventory.length}</p>
            </div>
            <button 
              onClick={() => {
                setEditingItem(null);
                setShowAddModal(true);
              }}
              className="p-6 bg-white rounded-[2rem] shadow-sm min-w-[140px] flex flex-col items-center justify-center hover:bg-slate-50 transition-all active:scale-95 group"
            >
              <Plus size={24} className="text-slate-900 mb-2 group-hover:rotate-90 transition-transform" />
              <p className="text-[10px] font-bold text-slate-900 uppercase">Add Item</p>
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 p-1.5 bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-[2rem] w-fit">
        {[
          { id: 'all', label: 'All Inventory', icon: <Box size={14} strokeWidth={2.5} /> },
          { id: 'healthy', label: 'Stock Healthy', icon: <CheckCircle2 size={14} strokeWidth={2.5} /> },
          { id: 'critical', label: 'Low Stock', icon: <AlertTriangle size={14} strokeWidth={2.5} /> },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id as any)}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-[1.5rem] text-[11px] font-bold uppercase transition-all duration-300 ${
              activeSubTab === tab.id 
                ? 'bg-white text-slate-900 shadow-sm scale-105' 
                : 'text-slate-500 hover:bg-white/50 dark:hover:bg-slate-700/50'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Recent Assignments - Moved Above Menu */}
      <div className="bg-white dark:bg-slate-900 rounded-[0.875rem] border border-slate-100 dark:border-slate-800 shadow-xl overflow-hidden">
          <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg tracking-tight">Recent Assignments</h3>
              <button className="text-xs font-bold text-orange-600 dark:text-orange-400 hover:underline">Full Log</button>
          </div>
          <div className="p-6">
              <p className="text-sm text-slate-500 dark:text-slate-400">No recent assignments found.</p>
          </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-10 h-10 animate-spin text-orange-600" />
        </div>
      ) : filteredInventory.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 p-12 rounded-[0.875rem] border border-slate-100 dark:border-slate-800 shadow-xl text-center">
          <Box size={48} className="mx-auto text-slate-300 mb-4" />
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">No Inventory Items</h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-2">
            {activeSubTab === 'all' ? 'Start by registering your school assets and textbooks.' : 'No items match the selected filter.'}
          </p>
          {activeSubTab === 'all' && (
            <button 
              onClick={() => setShowAddModal(true)}
              className="mt-6 px-6 py-2 bg-orange-600 text-white rounded-[0.2625rem] text-sm font-bold"
            >
              Add First Item
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredInventory.map((item) => (
            <div key={item.id} className="bg-white dark:bg-slate-900 p-6 rounded-[0.875rem] border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/40 dark:shadow-orange-950/20 relative overflow-hidden group transition-all hover:-translate-y-1">
              <div className="flex items-start justify-between mb-6">
                  <div className={`p-3 rounded-[0.35rem] ${
                      item.category === 'Textbook' ? 'bg-blue-50 dark:bg-blue-900/20' :
                      item.category === 'Equipment' ? 'bg-orange-50 dark:bg-orange-900/20' : 'bg-amber-50 dark:bg-amber-900/20'
                  }`}>
                      {item.category === 'Textbook' ? <BookOpen size={20} className="text-slate-900 dark:text-slate-100" /> : 
                       item.category === 'Equipment' ? <FlaskConical size={20} className="text-slate-900 dark:text-slate-100" /> : <Palette size={20} className="text-slate-900 dark:text-slate-100" />}
                  </div>
                  <div className="flex gap-1">
                    {item.quantity <= item.lowStockThreshold && (
                        <div className="bg-rose-50 dark:bg-rose-900/20 text-rose-500 p-2 rounded-[0.2625rem] animate-pulse shadow-sm">
                            <AlertTriangle size={16} />
                        </div>
                    )}
                    <button 
                      onClick={() => {
                        setEditingItem(item);
                        setShowAddModal(true);
                      }}
                      className="p-2 text-slate-400 hover:text-orange-600 transition-colors"
                    >
                      <Search size={16} />
                    </button>
                  </div>
              </div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-1 leading-tight">{item.name}</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase mb-4">{item.category}</p>
              
              <div className="flex items-end justify-between">
                  <div>
                      <p className="text-[9px] font-bold text-slate-400 uppercase">Current Stock</p>
                      <p className={`text-2xl font-bold ${item.quantity <= item.lowStockThreshold ? 'text-rose-500' : 'text-slate-900 dark:text-slate-100'}`}>
                          {item.quantity}
                      </p>
                  </div>
                   <div className="text-right">
                      <p className="text-[9px] font-bold text-slate-400 uppercase">Condition</p>
                      <span className={`text-[10px] px-2 py-0.5 rounded-[0.13125rem] font-bold uppercase ${
                          item.condition === 'New' ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400' :
                          item.condition === 'Fair' ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}>
                          {item.condition}
                      </span>
                  </div>
              </div>

              <div className="absolute inset-x-0 bottom-0 h-1 bg-slate-50 dark:bg-slate-800 group-hover:h-1.5 transition-all">
                  <div 
                      className={`h-full transition-all duration-1000 ${item.quantity <= item.lowStockThreshold ? 'bg-rose-500' : 'bg-orange-500'}`} 
                      style={{ width: `${Math.min(100, (item.quantity / (item.lowStockThreshold * 2)) * 100)}%` }}
                  />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-100 dark:bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[0.875rem] shadow-2xl overflow-hidden relative animate-in slide-in-from-bottom-8 duration-500">
            <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">{editingItem ? 'Edit Asset' : 'Register New Asset'}</h3>
              <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-[0.2625rem] transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSaveItem} className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Asset Name</label>
                <input 
                  name="name"
                  defaultValue={editingItem?.name}
                  required
                  placeholder="e.g., Grade 4 Math Textbooks"
                  className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-[0.35rem] text-sm font-medium focus:outline-none focus:ring-2 focus:ring-orange-500/20 transition-all"
                />
              </div>
               <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Category</label>
                  <select 
                    name="category"
                    defaultValue={editingItem?.category || 'Textbook'}
                    className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-[0.35rem] text-sm font-medium focus:outline-none focus:ring-2 focus:ring-orange-500/20 transition-all"
                  >
                    <option value="Textbook">Textbook</option>
                    <option value="Equipment">Equipment</option>
                    <option value="Stationery">Stationery</option>
                    <option value="Furniture">Furniture</option>
                  </select>
                 </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Condition</label>
                  <select 
                    name="condition"
                    defaultValue={editingItem?.condition || 'New'}
                    className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-[0.35rem] text-sm font-medium focus:outline-none focus:ring-2 focus:ring-orange-500/20 transition-all"
                  >
                    <option value="New">New</option>
                    <option value="Fair">Fair</option>
                    <option value="Old">Old</option>
                  </select>
                </div>
              </div>
               <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Quantity</label>
                  <input 
                    name="quantity"
                    type="number"
                    defaultValue={editingItem?.quantity || 0}
                    required
                    className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-[0.35rem] text-sm font-medium focus:outline-none focus:ring-2 focus:ring-orange-500/20 transition-all"
                  />
                 </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Low Stock Alert</label>
                  <input 
                    name="lowStockThreshold"
                    type="number"
                    defaultValue={editingItem?.lowStockThreshold || 5}
                    required
                    className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-[0.35rem] text-sm font-medium focus:outline-none focus:ring-2 focus:ring-orange-500/20 transition-all"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                {editingItem && (
                  <button 
                    type="button"
                    onClick={() => handleDeleteItem(editingItem.id)}
                    className="px-6 py-3.5 bg-rose-50 text-rose-600 rounded-[0.35rem] font-bold text-sm"
                  >
                    Delete
                  </button>
                )}
                <button 
                  type="submit"
                  className="flex-1 py-3.5 bg-orange-600 text-white rounded-[0.35rem] font-bold text-sm shadow-lg shadow-orange-200"
                >
                  {editingItem ? 'Update Asset' : 'Register Asset'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryModule;

