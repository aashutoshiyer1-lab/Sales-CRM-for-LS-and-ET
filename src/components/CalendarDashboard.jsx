import React, { useState, useMemo, useRef } from 'react';
import { VENUES, VENUE_DETAILS, getOperatingHours } from '../config/venueData';
import { getGameCategoryLabel } from '../utils/pricingEngine';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Clock, 
  Users, 
  Tag, 
  Trash2, 
  Edit3, 
  CheckCircle2, 
  Clock3,
  Filter,
  Layers,
  ShieldCheck,
  Navigation
} from 'lucide-react';

export const CalendarDashboard = ({ 
  activeVenue, 
  bookings = [], 
  onSelectSlot, 
  onSelectBooking, 
  onEditBooking, 
  onDeleteBooking 
}) => {
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [gameFilter, setGameFilter] = useState('ALL');

  const currentVenueDetails = VENUE_DETAILS[activeVenue];
  const isEscapeTime = activeVenue === VENUES.ESCAPE_TIME;

  const operatingHours = useMemo(() => {
    return getOperatingHours(selectedDate);
  }, [selectedDate]);

  const weekend = operatingHours.isWeekend;

  const handlePrevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const handleToday = () => {
    setSelectedDate(new Date().toISOString().split('T')[0]);
  };

  // Generate 15-minute slot intervals using startMinutes & endMinutes
  const timeSlots = useMemo(() => {
    const slots = [];
    let currMinutes = operatingHours.startMinutes;
    const endMinutes = operatingHours.endMinutes;

    while (currMinutes <= endMinutes) {
      const h = Math.floor(currMinutes / 60);
      const m = currMinutes % 60;
      
      const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      
      const period = h >= 12 ? 'PM' : 'AM';
      let h12 = h % 12;
      if (h12 === 0) h12 = 12;
      const displayLabel = `${h12}:${String(m).padStart(2, '0')} ${period}`;

      slots.push({
        timeStr,
        displayLabel,
        minutes: currMinutes
      });

      currMinutes += 15;
    }
    return slots;
  }, [operatingHours]);

  const activeBookings = useMemo(() => {
    return bookings.filter(b => {
      const matchVenue = b.venue === activeVenue;
      const matchDate = b.date === selectedDate;
      const matchGame = gameFilter === 'ALL' || b.gameName === gameFilter;
      return matchVenue && matchDate && matchGame;
    });
  }, [bookings, activeVenue, selectedDate, gameFilter]);

  const slotBookingsMap = useMemo(() => {
    const map = {};
    activeBookings.forEach(b => {
      if (!map[b.timeSlot]) {
        map[b.timeSlot] = [];
      }
      map[b.timeSlot].push(b);
    });
    return map;
  }, [activeBookings]);

  // List all pending games across venue & system for quick dropdown navigation
  const allPendingBookings = useMemo(() => {
    return bookings.filter(b => b.status === 'Pending');
  }, [bookings]);

  // Handle navigating directly to a pending booking from dropdown
  const handleJumpToPending = (bookingId) => {
    if (!bookingId) return;
    const target = bookings.find(b => b.id === bookingId);
    if (!target) return;

    if (target.date) {
      setSelectedDate(target.date);
    }
    
    // Smooth scroll to slot row or trigger edit modal
    setTimeout(() => {
      const slotElement = document.getElementById(`slot-row-${target.timeSlot}`);
      if (slotElement) {
        slotElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      onEditBooking(target);
    }, 100);
  };

  // Exclude Pending Games from Day Revenue, Total Players, and Total Games metrics
  const confirmedDayBookings = useMemo(() => {
    return activeBookings.filter(b => b.status !== 'Pending');
  }, [activeBookings]);

  const dayRevenue = confirmedDayBookings.reduce((sum, b) => sum + (Number(b.totalAmount) || 0), 0);
  const dayPlayers = confirmedDayBookings.reduce((sum, b) => sum + (Number(b.paxCount) || 0), 0);
  // Exclude Complimentary Games & Pending Games from Total Games metric count
  const totalGamesCount = confirmedDayBookings.filter(b => b.offerId !== 'complimentary').length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* Header Banner */}
      <div className={`rounded-3xl p-6 border shadow-xl relative overflow-hidden transition-all ${
        isEscapeTime
          ? 'bg-gradient-to-r from-red-50 via-white to-amber-50 border-red-200'
          : 'bg-gradient-to-r from-cyan-50 via-white to-emerald-50 border-cyan-200'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className={`px-3.5 py-1 rounded-full text-xs font-black font-mono tracking-wider border shadow-sm ${
                isEscapeTime
                  ? 'bg-red-600 text-white border-red-700'
                  : 'bg-cyan-600 text-white border-cyan-700'
              }`}>
                {activeVenue}
              </span>
              <span className={`text-xs px-3 py-1 rounded-lg font-mono font-bold ${
                weekend ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-slate-100 text-slate-700 border border-slate-200'
              }`}>
                {operatingHours.label}
              </span>
            </div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Daily Games Schedule
            </h1>
            <p className="text-xs text-slate-600 mt-1 font-medium">
              15-minute slot schedule with horizontal concurrent block stacking (clubbing)
            </p>
          </div>

          <div className="flex items-center gap-4 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="px-3 py-1">
              <div className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider">Day Revenue</div>
              <div className="text-xl font-black text-emerald-600 font-mono">₹{dayRevenue.toLocaleString()}</div>
            </div>
            <div className="w-px h-8 bg-slate-200" />
            <div className="px-3 py-1">
              <div className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider">Total Players</div>
              <div className="text-xl font-black text-cyan-600 font-mono">{dayPlayers}</div>
            </div>
            <div className="w-px h-8 bg-slate-200" />
            <div className="px-3 py-1">
              <div className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider">Total Games</div>
              <div className="text-xl font-black text-amber-600 font-mono">{totalGamesCount}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Date, Game Filters & Pending Navigation Control Bar */}
      <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
        
        {/* Date Selector */}
        <div className="flex items-center gap-2 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm w-full lg:w-auto">
          <button
            onClick={handlePrevDay}
            className="p-2.5 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all"
            title="Previous Day"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-2 px-3.5 py-1.5 bg-slate-50 rounded-xl border border-slate-300 hover:border-cyan-500 transition-all cursor-pointer">
            <CalendarIcon className="w-4 h-4 text-cyan-600" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-xs font-mono font-bold text-slate-900 focus:outline-none cursor-pointer"
            />
          </div>

          <button
            onClick={handleToday}
            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:text-slate-900 hover:bg-slate-200 transition-all"
          >
            Today
          </button>

          <button
            onClick={handleNextDay}
            className="p-2.5 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all"
            title="Next Day"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Pending Games Quick Jump Dropdown */}
        {allPendingBookings.length > 0 && (
          <div className="flex items-center gap-2 bg-amber-50 p-2 rounded-2xl border border-amber-300 shadow-sm w-full lg:w-auto">
            <Clock3 className="w-4 h-4 text-amber-700 ml-1 shrink-0" />
            <select
              onChange={(e) => handleJumpToPending(e.target.value)}
              className="bg-white border border-amber-300 text-xs font-bold text-amber-900 rounded-xl px-3 py-1.5 focus:outline-none cursor-pointer w-full"
              defaultValue=""
            >
              <option value="" disabled>
                -- Navigate to Pending Entry ({allPendingBookings.length}) --
              </option>
              {allPendingBookings.map((pb) => (
                <option key={pb.id} value={pb.id}>
                  {pb.customerName} - {pb.gameName} ({pb.date} @ {pb.timeSlot})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Game Filters */}
        <div className="flex items-center gap-2 overflow-x-auto w-full lg:w-auto pb-1 sm:pb-0">
          <span className="text-xs text-slate-500 flex items-center gap-1 font-mono font-bold">
            <Filter className="w-3.5 h-3.5" /> Filter:
          </span>
          <button
            onClick={() => setGameFilter('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              gameFilter === 'ALL'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 bg-white border border-slate-200'
            }`}
          >
            All Games
          </button>
          {currentVenueDetails.games.map((g) => (
            <button
              key={g.id}
              onClick={() => setGameFilter(g.name)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                gameFilter === g.name
                  ? isEscapeTime
                    ? 'bg-red-600 text-white shadow-sm'
                    : 'bg-cyan-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 bg-white border border-slate-200'
              }`}
            >
              {g.name}
            </button>
          ))}
        </div>
      </div>

      {/* 15-Minute Slot Timeline Grid */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
        
        <div className="grid grid-cols-12 px-6 py-4 bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase tracking-wider">
          <div className="col-span-3 sm:col-span-2 flex items-center gap-2">
            <Clock className="w-4 h-4 text-cyan-600" />
            <span>Time Slot</span>
          </div>
          <div className="col-span-9 sm:col-span-10 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-600" />
              <span>Concurrent Games Stack (15-min Clubbing)</span>
            </span>
            <span className="text-[11px] text-slate-500 normal-case font-mono font-semibold">
              Click slot row to add game
            </span>
          </div>
        </div>

        <div className="divide-y divide-slate-100 max-h-[700px] overflow-y-auto">
          {timeSlots.map((slot) => {
            const slotBookings = slotBookingsMap[slot.timeStr] || [];
            const isTopHour = slot.timeStr.endsWith(':00');

            return (
              <div
                key={slot.timeStr}
                id={`slot-row-${slot.timeStr}`}
                className={`grid grid-cols-12 px-6 py-4 items-center hover:bg-slate-50/80 transition-colors group ${
                  isTopHour ? 'bg-slate-50/50 font-semibold' : ''
                }`}
              >
                <div className="col-span-3 sm:col-span-2 flex items-center gap-2">
                  <span className={`font-mono text-xs ${
                    isTopHour ? 'text-cyan-700 font-black text-sm' : 'text-slate-700 font-bold'
                  }`}>
                    {slot.displayLabel}
                  </span>
                  {slotBookings.length > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-extrabold bg-cyan-100 text-cyan-800 border border-cyan-300">
                      {slotBookings.length}
                    </span>
                  )}
                </div>

                <div className="col-span-9 sm:col-span-10 flex items-center gap-4 overflow-x-auto py-1.5">
                  
                  {slotBookings.length === 0 ? (
                    <button
                      onClick={() => onSelectSlot(selectedDate, slot.timeStr)}
                      className="opacity-0 group-hover:opacity-100 flex items-center gap-1.5 text-xs font-bold text-cyan-700 hover:text-cyan-800 py-2 px-4 rounded-xl bg-cyan-50 border border-cyan-200 transition-all shadow-sm"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Book {slot.displayLabel}</span>
                    </button>
                  ) : (
                    <>
                      {slotBookings.map((b) => {
                        const isEscape = b.venue === VENUES.ESCAPE_TIME;
                        const isPending = b.status === 'Pending';

                        return (
                          <div
                            key={b.id}
                            className={`flex-1 min-w-[280px] max-w-[380px] p-4 rounded-2xl border-2 transition-all shadow-md relative ${
                              isPending
                                ? 'bg-amber-50 border-amber-400 text-slate-900 shadow-amber-100'
                                : isEscape
                                  ? 'bg-red-50/60 border-red-300 text-slate-900 shadow-red-50'
                                  : 'bg-cyan-50/60 border-cyan-300 text-slate-900 shadow-cyan-50'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className={`text-xs font-black uppercase px-2.5 py-0.5 rounded-full font-mono ${
                                isEscape ? 'bg-red-100 text-red-800 border border-red-200' : 'bg-cyan-100 text-cyan-800 border border-cyan-200'
                              }`}>
                                {b.gameName} ({getGameCategoryLabel(b)})
                              </span>

                              {isPending ? (
                                <button
                                  onClick={(e) => { e.stopPropagation(); onEditBooking(b); }}
                                  className="inline-flex items-center gap-1 text-[10px] font-black text-amber-900 bg-amber-200 px-2 py-0.5 rounded-md border border-amber-400 hover:bg-amber-300 cursor-pointer shadow-sm"
                                  title="Click to complete payment"
                                >
                                  <Clock3 className="w-3 h-3 text-amber-700" />
                                  PAYMENT PENDING
                                </button>
                              ) : (
                                <span className="text-sm font-mono font-black text-emerald-700">
                                  ₹{Number(b.totalAmount).toLocaleString()}
                                </span>
                              )}
                            </div>

                            <div className="text-sm font-extrabold text-slate-900 truncate">
                              {b.customerName}
                            </div>
                            <div className="text-xs text-slate-600 font-mono font-medium">
                              {b.phone}
                            </div>

                            {b.offerId && b.offerId !== 'none' && (
                              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                                <div className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded border border-amber-300">
                                  <Tag className="w-2.5 h-2.5" />
                                  {b.offerName}
                                </div>
                                {b.referencePerson && (
                                  <div className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300">
                                    <ShieldCheck className="w-2.5 h-2.5 text-emerald-600" />
                                    Ref: {b.referencePerson}
                                  </div>
                                )}
                              </div>
                            )}

                            <div className="flex items-center justify-between text-xs text-slate-700 mt-3 pt-2.5 border-t border-slate-200">
                              <span className="flex items-center gap-1 font-mono font-bold">
                                <Users className="w-3.5 h-3.5 text-cyan-600" />
                                {b.paxCount} Players
                              </span>

                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={(e) => { e.stopPropagation(); onEditBooking(b); }}
                                  className="p-1.5 rounded-lg bg-white text-amber-700 hover:text-amber-800 hover:bg-amber-50 border border-slate-200 shadow-sm"
                                  title="Edit Game Entry"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); onSelectBooking(b); }}
                                  className="p-1.5 rounded-lg bg-white text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 border border-slate-200 shadow-sm"
                                  title="View Receipt"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); onDeleteBooking(b.id); }}
                                  className="p-1.5 rounded-lg bg-white text-red-600 hover:text-red-700 hover:bg-red-50 border border-slate-200 shadow-sm"
                                  title="Delete Game Entry"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}

                      <button
                        onClick={() => onSelectSlot(selectedDate, slot.timeStr)}
                        className="p-3.5 rounded-2xl bg-white border border-slate-300 text-slate-700 hover:text-cyan-600 hover:border-cyan-500 transition-all shrink-0 shadow-sm"
                        title="Add concurrent game entry to this slot"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </>
                  )}

                </div>
              </div>
            );
          })}
        </div>

      </div>

    </div>
  );
};
