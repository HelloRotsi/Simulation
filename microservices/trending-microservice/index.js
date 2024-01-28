import express from 'express';
import 'dotenv/config';
import pool from './db.js';
import kafka from 'kafka-node';
import bodyParser from 'body-parser';

const app = express();
const PORT = process.env.PORT || 4000;

const trendingHashtags = {};

app.use(express.json());

app.get('/trending-hashtags', async (req, res) => {
  try {
    const trending = await getTopTrendingHashtags();
    res.json({ trending });
  } catch (error) {
    console.error('Error retrieving trending hashtags:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

async function getTopTrendingHashtags() {
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  const oneDayAgo = new Date();
  oneDayAgo.setDate(oneDayAgo.getDate() - 1);

  const result = await pool.query(
    `SELECT unnest(hashtags) as hashtag, 
            COUNT(*) FILTER (WHERE created_at >= $1) as count
     FROM videos
     GROUP BY hashtag
     ORDER BY count DESC
     LIMIT 10`,
    [oneDayAgo]
  );

  return result.rows.map(row => row.hashtag);
}

function updateTrendingHashtags(event) {
  if (event.type === 'VideoLikedEvent' || event.type === 'VideoDislikedEvent') {
    const hashtags = event.payload.hashtags || [];
    hashtags.forEach(hashtag => {
      trendingHashtags[hashtag] = (trendingHashtags[hashtag] || 0) + 1;
    });
  }
}

async function subscribeToEvents() {
  const consumer = new kafka.Consumer(
    new kafka.KafkaClient({ kafkaHost: 'kafka:9092' }), 
    [{ topic: 'video-events', partition: 0 }], 
    { autoCommit: true }
  );

  consumer.on('message', (message) => {
    const eventData = JSON.parse(message.value);
    updateTrendingHashtags(eventData);
    console.log('Received event from Kafka:', eventData);
  });

  consumer.on('error', (err) => {
    console.error('Error occurred with Kafka Consumer:', err);
  });
}

// Start the server
app.listen(PORT, async () => {
  console.log(`Trending Hashtag Microservice is running on port ${PORT}`);
  await subscribeToEvents();
});
