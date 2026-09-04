import React from 'react';
import { VENUES, VENUE_DETAILS } from '../config/venueData';
import { 
  Calendar, 
  BarChart3, 
  PlusCircle, 
  LogOut, 
  ShieldCheck, 
  Layers,
  Sparkles,
  Gamepad2,
  Lock
} from 'lucide-react';

export const Navbar = ({ 
  currentView, 
  setCurrentView, 
  activeVenue, 
  setActiveVenue, 
  onLogout,
  onOpenBookingModal 
}) => {
  const isEscapeTime = activeVenue === VENUES.ESCAPE_TIME;

  return (
    <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800 shadow-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          
          {/* Logo & Brand */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setCurrentView('venue_select')}>
            <div className={`p-2 rounded-xl border ${
              isEscapeTime 
                ? 'bg-red-950/60 border-amber-500/40 text-amber-400 shadow-[0_0_15px_rgba(220,38,38,0.3)]' 
                : 'bg-cyan-950/60 border-cyan-500/40 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)]'
            }`}>
              {isEscapeTime ? <Lock className="w-5 h-5" /> : <Gamepad2 className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-slate-100 via-slate-200 to-slate-400 bg-clip-text text-transparent">
                  Sales CRM
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full font-mono font-medium bg-slate-800 text-slate-300 border border-slate-700">
                  LS & ET
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">Entertainment Venue Management</p>
            </div>
          </div>

          {/* Active Venue Switcher (Quick Toggle) */}
          <div className="hidden md:flex items-center p-1 rounded-xl bg-slate-900 border border-slate-800">
            <button
              onClick={() => setActiveVenue(VENUES.ESCAPE_TIME)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeVenue === VENUES.ESCAPE_TIME
                  ? 'bg-red-900/60 text-amber-300 border border-amber-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              Escape Time
            </button>
            <button
              onClick={() => setActiveVenue(VENUES.LASER_SHOOTER)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeVenue === VENUES.LASER_SHOOTER
                  ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Gamepad2 className="w-3.5 h-3.5" />
              Laser Shooter
            </button>
          </div>

          {/* Navigation Views & Quick Actions */}
          <div className="flex items-center gap-3">
            
            {/* View Switcher */}
            <div className="flex items-center p-1 rounded-xl bg-slate-900 border border-slate-800">
              <button
                onClick={() => setCurrentView('calendar')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  currentView === 'calendar'
                    ? 'bg-slate-800 text-slate-100 border border-slate-700 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Calendar className="w-4 h-4 text-cyan-400" />
                <span>Calendar</span>
              </button>
              <button
                onClick={() => setCurrentView('sales')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  currentView === 'sales'
                    ? 'bg-slate-800 text-slate-100 border border-slate-700 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <BarChart3 className="w-4 h-4 text-emerald-400" />
                <span>Sales</span>
              </button>
            </div>

            {/* Switch Venue Router Button */}
            <button
              onClick={() => setCurrentView('venue_select')}
              title="Switch Venue Screen"
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-all text-xs font-medium flex items-center gap-1.5"
            >
              <Layers className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline">Venues</span>
            </button>

            {/* New Booking Action */}
            <button
              onClick={() => onOpenBookingModal()}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-slate-950 transition-all shadow-md active:scale-95 ${
                isEscapeTime
                  ? 'bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 shadow-amber-500/20'
                  : 'bg-gradient-to-r from-cyan-400 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 shadow-cyan-500/20'
              }`}
            >
              <PlusCircle className="w-4 h-4 stroke-[2.5]" />
              <span>New Entry</span>
            </button>

            {/* User & Logout */}
            <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
              <div className="hidden lg:flex items-center gap-1.5 text-xs text-slate-400 font-mono">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>admin</span>
              </div>
              <button
                onClick={onLogout}
                title="Logout"
                className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-red-400 hover:bg-red-950/30 transition-all"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>

          </div>
        </div>
      </div>
    </header>
  );
};
