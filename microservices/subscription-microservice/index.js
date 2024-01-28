import express from 'express';
import 'dotenv/config';
import pool from './db.js';
import kafka from 'kafka-node';
import bodyParser from 'body-parser';

const app = express();
const PORT = process.env.PORT || 5000;

const Producer = kafka.Producer;
const client = new kafka.KafkaClient({ kafkaHost: 'kafka:9092' }); // Update with your Kafka broker address
const producer = new Producer(client);

producer.on('ready', () => {
  console.log('Kafka Producer is ready');
});

producer.on('error', (err) => {
  console.error('Error occurred with Kafka Producer:', err);
});

app.use(bodyParser.json());

app.post('/subscribe', async (req, res) => {
  try {
    const { username, hashtag } = req.body;

    const client = await pool.connect();
    await client.query('BEGIN');

    const userQuery = await client.query('SELECT user_id FROM users WHERE username = $1', [username]);
    const userId = userQuery.rows[0]?.user_id;

    if (!userId) {
      await client.query('ROLLBACK');
      client.release();
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if the user is already subscribed to the hashtag
    const isSubscribed = await isUserSubscribed(userId, hashtag);

    if (isSubscribed) {
      return res.status(400).json({ message: 'User is already subscribed to this hashtag' });
    }

    // Insert the subscription information into the database
    await client.query('INSERT INTO subscriptions(user_id, hashtag) VALUES($1, $2)', [userId, hashtag]);

    await client.query('COMMIT');
    client.release();

    // Publish UserSubscribedEvent
    publishEventToKafka('UserSubscribedEvent', { userId, hashtag });

    res.json({ message: 'Subscribed successfully' });
  } catch (error) {
    console.error('Error subscribing:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

app.post('/unsubscribe', async (req, res) => {
  try {
    const { username, hashtag } = req.body;

    const client = await pool.connect();
    await client.query('BEGIN');

    const userQuery = await client.query('SELECT user_id FROM users WHERE username = $1', [username]);
    const userId = userQuery.rows[0]?.user_id;

    if (!userId) {
      await client.query('ROLLBACK');
      client.release();
      return res.status(404).json({ message: 'User not found' });
    }
    // Check if the user is subscribed to the hashtag
    const isSubscribed = await isUserSubscribed(userId, hashtag);

    if (!isSubscribed) {
      return res.status(400).json({ message: 'User is not subscribed to this hashtag' });
    }

    // Remove the subscription information from the database
    await client.query('DELETE FROM subscriptions WHERE user_id = $1 AND hashtag = $2', [userId, hashtag]);

    await client.query('COMMIT');
    client.release();

    // Publish UserUnsubscribedEvent
    publishEventToKafka('UserUnsubscribedEvent', { userId, hashtag });

    res.json({ message: 'Unsubscribed successfully' });
  } catch (error) {
    console.error('Error unsubscribing:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

app.get('/next-videos/:username/:hashtag', async (req, res) => {
  try {
    const { username, hashtag } = req.params;
    console.log('username', username);
    console.log('hashtag', hashtag);

    const client = await pool.connect();
    await client.query('BEGIN');

    const userQuery = await client.query('SELECT user_id FROM users WHERE username = $1', [username]);
    const userId = userQuery.rows[0]?.user_id;

    if (!userId) {
      await client.query('ROLLBACK');
      client.release();
      return res.status(404).json({ message: 'User not found' });
    }

    // Get the next videos to watch based on the subscription
    const nextVideos = await getNextVideos(userId, hashtag);

    res.json({ nextVideos });
  } catch (error) {
    console.error('Error retrieving next videos:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

async function isUserSubscribed(userId, hashtag) {
  const client = await pool.connect();
  const result = await client.query('SELECT COUNT(*) FROM subscriptions WHERE user_id = $1 AND hashtag = $2', [userId, hashtag]);
  client.release();

  return parseInt(result.rows[0].count) > 0;
}

async function getNextVideos(userId, hashtag) {
  const client = await pool.connect();  
  try {
    // Retrieve videos with the specified hashtag that the user hasn't watched
    const result = await client.query(
      `SELECT * FROM videos 
       WHERE hashtags @> ARRAY[$1]::varchar[] 
         AND $2 != ALL(views)  -- Check if userId is not in the 'views' array
       LIMIT 10`, [hashtag, userId]);

    return result.rows;
  } finally {
    client.release();
  }
}


function publishEventToKafka(eventType, payload) {
  const payloads = [
    {
      topic: 'subscription-events',
      
      messages: JSON.stringify({ type: eventType, payload }),
    },
  ];

  producer.send(payloads, (err, data) => {
    if (err) {
      console.error('Error publishing event to Kafka:', err);
    } else {
      console.log('Event published to Kafka:', data);
    }
  });
}

app.listen(PORT, () => {
  console.log(`Subscription Microservice is running on port ${PORT}`);
});