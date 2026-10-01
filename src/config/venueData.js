export const VENUES = {
  ESCAPE_TIME: 'Escape Time',
  LASER_SHOOTER: 'Laser Shooter',
};

export const PAYMENT_METHODS = [
  'Cash',
  'Card',
  'UPI-New Pay',
  'Prepaid by District',
  'Razorpay (Website Bookings)',
  'Activity Kids',
];

export const OFFERS = [
  { id: 'none', name: 'No Discount (Standard Rate)', percentage: 0 },
  { id: 'high_price_retention', name: 'Customer Going back due to high prices (10% OFF)', percentage: 10 },
  { id: 'birthday_package', name: 'Birthday Package (10% OFF)', percentage: 10 },
  { id: 'corporate_package', name: 'Corporate Package (15% OFF)', percentage: 15 },
  { id: 'second_game', name: 'Second Game Special (20% OFF)', percentage: 20 },
  { id: 'cross_promotion', name: 'Cross Promotion Coupon (30% OFF)', percentage: 30 },
  { id: 'cross_promotion_brochure', name: 'Cross Promotion Brochure (30% OFF)', percentage: 30 },
  { id: 'district_app', name: 'District App (Prepaid by District)', percentage: 0 },
  { id: 'website_booking', name: 'Website Booking (Razorpay)', percentage: 0 },
  { id: 'complimentary', name: 'Complimentary Game (Kids Under 5 Years - 100% OFF)', percentage: 100 },
];

export const REFERENCES = [
  'Khaja Sir',
  'Nayeem Sir'
];

export const VENUE_DETAILS = {
  [VENUES.ESCAPE_TIME]: {
    id: 'escape_time',
    name: 'Escape Time',
    tagline: 'Can You Escape in Time? Unravel Mysteries, Decode Clues.',
    theme: {
      primary: '#dc2626',
      accent: '#f59e0b',
      gradient: 'from-amber-600/30 via-red-950/60 to-slate-950',
      cardBg: 'bg-red-950/90 border-amber-500/60 hover:border-amber-400',
      badgeBg: 'bg-red-950 text-amber-300 border border-amber-500/60',
      glow: 'shadow-[0_0_30px_rgba(220,38,38,0.3)]',
    },
    games: [
      { id: 'locked_in', name: 'Locked In', duration: 60, type: 'Escape Room' },
      { id: 'prof_x', name: "Professor X's Lab", duration: 60, type: 'Sci-Fi Escape' },
      { id: 'sherlock', name: "Sherlock's Last Case", duration: 75, type: 'Mystery Room' },
      { id: 'spy_agents', name: 'Spy Agents', duration: 30, type: 'Action Quest' },
    ]
  },
  [VENUES.LASER_SHOOTER]: {
    id: 'laser_shooter',
    name: 'Laser Shooter',
    tagline: 'High-Tech Laser Tag Arena. Gear Up, Aim Fast, Outsmart Foes.',
    theme: {
      primary: '#06b6d4',
      accent: '#10b981',
      gradient: 'from-cyan-900/30 via-slate-950 to-emerald-950/40',
      cardBg: 'bg-cyan-950/90 border-cyan-500/60 hover:border-cyan-400',
      badgeBg: 'bg-cyan-950 text-cyan-300 border border-cyan-500/60',
      glow: 'shadow-[0_0_30px_rgba(6,182,212,0.3)]',
    },
    games: [
      { id: 'combat', name: 'Combat', duration: 10, type: 'Laser Arena' },
      { id: 'battle', name: 'Battle', duration: 20, type: 'Laser Arena' },
      { id: 'war', name: 'War', duration: 30, type: 'Laser Arena' },
    ]
  }
};

export const getPriceOverrides = () => {
  try {
    const raw = localStorage.getItem('crm_price_overrides');
    if (!raw || raw === 'undefined' || raw === 'null') return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch (e) {
    return {};
  }
};

export const savePriceOverride = (dateString, mode) => {
  if (!dateString) return;
  try {
    const formattedDate = String(dateString).split('T')[0];
    const current = getPriceOverrides();
    current[formattedDate] = mode; // 'weekday' or 'weekend'
    localStorage.setItem('crm_price_overrides', JSON.stringify(current));
    window.dispatchEvent(new CustomEvent('crm_price_override_updated', { detail: { date: formattedDate, mode } }));
  } catch (e) {
    console.error('Failed to save price override:', e);
  }
};

export const isWeekend = (dateString) => {
  if (!dateString) return false;
  try {
    const formattedDate = String(dateString).split('T')[0];
    const overrides = getPriceOverrides() || {};
    
    if (overrides && overrides[formattedDate]) {
      return overrides[formattedDate] === 'weekend';
    }

    const parts = formattedDate.split('-');
    if (parts.length < 3) return false;
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    
    if (isNaN(year) || isNaN(month) || isNaN(day)) return false;
    const d = new Date(year, month, day);
    const dayOfWeek = d.getDay();
    return dayOfWeek === 0 || dayOfWeek === 6;
  } catch (e) {
    return false;
  }
};

export const getOperatingHours = (dateString) => {
  const weekend = isWeekend(dateString);
  if (weekend) {
    return {
      start: '10:30',
      end: '23:00',
      startMinutes: 10 * 60 + 30,
      endMinutes: 23 * 60,
      label: '10:30 AM – 11:00 PM (Weekend)',
      isWeekend: true
    };
  }
  return {
    start: '11:00',
    end: '22:00',
    startMinutes: 11 * 60,
    endMinutes: 22 * 60,
    label: '11:00 AM – 10:00 PM (Weekday)',
    isWeekend: false
  };
};
