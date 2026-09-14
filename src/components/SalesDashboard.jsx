import React, { useState, useMemo, useRef } from 'react';
import { VENUES, PAYMENT_METHODS, OFFERS, REFERENCES } from '../config/venueData';
import { getGameCategoryLabel } from '../utils/pricingEngine';
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
  Check
} from 'lucide-react';

export const SalesDashboard = ({ 
  bookings = [], 
  onSelectBooking, 
  onEditBooking, 
  onDeleteBooking,
  onResetAllBookings 
}) => {
  const [venueToggle, setVenueToggle] = useState('ALL'); // 'ALL' | 'Escape Time' | 'Laser Shooter'
  const [dateRangeMode, setDateRangeMode] = useState('TODAY'); // 'TODAY' | 'YESTERDAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'ALL_TIME' | 'CUSTOM' | 'PENDING_ONLY'
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [copied, setCopied] = useState(false);
  const [highlightedBookingId, setHighlightedBookingId] = useState(null);

  const tableRef = useRef(null);

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
        if (!name.includes(q) && !phone.includes(q) && !game.includes(q) && !ref.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [bookings, venueToggle, dateRangeMode, customStartDate, customEndDate, searchQuery, dateFiltersMemo]);

  // Chronological Sorting: Date ascending (earliest date first), TimeSlot ascending (11:00 AM before 11:15 AM before 11:30 AM...)
  const sortedBookings = useMemo(() => {
    return [...filteredBookings].sort((a, b) => {
      if (a.date !== b.date) {
        return (a.date || '').localeCompare(b.date || '');
      }
      return (a.timeSlot || '').localeCompare(b.timeSlot || '');
    });
  }, [filteredBookings]);

  // Metrics - EXCLUDES Pending games from Total Revenue, Total Players, and Total Games counts!
  const metrics = useMemo(() => {
    const confirmedBookings = filteredBookings.filter(b => b.status !== 'Pending');
    const pendingBookings = filteredBookings.filter(b => b.status === 'Pending');

    const totalRevenue = confirmedBookings.reduce((sum, b) => sum + (Number(b.totalAmount) || 0), 0);
    // Exclude Pending Games from Total Players metric
    const totalPlayers = confirmedBookings.reduce((sum, b) => sum + (Number(b.paxCount) || 0), 0);
    // Exclude Complimentary & Pending Games from Total Games metric count
    const totalGamesCount = confirmedBookings.filter(b => b.offerId !== 'complimentary').length;
    const pendingGamesCount = pendingBookings.length;
    const totalDiscounts = confirmedBookings.reduce((sum, b) => sum + (Number(b.discountAmount) || 0), 0);

    const paymentBreakdown = {
      Cash: 0,
      Card: 0,
      'UPI-New Pay': 0,
      'Prepaid by District': 0,
    };

    confirmedBookings.forEach((b) => {
      if (b.payments) {
        Object.entries(b.payments).forEach(([method, amt]) => {
          const key = method === 'UPI/New Pay' ? 'UPI-New Pay' : method;
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
      pendingGamesCount,
      totalDiscounts,
      paymentBreakdown,
    };
  }, [filteredBookings]);

  // Handle clicking "Pending Games" metric card -> Filters & auto-scrolls to table
  const handlePendingGamesClick = () => {
    setDateRangeMode('PENDING_ONLY');
    if (tableRef.current) {
      tableRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
        `"${getGameCategoryLabel(b)}"`,
        `"${(b.offerName || 'None').replace(/"/g, '""')}"`,
        `"${(b.referencePerson || 'N/A').replace(/"/g, '""')}"`,
        b.baseTotal || b.totalAmount || 0,
        b.discountAmount || 0,
        b.totalAmount || 0,
        b.payments?.Cash || 0,
        b.payments?.Card || 0,
        (b.payments?.['UPI-New Pay'] || b.payments?.['UPI/New Pay'] || 0),
        b.payments?.['Prepaid by District'] || 0,
        `"${b.status || 'Confirmed'}"`
      ];
      csvRows.push(row.join(','));
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvRows.join('\n'));
    const link = document.createElement('a');
    link.setAttribute('href', csvContent);
    const dateStamp = new Date().toISOString().split('T')[0];
    link.setAttribute('download', `Sales_Report_${venueToggle}_${dateStamp}.csv`);
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
    copyText += `Total Revenue: ₹${metrics.totalRevenue.toLocaleString()} | Total Players: ${metrics.totalPlayers} | Total Games: ${metrics.totalGamesCount}\n`;
    copyText += `--------------------------------------------------\n\n`;

    sortedBookings.forEach((b, idx) => {
      const isPending = b.status === 'Pending';
      const statusStr = isPending ? '[PENDING]' : '[CONFIRMED]';
      const paidAmount = isPending ? 'Pending' : `₹${Number(b.totalAmount || 0).toLocaleString()}`;
      const offerStr = (b.offerId && b.offerId !== 'none') ? ` (Offer: ${b.offerName})` : '';
      const refStr = b.referencePerson ? ` [Ref: ${b.referencePerson}]` : '';

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
      copyText += `   🎮 Game: ${b.gameName} (${getGameCategoryLabel(b)})\n`;
      copyText += `   👤 Customer: ${b.customerName} (${b.phone || 'N/A'})\n`;
      copyText += `   👥 Players: ${b.paxCount}${offerStr}${refStr}\n`;
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* Top Header & Actions */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
              Real-time Analytics
            </span>
            <span className="text-xs text-slate-500 font-mono font-bold">
              All Venues Combined
            </span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Sales & Revenue Dashboard
          </h1>
          <p className="text-xs text-slate-600 mt-1 font-medium">
            Financial reporting, payment segregation, discount audits, and Excel export
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleExportToExcel}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold shadow-md transition-all active:scale-95"
            title="Download CSV / Excel File"
          >
            <Download className="w-4 h-4 stroke-[2.5]" />
            <span>Export Excel / CSV Report</span>
          </button>

          <button
            onClick={handleCopyData}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-extrabold shadow-md transition-all active:scale-95 ${
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
            <span>{copied ? 'Copied Sales Data!' : 'Copy Sales Data'}</span>
          </button>

          <button
            onClick={() => setShowResetConfirm(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-bold transition-all"
            title="Clear all transactions from memory"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reset Data</span>
          </button>
        </div>
      </div>

      {/* Filter Control Bar */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xl space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* Venue Selector */}
          <div className="flex items-center p-1.5 rounded-2xl bg-slate-100 border border-slate-200">
            <button
              onClick={() => setVenueToggle('ALL')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                venueToggle === 'ALL'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Both Venues
            </button>
            <button
              onClick={() => setVenueToggle(VENUES.ESCAPE_TIME)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                venueToggle === VENUES.ESCAPE_TIME
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              Escape Time
            </button>
            <button
              onClick={() => setVenueToggle(VENUES.LASER_SHOOTER)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                venueToggle === VENUES.LASER_SHOOTER
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Gamepad2 className="w-3.5 h-3.5" />
              Laser Shooter
            </button>
          </div>

          {/* Quick Date Presets */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
            {[
              { id: 'TODAY', label: 'Today' },
              { id: 'YESTERDAY', label: 'Yesterday' },
              { id: 'THIS_WEEK', label: 'This Week' },
              { id: 'THIS_MONTH', label: 'This Month' },
              { id: 'PENDING_ONLY', label: 'Pending Games' },
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
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="p-6 rounded-3xl bg-white border-2 border-emerald-200 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-emerald-700 uppercase tracking-wider">Total Revenue</span>
            <div className="p-2.5 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 font-mono mt-3">
            ₹{metrics.totalRevenue.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-600 mt-1 flex items-center gap-1 font-mono font-semibold">
            <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600" />
            <span>Confirmed paid collections</span>
          </div>
        </div>

        <div className="p-6 rounded-3xl bg-white border-2 border-cyan-200 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-cyan-700 uppercase tracking-wider">Total Players</span>
            <div className="p-2.5 rounded-2xl bg-cyan-50 text-cyan-600 border border-cyan-200">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 font-mono mt-3">
            {metrics.totalPlayers.toLocaleString()} <span className="text-sm font-bold text-slate-500">Players</span>
          </div>
          <div className="text-[11px] text-slate-600 mt-1 font-mono font-semibold">
            Confirmed player turnout
          </div>
        </div>

        <div className="p-6 rounded-3xl bg-white border-2 border-amber-200 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-amber-700 uppercase tracking-wider">Total Games</span>
            <div className="p-2.5 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200">
              <Receipt className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 font-mono mt-3">
            {metrics.totalGamesCount}
          </div>
          <div className="text-[11px] text-slate-600 mt-1 font-mono font-semibold">
            Confirmed game entries
          </div>
        </div>

        {/* Dedicated Pending Games Metric Card with Click-to-Focus */}
        <div 
          onClick={handlePendingGamesClick}
          className="p-6 rounded-3xl bg-amber-50/70 border-2 border-amber-300 shadow-lg relative overflow-hidden cursor-pointer hover:bg-amber-100/80 transition-all hover:scale-[1.02]"
          title="Click to view and edit pending games"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-amber-800 uppercase tracking-wider">Pending Games</span>
            <div className="p-2.5 rounded-2xl bg-amber-100 text-amber-700 border border-amber-300">
              <Clock3 className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-amber-900 font-mono mt-3">
            {metrics.pendingGamesCount}
          </div>
          <div className="text-[11px] text-amber-800 mt-1 font-mono font-bold flex items-center justify-between">
            <span>Payment to be collected</span>
            <span className="text-[10px] underline">Click to view →</span>
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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
          {PAYMENT_METHODS.map((method) => {
            const amount = metrics.paymentBreakdown[method] || 0;
            const pct = metrics.totalRevenue > 0 ? Math.round((amount / metrics.totalRevenue) * 100) : 0;
            
            return (
              <div key={method} className="p-4 sm:p-5 rounded-2xl bg-white border-2 border-slate-300 shadow-md space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-black text-slate-950 text-base sm:text-lg uppercase font-mono tracking-wide">{method}</span>
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
            <h2 className="text-lg font-extrabold text-slate-900">
              Detailed Sales Transactions ({filteredBookings.length})
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Showing records for {dateRangeMode.replace('_', ' ')} • {venueToggle}
            </p>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search name, phone, game, ref..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-white border border-slate-300 text-xs font-medium text-slate-900 placeholder-slate-400 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 focus:outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-700 uppercase tracking-wider font-extrabold border-b border-slate-200">
              <tr>
                <th className="px-5 py-4">Date / Slot</th>
                <th className="px-5 py-4">Customer Details</th>
                <th className="px-5 py-4">Venue & Game Name</th>
                <th className="px-5 py-4">Players</th>
                <th className="px-5 py-4">Offer & Reference</th>
                <th className="px-5 py-4">Total Paid / Status</th>
                <th className="px-5 py-4">Split Payment Breakdown</th>
                <th className="px-5 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedBookings.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-12 text-center text-slate-500 font-mono font-medium">
                    No game transactions found for the selected filter.
                  </td>
                </tr>
              ) : (
                sortedBookings.map((b) => {
                  const isEscape = b.venue === VENUES.ESCAPE_TIME;
                  const isPending = b.status === 'Pending';

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
                            ({getGameCategoryLabel(b)})
                          </span>
                        </div>
                      </td>

                      {/* Players Count & Category */}
                      <td className="px-5 py-4 font-mono font-extrabold text-slate-900 text-xs">
                        <div className="font-extrabold text-slate-900 text-sm">{b.paxCount} Players</div>
                        <div className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded border border-amber-300 mt-1 inline-block">
                          {getGameCategoryLabel(b)}
                        </div>
                      </td>

                      {/* Offer & Reference */}
                      <td className="px-5 py-4 font-mono">
                        {b.offerId && b.offerId !== 'none' ? (
                          <div className="space-y-1.5">
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
                          </div>
                        ) : (
                          <span className="text-slate-700 text-xs sm:text-sm font-extrabold bg-slate-100 px-2.5 py-1 rounded-xl border border-slate-200 inline-block">
                            Standard Rate
                          </span>
                        )}
                      </td>

                      {/* Total Paid / Status */}
                      <td className="px-5 py-4 font-mono">
                        {isPending ? (
                          <button
                            onClick={() => onEditBooking(b)}
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black bg-amber-200 text-amber-950 border border-amber-400 hover:bg-amber-300 transition-all cursor-pointer shadow-sm"
                            title="Click to enter payment and confirm game"
                          >
                            <Clock3 className="w-3.5 h-3.5 text-amber-800" />
                            PAYMENT PENDING
                          </button>
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
                        <div className="flex flex-wrap gap-x-4 gap-y-1.5 max-w-md font-mono">
                          {Object.entries(b.payments || {}).map(([method, amt]) => {
                            if (!amt || Number(amt) <= 0) return null;
                            const label = method === 'UPI-New Pay' || method === 'UPI/New Pay' ? 'UPI' : method;
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
