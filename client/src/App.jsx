import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE = 'http://localhost:5000/api';

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [user, setUser] = useState(
    localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')) : null
  );
  const [view, setView] = useState(token ? 'dashboard' : 'login');

  // Login Handler
  const handleLogin = (data) => {
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
    setView('dashboard');
  };

  // Logout Handler
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken('');
    setUser(null);
    setView('login');
  };

  return (
    <div>
      {/* Navbar */}
      <nav className="navbar navbar-expand-lg navbar-dark bg-dark px-4">
        <span className="navbar-brand font-weight-bold">Store Rating Portal</span>
        <div className="ms-auto d-flex align-items-center">
          {user ? (
            <>
              <span className="text-light me-3">
                Hello, <strong>{user.name.split(' ')[0]}</strong> ({user.role})
              </span>
              <button
                className="btn btn-outline-warning btn-sm me-2"
                onClick={() => setView('updatePassword')}
              >
                Change Password
              </button>
              {view === 'updatePassword' && (
                <button
                  className="btn btn-outline-info btn-sm me-2"
                  onClick={() => setView('dashboard')}
                >
                  Dashboard
                </button>
              )}
              <button className="btn btn-danger btn-sm" onClick={handleLogout}>
                Logout
              </button>
            </>
          ) : (
            <div>
              <button
                className={`btn btn-sm me-2 ${view === 'login' ? 'btn-primary' : 'btn-outline-light'}`}
                onClick={() => setView('login')}
              >
                Login
              </button>
              <button
                className={`btn btn-sm ${view === 'signup' ? 'btn-primary' : 'btn-outline-light'}`}
                onClick={() => setView('signup')}
              >
                Sign Up
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* Main Content Area */}
      <div className="container mt-4">
        {!token && view === 'login' && <Login onLogin={handleLogin} />}
        {!token && view === 'signup' && <Signup onSignupSuccess={() => setView('login')} />}
        {token && view === 'updatePassword' && <UpdatePassword token={token} />}
        {token && view === 'dashboard' && (
          <>
            {user?.role === 'ADMIN' && <AdminDashboard token={token} />}
            {user?.role === 'USER' && <UserDashboard token={token} />}
            {user?.role === 'STORE_OWNER' && <OwnerDashboard token={token} />}
          </>
        )}
      </div>
    </div>
  );
}

// ========================
// 1. LOGIN COMPONENT
// ========================
function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await axios.post(`${API_BASE}/auth/login`, { email, password });
      onLogin(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed.');
    }
  };

  return (
    <div className="col-md-6 offset-md-3 card p-4 shadow-sm">
      <h3 className="mb-3 text-center">Login to Portal</h3>
      {error && <div className="alert alert-danger">{error}</div>}
      <form onSubmit={submit}>
        <div className="mb-3">
          <label>Email Address</label>
          <input
            type="email"
            className="form-control"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="mb-3">
          <label>Password</label>
          <input
            type="password"
            className="form-control"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <button className="btn btn-primary w-100">Login</button>
      </form>
    </div>
  );
}

// ========================
// 2. SIGNUP COMPONENT
// ========================
function Signup({ onSignupSuccess }) {
  const [form, setForm] = useState({ name: '', email: '', password: '', address: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await axios.post(`${API_BASE}/auth/signup`, form);
      setSuccess('Account created successfully! You can now log in.');
      setTimeout(onSignupSuccess, 1500);
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed.');
    }
  };

  return (
    <div className="col-md-6 offset-md-3 card p-4 shadow-sm">
      <h3 className="mb-3 text-center">Normal User Registration</h3>
      {error && <div className="alert alert-danger">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}
      <form onSubmit={submit}>
        <div className="mb-3">
          <label>Full Name (20 to 60 characters)</label>
          <input
            className="form-control"
            required
            minLength={20}
            maxLength={60}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </div>
        <div className="mb-3">
          <label>Email Address</label>
          <input
            type="email"
            className="form-control"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </div>
        <div className="mb-3">
          <label>Password (8-16 chars, 1 uppercase, 1 special character)</label>
          <input
            type="password"
            className="form-control"
            required
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
        </div>
        <div className="mb-3">
          <label>Address (Max 400 characters)</label>
          <textarea
            className="form-control"
            rows="3"
            maxLength={400}
            required
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
          />
        </div>
        <button className="btn btn-success w-100">Sign Up</button>
      </form>
    </div>
  );
}

