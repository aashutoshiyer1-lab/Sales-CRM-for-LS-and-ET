import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { 
  FileText, 
  Copy, 
  Check, 
  AlertCircle, 
  UserCheck, 
  Send, 
  Sparkles, 
  Clock, 
  Coins, 
  ShieldAlert, 
  Calendar as CalendarIcon,
  ChevronRight,
  Edit3,
  Plus,
  Trash2,
  Printer,
  Share2,
  RotateCcw,
  X,
  Camera
} from 'lucide-react';
import { VENUES } from '../config/venueData';
import { getBookingCategory, getGameCategoryLabel, formatSentenceCaseInput } from '../utils/pricingEngine';
import { DiscountEntryModal, formatSingleDiscountNote } from './DiscountEntryModal';
import { subscribeClosingReport, saveClosingReport } from '../config/firebase';

export const getInitialShiftDate = () => {
  const now = new Date();
  if (now.getHours() < 4) {
    now.setDate(now.getDate() - 1);
  }
  return now.toISOString().split('T')[0];
};

export const normalizeDate = (d) => {
  if (!d) return '';
  const clean = String(d).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) return clean;
  const parts = clean.split(/[-/]/);
  if (parts.length === 3) {
    if (parts[0].length === 4) {
      return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
    } else if (parts[2].length === 4) {
      return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
  }
  return clean;
};

export const formatDateDDMMYYYY = (dateString) => {
  if (!dateString) return '';
  const norm = normalizeDate(dateString);
  const [year, month, day] = norm.split('-');
  return `${day}-${month}-${year}`;
};

