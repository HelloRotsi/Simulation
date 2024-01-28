```
CREATE TABLE users (
  user_id SERIAL PRIMARY KEY,
  username VARCHAR(255) NOT NULL
);
```
```
CREATE TABLE videos (
  video_id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(user_id),
  title VARCHAR(255) NOT NULL,
  hashtags VARCHAR(255)[] NOT NULL
);
```
```
CREATE TABLE watched_videos (
  user_id INT REFERENCES users(user_id),
  video_id INT REFERENCES videos(video_id),
  PRIMARY KEY (user_id, video_id)
);
```
```
CREATE TABLE liked_videos (
  user_id INT REFERENCES users(user_id),
  video_id INT REFERENCES videos(video_id),
  PRIMARY KEY (user_id, video_id)
);
```
```
CREATE TABLE disliked_videos (
  user_id INT REFERENCES users(user_id),
  video_id INT REFERENCES videos(video_id),
  PRIMARY KEY (user_id, video_id)
);
```