import express from 'express';
import 'dotenv/config';
import pool from './db.js';
import kafka from 'kafka-node';
import bodyParser from 'body-parser';

const app = express();
const PORT = process.env.PORT || 3000;

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

// Post a new video
app.post('/videos', async (req, res) => {
  try {
    const { username, title, hashtags } = req.body;
    const videoId = generateUniqueId();
    console.log(req.body);

    const client = await pool.connect();
    await client.query('BEGIN');

    const userQuery = await client.query('SELECT user_id FROM users WHERE username = $1', [username]);
    const userId = userQuery.rows[0]?.user_id;

    if (!userId) {
      await client.query('ROLLBACK');
      client.release();
      return res.status(404).json({ message: 'User not found' });
    }
    // console.log(userId);

    // Check if the title already exists in the database
    const titleExistsQuery = await client.query('SELECT 1 FROM videos WHERE title = $1 LIMIT 1', [title]);
    if (titleExistsQuery.rows.length > 0) {
      await client.query('ROLLBACK');
      client.release();
      return res.status(400).json({ message: 'Video with the same title already exists' });
    }

    const result = await client.query(
      'INSERT INTO videos(video_id, user_id, title, hashtags, video_url, created_at) VALUES($1, $2, $3, $4, $5, $6) RETURNING *',
      [videoId, userId, title, hashtags, req.body.video_url, new Date()] // Add new Date() for the created_at column
    );  

    await client.query('COMMIT');
  
    // triggerEvent('VideoPostedEvent', result.rows[0]);
    publishEventToKafka('VideoPostedEvent', result.rows[0]);
    client.release();
    res.status(201).json({ message: 'Video posted successfully', video: result.rows[0] });
  } catch (error) {
    console.error('Error posting video:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

//List videos by a user
app.get('/listuservideos/:username', async (req, res) => {
  try {
    const username = req.params.username;
    const client = await pool.connect();
    const userQuery = await client.query('SELECT user_id FROM users WHERE username = $1', [username]);
    const userId = userQuery.rows[0]?.user_id;

    if (!userId) {
      await client.query('ROLLBACK');
      client.release();
      return res.status(404).json({ message: 'User not found' });
    }

    const result = await client.query('SELECT * FROM videos WHERE user_id = $1', [userId]);
    client.release();

    res.json({ videos: result.rows });
  } catch (error) {
    console.error('Error retrieving username videos:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// List videos by hashtag
app.get('/videos/videosbyhashtag/:hashtag', async (req, res) => {
  try {
    const client = await pool.connect();
    const hashtag = req.params.hashtag.toLowerCase();
    const result = await client.query('SELECT * FROM videos WHERE $1 = ANY(hashtags)', [hashtag]);
    client.release();
    res.json({ videos: result.rows });
  } catch (error) {
    console.error('Error retrieving hashtag videos:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// Mark a video as watched
app.post('/videos/watch', async (req, res) => {
  try {
    const { username, title } = req.body;
    
    const client = await pool.connect();

    const userQuery = await client.query('SELECT user_id FROM users WHERE username = $1', [username]);
    const userId = userQuery.rows[0]?.user_id;

    if (!userId) {
      await client.query('ROLLBACK');
      client.release();
      return res.status(404).json({ message: 'User not found' });
    }

    // Update the 'videos' table to add the userId to the 'likes' array
    const updateResult = await client.query('UPDATE videos SET views = array_append(views, $1) WHERE title = $2', [userId, title]);
    if (updateResult.rowCount === 0) {
      // The UPDATE did not affect any rows (possibly because the video with the given title was not found)
      await client.query('ROLLBACK');
      client.release();
      return res.status(404).json({ message: 'Video not found' });
    }

    publishEventToKafka('VideoWatchedEvent', { title, username });
    client.release();
    res.json({ message: `${title} Video has been watched by ${username}` });
  } catch (error) {
    console.error('Error marking video as watched:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

app.post('/videos/like', async (req, res) => {
  try {
    const { username, title } = req.body;
    
    const client = await pool.connect();

    const userQuery = await client.query('SELECT user_id FROM users WHERE username = $1', [username]);
    const userId = userQuery.rows[0]?.user_id;
    if (!userId) {
      await client.query('ROLLBACK');
      client.release();
      return res.status(404).json({ message: 'User not found' });
    }
    // Update the 'videos' table to add the userId to the 'likes' array
    const updateResult = await client.query('UPDATE videos SET likes = array_append(likes, $1) WHERE title = $2', [userId, title]);
    if (updateResult.rowCount === 0) {
      // The UPDATE did not affect any rows (possibly because the video with the given title was not found)
      await client.query('ROLLBACK');
      client.release();
      return res.status(404).json({ message: 'Video not found' });
    }
   
    publishEventToKafka('VideoLikedEvent', { title, userId });
    client.release();
    res.json({ message: 'Video liked successfully' });
  } catch (error) {
    console.error('Error liking video:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  } 
});

app.post('/videos/dislike', async (req, res) => {
  try {
    const { username, title } = req.body;

    const client = await pool.connect();

    const userQuery = await client.query('SELECT user_id FROM users WHERE username = $1', [username]);
    const userId = userQuery.rows[0]?.user_id;

    if (!userId) {
      await client.query('ROLLBACK');
      client.release();
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Update the 'videos' table to add the userId to the 'dislikes' array
    const updateResult = await client.query('UPDATE videos SET dislikes = array_append(dislikes, $1) WHERE title = $2', [userId, title]);
    if (updateResult.rowCount === 0) {
      // The UPDATE did not affect any rows (possibly because the video with the given title was not found)
      await client.query('ROLLBACK');
      client.release();
      return res.status(404).json({ message: 'Video not found' });
    }

    publishEventToKafka('VideoDislikedEvent', { title, userId });
    client.release();
    res.json({ message: 'Video disliked successfully' });
  } catch (error) {
    console.error('Error disliking video:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

function generateUniqueId() {
  return Math.floor(Math.random() * 1000000); // Adjust the range as needed
}

function triggerEvent(eventName, payload) {
  console.log(`Event Triggered: ${eventName}`, payload);
}

function publishEventToKafka(eventType, payload) {
  const payloads = [
    {
      topic: 'video-events',
      messages: JSON.stringify({ type: eventType, payload }),
    },
  ];

  producer.send(payloads, (err, data) => {
    if (err) {
      console.error('Error publishing event to Kafka:', err);
    } else {
      console.log('Event published to Kafka:', data);
      triggerEvent('EventPublished', { type: eventType, payload });
    }
  });
}


app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
