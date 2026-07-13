import { memo, useCallback, useEffect, useMemo, useState } from 'react';

function readBoolean(key, fallback) {
  const saved = localStorage.getItem(key);
  if (saved === null) return fallback;

  try {
    return JSON.parse(saved);
  } catch {
    return fallback;
  }
}

function readNumber(key, fallback) {
  const saved = localStorage.getItem(key);
  if (saved === null) return fallback;

  const parsed = parseInt(saved, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function useChatPreferences(initialTheme, onThemeChange) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showTimestamps, setShowTimestamps] = useState(() =>
    readBoolean('chatShowTimestamps', true)
  );
  const [showBadges, setShowBadges] = useState(() =>
    readBoolean('chatShowBadges', true)
  );
  const [showBorders, setShowBorders] = useState(() =>
    readBoolean('chatShowBorders', false)
  );
  const [fontSize, setFontSize] = useState(() =>
    readNumber('chatFontSize', 14)
  );
  const [chatTheme, setChatTheme] = useState(initialTheme);

  useEffect(() => {
    localStorage.setItem('chatShowTimestamps', JSON.stringify(showTimestamps));
  }, [showTimestamps]);

  useEffect(() => {
    localStorage.setItem('chatShowBadges', JSON.stringify(showBadges));
  }, [showBadges]);

  useEffect(() => {
    localStorage.setItem('chatShowBorders', JSON.stringify(showBorders));
  }, [showBorders]);

  useEffect(() => {
    localStorage.setItem('chatFontSize', fontSize.toString());
  }, [fontSize]);

  useEffect(() => {
    localStorage.setItem('chatTheme', chatTheme);
    onThemeChange?.(chatTheme);
  }, [chatTheme, onThemeChange]);

  useEffect(() => {
    if (!settingsOpen) return;

    const handleClickOutside = (event) => {
      const settingsButton = event.target.closest('.header-button[title="Settings"]');
      const settingsPanel = event.target.closest('.settings-panel');
      if (!settingsButton && !settingsPanel) setSettingsOpen(false);
    };

    const timeoutId = setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
    }, 0);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('click', handleClickOutside);
    };
  }, [settingsOpen]);

  const closeSettings = useCallback(() => setSettingsOpen(false), []);
  const toggleSettings = useCallback(() => {
    setSettingsOpen((open) => !open);
  }, []);
  const preferences = useMemo(() => ({
    chatTheme,
    fontSize,
    setChatTheme,
    setFontSize,
    setShowBadges,
    setShowBorders,
    setShowTimestamps,
    showBadges,
    showBorders,
    showTimestamps,
  }), [chatTheme, fontSize, showBadges, showBorders, showTimestamps]);

  return {
    closeSettings,
    preferences,
    settingsOpen,
    toggleSettings,
  };
}

function FullscreenIcon({ isFullscreen }) {
  return (
    <svg width="16" height="16" viewBox="5 5 14 14" fill="currentColor">
      {isFullscreen ? (
        <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z" />
      ) : (
        <path d="M7 14H5v5h5v-2H7zm-2-4h2V7h3V5H5zm12 7h-3v2h5v-5h-2zM14 5v2h3v3h2V5z" />
      )}
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg width="16" height="16" viewBox="2.66 2.4 18.68 19.2" fill="currentColor">
      <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6" />
    </svg>
  );
}

function ToggleSetting({ checked, label, onChange }) {
  return (
    <div className="settings-row">
      <label>{label}</label>
      <label className="toggle-switch">
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange?.(event.target.checked)}
        />
        <span className="toggle-slider" />
      </label>
    </div>
  );
}

function ChatSettingsPanel({
  chatTheme,
  fontSize,
  hideVideoInfo,
  setChatTheme,
  setFontSize,
  setShowBadges,
  setShowBorders,
  setShowTimestamps,
  showBadges,
  showBorders,
  showFullControls,
  showTimestamps,
  onHideVideoInfoChange,
}) {
  return (
    <div className="settings-panel">
      {showFullControls && (
        <>
          <ToggleSetting
            checked={showTimestamps}
            label="Timestamps"
            onChange={setShowTimestamps}
          />
          <ToggleSetting
            checked={showBadges}
            label="Badges"
            onChange={setShowBadges}
          />
          <ToggleSetting
            checked={showBorders}
            label="Message Borders"
            onChange={setShowBorders}
          />
          <div className="settings-divider" />
          <div className="settings-row">
            <label>Font Size</label>
            <div className="font-size-control">
              <button
                type="button"
                className="font-size-btn"
                onClick={() => setFontSize((current) => Math.max(10, current - 1))}
              >−</button>
              <span className="font-size-value">{fontSize}</span>
              <button
                type="button"
                className="font-size-btn"
                onClick={() => setFontSize((current) => Math.min(24, current + 1))}
              >+</button>
            </div>
          </div>
        </>
      )}

      <div className="settings-row">
        <label>Theme</label>
        <select
          className="theme-select"
          value={chatTheme}
          onChange={(event) => setChatTheme(event.target.value)}
        >
          <option value="blue">Blue</option>
          <option value="twitch">Twitch</option>
          <option value="oled">OLED</option>
        </select>
      </div>
      <div className="settings-divider" />
      <ToggleSetting
        checked={hideVideoInfo}
        label="Hide Video Info"
        onChange={onHideVideoInfoChange}
      />
    </div>
  );
}

function ChatHeader({
  hideVideoInfo,
  isFullscreen,
  onHideVideoInfoChange,
  onSettingsToggle,
  onToggleFullscreen,
  preferences,
  settingsOpen,
  showFullControls = true,
}) {
  const {
    chatTheme,
    fontSize,
    setChatTheme,
    setFontSize,
    setShowBadges,
    setShowBorders,
    setShowTimestamps,
    showBadges,
    showBorders,
    showTimestamps,
  } = preferences;

  return (
    <div className="chat-header">
      {showFullControls && (
        <div className="header-buttons">
          <button
            className="header-button"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            onClick={onToggleFullscreen}
          >
            <FullscreenIcon isFullscreen={isFullscreen} />
          </button>
        </div>
      )}

      <span className="header-title">Archived Chat</span>
      <div className="header-buttons">
        <button className="header-button" title="Settings" onClick={onSettingsToggle}>
          <SettingsIcon />
        </button>
      </div>

      {settingsOpen && (
        <ChatSettingsPanel
          chatTheme={chatTheme}
          fontSize={fontSize}
          hideVideoInfo={hideVideoInfo}
          onHideVideoInfoChange={onHideVideoInfoChange}
          setChatTheme={setChatTheme}
          setFontSize={setFontSize}
          setShowBadges={setShowBadges}
          setShowBorders={setShowBorders}
          setShowTimestamps={setShowTimestamps}
          showBadges={showBadges}
          showBorders={showBorders}
          showFullControls={showFullControls}
          showTimestamps={showTimestamps}
        />
      )}
    </div>
  );
}

export default memo(ChatHeader);
