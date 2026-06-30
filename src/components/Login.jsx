import React, { useState } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { collection, doc, setDoc, getDocs, limit, query } from 'firebase/firestore';
import { auth, db } from '../firebase';

export default function Login() {
  const [isLoginTab, setIsLoginTab] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in email and password.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!name || !email || !password) {
      setError('Please fill in all fields.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      
      // Check if users collection is empty
      const usersRef = collection(db, 'users');
      const q = query(usersRef, limit(1));
      const snapshot = await getDocs(q);
      const isFirstUser = snapshot.empty;
      
      const role = isFirstUser ? 'Admin' : 'Staff';
      
      await setDoc(doc(db, 'users', cred.user.uid), {
        name: name.trim(),
        email: email.trim(),
        role: role,
        createdAt: new Date()
      });
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="brand">
          <div className="brand-mark"></div>
          <h1>FleetLog</h1>
        </div>
        <p className="brand-sub">Company Vehicle Scheduler</p>
        
        <div className="tabs">
          <button 
            className={isLoginTab ? 'active' : ''} 
            onClick={() => { setIsLoginTab(true); setError(''); }}
          >
            Log In
          </button>
          <button 
            className={!isLoginTab ? 'active' : ''} 
            onClick={() => { setIsLoginTab(false); setError(''); }}
          >
            Create Account
          </button>
        </div>

        {isLoginTab ? (
          <form onSubmit={handleLogin}>
            <div className="field">
              <label>Email</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com" 
                required 
              />
            </div>
            <div className="field">
              <label>Password</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••" 
                required 
              />
            </div>
            {error && <div className="err">{error}</div>}
            <button className="btn" type="submit" disabled={loading}>
              {loading ? 'Signing in...' : 'Log In'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister}>
            <div className="field">
              <label>Full Name</label>
              <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Juan Dela Cruz" 
                required 
              />
            </div>
            <div className="field">
              <label>Email</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com" 
                required 
              />
            </div>
            <div className="field">
              <label>Password</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••" 
                required 
              />
            </div>
            {error && <div className="err">{error}</div>}
            <button className="btn" type="submit" disabled={loading}>
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>
        )}

        <div className="login-hint">
          First user created automatically becomes <b>Admin</b>. Subsequent users become <b>Staff</b>.<br />
          Role can be changed later in Firebase Console.
        </div>
      </div>
    </div>
  );
}
