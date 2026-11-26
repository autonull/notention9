import type { HelpTopic } from '../types/help.js';

export interface VideoMetadata {
  id: string;
  title: string;
  duration: number;
  thumbnailUrl: string;
  videoUrl: string;
  captionsUrl?: string;
  chapters?: VideoChapter[];
}

export interface VideoChapter {
  id: string;
  title: string;
  startTime: number;
  endTime: number;
}

export interface VideoPlayerState {
  videoId: string | null;
  playing: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  muted: boolean;
  playbackRate: number;
  fullscreen: boolean;
  captionsEnabled: boolean;
  currentCaption: string | null;
}

export type VideoPlayerEvent = 
  | { type: 'load'; videoId: string }
  | { type: 'play' }
  | { type: 'pause' }
  | { type: 'timeupdate'; currentTime: number }
  | { type: 'ended' }
  | { type: 'error'; error: string }
  | { type: 'volumechange'; volume: number; muted: boolean }
  | { type: 'ratechange'; rate: number }
  | { type: 'fullscreenchange'; fullscreen: boolean }
  | { type: 'captionchange'; caption: string | null };

export type VideoPlayerListener = (event: VideoPlayerEvent) => void;

export class VideoPlayer {
  private videoElement: HTMLVideoElement | null = null;
  private state: VideoPlayerState = {
    videoId: null,
    playing: false,
    currentTime: 0,
    duration: 0,
    volume: 1,
    muted: false,
    playbackRate: 1,
    fullscreen: false,
    captionsEnabled: false,
    currentCaption: null,
  };
  private listeners: Set<VideoPlayerListener> = new Set();
  private metadata: VideoMetadata | null = null;
  private captions: Map<number, string> = new Map();
  private captionUpdateInterval: ReturnType<typeof setInterval> | null = null;
  private videoBaseUrl: string;

  constructor(videoBaseUrl: string = '') {
    this.videoBaseUrl = videoBaseUrl;
  }

  mount(element: HTMLVideoElement): void {
    this.videoElement = element;
    this.setupEventListeners();
  }

  unmount(): void {
    if (this.videoElement) {
      this.removeEventListeners();
      this.videoElement = null;
    }
    this.clearCaptionInterval();
  }

  private setupEventListeners(): void {
    if (!this.videoElement) return;

    this.videoElement.addEventListener('play', () => this.emit({ type: 'play' }));
    this.videoElement.addEventListener('pause', () => this.emit({ type: 'pause' }));
    this.videoElement.addEventListener('timeupdate', () => this.emit({ type: 'timeupdate', currentTime: this.videoElement!.currentTime }));
    this.videoElement.addEventListener('ended', () => this.emit({ type: 'ended' }));
    this.videoElement.addEventListener('error', () => this.emit({ type: 'error', error: this.videoElement!.error?.message ?? 'Unknown error' }));
    this.videoElement.addEventListener('volumechange', () => this.emit({ type: 'volumechange', volume: this.videoElement!.volume, muted: this.videoElement!.muted }));
    this.videoElement.addEventListener('ratechange', () => this.emit({ type: 'ratechange', rate: this.videoElement!.playbackRate }));
    this.videoElement.addEventListener('loadedmetadata', () => {
      this.state.duration = this.videoElement!.duration;
      this.emit({ type: 'timeupdate', currentTime: 0 });
    });
  }

  private removeEventListeners(): void {
    if (!this.videoElement) return;
    this.videoElement.removeEventListener('play', () => {});
    this.videoElement.removeEventListener('pause', () => {});
    this.videoElement.removeEventListener('timeupdate', () => {});
    this.videoElement.removeEventListener('ended', () => {});
    this.videoElement.removeEventListener('error', () => {});
    this.videoElement.removeEventListener('volumechange', () => {});
    this.videoElement.removeEventListener('ratechange', () => {});
  }

  private emit(event: VideoPlayerEvent): void {
    this.updateStateFromElement();
    for (const listener of this.listeners) {
      listener(event);
    }
  }

  private updateStateFromElement(): void {
    if (!this.videoElement) return;
    this.state.playing = !this.videoElement.paused;
    this.state.currentTime = this.videoElement.currentTime;
    this.state.duration = this.videoElement.duration;
    this.state.volume = this.videoElement.volume;
    this.state.muted = this.videoElement.muted;
    this.state.playbackRate = this.videoElement.playbackRate;
  }

