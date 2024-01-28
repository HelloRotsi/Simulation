CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  user_id SERIAL UNIQUE,
  username VARCHAR(255) NOT NULL
);

CREATE TABLE videos (
  video_id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(user_id),
  title VARCHAR(255) NOT NULL,
  hashtags VARCHAR(255)[] NOT NULL,
  video_url VARCHAR(255) NOT NULL,
  likes INTEGER[] DEFAULT '{}',
  dislikes INTEGER[] DEFAULT '{}',
  views INTEGER[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE watched_videos (
  user_id SERIAL REFERENCES users(user_id),
  video_id SERIAL REFERENCES videos(video_id),
  PRIMARY KEY (user_id, video_id)
);

CREATE TABLE watched_videos (
  user_id SERIAL REFERENCES users(user_id),
  video_id SERIAL REFERENCES videos(video_id),
  PRIMARY KEY (user_id, video_id)
);

CREATE TABLE liked_videos (
  user_id INT REFERENCES users(user_id),
  video_id INT REFERENCES videos(video_id),
  PRIMARY KEY (user_id, video_id)
);

CREATE TABLE disliked_videos (
  user_id INT REFERENCES users(user_id),
  video_id INT REFERENCES videos(video_id),
  PRIMARY KEY (user_id, video_id)
);

CREATE TABLE subscriptions (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    hashtag VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
