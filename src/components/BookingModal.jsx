import React, { useState, useEffect, useMemo } from 'react';
import { VENUES, VENUE_DETAILS, PAYMENT_METHODS, OFFERS, REFERENCES, getOperatingHours, isWeekend } from '../config/venueData';
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
  Gift,
  Zap,
  Flame,
  Camera
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
  const [rateMode, setRateMode] = useState(() => isWeekend(new Date().toISOString().split('T')[0]) ? 'weekend' : 'weekday');
  const [timeSlot, setTimeSlot] = useState('11:00');
  const [offerId, setOfferId] = useState('none');
  const [customDiscountReason, setCustomDiscountReason] = useState('');
  const [customDiscountPercentage, setCustomDiscountPercentage] = useState('50');
  const [referencePerson, setReferencePerson] = useState('Nayeem Sir');
  const [categoryOverride, setCategoryOverride] = useState('');
  
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
      const targetDate = editingBooking.date || new Date().toISOString().split('T')[0];
      setDate(targetDate);
      setRateMode(editingBooking.rateMode || (isWeekend(targetDate) ? 'weekend' : 'weekday'));
      setTimeSlot(editingBooking.timeSlot || '11:00');
      setOfferId(editingBooking.offerId || 'none');
      setCustomDiscountReason(editingBooking.customDiscountReason || (editingBooking.offerId === 'custom_discount' ? editingBooking.offerName : '') || '');
      setCustomDiscountPercentage(editingBooking.discountPercentage !== undefined ? String(editingBooking.discountPercentage) : '50');
      setReferencePerson(editingBooking.referencePerson || 'Nayeem Sir');
      setCategoryOverride(editingBooking.categoryOverride || '');
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
      const targetDate = initialSlot.date || new Date().toISOString().split('T')[0];
      setDate(targetDate);
      setRateMode(isWeekend(targetDate) ? 'weekend' : 'weekday');
      setTimeSlot(initialSlot.timeSlot || '11:00');
      setOfferId('none');
      setCustomDiscountReason('');
      setCustomDiscountPercentage('50');
      setReferencePerson('Nayeem Sir');
      setCategoryOverride('');
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

  useEffect(() => {
    if (!isOpen) return;
    if (!editingBooking) {
      setRateMode(isWeekend(date) ? 'weekend' : 'weekday');
    }
  }, [date, isOpen, editingBooking]);

  const [, setRateOverrideTick] = useState(0);

  useEffect(() => {
    const handleOverrideUpdate = () => setRateOverrideTick(t => t + 1);
    window.addEventListener('crm_price_override_updated', handleOverrideUpdate);
    return () => window.removeEventListener('crm_price_override_updated', handleOverrideUpdate);
  }, []);

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
    rateModeOverride: rateMode,
    customDiscountPercentage,
    customDiscountReason,
  });

  const isComplimentary = offerId === 'complimentary';
  const finalTotalAmount = pricingInfo.totalAmount;

  const handleOfferChange = (newOfferId) => {
    setOfferId(newOfferId);
    if (newOfferId === 'custom_discount' && !customDiscountPercentage) {
      setCustomDiscountPercentage('50');
    }
  };

  const splitTotal = Object.values(payments).reduce((sum, val) => sum + (parseInt(val, 10) || 0), 0);
  const isExactMatch = isComplimentary || (finalTotalAmount === 0 && splitTotal === 0) || (finalTotalAmount > 0 && splitTotal === finalTotalAmount);
  const remainingAmount = finalTotalAmount - splitTotal;

  const isCustomOffer = offerId === 'custom_discount';
  const isCustomValid = !isCustomOffer || (customDiscountReason.trim().length > 0 && customDiscountPercentage !== '');
  const canSubmit = gameName && paxCount && customerName && phone && isCustomValid && (isExactMatch || isPendingBooking);

  const handleAutoFillSplit = (method) => {
    setPayments({
      Cash: '',
      Card: '',
      'UPI-New Pay': '',
      'Prepaid by District': '',
      'Razorpay (Website Bookings)': '',
      'Activity Kids': '',
      [method]: String(finalTotalAmount)
    });
    if (method === 'Prepaid by District' && (offerId === 'none' || !offerId)) {
      setOfferId('district_app');
    } else if (method === 'Razorpay (Website Bookings)' && (offerId === 'none' || !offerId)) {
      setOfferId('website_booking');
    } else if (method === 'Activity Kids' && (offerId === 'none' || !offerId)) {
      setOfferId('activity_kids');
    }
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

    if (method === 'Prepaid by District' && (parseInt(value, 10) || 0) > 0 && (offerId === 'none' || !offerId)) {
      setOfferId('district_app');
    } else if (method === 'Razorpay (Website Bookings)' && (parseInt(value, 10) || 0) > 0 && (offerId === 'none' || !offerId)) {
      setOfferId('website_booking');
    } else if (method === 'Activity Kids' && (parseInt(value, 10) || 0) > 0 && (offerId === 'none' || !offerId)) {
      setOfferId('activity_kids');
    }

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
      rateMode,
      offerId: pricingInfo.offerId,
      offerName: offerId === 'custom_discount' ? (customDiscountReason.trim() || 'Custom Discount') : pricingInfo.offerName,
      customDiscountReason: offerId === 'custom_discount' ? customDiscountReason.trim() : '',
      discountPercentage: pricingInfo.discountPercentage,
      discountAmount: pricingInfo.discountAmount,
      referencePerson: pricingInfo.discountPercentage > 0 ? referencePerson : null,
      categoryOverride: categoryOverride || (offerId === 'complimentary' ? '4-6' : null),
      customCategory: (categoryOverride || (offerId === 'complimentary' ? '4-6' : null)) 
        ? ((categoryOverride || (offerId === 'complimentary' ? '4-6' : '')) === '2-3' 
            ? '2-3 Players Category' 
            : (categoryOverride || (offerId === 'complimentary' ? '4-6' : '')) === '4-6' 
              ? '4-6 Players Category' 
              : '7+ Players Category') 
        : null,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-md overflow-y-auto">
      <div className="bg-slate-50 border border-slate-300 rounded-3xl max-w-3xl lg:max-w-4xl w-full p-6 sm:p-8 shadow-2xl relative my-6 overflow-hidden max-h-[92vh] flex flex-col justify-between">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-300 shrink-0">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-2xl border ${
              activeVenue === VENUES.ESCAPE_TIME 
                ? 'bg-red-100 text-red-700 border-red-300 shadow-sm' 
                : 'bg-cyan-100 text-cyan-700 border-cyan-300 shadow-sm'
            }`}>
              {editingBooking ? <Edit3 className="w-6 h-6" /> : activeVenue === VENUES.ESCAPE_TIME ? <Lock className="w-6 h-6" /> : <Gamepad2 className="w-6 h-6" />}
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {editingBooking ? 'Edit Game Entry' : 'New Game Entry'}
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 font-mono font-semibold">
                {activeVenue} • Fast Entry Form
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2.5 rounded-2xl bg-slate-200/80 text-slate-600 hover:text-slate-900 hover:bg-slate-300 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form */}
        <form onSubmit={handleSubmit} autoComplete="off" className="space-y-4 sm:space-y-5 my-4 overflow-y-auto pr-1">
          
          {/* Customer Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                Customer Name <span className="text-red-600">*</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  required
                  autoComplete="off"
                  placeholder="Full customer name"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-white border border-slate-300 text-sm text-slate-900 placeholder-slate-400 focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100 focus:outline-none font-semibold shadow-sm"
                />
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                Phone Number <span className="text-red-600">*</span>
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                <input
                  type="tel"
                  required
                  autoComplete="off"
                  placeholder="+91 Mobile number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-white border border-slate-300 text-sm text-slate-900 placeholder-slate-400 focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100 focus:outline-none font-mono font-bold shadow-sm"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                Email <span className="text-slate-500 font-normal lowercase">(optional)</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                <input
                  type="email"
                  autoComplete="off"
                  placeholder="customer@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-white border border-slate-300 text-sm text-slate-900 placeholder-slate-400 focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100 focus:outline-none font-medium shadow-sm"
                />
              </div>
            </div>

            {/* Game Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                Game Selection <span className="text-red-600">*</span>
              </label>
              <select
                required
                value={gameName}
                onChange={(e) => setGameName(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-white border border-slate-300 text-sm font-bold text-slate-900 focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100 focus:outline-none cursor-pointer shadow-sm"
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
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                Number of Players <span className="text-red-600">*</span>
              </label>
              <div className="relative">
                <Users className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                <input
                  type="number"
                  min="1"
                  max="50"
                  required
                  placeholder="Enter number of players"
                  value={paxCount}
                  onChange={(e) => setPaxCount(e.target.value)}
                  onWheel={(e) => e.target.blur()}
                  className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-white border border-slate-300 text-sm font-mono font-extrabold text-slate-900 placeholder-slate-400 focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none shadow-sm"
                />
              </div>
            </div>

            {/* Date & Dynamic 12-Hour Operating Hours Time Slot */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="p-2.5 rounded-2xl bg-cyan-100/60 border border-cyan-300">
                <label className="block text-[11px] font-black text-cyan-800 mb-1 uppercase tracking-wider flex items-center gap-1">
                  <CalendarIcon className="w-3.5 h-3.5 text-cyan-700" /> Date
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-xl bg-white border border-cyan-300 text-xs sm:text-sm font-mono font-bold text-slate-900 focus:outline-none cursor-pointer"
                />
              </div>
              
              <div className="p-2.5 rounded-2xl bg-amber-100/60 border border-amber-300">
                <label className="block text-[11px] font-black text-amber-800 mb-1 uppercase tracking-wider flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-amber-700" /> Time Slot (12h)
                </label>
                <select
                  value={timeSlot}
                  onChange={(e) => setTimeSlot(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-xl bg-white border border-amber-300 text-xs sm:text-sm font-mono font-bold text-amber-900 focus:outline-none cursor-pointer"
                >
                  {dynamicTimeSlotOptions.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Escape Room Category Bracket Switcher */}
            {activeVenue === VENUES.ESCAPE_TIME && (
              <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-300 space-y-2 sm:col-span-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-amber-950 uppercase tracking-wider flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-amber-700" />
                    Escape Room Category Bracket
                  </label>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 border border-amber-400">
                    {offerId === 'complimentary' ? 'Auto-linked to 4-6 Bracket' : 'Customizable'}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: '2-3', label: '2-3 Players' },
                    { id: '4-6', label: '4-6 Players' },
                    { id: '7+', label: '7+ Players' }
                  ].map(cat => {
                    const currentCat = categoryOverride || (offerId === 'complimentary' ? '4-6' : (Number(paxCount) >= 7 ? '7+' : Number(paxCount) >= 4 ? '4-6' : '2-3'));
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setCategoryOverride(cat.id)}
                        className={`py-2 px-2.5 rounded-xl text-xs sm:text-sm font-extrabold transition-all border ${
                          currentCat === cat.id
                            ? 'bg-amber-600 text-white border-amber-700 shadow-md scale-95'
                            : 'bg-white text-amber-950 border-amber-300 hover:bg-amber-100'
                        }`}
                      >
                        {cat.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Pricing Rate Tier Switcher (Choose between Weekday and Weekend per entry) */}
            <div className="p-3 rounded-2xl bg-slate-100/90 border border-slate-300 space-y-2 sm:col-span-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  Pricing Rate Tier
                </label>
                <span className="text-xs font-mono font-semibold text-slate-500">
                  Default for Date: <strong className="text-slate-800">{isWeekend(date) ? 'Weekend' : 'Weekday'}</strong>
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 p-1.5 rounded-2xl bg-slate-200/80 border border-slate-300">
                <button
                  type="button"
                  onClick={() => setRateMode('weekday')}
                  className={`py-2 px-3 rounded-xl text-xs sm:text-sm font-extrabold transition-all flex items-center justify-center gap-2 ${
                    rateMode === 'weekday'
                      ? 'bg-cyan-600 text-white shadow-md'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-300/50'
                  }`}
                >
                  <Zap className="w-4 h-4" />
                  <span>Weekday Rate</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRateMode('weekend')}
                  className={`py-2 px-3 rounded-xl text-xs sm:text-sm font-extrabold transition-all flex items-center justify-center gap-2 ${
                    rateMode === 'weekend'
                      ? 'bg-amber-600 text-white shadow-md'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-300/50'
                  }`}
                >
                  <Flame className="w-4 h-4" />
                  <span>Weekend Rate</span>
                </button>
              </div>
            </div>

          </div>

          {/* Offers Dropdown */}
          <div className="p-4 rounded-2xl bg-slate-100/90 border border-slate-300 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-amber-800">
                <Tag className="w-4 h-4 text-amber-700" />
                <span>Select Offer / Discount</span>
              </div>
              {pricingInfo.discountPercentage > 0 && (
                <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-amber-200 text-amber-900 border border-amber-400">
                  Ref: {referencePerson}
                </span>
              )}
            </div>

            <select
              value={offerId}
              onChange={(e) => handleOfferChange(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-white border border-slate-300 text-xs sm:text-sm font-bold text-amber-900 focus:border-amber-600 focus:outline-none cursor-pointer shadow-sm"
            >
              {OFFERS.filter(o => !o.venue || o.venue === activeVenue).map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>

            {/* Custom Discount Reason and Percentage */}
            {offerId === 'custom_discount' && (
              <div className="pt-3 space-y-3 border-t border-slate-200 mt-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                    Custom Discount Reason <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Enter custom reason (e.g. Regular customer, Group negotiation, etc.)"
                    value={customDiscountReason}
                    onChange={(e) => setCustomDiscountReason(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-white border border-slate-300 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:border-amber-600 focus:ring-2 focus:ring-amber-100 focus:outline-none font-semibold shadow-sm"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Discount Percentage (%) <span className="text-red-600">*</span>
                    </label>
                    <span className="text-xs font-mono font-bold text-amber-700">
                      {customDiscountPercentage || 0}% OFF
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      required
                      placeholder="e.g. 50 or 100"
                      value={customDiscountPercentage}
                      onChange={(e) => setCustomDiscountPercentage(e.target.value)}
                      className="w-32 px-3 py-2 rounded-xl bg-white border border-slate-300 text-sm font-mono font-bold text-slate-900 focus:border-amber-600 focus:outline-none shadow-sm"
                    />
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {['10', '20', '30', '50', '100'].map(p => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setCustomDiscountPercentage(p)}
                          className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-mono font-bold border transition-all ${
                            customDiscountPercentage === p
                              ? 'bg-amber-600 text-white border-amber-600 shadow-md'
                              : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                          }`}
                        >
                          {p}%
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Reference Approval Selector when discount or special offer selected */}
          {offerId !== 'none' && offerId !== 'district_app' && offerId !== 'website_booking' && offerId !== 'activity_kids' && (
            <div className="p-4 rounded-2xl bg-amber-100/80 border border-amber-300 space-y-2.5 text-xs sm:text-sm">
              <div className="flex items-center justify-between font-bold text-amber-900">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-amber-700" />
                  Whose Reference Approved This Discount? (Mandatory)
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2.5 pt-1">
                {REFERENCES.map((ref) => (
                  <button
                    key={ref}
                    type="button"
                    onClick={() => setReferencePerson(ref)}
                    className={`py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold font-mono transition-all ${
                      referencePerson === ref
                        ? 'bg-amber-600 text-white shadow-md font-extrabold scale-95'
                        : 'bg-white text-amber-900 hover:bg-amber-200 border border-amber-300'
                    }`}
                  >
                    {ref}
                  </button>
                ))}
              </div>

              {referencePerson === 'Khaja Sir' && (
                <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs sm:text-sm text-amber-950 flex items-center gap-2 font-bold shadow-sm">
                  <Camera className="w-4 h-4 text-amber-800 flex-shrink-0" />
                  <span>📸 Mandatory: Take a screenshot of Khaja Sir reference approval and attach in closing message.</span>
                </div>
              )}
            </div>
          )}

          {/* Pricing Calculation Display */}
          <div className="p-4 rounded-2xl bg-slate-100/90 border border-slate-300">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-slate-800">
                <Calculator className="w-4 h-4 text-cyan-700" />
                <span>Auto-Pricing Engine</span>
              </div>
              <span className={`text-[10px] sm:text-xs font-mono font-bold px-2.5 py-1 rounded-full ${
                pricingInfo.isWeekend ? 'bg-amber-200 text-amber-900 border border-amber-400' : 'bg-cyan-200 text-cyan-900 border border-cyan-400'
              }`}>
                {pricingInfo.dayType}
              </span>
            </div>

            <div className="grid grid-cols-4 gap-2.5 text-center">
              <div className="p-2.5 rounded-xl bg-white border border-slate-300 shadow-sm">
                <div className="text-[10px] sm:text-xs text-slate-600 font-bold uppercase">Rate/Player</div>
                <div className="text-xs sm:text-sm font-extrabold text-slate-900 font-mono mt-0.5">₹{pricingInfo.ratePerPax}</div>
              </div>
              <div className="p-2.5 rounded-xl bg-white border border-slate-300 shadow-sm">
                <div className="text-[10px] sm:text-xs text-slate-600 font-bold uppercase">Base Total</div>
                <div className="text-xs sm:text-sm font-extrabold text-slate-900 font-mono mt-0.5">₹{pricingInfo.baseTotal.toLocaleString()}</div>
              </div>
              <div className="p-2.5 rounded-xl bg-white border border-slate-300 shadow-sm">
                <div className="text-[10px] sm:text-xs text-amber-700 font-bold uppercase">Discount</div>
                <div className="text-xs sm:text-sm font-extrabold text-amber-700 font-mono mt-0.5">-₹{pricingInfo.discountAmount.toLocaleString()}</div>
              </div>
              <div className="p-2.5 rounded-xl bg-emerald-100/90 border border-emerald-300 shadow-sm">
                <div className="text-[10px] sm:text-xs text-emerald-800 font-extrabold uppercase">Final Total</div>
                <div className="text-sm sm:text-base font-black text-emerald-800 font-mono mt-0.5">₹{finalTotalAmount.toLocaleString()}</div>
              </div>
            </div>
          </div>

          {/* Pending Option */}
          {!isComplimentary && (
            <div className="p-3.5 sm:p-4 rounded-2xl bg-amber-100/80 border border-amber-300 flex items-center justify-between">
              <label className="flex items-center gap-3 cursor-pointer text-xs sm:text-sm font-bold text-amber-950">
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
          <div className={`p-4 rounded-2xl bg-slate-100/90 border transition-all ${
            isPendingBooking ? 'opacity-80 border-amber-300 bg-amber-50' : 'border-slate-300'
          }`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-800">
                <CreditCard className="w-4 h-4 text-cyan-700" />
                <span>Split Payment Entry</span>
              </div>
              {!isComplimentary && (
                <div className="text-xs text-slate-600 font-semibold flex items-center gap-1 flex-wrap">
                  <span>Auto Fill:</span>
                  {PAYMENT_METHODS.map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => handleAutoFillSplit(m)}
                      className="px-2 py-1 rounded-lg bg-white border border-slate-300 hover:bg-slate-200 text-[10px] sm:text-xs text-slate-800 font-mono font-bold transition-all shadow-sm"
                    >
                      100% {m.split(' ')[0]}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Payment Fields */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {PAYMENT_METHODS.map((method) => (
                <div key={method} className="bg-white p-2.5 rounded-xl border border-slate-300 shadow-sm">
                  <label className="block text-[11px] sm:text-xs font-bold text-slate-700 truncate mb-1">
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
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-300 text-xs sm:text-sm font-mono font-bold text-slate-900 placeholder-slate-400 focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none disabled:opacity-50"
                  />
                </div>
              ))}
            </div>

            {/* Verification Bar */}
            <div className={`mt-3.5 p-3.5 rounded-xl border flex items-center justify-between transition-all ${
              isComplimentary
                ? 'bg-purple-100 border-purple-300 text-purple-950'
                : isExactMatch
                  ? 'bg-emerald-100 border-emerald-300 text-emerald-950'
                  : 'bg-amber-100 border-amber-300 text-amber-950'
            }`}>
              <div className="flex items-center gap-2.5">
                {isComplimentary ? (
                  <Gift className="w-5 h-5 text-purple-700 shrink-0" />
                ) : isExactMatch ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0" />
                )}
                <div>
                  <div className="text-xs sm:text-sm font-extrabold font-mono">
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
                  <div className="text-[10px] sm:text-xs text-slate-700 font-mono font-semibold mt-0.5">
                    Split Paid: ₹{splitTotal.toLocaleString()} / Target Total: ₹{finalTotalAmount.toLocaleString()}
                  </div>
                </div>
              </div>
            </div>

            {Boolean(
              Number(payments['Prepaid by District']) > 0 ||
              Number(payments['Razorpay (Website Bookings)']) > 0 ||
              Number(payments['Activity Kids']) > 0
            ) && (
              <div className="mt-3 p-3 bg-purple-50 border border-purple-300 rounded-xl text-xs sm:text-sm text-purple-950 flex items-center gap-2 font-bold shadow-sm">
                <Camera className="w-4 h-4 text-purple-700 flex-shrink-0" />
                <span>📸 Attach booking / payment screenshots in closing.</span>
              </div>
            )}
          </div>

          {/* Action Footer */}
          <div className="pt-3 flex items-center justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-slate-700 hover:text-slate-900 bg-slate-200/80 hover:bg-slate-300 border border-slate-300 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSubmit || submitting}
              className={`px-6 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold text-white transition-all shadow-md flex items-center gap-2 ${
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
