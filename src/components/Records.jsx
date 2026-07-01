import React, { useState, useMemo } from 'react';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';

export default function Records({ trips, currentUser }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingTrip, setEditingTrip] = useState(null);
  const [editForm, setEditForm] = useState({});

  const isAdmin = currentUser?.role === 'Admin';

  const canEdit = (t) => isAdmin || t.by === currentUser?.email;

  const getTripStatus = (t) => {
    if (t.status) return t.status;
    const todayStr = new Date().toISOString().slice(0, 10);
    if (t.date < todayStr) return 'completed';
    if (t.date === todayStr) return 'ongoing';
    return 'scheduled';
  };

  // Extract unique vehicles and drivers for autocomplete in edit modal
  const uniqueVehicles = useMemo(() => {
    const vSet = new Set(trips.map(t => t.vehicle).filter(Boolean));
    return [...vSet].sort();
  }, [trips]);

  const uniqueDrivers = useMemo(() => {
    const dSet = new Set(trips.map(t => t.driver).filter(Boolean));
    return [...dSet].sort();
  }, [trips]);

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

  const openEdit = (t) => {
    setEditingTrip(t);
    setEditForm({
      date: t.date || '',
      time: t.time || '',
      requestedby: t.requestedby || '',
      vehicle: t.vehicle || '',
      driver: t.driver || '',
      location: t.location || '',
      purpose: t.purpose || '',
      duration: t.duration || ''
    });
  };

  const closeEdit = () => {
    setEditingTrip(null);
    setEditForm({});
  };

  const handleEditField = (field, value) => {
    setEditForm(prev => ({ ...prev, [field]: value }));
  };

  const handleEditSave = async () => {
    if (!editingTrip) return;
    const { date, time, requestedby, vehicle, driver, location, purpose, duration } = editForm;
    if (!date || !vehicle || !driver || !location) {
      showToast('Missing fields — Date, Vehicle, Driver, and Location are required.', 'error');
      return;
    }
    try {
      const tripRef = doc(db, 'trips', editingTrip.id);
      await updateDoc(tripRef, {
        date,
        time: time || '',
        requestedby: requestedby.trim(),
        vehicle: vehicle.trim(),
        driver: driver.trim(),
        location: location.trim(),
        purpose: purpose.trim(),
        duration: duration.trim()
      });
      showToast('Trip record updated successfully');
      closeEdit();
    } catch (err) {
      showToast('Error updating record: ' + err.message, 'error');
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
                        {canEdit(t) && (
                          <button onClick={() => openEdit(t)}>
                            Edit
                          </button>
                        )}
                        {isAdmin && (
                          <button className="del" onClick={() => handleDelete(t.id)}>
                            Delete
                          </button>
                        )}
                        {!canEdit(t) && (
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

      {/* EDIT TRIP MODAL */}
      {editingTrip && (
        <div className="modal-overlay active" onClick={closeEdit}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3>Edit Trip Record</h3>
              <button onClick={closeEdit}>&times;</button>
            </div>
            <div className="modal-body">
              <div className="form-grid">
                <div>
                  <label>Date</label>
                  <input type="date" value={editForm.date} onChange={(e) => handleEditField('date', e.target.value)} />
                </div>
                <div>
                  <label>Time</label>
                  <input type="time" value={editForm.time} onChange={(e) => handleEditField('time', e.target.value)} />
                </div>
                <div>
                  <label>Requested By</label>
                  <input type="text" value={editForm.requestedby} onChange={(e) => handleEditField('requestedby', e.target.value)} placeholder="Full name" />
                </div>
                <div>
                  <label>Vehicle / Van</label>
                  <input type="text" value={editForm.vehicle} onChange={(e) => handleEditField('vehicle', e.target.value)} placeholder="e.g. Van 1 — Toyota HiAce" list="edit-vehicles" />
                  <datalist id="edit-vehicles">
                    {uniqueVehicles.map(v => <option key={v} value={v} />)}
                  </datalist>
                </div>
                <div>
                  <label>Assigned Driver</label>
                  <input type="text" value={editForm.driver} onChange={(e) => handleEditField('driver', e.target.value)} placeholder="e.g. Mark Santos" list="edit-drivers" />
                  <datalist id="edit-drivers">
                    {uniqueDrivers.map(d => <option key={d} value={d} />)}
                  </datalist>
                </div>
                <div>
                  <label>Travel Duration</label>
                  <input type="text" value={editForm.duration} onChange={(e) => handleEditField('duration', e.target.value)} placeholder="e.g. 3 hours / 1 day" />
                </div>
                <div className="full">
                  <label>Travel Location</label>
                  <input type="text" value={editForm.location} onChange={(e) => handleEditField('location', e.target.value)} placeholder="Destination / route" />
                </div>
                <div className="full">
                  <label>Purpose of Travel</label>
                  <textarea value={editForm.purpose} onChange={(e) => handleEditField('purpose', e.target.value)} placeholder="Brief description of the trip purpose"></textarea>
                </div>
              </div>
              <div className="form-actions">
                <button className="btn" style={{ width: 'auto' }} onClick={handleEditSave}>
                  Save Changes
                </button>
                <button className="btn btn-ghost" style={{ width: 'auto' }} onClick={closeEdit}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
