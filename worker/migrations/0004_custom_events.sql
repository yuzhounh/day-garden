-- 0004_custom_events.sql: 支持用户重要日子与纪念日/生日的云端账户同步
CREATE TABLE IF NOT EXISTS custom_events (
  id TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  date TEXT NOT NULL,
  is_lunar INTEGER NOT NULL DEFAULT 0,
  type TEXT NOT NULL DEFAULT 'birthday',
  role TEXT,
  gift_advice TEXT,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, id)
);

CREATE INDEX IF NOT EXISTS custom_events_user_idx ON custom_events(user_id);
