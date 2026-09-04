import React, { useState, useEffect } from 'react';
import { VENUES } from './config/venueData';
import { 
  subscribeBookings, 
  saveBooking, 
  updateBooking, 
  deleteBooking, 
  resetAllBookings,
  getLocalBookings,
  deduplicateBookings
} from './config/firebase';
import { Navbar } from './components/Navbar';
import { LoginView } from './components/LoginView';
import { VenueSelectionView } from './components/VenueSelectionView';
import { CalendarDashboard } from './components/CalendarDashboard';
import { SalesDashboard } from './components/SalesDashboard';
import { BookingModal } from './components/BookingModal';
import { BookingDetailModal } from './components/BookingDetailModal';

export function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return localStorage.getItem('crm_logged_in') === 'true';
  });

  const [currentView, setCurrentView] = useState(() => {
    const savedLoggedIn = localStorage.getItem('crm_logged_in') === 'true';
    const savedView = localStorage.getItem('crm_current_view');
    if (!savedLoggedIn) return 'login';
    return savedView || 'venue_select';
  });

  const [activeVenue, setActiveVenue] = useState(() => {
    return localStorage.getItem('crm_active_venue') || VENUES.ESCAPE_TIME;
  });

  const [bookings, setBookings] = useState(() => deduplicateBookings(getLocalBookings()));

  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [selectedSlotInfo, setSelectedSlotInfo] = useState({});
  const [editingBooking, setEditingBooking] = useState(null);
  const [inspectBooking, setInspectBooking] = useState(null);

  useEffect(() => {
    localStorage.setItem('crm_logged_in', isLoggedIn ? 'true' : 'false');
    if (isLoggedIn) {
      localStorage.setItem('crm_current_view', currentView);
      localStorage.setItem('crm_active_venue', activeVenue);
    }
  }, [isLoggedIn, currentView, activeVenue]);

  // Subscribe to real-time sync with automatic deduplication
  useEffect(() => {
    const unsubscribe = subscribeBookings((data) => {
      setBookings(deduplicateBookings(data));
    });
    return () => unsubscribe();
  }, []);

  const handleLoginSuccess = () => {
    setIsLoggedIn(true);
    setCurrentView('venue_select');
    localStorage.setItem('crm_logged_in', 'true');
    localStorage.setItem('crm_current_view', 'venue_select');
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentView('login');
    localStorage.removeItem('crm_logged_in');
    localStorage.removeItem('crm_current_view');
  };

  const handleSelectVenue = (venue) => {
    setActiveVenue(venue);
    setCurrentView('calendar');
    localStorage.setItem('crm_active_venue', venue);
    localStorage.setItem('crm_current_view', 'calendar');
  };

  const handleOpenNewBookingModal = (date, timeSlot) => {
    setEditingBooking(null);
    setSelectedSlotInfo({ date, timeSlot });
    setIsBookingModalOpen(true);
  };

  const handleOpenEditBookingModal = (booking) => {
    setEditingBooking(booking);
    setActiveVenue(booking.venue || activeVenue);
    setIsBookingModalOpen(true);
  };

  // Clean single save/update - zero duplication!
  const handleSaveOrUpdateBooking = (bookingPayload, bookingId) => {
    if (bookingId) {
      updateBooking(bookingId, bookingPayload);
    } else {
      saveBooking(bookingPayload);
    }
    // Update local React state with deduplication
    setBookings(deduplicateBookings(getLocalBookings()));
  };

  const handleDeleteBooking = (bookingId) => {
    deleteBooking(bookingId);
    setBookings(deduplicateBookings(getLocalBookings()));
  };

  const handleResetAllBookings = () => {
    resetAllBookings();
    setBookings([]);
  };

  if (!isLoggedIn || currentView === 'login') {
    return <LoginView onLoginSuccess={handleLoginSuccess} />;
  }

  if (currentView === 'venue_select') {
    return <VenueSelectionView onSelectVenue={handleSelectVenue} />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-slate-950">
      
      {/* Navbar */}
      <Navbar
        currentView={currentView}
        setCurrentView={(view) => {
          setCurrentView(view);
          localStorage.setItem('crm_current_view', view);
        }}
        activeVenue={activeVenue}
        setActiveVenue={(venue) => {
          setActiveVenue(venue);
          localStorage.setItem('crm_active_venue', venue);
        }}
        onLogout={handleLogout}
        onOpenBookingModal={() => handleOpenNewBookingModal()}
      />

      {/* Main View */}
      <main className="flex-1">
        {currentView === 'calendar' && (
          <CalendarDashboard
            activeVenue={activeVenue}
            bookings={bookings}
            onSelectSlot={(date, slot) => handleOpenNewBookingModal(date, slot)}
            onSelectBooking={(b) => setInspectBooking(b)}
            onEditBooking={(b) => handleOpenEditBookingModal(b)}
            onDeleteBooking={handleDeleteBooking}
          />
        )}

        {currentView === 'sales' && (
          <SalesDashboard
            bookings={bookings}
            onSelectBooking={(b) => setInspectBooking(b)}
            onEditBooking={(b) => handleOpenEditBookingModal(b)}
            onDeleteBooking={handleDeleteBooking}
            onResetAllBookings={handleResetAllBookings}
          />
        )}
      </main>

      {/* Booking Modal */}
      <BookingModal
        isOpen={isBookingModalOpen}
        onClose={() => {
          setIsBookingModalOpen(false);
          setEditingBooking(null);
        }}
        activeVenue={activeVenue}
        initialSlot={selectedSlotInfo}
        editingBooking={editingBooking}
        onSubmitBooking={handleSaveOrUpdateBooking}
      />

      {/* Inspection Modal */}
      <BookingDetailModal
        booking={inspectBooking}
        onClose={() => setInspectBooking(null)}
        onDeleteBooking={handleDeleteBooking}
      />

    </div>
  );
}

export default App;
