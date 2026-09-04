import React from 'react';
import { VENUES, VENUE_DETAILS } from '../config/venueData';
import { Lock, Gamepad2, ArrowRight, Clock, Users, Zap, ShieldAlert, Target } from 'lucide-react';

export const VenueSelectionView = ({ onSelectVenue }) => {
  const escapeVenue = VENUE_DETAILS[VENUES.ESCAPE_TIME];
  const laserVenue = VENUE_DETAILS[VENUES.LASER_SHOOTER];

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden">
      
      {/* Background radial glow lights */}
      <div className="absolute top-1/3 left-10 w-[500px] h-[500px] bg-red-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/3 right-10 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-5xl w-full relative z-10">
        
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-block px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs font-mono text-cyan-400 mb-3 uppercase tracking-widest">
            Venue Selector
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight">
            Choose Active CRM Venue
          </h1>
          <p className="text-base text-slate-400 mt-3 max-w-xl mx-auto">
            Select a venue to access its dedicated 15-minute slot calendar dashboard, auto-pricing matrix, and real-time sales metrics.
          </p>
        </div>

        {/* Dual Cards Container */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Card 1: Escape Time */}
          <div
            onClick={() => onSelectVenue(VENUES.ESCAPE_TIME)}
            className="group relative rounded-3xl p-8 bg-gradient-to-b from-red-950/40 via-slate-900 to-slate-950 border border-red-900/40 hover:border-amber-500/60 shadow-2xl transition-all duration-300 cursor-pointer hover:-translate-y-1.5 hover:shadow-[0_0_40px_rgba(220,38,38,0.25)] flex flex-col justify-between"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-bl-full pointer-events-none transition-all group-hover:bg-amber-500/20" />
            
            <div>
              {/* Badge & Icon */}
              <div className="flex items-center justify-between mb-6">
                <div className="p-3.5 rounded-2xl bg-red-950/80 text-amber-400 border border-amber-500/40 shadow-lg">
                  <Lock className="w-8 h-8" />
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-950/80 text-amber-300 border border-amber-500/30 font-mono">
                  Crimson & Gold Theme
                </span>
              </div>

              {/* Title & Tagline */}
              <h2 className="text-2xl font-black text-white group-hover:text-amber-300 transition-colors">
                {escapeVenue.name}
              </h2>
              <p className="text-sm text-slate-400 mt-2 line-clamp-2">
                {escapeVenue.tagline}
              </p>

              {/* Included Games List Preview */}
              <div className="mt-6 space-y-2">
                <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Featured Rooms & Quests
                </div>
                {escapeVenue.games.map((g) => (
                  <div key={g.id} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/80 border border-slate-800/80 text-xs">
                    <span className="font-semibold text-slate-200">{g.name}</span>
                    <span className="text-amber-400 font-mono flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {g.duration} mins
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Footer */}
            <div className="mt-8 pt-6 border-t border-slate-800/80 flex items-center justify-between">
              <span className="text-xs font-mono text-slate-400">Dynamic Pax Tier Pricing</span>
              <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs bg-amber-500 text-slate-950 hover:bg-amber-400 transition-all shadow-md">
                <span>Enter Escape Time</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Card 2: Laser Shooter */}
          <div
            onClick={() => onSelectVenue(VENUES.LASER_SHOOTER)}
            className="group relative rounded-3xl p-8 bg-gradient-to-b from-cyan-950/40 via-slate-900 to-slate-950 border border-cyan-900/40 hover:border-cyan-400/60 shadow-2xl transition-all duration-300 cursor-pointer hover:-translate-y-1.5 hover:shadow-[0_0_40px_rgba(6,182,212,0.25)] flex flex-col justify-between"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-bl-full pointer-events-none transition-all group-hover:bg-cyan-500/20" />
            
            <div>
              {/* Badge & Icon */}
              <div className="flex items-center justify-between mb-6">
                <div className="p-3.5 rounded-2xl bg-cyan-950/80 text-cyan-400 border border-cyan-500/40 shadow-lg">
                  <Target className="w-8 h-8" />
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-cyan-950/80 text-cyan-300 border border-cyan-500/30 font-mono">
                  Neon Blue & Lime Theme
                </span>
              </div>

              {/* Title & Tagline */}
              <h2 className="text-2xl font-black text-white group-hover:text-cyan-300 transition-colors">
                {laserVenue.name}
              </h2>
              <p className="text-sm text-slate-400 mt-2 line-clamp-2">
                {laserVenue.tagline}
              </p>

              {/* Included Games List Preview */}
              <div className="mt-6 space-y-2">
                <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Arena Modes
                </div>
                {laserVenue.games.map((g) => (
                  <div key={g.id} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/80 border border-slate-800/80 text-xs">
                    <span className="font-semibold text-slate-200">{g.name}</span>
                    <span className="text-cyan-400 font-mono flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {g.duration} mins
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Footer */}
            <div className="mt-8 pt-6 border-t border-slate-800/80 flex items-center justify-between">
              <span className="text-xs font-mono text-slate-400">Flat Per-Person Pricing</span>
              <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs bg-cyan-400 text-slate-950 hover:bg-cyan-300 transition-all shadow-md">
                <span>Enter Laser Shooter</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
