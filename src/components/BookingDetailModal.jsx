import React from 'react';
import { VENUES } from '../config/venueData';
import { 
  X, 
  User, 
  Phone, 
  Mail, 
  Receipt, 
  Trash2, 
  Lock,
  Gamepad2,
  Tag,
  ShieldCheck
} from 'lucide-react';

export const BookingDetailModal = ({ 
  booking, 
  onClose, 
  onDeleteBooking 
}) => {
  if (!booking) return null;

  const isEscape = booking.venue === VENUES.ESCAPE_TIME;

  const handleDelete = () => {
    if (window.confirm(`Are you sure you want to delete the booking for ${booking.customerName}?`)) {
      onDeleteBooking(booking.id);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-md w-full p-6 shadow-2xl relative space-y-4">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-2xl border ${
              isEscape ? 'bg-red-950 text-amber-400 border-amber-500/40' : 'bg-cyan-950 text-cyan-400 border-cyan-500/40'
            }`}>
              {isEscape ? <Lock className="w-5 h-5" /> : <Gamepad2 className="w-5 h-5" />}
            </div>
            <div>
              <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded font-black ${
                isEscape ? 'bg-amber-500/20 text-amber-300' : 'bg-cyan-500/20 text-cyan-300'
              }`}>
                {booking.venue}
              </span>
              <h3 className="text-base font-extrabold text-white mt-0.5">
                {booking.gameName}
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Customer & Slot Details */}
        <div className="space-y-3 text-xs">
          
          <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-slate-300">
              <span className="flex items-center gap-2 font-semibold">
                <User className="w-4 h-4 text-cyan-400" />
                Customer:
              </span>
              <span className="font-extrabold text-white text-sm">{booking.customerName}</span>
            </div>
            <div className="flex items-center justify-between text-slate-300">
              <span className="flex items-center gap-2 font-semibold">
                <Phone className="w-4 h-4 text-emerald-400" />
                Phone:
              </span>
              <span className="font-mono text-slate-200 font-bold">{booking.phone}</span>
            </div>
            {booking.email && (
              <div className="flex items-center justify-between text-slate-300">
                <span className="flex items-center gap-2 font-semibold">
                  <Mail className="w-4 h-4 text-amber-400" />
                  Email:
                </span>
                <span className="font-mono text-slate-200">{booking.email}</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2.5 rounded-2xl bg-slate-950 border border-slate-800">
              <div className="text-[10px] text-slate-400 font-semibold">Date</div>
              <div className="font-mono font-bold text-slate-200 text-xs mt-0.5">{booking.date}</div>
            </div>
            <div className="p-2.5 rounded-2xl bg-slate-950 border border-slate-800">
              <div className="text-[10px] text-slate-400 font-semibold">Time Slot</div>
              <div className="font-mono font-bold text-cyan-400 text-xs mt-0.5">{booking.timeSlot}</div>
            </div>
            <div className="p-2.5 rounded-2xl bg-slate-950 border border-slate-800">
              <div className="text-[10px] text-slate-400 font-semibold">Players</div>
              <div className="font-mono font-bold text-amber-400 text-xs mt-0.5">{booking.paxCount} pax</div>
            </div>
          </div>

          {/* Discount & Reference Info */}
          {booking.offerId && booking.offerId !== 'none' && (
            <div className="p-3 rounded-2xl bg-amber-950/60 border border-amber-500/50 space-y-1 font-mono text-[11px]">
              <div className="flex items-center justify-between text-amber-300 font-bold">
                <span className="flex items-center gap-1">
                  <Tag className="w-3.5 h-3.5" /> Offer:
                </span>
                <span>{booking.offerName}</span>
              </div>
              {booking.referencePerson && (
                <div className="flex items-center justify-between text-emerald-400 font-bold">
                  <span className="flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" /> Approval Ref:
                  </span>
                  <span>{booking.referencePerson}</span>
                </div>
              )}
            </div>
          )}

          {/* Payment Split Breakdown */}
          <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="font-extrabold text-slate-200 flex items-center gap-1.5">
                <Receipt className="w-4 h-4 text-emerald-400" />
                Total Paid Amount
              </span>
              <span className="text-base font-black text-emerald-400 font-mono">
                ₹{Number(booking.totalAmount).toLocaleString()}
              </span>
            </div>

            <div className="text-[11px] font-bold text-slate-400">Split Breakdown:</div>
            <div className="grid grid-cols-2 gap-2 font-mono">
              {Object.entries(booking.payments || {}).map(([method, amt]) => (
                <div 
                  key={method} 
                  className={`p-2 rounded-xl border flex items-center justify-between text-[11px] ${
                    amt > 0 ? 'bg-slate-900 border-slate-700 text-slate-200 font-bold' : 'bg-slate-950/40 border-slate-800/40 text-slate-600'
                  }`}
                >
                  <span className="truncate">{method}</span>
                  <span className="font-bold text-emerald-400">₹{amt}</span>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
          <button
            onClick={handleDelete}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-red-400 hover:text-red-300 bg-red-950/40 border border-red-900/60 transition-all"
          >
            <Trash2 className="w-4 h-4" />
            <span>Delete Booking</span>
          </button>
          
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-slate-800 text-slate-200 hover:bg-slate-700 transition-all"
          >
            Close Receipt
          </button>
        </div>

      </div>
    </div>
  );
};
