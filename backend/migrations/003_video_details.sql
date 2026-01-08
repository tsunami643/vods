ALTER TABLE videos ADD COLUMN IF NOT EXISTS sub_title TEXT;
ALTER TABLE videos ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE videos ADD COLUMN IF NOT EXISTS duration INTEGER;
ALTER TABLE videos ADD COLUMN IF NOT EXISTS published_at TIMESTAMP;
ALTER TABLE videos ADD COLUMN IF NOT EXISTS playlist_id INTEGER REFERENCES playlists(id);
ALTER TABLE videos ADD COLUMN IF NOT EXISTS playlist_order INTEGER;

CREATE INDEX IF NOT EXISTS idx_videos_playlist_id ON videos(playlist_id);
CREATE INDEX IF NOT EXISTS idx_videos_playlist_order ON videos(playlist_id, playlist_order);