export const getCachedClosingReport = (date) => {
  if (!date) return null;
  try {
    const raw = localStorage.getItem(`crm_closing_report_${date}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const formatCustomNoteGrammar = (raw) => {
  if (!raw) return '';
  let cleaned = String(raw).trim();
  // Strip common prefixes like "Note:", "note -", "Note -", "Custom Note:", etc.
  cleaned = cleaned.replace(/^(note\s*:\s*|note\s*-\s*|custom\s*note\s*:\s*|custom\s*note\s*-\s*|custom\s*reason\s*:\s*|note\s+)/i, '').trim();
  if (!cleaned) return '';
  // Enforce proper sentence case: first letter capital, rest lowercase even if caps lock was on
  cleaned = formatSentenceCaseInput(cleaned);
  // Ensure closing punctuation if missing
  if (!/[.!?]$/.test(cleaned)) {
    cleaned += '.';
  }
  return cleaned;
};

const PREDEFINED_STAFF_LIST = [
  'AASHUTOSH',
  'CHINNA BABU',
  'MALLIKARJUN',
  'NAGEENA'
];

export const ClosingReportDashboard = ({ 
  bookings = [], 
  manualDiscounts = [], 
  onAddManualDiscount, 
  onDeleteManualDiscount, 
  onEditBooking,
  onDeleteBooking,
  onUpdateBooking
}) => {
  const initialDate = useMemo(() => getInitialShiftDate(), []);
  const [shiftDate, setShiftDate] = useState(initialDate);

  const initialCached = useMemo(() => getCachedClosingReport(initialDate), [initialDate]);

  const [selectedStaffOption, setSelectedStaffOption] = useState(() => {
    const raw = initialCached?.selectedStaffOption || 'AASHUTOSH';
    return raw.toUpperCase() === 'CUSTOM' ? 'custom' : raw.toUpperCase();
  });
  const [customStaffName, setCustomStaffName] = useState(() => initialCached?.customStaffName || '');
  
  const rawStaff = selectedStaffOption === 'custom' ? customStaffName : selectedStaffOption;
  const staffName = (rawStaff || 'AASHUTOSH').trim().toUpperCase();

  const [copiedReport, setCopiedReport] = useState(false);
  const [copiedBucket, setCopiedBucket] = useState(null);

  // Manual discount entries passed from Firebase real-time sync
  const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false);
  const [editingDiscountEntry, setEditingDiscountEntry] = useState(null);

  // Shift specific manual discounts with robust date normalization
  const shiftManualDiscounts = useMemo(() => {
    const targetDate = normalizeDate(shiftDate);
    return (manualDiscounts || []).filter(d => !d.date || normalizeDate(d.date) === targetDate);
  }, [manualDiscounts, shiftDate]);

  // Print Modals State
  const [printLaserModalOpen, setPrintLaserModalOpen] = useState(false);
  const [printEscapeModalOpen, setPrintEscapeModalOpen] = useState(false);
  
  const [customLaserPrintText, setCustomLaserPrintText] = useState('');
  const [customEscapePrintText, setCustomEscapePrintText] = useState('');
  const [isLaserPrintEdited, setIsLaserPrintEdited] = useState(false);
  const [isEscapePrintEdited, setIsEscapePrintEdited] = useState(false);

  // Manual inputs for excess amounts & custom notes — cached locally and deep-synced via RTDB
  const [excessAmounts, setExcessAmounts] = useState(() => ({
    laser: '',
    escape: '',
    lab: '',
    lockedIn: '',
    sherlock: '',
    spy: '',
    ...(initialCached?.excessAmounts || {})
  }));

  const [notes, setNotes] = useState(() => ({
    laser: '',
    lab: '',
    lockedIn: '',
    sherlock: '',
    spy: '',
    ...(initialCached?.notes || {})
  }));

  const [staffGamesCount, setStaffGamesCount] = useState(() => initialCached?.staffGamesCount || 0);
  const [customReportText, setCustomReportText] = useState(() => initialCached?.customReportText || '');
  const [isManualEditMode, setIsManualEditMode] = useState(() => Boolean(initialCached?.isManualEditMode));

  // Custom overrides for individual notes (edit note capability)
  const [noteCustomOverrides, setNoteCustomOverrides] = useState(() => initialCached?.noteCustomOverrides || {});
  // Deleted note IDs (delete note capability)
  const [deletedNoteIds, setDeletedNoteIds] = useState(() => initialCached?.deletedNoteIds || []);

  // Modal states for editing note & deleting note
  const [editingNoteItem, setEditingNoteItem] = useState(null);
  const [editingNoteText, setEditingNoteText] = useState('');
  const [deletingNoteItem, setDeletingNoteItem] = useState(null);
  const [notesFilterTab, setNotesFilterTab] = useState('all');

  // Ref to hold current state snapshot for debounced RTDB persistence
  const closingDataRef = useRef({
    excessAmounts,
    notes,
    staffGamesCount,
    selectedStaffOption,
    customStaffName,
    isManualEditMode,
    customReportText,
    noteCustomOverrides,
    deletedNoteIds
  });

  useEffect(() => {
    closingDataRef.current = {
      excessAmounts,
      notes,
      staffGamesCount,
      selectedStaffOption,
      customStaffName,
      isManualEditMode,
      customReportText,
      noteCustomOverrides,
      deletedNoteIds
    };
  }, [excessAmounts, notes, staffGamesCount, selectedStaffOption, customStaffName, isManualEditMode, customReportText, noteCustomOverrides, deletedNoteIds]);

  const saveTimeoutRef = useRef(null);

  // Deep Real-time Persistence: writes to localStorage instantly (0ms) + debounces RTDB save (300ms)
  const persistUpdates = useCallback((updates) => {
    const nextData = {
      ...closingDataRef.current,
      ...updates
    };
    closingDataRef.current = nextData;

    try {
      localStorage.setItem(`crm_closing_report_${shiftDate}`, JSON.stringify(nextData));
    } catch (e) {}

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      saveClosingReport(shiftDate, nextData);
    }, 300);
  }, [shiftDate]);

  // Real-time synchronization with Firebase RTDB + instant local storage load on shiftDate change
  useEffect(() => {
    const cached = getCachedClosingReport(shiftDate);
    if (cached) {
      if (cached.excessAmounts) setExcessAmounts(prev => ({ ...prev, ...cached.excessAmounts }));
      if (cached.notes) setNotes(prev => ({ ...prev, ...cached.notes }));
      if (cached.staffGamesCount !== undefined) setStaffGamesCount(cached.staffGamesCount);
      if (cached.selectedStaffOption) setSelectedStaffOption(cached.selectedStaffOption);
      if (cached.customStaffName !== undefined) setCustomStaffName(cached.customStaffName);
      if (cached.isManualEditMode !== undefined) setIsManualEditMode(cached.isManualEditMode);
      if (cached.customReportText !== undefined) setCustomReportText(cached.customReportText);
      if (cached.noteCustomOverrides) setNoteCustomOverrides(cached.noteCustomOverrides);
      if (cached.deletedNoteIds) setDeletedNoteIds(cached.deletedNoteIds);
    } else {
      setExcessAmounts({ laser: '', lab: '', lockedIn: '', sherlock: '', spy: '' });
      setNotes({ laser: '', lab: '', lockedIn: '', sherlock: '', spy: '' });
      setStaffGamesCount(0);
      setIsManualEditMode(false);
      setCustomReportText('');
      setNoteCustomOverrides({});
      setDeletedNoteIds([]);
    }

    const unsubscribe = subscribeClosingReport(shiftDate, (remoteData) => {
      if (!remoteData) return;
      if (remoteData.excessAmounts) {
        setExcessAmounts(prev => ({ ...prev, ...remoteData.excessAmounts }));
      }
      if (remoteData.notes) {
        setNotes(prev => ({ ...prev, ...remoteData.notes }));
      }
      if (remoteData.staffGamesCount !== undefined) {
        setStaffGamesCount(remoteData.staffGamesCount);
      }
      if (remoteData.selectedStaffOption) {
        setSelectedStaffOption(remoteData.selectedStaffOption);
      }
      if (remoteData.customStaffName !== undefined) {
        setCustomStaffName(remoteData.customStaffName);
      }
      if (remoteData.isManualEditMode !== undefined) {
        setIsManualEditMode(remoteData.isManualEditMode);
      }
      if (remoteData.customReportText !== undefined) {
        setCustomReportText(remoteData.customReportText);
      }
      if (remoteData.noteCustomOverrides !== undefined) {
        setNoteCustomOverrides(remoteData.noteCustomOverrides || {});
      }
      if (remoteData.deletedNoteIds !== undefined) {
        setDeletedNoteIds(remoteData.deletedNoteIds || []);
      }
    });

    return () => {
      if (unsubscribe) unsubscribe();
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [shiftDate]);

  // Filter bookings for the selected shift date with robust date normalization
  const shiftBookings = useMemo(() => {
    const targetDate = normalizeDate(shiftDate);
    return bookings.filter(b => normalizeDate(b.date) === targetDate && b.status !== 'Cancelled');
  }, [bookings, shiftDate]);

  const cancelledAndNoShows = useMemo(() => {
    const targetDate = normalizeDate(shiftDate);
    return bookings.filter(b => normalizeDate(b.date) === targetDate && (b.status === 'No Show' || b.status === 'Cancelled'));
  }, [bookings, shiftDate]);

  // --- COMBINED SHIFT PAYMENT METHOD BREAKDOWN ---
  const paymentBreakdown = useMemo(() => {
    const totals = {
      Cash: 0,
      Card: 0,
      'UPI-New Pay': 0,
      'Prepaid by District': 0,
      'Razorpay (Website Bookings)': 0,
      'Activity Kids': 0
    };

    shiftBookings.forEach(b => {
      if (b.status === 'Confirmed' && b.payments) {
        Object.keys(totals).forEach(method => {
          let val = Number(b.payments[method]) || 0;
          if (!val && method === 'Razorpay (Website Bookings)') {
            val = Number(b.payments['Razorpay( website bookings)']) || Number(b.payments['Razorpay']) || 0;
          }
          if (!val && method === 'Activity Kids') {
            val = Number(b.payments['Activity kids']) || 0;
          }
          totals[method] += val;
        });
      }
    });

    return totals;
  }, [shiftBookings]);

  // --- LASER SHOOTER CALCULATIONS ---
  const laserBookings = useMemo(() => {
    return shiftBookings.filter(b => b.venue === VENUES.LASER_SHOOTER && b.status === 'Confirmed');
  }, [shiftBookings]);

  // --- PURE LASER SHOOTER PAYMENT BREAKDOWN ---
  const laserPaymentBreakdown = useMemo(() => {
    const totals = {
      Cash: 0,
      Card: 0,
      'UPI-New Pay': 0,
      'Prepaid by District': 0,
      'Razorpay (Website Bookings)': 0,
      'Activity Kids': 0
    };

    laserBookings.forEach(b => {
      if (b.payments) {
        Object.keys(totals).forEach(method => {
          let val = Number(b.payments[method]) || 0;
          if (!val && method === 'Razorpay (Website Bookings)') {
            val = Number(b.payments['Razorpay( website bookings)']) || Number(b.payments['Razorpay']) || 0;
          }
          if (!val && method === 'Activity Kids') {
            val = Number(b.payments['Activity kids']) || 0;
          }
          totals[method] += val;
        });
      }
    });

    return totals;
  }, [laserBookings]);

  // Helper: Only pure complimentary games (kids under 5/6 with 0 payment) use complimentary game session logic.
  // Bookings with custom notes/discounts and customer details count normally as sessions!
  const isPureComplimentary = (b) => {
    if (!b) return false;
    if (Number(b.totalAmount) > 0) return false;
    if (b.offerId === 'custom_discount' || Boolean(b.customDiscountReason)) return false;
    const offer = (b.offerName || '').toLowerCase();
    return b.offerId === 'complimentary' || offer.includes('complimentary');
  };

  const isStaffGame = (b) => {
    if (!b) return false;
    const offer = (b.offerName || '').toLowerCase();
    return b.offerId === 'staff_game' || offer.includes('staff');
  };

  // Sessions Count: Count all real sessions (exclude complimentary & staff games)
  const laserSessions = useMemo(() => {
    return laserBookings.filter(b => !isPureComplimentary(b) && !isStaffGame(b)).length;
  }, [laserBookings]);

  const laserStaffBookingsCount = useMemo(() => {
    return laserBookings
      .filter(isStaffGame)
      .reduce((sum, b) => sum + (Number(b.paxCount) || 1), 0);
  }, [laserBookings]);

  const effectiveStaffGamesCount = useMemo(() => {
    return Math.max(staffGamesCount || 0, laserStaffBookingsCount || 0);
  }, [staffGamesCount, laserStaffBookingsCount]);

  const laserTotalGames = useMemo(() => {
    return laserBookings.reduce((sum, b) => sum + (Number(b.paxCount) || 0), 0);
  }, [laserBookings]);

  const laser10Min = useMemo(() => {
    return laserBookings
      .filter(b => b.gameName === 'Combat' || b.duration === '10 mins')
      .reduce((sum, b) => sum + (Number(b.paxCount) || 0), 0);
  }, [laserBookings]);

  const laser20Min = useMemo(() => {
    return laserBookings
      .filter(b => b.gameName === 'Battle' || b.duration === '20 mins')
      .reduce((sum, b) => sum + (Number(b.paxCount) || 0), 0);
  }, [laserBookings]);

  const laser30Min = useMemo(() => {
    return laserBookings
      .filter(b => b.gameName === 'War' || b.duration === '30 mins')
      .reduce((sum, b) => sum + (Number(b.paxCount) || 0), 0);
  }, [laserBookings]);

  const derivedComplementaryCountLaser = useMemo(() => {
    const totalComplPax = laserBookings
      .filter(isPureComplimentary)
      .reduce((sum, b) => sum + (Number(b.paxCount) || 0), 0);
    return String(totalComplPax).padStart(2, '0');
  }, [laserBookings]);

  const laserTotalSale = useMemo(() => {
    return laserBookings.reduce((sum, b) => sum + (Number(b.totalAmount) || 0), 0);
  }, [laserBookings]);

  // --- ESCAPE TIME CALCULATIONS PER ROOM ---
  const escapeBookings = useMemo(() => {
    return shiftBookings.filter(b => b.venue === VENUES.ESCAPE_TIME && b.status === 'Confirmed');
  }, [shiftBookings]);

  // --- PURE ESCAPE TIME PAYMENT BREAKDOWN ---
  const escapePaymentBreakdown = useMemo(() => {
    const totals = {
      Cash: 0,
      Card: 0,
      'UPI-New Pay': 0,
      'Prepaid by District': 0,
      'Razorpay (Website Bookings)': 0,
      'Activity Kids': 0
    };

    escapeBookings.forEach(b => {
      if (b.payments) {
        Object.keys(totals).forEach(method => {
          let val = Number(b.payments[method]) || 0;
          if (!val && method === 'Razorpay (Website Bookings)') {
            val = Number(b.payments['Razorpay( website bookings)']) || Number(b.payments['Razorpay']) || 0;
          }
          if (!val && method === 'Activity Kids') {
            val = Number(b.payments['Activity kids']) || 0;
          }
          totals[method] += val;
        });
      }
    });

    return totals;
  }, [escapeBookings]);

  const getRoomStats = (roomNamePattern) => {
    const roomBookings = escapeBookings.filter(b => 
      b.gameName && b.gameName.toLowerCase().includes(roomNamePattern.toLowerCase())
    );

    const sessions = roomBookings.filter(b => !isPureComplimentary(b) && !isStaffGame(b)).length;
    const games = roomBookings.reduce((sum, b) => sum + (Number(b.paxCount) || 0), 0);
    const sale = roomBookings.reduce((sum, b) => sum + (Number(b.totalAmount) || 0), 0);
    
    const complPax = roomBookings
      .filter(isPureComplimentary)
      .reduce((sum, b) => sum + (Number(b.paxCount) || 0), 0);

    let bracket2to3 = 0;
    let bracket4to6 = 0;
    let bracket7plus = 0;
    let sale2to3 = 0;
    let sale4to6 = 0;
    let sale7plus = 0;

    roomBookings.forEach(b => {
      const pax = Number(b.paxCount) || 0;
      const cat = getBookingCategory(b, roomBookings);
      const amt = Number(b.totalAmount) || 0;

      if (cat === '2-3') {
        bracket2to3 += pax;
        sale2to3 += amt;
      } else if (cat === '4-6') {
        bracket4to6 += pax;
        sale4to6 += amt;
      } else if (cat === '7+') {
        bracket7plus += pax;
        sale7plus += amt;
      }
    });

    return {
      sessions,
      games,
      sale,
      complCount: String(complPax).padStart(2, '0'),
      bracket2to3,
      bracket4to6,
      bracket7plus,
      sale2to3,
      sale4to6,
      sale7plus,
      bookings: roomBookings
    };
  };

  const labStats = useMemo(() => getRoomStats('Professor'), [escapeBookings]);
  const lockedInStats = useMemo(() => getRoomStats('Locked In'), [escapeBookings]);
  const sherlockStats = useMemo(() => getRoomStats('Sherlock'), [escapeBookings]);
  const spyStats = useMemo(() => getRoomStats('Spy Agents'), [escapeBookings]);

  // --- NO SHOWS & CANCELLED ---
  const noShowsLaser = useMemo(() => {
    return cancelledAndNoShows.filter(b => b.venue === VENUES.LASER_SHOOTER).length;
  }, [cancelledAndNoShows]);

  const noShowsEscape = useMemo(() => {
    return cancelledAndNoShows.filter(b => b.venue === VENUES.ESCAPE_TIME).length;
  }, [cancelledAndNoShows]);

  const totalNoShows = noShowsLaser + noShowsEscape;

  const overallSale = useMemo(() => {
    return laserTotalSale + labStats.sale + lockedInStats.sale + sherlockStats.sale + spyStats.sale;
  }, [laserTotalSale, labStats.sale, lockedInStats.sale, sherlockStats.sale, spyStats.sale]);

  // --- DISCOUNT APPROVAL NOTES GENERATION & BUCKET SORTING ---
  const { allNotes, khajaBucket, nayeemBucket, onlineBucket, otherBucket, missingRefWarnings, allDiscountNotes } = useMemo(() => {
    const allNotes = [];
    const khajaNotes = [];
    const nayeemNotes = [];
    const onlineNotes = [];
    const otherNotes = [];
    const warnings = [];

    const roomNotesMap = {
      laser: [],
      lab: [],
      lockedIn: [],
      sherlock: [],
      spy: []
    };

    // 1. Process Bookings with Discounts, Custom Notes, or Online Payments (District / Razorpay / Activity Kids)
    const relevantBookings = shiftBookings.filter(b => 
      b.status !== 'Cancelled' && (
        (b.offerId && b.offerId !== 'none') ||
        Boolean(b.referencePerson) ||
        Boolean(b.customNote && b.customNote.trim()) ||
        Boolean(b.customDiscountReason && b.customDiscountReason.trim()) ||
        Boolean(b.notes && b.notes.trim()) ||
        (b.payments && (
          Number(b.payments['Prepaid by District']) > 0 ||
          Number(b.payments['Razorpay (Website Bookings)']) > 0 ||
          Number(b.payments['Razorpay( website bookings)']) > 0 ||
          Number(b.payments['Razorpay']) > 0 ||
          Number(b.payments['Activity Kids']) > 0 ||
          Number(b.payments['Activity kids']) > 0
        ))
      )
    );

    relevantBookings.forEach(b => {
      const isDistrictPay = b.payments && Number(b.payments['Prepaid by District']) > 0;
      const isRazorpayPay = b.payments && (
        Number(b.payments['Razorpay (Website Bookings)']) > 0 ||
        Number(b.payments['Razorpay( website bookings)']) > 0 ||
        Number(b.payments['Razorpay']) > 0
      );
      const isActivityKidsPay = b.payments && (
        Number(b.payments['Activity Kids']) > 0 ||
        Number(b.payments['Activity kids']) > 0
      );
      
      const isDistrictOffer = b.offerId === 'district_app' || (b.offerName || '').toLowerCase().includes('district');
      const isRazorpayOffer = b.offerId === 'website_booking' || (b.offerName || '').toLowerCase().includes('razorpay') || (b.offerName || '').toLowerCase().includes('website');
      const isActivityKidsOffer = b.offerId === 'activity_kids' || (b.offerName || '').toLowerCase().includes('activity kids');

      const isDistrict = isDistrictOffer || isDistrictPay;
      const isRazorpay = isRazorpayOffer || isRazorpayPay;
      const isActivityKids = isActivityKidsOffer || isActivityKidsPay;
      const isOnline = isDistrict || isRazorpay || isActivityKids;
      
      const ref = b.referencePerson || '';
      const isLaser = b.venue === VENUES.LASER_SHOOTER;
      
      // Map laser duration: 10 mins, 20 mins, 30 mins
      let laserDuration = '20 mins';
      if (b.duration) laserDuration = b.duration;
      else if (b.gameName === 'Combat') laserDuration = '10 mins';
      else if (b.gameName === 'Battle') laserDuration = '20 mins';
      else if (b.gameName === 'War') laserDuration = '30 mins';
      if (!laserDuration.endsWith('mins') && !laserDuration.endsWith('min')) laserDuration = `${laserDuration} mins`;

      // Map escape room name: Laboratory, Locked In, Sherlock, Spy Agents
      const formatRoomName = (r) => {
        if (!r) return 'Escape Room';
        if (r.includes('Professor') || r.includes('Lab')) return 'Laboratory';
        if (r.includes('Sherlock')) return 'Sherlock';
        if (r.includes('Locked')) return 'Locked In';
        if (r.includes('Spy')) return 'Spy Agents';
        return r;
      };
      const roomClean = isLaser ? laserDuration : formatRoomName(b.gameName);

      const pax = b.paxCount || 1;
      const pct = b.discountPercentage || 0;
      const offer = (b.offerName || '').toLowerCase();
      const offerId = b.offerId || '';

      const kidWording = pax === 1 ? '1 kid' : `${pax} kids`;
      const playerWording = `group of ${pax} players`;

      const customNoteText = (b.customNote || b.customDiscountReason || b.notes || '').trim();
      const isCustomDiscount = b.offerId === 'custom_discount' || Boolean(b.customDiscountReason) || Boolean(customNoteText);
      const customReason = customNoteText || (b.offerName || '').trim();
      const isStaffBooking = offer.includes('staff') || offerId === 'staff_game' || customReason.toLowerCase().includes('staff') || customNoteText.toLowerCase().includes('staff');

      const requiresRef = !isOnline && pct > 0 && offerId !== 'custom_discount';

      let noteText = '';
      let baseSentence = '';

      if (isLaser) {
        if (isDistrict) {
          baseSentence = `Today we had a group of ${pax} who made booking through District for ${laserDuration} game.`;
        } else if (isRazorpay) {
          baseSentence = `Today we had a group of ${pax} who made booking through Website for ${laserDuration} game.`;
        } else if (isActivityKids) {
          baseSentence = `Today we had a group of ${pax} who made booking through Activity Kids for ${laserDuration} game.`;
        } else if (isStaffBooking) {
          const staffScenario = b.staffGameScenario;
          const staffWording = pax === 1 ? '1 staff' : `${pax} staff`;
          if (staffScenario === 'custom_scenario' && (b.staffGameCustomReason || b.customDiscountReason || customNoteText)) {
            const customReasonText = (b.staffGameCustomReason || b.customDiscountReason || customNoteText).trim();
            if (customReasonText.toLowerCase().startsWith('today') || customReasonText.toLowerCase().startsWith('given')) {
              baseSentence = `${customReasonText}${ref ? ` and as per ${ref} reference.` : '.'}`;
            } else {
              baseSentence = `Today ${staffWording} played ${laserDuration} game as ${customReasonText}${ref ? ` and as per ${ref} reference.` : '.'}`;
            }
          } else if (staffScenario === 'staff_training' || customNoteText.toLowerCase().includes('training') || customNoteText.toLowerCase().includes('test')) {
            baseSentence = `Today ${staffWording} played ${laserDuration} game for staff training / game testing${ref ? ` and as per ${ref} reference.` : '.'}`;
          } else {
            baseSentence = `Today ${staffWording} joined ${laserDuration} game as customer had requested as there were fewer players${ref ? ` and as per ${ref} reference.` : '.'}`;
          }
        } else if (offer.includes('complimentary') || offerId === 'complimentary') {
          baseSentence = `Given complementary game to ${kidWording} for ${laserDuration} game as they were under 5 years${ref ? ` and as per ${ref} reference.` : '.'}`;
        } else if (offer.includes('brochure') || offerId === 'cross_promotion_brochure') {
          baseSentence = `Given ${pct || 30}% discount to ${playerWording} for ${laserDuration} game as they had cross promotion brochure${ref ? ` and as per ${ref} reference.` : '.'}`;
        } else if (offer.includes('cross promotion') || offerId === 'cross_promotion') {
          baseSentence = `Given ${pct || 30}% discount to ${playerWording} for ${laserDuration} game as they had cross promotion coupon${ref ? ` and as per ${ref} reference.` : '.'}`;
        } else if (offer.includes('second') || offerId === 'second_game') {
          baseSentence = `Given ${pct || 20}% discount to ${playerWording} for ${laserDuration} game as it was their 2nd game the same day${ref ? ` and as per ${ref} reference.` : '.'}`;
        } else if (offer.includes('birthday') || offerId === 'birthday_package') {
          baseSentence = `Given ${pct || 15}% discount to ${playerWording} for ${laserDuration} game as it was a birthday package${ref ? ` and as per ${ref} reference.` : '.'}`;
        } else if (offer.includes('corporate') || offerId === 'corporate_package') {
          baseSentence = `Given ${pct || 15}% discount to ${playerWording} for ${laserDuration} game as it was a corporate package${ref ? ` and as per ${ref} reference.` : '.'}`;
        } else if (offer.includes('high price') || offerId === 'high_price_retention') {
          baseSentence = `Given ${pct || 10}% discount to ${playerWording} for ${laserDuration} game as they were going back due to high prices${ref ? ` and as per ${ref} reference.` : '.'}`;
        } else if (b.customDiscountReason && !b.customNote) {
          baseSentence = `Given ${pct || 100}% discount to ${playerWording} for ${laserDuration} game as ${b.customDiscountReason}${ref ? ` and as per ${ref} reference.` : '.'}`;
        } else if (pct > 0) {
          baseSentence = `Given ${pct}% discount to ${playerWording} for ${laserDuration} game as ${b.offerName || b.customDiscountReason || 'special discount'}${ref ? ` and as per ${ref} reference.` : '.'}`;
        } else {
          baseSentence = `Today we had a ${playerWording} for ${laserDuration} game.`;
        }
      } else {
        if (isDistrict) {
          baseSentence = `Today we had a group of ${pax} who made booking through District for ${roomClean}.`;
        } else if (isRazorpay) {
          baseSentence = `Today we had a group of ${pax} who made booking through Website for ${roomClean}.`;
        } else if (isActivityKids) {
          baseSentence = `Today we had a group of ${pax} who made booking through Activity Kids for ${roomClean}.`;
        } else if (isStaffBooking) {
          const staffScenario = b.staffGameScenario;
          const staffWording = pax === 1 ? '1 staff' : `${pax} staff`;
          if (staffScenario === 'custom_scenario' && (b.staffGameCustomReason || b.customDiscountReason || customNoteText)) {
            const customReasonText = (b.staffGameCustomReason || b.customDiscountReason || customNoteText).trim();
            if (customReasonText.toLowerCase().startsWith('today') || customReasonText.toLowerCase().startsWith('given')) {
              baseSentence = `${customReasonText}${ref ? ` and as per ${ref} reference.` : '.'}`;
            } else {
              baseSentence = `Today ${staffWording} played ${roomClean} as ${customReasonText}${ref ? ` and as per ${ref} reference.` : '.'}`;
            }
          } else if (staffScenario === 'staff_training' || customNoteText.toLowerCase().includes('training') || customNoteText.toLowerCase().includes('test')) {
            baseSentence = `Today ${staffWording} played ${roomClean} for staff training / game testing${ref ? ` and as per ${ref} reference.` : '.'}`;
          } else {
            baseSentence = `Today ${staffWording} joined ${roomClean} as customer had requested as there were fewer players${ref ? ` and as per ${ref} reference.` : '.'}`;
          }
        } else if (offer.includes('complimentary') || offerId === 'complimentary') {
          baseSentence = `Given complementary game to ${kidWording} as they were under 5 years for ${roomClean}${ref ? ` and as per ${ref} reference.` : '.'}`;
        } else if (offer.includes('brochure') || offerId === 'cross_promotion_brochure') {
          baseSentence = `Given ${pct || 30}% discount to ${playerWording} for ${roomClean} as they had cross promotion brochure${ref ? ` and as per ${ref} reference.` : '.'}`;
        } else if (offer.includes('cross promotion') || offerId === 'cross_promotion') {
          baseSentence = `Given ${pct || 30}% discount to ${playerWording} for ${roomClean} as they had cross promotion coupon${ref ? ` and as per ${ref} reference.` : '.'}`;
        } else if (offer.includes('second') || offerId === 'second_game') {
          baseSentence = `Given ${pct || 20}% discount to ${playerWording} for ${roomClean} as it was their 2nd game the same day${ref ? ` and as per ${ref} reference.` : '.'}`;
        } else if (offer.includes('birthday') || offerId === 'birthday_package') {
          baseSentence = `Given ${pct || 15}% discount to ${playerWording} for ${roomClean} as it was a birthday package${ref ? ` and as per ${ref} reference.` : '.'}`;
        } else if (offer.includes('corporate') || offerId === 'corporate_package') {
          baseSentence = `Given ${pct || 15}% discount to ${playerWording} for ${roomClean} as it was a corporate package${ref ? ` and as per ${ref} reference.` : '.'}`;
        } else if (offer.includes('high price') || offerId === 'high_price_retention') {
          baseSentence = `Given ${pct || 10}% discount to ${playerWording} for ${roomClean} as they were going back due to high prices${ref ? ` and as per ${ref} reference.` : '.'}`;
        } else if (b.customDiscountReason && !b.customNote) {
          baseSentence = `Given ${pct || 100}% discount to ${playerWording} for ${roomClean} as ${b.customDiscountReason}${ref ? ` and as per ${ref} reference.` : '.'}`;
        } else if (pct > 0) {
          baseSentence = `Given ${pct}% discount to ${playerWording} for ${roomClean} as ${b.offerName || b.customDiscountReason || 'special discount'}${ref ? ` and as per ${ref} reference.` : '.'}`;
        } else {
          baseSentence = `Today we had a ${playerWording} for ${roomClean}.`;
        }
      }

      noteText = baseSentence;

      // Custom note on next line without "Note:", with proper grammar (reference does NOT populate for custom notes)
      if (customNoteText && customNoteText !== b.customDiscountReason) {
        const formattedCustom = formatCustomNoteGrammar(customNoteText);
        if (formattedCustom && !noteText.includes(formattedCustom)) {
          noteText += `\n${formattedCustom}`;
        }
      }

      // Populate Customer Name and Mobile Number directly below custom note
      const isStandardComplimentary = (offer.includes('complimentary') || offerId === 'complimentary') && !customNoteText;
      const isStandardStaffGame = isStaffBooking && !customNoteText;
      if (!isStandardComplimentary && !isStandardStaffGame) {
        if (b.customerName && b.customerName.trim()) {
          noteText += `\nCustomer Name: ${b.customerName.trim()}`;
        }
        if (b.phone && b.phone.trim()) {
          noteText += `\nMobile Number: ${b.phone.trim()}`;
        }
      }

      const noteId = `booking_${b.id}`;
      const isDeleted = deletedNoteIds.includes(noteId);
      if (!isDeleted) {
        const effectiveText = noteCustomOverrides[noteId] !== undefined ? noteCustomOverrides[noteId] : noteText;
        const noteItem = {
          id: noteId,
          text: effectiveText,
          originalText: noteText,
          booking: b,
          isManual: false,
          isLaser,
          ref,
          roomOrDuration: roomClean,
          isEdited: noteCustomOverrides[noteId] !== undefined && noteCustomOverrides[noteId] !== noteText
        };

        if (requiresRef && !ref) {
          warnings.push({
            booking: b,
            message: `Missing manager reference for ${b.customerName || 'Booking'} (${b.gameName}, ${pct}% off)`
          });
        }

        // Add to allNotes so it is ALWAYS visible and editable
        allNotes.push(noteItem);

        // Manager & Online buckets
        if (ref === 'Khaja Sir' || ref.toLowerCase().includes('khaja')) {
          khajaNotes.push(noteItem);
        } else if (ref === 'Nayeem Sir' || ref.toLowerCase().includes('nayeem')) {
          nayeemNotes.push(noteItem);
        } else if (isOnline) {
          onlineNotes.push(noteItem);
        } else {
          // Custom discount, staff joined, or reference-free notes
          otherNotes.push(noteItem);
        }

        // ALWAYS add to roomNotesMap so it appears in closing message!
        if (isLaser) {
          roomNotesMap.laser.push(noteItem);
        } else {
          const gName = (b.gameName || '').toLowerCase();
          if (gName.includes('professor') || gName.includes('lab')) roomNotesMap.lab.push(noteItem);
          else if (gName.includes('locked')) roomNotesMap.lockedIn.push(noteItem);
          else if (gName.includes('sherlock')) roomNotesMap.sherlock.push(noteItem);
          else if (gName.includes('spy')) roomNotesMap.spy.push(noteItem);
          else roomNotesMap.lab.push(noteItem);
        }
      }
    });

    // 2. Process Manual Discount Entries (synced in real-time)
    shiftManualDiscounts.forEach(entry => {
      const res = formatSingleDiscountNote(entry);
      if (res.missingRef) {
        warnings.push({
          booking: null,
          message: `Manual Discount Entry missing manager reference (${entry.reason}, ${entry.groupSizeVal} players)`
        });
      } else if (res.isApproved && res.notes) {
        res.notes.forEach((n, idx) => {
          const noteId = `manual_${entry.id}_${idx}`;
          const isDeleted = deletedNoteIds.includes(noteId);
          if (!isDeleted) {
            const effectiveText = noteCustomOverrides[noteId] !== undefined ? noteCustomOverrides[noteId] : n.text;
            const noteItem = {
              id: noteId,
              text: effectiveText,
              originalText: n.text,
              manualEntry: entry,
              isManual: true,
              isLaser: n.isLaser,
              ref: entry.reference,
              roomOrDuration: n.roomOrDuration,
              isEdited: noteCustomOverrides[noteId] !== undefined && noteCustomOverrides[noteId] !== n.text
            };

            // Add to allNotes
            allNotes.push(noteItem);

            if (entry.reference === 'Khaja Sir' || (entry.reference || '').toLowerCase().includes('khaja')) {
              khajaNotes.push(noteItem);
            } else if (entry.reference === 'Nayeem Sir' || (entry.reference || '').toLowerCase().includes('nayeem')) {
              nayeemNotes.push(noteItem);
            } else if (entry.category === 'online' || (entry.reason || '').toLowerCase().includes('district') || (entry.reason || '').toLowerCase().includes('website')) {
              onlineNotes.push(noteItem);
            } else {
              otherNotes.push(noteItem);
            }

            if (n.isLaser) {
              roomNotesMap.laser.push(noteItem);
            } else {
              const roomName = (n.roomOrDuration || '').toLowerCase();
              if (roomName.includes('professor') || roomName.includes('lab')) roomNotesMap.lab.push(noteItem);
              else if (roomName.includes('locked')) roomNotesMap.lockedIn.push(noteItem);
              else if (roomName.includes('sherlock')) roomNotesMap.sherlock.push(noteItem);
              else if (roomName.includes('spy')) roomNotesMap.spy.push(noteItem);
              else roomNotesMap.lab.push(noteItem);
            }
          }
        });
      }
    });

    return {
      allNotes,
      khajaBucket: khajaNotes,
      nayeemBucket: nayeemNotes,
      onlineBucket: onlineNotes,
      otherBucket: otherNotes,
      missingRefWarnings: warnings,
      allDiscountNotes: roomNotesMap
    };
  }, [shiftBookings, shiftManualDiscounts, noteCustomOverrides, deletedNoteIds]);

  // Helper: Extract display text whether item is string or note object
  const getText = (item) => {
    if (!item) return '';
    if (typeof item === 'string') return item;
    return item.text || '';
  };

  // Derived Auto Laser Print Text
  const autoLaserPrintText = useMemo(() => {
    if (allDiscountNotes.laser.length === 0) return 'No Laser Shooter notes.';
    return allDiscountNotes.laser.map((n, idx) => `${idx + 1}. ${getText(n)}`).join('\n\n');
  }, [allDiscountNotes]);

  // Derived Auto Escape Print Text
  const autoEscapePrintText = useMemo(() => {
    const blocks = [];
    if (allDiscountNotes.lockedIn.length > 0) {
      blocks.push(`*LOCKED IN*\n` + allDiscountNotes.lockedIn.map((n, i) => `${i + 1}. ${getText(n)}`).join('\n\n'));
    }
    if (allDiscountNotes.lab.length > 0) {
      blocks.push(`*PROFESSOR X'S LAB*\n` + allDiscountNotes.lab.map((n, i) => `${i + 1}. ${getText(n)}`).join('\n\n'));
    }
    if (allDiscountNotes.sherlock.length > 0) {
      blocks.push(`*SHERLOCK'S LAST CASE*\n` + allDiscountNotes.sherlock.map((n, i) => `${i + 1}. ${getText(n)}`).join('\n\n'));
    }
    if (allDiscountNotes.spy.length > 0) {
      blocks.push(`*SPY AGENTS*\n` + allDiscountNotes.spy.map((n, i) => `${i + 1}. ${getText(n)}`).join('\n\n'));
    }
    return blocks.length > 0 ? blocks.join('\n\n') : 'No Escape Room notes.';
  }, [allDiscountNotes]);

  // Construct Dynamic WhatsApp Closing Report Text
  const generatedWhatsAppReport = useMemo(() => {
    const formattedDate = formatDateDDMMYYYY(shiftDate);

    const pad2 = (val) => {
      const n = parseInt(val, 10);
      if (isNaN(n) || n === 0) return '00';
      return String(n).padStart(2, '0');
    };

    const formatExcess = (val) => {
      if (!val || String(val).trim() === '' || String(val).trim() === '0') return '00';
      const clean = String(val).trim();
      const n = parseInt(clean, 10);
      if (!isNaN(n) && n < 10 && n >= 0) {
        return String(n).padStart(2, '0');
      }
      return clean;
    };

    const formatNotesBlock = (customNote, autoNotes) => {
      const combined = [];
      if (customNote && customNote.trim()) {
        combined.push(customNote.trim());
      }
      autoNotes.forEach((n, idx) => {
        const t = getText(n);
        if (t) combined.push(`${idx + 1}. ${t}`);
      });
      if (combined.length === 0) {
        return 'Note:- ';
      }
      return `Note:- \n${combined.join('\n\n')}`;
    };

    const laserNotesText = formatNotesBlock(notes.laser, allDiscountNotes.laser);
    const lockedInNotesText = formatNotesBlock(notes.lockedIn, allDiscountNotes.lockedIn);
    const labNotesText = formatNotesBlock(notes.lab, allDiscountNotes.lab);
    const sherlockNotesText = formatNotesBlock(notes.sherlock, allDiscountNotes.sherlock);
    const spyNotesText = formatNotesBlock(notes.spy, allDiscountNotes.spy);

    const laserExcessVal = formatExcess(excessAmounts.laser);
    const escapeExcessVal = formatExcess(excessAmounts.escape !== undefined ? excessAmounts.escape : (excessAmounts.lab || ''));
    const staffNameUpper = (staffName || 'AASHUTOSH').trim().toUpperCase();

    return `*${formattedDate}*

*LASER SHOOTER SALES*
No: of sessions:- *${pad2(laserSessions)}*
Total Games: *${pad2(laserTotalGames)}*
10 mins games: *${pad2(laser10Min)}*
20 min games: *${pad2(laser20Min)}*
30 mins games: *${pad2(laser30Min)}*
Staff game: *${pad2(effectiveStaffGamesCount)}*
Complementary game: *${pad2(derivedComplementaryCountLaser)}*
Total sale:- *₹${laserTotalSale.toLocaleString()}/-*
Excess:- *${laserExcessVal}*
${laserNotesText}

Fog machine - OFF

*ESCAPE TIME SALES*
Excess:- *${escapeExcessVal}*

       *LOCKED IN*
No of sessions:- *${pad2(lockedInStats.sessions)}*
Total games :- *${pad2(lockedInStats.games)}*
Total sale:- ₹${lockedInStats.sale.toLocaleString()}/-
Complementary game: *${pad2(lockedInStats.complCount)}*
${lockedInNotesText}

       *PROFESSOR X'S LAB*
No of sessions:- *${pad2(labStats.sessions)}*
Total games :- *${pad2(labStats.games)}*
Total sale:- ₹${labStats.sale.toLocaleString()}/-
Complementary game: *${pad2(labStats.complCount)}*
${labNotesText}

       *SHERLOCK'S LAST CASE*
No of sessions:- *${pad2(sherlockStats.sessions)}*
Total games :- *${pad2(sherlockStats.games)}*
Total sale:- ₹${sherlockStats.sale.toLocaleString()}/-
Complementary game: *${pad2(sherlockStats.complCount)}*
${sherlockNotesText}

       *SPY AGENTS*
No of sessions:- *${pad2(spyStats.sessions)}*
Total games :- *${pad2(spyStats.games)}*
Total sale:- ₹${spyStats.sale.toLocaleString()}/-
Complementary game: *${pad2(spyStats.complCount)}*
${spyNotesText}


*Overall sale*:- *₹${overallSale.toLocaleString()}/-*
     *${staffNameUpper}*`;
  }, [
    shiftDate,
    laserSessions,
    laserTotalGames,
    laser10Min,
    laser20Min,
    laser30Min,
    effectiveStaffGamesCount,
    derivedComplementaryCountLaser,
    laserTotalSale,
    excessAmounts,
    notes,
    allDiscountNotes,
    lockedInStats,
    labStats,
    sherlockStats,
    spyStats,
    overallSale,
    staffName
  ]);

  const activeReportText = isManualEditMode ? customReportText : generatedWhatsAppReport;

  const handleCopyReport = () => {
    navigator.clipboard.writeText(activeReportText);
    setCopiedReport(true);
    setTimeout(() => setCopiedReport(false), 2500);
  };

  const handleCopyBucket = (managerName, bucketNotes) => {
    const text = `*${managerName} Reference (${formatDateDDMMYYYY(shiftDate)})*\n\n` + 
                 bucketNotes.map((n, idx) => `${idx + 1}. ${getText(n)}`).join('\n\n');
    navigator.clipboard.writeText(text);
    setCopiedBucket(managerName);
    setTimeout(() => setCopiedBucket(null), 2500);
  };

  // Note Edit and Delete Handlers
  const handleOpenEditNote = (noteItem) => {
    setEditingNoteItem(noteItem);
    setEditingNoteText(getText(noteItem));
  };

  const handleSaveEditedNote = async () => {
    if (!editingNoteItem) return;
    const trimmed = editingNoteText.trim();
    if (!trimmed) {
      // User cleared the note text completely! Remove note from closing report and clear from booking
      const nextDeleted = Array.from(new Set([...deletedNoteIds, editingNoteItem.id]));
      const nextOverrides = { ...noteCustomOverrides };
      delete nextOverrides[editingNoteItem.id];
      setDeletedNoteIds(nextDeleted);
      setNoteCustomOverrides(nextOverrides);
      persistUpdates({ deletedNoteIds: nextDeleted, noteCustomOverrides: nextOverrides });

      if (editingNoteItem.booking && onUpdateBooking) {
        try {
          await onUpdateBooking(editingNoteItem.booking.id, {
            customNote: '',
            customDiscountReason: '',
            notes: ''
          });
        } catch (e) {}
      }
      setEditingNoteItem(null);
      return;
    }

    const nextOverrides = {
      ...noteCustomOverrides,
      [editingNoteItem.id]: trimmed
    };
    setNoteCustomOverrides(nextOverrides);
    persistUpdates({ noteCustomOverrides: nextOverrides });
    setEditingNoteItem(null);
  };

  const handleResetNoteToDefault = () => {
    if (!editingNoteItem) return;
    const nextOverrides = { ...noteCustomOverrides };
    delete nextOverrides[editingNoteItem.id];
    setNoteCustomOverrides(nextOverrides);
    persistUpdates({ noteCustomOverrides: nextOverrides });
    setEditingNoteItem(null);
  };

  const handleOpenDeleteNote = (noteItem) => {
    setDeletingNoteItem(noteItem);
  };

  const handleConfirmDeleteFromReport = async () => {
    if (!deletingNoteItem) return;
    const nextDeleted = Array.from(new Set([...deletedNoteIds, deletingNoteItem.id]));
    setDeletedNoteIds(nextDeleted);
    persistUpdates({ deletedNoteIds: nextDeleted });

    if (deletingNoteItem.booking && onUpdateBooking) {
      try {
        await onUpdateBooking(deletingNoteItem.booking.id, {
          customNote: '',
          customDiscountReason: '',
          notes: ''
        });
      } catch (e) {}
    }
    setDeletingNoteItem(null);
  };

  const handleConfirmDeleteEntireBookingOrEntry = () => {
    if (!deletingNoteItem) return;
    if (deletingNoteItem.isManual && deletingNoteItem.manualEntry) {
      if (onDeleteManualDiscount) {
        onDeleteManualDiscount(deletingNoteItem.manualEntry.id);
      }
    } else if (deletingNoteItem.booking) {
      if (onDeleteBooking) {
        onDeleteBooking(deletingNoteItem.booking.id);
      }
    }
    setDeletingNoteItem(null);
  };

  const handleRestoreAllDeletedNotes = () => {
    setDeletedNoteIds([]);
    persistUpdates({ deletedNoteIds: [] });
  };

  // Direct Print Execution Function
  const executePrintWindow = (title, textContent) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>${title}</title>
          <style>
            body { font-family: 'Courier New', monospace; white-space: pre-wrap; padding: 24px; font-size: 14px; line-height: 1.6; color: #000; }
            h2 { margin-bottom: 16px; border-bottom: 2px solid #000; padding-bottom: 6px; }
          </style>
        </head>
        <body>
          <h2>${title}</h2>
          <div>${textContent.replace(/\n/g, '<br>')}</div>
          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const renderBucketNotesList = (notesList, emptyMessage) => {
    if (!notesList || notesList.length === 0) {
      return <p className="text-xs text-slate-400 italic">{emptyMessage}</p>;
    }

    return (
      <div className="space-y-2 font-sans">
        {notesList.map((noteItem, index) => {
          const text = getText(noteItem);
          const isEdited = noteItem.isEdited || Boolean(noteCustomOverrides[noteItem.id]);
          return (
            <div
              key={noteItem.id || index}
              className="group bg-white p-3 rounded-xl border border-slate-200 hover:border-indigo-300 shadow-2xs hover:shadow-xs transition-all flex items-start justify-between gap-2.5"
            >
              <div className="flex items-start gap-2 min-w-0 flex-1">
                <span className="font-mono font-bold text-[11px] text-slate-400 mt-0.5 shrink-0">
                  {index + 1}.
                </span>
                <div className="space-y-1 min-w-0 flex-1">
                  <p className="text-xs text-slate-800 font-medium whitespace-pre-line leading-relaxed">
                    {text}
                  </p>
                  {isEdited && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                      <Edit3 className="w-2.5 h-2.5" /> Edited note
                    </span>
                  )}
                </div>
              </div>

              {/* Action buttons: Edit (pencil) and Delete (trash) */}
              <div className="flex items-center gap-1 shrink-0 opacity-90 group-hover:opacity-100 transition-opacity">
                <button
                  type="button"
                  onClick={() => handleOpenEditNote(noteItem)}
                  className="p-1.5 rounded-lg text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 transition-all shadow-2xs cursor-pointer"
                  title="Edit note text"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenDeleteNote(noteItem)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 border border-slate-200 hover:border-red-200 transition-all shadow-2xs cursor-pointer"
                  title="Delete / remove note"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-4 sm:space-y-8">
      
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 p-4 sm:p-6 rounded-2xl text-white shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <FileText className="w-6 h-6 sm:w-7 sm:h-7 text-emerald-400" />
            <h1 className="text-xl sm:text-2xl font-black tracking-tight">Daily Closing Report (OCR Sales)</h1>
            <span className="bg-emerald-500/20 text-emerald-300 text-[10px] sm:text-xs font-mono font-bold px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full border border-emerald-500/30">
              Local Host Mode
            </span>
          </div>
          <p className="text-slate-300 text-xs sm:text-sm">
            Operational closing report, separate print features, and manager discount approval rules.
          </p>
        </div>

        {/* Shift Date Selector & Staff Selector */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 bg-white/10 backdrop-blur-md p-2 rounded-xl border border-white/10 w-full md:w-auto">
          <div className="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 bg-slate-900/60 rounded-lg">
            <CalendarIcon className="w-4 h-4 text-cyan-400" />
            <input
              type="date"
              value={shiftDate}
              onChange={(e) => {
                setShiftDate(e.target.value);
                setIsManualEditMode(false);
              }}
              className="bg-transparent text-white text-xs font-mono font-bold focus:outline-none cursor-pointer"
            />
          </div>

          {/* Predefined Staff Selector */}
          <div className="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 bg-slate-900/60 rounded-lg flex-1 sm:flex-none">
            <span className="text-xs text-slate-400 font-semibold">Staff:</span>
            <select
              value={selectedStaffOption}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedStaffOption(val);
                persistUpdates({ selectedStaffOption: val });
              }}
              className="bg-slate-900 text-white text-xs font-bold focus:outline-none border border-slate-700 rounded px-2 py-0.5 cursor-pointer w-full"
            >
              {PREDEFINED_STAFF_LIST.map(st => (
                <option key={st} value={st}>{st}</option>
              ))}
              <option value="custom">Custom Staff Name...</option>
            </select>

            {selectedStaffOption === 'custom' && (
              <input
                type="text"
                value={customStaffName}
                onChange={(e) => {
                  const val = e.target.value;
                  setCustomStaffName(val);
                  persistUpdates({ customStaffName: val });
                }}
                placeholder="Enter custom staff name..."
                className="bg-transparent text-white text-xs font-bold focus:outline-none w-36 border-b border-cyan-400 px-1"
              />
            )}
          </div>
        </div>
      </div>

      {/* Print Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
          <Printer className="w-4 h-4 text-indigo-600" />
          <span>Separate Closing Notes Printing:</span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (!isLaserPrintEdited) setCustomLaserPrintText(autoLaserPrintText);
              setPrintLaserModalOpen(true);
            }}
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-extrabold rounded-xl flex items-center gap-1.5 shadow-sm transition-all"
          >
            <Printer className="w-4 h-4" />
            Print Laser Notes
          </button>

          <button
            onClick={() => {
              if (!isEscapePrintEdited) setCustomEscapePrintText(autoEscapePrintText);
              setPrintEscapeModalOpen(true);
            }}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-extrabold rounded-xl flex items-center gap-1.5 shadow-sm transition-all"
          >
            <Printer className="w-4 h-4" />
            Print Escape Notes
          </button>
        </div>
      </div>

      {/* Payment Methods Breakdown Card */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-md space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Coins className="w-5 h-5 text-emerald-600" />
            <h2 className="text-base font-extrabold text-slate-900 tracking-tight">Shift Payment Breakdown</h2>
          </div>
          <span className="text-xs font-mono font-bold text-slate-500">
            All Channels
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {Object.entries(paymentBreakdown).map(([method, amount]) => (
            <div key={method} className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block truncate">
                {method}
              </span>
              <span className="text-base font-extrabold text-slate-900 font-mono block">
                ₹{amount.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Missing Reference Person Warning Banner */}
      {missingRefWarnings.length > 0 && (
        <div className="bg-amber-500/10 border-2 border-amber-500/30 rounded-2xl p-4 flex flex-col gap-3">
          <div className="flex items-center gap-2 text-amber-700 font-bold text-sm">
            <ShieldAlert className="w-5 h-5 text-amber-600" />
            <span>Missing Manager Reference ({missingRefWarnings.length} unapproved entry{missingRefWarnings.length > 1 ? 'ies' : ''})</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
            {missingRefWarnings.map(({ booking, message }, idx) => (
              <div key={idx} className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-amber-200">
                <span className="text-slate-800 font-medium">{message}</span>
                {booking && (
                  <button
                    onClick={() => onEditBooking(booking)}
                    className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-xs flex items-center gap-1 transition-all"
                  >
                    <Edit3 className="w-3 h-3" />
                    Assign
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Screenshot Attachment Rules Banner */}
      {(khajaBucket.length > 0 || onlineBucket.length > 0) && (
        <div className="bg-amber-500/10 border-2 border-amber-500/30 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white shadow-sm">
          <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
            <Camera className="w-5 h-5 text-amber-700 shrink-0" />
            <span>Closing Screenshot Attachment Rules Active Today:</span>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {khajaBucket.length > 0 && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-100 text-amber-950 border border-amber-300 font-black shadow-sm">
                <Camera className="w-3.5 h-3.5 text-amber-700" />
                Attach Khaja Sir Approval Screenshot ({khajaBucket.length} {khajaBucket.length === 1 ? 'entry' : 'entries'})
              </span>
            )}
            {onlineBucket.length > 0 && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-100 text-purple-950 border border-purple-300 font-black shadow-sm">
                <Camera className="w-3.5 h-3.5 text-purple-700" />
                Attach Online / District Screenshots ({onlineBucket.length} {onlineBucket.length === 1 ? 'entry' : 'entries'})
              </span>
            )}
          </div>
        </div>
      )}

      {/* Main Grid: Left Side Aggregations & Discount Builder, Right Side Report */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Laser Shooter Summary Card */}
          <div className="bg-white rounded-2xl p-6 border border-cyan-200 shadow-md space-y-4">
            <div className="flex items-center justify-between border-b border-cyan-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-cyan-500 animate-pulse" />
                <h2 className="text-base font-extrabold text-slate-900 tracking-tight">Laser Shooter Sales</h2>
              </div>
              <span className="text-xs font-extrabold font-mono text-cyan-700 bg-cyan-50 px-3 py-1 rounded-full border border-cyan-200 shadow-2xs">
                ₹{laserTotalSale.toLocaleString()} Total
              </span>
            </div>

            {/* Quick Metrics Overview Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-cyan-50/50 p-3 rounded-xl border border-cyan-100">
                <span className="text-xs font-bold text-slate-500 block uppercase">Paid Sessions</span>
                <span className="text-2xl font-black text-cyan-950 font-mono mt-1 block">{laserSessions}</span>
              </div>
              <div className="bg-cyan-50/50 p-3 rounded-xl border border-cyan-100">
                <span className="text-xs font-bold text-slate-500 block uppercase">Total Players</span>
                <span className="text-2xl font-black text-cyan-950 font-mono mt-1 block">{laserTotalGames}</span>
              </div>
              <div className="bg-cyan-50/50 p-3 rounded-xl border border-cyan-100">
                <span className="text-xs font-bold text-slate-500 block uppercase">Complimentary</span>
                <span className="text-2xl font-black text-cyan-950 font-mono mt-1 block">{derivedComplementaryCountLaser}</span>
              </div>
              <div className="bg-cyan-50/50 p-3 rounded-xl border border-cyan-100">
                <span className="text-xs font-bold text-slate-500 block uppercase">Staff Games</span>
                <input
                  type="number"
                  min="0"
                  value={staffGamesCount}
                  onChange={(e) => {
                    const count = Math.max(0, parseInt(e.target.value, 10) || 0);
                    setStaffGamesCount(count);
                    persistUpdates({ staffGamesCount: count });
                  }}
                  className="w-full bg-white border border-cyan-300 rounded text-lg font-bold font-mono px-2 py-0.5 mt-1 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
                <span className="text-xs font-extrabold text-slate-700 block">10 mins (Combat)</span>
                <span className="text-xl font-black text-slate-950 font-mono block mt-1">{laser10Min}</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
                <span className="text-xs font-extrabold text-slate-700 block">20 mins (Battle)</span>
                <span className="text-xl font-black text-slate-950 font-mono block mt-1">{laser20Min}</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
                <span className="text-xs font-extrabold text-slate-700 block">30 mins (War)</span>
                <span className="text-xl font-black text-slate-950 font-mono block mt-1">{laser30Min}</span>
              </div>
            </div>

            {/* Excess & Note Input */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Laser Excess (₹)</label>
                <input
                  type="text"
                  placeholder="e.g. 100"
                  value={excessAmounts.laser}
                  onChange={(e) => {
                    const val = e.target.value;
                    setExcessAmounts(prev => {
                      const next = { ...prev, laser: val };
                      persistUpdates({ excessAmounts: next });
                      return next;
                    });
                  }}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-cyan-500 font-semibold text-slate-900"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Laser Custom Note</label>
                <input
                  type="text"
                  placeholder="e.g. Fog machine off"
                  value={notes.laser}
                  onChange={(e) => {
                    const val = formatSentenceCaseInput(e.target.value);
                    setNotes(prev => {
                      const next = { ...prev, laser: val };
                      persistUpdates({ notes: next });
                      return next;
                    });
                  }}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-cyan-500 font-semibold text-slate-900"
                />
              </div>
            </div>

            {/* Pure Laser Shooter Payment Breakdown */}
            <div className="pt-3 border-t border-cyan-100 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-cyan-950 tracking-wide uppercase">
                  Laser Shooter Payment Breakdown
                </span>
                <span className="text-xs font-mono font-black text-cyan-800">
                  Total: ₹{Object.values(laserPaymentBreakdown).reduce((a, b) => a + b, 0).toLocaleString()}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                {Object.entries(laserPaymentBreakdown).map(([method, amount]) => (
                  <div key={method} className="bg-cyan-50/80 p-2.5 rounded-xl border border-cyan-200 shadow-2xs">
                    <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block truncate">
                      {method}
                    </span>
                    <span className="text-sm font-black text-cyan-950 font-mono block mt-0.5">
                      ₹{amount.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Escape Time Rooms Summary Card */}
          <div className="bg-white rounded-2xl p-6 border border-red-200 shadow-md space-y-4">
            <div className="flex items-center justify-between border-b border-red-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                <h2 className="text-base font-extrabold text-slate-900 tracking-tight">Escape Time Sales & Rooms</h2>
              </div>
              <span className="text-xs font-extrabold font-mono text-red-700 bg-red-50 px-3 py-1 rounded-full border border-red-200 shadow-2xs">
                ₹{(labStats.sale + lockedInStats.sale + sherlockStats.sale + spyStats.sale).toLocaleString()} Total
              </span>
            </div>

            {/* Escape Time Overall Excess (Populates at once under ESCAPE TIME SALES) */}
            <div className="p-3.5 bg-red-50/70 rounded-xl border border-red-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-black text-red-950 uppercase tracking-wide block">
                  Escape Time Overall Excess
                </span>
                <span className="text-[11px] text-slate-500 font-medium">
                  Populates at once under Escape Time Sales in closing message
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-600">₹</span>
                <input
                  type="text"
                  placeholder="00"
                  value={excessAmounts.escape !== undefined ? excessAmounts.escape : (excessAmounts.lab || '')}
                  onChange={(e) => {
                    const val = e.target.value;
                    setExcessAmounts(prev => {
                      const next = { ...prev, escape: val };
                      persistUpdates({ excessAmounts: next });
                      return next;
                    });
                  }}
                  className="w-28 text-center text-sm font-mono font-black text-slate-950 bg-white p-2 rounded-xl border border-red-300 focus:outline-none focus:ring-2 focus:ring-red-500 shadow-xs"
                />
              </div>
            </div>

            <div className="space-y-4">
              {[
                { name: "Locked In", key: 'lockedIn', stats: lockedInStats, bg: 'bg-amber-50/40', border: 'border-amber-100' },
                { name: "Professor X's Lab", key: 'lab', stats: labStats, bg: 'bg-red-50/40', border: 'border-red-100' },
                { name: "Sherlock's Last Case", key: 'sherlock', stats: sherlockStats, bg: 'bg-emerald-50/40', border: 'border-emerald-100' },
                { name: "Spy Agents", key: 'spy', stats: spyStats, bg: 'bg-cyan-50/40', border: 'border-cyan-100' }
              ].map(room => (
                <div key={room.key} className={`p-4 rounded-xl border ${room.border} ${room.bg} space-y-3`}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-black text-slate-950">{room.name}</span>
                    <span className="font-mono text-slate-950 font-black text-sm">₹{room.stats.sale.toLocaleString()}</span>
                  </div>

                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
                      <span className="text-[11px] text-slate-600 font-extrabold block uppercase tracking-wider">Sessions</span>
                      <span className="font-mono font-black text-lg sm:text-xl text-slate-950 block mt-0.5">{room.stats.sessions}</span>
                    </div>
                    <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
                      <span className="text-[11px] text-slate-600 font-extrabold block uppercase tracking-wider">Games</span>
                      <span className="font-mono font-black text-lg sm:text-xl text-slate-950 block mt-0.5">{room.stats.games}</span>
                    </div>
                    <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
                      <span className="text-[11px] text-slate-600 font-extrabold block uppercase tracking-wider">Compliment</span>
                      <span className="font-mono font-black text-lg sm:text-xl text-slate-950 block mt-0.5">{room.stats.complCount}</span>
                    </div>
                    <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
                      <span className="text-[11px] text-slate-600 font-extrabold block uppercase tracking-wider">Sale (₹)</span>
                      <span className="font-mono font-black text-lg sm:text-xl text-red-700 block mt-0.5">₹{room.stats.sale.toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 bg-white/90 p-2.5 rounded-xl border border-slate-200 shadow-2xs text-center sm:text-left">
                    <div className="text-xs font-bold text-slate-700">2–3 Players: <span className="font-mono font-black text-slate-950 text-sm ml-1">{room.stats.bracket2to3}</span></div>
                    <div className="text-xs font-bold text-slate-700">4–6 Players: <span className="font-mono font-black text-slate-950 text-sm ml-1">{room.stats.bracket4to6}</span></div>
                    <div className="text-xs font-bold text-slate-700">7+ Players: <span className="font-mono font-black text-slate-950 text-sm ml-1">{room.stats.bracket7plus}</span></div>
                  </div>

                  <div className="pt-1">
                    <input
                      type="text"
                      placeholder={`Custom note for ${room.name} (optional)...`}
                      value={notes[room.key] || ''}
                      onChange={(e) => {
                        const val = formatSentenceCaseInput(e.target.value);
                        setNotes(prev => {
                          const next = { ...prev, [room.key]: val };
                          persistUpdates({ notes: next });
                          return next;
                        });
                      }}
                      className="w-full text-xs p-2 rounded-xl border border-slate-200 bg-white/90 focus:bg-white focus:outline-none focus:ring-1 focus:ring-red-400 font-medium text-slate-900 placeholder:text-slate-400"
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Pure Escape Time Payment Breakdown */}
            <div className="pt-3 border-t border-red-100 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-red-950 tracking-wide uppercase">
                  Escape Time Payment Breakdown
                </span>
                <span className="text-xs font-mono font-black text-red-800">
                  Total: ₹{Object.values(escapePaymentBreakdown).reduce((a, b) => a + b, 0).toLocaleString()}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                {Object.entries(escapePaymentBreakdown).map(([method, amount]) => (
                  <div key={method} className="bg-red-50/80 p-2.5 rounded-xl border border-red-200 shadow-2xs">
                    <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block truncate">
                      {method}
                    </span>
                    <span className="text-sm font-black text-red-950 font-mono block mt-0.5">
                      ₹{amount.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Manager Approval Buckets Card */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-md space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-indigo-600" />
                <h2 className="text-base font-extrabold text-slate-900 tracking-tight">Manager Approval Note Buckets</h2>
              </div>
              <button
                onClick={() => {
                  setEditingDiscountEntry(null);
                  setIsDiscountModalOpen(true);
                }}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-extrabold flex items-center gap-1 transition-all shadow-sm"
              >
                <Plus className="w-4 h-4" />
                Add Discount Entry
              </button>
            </div>

            {/* List Manual Entries if any */}
            {shiftManualDiscounts.length > 0 && (
              <div className="bg-indigo-50/50 p-3.5 rounded-xl border border-indigo-100 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-indigo-950 block">
                    Manual Discount Entries ({shiftManualDiscounts.length})
                  </span>
                  <span className="text-[10px] text-slate-500 font-medium">Click pencil to edit any entry</span>
                </div>
                <div className="space-y-1.5 text-xs">
                  {shiftManualDiscounts.map(d => (
                    <div key={d.id} className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-indigo-200 shadow-2xs gap-2">
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-slate-900 font-extrabold capitalize">
                            {d.reason}
                          </span>
                          <span className="text-[11px] font-mono font-black text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                            {d.percentage === 'complementary' ? 'Complimentary' : d.percentage === 'custom' ? `${d.customPct}%` : `${d.percentage}%`}
                          </span>
                          <span className="text-[11px] font-bold text-slate-600">
                            Ref: <strong className="text-slate-900">{d.reference || 'None'}</strong>
                          </span>
                          <span className="text-[11px] font-mono text-slate-500">
                            Pax: {d.groupSizeVal || 1}
                          </span>
                        </div>
                        {d.customerName && (
                          <div className="text-[11px] text-slate-500">
                            Customer: <span className="font-semibold text-slate-700">{d.customerName}</span> {d.phone && `(${d.phone})`}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => {
                            setEditingDiscountEntry(d);
                            setIsDiscountModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 transition-colors"
                          title="Edit discount entry"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDeleteManualDiscount && onDeleteManualDiscount(d.id)}
                          className="p-1.5 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors"
                          title="Delete discount entry"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-4">
              {/* Optional Restore Banner for accidentally removed notes */}
              {deletedNoteIds.length > 0 && (
                <div className="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 shadow-2xs">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span><strong>{deletedNoteIds.length}</strong> note(s) removed from closing report</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleRestoreAllDeletedNotes}
                    className="px-2.5 py-1 bg-white hover:bg-amber-100 border border-amber-300 rounded-lg text-[11px] font-bold text-amber-900 flex items-center gap-1 shadow-2xs cursor-pointer transition-colors"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Restore All</span>
                  </button>
                </div>
              )}

              {/* Filter Tabs for Notes */}
              <div className="flex items-center gap-1.5 flex-wrap p-1.5 bg-slate-100 rounded-xl border border-slate-200 text-xs">
                <button
                  type="button"
                  onClick={() => setNotesFilterTab('all')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                    notesFilterTab === 'all' 
                      ? 'bg-indigo-600 text-white shadow-xs' 
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                  }`}
                >
                  All Shift Notes ({allNotes.length})
                </button>
                <button
                  type="button"
                  onClick={() => setNotesFilterTab('other')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                    notesFilterTab === 'other' 
                      ? 'bg-indigo-600 text-white shadow-xs' 
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                  }`}
                >
                  Custom & Staff ({otherBucket.length})
                </button>
                <button
                  type="button"
                  onClick={() => setNotesFilterTab('online')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                    notesFilterTab === 'online' 
                      ? 'bg-indigo-600 text-white shadow-xs' 
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                  }`}
                >
                  Online Bookings ({onlineBucket.length})
                </button>
                <button
                  type="button"
                  onClick={() => setNotesFilterTab('khaja')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                    notesFilterTab === 'khaja' 
                      ? 'bg-indigo-600 text-white shadow-xs' 
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                  }`}
                >
                  Khaja Sir ({khajaBucket.length})
                </button>
                <button
                  type="button"
                  onClick={() => setNotesFilterTab('nayeem')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                    notesFilterTab === 'nayeem' 
                      ? 'bg-indigo-600 text-white shadow-xs' 
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                  }`}
                >
                  Nayeem Sir ({nayeemBucket.length})
                </button>
                <button
                  type="button"
                  onClick={() => setNotesFilterTab('segregated')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                    notesFilterTab === 'segregated' 
                      ? 'bg-indigo-600 text-white shadow-xs' 
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                  }`}
                >
                  View All Buckets
                </button>
              </div>

              {/* View 1: ALL NOTES MASTER LIST */}
              {notesFilterTab === 'all' && (
                <div className="bg-slate-50 p-4 rounded-xl border border-indigo-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-xs text-slate-900">All Shift Notes (Click pencil to edit, trash to delete)</span>
                      <span className="bg-indigo-100 text-indigo-800 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border border-indigo-200">
                        {allNotes.length} total note{allNotes.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    {allNotes.length > 0 && (
                      <button
                        onClick={() => handleCopyBucket('All Shift Notes', allNotes)}
                        className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-all"
                      >
                        {copiedBucket === 'All Shift Notes' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedBucket === 'All Shift Notes' ? 'Copied' : 'Copy All'}</span>
                      </button>
                    )}
                  </div>
                  {renderBucketNotesList(allNotes, 'No notes recorded for this shift date.')}
                </div>
              )}

              {/* View 2: Specific filtered views or Segregated Buckets */}
              {(notesFilterTab === 'khaja' || notesFilterTab === 'segregated') && (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-xs text-slate-900">Khaja Sir Reference Bucket</span>
                      <span className="bg-slate-200 text-slate-800 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full">
                        {khajaBucket.length} note{khajaBucket.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    {khajaBucket.length > 0 && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleCopyBucket('Khaja Sir Reference', khajaBucket)}
                          className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-all"
                        >
                          {copiedBucket === 'Khaja Sir Reference' ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
                          <span>Share Khaja</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {khajaBucket.length > 0 && (
                    <div className="p-3 bg-amber-100 border border-amber-300 rounded-xl text-xs font-bold text-amber-950 flex items-center gap-2 shadow-sm">
                      <Camera className="w-4 h-4 text-amber-700 shrink-0" />
                      <span>📸 Mandatory Rule: Attach screenshot of Khaja Sir reference approval in closing message.</span>
                    </div>
                  )}

                  {renderBucketNotesList(khajaBucket, 'No notes for Khaja Sir today.')}
                </div>
              )}

              {(notesFilterTab === 'nayeem' || notesFilterTab === 'segregated') && (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-xs text-slate-900">Nayeem Sir Reference Bucket</span>
                      <span className="bg-slate-200 text-slate-800 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full">
                        {nayeemBucket.length} note{nayeemBucket.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    {nayeemBucket.length > 0 && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleCopyBucket('Nayeem Sir Reference', nayeemBucket)}
                          className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-all"
                        >
                          {copiedBucket === 'Nayeem Sir Reference' ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
                          <span>Share Nayeem</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {renderBucketNotesList(nayeemBucket, 'No notes for Nayeem Sir today.')}
                </div>
              )}

              {(notesFilterTab === 'online' || notesFilterTab === 'segregated') && (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-xs text-slate-900">Online (District / Website / Activity Kids) Bucket</span>
                      <span className="bg-slate-200 text-slate-800 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full">
                        {onlineBucket.length} note{onlineBucket.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    {onlineBucket.length > 0 && (
                      <button
                        onClick={() => handleCopyBucket('Online Bookings', onlineBucket)}
                        className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-all"
                      >
                        {copiedBucket === 'Online Bookings' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        {copiedBucket === 'Online Bookings' ? 'Copied' : 'Copy Notes'}
                      </button>
                    )}
                  </div>

                  {onlineBucket.length > 0 && (
                    <div className="p-3 bg-purple-100 border border-purple-300 rounded-xl text-xs font-bold text-purple-950 flex items-center gap-2 shadow-sm">
                      <Camera className="w-4 h-4 text-purple-700 shrink-0" />
                      <span>📸 Mandatory Rule: Attach booking / payment screenshots (District / Website / Activity Kids) in closing.</span>
                    </div>
                  )}

                  {renderBucketNotesList(onlineBucket, 'No online booking entries today.')}
                </div>
              )}

              {(notesFilterTab === 'other' || notesFilterTab === 'segregated') && (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-xs text-slate-900">Custom Discount & Staff Notes Bucket</span>
                      <span className="bg-slate-200 text-slate-800 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full">
                        {otherBucket.length} note{otherBucket.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    {otherBucket.length > 0 && (
                      <button
                        onClick={() => handleCopyBucket('Custom & Staff Notes', otherBucket)}
                        className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-all"
                      >
                        {copiedBucket === 'Custom & Staff Notes' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedBucket === 'Custom & Staff Notes' ? 'Copied' : 'Copy Notes'}</span>
                      </button>
                    )}
                  </div>
                  {renderBucketNotesList(otherBucket, 'No custom or staff discount notes for this shift.')}
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Right Column: WhatsApp Report Preview & Output (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-slate-900 text-slate-100 rounded-2xl p-6 border border-slate-800 shadow-2xl space-y-4 sticky top-24">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Send className="w-5 h-5 text-emerald-400" />
                <h2 className="text-base font-extrabold tracking-tight">WhatsApp Closing Report</h2>
              </div>
              
              <button
                onClick={handleCopyReport}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all shadow-lg active:scale-95"
              >
                {copiedReport ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copiedReport ? 'Copied to WhatsApp' : 'Copy Report'}</span>
              </button>
            </div>

            {/* Screenshot Attachment Reminders in WhatsApp Preview */}
            {(khajaBucket.length > 0 || onlineBucket.length > 0) && (
              <div className="space-y-2">
                {khajaBucket.length > 0 && (
                  <div className="p-3 bg-amber-500/20 border border-amber-500/40 rounded-xl text-xs text-amber-200 font-bold flex items-center gap-2.5">
                    <Camera className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>📸 Screenshot Rule: Attach screenshot(s) of Khaja Sir reference approval along with this closing message in WhatsApp!</span>
                  </div>
                )}
                {onlineBucket.length > 0 && (
                  <div className="p-3 bg-cyan-500/20 border border-cyan-500/40 rounded-xl text-xs text-cyan-200 font-bold flex items-center gap-2.5">
                    <Camera className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span>📸 Screenshot Rule: Attach booking / payment screenshots (District / Website / Activity Kids) along with this closing report!</span>
                  </div>
                )}
              </div>
            )}

            {/* Editable Text Area Preview */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Formatted Output Preview</span>
                <button
                  onClick={() => {
                    const nextMode = !isManualEditMode;
                    const nextText = nextMode ? (customReportText || generatedWhatsAppReport) : customReportText;
                    setIsManualEditMode(nextMode);
                    if (nextMode && !customReportText) {
                      setCustomReportText(generatedWhatsAppReport);
                    }
                    persistUpdates({ isManualEditMode: nextMode, customReportText: nextText });
                  }}
                  className="text-cyan-400 hover:underline flex items-center gap-1 font-semibold"
                >
                  <Edit3 className="w-3 h-3" />
                  {isManualEditMode ? 'Auto Sync Mode' : 'Manual Edit Mode'}
                </button>
              </div>

              <textarea
                readOnly={!isManualEditMode}
                value={activeReportText}
                onChange={(e) => {
                  const val = e.target.value;
                  setCustomReportText(val);
                  persistUpdates({ customReportText: val });
                }}
                rows={22}
                className="w-full bg-slate-950 text-emerald-300 font-mono text-xs p-4 rounded-xl border border-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 leading-relaxed resize-none shadow-inner"
              />
            </div>

            <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1">
              <span>Overall Shift Revenue:</span>
              <span className="font-mono font-extrabold text-emerald-400 text-sm">
                ₹{overallSale.toLocaleString()}/-
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* Discount Entry Modal */}
      <DiscountEntryModal
        isOpen={isDiscountModalOpen}
        initialEntry={editingDiscountEntry}
        onClose={() => {
          setIsDiscountModalOpen(false);
          setEditingDiscountEntry(null);
        }}
        onAddDiscount={(entry) => {
          onAddManualDiscount && onAddManualDiscount({ 
            ...entry, 
            id: editingDiscountEntry?.id || entry.id,
            date: editingDiscountEntry?.date || shiftDate 
          });
          setEditingDiscountEntry(null);
        }}
      />

      {/* Laser Shooter Print Modal */}
      {printLaserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-cyan-600" />
                <h3 className="text-lg font-black text-slate-900">Laser Shooter Notes Print Preview</h3>
              </div>
              <button onClick={() => setPrintLaserModalOpen(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-600">Editable Laser Notes</span>
                {isLaserPrintEdited && (
                  <button
                    onClick={() => {
                      setCustomLaserPrintText(autoLaserPrintText);
                      setIsLaserPrintEdited(false);
                    }}
                    className="text-indigo-600 hover:underline flex items-center gap-1 font-bold"
                  >
                    <RotateCcw className="w-3 h-3" /> Revert to Auto
                  </button>
                )}
              </div>
              <textarea
                rows={10}
                value={customLaserPrintText}
                onChange={(e) => {
                  setCustomLaserPrintText(e.target.value);
                  setIsLaserPrintEdited(true);
                }}
                className="w-full bg-slate-950 text-cyan-300 font-mono text-xs p-4 rounded-xl border border-slate-800 leading-relaxed"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setPrintLaserModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  executePrintWindow("Laser Shooter Discounts", customLaserPrintText);
                  setPrintLaserModalOpen(false);
                }}
                className="px-5 py-2 text-xs font-extrabold text-white bg-cyan-600 hover:bg-cyan-700 rounded-xl flex items-center gap-1.5 shadow"
              >
                <Printer className="w-4 h-4" /> Print Laser Notes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Escape Room Print Modal */}
      {printEscapeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-red-600" />
                <h3 className="text-lg font-black text-slate-900">Escape Room Notes Print Preview</h3>
              </div>
              <button onClick={() => setPrintEscapeModalOpen(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-600">Editable Escape Notes (Segregated by Room)</span>
                {isEscapePrintEdited && (
                  <button
                    onClick={() => {
                      setCustomEscapePrintText(autoEscapePrintText);
                      setIsEscapePrintEdited(false);
                    }}
                    className="text-indigo-600 hover:underline flex items-center gap-1 font-bold"
                  >
                    <RotateCcw className="w-3 h-3" /> Revert to Auto
                  </button>
                )}
              </div>
              <textarea
                rows={12}
                value={customEscapePrintText}
                onChange={(e) => {
                  setCustomEscapePrintText(e.target.value);
                  setIsEscapePrintEdited(true);
                }}
                className="w-full bg-slate-950 text-red-300 font-mono text-xs p-4 rounded-xl border border-slate-800 leading-relaxed"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setPrintEscapeModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  executePrintWindow("Escape Time Discounts", customEscapePrintText);
                  setPrintEscapeModalOpen(false);
                }}
                className="px-5 py-2 text-xs font-extrabold text-white bg-red-600 hover:bg-red-700 rounded-xl flex items-center gap-1.5 shadow"
              >
                <Printer className="w-4 h-4" /> Print Escape Notes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Note Modal */}
      {editingNoteItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
                  <Edit3 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 tracking-tight">Edit Closing Report Note</h3>
                  <p className="text-[11px] text-slate-500 font-medium">Updates closing message and buckets in real-time</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingNoteItem(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 block">Note Text</label>
                <button
                  type="button"
                  onClick={() => setEditingNoteText('')}
                  className="text-[11px] text-red-600 hover:text-red-700 font-bold hover:underline cursor-pointer"
                >
                  Clear Note Text
                </button>
              </div>
              <textarea
                rows={5}
                value={editingNoteText}
                onChange={(e) => setEditingNoteText(formatSentenceCaseInput(e.target.value))}
                placeholder="Edit note text (or leave empty and click Save to remove it completely)..."
                className="w-full text-xs p-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-900 leading-relaxed shadow-xs"
              />
              {editingNoteItem.isEdited && (
                <p className="text-[11px] text-amber-700 font-medium">
                  Original: <span className="italic">{editingNoteItem.originalText}</span>
                </p>
              )}
            </div>

            {/* Linked Booking / Manual Entry Info */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-xs text-slate-600">
              <div className="font-bold text-slate-800 flex items-center justify-between">
                <span>Source: {editingNoteItem.isManual ? 'Manual Discount Entry' : 'Booking'}</span>
                <span className="font-mono text-[11px] text-slate-500">ID: {editingNoteItem.id}</span>
              </div>
              {editingNoteItem.booking && (
                <p className="text-[11px] text-slate-600">
                  Customer: <strong className="text-slate-800">{editingNoteItem.booking.customerName || 'N/A'}</strong> • Pax: {editingNoteItem.booking.paxCount} • Game: {editingNoteItem.booking.gameName}
                </p>
              )}
              {editingNoteItem.manualEntry && (
                <p className="text-[11px] text-slate-600">
                  Reason: <strong className="text-slate-800">{editingNoteItem.manualEntry.reason}</strong> • Ref: {editingNoteItem.manualEntry.reference}
                </p>
              )}
            </div>

            {/* Footer Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2 border-t border-slate-100">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                {editingNoteItem.isEdited && (
                  <button
                    type="button"
                    onClick={handleResetNoteToDefault}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Reset
                  </button>
                )}
                {editingNoteItem.booking && onEditBooking && (
                  <button
                    type="button"
                    onClick={() => {
                      const b = editingNoteItem.booking;
                      setEditingNoteItem(null);
                      onEditBooking(b);
                    }}
                    className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    Edit Full Booking
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => setEditingNoteItem(null)}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveEditedNote}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-extrabold shadow-sm transition-all cursor-pointer"
                >
                  Save Note
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete / Remove Note Confirmation Modal */}
      {deletingNoteItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center text-red-600">
                  <Trash2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 tracking-tight">Delete / Remove Note</h3>
                  <p className="text-[11px] text-slate-500 font-medium">Choose how you want to handle this note</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDeletingNoteItem(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 space-y-1 font-medium">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Note:</span>
              <p className="whitespace-pre-line leading-relaxed italic text-slate-800">"{getText(deletingNoteItem)}"</p>
            </div>

            <div className="space-y-2 pt-1">
              {/* Option 1: Remove from Closing Report Only */}
              <button
                type="button"
                onClick={handleConfirmDeleteFromReport}
                className="w-full p-3 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl text-left transition-all cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-amber-950">Remove from Closing Report Only</span>
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-200/60 px-2 py-0.5 rounded">Safe</span>
                </div>
                <p className="text-[11px] text-amber-800 mt-0.5 font-medium">
                  Removes this note from closing message and buckets, but keeps booking safe in CRM.
                </p>
              </button>

              {/* Option 2: Delete entire booking or manual discount */}
              {((deletingNoteItem.booking && onDeleteBooking) || (deletingNoteItem.manualEntry && onDeleteManualDiscount)) && (
                <button
                  type="button"
                  onClick={handleConfirmDeleteEntireBookingOrEntry}
                  className="w-full p-3 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl text-left transition-all cursor-pointer"
                >
                  <span className="text-xs font-black text-red-950 block">
                    {deletingNoteItem.isManual ? 'Delete Discount Entry Completely' : 'Delete Entire Booking from CRM'}
                  </span>
                  <p className="text-[11px] text-red-800 mt-0.5 font-medium">
                    Permanently removes this {deletingNoteItem.isManual ? 'discount entry' : 'booking'} from CRM database.
                  </p>
                </button>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeletingNoteItem(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
