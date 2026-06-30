import React, { useMemo, useCallback } from 'react';
import Calendar from './Calendar';

const getStatusLabel = (status) => {
  switch (status) {
    case 'cancelled': return 'Cancelled';
    case 'completed':
    case 'done': return 'Completed';
    case 'ongoing': return 'Ongoing';
    default: return 'Scheduled';
  }
};

export default function Dashboard({ trips }) {
  const todayStr = useMemo(() => {
    return new Date().toLocaleDateString('en-PH', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }, []);

  const todayIso = useMemo(() => {
    return new Date().toISOString().slice(0, 10);
  }, []);

  const getTripStatus = useCallback((t) => {
    if (t.status) return t.status;
    if (t.date < todayIso) return 'completed';
    if (t.date === todayIso) return 'ongoing';
    return 'scheduled';
  }, [todayIso]);

  // Compute stats
  const stats = useMemo(() => {
    const activeTrips = trips.filter(t => getTripStatus(t) !== 'cancelled');
    const uniqueVehicles = new Set(activeTrips.map(t => t.vehicle).filter(Boolean));

    return {
      total: trips.length,
      today: trips.filter(t => t.date === todayIso && getTripStatus(t) !== 'cancelled').length,
      scheduled: trips.filter(t => getTripStatus(t) === 'scheduled').length,
      vehicles: uniqueVehicles.size
    };
  }, [trips, todayIso, getTripStatus]);

  // Next 6 upcoming trips (date >= today, sorted chronologically, not cancelled)
  const upcomingTrips = useMemo(() => {
    return trips
      .filter(t => t.date >= todayIso && getTripStatus(t) !== 'cancelled')
      .sort((a, b) => {
        const dateTimeA = `${a.date}T${a.time || '00:00'}`;
        const dateTimeB = `${b.date}T${b.time || '00:00'}`;
        return dateTimeA < dateTimeB ? -1 : 1;
      })
      .slice(0, 6);
  }, [trips, todayIso, getTripStatus]);

  return (
    <div>
      <div className="topbar">
        <div>
          <h2>Dashboard</h2>
          <p>Overview of all vehicle trips and current status.</p>
        </div>
        <span className="pill">{todayStr}</span>
      </div>

      {/* Stats Counter Rows */}
      <div className="stat-row">
        <div className="stat">
          <div className="num">{stats.total}</div>
          <div className="lbl">Total Trips Logged</div>
        </div>
        <div className="stat">
          <div className="num">{stats.today}</div>
          <div className="lbl">Active Trips Today</div>
        </div>
        <div className="stat">
          <div className="num">{stats.scheduled}</div>
          <div className="lbl">Upcoming / Scheduled</div>
        </div>
        <div className="stat">
          <div className="num">{stats.vehicles}</div>
          <div className="lbl">Vehicles In Use</div>
        </div>
      </div>

      <div className="space-y-4">
        {/* Calendar Grid Integration */}
        <Calendar trips={trips} />

        {/* Upcoming Trips Card */}
        <div className="card">
          <h3>Upcoming Trips</h3>
          <div className="table-wrap">
            {upcomingTrips.length === 0 ? (
              <div className="empty">No upcoming trips scheduled.</div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Time</th>
                    <th>Vehicle</th>
                    <th>Driver</th>
                    <th>Destination</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {upcomingTrips.map((t) => {
                    const status = getTripStatus(t);
                    return (
                      <tr key={t.id}>
                        <td>{t.date}</td>
                        <td>{t.time || '—'}</td>
                        <td>{t.vehicle}</td>
                        <td>{t.driver}</td>
                        <td>{t.location}</td>
                        <td>
                          <span className={`status-tag status-${status}`}>
                            {getStatusLabel(status)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
