# Add photos

The importer accepts a JSON file with one to three photos, each paired with a depth estimate. A JPEG alone will not work. Files stay on your device. Reloading restores the bundled photo.

To try the importer, open "Source & how it works", choose "load photo set" and select `photos/plot-original.json`.

## Prepare a set

Use photos you have permission to share. Each needs its own depth estimate.

`prepare-photos.py` requires Python, Pillow, numpy, onnxruntime and an existing Depth Anything V2 Small quantized ONNX model. It does not install dependencies or download weights. Blender is not required.

Create `photo-input.json`:

```json
[
  {
    "file": "room.jpg",
    "label": "Table view",
    "credit": "Photographer name",
    "url": "",
    "alt": "Description of the photograph."
  }
]
```

Add up to three records, then run:

```sh
python3 prepare-photos.py --model /path/to/model_quantized.onnx --input photo-input.json --output plot-photos.json
```

The script crops each photo to 3:2 and resizes it to 435 x 290 pixels before estimating depth. Review the crops and estimates, then load `plot-photos.json` in the tool. The preparation script has been syntax-checked; inference has not been tested here.

## File format

Each photo has `id`, `label`, `credit`, `alt`, `url`, `depthModel`, `width`, `height`, `image` and `samples`.

`image` is an embedded JPEG data URL. `samples` is base64-encoded depth and luminance, interleaved as two bytes per pixel. Depth values 0 to 255 map to 1.4 to 6.0 arbitrary units. A luminance value of 0 omits a point; 1 to 255 encodes grayscale.

Each photo produces a separate estimated view. The tool does not align photos into a room scan.
