import React, { useState, useEffect } from 'react';
import { getPriceOverrides, savePriceOverride, isWeekend, getLocalDateString, normalizeDateString } from '../config/venueData';
import { savePriceOverrideFirebase } from '../config/firebase';
import { Lock, Zap, Flame, CheckCircle2, AlertCircle, Calendar, ShieldCheck, X } from 'lucide-react';

export const RateOverrideModal = ({ isOpen, onClose, onRateUpdated }) => {
  const [password, setPassword] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [authError, setAuthError] = useState('');
  
  const [targetDate, setTargetDate] = useState(() => getLocalDateString());
  const [selectedMode, setSelectedMode] = useState('weekday');
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setPassword('');
      setIsAuthorized(false);
      setAuthError('');
      setSaveSuccess(false);
      return;
    }
    try {
      const overrides = getPriceOverrides() || {};
      const formattedDate = normalizeDateString(targetDate);
      const currentOverride = overrides[formattedDate];
      
      if (currentOverride) {
        setSelectedMode(currentOverride);
      } else {
        const naturalIsWeekend = isWeekend(targetDate);
        setSelectedMode(naturalIsWeekend ? 'weekend' : 'weekday');
      }
    } catch (e) {
      console.error(e);
    }
  }, [isOpen, targetDate]);

  if (!isOpen) return null;

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    if (password === 'admin1') {
      setIsAuthorized(true);
      setAuthError('');
    } else {
      setAuthError('Incorrect password! Enter admin password (admin1)');
    }
  };

  const handleApplyOverride = async (e) => {
    e.preventDefault();
    const formattedDate = normalizeDateString(targetDate);
    savePriceOverride(formattedDate, selectedMode);
    await savePriceOverrideFirebase(formattedDate, selectedMode);
    
    setSaveSuccess(true);
    if (onRateUpdated) onRateUpdated();
    
    setTimeout(() => {
      window.location.reload();
    }, 400);
  };

  const naturalIsWeekend = isWeekend(targetDate);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-cyan-950 p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold tracking-tight">Admin Rate Override</h2>
              <p className="text-xs text-slate-300 font-mono">Switch Date Pricing (Weekday ↔ Weekend)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {!isAuthorized ? (
          /* Step 1: Password Lock Screen */
          <form onSubmit={handlePasswordSubmit} className="p-6 space-y-4">
            <div className="text-center space-y-2">
              <div className="inline-flex p-3 rounded-full bg-slate-100 text-slate-700 border border-slate-200 mb-1">
                <Lock className="w-6 h-6 text-cyan-600" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">Password Verification Required</h3>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                Please enter the admin password to change price rates for specific dates.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 font-mono">Admin Password</label>
              <input
                type="password"
                placeholder="Enter password..."
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setAuthError('');
                }}
                autoFocus
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
              />
              {authError && (
                <div className="flex items-center gap-1.5 text-xs text-red-600 font-semibold mt-1">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{authError}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition-all shadow-md active:scale-95"
              >
                Verify & Continue
              </button>
            </div>
          </form>
        ) : (
          /* Step 2: Rate Mode Controls */
          <form onSubmit={handleApplyOverride} className="p-6 space-y-5">
            
            {/* Target Date Picker */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-cyan-600" />
                Select Date to Modify Rate
              </label>
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm font-bold text-slate-800 focus:ring-2 focus:ring-cyan-500 focus:outline-none"
              />
              <p className="text-[11px] text-slate-500 font-mono">
                Calendar Default for this date: <span className="font-bold text-slate-700">{naturalIsWeekend ? 'Weekend' : 'Weekday'}</span>
              </p>
            </div>

            {/* Rate Mode Selector */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700">Choose Pricing Mode for this Date</label>
              <div className="grid grid-cols-2 gap-3">
                
                {/* Weekday Option */}
                <button
                  type="button"
                  onClick={() => setSelectedMode('weekday')}
                  className={`flex flex-col items-center justify-center p-3.5 rounded-xl border-2 transition-all ${
                    selectedMode === 'weekday'
                      ? 'bg-cyan-50 border-cyan-600 text-cyan-900 shadow-md scale-[1.02]'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Zap className={`w-6 h-6 mb-1 ${selectedMode === 'weekday' ? 'text-cyan-600 fill-cyan-500' : 'text-slate-400'}`} />
                  <span className="text-xs font-extrabold">Weekday Rate</span>
                  <span className="text-[10px] text-slate-500 font-mono mt-0.5">Standard Pricing</span>
                </button>

                {/* Weekend Option */}
                <button
                  type="button"
                  onClick={() => setSelectedMode('weekend')}
                  className={`flex flex-col items-center justify-center p-3.5 rounded-xl border-2 transition-all ${
                    selectedMode === 'weekend'
                      ? 'bg-amber-50 border-amber-600 text-amber-950 shadow-md scale-[1.02]'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Flame className={`w-6 h-6 mb-1 ${selectedMode === 'weekend' ? 'text-amber-600 fill-amber-500' : 'text-slate-400'}`} />
                  <span className="text-xs font-extrabold">Weekend Rate</span>
                  <span className="text-[10px] text-amber-700 font-mono mt-0.5">Peak Pricing</span>
                </button>

              </div>
            </div>

            {saveSuccess && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold animate-fadeIn">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Rate updated & synced real-time for all clients!</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
              >
                Close
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white text-xs font-extrabold transition-all shadow-md active:scale-95"
              >
                Apply & Save Override
              </button>
            </div>

          </form>
        )}

      </div>
    </div>
  );
};
