const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const pool = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

// Validation Helper
const validateUserInputs = ({ name, email, password, address }) => {
  if (name && (name.trim().length < 20 || name.trim().length > 60)) {
    return 'Name must be between 20 and 60 characters.';
  }
  if (address && address.trim().length > 400) {
    return 'Address cannot exceed 400 characters.';
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (email && !emailRegex.test(email)) {
    return 'Invalid email address.';
  }
  const passwordRegex = /^(?=.*[A-Z])(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,16}$/;
  if (password && !passwordRegex.test(password)) {
    return 'Password must be 8-16 characters and contain at least one uppercase letter and one special character.';
  }
  return null;
};

// Middlewares
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access token required.' });

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token.' });
    req.user = user;
    next();
  });
};

const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Permission denied.' });
    }
    next();
  };
};

// Routes
app.post('/api/auth/signup', async (req, res) => {
  const { name, email, password, address } = req.body;
  const validationError = validateUserInputs({ name, email, password, address });
  if (validationError) return res.status(400).json({ error: validationError });

  try {
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) return res.status(400).json({ error: 'Email already registered.' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO users (name, email, password, address, role) 
       VALUES ($1, $2, $3, $4, 'USER') RETURNING id, name, email, address, role`,
      [name.trim(), email.trim().toLowerCase(), hashedPassword, address.trim()]
    );

    res.status(201).json({ message: 'User registered successfully', user: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required.' });

  try {
    const userRes = await pool.query('SELECT * FROM users WHERE email = $1', [email.trim().toLowerCase()]);
    if (userRes.rows.length === 0) return res.status(400).json({ error: 'Invalid email or password.' });

    const user = userRes.rows[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: 'Invalid email or password.' });

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, address: user.address }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/auth/update-password', authenticateToken, async (req, res) => {
  const { newPassword } = req.body;
  const passwordRegex = /^(?=.*[A-Z])(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,16}$/;
  if (!passwordRegex.test(newPassword)) {
    return res.status(400).json({
      error: 'Password must be 8-16 characters and contain at least one uppercase letter and one special character.'
    });
  }

  try {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password = $1 WHERE id = $2', [hashedPassword, req.user.id]);
    res.json({ message: 'Password updated successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/dashboard', authenticateToken, authorizeRoles('ADMIN'), async (req, res) => {
  try {
    const userCount = await pool.query('SELECT COUNT(*) FROM users');
    const storeCount = await pool.query('SELECT COUNT(*) FROM stores');
    const ratingCount = await pool.query('SELECT COUNT(*) FROM ratings');

    res.json({
      totalUsers: parseInt(userCount.rows[0].count),
      totalStores: parseInt(storeCount.rows[0].count),
      totalRatings: parseInt(ratingCount.rows[0].count),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/users', authenticateToken, authorizeRoles('ADMIN'), async (req, res) => {
  const { name, email, password, address, role } = req.body;
  const validationError = validateUserInputs({ name, email, password, address });
  if (validationError) return res.status(400).json({ error: validationError });

  try {
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) return res.status(400).json({ error: 'Email already exists.' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO users (name, email, password, address, role) 
       VALUES ($1, $2, $3, $4, $5) RETURNING id, name, email, address, role`,
      [name.trim(), email.trim().toLowerCase(), hashedPassword, address.trim(), role || 'USER']
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/users', authenticateToken, authorizeRoles('ADMIN'), async (req, res) => {
  const { search = '', role = '', sortBy = 'name', order = 'ASC' } = req.query;
  const allowedSort = ['name', 'email', 'address', 'role'];
  const sortCol = allowedSort.includes(sortBy) ? sortBy : 'name';
  const sortDir = order.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

  try {
    const query = `
      SELECT u.id, u.name, u.email, u.address, u.role,
        CASE 
          WHEN u.role = 'STORE_OWNER' THEN (
            SELECT COALESCE(ROUND(AVG(r.rating), 1), 0.0) 
            FROM stores s 
            LEFT JOIN ratings r ON s.id = r.store_id 
            WHERE s.owner_id = u.id
          )
          ELSE NULL 
        END AS rating
      FROM users u
      WHERE ($1 = '' OR u.name ILIKE '%' || $1 || '%' OR u.email ILIKE '%' || $1 || '%' OR u.address ILIKE '%' || $1 || '%')
        AND ($2 = '' OR u.role::text = $2)
      ORDER BY u.${sortCol} ${sortDir}
    `;
    const result = await pool.query(query, [search, role]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/stores', authenticateToken, authorizeRoles('ADMIN'), async (req, res) => {
  const { name, email, address, owner_id } = req.body;
  if (!name || name.trim().length < 20 || name.trim().length > 60) {
    return res.status(400).json({ error: 'Store name must be 20 to 60 characters.' });
  }
  if (!address || address.trim().length > 400) {
    return res.status(400).json({ error: 'Address cannot exceed 400 characters.' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO stores (name, email, address, owner_id) 
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [name.trim(), email.trim().toLowerCase(), address.trim(), owner_id || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/stores', authenticateToken, authorizeRoles('ADMIN'), async (req, res) => {
  const { search = '', sortBy = 'name', order = 'ASC' } = req.query;
  const allowedSort = ['name', 'email', 'address'];
  const sortCol = allowedSort.includes(sortBy) ? `s.${sortBy}` : 's.name';
  const sortDir = order.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

  try {
    const query = `
      SELECT s.id, s.name, s.email, s.address, 
             COALESCE(ROUND(AVG(r.rating), 1), 0.0) AS rating
      FROM stores s
      LEFT JOIN ratings r ON s.id = r.store_id
      WHERE ($1 = '' OR s.name ILIKE '%' || $1 || '%' OR s.email ILIKE '%' || $1 || '%' OR s.address ILIKE '%' || $1 || '%')
      GROUP BY s.id
      ORDER BY ${sortCol} ${sortDir}
    `;
    const result = await pool.query(query, [search]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/stores', authenticateToken, async (req, res) => {
  const { search = '', sortBy = 'name', order = 'ASC' } = req.query;
  const allowedSort = ['name', 'address'];
  const sortCol = allowedSort.includes(sortBy) ? `s.${sortBy}` : 's.name';
  const sortDir = order.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

  try {
    const query = `
      SELECT 
        s.id, 
        s.name, 
        s.address, 
        COALESCE(ROUND(AVG(r.rating), 1), 0.0) AS overall_rating,
        user_r.rating AS user_submitted_rating
      FROM stores s
      LEFT JOIN ratings r ON s.id = r.store_id
      LEFT JOIN ratings user_r ON s.id = user_r.store_id AND user_r.user_id = $1
      WHERE ($2 = '' OR s.name ILIKE '%' || $2 || '%' OR s.address ILIKE '%' || $2 || '%')
      GROUP BY s.id, user_r.rating
      ORDER BY ${sortCol} ${sortDir}
    `;
    const result = await pool.query(query, [req.user.id, search]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/ratings', authenticateToken, authorizeRoles('USER'), async (req, res) => {
  const { store_id, rating } = req.body;
  const rateVal = parseInt(rating);

  if (isNaN(rateVal) || rateVal < 1 || rateVal > 5) {
    return res.status(400).json({ error: 'Rating must be an integer between 1 and 5.' });
  }

  try {
    const query = `
      INSERT INTO ratings (user_id, store_id, rating, updated_at)
      VALUES ($1, $2, $3, NOW())
      ON CONFLICT (user_id, store_id)
      DO UPDATE SET rating = EXCLUDED.rating, updated_at = NOW()
      RETURNING *
    `;
    const result = await pool.query(query, [req.user.id, store_id, rateVal]);
    res.json({ message: 'Rating submitted successfully', rating: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/owner/dashboard', authenticateToken, authorizeRoles('STORE_OWNER'), async (req, res) => {
  try {
    const storeRes = await pool.query('SELECT * FROM stores WHERE owner_id = $1', [req.user.id]);
    if (storeRes.rows.length === 0) {
      return res.status(404).json({ error: 'No store assigned to this owner account.' });
    }
    const store = storeRes.rows[0];

    const avgRes = await pool.query(
      'SELECT COALESCE(ROUND(AVG(rating), 1), 0.0) AS average_rating FROM ratings WHERE store_id = $1',
      [store.id]
    );

    const ratersRes = await pool.query(
      `SELECT u.name, u.email, r.rating, r.updated_at
       FROM ratings r
       JOIN users u ON r.user_id = u.id
       WHERE r.store_id = $1
       ORDER BY r.updated_at DESC`,
      [store.id]
    );

    res.json({
      storeName: store.name,
      averageRating: avgRes.rows[0].average_rating,
      raters: ratersRes.rows,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Roxiler Backend Server running on port ${PORT}`);
});