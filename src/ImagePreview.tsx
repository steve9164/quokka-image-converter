import {
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  Grid,
  Slider,
  TextField,
  Typography,
} from "@mui/material";
import { saveAs } from "file-saver";
import { action, autorun, runInAction } from "mobx";
import { observer, useLocalObservable } from "mobx-react-lite";
import pako from "pako";
import React, { useCallback, useEffect } from "react";

const QUOKKA_OLED_WIDTH = 128;
const QUOKKA_OLED_HEIGHT = 64;

function isWhitePixel(
  rgba: Uint8Array | Uint8ClampedArray | number[],
  whiteThreshold: number,
  invert: boolean
) {
  const isWhite =
    0.299 * rgba[0] + 0.587 * rgba[1] + 0.114 * rgba[2] > whiteThreshold;
  return isWhite !== invert;
}

function processImage(
  source: HTMLImageElement,
  dest: HTMLCanvasElement,
  width: number,
  height: number,
  whiteThreshold: number,
  invert: boolean
): Uint8Array {
  dest.width = width;
  dest.height = height;

  const ctx = dest.getContext("2d")!;
  ctx.clearRect(0, 0, width, height);
  ctx.drawImage(source, 0, 0, width, height);
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  // Iterate and draw to canvas
  for (let i = 0; i < imageData.data.length; i += 4) {
    const monochrome = isWhitePixel(
      data.slice(i, i + 4),
      whiteThreshold,
      invert
    )
      ? 255
      : 0;
    data[i] = monochrome;
    data[i + 1] = monochrome;
    data[i + 2] = monochrome;
    data[i + 3] = 255;
  }
  ctx.putImageData(imageData, 0, 0);
  const pixelData = new Uint8Array(Math.ceil(imageData.data.length / 32.0));
  // Iterate over the image data turning each 8 pixels into a byte
  for (let i = 0; i < imageData.data.length; i += 32) {
    let byte = 0x00;
    // Iterate over the 8 pixels making up the current byte
    for (let p = 0; p < 8 && i + p * 4 < imageData.data.length; p++) {
      if (
        isWhitePixel(
          data.slice(i + p * 4, i + (p + 1) * 4),
          whiteThreshold,
          invert
        )
      ) {
        byte += 1 << (7 - p);
      }
    }
    pixelData[i / 32] = byte;
  }
  // Compress pixels and construct qimz
  const compressed: Uint8Array = pako.deflate(pixelData);
  const qimz = new Uint8Array(compressed.length + 2);
  qimz.set([width, height]);
  qimz.set(compressed, 2);
  return qimz;
}

// Document ImagePreview width/height editing
// User stories:
// 1. I have a bunch of images that are all the same aspect ratio (or same size) and
//     I want to have them all generate images with the same dimensions
// - This won't be supported. A user that has a bunch of images that all should export
//   to the same size can probably export them all as the right size before using the converter
// 2. I have some images of various dimensions and want to conver them all, selecting specific
//    width/height for some of them

// When loading an image width/height should be disabled
// When loading finishes set the output{Width,Height} by Quokka screen size and aspect ratio

interface ImagePreviewProps {
  url: string;
}

