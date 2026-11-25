import type { StyleProp, ViewStyle } from 'react-native';

/** One analysed camera frame. Coordinates are normalised, in the raw (unmirrored) image. */
export type HandTrackerFrame = {
  t: number;
  hands: { label: string; points: number[][] }[];
  pose: { x: number; y: number; z: number; visibility: number }[] | null;
};

export type HandTrackerError = {
  /** 'noCamera': the camera couldn't start. 'noModel': MediaPipe couldn't load its models. */
  code: 'noCamera' | 'noModel';
  message: string;
};

export type HandTrackerViewProps = {
  facing?: 'front' | 'back';
  /** Run hand tracking (the preview shows either way). */
  active?: boolean;
  onFrame?: (event: { nativeEvent: HandTrackerFrame }) => void;
  onError?: (event: { nativeEvent: HandTrackerError }) => void;
  style?: StyleProp<ViewStyle>;
};
