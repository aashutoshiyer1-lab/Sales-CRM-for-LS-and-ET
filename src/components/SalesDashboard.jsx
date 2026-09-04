import React, { useState, useMemo } from 'react';
import { VENUES, PAYMENT_METHODS } from '../config/venueData';
import { getGameCategoryLabel } from '../utils/pricingEngine';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Receipt, 
  CreditCard, 
  Search, 
  ArrowUpRight, 
  Lock, 
  Gamepad2, 
  Trash2, 
  Eye,
  Layers,
  Sparkles,
  RotateCcw,
  Edit3,
  Tag,
  AlertTriangle,
  ShieldCheck,
  Clock3,
  Download,
  Filter
} from 'lucide-react';

export const SalesDashboard = ({ 
  bookings, 
  onSelectBooking, 
  onEditBooking,
  onDeleteBooking,
  onResetAllBookings
}) => {
  const [venueToggle, setVenueToggle] = useState('BOTH');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Default date filter mode is now 'TODAY'!
  const [dateRangeMode, setDateRangeMode] = useState('TODAY');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const dateFiltersMemo = useMemo(() => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    const yesterdayObj = new Date(now);
    yesterdayObj.setDate(now.getDate() - 1);
    const yesterday = yesterdayObj.toISOString().split('T')[0];

    const day = now.getDay();
    const diffToMon = now.getDate() - day + (day === 0 ? -6 : 1);
    const startOfWeekObj = new Date(now.setDate(diffToMon));
    const startOfWeek = startOfWeekObj.toISOString().split('T')[0];

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];

    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];

    return {
      today,
      yesterday,
      startOfWeek,
      startOfMonth,
      lastMonthStart,
      lastMonthEnd
    };
  }, []);

  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      // 1. Venue Filter
      if (venueToggle === 'ESCAPE_TIME' && b.venue !== VENUES.ESCAPE_TIME) return false;
      if (venueToggle === 'LASER_SHOOTER' && b.venue !== VENUES.LASER_SHOOTER) return false;

      // 2. Date Range Filter
      const bDate = b.date;
      if (dateRangeMode === 'TODAY' && bDate !== dateFiltersMemo.today) return false;
      if (dateRangeMode === 'YESTERDAY' && bDate !== dateFiltersMemo.yesterday) return false;
      if (dateRangeMode === 'THIS_WEEK' && (bDate < dateFiltersMemo.startOfWeek || bDate > dateFiltersMemo.today)) return false;
      if (dateRangeMode === 'THIS_MONTH' && (bDate < dateFiltersMemo.startOfMonth || bDate > dateFiltersMemo.today)) return false;
      if (dateRangeMode === 'LAST_MONTH' && (bDate < dateFiltersMemo.lastMonthStart || bDate > dateFiltersMemo.lastMonthEnd)) return false;
      if (dateRangeMode === 'CUSTOM') {
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

  // Metrics
  const metrics = useMemo(() => {
    const confirmedBookings = filteredBookings.filter(b => b.status !== 'Pending');
    const pendingBookings = filteredBookings.filter(b => b.status === 'Pending');

    const totalRevenue = confirmedBookings.reduce((sum, b) => sum + (Number(b.totalAmount) || 0), 0);
    const totalPlayers = filteredBookings.reduce((sum, b) => sum + (Number(b.paxCount) || 0), 0);
    // Exclude Complimentary Games (Kids under 6) from Total Games metric count
    const totalGamesCount = filteredBookings.filter(b => b.offerId !== 'complimentary').length;
    const pendingGamesCount = pendingBookings.length;
    const totalDiscounts = filteredBookings.reduce((sum, b) => sum + (Number(b.discountAmount) || 0), 0);

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
      'UPI/New Pay (INR)',
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
    const fileName = `Sales_Report_${venueToggle}_${new Date().toISOString().split('T')[0]}.csv`;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleConfirmReset = async () => {
    await onResetAllBookings();
    setShowResetConfirm(false);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-900/90 p-6 rounded-3xl border border-slate-700 shadow-2xl">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-500/40 text-xs font-mono mb-2 font-bold">
            <Sparkles className="w-3.5 h-3.5" /> Real-time Sales Analytics
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">
            Sales & Revenue Dashboard
          </h1>
          <p className="text-xs text-slate-300 mt-1 font-medium">
            3-way venue toggle, today default view, game names, discount tracking & Excel export
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-3">
          
          <div className="flex items-center p-1.5 rounded-2xl bg-slate-950 border border-slate-800 shadow-inner">
            <button
              onClick={() => setVenueToggle('BOTH')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition-all ${
                venueToggle === 'BOTH'
                  ? 'bg-slate-800 text-white border border-slate-600 shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-4 h-4 text-emerald-400" />
              <span>Both Venues</span>
            </button>
            
            <button
              onClick={() => setVenueToggle('ESCAPE_TIME')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition-all ${
                venueToggle === 'ESCAPE_TIME'
                  ? 'bg-red-950 text-amber-300 border border-amber-500/50 shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Lock className="w-4 h-4 text-amber-400" />
              <span>Escape Time Only</span>
            </button>

            <button
              onClick={() => setVenueToggle('LASER_SHOOTER')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition-all ${
                venueToggle === 'LASER_SHOOTER'
                  ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/50 shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Gamepad2 className="w-4 h-4 text-cyan-400" />
              <span>Laser Shooter Only</span>
            </button>
          </div>

          <button
            onClick={handleExportToExcel}
            className="flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-extrabold text-slate-950 bg-gradient-to-r from-emerald-400 to-cyan-400 hover:from-emerald-300 hover:to-cyan-300 transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
            title="Export Sales Data to Excel CSV"
          >
            <Download className="w-4 h-4" />
            <span>Export to Excel</span>
          </button>

          <button
            onClick={() => setShowResetConfirm(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-2xl text-xs font-extrabold text-red-400 hover:text-red-300 bg-red-950/60 border border-red-800/80 hover:bg-red-900/80 transition-all shadow-md"
            title="Reset All Sales Data"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reset</span>
          </button>

        </div>
      </div>

      {/* Date Range Selector Bar - Defaults to Today */}
      <div className="p-4 rounded-3xl bg-slate-900/90 border border-slate-700 shadow-xl space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
            <Filter className="w-4 h-4 text-cyan-400" />
            <span>Date Filter (Defaulting to Today):</span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-2xl bg-slate-950 border border-slate-800">
            {[
              { id: 'TODAY', label: 'Today' },
              { id: 'YESTERDAY', label: 'Yesterday' },
              { id: 'THIS_WEEK', label: 'This Week' },
              { id: 'THIS_MONTH', label: 'This Month' },
              { id: 'LAST_MONTH', label: 'Last Month' },
              { id: 'ALL', label: 'All Time' },
              { id: 'CUSTOM', label: 'Custom Range' },
            ].map((mode) => (
              <button
                key={mode.id}
                onClick={() => setDateRangeMode(mode.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all ${
                  dateRangeMode === mode.id
                    ? 'bg-slate-800 text-cyan-300 border border-cyan-500/60 shadow-md font-extrabold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {mode.label}
              </button>
            ))}
          </div>
        </div>

        {dateRangeMode === 'CUSTOM' && (
          <div className="pt-2 flex flex-wrap items-center gap-3 border-t border-slate-800/80 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-semibold">From Date:</span>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-xs font-mono font-bold text-white focus:border-cyan-400 focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-semibold">To Date:</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-xs font-mono font-bold text-white focus:border-cyan-400 focus:outline-none"
              />
            </div>
          </div>
        )}
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="p-6 rounded-3xl bg-gradient-to-br from-emerald-950/80 via-slate-900 to-slate-950 border border-emerald-500/50 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Total Revenue</span>
            <div className="p-2.5 rounded-xl bg-emerald-950 text-emerald-400 border border-emerald-500/40">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-white font-mono mt-3">
            ₹{metrics.totalRevenue.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-300 mt-1 flex items-center gap-1 font-mono">
            <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
            <span>Confirmed paid collections</span>
          </div>
        </div>

        <div className="p-6 rounded-3xl bg-gradient-to-br from-cyan-950/80 via-slate-900 to-slate-950 border border-cyan-500/50 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">Total Players</span>
            <div className="p-2.5 rounded-xl bg-cyan-950 text-cyan-400 border border-cyan-500/40">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-white font-mono mt-3">
            {metrics.totalPlayers.toLocaleString()} <span className="text-sm font-normal text-slate-400">Players</span>
          </div>
          <div className="text-[11px] text-slate-300 mt-1 font-mono">
            Cumulative player turnout
          </div>
        </div>

        <div className="p-6 rounded-3xl bg-gradient-to-br from-amber-950/80 via-slate-900 to-slate-950 border border-amber-500/50 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">Total Games</span>
            <div className="p-2.5 rounded-xl bg-amber-950 text-amber-400 border border-amber-500/40">
              <Receipt className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-white font-mono mt-3">
            {metrics.totalGamesCount}
          </div>
          <div className="text-[11px] text-slate-300 mt-1 font-mono">
            Registered game entries
          </div>
        </div>

        <div className="p-6 rounded-3xl bg-gradient-to-br from-purple-950/80 via-slate-900 to-slate-950 border border-purple-500/50 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-purple-400 uppercase tracking-wider">Pending Games</span>
            <div className="p-2.5 rounded-xl bg-purple-950 text-purple-400 border border-purple-500/40">
              <Clock3 className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-white font-mono mt-3">
            {metrics.pendingGamesCount}
          </div>
          <div className="text-[11px] text-slate-300 mt-1 font-mono">
            Payment to be collected
          </div>
        </div>
      </div>

      {/* Payment Segregation */}
      <div className="bg-slate-900/90 rounded-3xl p-6 border border-slate-700 shadow-2xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-950 text-emerald-400 border border-emerald-500/40">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white">Payment Method Collection Breakdown</h3>
              <p className="text-xs text-slate-300">Segregated collection across Cash, Card, UPI/New Pay, and Prepaid</p>
            </div>
          </div>
          <span className="text-xs font-mono font-black text-emerald-400 bg-emerald-950 px-3 py-1.5 rounded-xl border border-emerald-800">
            Total Revenue: ₹{metrics.totalRevenue.toLocaleString()}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
          {PAYMENT_METHODS.map((method) => {
            const amount = metrics.paymentBreakdown[method] || 0;
            const pct = metrics.totalRevenue > 0 ? Math.round((amount / metrics.totalRevenue) * 100) : 0;
            
            return (
              <div key={method} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-200">{method}</span>
                  <span className="font-mono text-emerald-400 font-extrabold">{pct}%</span>
                </div>
                <div className="text-xl font-black text-white font-mono">
                  ₹{amount.toLocaleString()}
                </div>
                <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400 rounded-full transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Transactions Table - Displays exact Game Name prominently */}
      <div className="bg-slate-900/90 rounded-3xl border border-slate-700 shadow-2xl overflow-hidden">
        
        <div className="p-6 bg-slate-950 border-b border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-extrabold text-white">Recent Games Transactions Table</h3>
            <p className="text-xs text-slate-400 font-medium">Clear game names, customer info, player counts & payment statuses</p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Search name, phone, game, ref..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-medium"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-300 uppercase tracking-wider font-bold border-b border-slate-800">
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
            <tbody className="divide-y divide-slate-800/80">
              {filteredBookings.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-12 text-center text-slate-400 font-mono">
                    No game transactions for Today. Select "All Time" or another range to view past records.
                  </td>
                </tr>
              ) : (
                filteredBookings.map((b) => {
                  const isEscape = b.venue === VENUES.ESCAPE_TIME;
                  const isPending = b.status === 'Pending';

                  return (
                    <tr key={b.id} className="hover:bg-slate-800/50 transition-colors">
                      
                      {/* Date & Slot */}
                      <td className="px-5 py-4 font-mono">
                        <div className="font-extrabold text-white">{b.date}</div>
                        <div className="text-[11px] text-cyan-400 font-bold">{b.timeSlot}</div>
                      </td>

                      {/* Customer */}
                      <td className="px-5 py-4">
                        <div className="font-extrabold text-white">{b.customerName}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{b.phone}</div>
                      </td>

                      {/* Venue & Prominent Exact Game Name (e.g. Locked In, Sherlock's Last Case, Battle, etc.) */}
                      <td className="px-5 py-4">
                        <span className={`inline-block text-[10px] font-black uppercase px-2 py-0.5 rounded font-mono mb-1 ${
                          isEscape ? 'bg-red-950 text-amber-300 border border-amber-500/40' : 'bg-cyan-950 text-cyan-300 border border-cyan-500/40'
                        }`}>
                          {b.venue}
                        </span>
                        <div className="text-sm font-black text-amber-300 tracking-wide flex items-center gap-1.5 flex-wrap">
                          <span>{b.gameName}</span>
                          <span className="text-[11px] font-bold text-slate-300 font-mono bg-slate-950 px-2 py-0.5 rounded border border-slate-700">
                            ({getGameCategoryLabel(b)})
                          </span>
                        </div>
                      </td>

                      {/* Players Count & Category */}
                      <td className="px-5 py-4 font-mono font-extrabold text-white text-xs">
                        <div className="font-extrabold text-white text-sm">{b.paxCount} Players</div>
                        <div className="text-[10px] font-black text-amber-300 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-500/50 mt-1 inline-block">
                          {getGameCategoryLabel(b)}
                        </div>
                      </td>

                      {/* Offer & Reference */}
                      <td className="px-5 py-4 font-mono">
                        {b.offerId && b.offerId !== 'none' ? (
                          <div className="space-y-1">
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-300 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-700">
                              <Tag className="w-2.5 h-2.5" />
                              {b.offerName}
                            </span>
                            {b.referencePerson && (
                              <div className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                                Ref: {b.referencePerson}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-500 text-[11px]">Standard Rate</span>
                        )}
                      </td>

                      {/* Total Paid / Status */}
                      <td className="px-5 py-4 font-mono">
                        {isPending ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-black bg-amber-950 text-amber-300 border border-amber-500/60">
                            <Clock3 className="w-3 h-3 text-amber-300" />
                            PAYMENT PENDING
                          </span>
                        ) : (
                          <span className="font-black text-emerald-400 text-sm">
                            ₹{(Number(b.totalAmount) || 0).toLocaleString()}
                          </span>
                        )}
                      </td>

                      {/* Split Breakdown */}
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-1.5 max-w-xs font-mono">
                          {Object.entries(b.payments || {}).map(([method, amt]) => {
                            if (!amt || Number(amt) <= 0) return null;
                            return (
                              <span 
                                key={method} 
                                className="px-2 py-0.5 rounded text-[10px] bg-slate-950 border border-slate-700 text-slate-200 font-medium"
                              >
                                {method.split(' ')[0]}: <strong className="text-emerald-400 font-bold">₹{amt}</strong>
                              </span>
                            );
                          })}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => onEditBooking(b)}
                            className="p-2 rounded-lg bg-slate-800 text-amber-400 hover:text-white hover:bg-slate-700 transition-all"
                            title="Edit Game Entry"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onSelectBooking(b)}
                            className="p-2 rounded-lg bg-slate-800 text-cyan-300 hover:text-white hover:bg-slate-700 transition-all"
                            title="View Receipt"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onDeleteBooking(b.id)}
                            className="p-2 rounded-lg bg-red-950/60 text-red-400 hover:bg-red-900 transition-all"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
          <div className="bg-slate-900 border border-red-800/80 rounded-3xl max-w-md w-full p-6 shadow-2xl text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-red-950 text-red-400 border border-red-800 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-extrabold text-white">Reset All Sales Data?</h3>
            <p className="text-xs text-slate-300">
              This action will clear all current game entries from the system so you can start fresh.
            </p>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-300 bg-slate-800 hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReset}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-500 shadow-lg shadow-red-600/30"
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
