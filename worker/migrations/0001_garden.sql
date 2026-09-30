PRAGMA foreign_keys = ON;
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE TABLE sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL
);
CREATE INDEX sessions_expiry ON sessions(expires_at);
CREATE TABLE saved_poetry (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  poem_id TEXT NOT NULL,
  PRIMARY KEY (user_id, poem_id)
);
CREATE TABLE daily_actions (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  action_id TEXT NOT NULL,
  PRIMARY KEY (user_id, date, action_id)
);
