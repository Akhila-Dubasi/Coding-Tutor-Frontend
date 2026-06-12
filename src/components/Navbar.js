import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import './Auth.css';

export default function Navbar() {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          fetchProfile(session.user.id);
        } else {
          setRole('');
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchProfile = async (userId) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching profile in navbar:', error);
    } else if (data) {
      setRole(data.role);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  if (!user) return null; // Hide navbar when logged out

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">
        🤖 Akhila AI Coding Mentor
      </Link>

      <div className="navbar-links">
        <Link to="/" className="nav-link">
          Chat Mentor
        </Link>

        {role === 'admin' && (
          <Link to="/admin" className="nav-link" style={{ fontWeight: 'bold', color: '#fca5a5' }}>
            Admin Panel
          </Link>
        )}

        <div className="navbar-user">
          <span>{user.email}</span>
          <span className={`user-role-badge ${role}`}>
            {role || 'loading...'}
          </span>
        </div>

        <button className="logout-btn" onClick={handleLogout}>
          Logout
        </button>
      </div>
    </nav>
  );
}
