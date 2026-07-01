/**
 * FLEETLOG -> GOOGLE SHEETS SYNC
 *
 * Creates the same 4-sheet Excel report structure inside your Google Sheet:
 *   Summary | Trip Log | Vehicle Stats | Driver Stats
 *
 * SETUP INSTRUCTIONS (see bottom of file)
 */

// ===== CONFIG =====
const CONFIG = {
  FIREBASE_PROJECT_ID: 'travelschedule-f31ae',
  COLLECTION: 'trips',
  USERS_COLLECTION: 'users',
  SHEET_NAMES: ['Summary', 'Trip Log', 'Vehicle Stats', 'Driver Stats', 'Users'],
};

// ===== AUTH =====

function getServiceAccountKey_() {
  const props = PropertiesService.getScriptProperties();
  const raw = props.getProperty('FLEETLOG_SA_KEY');
  if (!raw) throw new Error(
    'Service account key not found.\n' +
    'Set it: File > Project properties > Script properties\n' +
    'Property name: FLEETLOG_SA_KEY\n' +
    'Value: paste the entire JSON from your Firebase service account key.'
  );
  return JSON.parse(raw);
}

function getAccessToken_() {
  const key = getServiceAccountKey_();
  const now = Math.floor(Date.now() / 1000);

  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: key.client_email,
    scope: 'https://www.googleapis.com/auth/datastore https://www.googleapis.com/auth/spreadsheets',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };

  const toSign =
    Utilities.base64EncodeWebSafe(JSON.stringify(header)) + '.' +
    Utilities.base64EncodeWebSafe(JSON.stringify(payload));
  const sig = Utilities.computeRsaSha256Signature(toSign, key.private_key);
  const jwt = toSign + '.' + Utilities.base64EncodeWebSafe(sig);

  const res = UrlFetchApp.fetch('https://oauth2.googleapis.com/token', {
    method: 'post',
    payload: {
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    },
  });
  return JSON.parse(res.getContentText()).access_token;
}

// ===== FIRESTORE FETCH =====

function fetchTrips_() {
  const token = getAccessToken_();
  const base =
    `https://firestore.googleapis.com/v1/projects/${CONFIG.FIREBASE_PROJECT_ID}` +
    `/databases/(default)/documents/${CONFIG.COLLECTION}`;

  let allTrips = [];
  let nextPageToken = null;

  do {
    let url = base + '?pageSize=1000';
    if (nextPageToken) url += '&pageToken=' + encodeURIComponent(nextPageToken);

    const res = UrlFetchApp.fetch(url, {
      headers: { Authorization: 'Bearer ' + token },
      muteHttpExceptions: true,
    });
    const body = JSON.parse(res.getContentText());
    if (body.error) throw new Error(`Firestore API error: ${body.error.message}`);

    if (body.documents) {
      const mapped = body.documents.map((doc) => {
        const f = doc.fields || {};
        const row = { id: doc.name.split('/').pop() };
        for (const [k, v] of Object.entries(f)) {
          const type = Object.keys(v)[0]; // stringValue, integerValue, timestampValue
          row[k] = v[type];
        }
        return row;
      });
      allTrips = allTrips.concat(mapped);
    }
    nextPageToken = body.nextPageToken || null;
  } while (nextPageToken);

  return allTrips;
}

function fetchUsers_() {
  const token = getAccessToken_();
  const base =
    `https://firestore.googleapis.com/v1/projects/${CONFIG.FIREBASE_PROJECT_ID}` +
    `/databases/(default)/documents/${CONFIG.USERS_COLLECTION}`;

  let allUsers = [];
  let nextPageToken = null;

  do {
    let url = base + '?pageSize=1000';
    if (nextPageToken) url += '&pageToken=' + encodeURIComponent(nextPageToken);

    const res = UrlFetchApp.fetch(url, {
      headers: { Authorization: 'Bearer ' + token },
      muteHttpExceptions: true,
    });
    const body = JSON.parse(res.getContentText());
    if (body.error) throw new Error(`Firestore API error: ${body.error.message}`);

    if (body.documents) {
      const mapped = body.documents.map((doc) => {
        const f = doc.fields || {};
        const row = { id: doc.name.split('/').pop() };
        for (const [k, v] of Object.entries(f)) {
          const type = Object.keys(v)[0];
          row[k] = v[type];
        }
        return row;
      });
      allUsers = allUsers.concat(mapped);
    }
    nextPageToken = body.nextPageToken || null;
  } while (nextPageToken);

  return allUsers;
}

