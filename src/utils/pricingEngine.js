import { VENUES, isWeekend, OFFERS } from '../config/venueData';

export const calculatePricing = ({ venue, gameName, paxCount, date, offerId = 'none' }) => {
  const pax = Math.max(0, parseInt(paxCount, 10) || 0);
  const weekend = isWeekend(date);

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
  const discountPercentage = selectedOffer.percentage || 0;
  
  // 100% OFF for Complimentary Game (Kids Under 6 Years)
  const discountAmount = Math.round((baseTotal * discountPercentage) / 100);
  const finalTotalAmount = Math.max(0, baseTotal - discountAmount);

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
    offerName: selectedOffer.name,
    offerId: selectedOffer.id,
  };
};

export const getGameCategoryLabel = (booking) => {
  if (!booking) return '';
  if (booking.venue === VENUES.LASER_SHOOTER) {
    return 'Flat Rate Arena';
  }
  const pax = Number(booking.paxCount) || 0;
  if (pax <= 3) return '2-3 Players Category';
  if (pax <= 6) return '4-6 Players Category';
  return '7+ Players Category';
};

