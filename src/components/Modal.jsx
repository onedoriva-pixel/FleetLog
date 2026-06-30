import React from 'react';

export default function Modal({ isOpen, dateIso, tripsForDate, onClose }) {
  if (!isOpen || !dateIso) return null;

  const formattedDate = new Date(dateIso + 'T00:00:00').toLocaleDateString('en-PH', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  const sortedTrips = [...tripsForDate].sort((a, b) => (a.time || '') < (b.time || '') ? -1 : 1);

  const getStatusLabel = (status) => {
    switch (status) {
      case 'cancelled': return 'Cancelled';
      case 'completed':
      case 'done': return 'Completed';
      case 'ongoing': return 'Ongoing';
      default: return 'Scheduled';
    }
  };

  return (
    <div className="modal-overlay active" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>{formattedDate}</h3>
          <button onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          {sortedTrips.length === 0 ? (
            <div className="empty">No trips scheduled for this day.</div>
          ) : (
            sortedTrips.map((t) => (
              <div key={t.id} className="modal-trip">
                <div className="mt-vehicle">
                  {t.vehicle} &middot; {t.driver}
                  {t.status && (
                    <span 
                      className={`status-tag status-${t.status}`} 
                      style={{ marginLeft: '10px', fontSize: '9px', padding: '2px 6px' }}
                    >
                      {getStatusLabel(t.status)}
                    </span>
                  )}
                </div>
                <div className="mt-detail">
                  {t.time ? <span><b>Time:</b> {t.time} &middot; </span> : null}
                  <b>Location:</b> {t.location}
                  {t.purpose ? <><br /><b>Purpose:</b> {t.purpose}</> : null}
                  {t.duration ? <><br /><b>Duration:</b> {t.duration}</> : null}
                  {t.by ? <><br /><b>Requested By:</b> {t.requestedby || t.by}</> : null}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
