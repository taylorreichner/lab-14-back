const express = require('express');
const cors = require('cors');
const client = require('./client.js');
const request = require('superagent');
const app = express();
const morgan = require('morgan');
const ensureAuth = require('./auth/ensure-auth');
const createAuthRoutes = require('./auth/create-auth-routes');

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(morgan('dev')); // http logging

const authRoutes = createAuthRoutes();

// setup authentication routes to give user an auth token
// creates a /auth/signin and a /auth/signup POST route. 
// each requires a POST body with a .email and a .password
app.use('/auth', authRoutes);

// everything that starts with "/api" below here requires an auth token!
app.use('/api', ensureAuth);

// and now every request that has a token in the Authorization header will have a `req.userId` property for us to see who's talking


app.get('/games', async(req, res) => {
  try {
    const request = await request.get(`https://www.cheapshark.com/api/1.0/games?title=${req.body.search}&limit=60&exact=0`);
    
    res.json(request.body);
  } catch(e) {
    
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/favorites', async(req, res) => {
  try {
    const data = await client.query(
      'SELECT * from favorites where owner_id=$1', 
      [req.userId],
    );
    
    res.json(data.rows);
  } catch(e) {
    
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/favorites/:id', async(req, res) => {
  try {
    const data = await client.query(
      'DELETE from favorites where owner_id=$1 AND id=$2', 
      [req.userId, req.params.id],
    );
    
    res.json(data.rows);
  } catch(e) {
    
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/favorites', async(req, res) => {
  try {
    const data = await client.query(`
    INSERT into favorites (title, price, poster, gameID, ownerId)
      VALUES  ($1, $2, $3, $4, $5)
      `, 

      [req.body.title, req.body.price, req.body.poster, req.body.gameID, req.body.ownerId],
    );
    
    res.json(data.rows);
  } catch(e) {
    
    res.status(500).json({ error: e.message });
  }
});


app.use(require('./middleware/error'));

module.exports = app;
