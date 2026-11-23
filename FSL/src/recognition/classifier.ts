/**
 * The FSL-105 sign classifier: loads the exported model from the app's own
 * assets (no network) and runs it with convnet.ts.
 */
import { Asset } from 'expo-asset';
import spec from '@/assets/models/fsl105/model.json';
import labels from '@/assets/models/fsl105/labels.json';
import { loadNet, runNet, type Net, type NetSpec } from './convnet';
import type { Guess, SignClassifier } from './types';

const TOP_K = 5;

export function createClassifier(): SignClassifier {
  let net: Net | null = null;
  return {
    async load() {
      if (net) return;
      const asset = Asset.fromModule(require('@/assets/models/fsl105/weights.bin'));
      await asset.downloadAsync();
      const res = await fetch(asset.localUri ?? asset.uri);
      if (!res.ok) throw new Error(`weights: HTTP ${res.status}`);
      net = loadNet(spec as unknown as NetSpec, await res.arrayBuffer());
    },
    async predict(window32) {
      if (!net) throw new Error('classifier not loaded');
      const probs = runNet(net, window32);
      const ranked: Guess[] = Array.from(probs, (score, i) => ({ label: labels[i].label, score }));
      ranked.sort((a, b) => b.score - a.score);
      return ranked.slice(0, TOP_K);
    },
  };
}
