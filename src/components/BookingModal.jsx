import React, { useState, useEffect } from 'react';
import { VENUES, VENUE_DETAILS, PAYMENT_METHODS, OFFERS, REFERENCES } from '../config/venueData';
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
  });

  const [submitting, setSubmitting] = useState(false);

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
      });
    }
  }, [isOpen, editingBooking, initialSlot]);

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
  };

  const handlePaymentChange = (method, value) => {
    setPayments(prev => ({
      ...prev,
      [method]: value
    }));
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
    };

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
      status: isPendingBooking ? 'Pending' : 'Confirmed'
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-xl w-full p-4 sm:p-5 shadow-2xl relative my-4 overflow-hidden max-h-[92vh] flex flex-col justify-between">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl border ${
              activeVenue === VENUES.ESCAPE_TIME 
                ? 'bg-red-950 text-amber-400 border-amber-500/40' 
                : 'bg-cyan-950 text-cyan-400 border-cyan-500/40'
            }`}>
              {editingBooking ? <Edit3 className="w-4 h-4" /> : activeVenue === VENUES.ESCAPE_TIME ? <Lock className="w-4 h-4" /> : <Gamepad2 className="w-4 h-4" />}
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white">
                {editingBooking ? 'Edit Game Entry' : 'New Game Entry'}
              </h2>
              <p className="text-[11px] text-slate-400 font-mono">
                {activeVenue} • Fast Entry Form
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
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
              <label className="block text-[11px] font-bold text-slate-200 mb-1 uppercase tracking-wider">
                Customer Name <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <User className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  required
                  autoComplete="off"
                  placeholder="Full customer name"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none font-medium"
                />
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-[11px] font-bold text-slate-200 mb-1 uppercase tracking-wider">
                Phone Number <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="tel"
                  required
                  autoComplete="off"
                  placeholder="+91 Mobile number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none font-mono"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1 uppercase tracking-wider">
                Email <span className="text-slate-500 font-normal lowercase">(optional)</span>
              </label>
              <div className="relative">
                <Mail className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="email"
                  autoComplete="off"
                  placeholder="customer@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder-slate-600 focus:border-cyan-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Game Selector */}
            <div>
              <label className="block text-[11px] font-bold text-slate-200 mb-1 uppercase tracking-wider">
                Game Selection <span className="text-red-400">*</span>
              </label>
              <select
                required
                value={gameName}
                onChange={(e) => setGameName(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white focus:border-cyan-400 focus:outline-none font-semibold"
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
              <label className="block text-[11px] font-bold text-slate-200 mb-1 uppercase tracking-wider">
                Number of Players <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <Users className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="number"
                  min="1"
                  max="50"
                  required
                  placeholder="Enter number of players"
                  value={paxCount}
                  onChange={(e) => setPaxCount(e.target.value)}
                  onWheel={(e) => e.target.blur()}
                  className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs font-mono font-bold text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
            </div>

            {/* Date & Time Slot */}
            <div className="grid grid-cols-2 gap-2">
              <div className="p-1 rounded-xl bg-gradient-to-r from-cyan-950 to-slate-900 border-2 border-cyan-400 shadow-md">
                <label className="block text-[10px] font-black text-cyan-300 mb-0.5 uppercase tracking-wider flex items-center gap-1">
                  <CalendarIcon className="w-3 h-3 text-cyan-400" /> Date
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-2 py-1 rounded bg-slate-950 text-xs font-mono font-black text-cyan-200 focus:outline-none cursor-pointer"
                />
              </div>
              
              <div className="p-1 rounded-xl bg-gradient-to-r from-amber-950 to-slate-900 border-2 border-amber-400 shadow-md">
                <label className="block text-[10px] font-black text-amber-300 mb-0.5 uppercase tracking-wider flex items-center gap-1">
                  <Clock className="w-3 h-3 text-amber-400" /> Time Slot
                </label>
                <input
                  type="time"
                  step="900"
                  value={timeSlot}
                  onChange={(e) => setTimeSlot(e.target.value)}
                  className="w-full px-2 py-1 rounded bg-slate-950 text-xs font-mono font-black text-amber-200 focus:outline-none cursor-pointer"
                />
              </div>
            </div>

          </div>

          {/* Offers Dropdown */}
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400">
                <Tag className="w-3.5 h-3.5" />
                <span>Select Offer / Discount</span>
              </div>
              {pricingInfo.discountPercentage > 0 && (
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  Ref: {referencePerson}
                </span>
              )}
            </div>

            <select
              value={offerId}
              onChange={(e) => handleOfferChange(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs font-bold text-amber-300 focus:border-amber-400 focus:outline-none"
            >
              {OFFERS.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </div>

          {/* Reference Approval Selector when discount > 0 */}
          {pricingInfo.discountPercentage > 0 && (
            <div className="p-3 rounded-xl bg-amber-950/60 border border-amber-500/60 space-y-2 text-xs">
              <div className="flex items-center justify-between font-bold text-amber-300">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                  Whose Reference Approved This Discount?
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 pt-1">
                {REFERENCES.map((ref) => (
                  <button
                    key={ref}
                    type="button"
                    onClick={() => setReferencePerson(ref)}
                    className={`py-1.5 px-2 rounded-lg text-xs font-bold font-mono transition-all ${
                      referencePerson === ref
                        ? 'bg-amber-400 text-slate-950 shadow-md font-extrabold'
                        : 'bg-slate-900 text-amber-200 hover:bg-slate-800 border border-amber-900/60'
                    }`}
                  >
                    {ref}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Pricing Calculation Display */}
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
                <Calculator className="w-3.5 h-3.5 text-cyan-400" />
                <span>Auto-Pricing Engine</span>
              </div>
              <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded ${
                pricingInfo.isWeekend ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
              }`}>
                {pricingInfo.dayType}
              </span>
            </div>

            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="p-1.5 rounded-lg bg-slate-900 border border-slate-800">
                <div className="text-[9px] text-slate-400">Rate/Player</div>
                <div className="text-xs font-bold text-slate-200 font-mono">₹{pricingInfo.ratePerPax}</div>
              </div>
              <div className="p-1.5 rounded-lg bg-slate-900 border border-slate-800">
                <div className="text-[9px] text-slate-400">Base Total</div>
                <div className="text-xs font-bold text-slate-300 font-mono">₹{pricingInfo.baseTotal.toLocaleString()}</div>
              </div>
              <div className="p-1.5 rounded-lg bg-slate-900 border border-slate-800">
                <div className="text-[9px] text-amber-400 font-semibold">Discount</div>
                <div className="text-xs font-bold text-amber-400 font-mono">-₹{pricingInfo.discountAmount.toLocaleString()}</div>
              </div>
              <div className="p-1.5 rounded-lg bg-slate-900 border border-slate-700 bg-gradient-to-r from-emerald-950/60 to-slate-900">
                <div className="text-[9px] text-emerald-400 font-bold">Final Total</div>
                <div className="text-sm font-black text-emerald-400 font-mono">₹{finalTotalAmount.toLocaleString()}</div>
              </div>
            </div>
          </div>

          {/* Pending Option */}
          {!isComplimentary && (
            <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-500/50 flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-amber-300">
                <input
                  type="checkbox"
                  checked={isPendingBooking}
                  onChange={(e) => setIsPendingBooking(e.target.checked)}
                  className="w-4 h-4 rounded bg-slate-900 border-amber-500 text-amber-400 focus:ring-amber-400 cursor-pointer"
                />
                <Clock3 className="w-4 h-4 text-amber-400" />
                <span>Save as Advance / Pending Game (Collect Payment Later)</span>
              </label>
            </div>
          )}

          {/* Split Payment Section */}
          <div className={`p-3 rounded-xl bg-slate-950 border transition-all ${
            isPendingBooking ? 'opacity-75 border-amber-800/40' : 'border-slate-800'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
                <CreditCard className="w-3.5 h-3.5 text-cyan-400" />
                <span>Split Payment Entry</span>
              </div>
              {!isComplimentary && (
                <div className="text-[10px] text-slate-400">
                  Auto Fill: {PAYMENT_METHODS.map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => handleAutoFillSplit(m)}
                      className="ml-1 px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[9px] text-slate-200 font-mono"
                    >
                      100% {m.split(' ')[0]}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Payment Fields */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {PAYMENT_METHODS.map((method) => (
                <div key={method} className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                  <label className="block text-[10px] font-bold text-slate-300 truncate mb-1">
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
                    className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-700 text-xs font-mono font-bold text-white placeholder-slate-600 focus:border-cyan-400 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none disabled:opacity-50"
                  />
                </div>
              ))}
            </div>

            {/* Verification Bar */}
            <div className={`mt-2.5 p-2.5 rounded-lg border flex items-center justify-between transition-all ${
              isComplimentary
                ? 'bg-purple-950/80 border-purple-500/80 text-purple-300'
                : isExactMatch
                  ? 'bg-emerald-950/80 border-emerald-500/80 text-emerald-300'
                  : 'bg-amber-950/80 border-amber-500/80 text-amber-300'
            }`}>
              <div className="flex items-center gap-2">
                {isComplimentary ? (
                  <Gift className="w-4 h-4 text-purple-400 shrink-0" />
                ) : isExactMatch ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                )}
                <div>
                  <div className="text-[11px] font-bold font-mono">
                    {isComplimentary
                      ? 'COMPLIMENTARY GAME (KIDS UNDER 6) - NO PAYMENT COLLECTED'
                      : isExactMatch
                        ? 'EXACT MATCH - READY TO SAVE'
                        : isPendingBooking
                          ? 'ADVANCE ENTRY - PENDING PAYMENT'
                          : remainingAmount > 0
                            ? `UNPAID: ₹${remainingAmount.toLocaleString()}`
                            : `OVERPAID: ₹${Math.abs(remainingAmount).toLocaleString()}`}
                  </div>
                  <div className="text-[9px] text-slate-300 font-mono">
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
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-900 border border-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSubmit || submitting}
              className={`px-5 py-2 rounded-xl text-xs font-bold text-slate-950 transition-all shadow-lg flex items-center gap-1.5 ${
                canSubmit && !submitting
                  ? isComplimentary
                    ? 'bg-gradient-to-r from-purple-400 to-indigo-400 hover:from-purple-300 hover:to-indigo-300 text-slate-950 shadow-purple-500/20 active:scale-95'
                    : isPendingBooking
                      ? 'bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 shadow-amber-500/20 active:scale-95'
                      : 'bg-gradient-to-r from-emerald-400 to-cyan-400 hover:from-emerald-300 hover:to-cyan-300 shadow-emerald-500/20 active:scale-95'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
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
