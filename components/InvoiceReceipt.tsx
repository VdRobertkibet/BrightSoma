import React, { forwardRef } from 'react';

interface InvoiceReceiptProps {
  type: 'receipt' | 'invoice';
  payment?: {
    id: string;
    amount: number;
    method: string;
    date: string;
    reference?: string;
    etimsInvoiceNumber?: string;
  } | null;
  student: {
    name: string;
    admissionNumber: string;
    grade?: string;
    stream?: string;
    balance?: number;
  } | null;
  schoolName: string;
  schoolLogo?: string | null;
  schoolPhone?: string;
  schoolEmail?: string;
  termLabel?: string;
  feeStructures?: Array<{ category: string; amount: number; grade?: string }>;
  allPayments?: Array<{ amount: number; date: string; method: string; reference?: string }>;
}

const InvoiceReceipt = forwardRef<HTMLDivElement, InvoiceReceiptProps>(
  ({ type, payment, student, schoolName, schoolLogo, schoolPhone, schoolEmail, termLabel, feeStructures, allPayments }, ref) => {
    const today = new Date().toLocaleDateString('en-GB', {
      day: 'numeric', month: 'long', year: 'numeric'
    });

    const [isEditing, setIsEditing] = React.useState(false);
    const [localFees, setLocalFees] = React.useState(feeStructures || []);
    
    // Update local fees if props change, but only if not currently editing to prevent overwriting user input
    React.useEffect(() => {
      if (!isEditing && feeStructures) {
        setLocalFees(feeStructures);
      }
    }, [feeStructures, isEditing]);

    const handleAddFee = () => {
      setLocalFees([...localFees, { category: 'New Fee Item', amount: 0 }]);
    };

    const handleUpdateFee = (index: number, field: 'category' | 'amount', value: string | number) => {
      const updated = [...localFees];
      updated[index] = { ...updated[index], [field]: value };
      setLocalFees(updated);
    };

    const handleDeleteFee = (index: number) => {
      setLocalFees(localFees.filter((_, i) => i !== index));
    };

    const receiptNo = payment?.id
      ? 'RCP-' + payment.id.substring(0, 8).toUpperCase()
      : 'INV-' + Date.now().toString().substring(7);

    const totalFees = localFees.reduce((sum, f) => sum + (Number(f.amount) || 0), 0);
    const totalPaid = allPayments?.reduce((sum, p) => sum + p.amount, 0) ?? (payment?.amount ?? 0);
    const balance = student?.balance ?? (totalFees - totalPaid);

    return (
      <div
        ref={ref}
        className="bg-white text-slate-900 p-8 max-w-2xl mx-auto font-sans relative"
        style={{ fontFamily: 'Arial, sans-serif' }}
      >
        {/* Header */}
        <div className="border-b-2 border-orange-500 pb-6 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-3 mb-2">
                {schoolLogo ? (
                  <img src={schoolLogo} alt="School Logo" className="w-16 h-16 object-contain rounded-xl" />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-orange-600 flex items-center justify-center text-white font-black text-2xl">
                    {schoolName.charAt(0)}
                  </div>
                )}
                <div>
                  <h1 className="text-lg font-black text-slate-900 tracking-tight underline">{schoolName}</h1>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-0.5">Official institution statement</p>
                  <div className="flex gap-4 mt-2">
                    {schoolPhone && <p className="text-[9px] font-bold text-slate-500">📞 {schoolPhone}</p>}
                    {schoolEmail && <p className="text-[9px] font-bold text-slate-500">✉️ {schoolEmail}</p>}
                  </div>
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className={`inline-block px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest mb-2 ${
                type === 'receipt'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-orange-100 text-orange-700'
              }`}>
                {type === 'receipt' ? '✅ Payment receipt' : '📄 Fee invoice'}
              </div>
              <p className="text-[10px] text-slate-500 font-mono">{receiptNo}</p>
              <p className="text-[10px] text-slate-400">{today}</p>
              {termLabel && <p className="text-[10px] font-bold text-orange-600 mt-1">{termLabel}</p>}
            </div>
          </div>
        </div>

        {/* Student Info */}
        {student && (
          <div className="bg-slate-50/50 rounded-xl p-6 mb-8 grid grid-cols-2 gap-4 border border-slate-100">
            <div>
              <p className="text-[9px] uppercase tracking-[0.2em] text-slate-400 font-bold mb-1">Student name</p>
              <p className="font-bold text-slate-900 text-sm">{student.name}</p>
            </div>
            <div>
              <p className="text-[9px] uppercase tracking-[0.2em] text-slate-400 font-bold mb-1">Admission no.</p>
              <p className="font-bold text-slate-900 font-mono text-sm">{student.admissionNumber}</p>
            </div>
            {student.grade && (
              <div className="col-span-2">
                <p className="text-[9px] uppercase tracking-[0.2em] text-slate-400 font-bold mb-1">Grade / stream</p>
                <p className="font-bold text-slate-900 text-sm">{student.grade} {student.stream && `• ${student.stream}`}</p>
              </div>
            )}
          </div>
        )}

        {/* Fee Breakdown (Invoice) */}
        {type === 'invoice' && localFees && localFees.length > 0 && (
          <div className="mb-6 relative group">
            <div className="flex justify-between items-center mb-3">
              <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400">Fee breakdown</p>
              
              {/* Edit Fees Toggle - Visible on hover or when editing, ignored in print */}
              <button 
                onClick={() => setIsEditing(!isEditing)}
                className={`text-[10px] font-bold px-5 py-2.5 rounded-xl transition-all shadow-sm print:hidden ${isEditing ? 'bg-black text-white' : 'bg-slate-900 text-white hover:bg-black opacity-100'}`}
              >
                {isEditing ? 'Done editing' : 'Edit fees'}
              </button>
            </div>
            
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-100">
                  <th className="text-left p-4 rounded-tl-lg font-bold text-slate-600">Description</th>
                  <th className={`text-right p-4 font-bold text-slate-600 ${!isEditing ? 'rounded-tr-lg' : ''}`}>Amount (KES)</th>
                  {isEditing && <th className="w-10 rounded-tr-lg bg-slate-100"></th>}
                </tr>
              </thead>
              <tbody>
                {localFees.map((fee, i) => (
                  <tr key={i} className="border-b border-slate-100">
                    <td className="p-3 text-slate-700">
                      {isEditing ? (
                        <input 
                          type="text" 
                          value={fee.category} 
                          onChange={(e) => handleUpdateFee(i, 'category', e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm outline-none focus:border-slate-400 transition-all"
                        />
                      ) : fee.category}
                    </td>
                    <td className="p-3 text-right font-mono text-slate-700">
                      {isEditing ? (
                        <input 
                          type="number" 
                          value={fee.amount} 
                          onChange={(e) => handleUpdateFee(i, 'amount', Number(e.target.value))}
                          className="w-full text-right bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm outline-none focus:border-slate-400 font-mono transition-all"
                        />
                      ) : (Number(fee.amount) || 0).toLocaleString()}
                    </td>
                    {isEditing && (
                      <td className="p-3 text-center">
                        <button onClick={() => handleDeleteFee(i)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all">✕</button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                {isEditing && (
                  <tr className="print:hidden">
                    <td colSpan={3} className="p-2 border-b border-slate-100">
                      <button onClick={handleAddFee} className="w-full py-2 text-xs font-bold text-orange-600 bg-orange-50 hover:bg-orange-100 rounded-lg border border-orange-200 transition-colors">+ Add Fee Item</button>
                    </td>
                  </tr>
                )}
                <tr className="bg-orange-50">
                  <td className={`p-3 font-black text-orange-700 ${isEditing ? 'rounded-bl-lg' : 'rounded-bl-lg'}`}>Total fees</td>
                  <td className={`p-3 text-right font-black text-orange-700 font-mono ${isEditing ? '' : 'rounded-br-lg'}`}>KES {totalFees.toLocaleString()}</td>
                  {isEditing && <td className="rounded-br-lg bg-orange-50"></td>}
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* Payment History */}
        {type === 'invoice' && allPayments && allPayments.length > 0 && (
          <div className="mb-6">
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-3">Payments received</p>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-100">
                  <th className="text-left p-3 rounded-tl-lg font-bold text-slate-600">Date</th>
                  <th className="text-left p-3 font-bold text-slate-600">Method</th>
                  <th className="text-left p-3 font-bold text-slate-600">Reference</th>
                  <th className="text-right p-3 rounded-tr-lg font-bold text-slate-600">Amount (KES)</th>
                </tr>
              </thead>
              <tbody>
                {allPayments.map((p, i) => (
                  <tr key={i} className="border-b border-slate-100">
                    <td className="p-3 text-slate-600">{new Date(p.date).toLocaleDateString('en-GB')}</td>
                    <td className="p-3 text-slate-600">{p.method}</td>
                    <td className="p-3 text-slate-500 font-mono text-xs">{p.reference || '—'}</td>
                    <td className="p-3 text-right font-mono text-green-700">{p.amount.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-green-50">
                  <td colSpan={3} className="p-3 font-black text-green-700">Total paid</td>
                  <td className="p-3 text-right font-black text-green-700 font-mono">KES {totalPaid.toLocaleString()}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* Single Payment (Receipt) */}
        {type === 'receipt' && payment && (
          <div className="mb-6">
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-3">Payment details</p>
            <div className="bg-green-50/50 border border-green-100 rounded-xl p-6 grid grid-cols-2 gap-4">
              <div>
                <p className="text-[9px] uppercase tracking-[0.1em] text-slate-400 font-bold mb-1">Amount paid</p>
                <p className="text-2xl font-black text-green-700">KES {payment.amount.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-[9px] uppercase tracking-[0.1em] text-slate-400 font-bold mb-1">Payment method</p>
                <p className="font-bold text-slate-800 text-sm">{payment.method}</p>
              </div>
              <div>
                <p className="text-[9px] uppercase tracking-[0.1em] text-slate-400 font-bold mb-1">Date</p>
                <p className="font-bold text-slate-800 text-sm">{new Date(payment.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
              </div>
              {payment.reference && (
                <div>
                  <p className="text-[9px] uppercase tracking-[0.1em] text-slate-400 font-bold mb-1">Reference / M-pesa code</p>
                  <p className="font-bold text-slate-800 font-mono text-sm">{payment.reference}</p>
                </div>
              )}
              {payment.etimsInvoiceNumber && (
                <div className="col-span-2 text-sm">
                  <p className="text-[9px] uppercase tracking-[0.1em] text-slate-400 font-bold mb-1">KRA eTIMS invoice no.</p>
                  <p className="font-bold text-orange-700 font-mono">{payment.etimsInvoiceNumber}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Balance Summary - Floating style */}
        <div className="py-8 transition-all">
          <div className="flex justify-between items-end border-t border-slate-100 pt-8">
            <div>
              <p className={`text-[9px] uppercase tracking-[0.2em] font-bold mb-2 ${balance > 0 ? 'text-rose-500' : 'text-slate-400'}`}>
                {balance > 0 ? 'Outstanding balance' : 'Account status'}
              </p>
              <p className={`text-2xl font-black tracking-tight ${balance > 0 ? 'text-rose-600' : 'text-emerald-500'}`}>
                {balance > 0 ? `KES ${balance.toLocaleString()} Owing` : '✅ Fully paid'}
              </p>
            </div>
            {balance > 0 && (
              <div className="text-right">
                <p className="text-[10px] text-rose-500 font-bold">Please clear balance</p>
                <p className="text-[9px] text-slate-400 font-medium mt-1">Payment due this term</p>
              </div>
            )}
          </div>
        </div>

      </div>
    );
  }
);

InvoiceReceipt.displayName = 'InvoiceReceipt';
export default InvoiceReceipt;
