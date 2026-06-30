import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';

export default function Reports({ trips }) {
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState('');

  // Extract unique vehicles for filter select
  const uniqueVehicles = useMemo(() => {
    const vSet = new Set(trips.map(t => t.vehicle).filter(Boolean));
    return [...vSet].sort();
  }, [trips]);

  const getTripStatus = (t) => {
    if (t.status) return t.status;
    const todayStr = new Date().toISOString().slice(0, 10);
    if (t.date < todayStr) return 'completed';
    if (t.date === todayStr) return 'ongoing';
    return 'scheduled';
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'cancelled': return 'Cancelled';
      case 'completed':
      case 'done': return 'Completed';
      case 'ongoing': return 'Ongoing';
      default: return 'Scheduled';
    }
  };

  const handleExport = () => {
    let list = [...trips];
    if (fromDate) list = list.filter(t => t.date >= fromDate);
    if (toDate) list = list.filter(t => t.date <= toDate);
    if (selectedVehicle) list = list.filter(t => t.vehicle === selectedVehicle);

    // Sort chronologically (oldest first for records log)
    list.sort((a, b) => {
      const dateTimeA = `${a.date}T${a.time || '00:00'}`;
      const dateTimeB = `${b.date}T${b.time || '00:00'}`;
      return dateTimeA < dateTimeB ? -1 : 1;
    });

    try {
      const wb = XLSX.utils.book_new();
      const now = new Date().toLocaleString('en-PH');
      const GREEN = '1F3F36', WHITE = 'FFFFFF', HEADER_BG = '2F5D50';

      // Style helper (ignored by free xlsx library but included for compatibility)
      const sc = (props) => {
        return {
          font: { name: 'Calibri', ...props.font },
          fill: props.fill,
          alignment: props.alignment,
          border: {
            top: { style: 'thin', color: { rgb: 'B0A898' } },
            bottom: { style: 'thin', color: { rgb: 'B0A898' } },
            left: { style: 'thin', color: { rgb: 'B0A898' } },
            right: { style: 'thin', color: { rgb: 'B0A898' } }
          }
        };
      };

      // ============ SUMMARY SHEET ============
      const vehicleList = [...new Set(list.map(t => t.vehicle).filter(Boolean))].sort();
      const driverList = [...new Set(list.map(t => t.driver).filter(Boolean))].sort();

      const sr = [
        ['FLEETLOG'],
        [],
        ['Company Vehicle Travel Report'],
        [],
        ['Generated:', now],
        ['Date Range:', `${fromDate || 'All'} to ${toDate || 'All'}`],
        ['Vehicle Filter:', selectedVehicle || 'All vehicles'],
        [],
        ['TRIP SUMMARY'],
        [],
        ['Total Trips Logged', list.length],
        ['Scheduled', list.filter(t => getTripStatus(t) === 'scheduled').length],
        ['Ongoing', list.filter(t => getTripStatus(t) === 'ongoing').length],
        ['Completed', list.filter(t => getTripStatus(t) === 'completed').length],
        ['Cancelled', list.filter(t => getTripStatus(t) === 'cancelled').length],
        [],
        ['VEHICLES USED'],
        [],
      ];
      sr.push(['Total Vehicles Used', vehicleList.length]);
      vehicleList.forEach(v => sr.push(['', '  ' + v]));
      sr.push([]);
      sr.push(['DRIVERS ASSIGNED']);
      sr.push([]);
      sr.push(['Total Drivers Assigned', driverList.length]);
      driverList.forEach(d => sr.push(['', '  ' + d]));

      const wsS = XLSX.utils.aoa_to_sheet(sr);
      wsS['!cols'] = [{ wch: 30 }, { wch: 40 }];

      const mergeAndStyle = (ws, r, label, style) => {
        const cA = XLSX.utils.encode_cell({ r, c: 0 });
        const cB = XLSX.utils.encode_cell({ r, c: 1 });
        if (ws[cA]) ws[cA].s = style;
        if (ws[cB]) ws[cB].s = style;
        ws['!merges'] = ws['!merges'] || [];
        ws['!merges'].push({ s: { r, c: 0 }, e: { r, c: 1 } });
      };

      // Apply style metadata to summary sheet cell definitions
      mergeAndStyle(wsS, 0, 'FLEETLOG', sc({ font: { bold: true, color: { rgb: WHITE }, sz: 22 }, fill: { fgColor: { rgb: GREEN } }, alignment: { horizontal: 'center' } }));
      mergeAndStyle(wsS, 2, 'Company Vehicle Travel Report', sc({ font: { bold: true, color: { rgb: GREEN }, sz: 14 }, alignment: { horizontal: 'center' } }));

      [4, 5, 6].forEach(r => {
        if (wsS[XLSX.utils.encode_cell({ r, c: 0 })]) wsS[XLSX.utils.encode_cell({ r, c: 0 })].s = sc({ font: { bold: true, sz: 11, color: { rgb: GREEN } } });
        if (wsS[XLSX.utils.encode_cell({ r, c: 1 })]) wsS[XLSX.utils.encode_cell({ r, c: 1 })].s = sc({ font: { sz: 11 } });
      });

      mergeAndStyle(wsS, 8, 'TRIP SUMMARY', sc({ font: { bold: true, color: { rgb: WHITE }, sz: 13 }, fill: { fgColor: { rgb: HEADER_BG} } }));

      [10, 11, 12, 13, 14].forEach(r => {
        if (wsS[XLSX.utils.encode_cell({ r, c: 0 })]) wsS[XLSX.utils.encode_cell({ r, c: 0 })].s = sc({ font: { bold: true, sz: 11, color: { rgb: GREEN } }, fill: { fgColor: { rgb: 'E8F0ED' } }, alignment: { vertical: 'center' } });
        if (wsS[XLSX.utils.encode_cell({ r, c: 1 })]) wsS[XLSX.utils.encode_cell({ r, c: 1 })].s = sc({ font: { sz: 12 }, fill: { fgColor: { rgb: 'E8F0ED' } }, alignment: { vertical: 'center', horizontal: 'center' } });
      });

      // VEHICLES section styling
      const vehTitleRow = 16;
      mergeAndStyle(wsS, vehTitleRow, 'VEHICLES USED', sc({ font: { bold: true, color: { rgb: WHITE }, sz: 13 }, fill: { fgColor: { rgb: HEADER_BG } } }));
      const vehCountRow = vehTitleRow + 2;
      if (wsS[XLSX.utils.encode_cell({ r: vehCountRow, c: 0 })]) wsS[XLSX.utils.encode_cell({ r: vehCountRow, c: 0 })].s = sc({ font: { bold: true, sz: 11, color: { rgb: GREEN } }, fill: { fgColor: { rgb: 'E8F0ED' } }, alignment: { vertical: 'center' } });
      if (wsS[XLSX.utils.encode_cell({ r: vehCountRow, c: 1 })]) wsS[XLSX.utils.encode_cell({ r: vehCountRow, c: 1 })].s = sc({ font: { sz: 12 }, fill: { fgColor: { rgb: 'E8F0ED' } }, alignment: { vertical: 'center', horizontal: 'center' } });
      vehicleList.forEach((v, i) => {
        const rr = vehCountRow + 1 + i;
        if (wsS[XLSX.utils.encode_cell({ r: rr, c: 1 })]) wsS[XLSX.utils.encode_cell({ r: rr, c: 1 })].s = sc({ font: { sz: 11, color: { rgb: '1C2422' } }, alignment: { vertical: 'center' } });
      });

      // DRIVERS section styling
      const drvTitleRow = vehCountRow + 1 + vehicleList.length;
      mergeAndStyle(wsS, drvTitleRow, 'DRIVERS ASSIGNED', sc({ font: { bold: true, color: { rgb: WHITE }, sz: 13 }, fill: { fgColor: { rgb: HEADER_BG } } }));
      const drvCountRow = drvTitleRow + 2;
      if (wsS[XLSX.utils.encode_cell({ r: drvCountRow, c: 0 })]) wsS[XLSX.utils.encode_cell({ r: drvCountRow, c: 0 })].s = sc({ font: { bold: true, sz: 11, color: { rgb: GREEN } }, fill: { fgColor: { rgb: 'E8F0ED' } }, alignment: { vertical: 'center' } });
      if (wsS[XLSX.utils.encode_cell({ r: drvCountRow, c: 1 })]) wsS[XLSX.utils.encode_cell({ r: drvCountRow, c: 1 })].s = sc({ font: { sz: 12 }, fill: { fgColor: { rgb: 'E8F0ED' } }, alignment: { vertical: 'center', horizontal: 'center' } });
      driverList.forEach((d, i) => {
        const rr = drvCountRow + 1 + i;
        if (wsS[XLSX.utils.encode_cell({ r: rr, c: 1 })]) wsS[XLSX.utils.encode_cell({ r: rr, c: 1 })].s = sc({ font: { sz: 11, color: { rgb: '1C2422' } }, alignment: { vertical: 'center' } });
      });

      XLSX.utils.book_append_sheet(wb, wsS, 'Summary');

      // ============ TRIP LOG SHEET ============
      const header = ['Date', 'Time', 'Requested By', 'Vehicle / Van', 'Assigned Driver', 'Travel Location', 'Purpose of Travel', 'Travel Duration', 'Status'];
      const rows = list.map(t => [
        t.date,
        t.time || '—',
        t.requestedby || '—',
        t.vehicle,
        t.driver,
        t.location,
        t.purpose || '—',
        t.duration || '—',
        getStatusLabel(getTripStatus(t))
      ]);
      
      const wsL = XLSX.utils.aoa_to_sheet([header, ...rows]);
      wsL['!cols'] = [{ wch: 12 }, { wch: 8 }, { wch: 20 }, { wch: 24 }, { wch: 18 }, { wch: 24 }, { wch: 32 }, { wch: 16 }, { wch: 14 }];

      const hr = XLSX.utils.decode_range(wsL['!ref']);
      for (let c = hr.s.c; c <= hr.e.c; c++) {
        const addr = XLSX.utils.encode_cell({ r: 0, c });
        if (wsL[addr]) wsL[addr].s = sc({ font: { bold: true, sz: 11, color: { rgb: WHITE } }, fill: { fgColor: { rgb: HEADER_BG } }, alignment: { horizontal: 'center', vertical: 'center', wrapText: true } });
      }

      for (let r = 1; r <= list.length; r++) {
        for (let c = hr.s.c; c <= hr.e.c; c++) {
          const addr = XLSX.utils.encode_cell({ r, c });
          if (wsL[addr]) wsL[addr].s = sc({ font: { sz: 10.5 }, fill: { fgColor: { rgb: r % 2 === 0 ? 'F6F3EC' : WHITE } }, alignment: { vertical: 'center', wrapText: true } });
        }
      }

      wsL['!freeze'] = { xSplit: 0, ySplit: 1 };
      XLSX.utils.book_append_sheet(wb, wsL, 'Trip Log');

      // ============ VEHICLE STATS SHEET ============
      const vehicles = [...new Set(list.map(t => t.vehicle).filter(Boolean))].sort();
      const vs = [['Vehicle / Van', 'Total Trips', 'Assigned Drivers']];
      vehicles.forEach(v => {
        const vt = list.filter(t => t.vehicle === v);
        const drivers = [...new Set(vt.map(t => t.driver).filter(Boolean))];
        vs.push([v, vt.length, drivers.join(', ')]);
      });
      const wsV = XLSX.utils.aoa_to_sheet(vs);
      wsV['!cols'] = [{ wch: 30 }, { wch: 14 }, { wch: 40 }];

      for (let c = 0; c <= 2; c++) {
        const addr = XLSX.utils.encode_cell({ r: 0, c });
        if (wsV[addr]) wsV[addr].s = sc({ font: { bold: true, sz: 11, color: { rgb: WHITE } }, fill: { fgColor: { rgb: HEADER_BG } }, alignment: { horizontal: 'center', vertical: 'center' } });
      }
      for (let r = 1; r < vs.length; r++) {
        for (let c = 0; c <= 2; c++) {
          const addr = XLSX.utils.encode_cell({ r, c });
          if (wsV[addr]) wsV[addr].s = sc({ font: { sz: 11 }, fill: { fgColor: { rgb: r % 2 === 0 ? 'F6F3EC' : WHITE } }, alignment: { vertical: 'center', horizontal: c === 0 ? 'left' : 'center' } });
        }
      }
      XLSX.utils.book_append_sheet(wb, wsV, 'Vehicle Stats');

      // ============ DRIVER STATS SHEET ============
      const drivers = [...new Set(list.map(t => t.driver).filter(Boolean))].sort();
      const ds = [['Driver', 'Total Trips', 'Vehicles Used']];
      drivers.forEach(d => {
        const dt = list.filter(t => t.driver === d);
        const vehs = [...new Set(dt.map(t => t.vehicle).filter(Boolean))];
        ds.push([d, dt.length, vehs.join(', ')]);
      });
      const wsD = XLSX.utils.aoa_to_sheet(ds);
      wsD['!cols'] = [{ wch: 24 }, { wch: 14 }, { wch: 40 }];

      for (let c = 0; c <= 2; c++) {
        const addr = XLSX.utils.encode_cell({ r: 0, c });
        if (wsD[addr]) wsD[addr].s = sc({ font: { bold: true, sz: 11, color: { rgb: WHITE } }, fill: { fgColor: { rgb: HEADER_BG } }, alignment: { horizontal: 'center', vertical: 'center' } });
      }
      for (let r = 1; r < ds.length; r++) {
        for (let c = 0; c <= 2; c++) {
          const addr = XLSX.utils.encode_cell({ r, c });
          if (wsD[addr]) wsD[addr].s = sc({ font: { sz: 11 }, fill: { fgColor: { rgb: r % 2 === 0 ? 'F6F3EC' : WHITE } }, alignment: { vertical: 'center', horizontal: c === 0 ? 'left' : 'center' } });
        }
      }
      XLSX.utils.book_append_sheet(wb, wsD, 'Driver Stats');

      // Excel downloading trigger
      const wbOut = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([wbOut], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `FleetLog_Report_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

    } catch (e) {
      alert('Error generating report: ' + e.message);
      console.error(e);
    }
  };

  return (
    <div>
      <div className="topbar">
        <div>
          <h2>Reports</h2>
          <p>Generate a downloadable multi-sheet Excel report of trip records.</p>
        </div>
      </div>

      <div className="card" style={{ maxWidth: '560px' }}>
        <h3>Export Options</h3>
        
        <div className="form-grid">
          <div>
            <label>From Date</label>
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          </div>

          <div>
            <label>To Date</label>
            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </div>

          <div className="full">
            <label>Vehicle (optional)</label>
            <select value={selectedVehicle} onChange={(e) => setSelectedVehicle(e.target.value)}>
              <option value="">All vehicles</option>
              {uniqueVehicles.map(v => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-actions">
          <button className="btn" style={{ width: 'auto' }} onClick={handleExport}>
            ⬇ Download Excel Report
          </button>
        </div>

        <div className="sync-note">
          Report includes a formatted summary sheet plus a full trip log sheet, styled with headers and column widths ready to print or share.
        </div>
      </div>
    </div>
  );
}
