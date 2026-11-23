/** Native: the regular expo-camera preview. Frame access for recognition comes in milestone 3. */
import React from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { CameraView } from 'expo-camera';

export interface WebCameraViewProps {
  facing: 'front' | 'back';
  style?: StyleProp<ViewStyle>;
  onVideo?: (video: HTMLVideoElement | null) => void;
  onError?: (error: Error) => void;
}

export function WebCameraView({ facing, style }: WebCameraViewProps) {
  return <CameraView style={style} facing={facing} />;
}
