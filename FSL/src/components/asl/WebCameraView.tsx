/**
 * Native camera preview. Android: the HandTracker view (modules/hand-tracker),
 * which runs MediaPipe on the phone and feeds frames to recognition.
 * iOS: the plain expo-camera preview (the iPhone tracker isn't built yet).
 */
import React, { useEffect, useMemo } from 'react';
import { Platform, type StyleProp, type ViewStyle } from 'react-native';
import { CameraView } from 'expo-camera';
import HandTrackerView from '../../../modules/hand-tracker/src/HandTrackerView';
import { createFrameFeed } from '@/recognition/handPoints';
import type { CameraHandle } from '@/recognition/types';

export interface WebCameraViewProps {
  facing: 'front' | 'back';
  style?: StyleProp<ViewStyle>;
  /** Called with the camera handle recognition reads from, or null when it goes away. */
  onVideo?: (camera: CameraHandle | null) => void;
  onError?: (error: Error) => void;
}

export function WebCameraView({ facing, style, onVideo, onError }: WebCameraViewProps) {
  const feed = useMemo(() => createFrameFeed(), []);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    onVideo?.(feed);
    return () => onVideo?.(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feed]);

  if (Platform.OS !== 'android') return <CameraView style={style} facing={facing} />;
  return (
    <HandTrackerView
      style={style}
      facing={facing}
      active
      onFrame={(e) => feed.emit(e.nativeEvent)}
      onError={(e) => onError?.(Object.assign(new Error(e.nativeEvent.message), { name: e.nativeEvent.code }))}
    />
  );
}
