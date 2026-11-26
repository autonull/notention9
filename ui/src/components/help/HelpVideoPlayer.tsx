import { useState, useEffect, useRef, useCallback } from 'react';
import { useHelp, useHelpAnalytics } from '@/hooks';
import { VideoPlayer, createVideoPlayer, type VideoMetadata, type VideoChapter } from '@notention/core/help';
import { Button } from '../ui/Button';
import { cn } from '../../utils/ui';
import { 
  PlayIcon, PauseIcon, VolumeIcon, VolumeXIcon, 
  MaximizeIcon, MinimizeIcon, SkipBackIcon, SkipForwardIcon,
  MenuIcon, XIcon
} from '../ui/icons';

export interface HelpVideoPlayerProps {
  className?: string;
  topicId?: string;
}

export function HelpVideoPlayer({ className, topicId }: HelpVideoPlayerProps) {
  const { currentTopic, recordEvent } = useHelp();
  const { trackVideoPlay, trackVideoProgress, trackVideoComplete } = useHelpAnalytics();
  
  const [player] = useState(() => createVideoPlayer());
  const videoRef = useRef<HTMLVideoElement>(null);
  const [metadata, setMetadata] = useState<VideoMetadata | null>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [fullscreen, setFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showChapters, setShowChapters] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const topic = topicId ? currentTopic : undefined;
  const videoId = topic?.videoId;

  useEffect(() => {
    if (videoRef.current) {
      player.mount(videoRef.current);
    }
    return () => player.unmount();
  }, [player]);

  useEffect(() => {
    if (videoId && !metadata) {
      player.loadVideo(videoId).then(() => {
        const meta = player.getMetadata();
        if (meta) setMetadata(meta);
      }).catch(console.error);
    }
  }, [videoId, player, metadata]);

  useEffect(() => {
    const unsubscribe = player.subscribe(event => {
      switch (event.type) {
        case 'play':
          setPlaying(true);
          break;
        case 'pause':
          setPlaying(false);
          break;
        case 'timeupdate':
          setCurrentTime(event.currentTime);
          trackVideoProgress(topic?.id ?? '', videoId ?? '', (event.currentTime / duration) * 100);
          break;
        case 'ended':
          setPlaying(false);
          trackVideoComplete(topic?.id ?? '', videoId ?? '');
          recordEvent({ type: 'video_complete', topicId: topic?.id, metadata: { videoId } });
          break;
        case 'volumechange':
          setVolume(event.volume);
          setMuted(event.muted);
          break;
        case 'ratechange':
          setPlaybackRate(event.rate);
          break;
        case 'fullscreenchange':
          setFullscreen(event.fullscreen);
          break;
        case 'load':
          const meta = player.getMetadata();
          if (meta) {
            setDuration(meta.duration);
            trackVideoPlay(topic?.id ?? '', meta.id);
            recordEvent({ type: 'video_play', topicId: topic?.id, metadata: { videoId: meta.id } });
          }
          break;
      }
    });
    return unsubscribe;
  }, [player, topic?.id, videoId, duration, trackVideoPlay, trackVideoProgress, trackVideoComplete, recordEvent]);

  const handleMouseMove = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 3000);
  }, []);

  const togglePlay = useCallback(() => {
    if (playing) player.pause(); else player.play();
  }, [player, playing]);

  const handleSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    player.seek(time);
  }, [player]);

  const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = parseFloat(e.target.value);
    player.setVolume(vol);
  }, [player]);

  const toggleMute = useCallback(() => {
    player.setMuted(!muted);
  }, [player, muted]);

  const toggleFullscreen = useCallback(() => {
    player.toggleFullscreen();
  }, [player]);

  const handleRateChange = useCallback((rate: number) => {
    player.setPlaybackRate(rate);
    setShowSettings(false);
  }, [player]);

  const seekToChapter = useCallback((chapter: VideoChapter) => {
    player.seekToChapter(chapter.id);
    setShowChapters(false);
  }, [player]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!videoId) {
    return null;
  }

  return (
    <div 
      className={cn('help-video-player relative', className)}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setShowControls(false)}
      data-testid="help-video-player"
    >
      <div className="relative aspect-video bg-[var(--app-surface)] rounded-lg overflow-hidden">
        <video
          ref={videoRef}
          className="w-full h-full"
          playsInline
        />
        
        {!metadata && (
          <div className="absolute inset-0 flex items-center justify-center bg-[var(--app-surface)]">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-[var(--app-accent)] border-t-transparent" />
          </div>
        )}

        {showControls && (
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent transition-opacity duration-200">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={0}
                  max={duration || 100}
                  value={currentTime}
                  onChange={handleSeek}
                  className="flex-1 h-1 bg-white/30 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
                  aria-label="Seek"
                  data-testid="video-seek"
                />
                <span className="text-[var(--app-text)] text-sm font-mono w-20 text-right">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => player.seek(Math.max(0, currentTime - 10))}
                    aria-label="Rewind 10s"
                    data-testid="video-rewind"
                  >
                    <SkipBackIcon className="w-5 h-5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={togglePlay}
                    aria-label={playing ? 'Pause' : 'Play'}
                    data-testid={playing ? 'video-pause' : 'video-play'}
                  >
                    {playing ? <PauseIcon className="w-5 h-5" /> : <PlayIcon className="w-5 h-5" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => player.seek(Math.min(duration, currentTime + 30))}
                    aria-label="Forward 30s"
                    data-testid="video-forward"
                  >
                    <SkipForwardIcon className="w-5 h-5" />
                  </Button>

                  <div className="flex items-center gap-1 ml-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={toggleMute}
                      aria-label={muted ? 'Unmute' : 'Mute'}
                      data-testid={muted ? 'video-unmute' : 'video-mute'}
                    >
                      {muted ? <VolumeXIcon className="w-5 h-5" /> : <VolumeIcon className="w-5 h-5" />}
                    </Button>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.1}
                      value={muted ? 0 : volume}
                      onChange={handleVolumeChange}
                      className="w-20 h-1 bg-white/30 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
                      aria-label="Volume"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {metadata?.chapters?.length && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowChapters(!showChapters)}
                      aria-label="Chapters"
                      data-testid="video-chapters"
                    >
                      <MenuIcon className="w-5 h-5" />
                    </Button>
                  )}

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowSettings(!showSettings)}
                    aria-label="Settings"
                    data-testid="video-settings"
                  >
                    <span className="text-xs">1x</span>
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleFullscreen}
                    aria-label={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}
                    data-testid={fullscreen ? 'video-exit-fullscreen' : 'video-fullscreen'}
                  >
                    {fullscreen ? <MinimizeIcon className="w-5 h-5" /> : <MaximizeIcon className="w-5 h-5" />}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {showChapters && metadata?.chapters?.length && (
          <div className="absolute bottom-full right-0 mb-2 w-64 bg-[var(--app-surface)] border border-[var(--app-line)] rounded-lg shadow-lg p-2 z-10" data-testid="chapters-menu">
            <div className="font-medium text-[var(--app-text)] mb-2 px-2">Chapters</div>
            {metadata.chapters?.map(chapter => (
              <button
                key={chapter.id}
                onClick={() => seekToChapter(chapter)}
                className="w-full text-left px-2 py-1.5 rounded text-sm hover:bg-[var(--app-raised)] transition-colors"
                data-testid={`chapter-${chapter.id}`}
              >
                <div className="font-medium">{chapter.title}</div>
                <div className="text-[var(--app-muted)] text-xs">{formatTime(chapter.startTime)}</div>
              </button>
            ))}
          </div>
        )}

        {showSettings && (
          <div className="absolute bottom-full right-0 mb-2 w-40 bg-[var(--app-surface)] border border-[var(--app-line)] rounded-lg shadow-lg p-2 z-10" data-testid="settings-menu">
            <div className="font-medium text-[var(--app-text)] mb-2 px-2">Playback Speed</div>
            {[0.5, 0.75, 1, 1.25, 1.5, 2].map(rate => (
              <button
                key={rate}
                onClick={() => handleRateChange(rate)}
                className={cn(
                  'w-full text-left px-2 py-1.5 rounded text-sm hover:bg-[var(--app-raised)] transition-colors',
                  playbackRate === rate && 'bg-[var(--app-accent-soft)] text-[var(--app-accent)]'
                )}
                data-testid={`rate-${rate}`}
              >
                {rate}x
              </button>
            ))}
          </div>
        )}

        <div className="absolute top-2 right-2 z-10">
          <div className="flex items-center gap-2">
            {metadata && (
              <span className="px-2 py-1 bg-[var(--app-bg)]/80 text-[var(--app-text)] text-xs rounded">
                {metadata.title}
              </span>
            )}
          </div>
        </div>
      </div>

      {metadata?.captionsUrl && (
        <div className="mt-2 p-3 bg-[var(--app-surface)] border border-[var(--app-line)] rounded-lg text-sm text-[var(--app-text-secondary)]">
          <strong>Captions:</strong> Available (auto-generated)
        </div>
      )}
    </div>
  );
}