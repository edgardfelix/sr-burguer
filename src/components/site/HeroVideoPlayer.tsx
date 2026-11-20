'use client';

import { LoaderCircle, Pause, Play } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { VideoToggle } from './hero-video-styles';

/**
 * Vídeo real da casa (montagem do hambúrguer), sem áudio, por cima do pôster.
 * Só baixa quando montado, toca apenas enquanto visível e aparece com um esmaecer suave
 * quando o primeiro quadro está pronto (o pôster continua embaixo, sem salto de layout).
 */
export default function HeroVideoPlayer({ startPlaying }: { startPlaying: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [wantsPlay, setWantsPlay] = useState(startPlaying);
  const [playing, setPlaying] = useState(false);
  const [buffering, setBuffering] = useState(startPlaying);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (!wantsPlay) {
      video.pause();
      return;
    }
    if (!video.getAttribute('src')) {
      video.src = video.canPlayType('video/webm; codecs="vp9"') ? '/video/srburguer-hero.webm' : '/video/srburguer-hero.mp4';
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) video.play().catch(() => setWantsPlay(false));
        else video.pause();
      },
      { threshold: 0.2 },
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, [wantsPlay]);

  const busy = wantsPlay && buffering;

  return (
    <>
      <video
        ref={videoRef}
        muted
        playsInline
        loop
        preload="none"
        aria-hidden="true"
        tabIndex={-1}
        data-visible={playing}
        onPlaying={() => {
          setPlaying(true);
          setBuffering(false);
        }}
        onWaiting={() => setBuffering(true)}
        onPause={() => setPlaying(false)}
      />
      <VideoToggle
        type="button"
        onClick={() => setWantsPlay((v) => !v)}
        aria-label={wantsPlay ? 'Pausar vídeo' : 'Reproduzir vídeo'}
        aria-busy={busy || undefined}
      >
        {wantsPlay ? busy ? <LoaderCircle aria-hidden data-spin /> : <Pause aria-hidden /> : <Play aria-hidden />}
      </VideoToggle>
    </>
  );
}
