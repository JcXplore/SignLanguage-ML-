import { requireNativeView } from 'expo';
import * as React from 'react';

import type { HandTrackerViewProps } from './HandTracker.types';

const NativeView: React.ComponentType<HandTrackerViewProps> = requireNativeView('HandTracker');

/** Android camera preview that runs MediaPipe hand and pose tracking on the phone. */
export default function HandTrackerView(props: HandTrackerViewProps) {
  return <NativeView {...props} />;
}