// ===== HELPERS =====

function computeStatus_(trip, todayStr) {
  if (trip.status) return trip.status;
  if (!trip.date) return 'scheduled';
  if (trip.date < todayStr) return 'completed';
  if (trip.date === todayStr) return 'ongoing';
  return 'scheduled';
}

function todayStr_() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// ===== SHEET WRITING =====

function ensureSheets_(ss) {
  const existing = ss.getSheets().map((s) => s.getName());
  const toCreate = CONFIG.SHEET_NAMES.filter((n) => !existing.includes(n));
  toCreate.forEach((name) => ss.insertSheet(name));
  // Move them to correct order
  CONFIG.SHEET_NAMES.forEach((name, i) => {
    const sh = ss.getSheetByName(name);
    if (sh && ss.getSheets().indexOf(sh) !== i) ss.moveActiveSheet(i + 1);
  });
}

function clearSheet_(sh) {
  sh.setFrozenRows(0);
  const maxRows = sh.getMaxRows();
  const maxCols = sh.getMaxColumns();
  if (maxRows > 1) sh.deleteRows(2, maxRows - 1);
  if (maxCols > 1) sh.deleteColumns(2, maxCols - 1);
}

function setHeader_(sh, headers) {
  sh.getRange(1, 1, 1, headers.length)
    .setValues([headers])
    .setFontWeight('bold')
    .setBackground('#1a73e8')
    .setFontColor('#ffffff')
    .setHorizontalAlignment('center');
}

function autoResizeColumns_(sh, numCols) {
  for (let i = 1; i <= numCols; i++) {
    sh.autoResizeColumn(i);
  }
}

// ===== SHEET 1: SUMMARY =====

