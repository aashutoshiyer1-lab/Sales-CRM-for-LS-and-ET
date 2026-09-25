import React, { useState, useEffect, useMemo } from 'react';
import { VENUES, VENUE_DETAILS, PAYMENT_METHODS, OFFERS, REFERENCES, getOperatingHours } from '../config/venueData';
import { calculatePricing } from '../utils/pricingEngine';
import { 
  X, 
  User, 
  Phone, 
  Mail, 
  Users, 
  Calculator, 
  CreditCard, 
  CheckCircle2, 
  AlertTriangle,
  Lock,
  Gamepad2,
  Tag,
  Edit3,
  ShieldCheck,
  Calendar as CalendarIcon,
  Clock,
  Clock3,
  Gift
} from 'lucide-react';

export const BookingModal = ({ 
  isOpen, 
  onClose, 
  activeVenue, 
  initialSlot = {}, 
  editingBooking = null,
  onSubmitBooking 
}) => {
  const currentVenueDetails = VENUE_DETAILS[activeVenue];

  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [paxCount, setPaxCount] = useState('');
  const [gameName, setGameName] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [timeSlot, setTimeSlot] = useState('11:00');
  const [offerId, setOfferId] = useState('none');
  const [referencePerson, setReferencePerson] = useState('Nayeem Sir');
  
  const [isPendingBooking, setIsPendingBooking] = useState(false);

  const [payments, setPayments] = useState({
    Cash: '',
    Card: '',
    'UPI-New Pay': '',
    'Prepaid by District': '',
    'Razorpay (Website Bookings)': '',
    'Activity Kids': '',
  });

  const [submitting, setSubmitting] = useState(false);

  // Generate dynamic 15-minute interval time slots in 12-hour AM/PM format strictly based on date operating hours
  const dynamicTimeSlotOptions = useMemo(() => {
    const hours = getOperatingHours(date);
    const slots = [];
    let currMinutes = hours.startMinutes;
    const endMinutes = hours.endMinutes;

    while (currMinutes <= endMinutes) {
      const h = Math.floor(currMinutes / 60);
      const m = currMinutes % 60;
      
      const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      
      const period = h >= 12 ? 'PM' : 'AM';
      let h12 = h % 12;
      if (h12 === 0) h12 = 12;
      const displayLabel = `${h12}:${String(m).padStart(2, '0')} ${period}`;

      slots.push({ value: timeStr, label: displayLabel });
      currMinutes += 15;
    }
    return slots;
  }, [date]);

  useEffect(() => {
    if (!isOpen) return;

    if (editingBooking) {
      setCustomerName(editingBooking.customerName || '');
      setPhone(editingBooking.phone || '');
      setEmail(editingBooking.email || '');
      setPaxCount(editingBooking.paxCount ? String(editingBooking.paxCount) : '');
      setGameName(editingBooking.gameName || '');
      setDate(editingBooking.date || new Date().toISOString().split('T')[0]);
      setTimeSlot(editingBooking.timeSlot || '11:00');
      setOfferId(editingBooking.offerId || 'none');
      setReferencePerson(editingBooking.referencePerson || 'Nayeem Sir');
      setIsPendingBooking(editingBooking.status === 'Pending');
      
      const prevPay = editingBooking.payments || {};
      setPayments({
        Cash: prevPay.Cash ? String(prevPay.Cash) : '',
        Card: prevPay.Card ? String(prevPay.Card) : '',
        'UPI-New Pay': prevPay['UPI-New Pay'] ? String(prevPay['UPI-New Pay']) : '',
        'Prepaid by District': prevPay['Prepaid by District'] ? String(prevPay['Prepaid by District']) : '',
        'Razorpay (Website Bookings)': (prevPay['Razorpay (Website Bookings)'] || prevPay['Razorpay( website bookings)']) ? String(prevPay['Razorpay (Website Bookings)'] || prevPay['Razorpay( website bookings)']) : '',
        'Activity Kids': (prevPay['Activity Kids'] || prevPay['Activity kids']) ? String(prevPay['Activity Kids'] || prevPay['Activity kids']) : '',
      });
    } else {
      setCustomerName('');
      setPhone('');
      setEmail('');
      setPaxCount('');
      setGameName('');
      setDate(initialSlot.date || new Date().toISOString().split('T')[0]);
      setTimeSlot(initialSlot.timeSlot || '11:00');
      setOfferId('none');
      setReferencePerson('Nayeem Sir');
      setIsPendingBooking(false);
      setPayments({
        Cash: '',
        Card: '',
        'UPI-New Pay': '',
        'Prepaid by District': '',
        'Razorpay (Website Bookings)': '',
        'Activity Kids': '',
      });
    }
  }, [isOpen, editingBooking, initialSlot]);

  // Auto-adapt timeSlot whenever date changes to match valid operating hours for that day (weekday vs weekend)
  useEffect(() => {
    if (!isOpen || dynamicTimeSlotOptions.length === 0) return;
    const isValidSlot = dynamicTimeSlotOptions.some(s => s.value === timeSlot);
    if (!isValidSlot) {
      setTimeSlot(dynamicTimeSlotOptions[0].value);
    }
  }, [date, dynamicTimeSlotOptions, isOpen]);

  // Pricing Calculation
  const pricingInfo = calculatePricing({
    venue: activeVenue,
    gameName,
    paxCount,
    date,
    offerId,
  });

  const isComplimentary = offerId === 'complimentary';
  const finalTotalAmount = pricingInfo.totalAmount;

  const handleOfferChange = (newOfferId) => {
    setOfferId(newOfferId);
  };

  const splitTotal = Object.values(payments).reduce((sum, val) => sum + (parseInt(val, 10) || 0), 0);
  const isExactMatch = isComplimentary || (finalTotalAmount === 0 && splitTotal === 0) || (finalTotalAmount > 0 && splitTotal === finalTotalAmount);
  const remainingAmount = finalTotalAmount - splitTotal;

  const canSubmit = gameName && paxCount && customerName && phone && (isExactMatch || isPendingBooking);

  const handleAutoFillSplit = (method) => {
    setPayments({
      Cash: '',
      Card: '',
      'UPI-New Pay': '',
      'Prepaid by District': '',
      [method]: String(finalTotalAmount)
    });
    // Auto untick pending when full payment is filled
    if (finalTotalAmount > 0) {
      setIsPendingBooking(false);
    }
  };

  const handlePaymentChange = (method, value) => {
    const updatedPayments = {
      ...payments,
      [method]: value
    };
    setPayments(updatedPayments);

    // Auto untick pending checkbox if user enters payment matching or exceeding target
    const newSplitTotal = Object.values(updatedPayments).reduce((sum, val) => sum + (parseInt(val, 10) || 0), 0);
    if (newSplitTotal >= finalTotalAmount && finalTotalAmount > 0) {
      setIsPendingBooking(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    const numericPayments = {
      Cash: parseInt(payments.Cash, 10) || 0,
      Card: parseInt(payments.Card, 10) || 0,
      'UPI-New Pay': parseInt(payments['UPI-New Pay'], 10) || 0,
      'Prepaid by District': parseInt(payments['Prepaid by District'], 10) || 0,
      'Razorpay (Website Bookings)': parseInt(payments['Razorpay (Website Bookings)'], 10) || 0,
      'Activity Kids': parseInt(payments['Activity Kids'], 10) || 0,
    };

    const currentSplitTotal = Object.values(numericPayments).reduce((a, b) => a + b, 0);
    const shouldBeConfirmed = !isPendingBooking || (currentSplitTotal >= finalTotalAmount && finalTotalAmount > 0);

    const bookingPayload = {
      customerName: customerName.trim(),
      phone: phone.trim(),
      email: email.trim(),
      venue: activeVenue,
      gameName,
      paxCount: parseInt(paxCount, 10),
      date,
      timeSlot,
      offerId: pricingInfo.offerId,
      offerName: pricingInfo.offerName,
      discountPercentage: pricingInfo.discountPercentage,
      discountAmount: pricingInfo.discountAmount,
      referencePerson: pricingInfo.discountPercentage > 0 ? referencePerson : null,
      baseTotal: pricingInfo.baseTotal,
      totalAmount: finalTotalAmount,
      payments: numericPayments,
      status: shouldBeConfirmed ? 'Confirmed' : 'Pending'
    };

    try {
      await onSubmitBooking(bookingPayload, editingBooking?.id);
      onClose();
    } catch (err) {
      console.error('Booking save error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/50 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-50 border border-slate-300 rounded-3xl max-w-xl w-full p-5 shadow-2xl relative my-4 overflow-hidden max-h-[92vh] flex flex-col justify-between">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-300 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className={`p-2.5 rounded-2xl border ${
              activeVenue === VENUES.ESCAPE_TIME 
                ? 'bg-red-100 text-red-700 border-red-300 shadow-sm' 
                : 'bg-cyan-100 text-cyan-700 border-cyan-300 shadow-sm'
            }`}>
              {editingBooking ? <Edit3 className="w-5 h-5" /> : activeVenue === VENUES.ESCAPE_TIME ? <Lock className="w-5 h-5" /> : <Gamepad2 className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-slate-900">
                {editingBooking ? 'Edit Game Entry' : 'New Game Entry'}
              </h2>
              <p className="text-xs text-slate-600 font-mono font-semibold">
                {activeVenue} • Fast Entry Form
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-200/80 text-slate-600 hover:text-slate-900 hover:bg-slate-300 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Form */}
        <form onSubmit={handleSubmit} autoComplete="off" className="space-y-3.5 my-3 overflow-y-auto pr-1">
          
          {/* Customer Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            
            {/* Name */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1 uppercase tracking-wider">
                Customer Name <span className="text-red-600">*</span>
              </label>
              <div className="relative">
                <User className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  autoComplete="off"
                  placeholder="Full customer name"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100 focus:outline-none font-semibold"
                />
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1 uppercase tracking-wider">
                Phone Number <span className="text-red-600">*</span>
              </label>
              <div className="relative">
                <Phone className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
                <input
                  type="tel"
                  required
                  autoComplete="off"
                  placeholder="+91 Mobile number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100 focus:outline-none font-mono font-bold"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1 uppercase tracking-wider">
                Email <span className="text-slate-500 font-normal lowercase">(optional)</span>
              </label>
              <div className="relative">
                <Mail className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
                <input
                  type="email"
                  autoComplete="off"
                  placeholder="customer@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100 focus:outline-none font-medium"
                />
              </div>
            </div>

            {/* Game Selector */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1 uppercase tracking-wider">
                Game Selection <span className="text-red-600">*</span>
              </label>
              <select
                required
                value={gameName}
                onChange={(e) => setGameName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs font-bold text-slate-900 focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100 focus:outline-none cursor-pointer"
              >
                <option value="">-- Select Game --</option>
                {currentVenueDetails.games.map((g) => (
                  <option key={g.id} value={g.name}>
                    {g.name} ({g.duration}m)
                  </option>
                ))}
              </select>
            </div>

            {/* Pax Count */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1 uppercase tracking-wider">
                Number of Players <span className="text-red-600">*</span>
              </label>
              <div className="relative">
                <Users className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
                <input
                  type="number"
                  min="1"
                  max="50"
                  required
                  placeholder="Enter number of players"
                  value={paxCount}
                  onChange={(e) => setPaxCount(e.target.value)}
                  onWheel={(e) => e.target.blur()}
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-white border border-slate-300 text-xs font-mono font-extrabold text-slate-900 placeholder-slate-400 focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
            </div>

            {/* Date & Dynamic 12-Hour Operating Hours Time Slot */}
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2 rounded-2xl bg-cyan-100/60 border border-cyan-300">
                <label className="block text-[10px] font-black text-cyan-800 mb-1 uppercase tracking-wider flex items-center gap-1">
                  <CalendarIcon className="w-3 h-3 text-cyan-700" /> Date
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-2 py-1.5 rounded-lg bg-white border border-cyan-300 text-xs font-mono font-bold text-slate-900 focus:outline-none cursor-pointer"
                />
              </div>
              
              <div className="p-2 rounded-2xl bg-amber-100/60 border border-amber-300">
                <label className="block text-[10px] font-black text-amber-800 mb-1 uppercase tracking-wider flex items-center gap-1">
                  <Clock className="w-3 h-3 text-amber-700" /> Time Slot (12h)
                </label>
                <select
                  value={timeSlot}
                  onChange={(e) => setTimeSlot(e.target.value)}
                  className="w-full px-2 py-1.5 rounded-lg bg-white border border-amber-300 text-xs font-mono font-bold text-amber-900 focus:outline-none cursor-pointer"
                >
                  {dynamicTimeSlotOptions.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

          </div>

          {/* Offers Dropdown */}
          <div className="p-3.5 rounded-2xl bg-slate-100/80 border border-slate-300 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800">
                <Tag className="w-3.5 h-3.5 text-amber-700" />
                <span>Select Offer / Discount</span>
              </div>
              {pricingInfo.discountPercentage > 0 && (
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-200 text-amber-900 border border-amber-400">
                  Ref: {referencePerson}
                </span>
              )}
            </div>

            <select
              value={offerId}
              onChange={(e) => handleOfferChange(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs font-bold text-amber-900 focus:border-amber-600 focus:outline-none cursor-pointer"
            >
              {OFFERS.filter(o => !o.venue || o.venue === activeVenue).map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </div>

          {/* Reference Approval Selector when discount > 0 */}
          {pricingInfo.discountPercentage > 0 && (
            <div className="p-3.5 rounded-2xl bg-amber-100/80 border border-amber-300 space-y-2 text-xs">
              <div className="flex items-center justify-between font-bold text-amber-900">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-700" />
                  Whose Reference Approved This Discount?
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 pt-1">
                {REFERENCES.map((ref) => (
                  <button
                    key={ref}
                    type="button"
                    onClick={() => setReferencePerson(ref)}
                    className={`py-1.5 px-2 rounded-xl text-xs font-bold font-mono transition-all ${
                      referencePerson === ref
                        ? 'bg-amber-600 text-white shadow-md font-extrabold'
                        : 'bg-white text-amber-900 hover:bg-amber-200 border border-amber-300'
                    }`}
                  >
                    {ref}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Pricing Calculation Display */}
          <div className="p-3.5 rounded-2xl bg-slate-100/80 border border-slate-300">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                <Calculator className="w-3.5 h-3.5 text-cyan-700" />
                <span>Auto-Pricing Engine</span>
              </div>
              <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full ${
                pricingInfo.isWeekend ? 'bg-amber-200 text-amber-900 border border-amber-400' : 'bg-cyan-200 text-cyan-900 border border-cyan-400'
              }`}>
                {pricingInfo.dayType}
              </span>
            </div>

            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="p-2 rounded-xl bg-white border border-slate-300 shadow-sm">
                <div className="text-[9px] text-slate-600 font-bold uppercase">Rate/Player</div>
                <div className="text-xs font-extrabold text-slate-900 font-mono">₹{pricingInfo.ratePerPax}</div>
              </div>
              <div className="p-2 rounded-xl bg-white border border-slate-300 shadow-sm">
                <div className="text-[9px] text-slate-600 font-bold uppercase">Base Total</div>
                <div className="text-xs font-extrabold text-slate-900 font-mono">₹{pricingInfo.baseTotal.toLocaleString()}</div>
              </div>
              <div className="p-2 rounded-xl bg-white border border-slate-300 shadow-sm">
                <div className="text-[9px] text-amber-700 font-bold uppercase">Discount</div>
                <div className="text-xs font-extrabold text-amber-700 font-mono">-₹{pricingInfo.discountAmount.toLocaleString()}</div>
              </div>
              <div className="p-2 rounded-xl bg-emerald-100/80 border border-emerald-300 shadow-sm">
                <div className="text-[9px] text-emerald-800 font-extrabold uppercase">Final Total</div>
                <div className="text-sm font-black text-emerald-800 font-mono">₹{finalTotalAmount.toLocaleString()}</div>
              </div>
            </div>
          </div>

          {/* Pending Option */}
          {!isComplimentary && (
            <div className="p-3.5 rounded-2xl bg-amber-100/80 border border-amber-300 flex items-center justify-between">
              <label className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-amber-950">
                <input
                  type="checkbox"
                  checked={isPendingBooking}
                  onChange={(e) => setIsPendingBooking(e.target.checked)}
                  className="w-4 h-4 rounded bg-white border-amber-400 text-amber-600 focus:ring-amber-500 cursor-pointer"
                />
                <Clock3 className="w-4 h-4 text-amber-700 shrink-0" />
                <span>Save as Advance / Pending Game (Collect Payment Later)</span>
              </label>
            </div>
          )}

          {/* Split Payment Section */}
          <div className={`p-3.5 rounded-2xl bg-slate-100/80 border transition-all ${
            isPendingBooking ? 'opacity-80 border-amber-300 bg-amber-50' : 'border-slate-300'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                <CreditCard className="w-3.5 h-3.5 text-cyan-700" />
                <span>Split Payment Entry</span>
              </div>
              {!isComplimentary && (
                <div className="text-[10px] text-slate-600 font-semibold">
                  Auto Fill: {PAYMENT_METHODS.map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => handleAutoFillSplit(m)}
                      className="ml-1 px-1.5 py-0.5 rounded-md bg-white border border-slate-300 hover:bg-slate-200 text-[9px] text-slate-800 font-mono font-bold transition-all shadow-sm"
                    >
                      100% {m.split(' ')[0]}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Payment Fields */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {PAYMENT_METHODS.map((method) => (
                <div key={method} className="bg-white p-2 rounded-xl border border-slate-300 shadow-sm">
                  <label className="block text-[10px] font-bold text-slate-700 truncate mb-1">
                    {method} (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    disabled={isComplimentary}
                    placeholder={isComplimentary ? '₹0 (Free)' : 'Enter amount'}
                    value={isComplimentary ? '' : payments[method]}
                    onChange={(e) => handlePaymentChange(method, e.target.value)}
                    onWheel={(e) => e.target.blur()}
                    className="w-full px-2 py-1.5 rounded-lg bg-slate-50 border border-slate-300 text-xs font-mono font-bold text-slate-900 placeholder-slate-400 focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none disabled:opacity-50"
                  />
                </div>
              ))}
            </div>

            {/* Verification Bar */}
            <div className={`mt-3 p-3 rounded-xl border flex items-center justify-between transition-all ${
              isComplimentary
                ? 'bg-purple-100 border-purple-300 text-purple-950'
                : isExactMatch
                  ? 'bg-emerald-100 border-emerald-300 text-emerald-950'
                  : 'bg-amber-100 border-amber-300 text-amber-950'
            }`}>
              <div className="flex items-center gap-2">
                {isComplimentary ? (
                  <Gift className="w-4 h-4 text-purple-700 shrink-0" />
                ) : isExactMatch ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                )}
                <div>
                  <div className="text-[11px] font-extrabold font-mono">
                    {isComplimentary
                      ? 'COMPLIMENTARY GAME (KIDS UNDER 6) - NO PAYMENT COLLECTED'
                      : isExactMatch
                        ? 'EXACT MATCH - READY TO SAVE'
                        : isPendingBooking
                          ? 'ADVANCE ENTRY - PENDING PAYMENT'
                          : remainingAmount > 0
                            ? `UNPAID: ₹${remainingAmount.toLocaleString()}`
                            : `OVERPAID: ₹${Math.abs(remainingAmount.toLocaleString())}`}
                  </div>
                  <div className="text-[9px] text-slate-700 font-mono font-semibold">
                    Split Paid: ₹{splitTotal.toLocaleString()} / Target Total: ₹{finalTotalAmount.toLocaleString()}
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Action Footer */}
          <div className="pt-2 flex items-center justify-end gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 hover:text-slate-900 bg-slate-200/80 hover:bg-slate-300 border border-slate-300 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSubmit || submitting}
              className={`px-5 py-2.5 rounded-xl text-xs font-extrabold text-white transition-all shadow-md flex items-center gap-1.5 ${
                canSubmit && !submitting
                  ? isComplimentary
                    ? 'bg-purple-600 hover:bg-purple-700 active:scale-95'
                    : isPendingBooking
                      ? 'bg-amber-600 hover:bg-amber-700 active:scale-95'
                      : 'bg-emerald-600 hover:bg-emerald-700 active:scale-95'
                  : 'bg-slate-300 text-slate-500 cursor-not-allowed border border-slate-400'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isComplimentary ? 'Submit Complimentary Game' : isPendingBooking ? 'Save Pending Game' : editingBooking ? 'Update Game Entry' : 'Submit & Save Game'}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
