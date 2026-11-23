"""Write a tiny random model in the app's web format, with Keras outputs, for the TS inference test.

Same layer types and 'same' padding/stride as the real model, just small, so
FSL/src/recognition/__tests__/convnet.test.ts can check the TypeScript runner
against Keras without a trained model.
"""

import json
from pathlib import Path

import numpy as np

from export import web_layers
from train import build_model

OUT = Path(__file__).parent / "fixtures" / "tiny_net"

if __name__ == "__main__":
    import keras

    keras.utils.set_random_seed(7)
    model = build_model(num_classes=6)
    # give BatchNorm non-trivial statistics so the folding is exercised
    for layer in model.layers:
        if isinstance(layer, keras.layers.BatchNormalization):
            g, b, m, v = layer.get_weights()
            rng = np.random.default_rng(len(g))
            layer.set_weights([rng.uniform(0.5, 1.5, g.shape), rng.normal(0, 0.1, b.shape),
                               rng.normal(0, 0.1, m.shape), rng.uniform(0.5, 1.5, v.shape)])
    OUT.mkdir(parents=True, exist_ok=True)
    specs, arrays = web_layers(model)
    (OUT / "model.json").write_text(json.dumps({"format": "signbridge-conv1d/1", "input": [32, 149], "output": 6, "layers": specs}, indent=1))
    with open(OUT / "weights.bin", "wb") as f:
        for a in arrays:
            f.write(np.ascontiguousarray(a, dtype="<f4").tobytes())
    x = np.random.default_rng(3).normal(0, 1, (3, 32, 149)).astype(np.float32)
    probs = model.predict(x, verbose=0)
    (OUT / "reference.json").write_text(json.dumps({"cases": [{"input": a.reshape(-1).tolist(), "probs": p.tolist()} for a, p in zip(x, probs)]}))
    print("wrote", OUT, [s["type"] for s in specs])
