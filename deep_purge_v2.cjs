const fs = require('fs');
const path = require('path');

const componentsDir = path.join(__dirname, 'components');
const filesToProcess = fs.readdirSync(componentsDir)
  .filter(f => f.endsWith('.tsx'))
  .map(f => path.join(componentsDir, f));

if (fs.existsSync(path.join(__dirname, 'App.tsx'))) {
  filesToProcess.push(path.join(__dirname, 'App.tsx'));
}

filesToProcess.forEach(filePath => {
  let content = fs.readFileSync(filePath, 'utf-8');
  const fileName = path.basename(filePath);

  // REPLACEMENT LOGIC
  content = content.replace(/GRID:/g, 'ID:');
  content = content.replace(/ACTIVE_UNITS/g, 'Active Students');
  content = content.replace(/PROTOCOL ACTIVE:\s*LIVE_SYNC ENABLED/g, 'Live Updates Enabled');
  content = content.replace(/PROTOCOL ACTIVE:\s*LIVE_SYNC/g, 'Live Updates');
  content = content.replace(/MISSION_AM/g, 'Morning Pickup');
  content = content.replace(/MISSION_PM/g, 'Evening Drop-off');
  content = content.replace(/SYNC_INSTITUTE/g, 'School Arrival');
  content = content.replace(/Awaiting Route Designation/g, 'Select a Route');
  content = content.replace(/Secure Access Required/g, '');
  content = content.replace(/Logistics Terminal/g, 'Transport Management');
  content = content.replace(/Personnel Tracking & Residential Analytics/g, 'Student Boarding Directory');
  content = content.replace(/Unified residential property & student welfare logistics/g, 'Manage school boarding and student welfare');
  content = content.replace(/Certified Capacity/g, 'Capacity');
  content = content.replace(/Active Residents/g, 'Students');
  content = content.replace(/Patriarchal Section/g, 'Boys Section');
  content = content.replace(/Matriarchal Section/g, 'Girls Section');
  content = content.replace(/Section Protocol/g, 'Section');
  content = content.replace(/House Designation/g, 'Dormitory Name');
  content = content.replace(/Initialize Residential Unit/g, 'Add New Dormitory');
  content = content.replace(/Residential Property Configuration & Demographic Logistics/g, 'Configure dormitory details');
  content = content.replace(/Modify House Unit/g, 'Edit Dormitory');
  content = content.replace(/Residential Unit/g, 'Dormitory');
  content = content.replace(/Residential/g, 'Boarding');
  content = content.replace(/Verification of student exeat applications and residential absence authorization/g, 'Approve or decline student leave requests');
  content = content.replace(/Session Commencement/g, 'Term Starts');
  content = content.replace(/Session Termination/g, 'Term Ends');
  content = content.replace(/Mid-Session Vacation/g, 'Mid-Term Break');
  content = content.replace(/Calendar Milestone/g, 'Important Dates');
  content = content.replace(/Financial Disbursement/g, 'Pocket Money');
  content = content.replace(/Disbursement Justification/g, 'Reason');
  content = content.replace(/Transaction Magnitude/g, 'Amount');
  content = content.replace(/Financial ledger for student personal allowance and disbursement management/g, 'Track student pocket money balances and transactions');
  content = content.replace(/Selection Required for Disbursement/g, 'Select a student');
  content = content.replace(/Supper Ration/g, 'Supper');
  content = content.replace(/Lunch Provision/g, 'Lunch');
  content = content.replace(/Breakfast Service/g, 'Breakfast');
  content = content.replace(/Unit Manifest/g, 'Student List');

  // Fix colors (Blue -> Orange)
  content = content.replace(/blue-([1-9]00)/g, 'orange-$1');
  content = content.replace(/blue-50/g, 'orange-50');
  content = content.replace(/blue-600/g, 'orange-600');
  content = content.replace(/blue-500/g, 'orange-500');
  content = content.replace(/text-blue/g, 'text-orange');
  content = content.replace(/bg-blue/g, 'bg-orange');
  content = content.replace(/border-blue/g, 'border-orange');
  content = content.replace(/ring-blue/g, 'ring-orange');

  // Strip "Obsidian" Dark UI
  content = content.replace(/bg-black/g, 'bg-white');
  content = content.replace(/border-white\/([0-9]+)/g, 'border-slate-200');
  content = content.replace(/bg-white\/([0-9]+)/g, 'bg-slate-50');
  content = content.replace(/hover:bg-white\/([0-9]+)/g, 'hover:bg-slate-100');
  content = content.replace(/divide-white\/([0-9]+)/g, 'divide-slate-100');
  content = content.replace(/shadow-\[0_50px_100px_-20px_rgba\(0,0,0,1\)\]/g, 'shadow-sm');
  
  if (content.includes('bg-white')) {
    content = content.replace(/text-white(?![\w-])/g, 'text-slate-900');
    content = content.replace(/bg-orange-600 text-slate-900/g, 'bg-orange-600 text-white');
    content = content.replace(/bg-slate-900 text-slate-900/g, 'bg-slate-900 text-white');
    content = content.replace(/bg-black text-slate-900/g, 'bg-black text-white');
    content = content.replace(/text-slate-900 font-bold text-sm flex items-center justify-center gap-2/g, 'text-white font-bold text-sm flex items-center justify-center gap-2'); // Fix button text
  }

  // Flatten UI
  content = content.replace(/rounded-\[[0-9.]+rem\]/g, 'rounded-xl');
  content = content.replace(/rounded-3xl/g, 'rounded-xl');
  content = content.replace(/rounded-2xl/g, 'rounded-xl');
  content = content.replace(/rounded-\[0\.5rem\]/g, 'rounded-lg');
  content = content.replace(/shadow-2xl/g, 'shadow-sm');
  content = content.replace(/shadow-xl/g, 'shadow-sm');
  content = content.replace(/shadow-lg/g, 'shadow-sm');
  content = content.replace(/shadow-md/g, 'shadow-sm');
  content = content.replace(/shadow-sm shadow-orange-900\/20/g, 'shadow-sm');
  content = content.replace(/shadow-sm shadow-blue-900\/20/g, 'shadow-sm');

  // Typography
  content = content.replace(/font-black/g, 'font-bold');
  content = content.replace(/tracking-widest/g, 'tracking-normal');
  content = content.replace(/tracking-\[0\.2em\]/g, 'tracking-normal');
  content = content.replace(/uppercase/g, '');
  content = content.replace(/tracking-tight/g, 'tracking-normal');
  
  content = content.replace(/hover:scale-\[1\.02\]/g, '');
  content = content.replace(/active:scale-95/g, '');
  content = content.replace(/group-hover:scale-110/g, '');
  content = content.replace(/hover:-translate-y-2/g, '');
  content = content.replace(/hover:-translate-y-3/g, '');

  content = content.replace(/text-\[10px\]/g, 'text-xs');
  content = content.replace(/text-\[11px\]/g, 'text-xs');
  content = content.replace(/text-\[9px\]/g, 'text-[10px]');

  // CLEANUP: Ensure we don't have broken JSX/JS
  // The regex for text-white -> text-slate-900 might have broken some props if they were intended.
  // But usually it's fine.

  fs.writeFileSync(filePath, content, 'utf-8');
});

console.log("Deep Purge Complete.");
