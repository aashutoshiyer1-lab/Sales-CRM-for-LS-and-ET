import { VENUES, isWeekend, OFFERS } from '../config/venueData';

export const calculatePricing = ({
  venue,
  gameName,
  paxCount,
  date,
  offerId = 'none',
  rateModeOverride = null,
  customDiscountPercentage = 0,
  customDiscountReason = ''
}) => {
  const pax = Math.max(0, parseInt(paxCount, 10) || 0);
  const weekend = rateModeOverride ? (rateModeOverride === 'weekend') : isWeekend(date);

  let ratePerPax = 0;
  let tierLabel = '';

  if (pax > 0 && gameName && gameName !== '') {
    if (venue === VENUES.ESCAPE_TIME) {
      if (gameName === 'Locked In' || gameName === "Professor X's Lab") {
        if (pax <= 3) {
          ratePerPax = weekend ? 1099 : 999;
          tierLabel = '2-3 Players Category';
        } else if (pax <= 6) {
          ratePerPax = weekend ? 999 : 899;
          tierLabel = '4-6 Players Category';
        } else {
          ratePerPax = weekend ? 899 : 799;
          tierLabel = '7+ Players Category';
        }
      } else if (gameName === "Sherlock's Last Case") {
        if (pax <= 3) {
          ratePerPax = weekend ? 1199 : 1099;
          tierLabel = '2-3 Players Category';
        } else if (pax <= 6) {
          ratePerPax = weekend ? 1099 : 999;
          tierLabel = '4-6 Players Category';
        } else {
          ratePerPax = weekend ? 999 : 899;
          tierLabel = '7+ Players Category';
        }
      } else if (gameName === 'Spy Agents') {
        if (pax <= 3) {
          ratePerPax = weekend ? 499 : 449;
          tierLabel = '2-3 Players Category';
        } else if (pax <= 6) {
          ratePerPax = weekend ? 449 : 429;
          tierLabel = '4-6 Players Category';
        } else {
          ratePerPax = weekend ? 429 : 399;
          tierLabel = '7+ Players Category';
        }
      }
    } else if (venue === VENUES.LASER_SHOOTER) {
      tierLabel = 'Flat Rate Arena';
      if (gameName === 'Combat') {
        ratePerPax = weekend ? 269 : 199;
      } else if (gameName === 'Battle') {
        ratePerPax = weekend ? 369 : 299;
      } else if (gameName === 'War') {
        ratePerPax = weekend ? 469 : 399;
      }
    }
  }

  const baseTotal = ratePerPax * pax;

  const selectedOffer = OFFERS.find(o => o.id === offerId) || OFFERS[0];
  let discountPercentage = selectedOffer.percentage || 0;
  if (offerId === 'custom_discount') {
    discountPercentage = Math.min(100, Math.max(0, parseInt(customDiscountPercentage, 10) || 0));
  }
  
  // Round total amount to nearest whole integer (.5 rounds up to next integer e.g., 3496.5 -> 3497)
  const finalTotalAmount = Math.max(0, Math.round(baseTotal * (1 - discountPercentage / 100)));
  const discountAmount = baseTotal - finalTotalAmount;

  return {
    ratePerPax,
    pax,
    baseTotal,
    discountPercentage,
    discountAmount,
    totalAmount: finalTotalAmount,
    tierLabel: tierLabel || 'Select Game & Players',
    isWeekend: weekend,
    dayType: weekend ? 'Weekend Rate' : 'Weekday Rate',
    offerName: offerId === 'custom_discount' && customDiscountReason ? customDiscountReason : selectedOffer.name,
    offerId: selectedOffer.id,
    customDiscountReason: offerId === 'custom_discount' ? customDiscountReason : '',
  };
};

export const getBookingCategory = (booking, allBookings = []) => {
  if (!booking) return '2-3';
  if (booking.venue === VENUES.LASER_SHOOTER) return 'laser';

  // 1. Explicit Category Override
  if (booking.categoryOverride) {
    if (booking.categoryOverride === '2-3' || booking.categoryOverride.includes('2-3')) return '2-3';
    if (booking.categoryOverride === '4-6' || booking.categoryOverride.includes('4-6')) return '4-6';
    if (booking.categoryOverride === '7+' || booking.categoryOverride.includes('7+')) return '7+';
    return booking.categoryOverride;
  }
  if (booking.customCategory) {
    if (booking.customCategory.includes('2-3')) return '2-3';
    if (booking.customCategory.includes('4-6')) return '4-6';
    if (booking.customCategory.includes('7+')) return '7+';
  }

  // 2. Complimentary Game Automatic Bracket Inheritance
  const isComplimentary = 
    booking.offerId === 'complimentary' || 
    booking.totalAmount === 0 || 
    (booking.offerName || '').toLowerCase().includes('complimentary');

  if (isComplimentary && Array.isArray(allBookings) && allBookings.length > 0) {
    // Look for a paid sibling booking in the same room & timeSlot (or matching customer)
    const siblingPaidBooking = allBookings.find(b => 
      b.id !== booking.id &&
      b.status !== 'Cancelled' &&
      b.date === booking.date &&
      b.venue === VENUES.ESCAPE_TIME &&
      (Number(b.totalAmount) > 0 || (b.offerId !== 'complimentary' && !((b.offerName || '').toLowerCase().includes('complimentary')))) &&
      (
        (b.timeSlot && booking.timeSlot && b.timeSlot === booking.timeSlot && b.gameName === booking.gameName) ||
        (b.phone && booking.phone && b.phone === booking.phone && b.phone.length > 5) ||
        (b.customerName && booking.customerName && b.customerName.trim().toLowerCase() === booking.customerName.trim().toLowerCase() && b.customerName.trim().length > 2)
      )
    );

    if (siblingPaidBooking) {
      // Inherit the sibling's category
      return getBookingCategory(siblingPaidBooking, []);
    }
  }

  // 3. Fallback based on pax count
  const pax = Number(booking.paxCount) || 0;
  if (pax >= 7) return '7+';
  if (pax >= 4) return '4-6';
  if (pax >= 2) return '2-3';
  
  // If pax is 1 and it's a complimentary game, default to '4-6' as escape room groups are normally 4-6 players
  if (isComplimentary) return '4-6';
  return '2-3';
};

export const getGameCategoryLabel = (booking, allBookings = []) => {
  if (!booking) return '';
  if (booking.venue === VENUES.LASER_SHOOTER) {
    return 'Flat Rate Arena';
  }
  const cat = getBookingCategory(booking, allBookings);
  if (cat === '2-3') return '2-3 Players Category';
  if (cat === '4-6') return '4-6 Players Category';
  if (cat === '7+') return '7+ Players Category';
  return `${cat} Players Category`;
};

