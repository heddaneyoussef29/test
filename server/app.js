import dotenv from 'dotenv';
import express from 'express';
import bodyParser from 'body-parser';
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import NodeCache from 'node-cache';
import axios from 'axios';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const cache = new NodeCache({ stdTTL: 600 }); // b9a tl3ab bin 100 w 1000




// Middleware
app.use(cors()); // Apply rate limiting
app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded
// Database connection
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'crypto',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// JWT secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Helper function to execute queries
async function query(sql, params) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}

// API Routes
app.get('/api/crypto/markets', async (req, res) => {
  try {
    const cacheKey = 'markets-top100';
    const cachedData = cache.get(cacheKey);
    
    if (cachedData) {
      return res.json(cachedData);
    }
    
    const response = await axios.get(
      'https://api.coingecko.com/api/v3/coins/markets',
      {
        params: {
          vs_currency: 'usd',
          order: 'market_cap_desc',
          per_page: 100,
          page: 1,
          sparkline: true,
          price_change_percentage: '1h,24h,7d'
        }
      }
    );
    
    cache.set(cacheKey, response.data);
    res.json(response.data);
  } catch (error) {
    console.error('CoinGecko API error:', error);
    res.status(error.response?.status || 500).json({ 
      error: error.message 
    });
  }
});

// Specific coins endpoint - tries to use cached top 100 data first
app.get('/api/crypto/markets/:ids', async (req, res) => {
  try {
    const { ids } = req.params;
    const cacheKey = `markets-${ids}`;
    
    // Check specific cache first
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
      return res.json(cachedData);
    }
    
    // Check if we have the top 100 cached
    const top100CacheKey = 'markets-top100';
    const top100Data = cache.get(top100CacheKey);
    
    if (top100Data) {
      // Filter the top 100 data for requested IDs
      const requestedIds = ids.split(',');
      const filteredData = top100Data.filter(coin => 
        requestedIds.includes(coin.id)
      );
      
      if (filteredData.length > 0) {
        // Cache and return the filtered results
        cache.set(cacheKey, filteredData);
        return res.json(filteredData);
      }
    }
    
    // Fallback to direct API call if not in top 100 cache
    const response = await axios.get(
      'https://api.coingecko.com/api/v3/coins/markets',
      {
        params: {
          vs_currency: 'usd',
          ids: ids,
          order: 'market_cap_desc',
          per_page: 100,
          page: 1,
          sparkline: false
        }
      }
    );
    
    cache.set(cacheKey, response.data);
    res.json(response.data);
  } catch (error) {
    console.error('CoinGecko API error:', error);
    res.status(error.response?.status || 500).json({ 
      error: error.message 
    });
  }
});
// Register endpoint
app.post('/api/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    // Validate input
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }
    
    // Check if user exists
    const existingUser = await query('SELECT * FROM user WHERE email = ?', [email]);
    if (existingUser.length > 0) {
      return res.status(400).json({ success: false, message: 'User already exists' });
    }
    
    // Hash passwor
    
    // Create user
    const result = await query(
      'INSERT INTO user (name, email, password, role, walletBalance) VALUES (?, ?, ?, ?, ?)',
      [name, email, password, 'user', 0] // Default role and balance
    );
    
    // Get the new user
    const newUser = await query('SELECT id, name, email, role, walletBalance FROM user WHERE id = ?', [result.insertId]);
    
    // Create token
    const token = jwt.sign({ userId: newUser[0].id }, JWT_SECRET, { expiresIn: '1h' });
    
    res.json({ 
      success: true, 
      user: newUser[0],
      token 
    });
    
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Login endpoint
app.post('/api/login', async (req, res) => {
  try {
    // Add validation for request body
    if (!req.body || !req.body.email || !req.body.password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email and password are required' 
      });
    }

    const { email, password } = req.body;
    
    // Rest of your login logic...
    const users = await query('SELECT * FROM user WHERE email = ? and password = ?', [email, password]);
    if (users.length === 0) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid credentials' 
      });
    }

    const user = users[0];

    // Create token and respond
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '1h' });
    
    const userData = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      walletBalance: user.walletBalance,
      cryptoHoldings: user.cryptoHoldings ? JSON.parse(user.cryptoHoldings) : []
    };
    
    res.json({ 
      success: true, 
      user: userData,
      token 
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during login' 
    });
  }
});
// Get user's crypto holdings
app.post('/api/holdings', async (req, res) => {
    try {
      // Validate required fields
      if (!req.body || !req.body.userId ) {
        return res.status(400).json({ 
          success: false, 
          message: 'id is required' 
        });
      }
      const userId = req.body.userId;
      const holdings = await query(
        `SELECT crypto_id,amount 
         FROM crypto_holdings
         WHERE user_id = ?`,
        [userId]
      );
  
      res.json({ success: true, holdings });
    } catch (error) {
      console.error('Error fetching holdings:', error);
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: error.message
      });
    }
});

