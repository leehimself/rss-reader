import { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';

interface CctvVideoProps {
  vid: string;
}

export default function CctvVideo({ vid }: CctvVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hlsUrl, setHlsUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const port = await window.electronAPI.getExpressPort();
        const resp = await fetch(`http://localhost:${port}/api/cctv/video/${vid}`);
        const data = await resp.json();
        if (data.hls_url) {
          setHlsUrl(data.hls_url);
        } else {
          setError('视频加载失败');
        }
      } catch {
        setError('视频加载失败');
      } finally {
        setLoading(false);
      }
    })();
  }, [vid]);

  useEffect(() => {
    if (!hlsUrl || !videoRef.current) return;
    const video = videoRef.current;

    if (Hls.isSupported()) {
      const hls = new Hls();
      hls.loadSource(hlsUrl);
      hls.attachMedia(video);
      return () => hls.destroy();
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = hlsUrl;
    }
  }, [hlsUrl]);

  if (loading) {
    return (
      <div className="my-6 bg-[#111] rounded-lg p-8 text-center">
        <div className="inline-block w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
        <p className="text-xs text-white/40 mt-2">加载视频中...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="my-6 bg-[#111] rounded-lg p-6 text-center">
        <p className="text-xs text-white/40">{error}</p>
      </div>
    );
  }

  return (
    <div className="my-6 rounded-lg overflow-hidden bg-black">
      <video
        ref={videoRef}
        controls
        playsInline
        className="w-full block max-h-[480px]"
        style={{ background: '#000' }}
      />
    </div>
  );
}
