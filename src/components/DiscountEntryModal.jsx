import React, { useState, useEffect } from 'react';
import { X, Plus, Sparkles, ShieldAlert, CheckCircle2, Info, Camera, Layers, Check, Edit3 } from 'lucide-react';

const ET_ROOM_OPTIONS = [
  "Professor X's Lab",
  "Locked In",
  "Sherlock's Last Case",
  "Spy Agents"
];

export const formatSingleDiscountNote = (entry, forPreview = false) => {
  const isCustom = entry.reason === 'custom';
  const isOnline = entry.reason === 'district app' || 
                   entry.reason === 'website booking' || 
                   entry.reason === 'activity kids' ||
                   entry.offerId === 'district_app' || 
                   entry.offerId === 'website_booking' ||
                   entry.offerId === 'activity_kids';

  const requiresRef = !isOnline && !isCustom;
  const ref = entry.reference || (forPreview ? '[Manager Reference]' : '');

  if (requiresRef && !entry.reference && !forPreview) {
    return { isApproved: false, text: '', missingRef: true };
  }

  const category = entry.category || 'escape';
  let duration = entry.duration || '20 mins';
  if (duration === 'Combat') duration = '10 mins';
  else if (duration === 'Battle') duration = '20 mins';
  else if (duration === 'War') duration = '30 mins';
  if (!duration.endsWith('mins') && !duration.endsWith('min')) duration = `${duration} mins`;

  const pct = entry.percentage === 'complementary' 
    ? 100 
    : (entry.percentage === 'custom' 
        ? (parseInt(entry.customPct, 10) || 0) 
        : (parseInt(entry.percentage, 10) || 0));

  const paxNum = parseInt(entry.groupSizeVal, 10) || 1;
  const isCompl = entry.percentage === 'complementary' || entry.reason === 'kids under 5 years';
  
  const kidWording = paxNum === 1 ? '1 kid' : `${paxNum} kids`;
  const playerWording = `group of ${paxNum} players`;

  const reason = entry.reason || 'discounted';
  const isLaser = category === 'laser';

  const formatRoomName = (r) => {
    if (!r) return 'Escape Room';
    if (r.includes('Professor') || r.includes('Lab')) return 'Laboratory';
    if (r.includes('Sherlock')) return 'Sherlock';
    if (r.includes('Locked')) return 'Locked In';
    if (r.includes('Spy')) return 'Spy Agents';
    return r;
  };

  const notes = [];

  const attachDetails = (baseText) => {
    let res = baseText;
    if (!isCompl) {
      if (entry.customerName && entry.customerName.trim()) res += `\nCustomer Name: ${entry.customerName.trim()}`;
      if (entry.phone && entry.phone.trim()) res += `\nMobile Number: ${entry.phone.trim()}`;
    }
    return res;
  };

  // Format custom notes cleanly with proper grammar
  if (isCustom) {
    let customBase = entry.customFullNote?.trim() || 'Custom Discount Note';
    customBase = customBase.replace(/^(note\s*:\s*|note\s*-\s*|custom\s*note\s*:\s*)/i, '').trim();
    if (customBase) {
      customBase = customBase.charAt(0).toUpperCase() + customBase.slice(1);
      if (!/[.!?]$/.test(customBase)) customBase += '.';
    }
    const customText = attachDetails(customBase || 'Custom Discount Note');
    if (isLaser) {
      notes.push({ text: customText, roomOrDuration: duration, isLaser: true });
    }
    if (category === 'escape' || category === 'both') {
      const rooms = entry.selectedRooms && entry.selectedRooms.length > 0 ? entry.selectedRooms : [ET_ROOM_OPTIONS[0]];
      rooms.forEach(room => {
        const roomClean = formatRoomName(room);
        notes.push({ text: customText, roomOrDuration: roomClean, isLaser: false });
      });
    }
    return { isApproved: true, notes, missingRef: false };
  }

  // Laser Shooter formatting — NEVER hardcode percentages, use exact selected `pct`!
  if (isLaser) {
    let text = '';
    if (isCompl) {
      text = `Given complementary game to ${kidWording} for ${duration} game as they were under 5 years${ref ? ` and as per ${ref} reference.` : '.'}`;
    } else if (reason.includes('cross promotion brochure')) {
      text = `Given ${pct}% discount to ${playerWording} for ${duration} game as they had cross promotion brochure${ref ? ` and as per ${ref} reference.` : '.'}`;
    } else if (reason.includes('cross promotion')) {
      text = `Given ${pct}% discount to ${playerWording} for ${duration} game as they had cross promotion coupon${ref ? ` and as per ${ref} reference.` : '.'}`;
    } else if (reason.includes('2nd game')) {
      text = `Given ${pct}% discount to ${playerWording} for ${duration} game as it was their 2nd game the same day${ref ? ` and as per ${ref} reference.` : '.'}`;
    } else if (reason === 'district app') {
      text = `Today we had a group of ${paxNum} who made booking through District for ${duration} game.`;
    } else if (reason === 'website booking') {
      text = `Today we had a group of ${paxNum} who made booking through Website for ${duration} game.`;
    } else if (reason === 'activity kids') {
      text = `Today we had a group of ${paxNum} who made booking through Activity Kids for ${duration} game.`;
    } else if (reason === 'birthday package') {
      text = `Given ${pct}% discount to ${playerWording} for ${duration} game as it was a birthday package${ref ? ` and as per ${ref} reference.` : '.'}`;
    } else if (reason === 'corporate package') {
      text = `Given ${pct}% discount to ${playerWording} for ${duration} game as it was a corporate package${ref ? ` and as per ${ref} reference.` : '.'}`;
    } else if (reason.includes('high price') || reason === 'going back due to high prices') {
      text = `Given ${pct}% discount to ${playerWording} for ${duration} game as they were going back due to high prices${ref ? ` and as per ${ref} reference.` : '.'}`;
    } else {
      text = `Given ${pct}% discount to ${playerWording} for ${duration} game as they were ${reason}${ref ? ` and as per ${ref} reference.` : '.'}`;
    }
    notes.push({ text: attachDetails(text), roomOrDuration: duration, isLaser: true });
  }

  // Escape Time formatting — Per-room pax attribution when split group sizes is active
  if (category === 'escape' || category === 'both') {
    const rooms = entry.selectedRooms && entry.selectedRooms.length > 0 
      ? entry.selectedRooms 
      : [ET_ROOM_OPTIONS[0]];

    rooms.forEach(room => {
      let roomPax = paxNum;
      if (entry.isGroupSizeSplit && entry.groupSizes && entry.groupSizes[room] !== undefined && entry.groupSizes[room] !== '') {
        roomPax = parseInt(entry.groupSizes[room], 10) || 1;
      } else if (!paxNum || paxNum <= 0) {
        roomPax = 4; // fallback for live preview
      }

      const roomClean = formatRoomName(room);
      const rKidWording = roomPax === 1 ? '1 kid' : `${roomPax} kids`;
      const rPlayerWording = `group of ${roomPax} players`;

      let text = '';
      if (isCompl) {
        text = `Given complementary game to ${rKidWording} as they were under 5 years for ${roomClean}${ref ? ` and as per ${ref} reference.` : '.'}`;
      } else if (reason.includes('cross promotion brochure')) {
        text = `Given ${pct}% discount to ${rPlayerWording} for ${roomClean} as they had cross promotion brochure${ref ? ` and as per ${ref} reference.` : '.'}`;
      } else if (reason.includes('cross promotion')) {
        text = `Given ${pct}% discount to ${rPlayerWording} for ${roomClean} as they had cross promotion coupon${ref ? ` and as per ${ref} reference.` : '.'}`;
      } else if (reason.includes('2nd game')) {
        text = `Given ${pct}% discount to ${rPlayerWording} for ${roomClean} as it was their 2nd game the same day${ref ? ` and as per ${ref} reference.` : '.'}`;
      } else if (reason === 'district app') {
        text = `Today we had a group of ${roomPax} who made booking through District for ${roomClean}.`;
      } else if (reason === 'website booking') {
        text = `Today we had a group of ${roomPax} who made booking through Website for ${roomClean}.`;
      } else if (reason === 'activity kids') {
        text = `Today we had a group of ${roomPax} who made booking through Activity Kids for ${roomClean}.`;
      } else if (reason === 'birthday package') {
        text = `Given ${pct}% discount to ${rPlayerWording} for ${roomClean} as it was a birthday package${ref ? ` and as per ${ref} reference.` : '.'}`;
      } else if (reason === 'corporate package') {
        text = `Given ${pct}% discount to ${rPlayerWording} for ${roomClean} as it was a corporate package${ref ? ` and as per ${ref} reference.` : '.'}`;
      } else if (reason.includes('high price') || reason === 'going back due to high prices') {
        text = `Given ${pct}% discount to ${rPlayerWording} for ${roomClean} as they were going back due to high prices${ref ? ` and as per ${ref} reference.` : '.'}`;
      } else {
        text = `Given ${pct}% discount to ${rPlayerWording} for ${roomClean} as they were ${reason}${ref ? ` and as per ${ref} reference.` : '.'}`;
      }
      notes.push({ text: attachDetails(text), roomOrDuration: roomClean, isLaser: false });
    });
  }

  return { isApproved: Boolean(entry.reference), notes, missingRef: requiresRef && !entry.reference };
};

