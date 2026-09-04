import React, { useState, useMemo } from 'react';
import { VENUES, VENUE_DETAILS, getOperatingHours, isWeekend } from '../config/venueData';
import { getGameCategoryLabel } from '../utils/pricingEngine';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  Clock, 
  Users, 
  Plus, 
  Layers,
  Filter,
  CheckCircle2,
  Lock,
  Gamepad2,
  Tag,
  Edit3,
  Trash2,
  ShieldCheck,
  Clock3
} from 'lucide-react';

export const CalendarDashboard = ({ 
  activeVenue, 
  bookings, 
  onSelectSlot, 
  onSelectBooking,
  onEditBooking,
  onDeleteBooking
}) => {
  const [selectedDate, setSelectedDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [gameFilter, setGameFilter] = useState('ALL');

  const isEscapeTime = activeVenue === VENUES.ESCAPE_TIME;
  const currentVenueDetails = VENUE_DETAILS[activeVenue];
  const weekend = isWeekend(selectedDate);
  const operatingHours = getOperatingHours(selectedDate);

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

  const timeSlots = useMemo(() => {
    const slots = [];
    const [startH, startM] = operatingHours.start.split(':').map(Number);
    const [endH, endM] = operatingHours.end.split(':').map(Number);

    let currMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    while (currMinutes <= endMinutes) {
      const h = Math.floor(currMinutes / 60);
      const m = currMinutes % 60;
      const hh = h.toString().padStart(2, '0');
      const mm = m.toString().padStart(2, '0');
      const timeStr = `${hh}:${mm}`;
      
      const period = h >= 12 ? 'PM' : 'AM';
      const displayH = h % 12 === 0 ? 12 : h % 12;
      const displayLabel = `${displayH}:${mm.padStart(2, '0')} ${period}`;

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

  const dayRevenue = activeBookings
    .filter(b => b.status !== 'Pending')
    .reduce((sum, b) => sum + (Number(b.totalAmount) || 0), 0);
  const dayPlayers = activeBookings.reduce((sum, b) => sum + (Number(b.paxCount) || 0), 0);
  // Exclude Complimentary Games from Total Games metric count
  const totalGamesCount = activeBookings.filter(b => b.offerId !== 'complimentary').length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* Header Banner */}
      <div className={`rounded-3xl p-6 border backdrop-blur-xl shadow-2xl relative overflow-hidden transition-all ${
        isEscapeTime
          ? 'bg-gradient-to-r from-red-950 via-slate-900 to-amber-950/60 border-amber-500/60'
          : 'bg-gradient-to-r from-cyan-950 via-slate-900 to-emerald-950/60 border-cyan-500/60'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className={`px-3.5 py-1 rounded-full text-xs font-black font-mono tracking-wider border shadow-md ${
                isEscapeTime
                  ? 'bg-red-950 text-amber-300 border-amber-500/60'
                  : 'bg-cyan-950 text-cyan-300 border-cyan-500/60'
              }`}>
                {activeVenue}
              </span>
              <span className={`text-xs px-3 py-1 rounded-lg font-mono font-bold ${
                weekend ? 'bg-amber-500/20 text-amber-300 border border-amber-400/50' : 'bg-slate-800 text-slate-200 border border-slate-700'
              }`}>
                {operatingHours.label}
              </span>
            </div>
            <h1 className="text-3xl font-black text-white tracking-tight">
              Daily Games Schedule
            </h1>
            <p className="text-xs text-slate-300 mt-1 font-medium">
              15-minute slot schedule with horizontal concurrent block stacking (clubbing)
            </p>
          </div>

          <div className="flex items-center gap-4 bg-slate-950/90 p-3.5 rounded-2xl border border-slate-700">
            <div className="px-3 py-1">
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Day Revenue</div>
              <div className="text-xl font-black text-emerald-400 font-mono">₹{dayRevenue.toLocaleString()}</div>
            </div>
            <div className="w-px h-8 bg-slate-800" />
            <div className="px-3 py-1">
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Players</div>
              <div className="text-xl font-black text-cyan-400 font-mono">{dayPlayers}</div>
            </div>
            <div className="w-px h-8 bg-slate-800" />
            <div className="px-3 py-1">
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Games</div>
              <div className="text-xl font-black text-amber-400 font-mono">{totalGamesCount}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Date & Game Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 bg-slate-900 p-2 rounded-2xl border border-slate-700 shadow-md">
          <button
            onClick={handlePrevDay}
            className="p-2.5 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-all"
            title="Previous Day"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-2 px-3.5 py-1.5 bg-slate-950 rounded-xl border border-slate-700 hover:border-cyan-400 transition-all cursor-pointer">
            <CalendarIcon className="w-4 h-4 text-cyan-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-xs font-mono font-bold text-white focus:outline-none cursor-pointer"
            />
          </div>

          <button
            onClick={handleToday}
            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-800 text-slate-200 hover:text-white hover:bg-slate-700 transition-all"
          >
            Today
          </button>

          <button
            onClick={handleNextDay}
            className="p-2.5 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-all"
            title="Next Day"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          <span className="text-xs text-slate-400 flex items-center gap-1 font-mono font-bold">
            <Filter className="w-3.5 h-3.5" /> Filter:
          </span>
          <button
            onClick={() => setGameFilter('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              gameFilter === 'ALL'
                ? 'bg-slate-800 text-white border border-slate-600 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 bg-slate-900/60'
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
                    ? 'bg-red-950 text-amber-300 border border-amber-500/60 shadow-sm'
                    : 'bg-cyan-950 text-cyan-300 border border-cyan-500/60 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 bg-slate-900/60'
              }`}
            >
              {g.name}
            </button>
          ))}
        </div>
      </div>

      {/* 15-Minute Slot Timeline Grid */}
      <div className="bg-slate-900/90 rounded-3xl border border-slate-700 shadow-2xl overflow-hidden">
        
        <div className="grid grid-cols-12 px-6 py-4 bg-slate-950 border-b border-slate-800 text-xs font-bold text-slate-300 uppercase tracking-wider">
          <div className="col-span-3 sm:col-span-2 flex items-center gap-2">
            <Clock className="w-4 h-4 text-cyan-400" />
            <span>Time Slot</span>
          </div>
          <div className="col-span-9 sm:col-span-10 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-400" />
              <span>Concurrent Games Stack (15-min Clubbing)</span>
            </span>
            <span className="text-[11px] text-slate-400 normal-case font-mono">
              Click slot row to add game
            </span>
          </div>
        </div>

        <div className="divide-y divide-slate-800/80 max-h-[700px] overflow-y-auto">
          {timeSlots.map((slot) => {
            const slotBookings = slotBookingsMap[slot.timeStr] || [];
            const isTopHour = slot.timeStr.endsWith(':00');

            return (
              <div
                key={slot.timeStr}
                className={`grid grid-cols-12 px-6 py-4 items-center hover:bg-slate-800/50 transition-colors group ${
                  isTopHour ? 'bg-slate-950/40 font-semibold' : ''
                }`}
              >
                <div className="col-span-3 sm:col-span-2 flex items-center gap-2">
                  <span className={`font-mono text-xs ${
                    isTopHour ? 'text-cyan-400 font-black text-sm' : 'text-slate-300 font-bold'
                  }`}>
                    {slot.displayLabel}
                  </span>
                  {slotBookings.length > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-extrabold bg-cyan-950 text-cyan-300 border border-cyan-500/40">
                      {slotBookings.length}
                    </span>
                  )}
                </div>

                <div className="col-span-9 sm:col-span-10 flex items-center gap-4 overflow-x-auto py-1.5">
                  
                  {slotBookings.length === 0 ? (
                    <button
                      onClick={() => onSelectSlot(selectedDate, slot.timeStr)}
                      className="opacity-0 group-hover:opacity-100 flex items-center gap-1.5 text-xs font-bold text-cyan-400 hover:text-cyan-300 py-2 px-4 rounded-xl bg-cyan-950/60 border border-cyan-800/60 transition-all"
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
                            className={`flex-1 min-w-[280px] max-w-[380px] p-4 rounded-2xl border-2 transition-all shadow-xl relative ${
                              isPending
                                ? 'bg-amber-950/80 border-amber-400 text-slate-100 shadow-amber-950/50'
                                : isEscape
                                  ? 'bg-red-950 border-amber-500/70 text-slate-100 shadow-red-950/50'
                                  : 'bg-cyan-950 border-cyan-500/70 text-slate-100 shadow-cyan-950/50'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className={`text-xs font-black uppercase px-2.5 py-0.5 rounded-full font-mono ${
                                isEscape ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                              }`}>
                                {b.gameName} ({getGameCategoryLabel(b)})
                              </span>

                              {isPending ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-black text-amber-300 bg-amber-900/90 px-2 py-0.5 rounded-md border border-amber-400">
                                  <Clock3 className="w-3 h-3 text-amber-300" />
                                  PAYMENT PENDING
                                </span>
                              ) : (
                                <span className="text-sm font-mono font-black text-emerald-400">
                                  ₹{Number(b.totalAmount).toLocaleString()}
                                </span>
                              )}
                            </div>

                            <div className="text-sm font-black text-white truncate">
                              {b.customerName}
                            </div>
                            <div className="text-xs text-slate-300 font-mono">
                              {b.phone}
                            </div>

                            {b.offerId && b.offerId !== 'none' && (
                              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                                <div className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-amber-300 bg-amber-950 px-2 py-0.5 rounded border border-amber-700">
                                  <Tag className="w-2.5 h-2.5" />
                                  {b.offerName}
                                </div>
                                {b.referencePerson && (
                                  <div className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-emerald-300 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-700">
                                    <ShieldCheck className="w-2.5 h-2.5 text-emerald-400" />
                                    Ref: {b.referencePerson}
                                  </div>
                                )}
                              </div>
                            )}

                            <div className="flex items-center justify-between text-xs text-slate-200 mt-3 pt-2.5 border-t border-slate-800">
                              <span className="flex items-center gap-1 font-mono font-bold">
                                <Users className="w-3.5 h-3.5 text-cyan-400" />
                                {b.paxCount} Players
                              </span>

                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={(e) => { e.stopPropagation(); onEditBooking(b); }}
                                  className="p-1.5 rounded-lg bg-slate-900 text-amber-400 hover:text-white hover:bg-slate-800 border border-slate-700"
                                  title="Edit Game Entry"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); onSelectBooking(b); }}
                                  className="p-1.5 rounded-lg bg-slate-900 text-emerald-400 hover:text-white hover:bg-slate-800 border border-slate-700"
                                  title="View Receipt"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); onDeleteBooking(b.id); }}
                                  className="p-1.5 rounded-lg bg-red-950 text-red-400 hover:text-red-300 border border-red-900"
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
                        className="p-3.5 rounded-2xl bg-slate-950 border border-slate-700 text-slate-300 hover:text-cyan-400 hover:border-cyan-500/60 transition-all shrink-0 shadow-md"
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
