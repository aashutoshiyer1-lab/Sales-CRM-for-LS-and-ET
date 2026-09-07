import React from 'react';
import { VENUES, VENUE_DETAILS } from '../config/venueData';
import { Lock, ArrowRight, Clock, Target } from 'lucide-react';

export const VenueSelectionView = ({ onSelectVenue }) => {
  const escapeVenue = VENUE_DETAILS[VENUES.ESCAPE_TIME];
  const laserVenue = VENUE_DETAILS[VENUES.LASER_SHOOTER];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden">
      
      {/* Background radial glow lights */}
      <div className="absolute top-1/3 left-10 w-[500px] h-[500px] bg-red-400/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/3 right-10 w-[500px] h-[500px] bg-cyan-400/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-5xl w-full relative z-10">
        
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-block px-3.5 py-1 rounded-full bg-white border border-slate-200 text-xs font-mono font-bold text-cyan-700 mb-3 uppercase tracking-widest shadow-sm">
            Venue Selector
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">
            Choose Active CRM Venue
          </h1>
          <p className="text-base text-slate-600 mt-3 max-w-xl mx-auto font-medium">
            Select a venue to access its dedicated 15-minute slot calendar dashboard, auto-pricing matrix, and real-time sales metrics.
          </p>
        </div>

        {/* Dual Cards Container */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Card 1: Escape Time */}
          <div
            onClick={() => onSelectVenue(VENUES.ESCAPE_TIME)}
            className="group relative rounded-3xl p-8 bg-white border-2 border-red-100 hover:border-red-500 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer hover:-translate-y-1.5 flex flex-col justify-between"
          >
            <div>
              {/* Badge & Icon */}
              <div className="flex items-center justify-between mb-6">
                <div className="p-3.5 rounded-2xl bg-red-50 text-red-600 border border-red-200 shadow-sm">
                  <Lock className="w-8 h-8" />
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200 font-mono">
                  Escape Quest Engine
                </span>
              </div>

              {/* Title & Tagline */}
              <h2 className="text-2xl font-extrabold text-slate-900 group-hover:text-red-600 transition-colors">
                {escapeVenue.name}
              </h2>
              <p className="text-sm text-slate-600 mt-2 line-clamp-2 font-medium">
                {escapeVenue.tagline}
              </p>

              {/* Included Games List Preview */}
              <div className="mt-6 space-y-2">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Featured Rooms & Quests
                </div>
                {escapeVenue.games.map((g) => (
                  <div key={g.id} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                    <span className="font-bold text-slate-800">{g.name}</span>
                    <span className="text-red-600 font-mono font-bold flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {g.duration} mins
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Footer */}
            <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-slate-500">Dynamic Pax Tier Pricing</span>
              <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs bg-red-600 text-white hover:bg-red-700 transition-all shadow-md">
                <span>Enter Escape Time</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Card 2: Laser Shooter */}
          <div
            onClick={() => onSelectVenue(VENUES.LASER_SHOOTER)}
            className="group relative rounded-3xl p-8 bg-white border-2 border-cyan-100 hover:border-cyan-500 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer hover:-translate-y-1.5 flex flex-col justify-between"
          >
            <div>
              {/* Badge & Icon */}
              <div className="flex items-center justify-between mb-6">
                <div className="p-3.5 rounded-2xl bg-cyan-50 text-cyan-600 border border-cyan-200 shadow-sm">
                  <Target className="w-8 h-8" />
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-cyan-50 text-cyan-700 border border-cyan-200 font-mono">
                  Arena Combat Engine
                </span>
              </div>

              {/* Title & Tagline */}
              <h2 className="text-2xl font-extrabold text-slate-900 group-hover:text-cyan-600 transition-colors">
                {laserVenue.name}
              </h2>
              <p className="text-sm text-slate-600 mt-2 line-clamp-2 font-medium">
                {laserVenue.tagline}
              </p>

              {/* Included Games List Preview */}
              <div className="mt-6 space-y-2">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Arena Modes
                </div>
                {laserVenue.games.map((g) => (
                  <div key={g.id} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                    <span className="font-bold text-slate-800">{g.name}</span>
                    <span className="text-cyan-600 font-mono font-bold flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {g.duration} mins
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Footer */}
            <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-slate-500">Flat Per-Person Pricing</span>
              <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs bg-cyan-600 text-white hover:bg-cyan-700 transition-all shadow-md">
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