// Update crypto holdings after transaction
// app.post('/api/user/:userId/holdings', async (req, res) => {
//   try {
//     const { userId } = req.params;
//     const { cryptoId, amount } = req.body;

//     // Validate input
//     if (!cryptoId || amount === undefined) {
//       return res.status(400).json({ 
//         success: false, 
//         message: 'cryptoId and amount are required' 
//       });
//     }

//     // Upsert the holding
//     await pool.query(`
//       INSERT INTO crypto_holdings (user_id, crypto_id, amount)
//       VALUES (?, ?, ?)
//       ON DUPLICATE KEY UPDATE amount = amount + VALUES(amount)
//     `, [userId, cryptoId, amount]);

//     res.json({ success: true });
//   } catch (error) {
//     console.error('Error updating holdings:', error);
//     res.status(500).json({ success: false, message: 'Server error' });
//   }
// });
// Logout endpoint (client-side token deletion)
app.post('/api/logout', (_, res) => {
  // Since we're using JWT, logout is handled client-side by deleting the token
  res.json({ success: true, message: 'Logged out successfully' });
});

// Protected user endpoint example
app.get('/api/user', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const user = await query(
      'SELECT id, name, email, role, walletBalance, cryptoHoldings FROM user WHERE id = ?', 
      [userId]
    );
    
    if (user.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    const userData = {
      ...user[0],
      cryptoHoldings: user[0].cryptoHoldings ? JSON.parse(user[0].cryptoHoldings) : []
    };
    
    res.json({ success: true, user: userData });
    
  } catch (error) {
    console.error('User fetch error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Middleware to authenticate JWT token
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ success: false, message: 'No token provided' });
  }
  
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ success: false, message: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
}
// Cryptocurrencies endpoints
app.get('/api/cryptocurrencies', async (_, res) => {
  try {
    const cryptos = await query('SELECT * FROM cryptocurrencies');
    res.json(cryptos);
  } catch (error) {
    console.error('Error fetching cryptocurrencies:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Watchlist endpoints
app.get('/api/watchlist', async (req, res) => {
  try {
    const { userId } = req.query;
    const items = await query(`
      SELECT w.*, c.name, c.symbol, c.current_price 
      FROM watchlist w
      JOIN cryptocurrencies c ON w.crypto_id = c.id
      WHERE w.user_id = ?
    `, [userId]);
    res.json(items);
  } catch (error) {
    console.error('Error fetching watchlist:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});
// Add to watchlist
app.post('/api/watchlist', async (req, res) => {
  try {
    const { userId, cryptoId } = req.body;
    
    // Validate required fields
    if (!userId || !cryptoId) {
      return res.status(400).json({ 
        success: false, 
        message: 'userId and cryptoId are required' 
      });
    }

    await query(
      'INSERT INTO watchlist (id, user_id, crypto_id) VALUES (UUID(), ?, ?)',
      [userId, cryptoId]
    );
    res.json({ success: true });
  } catch (error) {
    console.error('Error adding to watchlist:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error',
      error: error.message 
    });
  }
});

// Remove from watchlist
app.delete('/api/watchlist/:cryptoId', async (req, res) => {
  try {
    const { cryptoId } = req.params;
    const { userId } = req.query;
    
    // Validate required fields
    if (!userId) {
      return res.status(400).json({ 
        success: false, 
        message: 'userId query parameter is required' 
      });
    }

    await query(
      'DELETE FROM watchlist WHERE crypto_id = ? AND user_id = ?',
      [cryptoId, userId]
    );
    res.json({ success: true });
  } catch (error) {
    console.error('Error removing from watchlist:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error',
      error: error.message 
    });
  }
});
// Get transactions for a user
app.get('/api/transactions', async (req, res) => {
  try {
    const { userId } = req.query;

    // Validate required fields
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'userId query parameter is required'
      });
    }

    const transactions = await query(
      `SELECT t.*, c.name AS cryptoName, c.symbol AS cryptoSymbol 
       FROM transactions t
       JOIN cryptocurrencies c ON t.crypto_id = c.id
       WHERE t.user_id = ?`,
      [userId]
    );

    res.json({ success: true, transactions });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});
app.get('/api/transactionsall', async (req, res) => {
  try {

    const transactions = await query(
      `SELECT t.*, c.name AS cryptoName, c.symbol AS cryptoSymbol 
       FROM transactions t
       JOIN cryptocurrencies c ON t.crypto_id = c.id`
    );

    res.json({ success: true, transactions });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});
app.post('/api/hold', async (req, res) => {
  try {
    // Add validation for request body
    if (!req.body || !req.body.userId ) {
      return res.status(400).json({ 
        success: false, 
        message: 'id is required' 
      });
    }

    const { userId } = req.body;
    
    // Rest of your login logic...
    const users = await query('SELECT * FROM user WHERE id = ? ', [userId]);
    if (users.length === 0) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid credentials' 
      });
    }

    const user = users[0];

    // Create token and respond
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '1h' });
    
    const userData = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      walletBalance: user.walletBalance,
      cryptoHoldings: user.cryptoHoldings ? JSON.parse(user.cryptoHoldings) : []
    };
    
    res.json({ 
      success: true, 
      user: userData,
      token 
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during login' 
    });
  }
});

