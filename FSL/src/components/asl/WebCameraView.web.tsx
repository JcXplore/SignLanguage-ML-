/**
 * Web camera preview built on getUserMedia, exposing its <video> element so
 * MediaPipe can read frames. The preview is mirrored for the front camera
 * (like a mirror, which is what signers expect); the frames MediaPipe reads
 * are not, matching the training videos.
 */
import React, { useEffect, useRef } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { View } from 'react-native';
import type { CameraHandle } from '@/recognition/types';

export interface WebCameraViewProps {
  facing: 'front' | 'back';
  style?: StyleProp<ViewStyle>;
  onVideo?: (camera: CameraHandle | null) => void;
  onError?: (error: Error) => void;
}

export function WebCameraView({ facing, style, onVideo, onError }: WebCameraViewProps) {
  const ref = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let cancelled = false;
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: facing === 'front' ? 'user' : 'environment', width: 640, height: 480 }, audio: false })
      .then(async (s) => {
        if (cancelled) return s.getTracks().forEach((t) => t.stop());
        stream = s;
        const video = ref.current!;
        video.srcObject = s;
        await video.play().catch(() => {});
        onVideo?.(video);
      })
      .catch((e: Error) => onError?.(e));
    return () => {
      cancelled = true;
      onVideo?.(null);
      stream?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facing]);

  return (
    <View style={style}>
      <video
        ref={ref}
        autoPlay
        playsInline
        muted
        aria-label="Camera preview"
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          transform: facing === 'front' ? 'scaleX(-1)' : undefined,
          background: '#000',
        }}
      />
    </View>
  );
}
