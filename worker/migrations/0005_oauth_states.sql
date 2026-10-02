CREATE TABLE oauth_states (
  state_hash TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  old_session_hash TEXT,
  origin TEXT NOT NULL,
  redirect_uri TEXT NOT NULL,
  attempt TEXT NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX oauth_states_expiry ON oauth_states(expires_at);