export const DiscountEntryModal = ({ 
  isOpen, 
  onClose, 
  onAddDiscount, 
  initialEntry = null 
}) => {
  const [category, setCategory] = useState('escape');
  const [duration, setDuration] = useState('20 mins');
  const [selectedRooms, setSelectedRooms] = useState([ET_ROOM_OPTIONS[0]]);
  
  const [groupSizeVal, setGroupSizeVal] = useState('');
  const [isGroupSizeSplit, setIsGroupSizeSplit] = useState(false);
  const [groupSizes, setGroupSizes] = useState({
    "Professor X's Lab": '',
    "Locked In": '',
    "Sherlock's Last Case": '',
    "Spy Agents": ''
  });

  const [percentage, setPercentage] = useState('30');
  const [customPct, setCustomPct] = useState('25');
  const [reason, setReason] = useState('cross promotion coupon');
  const [reference, setReference] = useState('Khaja Sir');
  const [customFullNote, setCustomFullNote] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');

  // Prepopulate state when editing an existing discount entry, or reset when adding new
  useEffect(() => {
    if (initialEntry) {
      setCategory(initialEntry.category || 'escape');
      setDuration(initialEntry.duration || '20 mins');
      setSelectedRooms(initialEntry.selectedRooms || [ET_ROOM_OPTIONS[0]]);
      setGroupSizeVal(initialEntry.groupSizeVal !== undefined && initialEntry.groupSizeVal !== '' ? String(initialEntry.groupSizeVal) : '');
      setIsGroupSizeSplit(Boolean(initialEntry.isGroupSizeSplit));
      setGroupSizes(initialEntry.groupSizes || {
        "Professor X's Lab": '',
        "Locked In": '',
        "Sherlock's Last Case": '',
        "Spy Agents": ''
      });
      setPercentage(initialEntry.percentage !== undefined ? String(initialEntry.percentage) : '30');
      setCustomPct(initialEntry.customPct !== undefined ? String(initialEntry.customPct) : '25');
      setReason(initialEntry.reason || 'cross promotion coupon');
      setReference(initialEntry.reference || 'Khaja Sir');
      setCustomFullNote(initialEntry.customFullNote || '');
      setCustomerName(initialEntry.customerName || '');
      setPhone(initialEntry.phone || '');
    } else {
      setCategory('escape');
      setDuration('20 mins');
      setSelectedRooms([ET_ROOM_OPTIONS[0]]);
      setGroupSizeVal('');
      setIsGroupSizeSplit(false);
      setGroupSizes({
        "Professor X's Lab": '',
        "Locked In": '',
        "Sherlock's Last Case": '',
        "Spy Agents": ''
      });
      setPercentage('30');
      setCustomPct('25');
      setReason('cross promotion coupon');
      setReference('Khaja Sir');
      setCustomFullNote('');
      setCustomerName('');
      setPhone('');
    }
  }, [initialEntry, isOpen]);

  if (!isOpen) return null;

  const handleRoomToggle = (room) => {
    if (selectedRooms.includes(room)) {
      if (selectedRooms.length === 1) return;
      setSelectedRooms(selectedRooms.filter(r => r !== room));
    } else {
      setSelectedRooms([...selectedRooms, room]);
    }
  };

  // When reason is changed by user, set standard sensible default percentage without locking it
  const handleReasonChange = (newReason) => {
    setReason(newReason);
    if (newReason === 'cross promotion coupon' || newReason === 'cross promotion brochure') {
      setPercentage('30');
    } else if (newReason === 'going back due to high prices') {
      setPercentage('10');
    } else if (newReason === 'birthday package') {
      setPercentage('15');
    } else if (newReason === '2nd game discount') {
      setPercentage(category === 'laser' ? '10' : '20');
    } else if (newReason === 'corporate package') {
      setPercentage('15');
    } else if (newReason === 'kids under 5 years') {
      setPercentage('complementary');
    } else if (newReason === 'district app' || newReason === 'website booking' || newReason === 'activity kids' || newReason === 'custom') {
      setReference('');
    }
  };

  const isCustomReason = reason === 'custom';
  const isOnlineReason = reason === 'district app' || reason === 'website booking' || reason === 'activity kids';
  const isReferenceRequired = !isOnlineReason && !isCustomReason;
  const isMissingRef = isReferenceRequired && !reference;

  // Split group sizes calculation
  const totalSplitPax = isGroupSizeSplit && selectedRooms.length > 1
    ? selectedRooms.reduce((sum, r) => sum + (parseInt(groupSizes[r], 10) || 0), 0)
    : 0;

  const isSplitGroupValid = isGroupSizeSplit && selectedRooms.length > 1 && totalSplitPax > 0;
  const hasGroupSize = Boolean(groupSizeVal && parseInt(groupSizeVal, 10) > 0) || isSplitGroupValid;
  const canSubmit = !isMissingRef && hasGroupSize;

  const effectiveTotalPax = groupSizeVal ? (parseInt(groupSizeVal, 10) || 1) : (totalSplitPax || 1);

  // Draft entry for live preview (forPreview=true will show preview even if manager reference is pending selection)
  const currentDraftEntry = {
    category,
    duration,
    selectedRooms,
    groupSizeVal: effectiveTotalPax,
    isGroupSizeSplit,
    groupSizes,
    percentage,
    customPct: parseInt(customPct, 10) || 0,
    reason,
    reference,
    customFullNote,
    customerName,
    phone
  };

  const previewResult = formatSingleDiscountNote(currentDraftEntry, true);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!hasGroupSize) {
      alert('Please enter group size or fill player counts per selected room!');
      return;
    }
    if (isMissingRef) {
      alert('Reference Person (Khaja Sir or Nayeem Sir) is strictly mandatory for this discount!');
      return;
    }
    if (isCustomReason && !customFullNote.trim()) {
      alert('Please type the custom discount reason note!');
      return;
    }

    const formattedResult = formatSingleDiscountNote(currentDraftEntry, false);

    const updatedEntry = {
      id: initialEntry?.id || `disc-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      createdAt: initialEntry?.createdAt || new Date().toISOString(),
      date: initialEntry?.date,
      ...currentDraftEntry,
      formattedNotes: formattedResult.notes || []
    };

    onAddDiscount(updatedEntry);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-6 my-8">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-amber-500" />
            <h2 className="text-xl font-black text-slate-900">
              {initialEntry ? 'Edit OCR Discount Entry' : 'Add OCR Discount Entry'}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          
          {/* Category Selector */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Category</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'escape', label: 'Escape Time' },
                { id: 'laser', label: 'Laser Shooter' },
                { id: 'both', label: 'Both Venues' }
              ].map(cat => (
                <button
                  type="button"
                  key={cat.id}
                  onClick={() => setCategory(cat.id)}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                    category === cat.id
                      ? 'bg-slate-900 text-white border-slate-900 shadow'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Duration (LS only) */}
          {(category === 'laser' || category === 'both') && (
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Laser Game Duration</label>
              <select
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="w-full text-xs font-bold p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-cyan-500"
              >
                <option value="10 mins">10 mins (Combat)</option>
                <option value="20 mins">20 mins (Battle)</option>
                <option value="30 mins">30 mins (War)</option>
              </select>
            </div>
          )}

          {/* Escape Rooms Selection (ET only) */}
          {(category === 'escape' || category === 'both') && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 block">Select Escape Rooms</label>
                {selectedRooms.length > 1 && (
                  <label className="flex items-center gap-1.5 text-xs font-bold text-indigo-700 cursor-pointer bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-200">
                    <input
                      type="checkbox"
                      checked={isGroupSizeSplit}
                      onChange={(e) => setIsGroupSizeSplit(e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>Split Group Sizes per Room</span>
                  </label>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {ET_ROOM_OPTIONS.map(room => {
                  const isSelected = selectedRooms.includes(room);
                  return (
                    <button
                      type="button"
                      key={room}
                      onClick={() => handleRoomToggle(room)}
                      className={`p-2.5 rounded-xl text-xs font-bold border text-left flex items-center justify-between transition-all ${
                        isSelected
                          ? 'bg-red-50 text-red-700 border-red-300 shadow-sm'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <span>{room}</span>
                      {isSelected && <CheckCircle2 className="w-4 h-4 text-red-600" />}
                    </button>
                  );
                })}
              </div>

              {/* Per Room Split Inputs if enabled */}
              {isGroupSizeSplit && selectedRooms.length > 1 && (
                <div className="p-3 bg-indigo-50/80 border border-indigo-200 rounded-xl space-y-2 mt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-indigo-950 block">
                      Assign Player Count per Selected Room:
                    </span>
                    <span className="text-[11px] font-mono font-bold text-indigo-700">
                      Total Pax: {totalSplitPax}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedRooms.map(r => (
                      <div key={r} className="flex items-center justify-between bg-white p-2 rounded-lg border border-indigo-200 text-xs shadow-2xs">
                        <span className="font-bold text-slate-800 truncate mr-2">{r}:</span>
                        <input
                          type="number"
                          min="1"
                          placeholder="Pax"
                          value={groupSizes[r] || ''}
                          onChange={(e) => setGroupSizes(prev => ({ ...prev, [r]: e.target.value }))}
                          className="w-16 text-center font-black font-mono text-slate-900 border border-slate-300 rounded p-1 focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Group Size Input & Discount Reason */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700">
                  {isGroupSizeSplit && selectedRooms.length > 1 ? 'Overall Group Size (Optional)' : 'Group Size (Players / Kids)'}
                </label>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                  isGroupSizeSplit && selectedRooms.length > 1
                    ? 'text-indigo-600 bg-indigo-50 border-indigo-200'
                    : !groupSizeVal
                      ? 'text-amber-700 bg-amber-50 border-amber-200'
                      : 'text-emerald-700 bg-emerald-50 border-emerald-200'
                }`}>
                  {isGroupSizeSplit && selectedRooms.length > 1 ? 'Optional when split' : (!groupSizeVal ? 'Required' : 'Entered')}
                </span>
              </div>
              <input
                type="number"
                min="1"
                placeholder={isGroupSizeSplit && selectedRooms.length > 1 ? "Auto-computed from rooms" : "e.g. 4"}
                value={groupSizeVal}
                onChange={(e) => setGroupSizeVal(e.target.value)}
                className={`w-full text-xs font-mono font-bold p-2.5 rounded-xl border transition-all ${
                  !groupSizeVal && !(isGroupSizeSplit && selectedRooms.length > 1) 
                    ? 'border-amber-400 bg-amber-50/20' 
                    : 'border-slate-200 bg-slate-50'
                }`}
              />
            </div>

            {/* Reason Selection */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Discount Reason</label>
              <select
                value={reason}
                onChange={(e) => handleReasonChange(e.target.value)}
                className="w-full text-xs font-bold p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-indigo-500"
              >
                <option value="cross promotion coupon">Cross Promotion Coupon</option>
                <option value="cross promotion brochure">Cross Promotion Brochure</option>
                <option value="going back due to high prices">Going Back Due to High Prices</option>
                <option value="birthday package">Birthday Package</option>
                <option value="corporate package">Corporate Package</option>
                <option value="2nd game discount">2nd Game Discount</option>
                <option value="district app">District App (Prepaid)</option>
                <option value="website booking">Website Booking (Razorpay)</option>
                <option value="activity kids">Activity Kids</option>
                <option value="kids under 5 years">Kids Under 5 Years (Complementary)</option>
                <option value="custom">Custom Reason</option>
              </select>
            </div>
          </div>

          {/* Customer Details (Optional) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Customer Name (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Rahul Sharma"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full text-xs font-bold p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Mobile Number (Optional)</label>
              <input
                type="text"
                placeholder="e.g. 9876543210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full text-xs font-mono font-bold p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Quick Selection Percentage Buttons (HIDDEN WHEN REASON IS CUSTOM) */}
          {!isCustomReason && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 block">Select Discount Percentage</label>
                <span className="text-xs font-mono font-black text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                  Active: {percentage === 'custom' ? `${customPct}%` : percentage === 'complementary' ? 'Complimentary' : `${percentage}%`}
                </span>
              </div>
              <div className="grid grid-cols-7 gap-1.5">
                {[
                  { pct: '10', label: '10%' },
                  { pct: '15', label: '15%' },
                  { pct: '20', label: '20%' },
                  { pct: '25', label: '25%' },
                  { pct: '30', label: '30%' },
                  { pct: 'custom', label: 'Custom' },
                  { pct: 'complementary', label: '🎁 Compl.' }
                ].map(p => (
                  <button
                    type="button"
                    key={p.pct}
                    onClick={() => setPercentage(p.pct)}
                    className={`py-2 px-1 rounded-xl text-xs font-black border transition-all ${
                      percentage === p.pct
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-md scale-95'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {percentage === 'custom' && (
                <div className="pt-1">
                  <label className="text-xs font-bold text-slate-600 block mb-1">Enter Custom Percentage (%)</label>
                  <input
                    type="number"
                    min="1"
                    max="99"
                    value={customPct}
                    onChange={(e) => setCustomPct(e.target.value)}
                    className="w-full text-xs font-bold p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              )}
            </div>
          )}

          {/* CUSTOM REASON TEXT INPUT (Shown when reason === 'custom') */}
          {isCustomReason && (
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Type Custom Reason Note</label>
              <textarea
                rows={3}
                placeholder="e.g. Given special discount as requested by customer group..."
                value={customFullNote}
                onChange={(e) => setCustomFullNote(e.target.value)}
                className="w-full text-xs font-medium p-3 rounded-xl border border-indigo-200 bg-indigo-50/20 focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          )}

          {/* Reference Person (HIDDEN WHEN REASON IS CUSTOM) */}
          {!isCustomReason && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700">Manager Reference</label>
                {isReferenceRequired && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                    !reference ? 'text-red-700 bg-red-50 border-red-200' : 'text-emerald-700 bg-emerald-50 border-emerald-200'
                  }`}>
                    {reference ? `Selected: ${reference}` : 'Mandatory'}
                  </span>
                )}
              </div>
              <select
                disabled={isOnlineReason}
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                className={`w-full text-xs font-bold p-2.5 rounded-xl border transition-all ${
                  isMissingRef
                    ? 'border-red-500 bg-red-50/50 text-red-900 focus:ring-2 focus:ring-red-500'
                    : 'border-slate-200 bg-slate-50'
                }`}
              >
                <option value="">Select Reference Person...</option>
                <option value="Khaja Sir">Khaja Sir</option>
                <option value="Nayeem Sir">Nayeem Sir</option>
              </select>
            </div>
          )}

          {/* Informational Reminders */}
          {reference === 'Khaja Sir' && (
            <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-950 flex items-center gap-2 font-bold shadow-2xs">
              <Camera className="w-4 h-4 text-amber-700 flex-shrink-0" />
              <span>📸 Mandatory: Attach screenshot of Khaja Sir reference approval in closing message.</span>
            </div>
          )}

          {isOnlineReason && (
            <div className="p-3 bg-purple-50 border border-purple-300 rounded-xl text-xs text-purple-950 flex items-center gap-2 font-bold shadow-2xs">
              <Camera className="w-4 h-4 text-purple-700 flex-shrink-0" />
              <span>📸 Mandatory: Attach booking / payment screenshot in closing.</span>
            </div>
          )}

          {/* Missing Reference Warning Banner */}
          {isMissingRef && (
            <div className="p-3 bg-red-50 border border-red-300 rounded-xl text-xs text-red-800 flex items-center gap-2 font-bold shadow-2xs">
              <ShieldAlert className="w-4 h-4 text-red-600 flex-shrink-0" />
              <span>Please select Khaja Sir or Nayeem Sir to approve this discount entry.</span>
            </div>
          )}

          {/* Approval Note Live Preview (Always visible in real-time) */}
          <div className="bg-slate-900 text-slate-100 p-4 rounded-2xl border border-slate-800 space-y-2.5 shadow-inner">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black text-emerald-400 block tracking-wider uppercase">
                Generated Approval Note Live Preview
              </span>
              {isMissingRef && (
                <span className="text-[10px] font-bold text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-500/30">
                  Manager Reference Pending
                </span>
              )}
            </div>

            <div className="space-y-2 text-xs font-mono text-emerald-300">
              {previewResult.notes && previewResult.notes.map((n, i) => (
                <div key={i} className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-cyan-400 font-bold block mb-1">
                    {n.isLaser ? `Laser Shooter (${n.roomOrDuration})` : `Escape Room (${n.roomOrDuration})`}:
                  </span>
                  <p className="whitespace-pre-line leading-relaxed">{n.text}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="px-5 py-2.5 rounded-xl text-xs font-extrabold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-md transition-all flex items-center gap-1.5"
            >
              {initialEntry ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              <span>{initialEntry ? 'Save Changes' : 'Add Discount Entry'}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
