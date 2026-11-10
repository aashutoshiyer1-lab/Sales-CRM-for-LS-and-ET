import React, { useState, useMemo, useRef } from 'react';
import { VENUES, PAYMENT_METHODS, OFFERS, REFERENCES, VENUE_DETAILS } from '../config/venueData';
import { getGameCategoryLabel, getBookingCategory } from '../utils/pricingEngine';
import { 
  BarChart3, 
  Calendar as CalendarIcon, 
  TrendingUp, 
  Users, 
  Clock, 
  Clock3,
  CreditCard, 
  Download, 
  Trash2, 
  Search, 
  Filter, 
  ArrowUpRight, 
  Eye, 
  Edit3, 
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  Tag,
  ShieldCheck,
  Gamepad2,
  Lock,
  Receipt,
  Copy,
  Check,
  Camera,
  X,
  SlidersHorizontal,
  Sparkles,
  Layers
} from 'lucide-react';

export const SalesDashboard = ({ 
  bookings = [], 
  onSelectBooking, 
  onEditBooking, 
  onDeleteBooking,
  onResetAllBookings,
  onUpdateBooking
}) => {
  const [venueToggle, setVenueToggle] = useState('ALL'); // 'ALL' | 'Escape Time' | 'Laser Shooter'
  const [dateRangeMode, setDateRangeMode] = useState('TODAY'); // 'TODAY' | 'YESTERDAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'ALL_TIME' | 'CUSTOM' | 'PENDING_ONLY'
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [copied, setCopied] = useState(false);
  const [highlightedBookingId, setHighlightedBookingId] = useState(null);

  // Column Filter States
  const [selectedOfferFilter, setSelectedOfferFilter] = useState('ALL');
  const [selectedGameFilter, setSelectedGameFilter] = useState('ALL');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('ALL');
  const [selectedPaymentFilter, setSelectedPaymentFilter] = useState('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('ALL');
  const [selectedRefFilter, setSelectedRefFilter] = useState('ALL');
  const [showFiltersPanel, setShowFiltersPanel] = useState(false);

  const tableRef = useRef(null);

  // Dynamic list of games according to venueToggle
  const availableGames = useMemo(() => {
    if (venueToggle === VENUES.ESCAPE_TIME) {
      return VENUE_DETAILS[VENUES.ESCAPE_TIME]?.games.map(g => g.name) || [];
    }
    if (venueToggle === VENUES.LASER_SHOOTER) {
      return VENUE_DETAILS[VENUES.LASER_SHOOTER]?.games.map(g => g.name) || [];
    }
    return [
      ...(VENUE_DETAILS[VENUES.ESCAPE_TIME]?.games.map(g => g.name) || []),
      ...(VENUE_DETAILS[VENUES.LASER_SHOOTER]?.games.map(g => g.name) || [])
    ];
  }, [venueToggle]);

  // Dynamic list of references found in data + config
  const availableReferences = useMemo(() => {
    const set = new Set(REFERENCES);
    bookings.forEach(b => {
      if (b.referencePerson && b.referencePerson !== 'N/A' && b.referencePerson !== 'None') {
        set.add(b.referencePerson);
      }
    });
    return Array.from(set);
  }, [bookings]);

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedOfferFilter !== 'ALL') count++;
    if (selectedGameFilter !== 'ALL') count++;
    if (selectedCategoryFilter !== 'ALL') count++;
    if (selectedPaymentFilter !== 'ALL') count++;
    if (selectedStatusFilter !== 'ALL') count++;
    if (selectedRefFilter !== 'ALL') count++;
    if (searchQuery.trim() !== '') count++;
    return count;
  }, [selectedOfferFilter, selectedGameFilter, selectedCategoryFilter, selectedPaymentFilter, selectedStatusFilter, selectedRefFilter, searchQuery]);

  // Reset all filters to default
  const handleClearAllFilters = () => {
    setSelectedOfferFilter('ALL');
    setSelectedGameFilter('ALL');
    setSelectedCategoryFilter('ALL');
    setSelectedPaymentFilter('ALL');
    setSelectedStatusFilter('ALL');
    setSelectedRefFilter('ALL');
    setSearchQuery('');
  };

  // Helper date calculations
  const dateFiltersMemo = useMemo(() => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    // Start of week (Monday)
    const dayOfWeek = today.getDay();
    const distanceToMon = (dayOfWeek + 6) % 7;
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - distanceToMon);
    const startOfWeekStr = startOfWeek.toISOString().split('T')[0];

    // Start of month
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfMonthStr = startOfMonth.toISOString().split('T')[0];

    return {
      todayStr,
      yesterdayStr,
      startOfWeekStr,
      startOfMonthStr,
    };
  }, []);

  // Filter Bookings
  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      // 1. Venue Filter
      if (venueToggle !== 'ALL' && b.venue !== venueToggle) {
        return false;
      }

      // 2. Date Range Filter
      const bDate = b.date;
      if (dateRangeMode === 'TODAY') {
        if (bDate !== dateFiltersMemo.todayStr) return false;
      } else if (dateRangeMode === 'YESTERDAY') {
        if (bDate !== dateFiltersMemo.yesterdayStr) return false;
      } else if (dateRangeMode === 'THIS_WEEK') {
        if (bDate < dateFiltersMemo.startOfWeekStr || bDate > dateFiltersMemo.todayStr) return false;
      } else if (dateRangeMode === 'THIS_MONTH') {
        if (bDate < dateFiltersMemo.startOfMonthStr || bDate > dateFiltersMemo.todayStr) return false;
      } else if (dateRangeMode === 'PENDING_ONLY') {
        if (b.status !== 'Pending') return false;
        if (bDate !== dateFiltersMemo.todayStr) return false;
      } else if (dateRangeMode === 'CUSTOM') {
        if (customStartDate && bDate < customStartDate) return false;
        if (customEndDate && bDate > customEndDate) return false;
      }

      // 3. Search Filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const name = (b.customerName || '').toLowerCase();
        const phone = (b.phone || '').toLowerCase();
        const game = (b.gameName || '').toLowerCase();
        const ref = (b.referencePerson || '').toLowerCase();
        const note = (b.customNote || b.customDiscountReason || '').toLowerCase();
        const offer = (b.offerName || '').toLowerCase();
        if (!name.includes(q) && !phone.includes(q) && !game.includes(q) && !ref.includes(q) && !note.includes(q) && !offer.includes(q)) {
          return false;
        }
      }

      // 4. Dedicated Offer & Discount Filter
      if (selectedOfferFilter !== 'ALL') {
        const hasSpecialOnlineOrPrepaid = b.payments && (
          (Number(b.payments['Prepaid by District']) > 0) ||
          (Number(b.payments['Prepaid by district']) > 0) ||
          (Number(b.payments['Activity Kids']) > 0) ||
          (Number(b.payments['Activity kids']) > 0) ||
          (Number(b.payments['Razorpay (Website Bookings)']) > 0) ||
          (Number(b.payments['Razorpay( website bookings)']) > 0) ||
          (Number(b.payments['Razorpay']) > 0)
        );
        const hasAnyDiscount = (b.offerId && b.offerId !== 'none') || (Number(b.discountAmount) > 0) || hasSpecialOnlineOrPrepaid;

        if (selectedOfferFilter === 'NONE') {
          if (hasAnyDiscount) return false;
        } else if (selectedOfferFilter === 'ANY_DISCOUNT') {
          if (!hasAnyDiscount) return false;
        } else if (selectedOfferFilter === 'district_app') {
          const isDistrictOffer = b.offerId === 'district_app' || (b.offerName && b.offerName.toLowerCase().includes('district'));
          const isDistrictPay = b.payments && (Number(b.payments['Prepaid by District']) > 0 || Number(b.payments['Prepaid by district']) > 0);
          if (!isDistrictOffer && !isDistrictPay) return false;
        } else if (selectedOfferFilter === 'website_booking') {
          const isWebOffer = b.offerId === 'website_booking' || (b.offerName && (b.offerName.toLowerCase().includes('razorpay') || b.offerName.toLowerCase().includes('website')));
          const isWebPay = b.payments && (Number(b.payments['Razorpay (Website Bookings)']) > 0 || Number(b.payments['Razorpay( website bookings)']) > 0 || Number(b.payments['Razorpay']) > 0);
          if (!isWebOffer && !isWebPay) return false;
        } else if (selectedOfferFilter === 'activity_kids') {
          const isKidsOffer = b.offerId === 'activity_kids' || (b.offerName && b.offerName.toLowerCase().includes('activity kids'));
          const isKidsPay = b.payments && (Number(b.payments['Activity Kids']) > 0 || Number(b.payments['Activity kids']) > 0);
          if (!isKidsOffer && !isKidsPay) return false;
        } else if (selectedOfferFilter === 'staff_game') {
          const isStaff = b.offerId === 'staff_game' || (b.offerName && b.offerName.toLowerCase().includes('staff'));
          if (!isStaff) return false;
        } else if (selectedOfferFilter === 'complimentary') {
          const isComp = b.offerId === 'complimentary' || (b.offerName && b.offerName.toLowerCase().includes('complimentary'));
          if (!isComp) return false;
        } else if (selectedOfferFilter === 'custom_discount') {
          const isCustom = b.offerId === 'custom_discount' || (b.offerName && b.offerName.toLowerCase().includes('custom')) || Boolean(b.customDiscountReason);
          if (!isCustom) return false;
        } else if (selectedOfferFilter === 'second_game') {
          const isSecond = b.offerId === 'second_game' || (b.offerName && b.offerName.toLowerCase().includes('second'));
          if (!isSecond) return false;
        } else if (selectedOfferFilter === 'birthday_package') {
          const isBday = b.offerId === 'birthday_package' || (b.offerName && b.offerName.toLowerCase().includes('birthday'));
          if (!isBday) return false;
        } else if (selectedOfferFilter === 'corporate_package') {
          const isCorp = b.offerId === 'corporate_package' || (b.offerName && b.offerName.toLowerCase().includes('corporate'));
          if (!isCorp) return false;
        } else if (selectedOfferFilter === 'high_price_retention') {
          const isRetention = b.offerId === 'high_price_retention' || (b.offerName && b.offerName.toLowerCase().includes('going back'));
          if (!isRetention) return false;
        } else if (selectedOfferFilter === 'cross_promotion') {
          const isCoupon = b.offerId === 'cross_promotion' || (b.offerName && b.offerName.toLowerCase().includes('coupon'));
          if (!isCoupon) return false;
        } else if (selectedOfferFilter === 'cross_promotion_brochure') {
          const isBrochure = b.offerId === 'cross_promotion_brochure' || (b.offerName && b.offerName.toLowerCase().includes('brochure'));
          if (!isBrochure) return false;
        } else {
          if (b.offerId !== selectedOfferFilter && b.offerName !== selectedOfferFilter) {
            return false;
          }
        }
      }

      // 5. Game / Room Filter
      if (selectedGameFilter !== 'ALL') {
        if (b.gameName !== selectedGameFilter) return false;
      }

      // 6. Category / Pax Bracket Filter
      if (selectedCategoryFilter !== 'ALL') {
        if (selectedCategoryFilter === 'laser') {
          if (b.venue !== VENUES.LASER_SHOOTER) return false;
        } else {
          const cat = getBookingCategory(b, bookings);
          if (cat !== selectedCategoryFilter) return false;
        }
      }

      // 7. Payment Method Filter
      if (selectedPaymentFilter !== 'ALL') {
        const p = b.payments || {};
        if (selectedPaymentFilter === 'Cash') {
          if (Number(p.Cash || 0) <= 0) return false;
        } else if (selectedPaymentFilter === 'Card') {
          if (Number(p.Card || 0) <= 0) return false;
        } else if (selectedPaymentFilter === 'UPI-New Pay') {
          if (Number(p['UPI-New Pay'] || 0) <= 0 && Number(p['UPI/New Pay'] || 0) <= 0) return false;
        } else if (selectedPaymentFilter === 'Prepaid by District') {
          const amt = Number(p['Prepaid by District'] || 0) + Number(p['Prepaid by district'] || 0);
          if (amt <= 0 && b.offerId !== 'district_app') return false;
        } else if (selectedPaymentFilter === 'Razorpay (Website Bookings)') {
          const amt = Number(p['Razorpay (Website Bookings)'] || 0) + Number(p['Razorpay( website bookings)'] || 0) + Number(p['Razorpay'] || 0);
          if (amt <= 0 && b.offerId !== 'website_booking') return false;
        } else if (selectedPaymentFilter === 'Activity Kids') {
          const amt = Number(p['Activity Kids'] || 0) + Number(p['Activity kids'] || 0);
          if (amt <= 0 && b.offerId !== 'activity_kids') return false;
        }
      }

      // 8. Status Filter
      if (selectedStatusFilter !== 'ALL') {
        if (selectedStatusFilter === 'Confirmed' && b.status === 'Pending') return false;
        if (selectedStatusFilter === 'Pending' && b.status !== 'Pending') return false;
      }

      // 9. Reference Person Filter
      if (selectedRefFilter !== 'ALL') {
        if (selectedRefFilter === 'NONE') {
          if (b.referencePerson && b.referencePerson !== 'N/A' && b.referencePerson !== 'None') return false;
        } else {
          if (b.referencePerson !== selectedRefFilter) return false;
        }
      }

      return true;
    });
  }, [
    bookings, 
    venueToggle, 
    dateRangeMode, 
    customStartDate, 
    customEndDate, 
    searchQuery, 
    selectedOfferFilter,
    selectedGameFilter,
    selectedCategoryFilter,
    selectedPaymentFilter,
    selectedStatusFilter,
    selectedRefFilter,
    dateFiltersMemo
  ]);

  // Chronological Sorting: Date ascending (earliest date first), TimeSlot ascending (11:00 AM before 11:15 AM before 11:30 AM...)
  // Treats midnight (00:xx) and late night (01:xx) slots as end of shift so they sort at the end of the day's schedule
  const sortedBookings = useMemo(() => {
    const getTimeSlotMinutes = (slot) => {
      if (!slot) return 0;
      const [h, m] = slot.split(':').map(Number);
      if (isNaN(h) || isNaN(m)) return 0;
      const effectiveHour = h < 6 ? h + 24 : h;
      return effectiveHour * 60 + m;
    };

    return [...filteredBookings].sort((a, b) => {
      if (a.date !== b.date) {
        return (a.date || '').localeCompare(b.date || '');
      }
      const minA = getTimeSlotMinutes(a.timeSlot);
      const minB = getTimeSlotMinutes(b.timeSlot);
      if (minA !== minB) return minA - minB;
      return (a.timeSlot || '').localeCompare(b.timeSlot || '');
    });
  }, [filteredBookings]);

  // Metrics - Computes confirmed sales normally, and computes pending sales values when in PENDING_ONLY mode!
  const metrics = useMemo(() => {
    const isPendingMode = dateRangeMode === 'PENDING_ONLY';

    const confirmedBookings = filteredBookings.filter(b => b.status !== 'Pending');
    const pendingInFilter = filteredBookings.filter(b => b.status === 'Pending');

    // Total pending bookings strictly for TODAY in venue (ignores advance bookings for tomorrow and future)
    const allPendingInVenue = bookings.filter(b => {
      if (venueToggle !== 'ALL' && b.venue !== venueToggle) return false;
      return b.status === 'Pending' && b.date === dateFiltersMemo.todayStr;
    });
    const pendingGamesCount = allPendingInVenue.length;

    // Expected revenue and players from pending games
    const pendingRevenue = pendingInFilter.reduce((sum, b) => sum + (Number(b.totalAmount) || Number(b.baseTotal) || 0), 0);
    const pendingPlayers = pendingInFilter.reduce((sum, b) => sum + (Number(b.paxCount) || 0), 0);

    const confirmedRevenue = confirmedBookings.reduce((sum, b) => sum + (Number(b.totalAmount) || 0), 0);
    const confirmedPlayers = confirmedBookings.reduce((sum, b) => sum + (Number(b.paxCount) || 0), 0);
    const confirmedGamesCount = confirmedBookings.filter(b => b.offerId !== 'complimentary').length;
    const complimentaryGamesCount = confirmedBookings.filter(b => b.offerId === 'complimentary').length;

    // When in PENDING_ONLY mode, show the pending games' sales values instead of 0!
    const totalRevenue = isPendingMode ? pendingRevenue : confirmedRevenue;
    const totalPlayers = isPendingMode ? pendingPlayers : confirmedPlayers;
    const totalGamesCount = isPendingMode ? pendingInFilter.length : confirmedGamesCount;
    const totalDiscounts = (isPendingMode ? pendingInFilter : confirmedBookings).reduce((sum, b) => sum + (Number(b.discountAmount) || 0), 0);

    const paymentBreakdown = {
      Cash: 0,
      Card: 0,
      'UPI-New Pay': 0,
      'Prepaid by District': 0,
      'Razorpay (Website Bookings)': 0,
      'Activity Kids': 0,
    };

    const bookingsForPayments = isPendingMode ? pendingInFilter : confirmedBookings;
    bookingsForPayments.forEach((b) => {
      if (b.payments) {
        Object.entries(b.payments).forEach(([method, amt]) => {
          const key = (method === 'UPI/New Pay') ? 'UPI-New Pay' 
            : (method === 'Razorpay( website bookings)' || method === 'Razorpay') ? 'Razorpay (Website Bookings)'
            : (method === 'Activity kids') ? 'Activity Kids'
            : method;
          if (paymentBreakdown[key] !== undefined) {
            paymentBreakdown[key] += Number(amt) || 0;
          }
        });
      }
    });

    return {
      totalRevenue,
      totalPlayers,
      totalGamesCount,
      complimentaryGamesCount,
      pendingGamesCount,
      totalDiscounts,
      paymentBreakdown,
      isPendingMode,
    };
  }, [filteredBookings, bookings, venueToggle, dateRangeMode]);

  // Handle clicking "Pending Games" metric card -> Toggles filter & auto-scrolls to table
  const handlePendingGamesClick = () => {
    if (dateRangeMode === 'PENDING_ONLY') {
      setDateRangeMode('TODAY');
    } else {
      setDateRangeMode('PENDING_ONLY');
      if (tableRef.current) {
        tableRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  // Export Excel / CSV
  const handleExportToExcel = () => {
    if (filteredBookings.length === 0) {
      alert('No sales data available to export for the selected filter.');
      return;
    }

    const headers = [
      'Date',
      'Time Slot',
      'Venue',
      'Game Name',
      'Customer Name',
      'Phone Number',
      'Email',
      'Player Count',
      'Pax Category',
      'Offer Applied',
      'Approval Reference',
      'Base Total (INR)',
      'Discount (INR)',
      'Final Paid Total (INR)',
      'Cash (INR)',
      'Card (INR)',
      'UPI-New Pay (INR)',
      'Prepaid by District (INR)',
      'Razorpay (Website Bookings) (INR)',
      'Activity Kids (INR)',
      'Status'
    ];

    const csvRows = [headers.join(',')];

    filteredBookings.forEach((b) => {
      const row = [
        `"${b.date || ''}"`,
        `"${b.timeSlot || ''}"`,
        `"${b.venue || ''}"`,
        `"${(b.gameName || '').replace(/"/g, '""')}"`,
        `"${(b.customerName || '').replace(/"/g, '""')}"`,
        `"${b.phone || ''}"`,
        `"${b.email || ''}"`,
        b.paxCount || 0,
        `"${getGameCategoryLabel(b, bookings)}"`,
        `"${(b.offerName || 'None').replace(/"/g, '""')}"`,
        `"${(b.referencePerson || 'N/A').replace(/"/g, '""')}"`,
        b.baseTotal || b.totalAmount || 0,
        b.discountAmount || 0,
        b.totalAmount || 0,
        b.payments?.Cash || 0,
        b.payments?.Card || 0,
        (b.payments?.['UPI-New Pay'] || b.payments?.['UPI/New Pay'] || 0),
        b.payments?.['Prepaid by District'] || 0,
        (b.payments?.['Razorpay (Website Bookings)'] || b.payments?.['Razorpay( website bookings)'] || 0),
        (b.payments?.['Activity Kids'] || b.payments?.['Activity kids'] || 0),
        `"${b.status || 'Confirmed'}"`
      ];
      csvRows.push(row.join(','));
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvRows.join('\n'));
    const link = document.createElement('a');
    link.setAttribute('href', csvContent);
    const dateStamp = new Date().toISOString().split('T')[0];
    const offerTag = selectedOfferFilter !== 'ALL' ? `_${selectedOfferFilter}` : '';
    link.setAttribute('download', `Sales_Report_${venueToggle}${offerTag}_${dateStamp}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Copy Sales Data of selected view/day to Clipboard
  const handleCopyData = () => {
    if (sortedBookings.length === 0) {
      alert('No sales data available to copy for the selected filter.');
      return;
    }

    const filterLabel = dateRangeMode === 'TODAY' 
      ? dateFiltersMemo.todayStr 
      : dateRangeMode === 'YESTERDAY' 
        ? dateFiltersMemo.yesterdayStr 
        : dateRangeMode.replace('_', ' ');

    let copyText = `📊 SALES & REVENUE REPORT (${venueToggle} - ${filterLabel})\n`;
    const complSummary = !metrics.isPendingMode && metrics.complimentaryGamesCount > 0 
      ? ` (+${metrics.complimentaryGamesCount} Compl.) [Total: ${metrics.totalGamesCount + metrics.complimentaryGamesCount}]` 
      : '';
    copyText += `Total Revenue: ₹${metrics.totalRevenue.toLocaleString()} | Total Players: ${metrics.totalPlayers} | Total Games: ${metrics.totalGamesCount}${complSummary}\n`;
    copyText += `--------------------------------------------------\n\n`;

    sortedBookings.forEach((b, idx) => {
      const isPending = b.status === 'Pending';
      const statusStr = isPending ? '[PENDING]' : '[CONFIRMED]';
      const paidAmount = isPending ? 'Pending' : `₹${Number(b.totalAmount || 0).toLocaleString()}`;
      const offerStr = (b.offerId && b.offerId !== 'none') ? ` (Offer: ${b.offerName})` : '';
      const refStr = b.referencePerson ? ` [Ref: ${b.referencePerson}]` : '';
      const noteStr = (b.customNote || (b.offerId !== 'custom_discount' && b.customDiscountReason)) ? ` [Note: ${b.customNote || b.customDiscountReason}]` : '';

      let paymentDetailsStr = '';
      if (!isPending && b.payments) {
        const parts = Object.entries(b.payments)
          .filter(([_, amt]) => Number(amt) > 0)
          .map(([m, amt]) => `${m}: ₹${amt}`);
        if (parts.length > 0) {
          paymentDetailsStr = ` (${parts.join(', ')})`;
        }
      }

      copyText += `${idx + 1}. [${b.timeSlot}] ${b.date} | ${b.venue}\n`;
      copyText += `   🎮 Game: ${b.gameName} (${getGameCategoryLabel(b, bookings)})\n`;
      copyText += `   👤 Customer: ${b.customerName} (${b.phone || 'N/A'})\n`;
      copyText += `   👥 Players: ${b.paxCount}${offerStr}${refStr}${noteStr}\n`;
      copyText += `   💰 Amount: ${paidAmount}${paymentDetailsStr} ${statusStr}\n\n`;
    });

    copyText += `--------------------------------------------------\n`;
    copyText += `Generated on ${new Date().toLocaleString()}\n`;

    const fallbackCopy = (text) => {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      let success = false;
      try {
        success = document.execCommand('copy');
      } catch (err) {
        success = false;
      }
      document.body.removeChild(textarea);
      return success;
    };

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(copyText).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }).catch(() => {
        fallbackCopy(copyText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      });
    } else {
      fallbackCopy(copyText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleConfirmReset = () => {
    onResetAllBookings();
    setShowResetConfirm(false);
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-4 sm:space-y-6">
      
      {/* Top Header & Actions */}
      <div className="bg-white rounded-3xl p-4 sm:p-6 border border-slate-200 shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-4 sm:gap-6">
        <div>
          <div className="flex items-center gap-2 mb-1 sm:mb-2">
            <span className="px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-mono font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
              Real-time Analytics
            </span>
            <span className="text-[10px] sm:text-xs text-slate-500 font-mono font-bold">
              All Venues Combined
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Sales & Revenue Dashboard
          </h1>
          <p className="text-xs text-slate-600 mt-0.5 sm:mt-1 font-medium">
            Financial reporting, payment segregation, discount audits, and Excel export
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full lg:w-auto">
          <button
            onClick={handleExportToExcel}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold shadow-md transition-all active:scale-95"
            title="Download CSV / Excel File"
          >
            <Download className="w-4 h-4 stroke-[2.5]" />
            <span className="whitespace-nowrap">Export CSV</span>
          </button>

          <button
            onClick={handleCopyData}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-2xl text-xs font-extrabold shadow-md transition-all active:scale-95 ${
              copied
                ? 'bg-emerald-600 text-white ring-2 ring-emerald-300'
                : 'bg-slate-900 hover:bg-slate-800 text-white'
            }`}
            title="Copy entire day sales text to clipboard"
          >
            {copied ? (
              <Check className="w-4 h-4 text-emerald-200 stroke-[3]" />
            ) : (
              <Copy className="w-4 h-4 stroke-[2.5]" />
            )}
            <span className="whitespace-nowrap">{copied ? 'Copied!' : 'Copy Sales'}</span>
          </button>

          <button
            onClick={() => setShowResetConfirm(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-2xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-bold transition-all"
            title="Clear all transactions from memory"
          >
            <RotateCcw className="w-4 h-4" />
            <span className="whitespace-nowrap">Reset</span>
          </button>
        </div>
      </div>

      {/* Filter Control Bar */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200 shadow-xl space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* Venue Selector */}
          <div className="grid grid-cols-3 gap-1 sm:flex sm:items-center p-1 sm:p-1.5 rounded-2xl bg-slate-100 border border-slate-200 w-full lg:w-auto text-center">
            <button
              onClick={() => setVenueToggle('ALL')}
              className={`px-2 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs font-bold transition-all ${
                venueToggle === 'ALL'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Both
            </button>
            <button
              onClick={() => setVenueToggle(VENUES.ESCAPE_TIME)}
              className={`flex items-center justify-center gap-1 sm:gap-1.5 px-2 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs font-bold transition-all ${
                venueToggle === VENUES.ESCAPE_TIME
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Lock className="w-3.5 h-3.5 shrink-0" />
              <span>Escape</span>
            </button>
            <button
              onClick={() => setVenueToggle(VENUES.LASER_SHOOTER)}
              className={`flex items-center justify-center gap-1 sm:gap-1.5 px-2 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs font-bold transition-all ${
                venueToggle === VENUES.LASER_SHOOTER
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Gamepad2 className="w-3.5 h-3.5 shrink-0" />
              <span>Laser</span>
            </button>
          </div>

          {/* Quick Date Presets */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
            {[
              { id: 'TODAY', label: 'Today' },
              { id: 'YESTERDAY', label: 'Yesterday' },
              { id: 'THIS_WEEK', label: 'This Week' },
              { id: 'THIS_MONTH', label: 'This Month' },
              { id: 'PENDING_ONLY', label: "Today's Pending Games" },
              { id: 'ALL_TIME', label: 'All Time' },
              { id: 'CUSTOM', label: 'Custom Date' }
            ].map((preset) => (
              <button
                key={preset.id}
                onClick={() => setDateRangeMode(preset.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  dateRangeMode === preset.id
                    ? preset.id === 'PENDING_ONLY'
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'bg-cyan-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

        </div>

        {/* Custom Date Range Picker */}
        {dateRangeMode === 'CUSTOM' && (
          <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-slate-200">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-bold">From:</span>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-300 text-xs font-mono font-bold text-slate-900 focus:outline-none cursor-pointer"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-bold">To:</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-300 text-xs font-mono font-bold text-slate-900 focus:outline-none cursor-pointer"
              />
            </div>
          </div>
        )}

        {/* Toggle Button for Column & Offer Filters */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-200">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-slate-500" />
            <span className="text-xs font-black uppercase tracking-wider text-slate-700">
              Column & Offer Filters
            </span>
            {activeFilterCount > 0 && !showFiltersPanel && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-black bg-amber-100 text-amber-950 border border-amber-300">
                {activeFilterCount} Active Filter{activeFilterCount > 1 ? 's' : ''}
              </span>
            )}
          </div>

          <button
            onClick={() => setShowFiltersPanel(!showFiltersPanel)}
            className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-black transition-all shadow-sm active:scale-95 ${
              showFiltersPanel
                ? 'bg-slate-900 text-white ring-2 ring-slate-400'
                : activeFilterCount > 0
                  ? 'bg-amber-100 hover:bg-amber-200 text-amber-950 border border-amber-300'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-cyan-600" />
            <span>{showFiltersPanel ? 'Hide Filters' : 'Show All Column Filters'}</span>
            {activeFilterCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-cyan-700 text-white text-[10px] flex items-center justify-center font-bold">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* Filter Panel: Quick Offer Pills + Column Filters Grid + Active Filter Summary */}
        {showFiltersPanel && (
          <div className="space-y-4 pt-3 border-t border-slate-200">
            
            {/* Quick Offer & Discount Filter Pills */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1 rounded-lg bg-amber-100 text-amber-800">
                  <Tag className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-black uppercase tracking-wider text-slate-800">
                  Quick Offer & Discount Filter:
                </span>
                {selectedOfferFilter !== 'ALL' && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                    Active: {selectedOfferFilter === 'district_app' ? 'Prepaid by District' : selectedOfferFilter === 'staff_game' ? 'Staff Game' : selectedOfferFilter === 'complimentary' ? 'Complimentary' : selectedOfferFilter}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-thin">
                {[
                  { id: 'ALL', label: 'All Offers / Rates' },
                  { id: 'district_app', label: '🏷️ Prepaid by District', color: 'purple' },
                  { id: 'staff_game', label: '🏷️ Staff Game (100%)', color: 'amber' },
                  { id: 'complimentary', label: '🏷️ Complimentary (100%)', color: 'emerald' },
                  { id: 'website_booking', label: '🏷️ Razorpay / Website', color: 'cyan' },
                  { id: 'activity_kids', label: '🏷️ Activity Kids', color: 'rose' },
                  { id: 'second_game', label: '🏷️ Second Game (20%)', color: 'blue' },
                  { id: 'custom_discount', label: '🏷️ Custom Discount', color: 'orange' },
                  { id: 'ANY_DISCOUNT', label: 'Any Offer Applied', color: 'indigo' },
                  { id: 'NONE', label: 'Standard Rate Only', color: 'slate' },
                ].map((pill) => {
                  const isSelected = selectedOfferFilter === pill.id;
                  return (
                    <button
                      key={pill.id}
                      onClick={() => setSelectedOfferFilter(pill.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all whitespace-nowrap shadow-sm active:scale-95 ${
                        isSelected
                          ? pill.color === 'purple'
                            ? 'bg-purple-700 text-white ring-2 ring-purple-300'
                            : pill.color === 'amber'
                              ? 'bg-amber-600 text-white ring-2 ring-amber-300'
                              : pill.color === 'emerald'
                                ? 'bg-emerald-700 text-white ring-2 ring-emerald-300'
                                : pill.color === 'cyan'
                                  ? 'bg-cyan-700 text-white ring-2 ring-cyan-300'
                                  : pill.color === 'rose'
                                    ? 'bg-rose-700 text-white ring-2 ring-rose-300'
                                    : pill.color === 'blue'
                                      ? 'bg-blue-700 text-white ring-2 ring-blue-300'
                                      : pill.color === 'orange'
                                        ? 'bg-orange-700 text-white ring-2 ring-orange-300'
                                        : 'bg-slate-900 text-white ring-2 ring-slate-400'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                      }`}
                    >
                      {pill.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Column Filters Dropdown Grid */}
            <div className="pt-3 border-t border-slate-200">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
                
                {/* 1. Offer / Discount Select */}
                <div className="space-y-1">
                  <label className="text-[11px] font-black uppercase text-slate-700 tracking-wider flex items-center gap-1">
                    <Tag className="w-3 h-3 text-amber-600" />
                    <span>Offer / Discount</span>
                  </label>
                  <select
                    value={selectedOfferFilter}
                    onChange={(e) => setSelectedOfferFilter(e.target.value)}
                    className={`w-full px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      selectedOfferFilter !== 'ALL'
                        ? 'bg-amber-50 text-amber-950 border-amber-400 ring-2 ring-amber-200 font-extrabold'
                        : 'bg-slate-50 text-slate-800 border-slate-300 hover:border-slate-400'
                    }`}
                  >
                    <option value="ALL">All Offers & Discounts</option>
                    <option value="district_app">★ Prepaid by District (District App)</option>
                    <option value="staff_game">★ Staff Game (100% OFF)</option>
                    <option value="complimentary">★ Complimentary Game (100% OFF)</option>
                    <option value="website_booking">★ Website Booking (Razorpay)</option>
                    <option value="activity_kids">★ Activity Kids</option>
                    <option value="second_game">Second Game Special (20% OFF)</option>
                    <option value="birthday_package">Birthday Package (10% OFF)</option>
                    <option value="corporate_package">Corporate Package (15% OFF)</option>
                    <option value="high_price_retention">Price Retention / Retention (10% OFF)</option>
                    <option value="cross_promotion">Cross Promotion Coupon (30% OFF)</option>
                    <option value="cross_promotion_brochure">Cross Promotion Brochure (30% OFF)</option>
                    <option value="custom_discount">Custom Reason Discount</option>
                    <option value="ANY_DISCOUNT">Any Offer Applied</option>
                    <option value="NONE">Standard Rate Only (No Discount)</option>
                  </select>
                </div>

                {/* 2. Game / Room Select */}
                <div className="space-y-1">
                  <label className="text-[11px] font-black uppercase text-slate-700 tracking-wider flex items-center gap-1">
                    <Gamepad2 className="w-3 h-3 text-cyan-600" />
                    <span>Game / Room</span>
                  </label>
                  <select
                    value={selectedGameFilter}
                    onChange={(e) => setSelectedGameFilter(e.target.value)}
                    className={`w-full px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      selectedGameFilter !== 'ALL'
                        ? 'bg-cyan-50 text-cyan-950 border-cyan-400 ring-2 ring-cyan-200 font-extrabold'
                        : 'bg-slate-50 text-slate-800 border-slate-300 hover:border-slate-400'
                    }`}
                  >
                    <option value="ALL">All Games & Rooms</option>
                    {availableGames.map((gameName) => (
                      <option key={gameName} value={gameName}>{gameName}</option>
                    ))}
                  </select>
                </div>

                {/* 3. Player Category Select */}
                <div className="space-y-1">
                  <label className="text-[11px] font-black uppercase text-slate-700 tracking-wider flex items-center gap-1">
                    <Users className="w-3 h-3 text-blue-600" />
                    <span>Pax Bracket</span>
                  </label>
                  <select
                    value={selectedCategoryFilter}
                    onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                    className={`w-full px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      selectedCategoryFilter !== 'ALL'
                        ? 'bg-blue-50 text-blue-950 border-blue-400 ring-2 ring-blue-200 font-extrabold'
                        : 'bg-slate-50 text-slate-800 border-slate-300 hover:border-slate-400'
                    }`}
                  >
                    <option value="ALL">All Player Brackets</option>
                    <option value="2-3">2–3 Players (ET Bracket)</option>
                    <option value="4-6">4–6 Players (ET Bracket)</option>
                    <option value="7+">7+ Players (ET Bracket)</option>
                    <option value="laser">Flat Rate Arena (Laser Shooter)</option>
                  </select>
                </div>

                {/* 4. Payment Method Select */}
                <div className="space-y-1">
                  <label className="text-[11px] font-black uppercase text-slate-700 tracking-wider flex items-center gap-1">
                    <CreditCard className="w-3 h-3 text-emerald-600" />
                    <span>Payment Method</span>
                  </label>
                  <select
                    value={selectedPaymentFilter}
                    onChange={(e) => setSelectedPaymentFilter(e.target.value)}
                    className={`w-full px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      selectedPaymentFilter !== 'ALL'
                        ? 'bg-emerald-50 text-emerald-950 border-emerald-400 ring-2 ring-emerald-200 font-extrabold'
                        : 'bg-slate-50 text-slate-800 border-slate-300 hover:border-slate-400'
                    }`}
                  >
                    <option value="ALL">All Payment Methods</option>
                    {PAYMENT_METHODS.map((method) => (
                      <option key={method} value={method}>{method}</option>
                    ))}
                  </select>
                </div>

                {/* 5. Booking Status Select */}
                <div className="space-y-1">
                  <label className="text-[11px] font-black uppercase text-slate-700 tracking-wider flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>Status</span>
                  </label>
                  <select
                    value={selectedStatusFilter}
                    onChange={(e) => setSelectedStatusFilter(e.target.value)}
                    className={`w-full px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      selectedStatusFilter !== 'ALL'
                        ? 'bg-purple-50 text-purple-950 border-purple-400 ring-2 ring-purple-200 font-extrabold'
                        : 'bg-slate-50 text-slate-800 border-slate-300 hover:border-slate-400'
                    }`}
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="Confirmed">✓ Paid & Confirmed</option>
                    <option value="Pending">⏳ Payment Pending</option>
                  </select>
                </div>

                {/* 6. Approval Reference Select */}
                <div className="space-y-1">
                  <label className="text-[11px] font-black uppercase text-slate-700 tracking-wider flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-indigo-600" />
                    <span>Approval Ref</span>
                  </label>
                  <select
                    value={selectedRefFilter}
                    onChange={(e) => setSelectedRefFilter(e.target.value)}
                    className={`w-full px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      selectedRefFilter !== 'ALL'
                        ? 'bg-indigo-50 text-indigo-950 border-indigo-400 ring-2 ring-indigo-200 font-extrabold'
                        : 'bg-slate-50 text-slate-800 border-slate-300 hover:border-slate-400'
                    }`}
                  >
                    <option value="ALL">All References</option>
                    {availableReferences.map((ref) => (
                      <option key={ref} value={ref}>{ref}</option>
                    ))}
                    <option value="NONE">Direct Walk-in / No Ref</option>
                  </select>
                </div>

              </div>
            </div>

            {/* Active Filters Summary Bar */}
            {activeFilterCount > 0 && (
              <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3.5 rounded-2xl">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                    <Filter className="w-3.5 h-3.5 text-cyan-600" />
                    <span>Active Filters ({activeFilterCount}):</span>
                  </span>

                  {selectedOfferFilter !== 'ALL' && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-100 text-amber-950 border border-amber-300 shadow-sm">
                      <span>Offer: {selectedOfferFilter === 'district_app' ? 'Prepaid by District' : selectedOfferFilter === 'staff_game' ? 'Staff Game' : selectedOfferFilter === 'complimentary' ? 'Complimentary' : selectedOfferFilter === 'NONE' ? 'Standard Rate' : selectedOfferFilter === 'ANY_DISCOUNT' ? 'Any Discount' : selectedOfferFilter}</span>
                      <button 
                        onClick={() => setSelectedOfferFilter('ALL')}
                        className="hover:text-red-700 ml-1 rounded-full hover:bg-amber-200 p-0.5"
                        title="Remove offer filter"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}

                  {selectedGameFilter !== 'ALL' && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-cyan-100 text-cyan-950 border border-cyan-300 shadow-sm">
                      <span>Game: {selectedGameFilter}</span>
                      <button 
                        onClick={() => setSelectedGameFilter('ALL')}
                        className="hover:text-red-700 ml-1 rounded-full hover:bg-cyan-200 p-0.5"
                        title="Remove game filter"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}

                  {selectedCategoryFilter !== 'ALL' && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-100 text-blue-950 border border-blue-300 shadow-sm">
                      <span>Bracket: {selectedCategoryFilter === 'laser' ? 'Flat Rate Arena' : `${selectedCategoryFilter} Players`}</span>
                      <button 
                        onClick={() => setSelectedCategoryFilter('ALL')}
                        className="hover:text-red-700 ml-1 rounded-full hover:bg-blue-200 p-0.5"
                        title="Remove category filter"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}

                  {selectedPaymentFilter !== 'ALL' && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-100 text-emerald-950 border border-emerald-300 shadow-sm">
                      <span>Payment: {selectedPaymentFilter}</span>
                      <button 
                        onClick={() => setSelectedPaymentFilter('ALL')}
                        className="hover:text-red-700 ml-1 rounded-full hover:bg-emerald-200 p-0.5"
                        title="Remove payment filter"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}

                  {selectedStatusFilter !== 'ALL' && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-100 text-purple-950 border border-purple-300 shadow-sm">
                      <span>Status: {selectedStatusFilter}</span>
                      <button 
                        onClick={() => setSelectedStatusFilter('ALL')}
                        className="hover:text-red-700 ml-1 rounded-full hover:bg-purple-200 p-0.5"
                        title="Remove status filter"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}

                  {selectedRefFilter !== 'ALL' && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-100 text-indigo-950 border border-indigo-300 shadow-sm">
                      <span>Ref: {selectedRefFilter === 'NONE' ? 'Direct / No Ref' : selectedRefFilter}</span>
                      <button 
                        onClick={() => setSelectedRefFilter('ALL')}
                        className="hover:text-red-700 ml-1 rounded-full hover:bg-indigo-200 p-0.5"
                        title="Remove reference filter"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}

                  {searchQuery.trim() !== '' && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-200 text-slate-900 border border-slate-300 shadow-sm">
                      <span>Search: "{searchQuery}"</span>
                      <button 
                        onClick={() => setSearchQuery('')}
                        className="hover:text-red-700 ml-1 rounded-full hover:bg-slate-300 p-0.5"
                        title="Clear search query"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                </div>

                <button
                  onClick={handleClearAllFilters}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black text-red-700 bg-red-100 hover:bg-red-200 border border-red-300 shadow-sm transition-all active:scale-95 shrink-0"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset All Filters</span>
                </button>
              </div>
            )}

          </div>
        )}
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className={`p-6 rounded-3xl shadow-lg relative overflow-hidden transition-all ${
          metrics.isPendingMode 
            ? 'bg-amber-50/50 border-2 border-amber-300' 
            : 'bg-white border-2 border-emerald-200'
        }`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-extrabold uppercase tracking-wider ${
              metrics.isPendingMode ? 'text-amber-800' : 'text-emerald-700'
            }`}>
              {metrics.isPendingMode ? 'Pending Revenue (To Collect)' : 'Total Revenue'}
            </span>
            <div className={`p-2.5 rounded-2xl border ${
              metrics.isPendingMode 
                ? 'bg-amber-100 text-amber-700 border-amber-300' 
                : 'bg-emerald-50 text-emerald-600 border border-emerald-200'
            }`}>
              {metrics.isPendingMode ? <Clock3 className="w-5 h-5" /> : <TrendingUp className="w-5 h-5" />}
            </div>
          </div>
          <div className={`text-3xl font-black font-mono mt-3 ${
            metrics.isPendingMode ? 'text-amber-950' : 'text-slate-900'
          }`}>
            ₹{metrics.totalRevenue.toLocaleString()}
          </div>
          <div className={`text-[11px] mt-1 flex items-center gap-1 font-mono font-semibold ${
            metrics.isPendingMode ? 'text-amber-800' : 'text-slate-600'
          }`}>
            {metrics.isPendingMode ? (
              <span>Uncollected revenue from pending games</span>
            ) : (
              <>
                <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600" />
                <span>Confirmed paid collections</span>
              </>
            )}
          </div>
        </div>

        <div className={`p-6 rounded-3xl shadow-lg relative overflow-hidden transition-all ${
          metrics.isPendingMode 
            ? 'bg-amber-50/50 border-2 border-amber-300' 
            : 'bg-white border-2 border-cyan-200'
        }`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-extrabold uppercase tracking-wider ${
              metrics.isPendingMode ? 'text-amber-800' : 'text-cyan-700'
            }`}>
              {metrics.isPendingMode ? 'Pending Players' : 'Total Players'}
            </span>
            <div className={`p-2.5 rounded-2xl border ${
              metrics.isPendingMode 
                ? 'bg-amber-100 text-amber-700 border-amber-300' 
                : 'bg-cyan-50 text-cyan-600 border border-cyan-200'
            }`}>
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className={`text-3xl font-black font-mono mt-3 ${
            metrics.isPendingMode ? 'text-amber-950' : 'text-slate-900'
          }`}>
            {metrics.totalPlayers.toLocaleString()} <span className="text-sm font-bold text-slate-500">Players</span>
          </div>
          <div className={`text-[11px] mt-1 font-mono font-semibold ${
            metrics.isPendingMode ? 'text-amber-800' : 'text-slate-600'
          }`}>
            {metrics.isPendingMode ? 'Players awaiting payment confirmation' : 'Confirmed player turnout'}
          </div>
        </div>

        <div className={`p-6 rounded-3xl shadow-lg relative overflow-hidden transition-all ${
          metrics.isPendingMode 
            ? 'bg-amber-50/50 border-2 border-amber-300' 
            : 'bg-white border-2 border-amber-200'
        }`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-extrabold uppercase tracking-wider ${
              metrics.isPendingMode ? 'text-amber-800' : 'text-amber-700'
            }`}>
              {metrics.isPendingMode ? 'Pending Games Count' : 'Total Games'}
            </span>
            <div className={`p-2.5 rounded-2xl border ${
              metrics.isPendingMode 
                ? 'bg-amber-100 text-amber-700 border-amber-300' 
                : 'bg-amber-50 text-amber-600 border border-amber-200'
            }`}>
              <Receipt className="w-5 h-5" />
            </div>
          </div>
          <div className={`text-3xl font-black font-mono mt-3 flex items-baseline gap-2 flex-wrap ${
            metrics.isPendingMode ? 'text-amber-950' : 'text-slate-900'
          }`}>
            <span>{metrics.totalGamesCount}</span>
            {!metrics.isPendingMode && metrics.complimentaryGamesCount > 0 && (
              <span className="text-sm font-bold font-mono text-purple-700 bg-purple-100 px-2 py-0.5 rounded-lg border border-purple-300">
                (+{metrics.complimentaryGamesCount} Compl.)
              </span>
            )}
          </div>
          <div className={`text-[11px] mt-1 font-mono font-semibold ${
            metrics.isPendingMode ? 'text-amber-800' : 'text-slate-600'
          }`}>
            {metrics.isPendingMode 
              ? 'Games awaiting payment & confirmation' 
              : metrics.complimentaryGamesCount > 0
                ? `Total: ${metrics.totalGamesCount + metrics.complimentaryGamesCount} games (${metrics.totalGamesCount} paid + ${metrics.complimentaryGamesCount} complimentary)`
                : 'Confirmed game entries'}
          </div>
        </div>

        {/* Dedicated Pending Games Metric Card with Click-to-Focus */}
        <div 
          onClick={handlePendingGamesClick}
          className={`p-6 rounded-3xl shadow-lg relative overflow-hidden cursor-pointer transition-all hover:scale-[1.02] ${
            metrics.isPendingMode
              ? 'bg-amber-500 text-white border-2 border-amber-600 ring-4 ring-amber-200'
              : 'bg-amber-50/70 border-2 border-amber-300 hover:bg-amber-100/80'
          }`}
          title={metrics.isPendingMode ? "Click to clear filter and show Today's sales" : "Click to view and edit today's pending games"}
        >
          <div className="flex items-center justify-between">
            <span className={`text-xs font-extrabold uppercase tracking-wider ${
              metrics.isPendingMode ? 'text-amber-100' : 'text-amber-800'
            }`}>
              {metrics.isPendingMode ? "Today's Pending Active" : "Today's Pending Games"}
            </span>
            <div className={`p-2.5 rounded-2xl border ${
              metrics.isPendingMode ? 'bg-amber-600 text-white border-amber-400' : 'bg-amber-100 text-amber-700 border-amber-300'
            }`}>
              <Clock3 className="w-5 h-5" />
            </div>
          </div>
          <div className={`text-3xl font-black font-mono mt-3 ${
            metrics.isPendingMode ? 'text-white' : 'text-amber-900'
          }`}>
            {metrics.pendingGamesCount}
          </div>
          <div className={`text-[11px] mt-1 font-mono font-bold flex items-center justify-between ${
            metrics.isPendingMode ? 'text-amber-100' : 'text-amber-800'
          }`}>
            <span>{metrics.isPendingMode ? "Showing Today's Pending" : "Payment to be collected today"}</span>
            <span className="text-[10px] underline">{metrics.isPendingMode ? 'Click to show All →' : 'Click to view →'}</span>
          </div>
        </div>
      </div>

      {/* Payment Segregation */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">Payment Method Collection Breakdown</h3>
              <p className="text-xs text-slate-600 font-medium">Segregated collection across Cash, Card, UPI-New Pay, and Prepaid</p>
            </div>
          </div>
          <span className="text-xs font-mono font-black text-emerald-800 bg-emerald-100 px-3.5 py-1.5 rounded-xl border border-emerald-300">
            Total Revenue: ₹{metrics.totalRevenue.toLocaleString()}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4 pt-2">
          {PAYMENT_METHODS.map((method) => {
            const amount = metrics.paymentBreakdown[method] || 0;
            const pct = metrics.totalRevenue > 0 ? Math.round((amount / metrics.totalRevenue) * 100) : 0;
            const isSelected = selectedPaymentFilter === method;
            
            return (
              <div 
                key={method} 
                onClick={() => setSelectedPaymentFilter(isSelected ? 'ALL' : method)}
                className={`p-4 sm:p-5 rounded-2xl border-2 shadow-md space-y-2.5 cursor-pointer transition-all hover:scale-[1.01] ${
                  isSelected
                    ? 'bg-emerald-50 border-emerald-500 ring-4 ring-emerald-200'
                    : 'bg-white border-slate-300 hover:border-slate-400'
                }`}
                title={`Click to filter table by ${method}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-black text-slate-950 text-base sm:text-lg uppercase font-mono tracking-wide">{method}</span>
                    {isSelected && (
                      <span className="text-[10px] font-black uppercase bg-emerald-600 text-white px-2 py-0.5 rounded-full font-mono">
                        Active Filter
                      </span>
                    )}
                  </div>
                  <span className="font-mono text-emerald-900 font-black text-xs sm:text-sm px-2.5 py-0.5 rounded-full bg-emerald-100 border border-emerald-300 shrink-0">{pct}%</span>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-slate-950 font-mono tracking-tight">
                  ₹{amount.toLocaleString()}
                </div>
                <div className="w-full h-2.5 rounded-full bg-slate-100 border border-slate-200 overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-emerald-600 via-cyan-600 to-slate-900 rounded-full transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Sales Table Container */}
      <div ref={tableRef} className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
        
        {/* Table Search & Title Header */}
        <div className="p-5 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-extrabold text-slate-900">
                Detailed Sales Transactions ({filteredBookings.length})
              </h2>
              {activeFilterCount > 0 && (
                <span className="text-xs font-mono font-black px-2.5 py-0.5 rounded-full bg-cyan-100 text-cyan-900 border border-cyan-300">
                  {activeFilterCount} Filter{activeFilterCount > 1 ? 's' : ''} Applied
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Showing records for {dateRangeMode.replace('_', ' ')} • {venueToggle}
              {selectedOfferFilter !== 'ALL' && ` • Offer: ${selectedOfferFilter === 'district_app' ? 'Prepaid by District' : selectedOfferFilter}`}
              {selectedGameFilter !== 'ALL' && ` • Game: ${selectedGameFilter}`}
              {selectedPaymentFilter !== 'ALL' && ` • Pay: ${selectedPaymentFilter}`}
            </p>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search name, phone, game, ref..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 rounded-xl bg-white border border-slate-300 text-xs font-medium text-slate-900 placeholder-slate-400 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 focus:outline-none"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                title="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-700 uppercase tracking-wider font-extrabold border-b border-slate-200">
              <tr>
                <th className="px-5 py-4">Date / Slot</th>
                <th className="px-5 py-4">Customer Details</th>
                <th className="px-5 py-4">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span>Venue & Game</span>
                    {selectedGameFilter !== 'ALL' && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono bg-cyan-600 text-white font-black">
                        <Filter className="w-2.5 h-2.5" />
                        {selectedGameFilter}
                      </span>
                    )}
                  </div>
                </th>
                <th className="px-5 py-4">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span>Players</span>
                    {selectedCategoryFilter !== 'ALL' && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono bg-blue-600 text-white font-black">
                        <Filter className="w-2.5 h-2.5" />
                        {selectedCategoryFilter}
                      </span>
                    )}
                  </div>
                </th>
                <th className="px-5 py-4">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span>Offer & Reference</span>
                    {(selectedOfferFilter !== 'ALL' || selectedRefFilter !== 'ALL') && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono bg-amber-600 text-white font-black">
                        <Filter className="w-2.5 h-2.5" />
                        Filtered
                      </span>
                    )}
                  </div>
                </th>
                <th className="px-5 py-4">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span>Total Paid / Status</span>
                    {selectedStatusFilter !== 'ALL' && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono bg-purple-600 text-white font-black">
                        <Filter className="w-2.5 h-2.5" />
                        {selectedStatusFilter}
                      </span>
                    )}
                  </div>
                </th>
                <th className="px-5 py-4">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span>Payment Split</span>
                    {selectedPaymentFilter !== 'ALL' && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono bg-emerald-600 text-white font-black">
                        <Filter className="w-2.5 h-2.5" />
                        {selectedPaymentFilter}
                      </span>
                    )}
                  </div>
                </th>
                <th className="px-5 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedBookings.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-14 text-center text-slate-500 font-mono font-medium">
                    <div className="flex flex-col items-center justify-center gap-3 max-w-sm mx-auto">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
                        <Filter className="w-6 h-6" />
                      </div>
                      <div className="text-sm font-bold text-slate-800">
                        No transactions found matching your filters
                      </div>
                      <p className="text-xs text-slate-500 font-sans">
                        Try adjusting or clearing your active filters to see all available bookings.
                      </p>
                      {activeFilterCount > 0 && (
                        <button
                          onClick={handleClearAllFilters}
                          className="mt-1 flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black bg-cyan-600 hover:bg-cyan-700 text-white shadow-md transition-all active:scale-95"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Clear All Filters ({activeFilterCount})</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                sortedBookings.map((b) => {
                  const isEscape = b.venue === VENUES.ESCAPE_TIME;
                  const isPending = b.status === 'Pending';

                  const hasSpecialOnlineOrPrepaidPayment = b.payments && (
                    (Number(b.payments['Prepaid by District']) > 0) ||
                    (Number(b.payments['Razorpay (Website Bookings)']) > 0) ||
                    (Number(b.payments['Razorpay( website bookings)']) > 0) ||
                    (Number(b.payments['Razorpay']) > 0) ||
                    (Number(b.payments['Activity Kids']) > 0) ||
                    (Number(b.payments['Activity kids']) > 0)
                  );

                  return (
                    <tr 
                      key={b.id} 
                      className={`transition-colors ${
                        isPending 
                          ? 'bg-amber-50/80 hover:bg-amber-100/80' 
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      
                      {/* Date & Slot */}
                      <td className="px-5 py-4 font-mono">
                        <div className="font-extrabold text-slate-900 text-xs">{b.date}</div>
                        <div className="inline-block px-2 py-0.5 rounded bg-slate-950 text-white font-black text-xs font-mono mt-1 shadow-sm tracking-tight">
                          {b.timeSlot}
                        </div>
                      </td>

                      {/* Customer */}
                      <td className="px-5 py-4">
                        <div className="font-black text-slate-950 text-base sm:text-lg tracking-tight">{b.customerName}</div>
                        <div className="text-xs sm:text-sm text-slate-700 font-mono font-extrabold mt-0.5">{b.phone}</div>
                      </td>

                      {/* Venue & Game Name */}
                      <td className="px-5 py-4">
                        <span className={`inline-block text-[10px] font-black uppercase px-2 py-0.5 rounded font-mono mb-1 ${
                          isEscape ? 'bg-red-100 text-red-800 border border-red-200' : 'bg-cyan-100 text-cyan-800 border border-cyan-200'
                        }`}>
                          {b.venue}
                        </span>
                        <div className="text-sm font-extrabold text-slate-900 tracking-wide flex items-center gap-1.5 flex-wrap">
                          <span>{b.gameName}</span>
                          <span className="text-[11px] font-bold text-slate-600 font-mono bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                            ({getGameCategoryLabel(b, bookings)})
                          </span>
                        </div>
                      </td>

                      {/* Players Count & Category */}
                      <td className="px-5 py-4 font-mono font-extrabold text-slate-900 text-xs">
                        <div className="font-extrabold text-slate-900 text-sm">{b.paxCount} Players</div>
                        {isEscape ? (
                          <div className="mt-1.5 flex items-center gap-1">
                            <select
                              value={getBookingCategory(b, bookings)}
                              onChange={(e) => {
                                const newCat = e.target.value;
                                if (onUpdateBooking) {
                                  onUpdateBooking(b.id, {
                                    categoryOverride: newCat,
                                    customCategory: newCat === '2-3' ? '2-3 Players Category' : newCat === '4-6' ? '4-6 Players Category' : '7+ Players Category'
                                  });
                                }
                              }}
                              className="text-[11px] font-bold font-mono px-2 py-1 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-950 border border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-400 cursor-pointer shadow-sm transition-all"
                              title="Click to change Category Bracket at any time"
                            >
                              <option value="2-3">2-3 Players</option>
                              <option value="4-6">4-6 Players</option>
                              <option value="7+">7+ Players</option>
                            </select>
                          </div>
                        ) : (
                          <div className="text-[10px] font-bold text-cyan-900 bg-cyan-100 px-2 py-0.5 rounded border border-cyan-300 mt-1 inline-block">
                            Flat Rate Arena
                          </div>
                        )}
                      </td>

                      {/* Offer & Reference */}
                      <td className="px-5 py-4 font-mono">
                        <div className="space-y-1.5">
                          {b.offerId && b.offerId !== 'none' ? (
                            <>
                              <span className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-black text-amber-900 bg-amber-100 px-3 py-1 rounded-xl border border-amber-300 shadow-sm">
                                <Tag className="w-3.5 h-3.5 text-amber-700" />
                                {b.offerName}
                              </span>
                              {b.referencePerson && (
                                <div className="text-xs sm:text-sm font-black text-emerald-800 flex items-center gap-1.5 bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-200">
                                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                                  Ref: {b.referencePerson}
                                </div>
                              )}
                            </>
                          ) : (
                            <span className="text-slate-700 text-xs sm:text-sm font-extrabold bg-slate-100 px-2.5 py-1 rounded-xl border border-slate-200 inline-block">
                              Standard Rate
                            </span>
                          )}

                          {Boolean(b.customNote || (b.offerId !== 'custom_discount' && b.customDiscountReason)) && (
                            <div className="text-xs font-semibold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-300 flex items-start gap-1 break-words">
                              <span className="font-bold text-amber-800 shrink-0">Note:</span>
                              <span>{b.customNote || b.customDiscountReason}</span>
                            </div>
                          )}

                          {b.referencePerson === 'Khaja Sir' && (
                            <div className="inline-flex items-center gap-1.5 text-xs font-black text-amber-950 bg-amber-100 px-3 py-1.5 rounded-xl border border-amber-300 shadow-sm">
                              <Camera className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                              <span>Attach Khaja Sir approval screenshot in closing</span>
                            </div>
                          )}

                          {hasSpecialOnlineOrPrepaidPayment && (
                            <div className="inline-flex items-center gap-1.5 text-xs font-black text-purple-950 bg-purple-100 px-3 py-1.5 rounded-xl border border-purple-300 shadow-sm">
                              <Camera className="w-3.5 h-3.5 text-purple-700 shrink-0" />
                              <span>Attach booking / payment screenshots in closing</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Total Paid / Status */}
                      {/* Total Paid / Status */}
                      <td className="px-5 py-4 font-mono">
                        {isPending ? (
                          <div className="space-y-1.5">
                            <div>
                              <div className="font-black text-amber-950 text-base sm:text-lg tracking-tight">
                                ₹{(Number(b.totalAmount) || Number(b.baseTotal) || 0).toLocaleString()}
                              </div>
                              <span className="inline-block text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 mt-0.5">
                                Awaiting Payment
                              </span>
                            </div>
                            <button
                              onClick={() => onEditBooking(b)}
                              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black bg-amber-300 hover:bg-amber-400 text-amber-950 border border-amber-500 transition-all cursor-pointer shadow-sm"
                              title="Click to enter payment and confirm game"
                            >
                              <Clock3 className="w-3.5 h-3.5 text-amber-900" />
                              PAYMENT PENDING
                            </button>
                          </div>
                        ) : (
                          <div>
                            <div className="font-black text-slate-950 text-base sm:text-lg tracking-tight">
                              ₹{(Number(b.totalAmount) || 0).toLocaleString()}
                            </div>
                            <span className="inline-block text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 mt-0.5">
                              ✓ Paid & Confirmed
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Split Breakdown */}
                      <td className="px-5 py-4">
                        {isPending && (!b.payments || Object.values(b.payments).reduce((a, c) => a + (Number(c) || 0), 0) === 0) ? (
                          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold font-mono">
                            <Clock3 className="w-3.5 h-3.5 text-amber-700" />
                            <span>Payment not yet recorded</span>
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-x-4 gap-y-1.5 max-w-md font-mono">
                            {Object.entries(b.payments || {}).map(([method, amt]) => {
                              if (!amt || Number(amt) <= 0) return null;
                              const label = (method === 'UPI-New Pay' || method === 'UPI/New Pay') ? 'UPI' 
                                : (method === 'Razorpay (Website Bookings)' || method === 'Razorpay( website bookings)') ? 'Razorpay' 
                                : (method === 'Activity Kids' || method === 'Activity kids') ? 'Activity Kids' 
                                : method;
                              return (
                                <div 
                                  key={method} 
                                  className="inline-flex items-center gap-1.5 text-base sm:text-lg font-black"
                                >
                                  <span className="text-slate-950 font-black uppercase tracking-tight">{label}:</span>
                                  <span className="text-emerald-700 font-black font-mono">₹{Number(amt).toLocaleString()}</span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => onEditBooking(b)}
                            className="p-2 rounded-xl bg-white text-amber-700 hover:text-amber-800 hover:bg-amber-50 border border-slate-200 shadow-sm transition-all"
                            title="Edit Game Entry"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onSelectBooking(b)}
                            className="p-2 rounded-xl bg-white text-cyan-700 hover:text-cyan-800 hover:bg-cyan-50 border border-slate-200 shadow-sm transition-all"
                            title="View Receipt"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onDeleteBooking(b.id)}
                            className="p-2 rounded-xl bg-white text-red-600 hover:text-red-700 hover:bg-red-50 border border-slate-200 shadow-sm transition-all"
                            title="Delete Game Entry"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <div className="bg-white border border-red-200 rounded-3xl max-w-md w-full p-6 shadow-2xl text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 border border-red-200 flex items-center justify-center mx-auto shadow-sm">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-extrabold text-slate-900">Reset All Sales Data?</h3>
            <p className="text-xs text-slate-600 font-medium">
              This action will clear all current game entries from the system so you can start fresh.
            </p>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReset}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 shadow-md shadow-red-500/20"
              >
                Reset Everything
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
