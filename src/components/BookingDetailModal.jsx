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
  ShieldCheck,
  Camera
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 shadow-2xl relative space-y-4">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-2xl border ${
              isEscape ? 'bg-red-50 text-red-600 border-red-200 shadow-sm' : 'bg-cyan-50 text-cyan-600 border-cyan-200 shadow-sm'
            }`}>
              {isEscape ? <Lock className="w-5 h-5" /> : <Gamepad2 className="w-5 h-5" />}
            </div>
            <div>
              <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded font-black ${
                isEscape ? 'bg-red-100 text-red-800' : 'bg-cyan-100 text-cyan-800'
              }`}>
                {booking.venue}
              </span>
              <h3 className="text-base font-extrabold text-slate-900 mt-0.5">
                {booking.gameName}
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-100 text-slate-500 hover:text-slate-900 hover:bg-slate-200 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Customer & Slot Details */}
        <div className="space-y-3 text-xs">
          
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center justify-between text-slate-700">
              <span className="flex items-center gap-2 font-bold">
                <User className="w-4 h-4 text-cyan-600" />
                Customer:
              </span>
              <span className="font-extrabold text-slate-900 text-sm">{booking.customerName}</span>
            </div>
            <div className="flex items-center justify-between text-slate-700">
              <span className="flex items-center gap-2 font-bold">
                <Phone className="w-4 h-4 text-emerald-600" />
                Phone:
              </span>
              <span className="font-mono text-slate-900 font-bold">{booking.phone}</span>
            </div>
            {booking.email && (
              <div className="flex items-center justify-between text-slate-700">
                <span className="flex items-center gap-2 font-bold">
                  <Mail className="w-4 h-4 text-amber-600" />
                  Email:
                </span>
                <span className="font-mono text-slate-800 font-medium">{booking.email}</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="text-[10px] text-slate-500 font-bold uppercase">Date</div>
              <div className="font-mono font-bold text-slate-900 text-xs mt-0.5">{booking.date}</div>
            </div>
            <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="text-[10px] text-slate-500 font-bold uppercase">Time Slot</div>
              <div className="font-mono font-black text-slate-950 text-xs mt-0.5">{booking.timeSlot}</div>
            </div>
            <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="text-[10px] text-slate-500 font-bold uppercase">Players</div>
              <div className="font-mono font-bold text-amber-700 text-xs mt-0.5">{booking.paxCount} pax</div>
            </div>
          </div>

          {/* Discount & Reference Info */}
          {booking.offerId && booking.offerId !== 'none' && (
            <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 space-y-1 font-mono text-[11px]">
              <div className="flex items-center justify-between text-amber-900 font-bold">
                <span className="flex items-center gap-1">
                  <Tag className="w-3.5 h-3.5 text-amber-600" /> Offer:
                </span>
                <span>{booking.offerName}</span>
              </div>
              {booking.referencePerson && (
                <div className="flex items-center justify-between text-emerald-800 font-bold">
                  <span className="flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Approval Ref:
                  </span>
                  <span>{booking.referencePerson}</span>
                </div>
              )}
            </div>
          )}

          {/* Payment Split Breakdown */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <span className="font-extrabold text-slate-800 flex items-center gap-1.5">
                <Receipt className="w-4 h-4 text-emerald-600" />
                Total Paid Amount
              </span>
              <span className="text-base font-black text-emerald-700 font-mono">
                ₹{(Number(booking.totalAmount) || 0).toLocaleString()}
              </span>
            </div>

            <div className="text-[11px] font-bold text-slate-500">Split Breakdown:</div>
            <div className="grid grid-cols-2 gap-2 font-mono">
              {Object.entries(booking.payments || {}).map(([method, amt]) => (
                <div 
                  key={method} 
                  className={`p-2 rounded-xl border flex items-center justify-between text-[11px] ${
                    amt > 0 ? 'bg-white border-slate-300 text-slate-900 font-bold shadow-sm' : 'bg-slate-100/50 border-slate-200 text-slate-400'
                  }`}
                >
                  <span className="truncate">{method}</span>
                  <span className="font-bold text-emerald-700">₹{amt}</span>
                </div>
              ))}
            </div>

            {booking.payments && (
              (Number(booking.payments['Prepaid by District']) > 0) ||
              (Number(booking.payments['Razorpay (Website Bookings)']) > 0) ||
              (Number(booking.payments['Razorpay( website bookings)']) > 0) ||
              (Number(booking.payments['Razorpay']) > 0) ||
              (Number(booking.payments['Activity Kids']) > 0) ||
              (Number(booking.payments['Activity kids']) > 0)
            ) && (
              <div className="pt-1 flex items-center gap-1.5 text-xs font-black text-purple-950 bg-purple-100 p-2.5 rounded-xl border border-purple-300">
                <Camera className="w-4 h-4 text-purple-700 shrink-0" />
                <span>Attach booking / payment screenshots in closing</span>
              </div>
            )}
          </div>

        </div>

        {/* Footer Actions */}
        <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
          <button
            onClick={handleDelete}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 transition-all"
          >
            <Trash2 className="w-4 h-4" />
            <span>Delete Booking</span>
          </button>
          
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-all"
          >
            Close Receipt
          </button>
        </div>

      </div>
    </div>
  );
};