function writeSummarySheet_(ss, trips) {
  const sh = ss.getSheetByName('Summary');
  clearSheet_(sh);

  const today = todayStr_();
  const total = trips.length;
  const scheduled = trips.filter((t) => computeStatus_(t, today) === 'scheduled').length;
  const ongoing = trips.filter((t) => computeStatus_(t, today) === 'ongoing').length;
  const completed = trips.filter((t) => computeStatus_(t, today) === 'completed').length;
  const cancelled = trips.filter((t) => computeStatus_(t, today) === 'cancelled').length;

  const vehicles = [...new Set(trips.map((t) => t.vehicle).filter(Boolean))];
  const drivers = [...new Set(trips.map((t) => t.driver).filter(Boolean))];

  const now = new Date();
  const dateStr = now.toLocaleDateString('en-PH', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  const rows = [
    ['FLEETLOG', ''],
    ['Company Vehicle Travel Report', ''],
    [`Generated: ${dateStr}`, ''],
    ['', ''],
    ['TRIP SUMMARY', ''],
    ['Total Trips Logged', total],
    ['Scheduled', scheduled],
    ['Ongoing', ongoing],
    ['Completed', completed],
    ['Cancelled', cancelled],
    ['', ''],
    ['VEHICLES USED', ''],
    ['Total Vehicles', vehicles.length],
    ...vehicles.map((v) => ['', v]),
    ['', ''],
    ['DRIVERS ASSIGNED', ''],
    ['Total Drivers', drivers.length],
    ...drivers.map((d) => ['', d]),
  ];

  sh.getRange(1, 1, rows.length, 2).setValues(rows);

  // Style title rows
  sh.getRange(1, 1).setFontSize(16).setFontWeight('bold');
  sh.getRange(2, 1).setFontSize(12).setFontWeight('bold');
  sh.getRange(3, 1).setFontStyle('italic').setFontColor('#666666');

  // Style section headers
  [5, 12, 16].forEach((r) => {
    sh.getRange(r, 1, 1, 2)
      .setBackground('#1a73e8')
      .setFontColor('#ffffff')
      .setFontWeight('bold');
  });

  // Style number rows
  [6, 7, 8, 9, 10].forEach((r) => {
    sh.getRange(r, 1, 1, 2).setBackground('#f3f3f3');
  });

  sh.autoResizeColumn(1);
  sh.autoResizeColumn(2);
  sh.setFrozenRows(0);
}

// ===== SHEET 2: TRIP LOG =====

function writeTripLogSheet_(ss, trips) {
  const sh = ss.getSheetByName('Trip Log');
  clearSheet_(sh);

  const today = todayStr_();
  const headers = ['Date', 'Time', 'Requested By', 'Vehicle / Van', 'Assigned Driver',
    'Travel Location', 'Purpose of Travel', 'Travel Duration', 'Status'];

  // Sort by date (newest first)
  const sorted = [...trips].sort((a, b) => {
    const da = a.date || '';
    const db = b.date || '';
    if (da !== db) return da.localeCompare(db); // asc
    return (a.time || '').localeCompare(b.time || '');
  });

  const data = sorted.map((t) => [
    t.date || '',
    t.time || '',
    t.requestedby || '',
    t.vehicle || '',
    t.driver || '',
    t.location || '',
    t.purpose || '',
    t.duration || '',
    computeStatus_(t, today).charAt(0).toUpperCase() + computeStatus_(t, today).slice(1),
  ]);

  if (data.length === 0) {
    sh.getRange(1, 1).setValue('No trip data');
    return;
  }

  setHeader_(sh, headers);
  sh.getRange(2, 1, data.length, headers.length).setValues(data);

  // Color-code status column (col 9)
  const statusColors = {
    Completed: '#b7e1cd',
    Ongoing: '#ffe599',
    Cancelled: '#f4c7c3',
    Scheduled: '#c9daf8',
  };
  const statusRange = sh.getRange(2, 9, data.length, 1);
  const statusBg = data.map((row) => [statusColors[row[8]] || '#ffffff']);
  statusRange.setBackgrounds(statusBg);

  autoResizeColumns_(sh, headers.length);
  sh.setFrozenRows(1);
}

// ===== SHEET 3: VEHICLE STATS =====

function writeVehicleStatsSheet_(ss, trips) {
  const sh = ss.getSheetByName('Vehicle Stats');
  clearSheet_(sh);

  const headers = ['Vehicle / Van', 'Total Trips', 'Assigned Drivers'];
  const map = {};
  trips.forEach((t) => {
    const v = t.vehicle || 'Unassigned';
    if (!map[v]) map[v] = { count: 0, drivers: new Set() };
    map[v].count++;
    if (t.driver) map[v].drivers.add(t.driver);
  });

  const data = Object.entries(map)
    .sort((a, b) => b[1].count - a[1].count)
    .map(([vehicle, stats]) => [
      vehicle,
      stats.count,
      [...stats.drivers].join(', '),
    ]);

  if (data.length === 0) {
    sh.getRange(1, 1).setValue('No vehicle data');
    return;
  }

  setHeader_(sh, headers);
  sh.getRange(2, 1, data.length, headers.length).setValues(data);

  // Alternating rows
  data.forEach((_, i) => {
    if (i % 2 === 1) {
      sh.getRange(i + 2, 1, 1, headers.length).setBackground('#f3f3f3');
    }
  });

  autoResizeColumns_(sh, headers.length);
  sh.setFrozenRows(1);
}

// ===== SHEET 4: DRIVER STATS =====

function writeDriverStatsSheet_(ss, trips) {
  const sh = ss.getSheetByName('Driver Stats');
  clearSheet_(sh);

  const headers = ['Driver', 'Total Trips', 'Vehicles Used'];
  const map = {};
  trips.forEach((t) => {
    const d = t.driver || 'Unassigned';
    if (!map[d]) map[d] = { count: 0, vehicles: new Set() };
    map[d].count++;
    if (t.vehicle) map[d].vehicles.add(t.vehicle);
  });

  const data = Object.entries(map)
    .sort((a, b) => b[1].count - a[1].count)
    .map(([driver, stats]) => [
      driver,
      stats.count,
      [...stats.vehicles].join(', '),
    ]);

  if (data.length === 0) {
    sh.getRange(1, 1).setValue('No driver data');
    return;
  }

  setHeader_(sh, headers);
  sh.getRange(2, 1, data.length, headers.length).setValues(data);

  data.forEach((_, i) => {
    if (i % 2 === 1) {
      sh.getRange(i + 2, 1, 1, headers.length).setBackground('#f3f3f3');
    }
  });

  autoResizeColumns_(sh, headers.length);
  sh.setFrozenRows(1);
}

// ===== SHEET 5: USERS =====

function writeUsersSheet_(ss, users) {
  const sh = ss.getSheetByName('Users');
  clearSheet_(sh);

  const headers = ['UID', 'Name', 'Email', 'Role', 'Created At'];

  const data = users.map((u) => [
    u.id || '',
    u.name || '',
    u.email || '',
    u.role || '',
    u.createdAt || '',
  ]);

  if (data.length === 0) {
    sh.getRange(1, 1).setValue('No user data');
    return;
  }

  setHeader_(sh, headers);
  sh.getRange(2, 1, data.length, headers.length).setValues(data);

  data.forEach((_, i) => {
    if (i % 2 === 1) {
      sh.getRange(i + 2, 1, 1, headers.length).setBackground('#f3f3f3');
    }
  });

  autoResizeColumns_(sh, headers.length);
  sh.setFrozenRows(1);
}

// ===== MAIN ENTRY POINT =====

function syncFromFirestore() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ensureSheets_(ss);

  const ui = SpreadsheetApp.getUi();

  try {
    const trips = fetchTrips_();
    const users = fetchUsers_();

    if (trips.length === 0) {
      ui.alert('No trips found in Firestore.');
      return;
    }

    writeSummarySheet_(ss, trips);
    writeTripLogSheet_(ss, trips);
    writeVehicleStatsSheet_(ss, trips);
    writeDriverStatsSheet_(ss, trips);
    writeUsersSheet_(ss, users);

    // Activate Summary sheet
    ss.getSheetByName('Summary').activate();

    ui.alert(
      `Sync Complete!`,
      `Successfully synced ${trips.length} trips and ${users.length} users from Firestore.\n\n` +
      `Sheets updated: ${CONFIG.SHEET_NAMES.join(', ')}`,
      ui.ButtonSet.OK
    );
  } catch (e) {
    ui.alert('Sync Failed', e.message, ui.ButtonSet.OK);
  }
}

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('FleetLog Sync')
    .addItem('Sync from Firestore', 'syncFromFirestore')
    .addItem('Setup Service Account', 'showSetupInstructions')
    .addToUi();
}

function showSetupInstructions() {
  const html = HtmlService.createHtmlOutput(
    '<h3>Setup Instructions</h3>' +
    '<ol>' +
    '<li>Go to <b>Firebase Console &rarr; Project Settings &rarr; Service Accounts</b></li>' +
    '<li>Click <b>Generate New Private Key</b> &rarr; download the JSON file</li>' +
    '<li>Open the JSON file and <b>copy the entire contents</b></li>' +
    '<li>In this sheet: <b>File &rarr; Project properties &rarr; Script properties</b></li>' +
    '<li>Add a property with name <b>FLEETLOG_SA_KEY</b> and paste the JSON as the value</li>' +
    '<li>Update <code>FIREBASE_PROJECT_ID</code> at the top of this script to match your project ID</li>' +
    '<li>Run <b>Sync from Firestore</b> from the FleetLog Sync menu</li>' +
    '</ol>' +
    '<p><em>Need help? Check the FleetLog app Setup page for your Firebase config.</em></p>'
  ).setWidth(500).setHeight(350);
  SpreadsheetApp.getUi().showModalDialog(html, 'FleetLog Sync Setup');
}