const ImagePreview: React.FC<ImagePreviewProps> = observer(({ url }) => {
  const store = useLocalObservable(() => ({
    sourceRef: null as HTMLImageElement | null,
    setSourceRef(ref: HTMLImageElement | null) {
      this.sourceRef = ref;
    },
    sourceLoaded: false,
    setSourceLoaded(val: boolean) {
      this.sourceLoaded = val;
    },
    destinationRef: null as HTMLCanvasElement | null,
    setDestinationRef(ref: HTMLCanvasElement | null) {
      this.destinationRef = ref;
    },
    whiteThreshold: 127,
    setWhiteThreshold(val: number) {
      this.whiteThreshold = val;
    },
    invert: false,
    setInvert(val: boolean) {
      this.invert = val;
    },
    qimz: undefined as Uint8Array | undefined,
    setQimz(bytes: Uint8Array | undefined) {
      this.qimz = bytes;
    },
    outputWidth: "",
    setOutputWidth(val: string) {
      this.outputWidth = val;
    },
    outputHeight: "",
    setOutputHeight(val: string) {
      this.outputHeight = val;
    },

    lockAspectRatio: true,
    setLockAspectRatio(val: boolean) {
      this.lockAspectRatio = val;
    },
    onHeightChange(height: string) {
      this.setOutputHeight(height);
      const heightInt = parseInt(height);
      const source = this.sourceRef;
      if (this.lockAspectRatio && !isNaN(heightInt) && source !== null) {
        this.setOutputWidth(
          "" + Math.round((source.width * heightInt) / source.height)
        );
      }
    },
    onWidthChange(width: string) {
      this.setOutputWidth(width);
      const widthInt = parseInt(width);
      const source = this.sourceRef;
      if (this.lockAspectRatio && !isNaN(widthInt) && source !== null) {
        this.setOutputHeight(
          "" + Math.round((source.height * widthInt) / source.width)
        );
      }
    },
  }));

  // This useEffect runs too much and crashes React
  // Setting `store.qimz` causes source and dest to redraw, which causes the QIMZ to be generated again recursively forever
  // Need to make sure that the img and canvas have a long lifetime
  useEffect(
    () =>
      autorun(() => {
        console.log("Generating QIMZ");
        const source = store.sourceRef;
        const destination = store.destinationRef;
        const widthInt = parseInt(store.outputWidth);
        const heightInt = parseInt(store.outputHeight);
        if (
          source !== null &&
          destination !== null &&
          !isNaN(widthInt) &&
          !isNaN(heightInt)
        ) {
          const data = processImage(
            source,
            destination,
            widthInt,
            heightInt,
            store.whiteThreshold,
            store.invert
          );

          runInAction(() => store.setQimz(data));
        }
      }),
    [store]
  );

  const setSourceRef = useCallback(action(store.setSourceRef), [store]);
  const setDestinationRef = useCallback(action(store.setDestinationRef), [
    store,
  ]);

  return (
    <Grid container spacing={2} direction="column">
      <Grid item>
        <Typography>Selected image preview:</Typography>
        <Box
          component="img"
          sx={{
            maxHeight: 288,
            maxWidth: "calc(100vw - 32px)",
          }}
          alt="Source"
          ref={setSourceRef}
          src={url}
          crossOrigin="anonymous"
          onLoad={action(() => {
            store.setSourceLoaded(true);
            const source = store.sourceRef!;
            const scaleFactor = Math.min(
              QUOKKA_OLED_WIDTH / source.width,
              QUOKKA_OLED_HEIGHT / source.height,
              1
            );
            store.setOutputWidth("" + Math.round(scaleFactor * source.width));
            store.setOutputHeight("" + Math.round(scaleFactor * source.height));
          })}
        />
      </Grid>
      <Grid item container direction="column" spacing={2}>
        <Grid item container direction="column" spacing={0}>
          <Grid item>
            <FormControlLabel
              label="Use original aspect ratio"
              control={
                <Checkbox
                  checked={store.lockAspectRatio}
                  onChange={action((_, checked) =>
                    store.setLockAspectRatio(checked)
                  )}
                />
              }
            />
          </Grid>
          <Grid item>
            <TextField
              label="Width"
              disabled={!store.sourceLoaded}
              value={store.outputWidth}
              type="number"
              onChange={action((evt) => {
                const width = evt.target.value;
                store.onWidthChange(width);
              })}
              variant="filled"
              size="small"
            />
          </Grid>
          <Grid item>
            <TextField
              label="Height"
              disabled={!store.sourceLoaded}
              value={store.outputHeight}
              type="number"
              onChange={action((evt) => {
                const height = evt.target.value;
                store.onHeightChange(height);
              })}
              variant="filled"
              size="small"
            />
          </Grid>
        </Grid>
        <Grid item container direction="column" spacing={0}>
          <Grid item>
            <Typography id="white-threshold-label" gutterBottom>
              White threshold:
            </Typography>
            <Slider
              sx={{ maxWidth: "223px" }}
              aria-labelledby="white-threshold-label"
              value={store.whiteThreshold}
              onChange={action((_, val) =>
                store.setWhiteThreshold(val as number)
              )}
              min={0}
              max={255}
              valueLabelDisplay="auto"
            />
          </Grid>
          <Grid item>
            <FormControlLabel
              label="Invert"
              control={
                <Checkbox
                  checked={store.invert}
                  onChange={action((_, checked) => store.setInvert(checked))}
                />
              }
            />
          </Grid>
        </Grid>
      </Grid>
      <Grid item container direction="column" spacing={1}>
        <Grid item>
          <Typography>Quokka monochrome preview:</Typography>
          <Box
            sx={{
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: "black",
              width: 128,
              height: 64,
            }}
          >
            <Box
              component="canvas"
              sx={{
                verticalAlign: "top",
              }}
              ref={setDestinationRef}
            />
          </Box>
        </Grid>
        <Grid item>
          <Button
            disabled={store.qimz === undefined}
            onClick={() => {
              // Create a blob and download as a file
              const blob = new Blob([runInAction(() => store.qimz!)], {
                type: "application/octet-stream",
              });
              saveAs(blob, "image.qimz");
            }}
            color="primary"
            variant="outlined"
          >
            Download Qimz
          </Button>
        </Grid>
      </Grid>
    </Grid>
  );
});

export default ImagePreview;
