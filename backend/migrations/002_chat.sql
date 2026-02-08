DROP TABLE IF EXISTS chat_logs;

CREATE TABLE IF NOT EXISTS chat_badges (
    id SERIAL PRIMARY KEY,
    set_version TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    url TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS chat_emotes (
    id SERIAL PRIMARY KEY,
    text TEXT NOT NULL,
    emote_id TEXT NOT NULL,
    source TEXT NOT NULL,
    UNIQUE(text, emote_id, source)
);

CREATE TABLE IF NOT EXISTS chat_users (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    color TEXT NOT NULL,
    UNIQUE(name, color)
);

CREATE TABLE IF NOT EXISTS chat_metadata (
    id SERIAL PRIMARY KEY,
    video_id INTEGER REFERENCES videos(id) ON DELETE CASCADE,
    twitch_video_id BIGINT,
    total_messages INTEGER DEFAULT 0,
    duration INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(video_id)
);

CREATE TABLE IF NOT EXISTS chat_messages (
    id SERIAL PRIMARY KEY,
    metadata_id INTEGER REFERENCES chat_metadata(id) ON DELETE CASCADE,
    time_seconds INTEGER NOT NULL,
    user_id INTEGER REFERENCES chat_users(id),
    message TEXT NOT NULL,
    badges INTEGER[] DEFAULT '{}',
    emotes JSONB DEFAULT '[]'
);

CREATE INDEX IF NOT EXISTS idx_chat_metadata_video_id ON chat_metadata(video_id);
CREATE INDEX IF NOT EXISTS idx_chat_metadata_twitch_id ON chat_metadata(twitch_video_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_metadata_id ON chat_messages(metadata_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_time ON chat_messages(metadata_id, time_seconds);