app.get('/api/users', async (req, res) => {
  try {
    const { userId } = req.query;

    // Validate required fields
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'userId query parameter is required'
      });
    }

    const data = await query(
      `SELECT * 
       FROM user
       WHERE id = ?`,
      [userId]
    );
const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '1h' });
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});


app.get('/api/amount/:id/:cryptoId', async (req, res) => {
  try {
    const { id,cryptoId } = req.params;

    const data = await query(
      `SELECT amount
       FROM crypto_holdings where user_id = ? and crypto_id = ?`,
      [id,cryptoId]
    );
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

app.get('/api/name', async (req, res) => {
  try {
    const { id } = req.query;

    const data = await query(
      `SELECT name 
       FROM user
       WHERE id = ?`,
      [id]
    );
    res.send(data[0]?.name || '');
  } catch (error) {
    console.error('Error fetching transactions:', error);
  }
});
// Create transaction
app.post('/api/transactions', async (req, res) => {
  try {
    const { userId, cryptoId, type, amount, price,wallet } = req.body;
    
    // Validate all required fields
    if (userId === undefined || cryptoId === undefined || 
        type === undefined || amount === undefined || price === undefined) {
      return res.status(400).json({ 
        success: false, 
        message: 'All fields (userId, cryptoId, type, amount, price,) are required' 
      });
    }

    // Validate numeric fields
    if (isNaN(amount) || isNaN(price)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Amount and price must be numbers' 
      });
    }

    // Validate transaction type
    if (!['buy', 'sell','withdrawal','deposit'].includes(type)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid transaction type' 
      });
    }

    // Convert to numbers to ensure proper type
    const numericAmount = Number(amount);
    const numericPrice = Number(price);

    // Check if user exists
    const [users] = await pool.query('SELECT id FROM user WHERE id = ?', [userId]);
    if (users.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    // Check if cryptocurrency exists
    const [cryptos] = await pool.query('SELECT id FROM cryptocurrencies WHERE id = ?', [cryptoId]);
    if (cryptos.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Cryptocurrency not found' 
      });
    }

    // Create transaction
    await pool.query(
      `INSERT INTO transactions 
       (id, user_id, crypto_id, type, amount, price,wallet, status) 
       VALUES (UUID(), ?, ?, ?, ?,?, ?, 'pending')`,
      [userId, cryptoId, type, numericAmount, numericPrice,wallet]
    );

    res.json({ 
      success: true,
      message: 'Transaction created successfully'
    });

  } catch (error) {
    console.error('Error creating transaction:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error while creating transaction',
      error: error.message 
    });
  }
});

