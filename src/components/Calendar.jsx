import React, { useState, useMemo, useCallback } from 'react';
import Modal from './Modal';

const getTripStatus = (t, todayStr) => {
  if (t.status) return t.status;
  if (t.date < todayStr) return 'completed';
  if (t.date === todayStr) return 'ongoing';
  return 'scheduled';
};

export default function Calendar({ trips }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Filter States
  const [vehicleFilter, setVehicleFilter] = useState('');
  const [driverFilter, setDriverFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  
  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedDateIso, setSelectedDateIso] = useState('');

  // Extract unique vehicles and drivers for the filter dropdowns
  const uniqueVehicles = useMemo(() => {
    const vSet = new Set(trips.map(t => t.vehicle).filter(Boolean));
    return [...vSet].sort();
  }, [trips]);

  const uniqueDrivers = useMemo(() => {
    const dSet = new Set(trips.map(t => t.driver).filter(Boolean));
    return [...dSet].sort();
  }, [trips]);

  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const goToToday = useCallback(() => setCurrentDate(new Date()), []);

  // Filtered trips for rendering on the calendar
  const filteredTrips = useMemo(() => {
    return trips.filter(t => {
      const matchVeh = !vehicleFilter || t.vehicle === vehicleFilter;
      const matchDrv = !driverFilter || t.driver === driverFilter;
      
      const tripStatusVal = getTripStatus(t, todayStr);
      const matchStatus = !statusFilter || tripStatusVal === statusFilter;
      
      return matchVeh && matchDrv && matchStatus;
    });
  }, [trips, vehicleFilter, driverFilter, statusFilter, todayStr]);

  const shiftMonth = (n) => {
    setCurrentDate(prev => {
      const newD = new Date(prev);
      newD.setMonth(newD.getMonth() + n);
      return newD;
    });
  };

  const monthLabel = currentDate.toLocaleDateString('en-PH', { month: 'long', year: 'numeric' });
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Calendar cells generation
  const cells = useMemo(() => {
    const firstDayOfMonth = new Date(year, month, 1);
    const startDow = firstDayOfMonth.getDay(); // 0 is Sunday, 6 is Saturday
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();

    let grid = [];

    // Trailing days of previous month
    for (let i = startDow - 1; i >= 0; i--) {
      grid.push({
        dayNumber: prevMonthDays - i,
        isOtherMonth: true,
      });
    }

    // Days of current month
    for (let d = 1; d <= daysInMonth; d++) {
      const dayStr = String(d).padStart(2, '0');
      const monthStr = String(month + 1).padStart(2, '0');
      const isoDate = `${year}-${monthStr}-${dayStr}`;
      grid.push({
        dayNumber: d,
        isOtherMonth: false,
        isoDate
      });
    }

    // Leading days of next month to fill grid
    let nextMonthDay = 1;
    while (grid.length % 7 !== 0) {
      grid.push({
        dayNumber: nextMonthDay++,
        isOtherMonth: true
      });
    }

    return grid;
  }, [year, month]);

  const handleCellClick = (isoDate) => {
    if (!isoDate) return;
    const dayTrips = filteredTrips.filter(t => t.date === isoDate);
    if (dayTrips.length === 0) return;
    setSelectedDateIso(isoDate);
    setModalOpen(true);
  };

  // Get trips for currently selected date in modal (filtered)
  const tripsForModalDate = useMemo(() => {
    if (!selectedDateIso) return [];
    return filteredTrips.filter(t => t.date === selectedDateIso);
  }, [filteredTrips, selectedDateIso]);

  const clearFilters = () => {
    setVehicleFilter('');
    setDriverFilter('');
    setStatusFilter('');
  };

  return (
    <div className="card">
      <h3>Calendar</h3>

      {/* Interactive Filters Panel */}
      <div className="cal-filters">
        <div>
          <label>Filter Vehicle</label>
          <select value={vehicleFilter} onChange={(e) => setVehicleFilter(e.target.value)}>
            <option value="">All Vehicles</option>
            {uniqueVehicles.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>

        <div>
          <label>Filter Driver</label>
          <select value={driverFilter} onChange={(e) => setDriverFilter(e.target.value)}>
            <option value="">All Drivers</option>
            {uniqueDrivers.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>

        <div>
          <label>Filter Status</label>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All Statuses</option>
            <option value="scheduled">Scheduled</option>
            <option value="ongoing">Ongoing</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <div className="cal-filter-count">
          <label>Showing</label>
          <span className="cal-count-badge">{filteredTrips.length} trip{filteredTrips.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* Calendar Header with Navigation */}
      <div className="cal-head">
        <button onClick={() => shiftMonth(-1)}>&larr; Prev</button>
        <div className="cal-head-center">
          <h3 className="cal-month-label">{monthLabel}</h3>
          <button className="cal-today-btn" onClick={goToToday}>Today</button>
        </div>
        <button onClick={() => shiftMonth(1)}>Next &rarr;</button>
      </div>

      {/* Calendar Grid */}
      <div className="cal-grid">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
          <div key={d} className="dow">{d}</div>
        ))}

        {cells.map((cell, idx) => {
          if (cell.isOtherMonth) {
            return (
              <div key={`other-${idx}`} className="cal-cell other">
                <div className="dnum">{cell.dayNumber}</div>
              </div>
            );
          }

          // Find trips for this date (using filtered list)
          const dayTrips = filteredTrips.filter(t => t.date === cell.isoDate);
          const hasTrips = dayTrips.length > 0;

          const isToday = cell.isoDate === todayStr;

          return (
            <div
              key={cell.isoDate}
              className={`cal-cell ${hasTrips ? 'has-trips' : ''} ${isToday ? 'is-today' : ''}`}
              onClick={() => handleCellClick(cell.isoDate)}
            >
              <div className="dnum">{cell.dayNumber}</div>
              {dayTrips.map(t => {
                const isEvenDriver = (t.driver || '').length % 2 === 0;
                const status = getTripStatus(t, todayStr);
                const isCancelled = status === 'cancelled';
                
                let evtClass = 'cal-evt';
                if (isEvenDriver) evtClass += ' signal'; // match original design variation
                if (isCancelled) evtClass += ' cancelled';

                // Display short vehicle identifier (strip anything after dash/em-dash)
                const vehShort = (t.vehicle || '').split('—')[0].split('-')[0].trim();

                return (
                  <div
                    key={t.id}
                    className={evtClass}
                    title={`${t.driver}: ${t.purpose || t.location}`}
                  >
                    {t.time || ''} {vehShort}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Empty state when filters hide all trips */}
      {filteredTrips.length === 0 && trips.length > 0 && (
        <div className="cal-filter-empty">
          <span className="cal-filter-empty-icon">&#128270;</span>
          <strong>No trips match your filters</strong>
          <p>Try adjusting your filter selections or&nbsp;</p>
          <button className="cal-clear-filters" onClick={clearFilters}>Clear all filters</button>
        </div>
      )}

      {filteredTrips.length === 0 && trips.length === 0 && (
        <div className="cal-filter-empty">
          <span className="cal-filter-empty-icon">&#128197;</span>
          <strong>No trips scheduled</strong>
          <p>Create a new travel request to get started.</p>
        </div>
      )}

      {/* Detailed Modal popup for cell click */}
      <Modal
        isOpen={modalOpen}
        dateIso={selectedDateIso}
        tripsForDate={tripsForModalDate}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
}
