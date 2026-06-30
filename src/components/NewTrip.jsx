import React, { useState, useMemo } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

export default function NewTrip({ trips, currentUser }) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState('');
  const [requestedBy, setRequestedBy] = useState('');
  const [vehicle, setVehicle] = useState('');
  const [driver, setDriver] = useState('');
  const [duration, setDuration] = useState('');
  const [location, setLocation] = useState('');
  const [purpose, setPurpose] = useState('');

  // Auto-suggestions states
  const [vehicleQuery, setVehicleQuery] = useState('');
  const [driverQuery, setDriverQuery] = useState('');
  const [showVehSuggestions, setShowVehSuggestions] = useState(false);
  const [showDrvSuggestions, setShowDrvSuggestions] = useState(false);

  // Conflict states
  const [conflicts, setConflicts] = useState([]);
  const [showConflictWarning, setShowConflictWarning] = useState(false);
  
  // Feedback states
  const [message, setMessage] = useState(null);
  const [saving, setSaving] = useState(false);

  // Extract unique vehicles and drivers for suggestions
  const uniqueVehicles = useMemo(() => {
    const vSet = new Set(trips.map(t => t.vehicle).filter(Boolean));
    return [...vSet].sort();
  }, [trips]);

  const uniqueDrivers = useMemo(() => {
    const dSet = new Set(trips.map(t => t.driver).filter(Boolean));
    return [...dSet].sort();
  }, [trips]);

  // Filter suggestions
  const filteredVehicles = useMemo(() => {
    if (!vehicleQuery) return [];
    return uniqueVehicles.filter(v => 
      v.toLowerCase().includes(vehicleQuery.toLowerCase()) && 
      v.toLowerCase() !== vehicleQuery.toLowerCase()
    );
  }, [uniqueVehicles, vehicleQuery]);

  const filteredDrivers = useMemo(() => {
    if (!driverQuery) return [];
    return uniqueDrivers.filter(d => 
      d.toLowerCase().includes(driverQuery.toLowerCase()) && 
      d.toLowerCase() !== driverQuery.toLowerCase()
    );
  }, [uniqueDrivers, driverQuery]);

  const handleVehicleChange = (val) => {
    setVehicle(val);
    setVehicleQuery(val);
    setShowVehSuggestions(true);
  };

  const handleDriverChange = (val) => {
    setDriver(val);
    setDriverQuery(val);
    setShowDrvSuggestions(true);
  };

  const selectVehicleSuggestion = (val) => {
    setVehicle(val);
    setVehicleQuery(val);
    setShowVehSuggestions(false);
  };

  const selectDriverSuggestion = (val) => {
    setDriver(val);
    setDriverQuery(val);
    setShowDrvSuggestions(false);
  };

  const checkConflicts = () => {
    if (!date) return [];
    return trips.filter(t => {
      // Check only for the same date and ignore cancelled bookings
      if (t.date !== date || t.status === 'cancelled') return false;

      const sameVehicle = vehicle && t.vehicle && t.vehicle.toLowerCase().trim() === vehicle.toLowerCase().trim();
      const sameDriver = driver && t.driver && t.driver.toLowerCase().trim() === driver.toLowerCase().trim();

      return sameVehicle || sameDriver;
    });
  };

  const handleSubmit = async (bypass = false) => {
    setMessage(null);

    if (!date || !vehicle || !driver || !location) {
      setMessage({
        type: 'error',
        text: 'Missing fields — please fill in at least Date, Vehicle, Driver, and Travel Location.'
      });
      return;
    }

    // Run conflict detection
    if (!bypass) {
      const detectedConflicts = checkConflicts();
      if (detectedConflicts.length > 0) {
        setConflicts(detectedConflicts);
        setShowConflictWarning(true);
        return;
      }
    }

    setSaving(true);
    const newTripData = {
      date,
      time: time || '',
      requestedby: requestedBy.trim(),
      vehicle: vehicle.trim(),
      driver: driver.trim(),
      location: location.trim(),
      purpose: purpose.trim(),
      duration: duration.trim(),
      by: currentUser ? currentUser.email : '',
      status: 'scheduled', // default status
      createdAt: serverTimestamp()
    };

    try {
      await addDoc(collection(db, 'trips'), newTripData);
      setMessage({
        type: 'success',
        text: 'Saved successfully. This trip is now synced in real time on all screens.'
      });
      clearForm(false); // Clear fields except message
    } catch (err) {
      setMessage({
        type: 'error',
        text: 'Error saving: ' + err.message
      });
    } finally {
      setSaving(false);
      setShowConflictWarning(false);
      setConflicts([]);
    }
  };

  const clearForm = (hideMsg = true) => {
    setDate(new Date().toISOString().slice(0, 10));
    setTime('');
    setRequestedBy('');
    setVehicle('');
    setDriver('');
    setDuration('');
    setLocation('');
    setPurpose('');
    setVehicleQuery('');
    setDriverQuery('');
    setShowVehSuggestions(false);
    setShowDrvSuggestions(false);
    setShowConflictWarning(false);
    setConflicts([]);
    if (hideMsg) setMessage(null);
  };

  return (
    <div>
      <div className="topbar">
        <div>
          <h2>New Travel Request</h2>
          <p>Fill out trip details &mdash; saved instantly to Firestore with overlap checking.</p>
        </div>
      </div>

      <div className="card" style={{ maxWidth: '760px' }}>
        <h3>Trip Information Form</h3>
        
        <div className="form-grid">
          <div>
            <label>Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>

          <div>
            <label>Time</label>
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </div>

          <div>
            <label>Requested By</label>
            <input 
              type="text" 
              value={requestedBy} 
              onChange={(e) => setRequestedBy(e.target.value)} 
              placeholder="Full name" 
            />
          </div>

          {/* Autocomplete for Vehicle */}
          <div className="relative-wrapper">
            <label>Vehicle / Van</label>
            <input 
              type="text" 
              value={vehicle} 
              onChange={(e) => handleVehicleChange(e.target.value)} 
              onFocus={() => setShowVehSuggestions(true)}
              onBlur={() => setTimeout(() => setShowVehSuggestions(false), 200)}
              placeholder="e.g. Van 1 — Toyota HiAce" 
            />
            {showVehSuggestions && filteredVehicles.length > 0 && (
              <ul className="suggestion-list">
                {filteredVehicles.map(v => (
                  <li key={v} onMouseDown={() => selectVehicleSuggestion(v)}>{v}</li>
                ))}
              </ul>
            )}
          </div>

          {/* Autocomplete for Driver */}
          <div className="relative-wrapper">
            <label>Assigned Driver</label>
            <input 
              type="text" 
              value={driver} 
              onChange={(e) => handleDriverChange(e.target.value)} 
              onFocus={() => setShowDrvSuggestions(true)}
              onBlur={() => setTimeout(() => setShowDrvSuggestions(false), 200)}
              placeholder="e.g. Mark Santos" 
            />
            {showDrvSuggestions && filteredDrivers.length > 0 && (
              <ul className="suggestion-list">
                {filteredDrivers.map(d => (
                  <li key={d} onMouseDown={() => selectDriverSuggestion(d)}>{d}</li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <label>Travel Duration</label>
            <input 
              type="text" 
              value={duration} 
              onChange={(e) => setDuration(e.target.value)} 
              placeholder="e.g. 3 hours / 1 day" 
            />
          </div>

          <div className="full">
            <label>Travel Location</label>
            <input 
              type="text" 
              value={location} 
              onChange={(e) => setLocation(e.target.value)} 
              placeholder="Destination / route" 
            />
          </div>

          <div className="full">
            <label>Purpose of Travel</label>
            <textarea 
              value={purpose} 
              onChange={(e) => setPurpose(e.target.value)} 
              placeholder="Brief description of the trip purpose"
            ></textarea>
          </div>
        </div>

        {/* DOUBLE-BOOKING CONFLICT WARNING BOARD */}
        {showConflictWarning && conflicts.length > 0 && (
          <div className="warning-note">
            <b>⚠️ Conflict Detected (Double Booking):</b>
            <p>The driver or vehicle is already booked on this date ({date}):</p>
            <ul style={{ paddingLeft: '20px', margin: '6px 0' }}>
              {conflicts.map(c => (
                <li key={c.id}>
                  <strong>{c.vehicle}</strong> assigned to <strong>{c.driver}</strong> at {c.time || 'unscheduled time'} &rarr; Destination: <em>{c.location}</em>
                </li>
              ))}
            </ul>
            <p>Do you want to proceed and override this scheduling overlap?</p>
            <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
              <button 
                className="btn btn-danger" 
                style={{ width: 'auto', padding: '8px 16px', fontSize: '12px' }}
                onClick={() => handleSubmit(true)}
                disabled={saving}
              >
                Override &amp; Save
              </button>
              <button 
                className="btn btn-ghost" 
                style={{ width: 'auto', padding: '8px 16px', fontSize: '12px' }}
                onClick={() => { setShowConflictWarning(false); setConflicts([]); }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Message notification */}
        {message && (
          <div className="sync-note" style={{ borderColor: message.type === 'error' ? '#b3432f88' : '#2f5d5044' }}>
            {message.type === 'success' ? '✓ ' : '⚠️ '}
            {message.text}
          </div>
        )}

        <div className="form-actions">
          <button className="btn" style={{ width: 'auto' }} onClick={() => handleSubmit(false)} disabled={saving || showConflictWarning}>
            {saving ? 'Saving...' : 'Save & Sync'}
          </button>
          <button className="btn btn-ghost" style={{ width: 'auto' }} onClick={() => clearForm(true)}>
            Clear / Reset
          </button>
        </div>
      </div>
    </div>
  );
}
