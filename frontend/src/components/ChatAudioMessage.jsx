import { useCallback, useEffect, useRef, useState } from "react";

let activeAudioElement = null;

function formatAudioTime(seconds = 0) {
  const safe = Number.isFinite(seconds) && seconds > 0 ? seconds : 0;
  const mins = Math.floor(safe / 60);
  const secs = Math.floor(safe % 60);
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

export function ChatAudioMessage({ src }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  const progress = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  const pauseSelf = useCallback(() => {
    const el = audioRef.current;
    if (!el) return;
    el.pause();
    setPlaying(false);
  }, []);

  const togglePlay = async (event) => {
    event.stopPropagation();
    const el = audioRef.current;
    if (!el || !src) return;

    if (playing) {
      pauseSelf();
      return;
    }

    if (activeAudioElement && activeAudioElement !== el) {
      activeAudioElement.pause();
      activeAudioElement.dispatchEvent(new Event("externalpause"));
    }

    activeAudioElement = el;
    try {
      await el.play();
      setPlaying(true);
    } catch {
      setPlaying(false);
    }
  };

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return undefined;

    const syncDuration = () => {
      if (Number.isFinite(el.duration) && el.duration > 0) {
        setDuration(el.duration);
      }
    };

    const onTimeUpdate = () => setCurrentTime(el.currentTime || 0);
    const onEnded = () => {
      setPlaying(false);
      setCurrentTime(0);
      if (activeAudioElement === el) activeAudioElement = null;
    };
    const onExternalPause = () => setPlaying(false);
    const onPause = () => {
      if (el.paused) setPlaying(false);
    };

    el.addEventListener("timeupdate", onTimeUpdate);
    el.addEventListener("loadedmetadata", syncDuration);
    el.addEventListener("durationchange", syncDuration);
    el.addEventListener("ended", onEnded);
    el.addEventListener("pause", onPause);
    el.addEventListener("externalpause", onExternalPause);

    return () => {
      el.removeEventListener("timeupdate", onTimeUpdate);
      el.removeEventListener("loadedmetadata", syncDuration);
      el.removeEventListener("durationchange", syncDuration);
      el.removeEventListener("ended", onEnded);
      el.removeEventListener("pause", onPause);
      el.removeEventListener("externalpause", onExternalPause);
      if (activeAudioElement === el) activeAudioElement = null;
    };
  }, [src]);

  const handleSeek = (event) => {
    event.stopPropagation();
    const el = audioRef.current;
    if (!el || !duration) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    el.currentTime = ratio * duration;
    setCurrentTime(el.currentTime);
  };

  return (
    <div className="msg-audio-player">
      <button
        type="button"
        className="msg-audio-play-btn"
        onClick={togglePlay}
        aria-label={playing ? "Pausar nota de voz" : "Reproducir nota de voz"}
      >
        {playing ? (
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <rect x="6" y="5" width="4" height="14" rx="1" />
            <rect x="14" y="5" width="4" height="14" rx="1" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M8 5.14v13.72a1 1 0 0 0 1.5.86l10.2-6.86a1 1 0 0 0 0-1.72L9.5 4.28A1 1 0 0 0 8 5.14z" />
          </svg>
        )}
      </button>

      <div className="msg-audio-track-wrap">
        <button
          type="button"
          className="msg-audio-track"
          onClick={handleSeek}
          aria-label="Posicion de reproduccion"
        >
          <span className="msg-audio-progress" style={{ width: `${progress}%` }} />
          <span className="msg-audio-thumb" style={{ left: `${progress}%` }} />
        </button>
        <span className="msg-audio-time">{formatAudioTime(playing ? currentTime : duration)}</span>
      </div>

      <audio ref={audioRef} src={src} preload="metadata" className="msg-audio-hidden" />
    </div>
  );
}
