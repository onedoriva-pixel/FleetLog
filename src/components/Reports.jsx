import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx-js-style';

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
      
      const PRIMARY_BLUE = '0066CC';
      const DARK_SLATE = '0F172A';
      const LIGHT_BG = 'F8FAFB';
      const BORDER_COLOR = 'E2E8F0';
      const WHITE = 'FFFFFF';

      // Status Colors configuration matching the app's status style badges
      const STATUS_STYLES = {
        'Completed': { bg: 'D1FAE5', text: '065F46' },
        'Ongoing': { bg: 'FEF3C7', text: '92400E' },
        'Cancelled': { bg: 'FEE2E2', text: '991B1B' },
        'Scheduled': { bg: 'E3F2FD', text: '1E3A8A' }
      };

      // Style helper to create formatted cell style configuration
      const sc = (props) => {
        const fill = props.fill
          ? { patternType: 'solid', ...props.fill }
          : undefined;
        return {
          font: { name: 'Segoe UI', ...props.font },
          fill: fill,
          alignment: props.alignment || { vertical: 'center' },
          border: props.border !== undefined ? props.border : {
            top: { style: 'thin', color: { rgb: BORDER_COLOR } },
            bottom: { style: 'thin', color: { rgb: BORDER_COLOR } },
            left: { style: 'thin', color: { rgb: BORDER_COLOR } },
            right: { style: 'thin', color: { rgb: BORDER_COLOR } }
          }
        };
      };

      // Helper to compute and set column widths based on maximum text length
      const autoFitColumns = (ws, rows, header) => {
        const colWidths = (header || []).map(h => String(h || '').length);
        rows.forEach(row => {
          row.forEach((cell, idx) => {
            const valStr = cell === null || cell === undefined ? '' : String(cell);
            if (valStr.length > (colWidths[idx] || 0)) {
              colWidths[idx] = valStr.length;
            }
          });
        });
        ws['!cols'] = colWidths.map(w => ({ wch: Math.max(12, w + 3) }));
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
      wsS['!cols'] = [{ wch: 32 }, { wch: 42 }];

      const mergeAndStyle = (ws, r, label, style) => {
        const cA = XLSX.utils.encode_cell({ r, c: 0 });
        const cB = XLSX.utils.encode_cell({ r, c: 1 });
        if (!ws[cA]) ws[cA] = { v: label || '', t: 's' };
        if (!ws[cB]) ws[cB] = { v: '', t: 's' };
        ws[cA].s = style;
        ws[cB].s = style;
        ws['!merges'] = ws['!merges'] || [];
        ws['!merges'].push({ s: { r, c: 0 }, e: { r, c: 1 } });
      };

      // Apply style metadata to summary sheet cell definitions
      mergeAndStyle(wsS, 0, 'FLEETLOG', sc({ font: { bold: true, color: { rgb: WHITE }, sz: 20 }, fill: { fgColor: { rgb: PRIMARY_BLUE } }, alignment: { horizontal: 'center' } }));
      mergeAndStyle(wsS, 2, 'Company Vehicle Travel Report', sc({ font: { bold: true, color: { rgb: DARK_SLATE }, sz: 14 }, alignment: { horizontal: 'center' } }));

      [4, 5, 6].forEach(r => {
        const cA = XLSX.utils.encode_cell({ r, c: 0 });
        const cB = XLSX.utils.encode_cell({ r, c: 1 });
        if (wsS[cA]) wsS[cA].s = sc({ font: { bold: true, sz: 10.5, color: { rgb: PRIMARY_BLUE } }, border: { bottom: { style: 'thin', color: { rgb: BORDER_COLOR } } } });
        if (wsS[cB]) wsS[cB].s = sc({ font: { sz: 10.5 }, border: { bottom: { style: 'thin', color: { rgb: BORDER_COLOR } } } });
      });

      const summaryHeaderRow = 8;
      mergeAndStyle(wsS, summaryHeaderRow, 'TRIP SUMMARY', sc({ font: { bold: true, color: { rgb: WHITE }, sz: 12 }, fill: { fgColor: { rgb: DARK_SLATE } } }));

      [10, 11, 12, 13, 14].forEach(r => {
        const cA = XLSX.utils.encode_cell({ r, c: 0 });
        const cB = XLSX.utils.encode_cell({ r, c: 1 });
        if (wsS[cA]) wsS[cA].s = sc({ font: { bold: true, sz: 11, color: { rgb: DARK_SLATE } }, fill: { fgColor: { rgb: LIGHT_BG } }, alignment: { vertical: 'center' } });
        if (wsS[cB]) wsS[cB].s = sc({ font: { sz: 11.5, bold: true }, fill: { fgColor: { rgb: LIGHT_BG } }, alignment: { vertical: 'center', horizontal: 'center' } });
      });

      // VEHICLES section styling
      const vehTitleRow = 16;
      mergeAndStyle(wsS, vehTitleRow, 'VEHICLES USED', sc({ font: { bold: true, color: { rgb: WHITE }, sz: 12 }, fill: { fgColor: { rgb: DARK_SLATE } } }));
      const vehCountRow = vehTitleRow + 2;
      if (wsS[XLSX.utils.encode_cell({ r: vehCountRow, c: 0 })]) wsS[XLSX.utils.encode_cell({ r: vehCountRow, c: 0 })].s = sc({ font: { bold: true, sz: 11, color: { rgb: DARK_SLATE } }, fill: { fgColor: { rgb: LIGHT_BG } }, alignment: { vertical: 'center' } });
      if (wsS[XLSX.utils.encode_cell({ r: vehCountRow, c: 1 })]) wsS[XLSX.utils.encode_cell({ r: vehCountRow, c: 1 })].s = sc({ font: { sz: 11.5, bold: true }, fill: { fgColor: { rgb: LIGHT_BG } }, alignment: { vertical: 'center', horizontal: 'center' } });
      vehicleList.forEach((v, i) => {
        const rr = vehCountRow + 1 + i;
        const cB = XLSX.utils.encode_cell({ r: rr, c: 1 });
        if (wsS[cB]) wsS[cB].s = sc({ font: { sz: 11, color: { rgb: '334155' } }, alignment: { vertical: 'center' } });
        const cA = XLSX.utils.encode_cell({ r: rr, c: 0 });
        if (wsS[cA]) wsS[cA].s = sc({ font: { sz: 11 } });
      });

      // DRIVERS section styling
      const drvTitleRow = vehCountRow + 1 + vehicleList.length;
      mergeAndStyle(wsS, drvTitleRow, 'DRIVERS ASSIGNED', sc({ font: { bold: true, color: { rgb: WHITE }, sz: 12 }, fill: { fgColor: { rgb: DARK_SLATE } } }));
      const drvCountRow = drvTitleRow + 2;
      if (wsS[XLSX.utils.encode_cell({ r: drvCountRow, c: 0 })]) wsS[XLSX.utils.encode_cell({ r: drvCountRow, c: 0 })].s = sc({ font: { bold: true, sz: 11, color: { rgb: DARK_SLATE } }, fill: { fgColor: { rgb: LIGHT_BG } }, alignment: { vertical: 'center' } });
      if (wsS[XLSX.utils.encode_cell({ r: drvCountRow, c: 1 })]) wsS[XLSX.utils.encode_cell({ r: drvCountRow, c: 1 })].s = sc({ font: { sz: 11.5, bold: true }, fill: { fgColor: { rgb: LIGHT_BG } }, alignment: { vertical: 'center', horizontal: 'center' } });
      driverList.forEach((d, i) => {
        const rr = drvCountRow + 1 + i;
        const cB = XLSX.utils.encode_cell({ r: rr, c: 1 });
        if (wsS[cB]) wsS[cB].s = sc({ font: { sz: 11, color: { rgb: '334155' } }, alignment: { vertical: 'center' } });
        const cA = XLSX.utils.encode_cell({ r: rr, c: 0 });
        if (wsS[cA]) wsS[cA].s = sc({ font: { sz: 11 } });
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
      const hr = XLSX.utils.decode_range(wsL['!ref']);

      // Styling headers
      for (let c = hr.s.c; c <= hr.e.c; c++) {
        const addr = XLSX.utils.encode_cell({ r: 0, c });
        if (wsL[addr]) {
          wsL[addr].s = sc({
            font: { bold: true, sz: 11, color: { rgb: WHITE } },
            fill: { fgColor: { rgb: DARK_SLATE } },
            alignment: { horizontal: 'center', vertical: 'center', wrapText: true }
          });
        }
      }

      // Styling data rows
      for (let r = 1; r <= list.length; r++) {
        const isEven = r % 2 === 0;
        const rowBg = isEven ? LIGHT_BG : WHITE;
        const statusVal = rows[r - 1][8]; // The last column is Status
        const statusStyle = STATUS_STYLES[statusVal] || { bg: rowBg, text: '000000' };

        for (let c = hr.s.c; c <= hr.e.c; c++) {
          const addr = XLSX.utils.encode_cell({ r, c });
          if (!wsL[addr]) continue;

          // Center-align Date (col 0), Time (col 1), Duration (col 7), Status (col 8)
          const isCenter = [0, 1, 7, 8].includes(c);
          const align = {
            vertical: 'center',
            horizontal: isCenter ? 'center' : 'left',
            wrapText: true
          };

          if (c === 8) {
            wsL[addr].s = sc({
              font: { bold: true, sz: 10.5, color: { rgb: statusStyle.text } },
              fill: { fgColor: { rgb: statusStyle.bg } },
              alignment: align
            });
          } else {
            wsL[addr].s = sc({
              font: { sz: 10.5 },
              fill: { fgColor: { rgb: rowBg } },
              alignment: align
            });
          }
        }
      }

      autoFitColumns(wsL, rows, header);
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

      for (let c = 0; c <= 2; c++) {
        const addr = XLSX.utils.encode_cell({ r: 0, c });
        if (wsV[addr]) wsV[addr].s = sc({ font: { bold: true, sz: 11, color: { rgb: WHITE } }, fill: { fgColor: { rgb: DARK_SLATE } }, alignment: { horizontal: 'center', vertical: 'center' } });
      }
      for (let r = 1; r < vs.length; r++) {
        for (let c = 0; c <= 2; c++) {
          const addr = XLSX.utils.encode_cell({ r, c });
          if (wsV[addr]) {
            wsV[addr].s = sc({
              font: { sz: 11 },
              fill: { fgColor: { rgb: r % 2 === 0 ? LIGHT_BG : WHITE } },
              alignment: { vertical: 'center', horizontal: c === 1 ? 'center' : 'left' }
            });
          }
        }
      }
      autoFitColumns(wsV, vs.slice(1), vs[0]);
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

      for (let c = 0; c <= 2; c++) {
        const addr = XLSX.utils.encode_cell({ r: 0, c });
        if (wsD[addr]) wsD[addr].s = sc({ font: { bold: true, sz: 11, color: { rgb: WHITE } }, fill: { fgColor: { rgb: DARK_SLATE } }, alignment: { horizontal: 'center', vertical: 'center' } });
      }
      for (let r = 1; r < ds.length; r++) {
        for (let c = 0; c <= 2; c++) {
          const addr = XLSX.utils.encode_cell({ r, c });
          if (wsD[addr]) {
            wsD[addr].s = sc({
              font: { sz: 11 },
              fill: { fgColor: { rgb: r % 2 === 0 ? LIGHT_BG : WHITE } },
              alignment: { vertical: 'center', horizontal: c === 1 ? 'center' : 'left' }
            });
          }
        }
      }
      autoFitColumns(wsD, ds.slice(1), ds[0]);
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
