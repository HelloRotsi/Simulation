import express from 'express';
import 'dotenv/config';
import pool from './db.js';

// Create an Express application
const app = express();
const PORT = process.env.PORT || 6000;

// Middleware to parse JSON
app.use(express.json());

// Endpoint to add a new user
app.post('/users', async (req, res) => {
  try {
    // Extract username from the request body
    const { username } = req.body;

    // Insert the new user into the database and return the generated user_id
    const result = await pool.query('INSERT INTO users (username) VALUES ($1) RETURNING user_id', [username]);

    // Send the user_id as the response
    res.json({ user_id: result.rows[0].user_id });
  } catch (error) {
    console.error('Error adding user:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Users Service is running on port ${PORT}`);
});