// ========================
// 3. UPDATE PASSWORD
// ========================
function UpdatePassword({ token }) {
  const [newPassword, setNewPassword] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setMsg('');
    setErr('');
    try {
      const res = await axios.patch(
        `${API_BASE}/auth/update-password`,
        { newPassword },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMsg(res.data.message);
      setNewPassword('');
    } catch (error) {
      setErr(error.response?.data?.error || 'Failed to update password.');
    }
  };

  return (
    <div className="col-md-6 offset-md-3 card p-4 shadow-sm">
      <h4>Update Password</h4>
      {err && <div className="alert alert-danger">{err}</div>}
      {msg && <div className="alert alert-success">{msg}</div>}
      <form onSubmit={submit}>
        <div className="mb-3">
          <label>New Password (8-16 chars, 1 uppercase, 1 special character)</label>
          <input
            type="password"
            className="form-control"
            required
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
        </div>
        <button className="btn btn-warning w-100">Save New Password</button>
      </form>
    </div>
  );
}

// ========================
// 4. ADMIN DASHBOARD
// ========================
function AdminDashboard({ token }) {
  const [stats, setStats] = useState({ totalUsers: 0, totalStores: 0, totalRatings: 0 });
  const [tab, setTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [stores, setStores] = useState([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [userSort, setUserSort] = useState({ col: 'name', dir: 'ASC' });
  const [storeSort, setStoreSort] = useState({ col: 'name', dir: 'ASC' });

  // Modals / Form state
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', address: '', role: 'USER' });
  const [newStore, setNewStore] = useState({ name: '', email: '', address: '', owner_id: '' });
  const [alert, setAlert] = useState('');

  const headers = { Authorization: `Bearer ${token}` };

  const fetchStats = async () => {
    try {
      const res = await axios.get(`${API_BASE}/admin/dashboard`, { headers });
      setStats(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await axios.get(
        `${API_BASE}/admin/users?search=${search}&role=${roleFilter}&sortBy=${userSort.col}&order=${userSort.dir}`,
        { headers }
      );
      setUsers(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchStores = async () => {
    try {
      const res = await axios.get(
        `${API_BASE}/admin/stores?search=${search}&sortBy=${storeSort.col}&order=${storeSort.dir}`,
        { headers }
      );
      setStores(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    if (tab === 'users') fetchUsers();
    else fetchStores();
  }, [tab, search, roleFilter, userSort, storeSort]);

  const addUser = async (e) => {
    e.preventDefault();
    setAlert('');
    try {
      await axios.post(`${API_BASE}/admin/users`, newUser, { headers });
      setAlert('User created successfully');
      setNewUser({ name: '', email: '', password: '', address: '', role: 'USER' });
      fetchUsers();
      fetchStats();
    } catch (err) {
      setAlert(err.response?.data?.error || 'Failed to create user');
    }
  };

  const addStore = async (e) => {
    e.preventDefault();
    setAlert('');
    try {
      await axios.post(`${API_BASE}/admin/stores`, newStore, { headers });
      setAlert('Store created successfully');
      setNewStore({ name: '', email: '', address: '', owner_id: '' });
      fetchStores();
      fetchStats();
    } catch (err) {
      setAlert(err.response?.data?.error || 'Failed to create store');
    }
  };

  return (
    <div>
      {/* Metric Cards */}
      <div className="row mb-4">
        <div className="col-md-4">
          <div className="card bg-primary text-white p-3 text-center">
            <h3>{stats.totalUsers}</h3>
            <div>Total Users</div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card bg-success text-white p-3 text-center">
            <h3>{stats.totalStores}</h3>
            <div>Total Stores</div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card bg-info text-white p-3 text-center">
            <h3>{stats.totalRatings}</h3>
            <div>Total Submitted Ratings</div>
          </div>
        </div>
      </div>

      {alert && <div className="alert alert-info">{alert}</div>}

      {/* Tabs */}
      <ul className="nav nav-tabs mb-3">
        <li className="nav-item">
          <button
            className={`nav-link ${tab === 'users' ? 'active' : ''}`}
            onClick={() => {
              setTab('users');
              setSearch('');
            }}
          >
            Manage Users
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${tab === 'stores' ? 'active' : ''}`}
            onClick={() => {
              setTab('stores');
              setSearch('');
            }}
          >
            Manage Stores
          </button>
        </li>
      </ul>

      {/* USERS TAB */}
      {tab === 'users' && (
        <div>
          <div className="row g-2 mb-3">
            <div className="col-md-6">
              <input
                className="form-control"
                placeholder="Search by Name, Email, Address..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="col-md-4">
              <select
                className="form-select"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
              >
                <option value="">Filter by All Roles</option>
                <option value="ADMIN">System Administrator</option>
                <option value="USER">Normal User</option>
                <option value="STORE_OWNER">Store Owner</option>
              </select>
            </div>
          </div>

          <div className="table-responsive">
            <table className="table table-bordered table-hover">
              <thead className="table-light">
                <tr>
                  <th
                    style={{ cursor: 'pointer' }}
                    onClick={() =>
                      setUserSort({
                        col: 'name',
                        dir: userSort.dir === 'ASC' ? 'DESC' : 'ASC',
                      })
                    }
                  >
                    Name {userSort.col === 'name' ? (userSort.dir === 'ASC' ? '▲' : '▼') : ''}
                  </th>
                  <th
                    style={{ cursor: 'pointer' }}
                    onClick={() =>
                      setUserSort({
                        col: 'email',
                        dir: userSort.dir === 'ASC' ? 'DESC' : 'ASC',
                      })
                    }
                  >
                    Email {userSort.col === 'email' ? (userSort.dir === 'ASC' ? '▲' : '▼') : ''}
                  </th>
                  <th>Address</th>
                  <th
                    style={{ cursor: 'pointer' }}
                    onClick={() =>
                      setUserSort({
                        col: 'role',
                        dir: userSort.dir === 'ASC' ? 'DESC' : 'ASC',
                      })
                    }
                  >
                    Role {userSort.col === 'role' ? (userSort.dir === 'ASC' ? '▲' : '▼') : ''}
                  </th>
                  <th>Store Owner Rating</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>{u.name}</td>
                    <td>{u.email}</td>
                    <td>{u.address}</td>
                    <td>
                      <span className="badge bg-secondary">{u.role}</span>
                    </td>
                    <td>{u.role === 'STORE_OWNER' ? u.rating ?? 'No ratings yet' : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Add User Form */}
          <div className="card p-3 mt-4">
            <h5>Add New User (Admin, Store Owner, or User)</h5>
            <form onSubmit={addUser} className="row g-2">
              <div className="col-md-3">
                <input
                  className="form-control"
                  placeholder="Full Name (20-60 chars)"
                  minLength={20}
                  maxLength={60}
                  required
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                />
              </div>
              <div className="col-md-3">
                <input
                  type="email"
                  className="form-control"
                  placeholder="Email"
                  required
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                />
              </div>
              <div className="col-md-2">
                <input
                  type="password"
                  className="form-control"
                  placeholder="Password"
                  required
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                />
              </div>
              <div className="col-md-2">
                <select
                  className="form-select"
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                >
                  <option value="USER">User</option>
                  <option value="ADMIN">Admin</option>
                  <option value="STORE_OWNER">Store Owner</option>
                </select>
              </div>
              <div className="col-md-10">
                <input
                  className="form-control"
                  placeholder="Address (Max 400 chars)"
                  maxLength={400}
                  required
                  value={newUser.address}
                  onChange={(e) => setNewUser({ ...newUser, address: e.target.value })}
                />
              </div>
              <div className="col-md-2">
                <button className="btn btn-primary w-100">Add User</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* STORES TAB */}
      {tab === 'stores' && (
        <div>
          <div className="row g-2 mb-3">
            <div className="col-md-6">
              <input
                className="form-control"
                placeholder="Search by Name or Address..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="table-responsive">
            <table className="table table-bordered table-hover">
              <thead className="table-light">
                <tr>
                  <th
                    style={{ cursor: 'pointer' }}
                    onClick={() =>
                      setStoreSort({
                        col: 'name',
                        dir: storeSort.dir === 'ASC' ? 'DESC' : 'ASC',
                      })
                    }
                  >
                    Name {storeSort.col === 'name' ? (storeSort.dir === 'ASC' ? '▲' : '▼') : ''}
                  </th>
                  <th>Email</th>
                  <th
                    style={{ cursor: 'pointer' }}
                    onClick={() =>
                      setStoreSort({
                        col: 'address',
                        dir: storeSort.dir === 'ASC' ? 'DESC' : 'ASC',
                      })
                    }
                  >
                    Address {storeSort.col === 'address' ? (storeSort.dir === 'ASC' ? '▲' : '▼') : ''}
                  </th>
                  <th>Overall Rating</th>
                </tr>
              </thead>
              <tbody>
                {stores.map((s) => (
                  <tr key={s.id}>
                    <td>{s.name}</td>
                    <td>{s.email}</td>
                    <td>{s.address}</td>
                    <td>⭐ {s.rating}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Add Store Form */}
          <div className="card p-3 mt-4">
            <h5>Add New Store</h5>
            <form onSubmit={addStore} className="row g-2">
              <div className="col-md-4">
                <input
                  className="form-control"
                  placeholder="Store Name (20-60 chars)"
                  minLength={20}
                  maxLength={60}
                  required
                  value={newStore.name}
                  onChange={(e) => setNewStore({ ...newStore, name: e.target.value })}
                />
              </div>
              <div className="col-md-4">
                <input
                  type="email"
                  className="form-control"
                  placeholder="Store Email"
                  required
                  value={newStore.email}
                  onChange={(e) => setNewStore({ ...newStore, email: e.target.value })}
                />
              </div>
              <div className="col-md-4">
                <select
                  className="form-select"
                  value={newStore.owner_id}
                  onChange={(e) => setNewStore({ ...newStore, owner_id: e.target.value })}
                >
                  <option value="">Assign Store Owner (Optional)</option>
                  {users
                    .filter((u) => u.role === 'STORE_OWNER')
                    .map((owner) => (
                      <option key={owner.id} value={owner.id}>
                        {owner.name} ({owner.email})
                      </option>
                    ))}
                </select>
              </div>
              <div className="col-md-10">
                <input
                  className="form-control"
                  placeholder="Store Address (Max 400 chars)"
                  maxLength={400}
                  required
                  value={newStore.address}
                  onChange={(e) => setNewStore({ ...newStore, address: e.target.value })}
                />
              </div>
              <div className="col-md-2">
                <button className="btn btn-success w-100">Add Store</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ========================
// 5. NORMAL USER DASHBOARD
// ========================
function UserDashboard({ token }) {
  const [stores, setStores] = useState([]);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [order, setOrder] = useState('ASC');
  const [msg, setMsg] = useState('');

  const headers = { Authorization: `Bearer ${token}` };

  const fetchStores = async () => {
    try {
      const res = await axios.get(
        `${API_BASE}/stores?search=${search}&sortBy=${sortBy}&order=${order}`,
        { headers }
      );
      setStores(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchStores();
  }, [search, sortBy, order]);

  const submitRating = async (store_id, rating) => {
    try {
      const res = await axios.post(`${API_BASE}/ratings`, { store_id, rating }, { headers });
      setMsg(res.data.message);
      fetchStores();
      setTimeout(() => setMsg(''), 3000);
    } catch (err) {
      setMsg(err.response?.data?.error || 'Rating submission failed');
    }
  };

  return (
    <div>
      <h3 className="mb-3">Registered Stores</h3>
      {msg && <div className="alert alert-success">{msg}</div>}

      <div className="row mb-3">
        <div className="col-md-6">
          <input
            className="form-control"
            placeholder="Search stores by Name or Address..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="table-responsive">
        <table className="table table-bordered table-striped align-middle">
          <thead className="table-dark">
            <tr>
              <th
                style={{ cursor: 'pointer' }}
                onClick={() => {
                  setSortBy('name');
                  setOrder(order === 'ASC' ? 'DESC' : 'ASC');
                }}
              >
                Store Name {sortBy === 'name' ? (order === 'ASC' ? '▲' : '▼') : ''}
              </th>
              <th
                style={{ cursor: 'pointer' }}
                onClick={() => {
                  setSortBy('address');
                  setOrder(order === 'ASC' ? 'DESC' : 'ASC');
                }}
              >
                Address {sortBy === 'address' ? (order === 'ASC' ? '▲' : '▼') : ''}
              </th>
              <th>Overall Rating</th>
              <th>Your Submitted Rating</th>
              <th>Action (Rate / Modify)</th>
            </tr>
          </thead>
          <tbody>
            {stores.map((s) => (
              <tr key={s.id}>
                <td className="fw-bold">{s.name}</td>
                <td>{s.address}</td>
                <td>⭐ {s.overall_rating} / 5</td>
                <td>
                  {s.user_submitted_rating ? (
                    <span className="badge bg-success">Rated: {s.user_submitted_rating} ⭐</span>
                  ) : (
                    <span className="text-muted">Not rated yet</span>
                  )}
                </td>
                <td>
                  <div className="d-flex gap-1">
                    {[1, 2, 3, 4, 5].map((val) => (
                      <button
                        key={val}
                        className={`btn btn-sm ${
                          s.user_submitted_rating === val ? 'btn-warning' : 'btn-outline-secondary'
                        }`}
                        onClick={() => submitRating(s.id, val)}
                      >
                        {val}★
                      </button>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ========================
// 6. STORE OWNER DASHBOARD
// ========================
function OwnerDashboard({ token }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchOwnerData = async () => {
      try {
        const res = await axios.get(`${API_BASE}/owner/dashboard`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setData(res.data);
      } catch (err) {
        setError(err.response?.data?.error || 'Could not load store details.');
      }
    };
    fetchOwnerData();
  }, [token]);

  if (error) {
    return <div className="alert alert-warning mt-4">{error}</div>;
  }

  if (!data) {
    return <div className="mt-4">Loading store dashboard...</div>;
  }

  return (
    <div>
      <div className="card p-4 mb-4 bg-light">
        <h2>{data.storeName}</h2>
        <h4 className="text-primary">Average Rating: ⭐ {data.averageRating} / 5</h4>
      </div>

      <h4>Users Who Rated Your Store</h4>
      <div className="table-responsive">
        <table className="table table-bordered table-hover">
          <thead className="table-secondary">
            <tr>
              <th>User Name</th>
              <th>User Email</th>
              <th>Rating Given</th>
              <th>Date & Time</th>
            </tr>
          </thead>
          <tbody>
            {data.raters.length > 0 ? (
              data.raters.map((r, i) => (
                <tr key={i}>
                  <td>{r.name}</td>
                  <td>{r.email}</td>
                  <td>⭐ {r.rating} / 5</td>
                  <td>{new Date(r.updated_at).toLocaleString()}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="4" className="text-center text-muted">
                  No ratings submitted yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}