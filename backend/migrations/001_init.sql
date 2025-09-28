-- Initial migration for VODs backend
-- Create api_secrets table for API protection
CREATE TABLE IF NOT EXISTS api_secrets (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    secret_key VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Insert default secret for chat API
INSERT INTO api_secrets (name, secret_key) 
VALUES ('chat_api', 'tsunami_chat_secret_2024') 
ON CONFLICT (name) DO NOTHING;

CREATE TABLE IF NOT EXISTS playlists (
    id SERIAL PRIMARY KEY,
    youtube_id TEXT NOT NULL UNIQUE,
    name TEXT,
    tags JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS videos (
    id SERIAL PRIMARY KEY,
    yt_id TEXT NOT NULL UNIQUE,
    twitch_id BIGINT,
    name TEXT,
    tags JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS streams (
    id SERIAL PRIMARY KEY,
    game_name TEXT NOT NULL,
    tags JSONB,
    stream_count INTEGER DEFAULT 1,
    playlist_id INTEGER REFERENCES playlists(id),
    first_video_id INTEGER REFERENCES videos(id),
    date_completed TIMESTAMP,
    game_cover TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chat_logs (
    id SERIAL PRIMARY KEY,
    video_id INTEGER REFERENCES videos(id),
    message TEXT NOT NULL,
    user_data JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_playlists_youtube_id ON playlists(youtube_id);
CREATE INDEX IF NOT EXISTS idx_videos_yt_id ON videos(yt_id);
CREATE INDEX IF NOT EXISTS idx_videos_twitch_id ON videos(twitch_id);
CREATE INDEX IF NOT EXISTS idx_streams_playlist_id ON streams(playlist_id);
CREATE INDEX IF NOT EXISTS idx_streams_first_video_id ON streams(first_video_id);
CREATE INDEX IF NOT EXISTS idx_streams_date_completed ON streams(date_completed);
CREATE INDEX IF NOT EXISTS idx_chat_logs_video_id ON chat_logs(video_id); 