// Approve transaction
app.patch('/api/transactions/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate transaction exists first
    const [transaction] = await query(
      'SELECT * FROM transactions WHERE id = ?',
      [id]
    );
    
    if (!transaction) {
      return res.status(404).json({ 
        success: false, 
        message: 'Transaction not found' 
      });
    }

    await query(
      `UPDATE transactions SET status = 'completed' WHERE id = ?`,
      [id]
    );
    // Update user's wallet balance if needed
    if (transaction.type === 'buy') {
        await query(`
        INSERT INTO crypto_holdings (user_id, crypto_id, amount)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE amount = amount + VALUES(amount)
      `, [transaction.user_id, transaction.crypto_id, transaction.amount]);
      } else if (transaction.type === 'sell') {
      await query(
        `UPDATE user SET walletBalance = walletBalance + ? WHERE id = ?`,
        [transaction.amount * transaction.price, transaction.user_id]
      );
      await query(`
        INSERT INTO crypto_holdings (user_id, crypto_id, amount)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE amount = amount - VALUES(amount)
      `, [transaction.user_id, transaction.crypto_id, transaction.amount]);
    }
    else if (transaction.type === 'withdrawal') {
      await query(
        `UPDATE crypto_holdings SET amount = amount - (?+amount*0.14) WHERE user_id = ? AND crypto_id = ?`,
        [transaction.amount, transaction.user_id,transaction.crypto_id]
      );

    }else if (transaction.type === 'deposit') {
      await query(
        `UPDATE user SET walletBalance = walletBalance + ? WHERE id = ?`,
        [transaction.amount * transaction.price, transaction.user_id]
      );
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error approving transaction:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error',
      error: error.message 
    });
  }
});

// Cancel transaction
app.patch('/api/transactions/:id/cancel', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate transaction exists first
    const [transaction] = await query(
      'SELECT * FROM transactions WHERE id = ?',
      [id]
    );
    
    if (!transaction) {
      return res.status(404).json({ 
        success: false, 
        message: 'Transaction not found' 
      });
    }

    await query(
      `UPDATE transactions SET status = 'cancelled' WHERE id = ?`,
      [id]
    );
    res.json({ success: true });
  } catch (error) {
    console.error('Error canceling transaction:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error',
      error: error.message 
    });
  }
});


// User endpoint
app.get('/api/users/:id', async (req, res) => {
  try {
    const [user] = await query('SELECT * FROM user WHERE id = ?', [req.params.id]);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    // Get user's crypto holdings
    const [holdings] = await query(`
      SELECT t.crypto_id, c.symbol, SUM(CASE WHEN t.type = 'buy' THEN t.amount ELSE -t.amount END) as amount
      FROM transactions t
      JOIN cryptocurrencies c ON t.crypto_id = c.id
      WHERE t.user_id = ? AND t.status = 'completed'
      GROUP BY t.crypto_id, c.symbol
      HAVING amount > 0
    `, [req.params.id]);
    
    res.json({
      ...user,
      cryptoHoldings: holdings || []
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});
// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Export for testing
export default app;  // ES Modules (import/export)