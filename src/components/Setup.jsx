import React from 'react';

export default function Setup() {
  const securityRulesText = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /trips/{trip} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      
      // Only Admin or the creator of the request can edit general details
      // Any authenticated user can modify status
      allow update: if request.auth != null && (
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'Admin' ||
        resource.data.by == request.auth.token.email ||
        request.resource.data.diff(resource.data).affectedKeys().hasOnly(['status'])
      );
      
      // Only Admin can delete trips
      allow delete: if request.auth != null &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'Admin';
    }
    match /users/{uid} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == uid;
    }
  }
}`;

  return (
    <div>
      <div className="topbar">
        <div>
          <h2>Setup &amp; Sync</h2>
          <p>Firebase-powered real-time sync with enhanced safety rules.</p>
        </div>
      </div>

      <div className="card" style={{ maxWidth: '760px', lineHeight: '1.7', fontSize: '13.5px' }}>
        <h3>What's connected</h3>
        <p>
          <b>Firebase Firestore</b> stores all trip records in real time. Any change &mdash; adding, updating status, or deleting a trip &mdash; is instantly reflected on every open browser tab or device.
        </p>
        <p>
          <b>Firebase Authentication</b> handles login via email/password. The first account created becomes <b>Admin</b> (can delete records and edit all details). Subsequent accounts are <b>Staff</b> (can submit requests, view dashboard, and update status).
        </p>
        <p>
          All data lives under the <code>trips</code> collection in your Firestore database. User roles are stored under the <code>users</code> collection.
        </p>

        <h3>Deployment</h3>
        <p>This is a modern React/Vite app. Build it for production and deploy it to any static host:</p>
        <div style={{ background: '#2f5d5008', padding: '12px', borderRadius: '3px', fontFamily: 'monospace', fontSize: '12px', marginBottom: '16px' }}>
          npm run build<br />
          # This compiles the app into the "dist/" folder.<br /><br />
          # 1. Firebase Hosting — npm install -g firebase-tools &amp;&amp; firebase deploy<br />
          # 2. Vercel — deploys automatically using vercel.json routing rules<br />
          # 3. Netlify — drag-and-drop the compiled "dist/" folder
        </div>

        <h3>🔒 Firestore Security Rules (Recommended)</h3>
        <p>Go to Firebase Console &rarr; Firestore Database &rarr; Rules and paste the following rules to secure your data based on user roles:</p>
        <pre 
          style={{
            background: '#2f5d5008',
            padding: '12px',
            borderRadius: '3px',
            fontSize: '12px',
            overflowX: 'auto',
            fontFamily: 'var(--font-mono)',
            border: '1px solid var(--line)'
          }}
        >
          {securityRulesText}
        </pre>
      </div>
    </div>
  );
}
