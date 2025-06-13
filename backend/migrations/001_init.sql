-- Initial migration for VODs backend
-- Create api_secrets table for API protection
CREATE TABLE IF NOT EXISTS api_secrets (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    secret_key VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default secret for chat API
INSERT INTO api_secrets (name, secret_key) 
VALUES ('chat_api', 'tsunami_chat_secret_2024') 
ON CONFLICT (name) DO NOTHING;

-- Create streams table to potentially cache data locally
CREATE TABLE IF NOT EXISTS streams (
    id SERIAL PRIMARY KEY,
    game_name VARCHAR(255),
    tags TEXT[],
    stream_count INTEGER,
    playlist_id VARCHAR(255) UNIQUE,
    first_video VARCHAR(255),
    date_completed TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create chat logs table (for future use)
CREATE TABLE IF NOT EXISTS chat_logs (
    id SERIAL PRIMARY KEY,
    message TEXT NOT NULL,
    user_data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
); 