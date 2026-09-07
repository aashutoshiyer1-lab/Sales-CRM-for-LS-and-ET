import React from 'react';
import { VENUES } from '../config/venueData';
import { 
  Calendar, 
  BarChart3, 
  PlusCircle, 
  LogOut, 
  ShieldCheck, 
  Layers,
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
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          
          {/* Logo & Brand */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setCurrentView('venue_select')}>
            <div className={`p-2 rounded-xl border ${
              isEscapeTime 
                ? 'bg-red-50 border-red-200 text-red-600 shadow-sm' 
                : 'bg-cyan-50 border-cyan-200 text-cyan-600 shadow-sm'
            }`}>
              {isEscapeTime ? <Lock className="w-5 h-5" /> : <Gamepad2 className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg tracking-tight text-slate-900">
                  Sales CRM
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full font-mono font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                  LS & ET
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">Entertainment Venue Management</p>
            </div>
          </div>

          {/* Active Venue Switcher (Quick Toggle - Calendar View Only) */}
          {currentView === 'calendar' && (
            <div className="hidden md:flex items-center p-1 rounded-xl bg-slate-100 border border-slate-200">
              <button
                onClick={() => setActiveVenue(VENUES.ESCAPE_TIME)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeVenue === VENUES.ESCAPE_TIME
                    ? 'bg-red-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <Lock className="w-3.5 h-3.5" />
                Escape Time
              </button>
              <button
                onClick={() => setActiveVenue(VENUES.LASER_SHOOTER)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeVenue === VENUES.LASER_SHOOTER
                    ? 'bg-cyan-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <Gamepad2 className="w-3.5 h-3.5" />
                Laser Shooter
              </button>
            </div>
          )}

          {/* Navigation Views & Quick Actions */}
          <div className="flex items-center gap-3">
            
            {/* View Switcher */}
            <div className="flex items-center p-1 rounded-xl bg-slate-100 border border-slate-200">
              <button
                onClick={() => setCurrentView('calendar')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  currentView === 'calendar'
                    ? 'bg-white text-cyan-700 border border-slate-200 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Calendar className="w-4 h-4 text-cyan-600" />
                <span>Calendar</span>
              </button>
              <button
                onClick={() => setCurrentView('sales')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  currentView === 'sales'
                    ? 'bg-white text-emerald-700 border border-slate-200 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <BarChart3 className="w-4 h-4 text-emerald-600" />
                <span>Sales</span>
              </button>
            </div>

            {/* Switch Venue Router Button */}
            <button
              onClick={() => setCurrentView('venue_select')}
              title="Switch Venue Screen"
              className="p-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-200 transition-all text-xs font-semibold flex items-center gap-1.5"
            >
              <Layers className="w-4 h-4 text-amber-600" />
              <span className="hidden sm:inline">Venues</span>
            </button>

            {/* New Booking Action */}
            <button
              onClick={() => onOpenBookingModal()}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-extrabold text-white transition-all shadow-md active:scale-95 ${
                isEscapeTime
                  ? 'bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 shadow-red-500/20'
                  : 'bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 shadow-cyan-500/20'
              }`}
            >
              <PlusCircle className="w-4 h-4 stroke-[2.5]" />
              <span>New Entry</span>
            </button>

            {/* User & Logout */}
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              <div className="hidden lg:flex items-center gap-1.5 text-xs text-slate-600 font-mono font-semibold">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>admin</span>
              </div>
              <button
                onClick={onLogout}
                title="Logout"
                className="p-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-600 hover:text-red-600 hover:bg-red-50 transition-all"
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
