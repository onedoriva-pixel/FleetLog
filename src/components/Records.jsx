import React, { useState, useMemo } from 'react';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';

export default function Records({ trips, currentUser }) {
  const [searchQuery, setSearchQuery] = useState('');

  const isAdmin = currentUser?.role === 'Admin';

  const getTripStatus = (t) => {
    if (t.status) return t.status;
    const todayStr = new Date().toISOString().slice(0, 10);
    if (t.date < todayStr) return 'completed';
    if (t.date === todayStr) return 'ongoing';
    return 'scheduled';
  };

  // Filter and sort trips (newest first based on date+time)
  const filteredTrips = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return trips
      .filter(t => {
        if (!q) return true;
        const searchableText = [
          t.vehicle,
          t.driver,
          t.location,
          t.requestedby,
          t.purpose
        ].join(' ').toLowerCase();
        return searchableText.includes(q);
      })
      .sort((a, b) => {
        const dateTimeA = `${a.date}T${a.time || '00:00'}`;
        const dateTimeB = `${b.date}T${b.time || '00:00'}`;
        return dateTimeA < dateTimeB ? 1 : -1;
      });
  }, [trips, searchQuery]);

  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleStatusChange = async (tripId, newStatus) => {
    try {
      const tripRef = doc(db, 'trips', tripId);
      await updateDoc(tripRef, { status: newStatus });
      showToast('Status updated successfully');
    } catch (err) {
      showToast('Error updating status: ' + err.message, 'error');
    }
  };

  const handleDelete = async (tripId) => {
    if (!isAdmin) return;
    if (!window.confirm('Are you sure you want to delete this trip record?')) return;
    try {
      const tripRef = doc(db, 'trips', tripId);
      await deleteDoc(tripRef);
      showToast('Trip record deleted');
    } catch (err) {
      showToast('Error deleting record: ' + err.message, 'error');
    }
  };

  return (
    <div>
      <div className="topbar">
        <div>
          <h2>All Records</h2>
          <p>Every saved travel request &mdash; synced across devices in real time.</p>
        </div>
      </div>

      <div className="toolbar">
        <input 
          type="text" 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search vehicle, driver, location, purpose..." 
        />
        <span className="pill">
          {filteredTrips.length} record{filteredTrips.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="card">
        <div className="table-wrap">
          {filteredTrips.length === 0 ? (
            <div className="empty">No trip records found. Add one from "New Travel Request."</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Requested By</th>
                  <th>Vehicle</th>
                  <th>Driver</th>
                  <th>Location</th>
                  <th>Purpose</th>
                  <th>Duration</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTrips.map((t) => {
                  const status = getTripStatus(t);
                  return (
                    <tr key={t.id}>
                      <td>{t.date}</td>
                      <td>{t.time || '—'}</td>
                      <td>{t.requestedby || '—'}</td>
                      <td>{t.vehicle}</td>
                      <td>{t.driver}</td>
                      <td>{t.location}</td>
                      <td>{t.purpose || '—'}</td>
                      <td>{t.duration || '—'}</td>
                      <td>
                        {/* Interactive Status Changer Dropdown */}
                        <select 
                          className={`status-select status-${status}`}
                          value={status}
                          onChange={(e) => handleStatusChange(t.id, e.target.value)}
                          style={{
                            fontWeight: '600',
                            border: '1px solid var(--line)',
                            borderRadius: '3px',
                            cursor: 'pointer'
                          }}
                        >
                          <option value="scheduled">Scheduled</option>
                          <option value="ongoing">Ongoing</option>
                          <option value="completed">Completed</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </td>
                      <td className="row-actions">
                        {isAdmin ? (
                          <button className="del" onClick={() => handleDelete(t.id)}>
                            Delete
                          </button>
                        ) : (
                          <span style={{ fontSize: '11px', color: 'var(--muted)' }}>None</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {toast && (
        <div className={`toast toast-${toast.type}`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