  subscribe(listener: VideoPlayerListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getState(): Readonly<VideoPlayerState> {
    return this.state;
  }

  async loadVideo(videoId: string): Promise<void> {
    if (!this.videoElement) throw new Error('Video player not mounted');

    this.metadata = await this.fetchMetadata(videoId);
    if (!this.metadata) throw new Error(`Video not found: ${videoId}`);

    this.state.videoId = videoId;
    this.videoElement.src = this.metadata.videoUrl;
    this.videoElement.poster = this.metadata.thumbnailUrl;
    this.videoElement.load();

    if (this.metadata.captionsUrl) {
      await this.loadCaptions(this.metadata.captionsUrl);
    }

    this.emit({ type: 'load', videoId });
  }

  private async fetchMetadata(videoId: string): Promise<VideoMetadata | null> {
    try {
      const response = await fetch(`${this.videoBaseUrl}/videos/${videoId}.json`);
      if (!response.ok) return null;
      return await response.json();
    } catch {
      return null;
    }
  }

  private async loadCaptions(url: string): Promise<void> {
    try {
      const response = await fetch(url);
      if (!response.ok) return;
      const vtt = await response.text();
      this.parseVTT(vtt);
    } catch {
      // Captions optional
    }
  }

  private parseVTT(vtt: string): void {
    this.captions.clear();
    const lines = vtt.split('\n');
    let currentTime = 0;
    let currentText = '';

    for (const line of lines) {
      const timeMatch = line.match(/(\d{2}:\d{2}:\d{2}\.\d{3}) --> (\d{2}:\d{2}:\d{2}\.\d{3})/);
      if (timeMatch) {
        currentTime = this.parseTime(timeMatch[1]);
        currentText = '';
      } else if (line.trim() && !line.startsWith('WEBVTT') && !line.startsWith('NOTE')) {
        currentText += (currentText ? ' ' : '') + line.trim();
        this.captions.set(currentTime, currentText);
      }
    }
  }

  private parseTime(timeStr: string): number {
    const [hours, minutes, seconds] = timeStr.split(':');
    return parseInt(hours) * 3600 + parseInt(minutes) * 60 + parseFloat(seconds);
  }

  private clearCaptionInterval(): void {
    if (this.captionUpdateInterval) {
      clearInterval(this.captionUpdateInterval);
      this.captionUpdateInterval = null;
    }
  }

  play(): void {
    this.videoElement?.play();
  }

  pause(): void {
    this.videoElement?.pause();
  }

  toggle(): void {
    if (this.state.playing) {
      this.pause();
    } else {
      this.play();
    }
  }

  seek(time: number): void {
    if (this.videoElement) {
      this.videoElement.currentTime = Math.max(0, Math.min(time, this.state.duration));
    }
  }

  setVolume(volume: number): void {
    if (this.videoElement) {
      this.videoElement.volume = Math.max(0, Math.min(1, volume));
    }
  }

  setMuted(muted: boolean): void {
    if (this.videoElement) {
      this.videoElement.muted = muted;
    }
  }

  setPlaybackRate(rate: number): void {
    if (this.videoElement) {
      this.videoElement.playbackRate = Math.max(0.25, Math.min(4, rate));
    }
  }

  setFullscreen(fullscreen: boolean): void {
    if (!this.videoElement) return;
    
    if (fullscreen && !this.state.fullscreen) {
      this.videoElement.requestFullscreen().catch(console.error);
    } else if (!fullscreen && this.state.fullscreen) {
      document.exitFullscreen().catch(console.error);
    }
    this.state.fullscreen = fullscreen;
    this.emit({ type: 'fullscreenchange', fullscreen });
  }

  toggleFullscreen(): void {
    this.setFullscreen(!this.state.fullscreen);
  }

  setCaptionsEnabled(enabled: boolean): void {
    this.state.captionsEnabled = enabled;
    if (enabled) {
      this.startCaptionUpdates();
    } else {
      this.clearCaptionInterval();
      this.state.currentCaption = null;
    }
  }

  private startCaptionUpdates(): void {
    this.clearCaptionInterval();
    this.captionUpdateInterval = setInterval(() => {
      if (!this.state.playing) return;
      
      let caption: string | null = null;
      for (const [time, text] of this.captions) {
        if (time <= this.state.currentTime) {
          caption = text;
        } else {
          break;
        }
      }
      
      if (caption !== this.state.currentCaption) {
        this.state.currentCaption = caption;
        this.emit({ type: 'captionchange', caption });
      }
    }, 100);
  }

  getMetadata(): VideoMetadata | null {
    return this.metadata;
  }

  getChapters(): VideoChapter[] {
    return this.metadata?.chapters ?? [];
  }

  seekToChapter(chapterId: string): void {
    const chapter = this.metadata?.chapters?.find(c => c.id === chapterId);
    if (chapter) {
      this.seek(chapter.startTime);
    }
  }

  getProgressPercent(): number {
    if (this.state.duration === 0) return 0;
    return (this.state.currentTime / this.state.duration) * 100;
  }

  formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  getFormattedCurrentTime(): string {
    return this.formatTime(this.state.currentTime);
  }

  getFormattedDuration(): string {
    return this.formatTime(this.state.duration);
  }
}

export function createVideoPlayer(videoBaseUrl?: string): VideoPlayer {
  return new VideoPlayer(videoBaseUrl);
}