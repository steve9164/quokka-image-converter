import React, { useState, useRef } from "react";
import pako from "pako";
import { saveAs } from "file-saver";
import "./App.css";

const QUOKKA_OLED_WIDTH = 128;
const QUOKKA_OLED_HEIGHT = 64;

function getScaledDimensions(sourceImage: HTMLImageElement) {
  // Fix this...
  const downScale =
    sourceImage.width > QUOKKA_OLED_WIDTH ||
    sourceImage.height > QUOKKA_OLED_HEIGHT;
  const scaledWidth = downScale ? QUOKKA_OLED_WIDTH : sourceImage.width;
  const scaledHeight = downScale ? QUOKKA_OLED_HEIGHT : sourceImage.height;
  return { scaledWidth, scaledHeight };
}

function isWhitePixel(rgba: Uint8Array | Uint8ClampedArray | number[]) {
  return 0.299 * rgba[0] + 0.587 * rgba[1] + 0.114 * rgba[2] > 127;
}

function downloadQimz(
  sourceImage: HTMLImageElement,
  destCanvas: HTMLCanvasElement
) {
  // Update the canvas before downloading
  blitImage(sourceImage, destCanvas);
  const { scaledWidth, scaledHeight } = getScaledDimensions(sourceImage);
  const ctx = destCanvas.getContext("2d")!;
  const imageData = ctx.getImageData(0, 0, scaledWidth, scaledHeight);
  const data = imageData.data;
  const pixelData = new Uint8Array(Math.ceil(imageData.data.length / 32.0));
  // Iterate over the image data turning each 8 pixels into a byte
  for (let i = 0; i < imageData.data.length; i += 32) {
    let byte = 0x00;
    // Iterate over the 8 pixels making up the current byte
    for (let p = 0; p < 8 && i + p * 4 < imageData.data.length; p++) {
      if (isWhitePixel(data.slice(i + p * 4, i + (p + 1) * 4))) {
        byte += 1 << (7 - p);
      }
    }
    pixelData[i / 32] = byte;
  }
  // Compress pixels and construct qimz
  const compressed: Uint8Array = pako.deflate(pixelData);
  const qimz = new Uint8Array(compressed.length + 2);
  qimz.set([scaledWidth, scaledHeight]);
  qimz.set(compressed, 2);

  // Create a blob and download as a file
  const blob = new Blob([qimz], { type: "application/octet-stream" });
  saveAs(blob, "image.qimz");
}

function blitImage(
  sourceImage: HTMLImageElement,
  destCanvas: HTMLCanvasElement
) {
  const { scaledWidth, scaledHeight } = getScaledDimensions(sourceImage);
  const ctx = destCanvas.getContext("2d")!;
  ctx.drawImage(sourceImage, 0, 0, scaledWidth, scaledHeight);
  const imageData = ctx.getImageData(0, 0, scaledWidth, scaledHeight);
  const data = imageData.data;
  for (let i = 0; i < imageData.data.length; i += 4) {
    const monochrome = isWhitePixel(data.slice(i, i + 4)) ? 255 : 0;
    data[i] = monochrome;
    data[i + 1] = monochrome;
    data[i + 2] = monochrome;
  }
  ctx.putImageData(imageData, 0, 0);
}

const App: React.FC = () => {
  const imageEl = useRef<HTMLImageElement>(null);
  const monochromeCanvasEl = useRef<HTMLCanvasElement>(null);
  const [url, setUrl] = useState(
    "https://groklearning-cdn.com/static/images/challenge/ncss-logo-fb.png"
  );
  return (
    <div className="App">
      <div>
        <img alt="Source" ref={imageEl} src={url} crossOrigin="anonymous" />
        <canvas ref={monochromeCanvasEl} />
      </div>
      <form>
        <input
          type="text"
          value={url}
          onChange={evt => setUrl(evt.target.value)}
        />
        <button
          type="button"
          onClick={() => {
            if (
              imageEl.current !== null &&
              monochromeCanvasEl.current !== null
            ) {
              blitImage(imageEl.current, monochromeCanvasEl.current);
            }
          }}
        >
          Load image
        </button>
        <button
          type="button"
          onClick={() => {
            if (
              imageEl.current !== null &&
              monochromeCanvasEl.current !== null
            ) {
              downloadQimz(imageEl.current, monochromeCanvasEl.current);
            }
          }}
        >
          Download Quokka image
        </button>
      </form>
    </div>
  );
};

export default App;
