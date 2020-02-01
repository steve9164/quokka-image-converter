import {
  Button,
  Card,
  CardActionArea,
  CardContent,
  CardMedia,
  Container,
  Grid,
  makeStyles,
  TextField,
  Typography
} from "@material-ui/core";
import { saveAs } from "file-saver";
import { DropzoneArea } from "material-ui-dropzone";
import { observable } from "mobx";
import { useObserver } from "mobx-react-lite";
import pako from "pako";
import React, { useRef, useState } from "react";

const QUOKKA_OLED_WIDTH = 128;
const QUOKKA_OLED_HEIGHT = 64;

function isWhitePixel(rgba: Uint8Array | Uint8ClampedArray | number[]) {
  return 0.299 * rgba[0] + 0.587 * rgba[1] + 0.114 * rgba[2] > 127;
}

function processImage(
  source: HTMLImageElement,
  dest: HTMLCanvasElement
): Uint8Array {
  const scaleFactor = Math.min(
    QUOKKA_OLED_WIDTH / source.width,
    QUOKKA_OLED_HEIGHT / source.height,
    1
  );
  const width = scaleFactor * source.width;
  const height = scaleFactor * source.height;
  dest.width = width;
  dest.height = height;

  const ctx = dest.getContext("2d")!;
  ctx.clearRect(0, 0, width, height);
  ctx.drawImage(source, 0, 0, width, height);
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  // Iterate and draw to canvas
  for (let i = 0; i < imageData.data.length; i += 4) {
    const monochrome = isWhitePixel(data.slice(i, i + 4)) ? 255 : 0;
    data[i] = monochrome;
    data[i + 1] = monochrome;
    data[i + 2] = monochrome;
  }
  ctx.putImageData(imageData, 0, 0);
  // Iterate again, saving to qimz
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
  qimz.set([width, height]);
  qimz.set(compressed, 2);
  return qimz;
}

const useImagePreviewStyles = makeStyles({
  image: {
    maxHeight: 512,
    maxWidth: 512
  },
  previewBorder: {
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "black",
    width: 128,
    height: 64
  }
});

interface ImagePreviewProps {
  url: string;
}

const ImagePreview: React.FC<ImagePreviewProps> = ({ url }) => {
  const imageEl = useRef<HTMLImageElement>(null);
  const monochromeCanvasEl = useRef<HTMLCanvasElement>(null);
  const [qimz, setQimz] = useState();
  const [temporaryUrl, setTemporaryUrl] = useState("");
  const classes = useImagePreviewStyles();
  return (
    <>
      <TextField
        variant="filled"
        label="Image URL"
        value={temporaryUrl}
        onChange={evt => setTemporaryUrl(evt.target.value)}
      />
      <Button variant="contained" size="large">
        Load image
      </Button>

      <div>
        <img
          className={classes.image}
          alt="Source"
          ref={imageEl}
          src={url}
          crossOrigin="anonymous"
          onLoad={() =>
            setQimz(processImage(imageEl.current!, monochromeCanvasEl.current!))
          }
        />
        <div className={classes.previewBorder}>
          <canvas ref={monochromeCanvasEl} />
        </div>
        <button
          onClick={() => {
            // Create a blob and download as a file
            const blob = new Blob([qimz], { type: "application/octet-stream" });
            saveAs(blob, "image.qimz");
          }}
        >
          Download Qimz
        </button>
      </div>
    </>
  );
};

const useStylesHistoryImage = makeStyles({
  // card: { maxWidth: 200 },
  media: { height: 160 }
});

interface HistoryImageProps {
  url: string;
  caption?: string;
  onClick?: () => void;
}

const HistoryImage: React.FC<HistoryImageProps> = ({
  url,
  caption,
  onClick
}) => {
  const classes = useStylesHistoryImage();
  return (
    <Card>
      <CardActionArea onClick={onClick}>
        <CardMedia className={classes.media} image={url} />
        <CardContent>
          <Typography variant="body2" color="textSecondary" component="p">
            {caption || url}
          </Typography>
        </CardContent>
      </CardActionArea>
    </Card>
  );
};

interface IDraggedImage {
  readonly data: string;
  readonly name: string;
}

const DEFAULT_URL =
  "http://ci.terria.io/master/build/78303112301085744794e356ff2dca25.png";

const createStore = () => ({
  urls: observable.box([DEFAULT_URL]),
  addUrl(url: string) {
    this.urls.set([...this.urls.get(), url]);
  },
  removeUrl(index: number) {
    const cloned = this.urls.get().slice();
    cloned.splice(index, 1);
    this.urls.set(cloned);
  },
  imageUrl: observable.box(DEFAULT_URL),
  files: observable.box([] as IDraggedImage[]),
  addLocalImage(file: File) {
    const reader = new FileReader();
    const name = file.name;
    reader.onerror = () => console.log("file reading has failed");
    reader.onload = e => {
      const data = reader.result! as string;
      this.files.set([...this.files.get(), { name, data }]);
    };
    reader.readAsDataURL(file);
  }
});

const App: React.FC = () => {
  const [store, _] = useState(createStore());
  const [url, setUrl] = useState("");

  return useObserver(() => (
    <Container>
      <Typography variant="h2">Quokka Image Converter</Typography>
      <ImagePreview url={store.imageUrl.get()} />
      <Grid container direction="row" justify="center" spacing={2}>
        {store.urls.get().map(url => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={url}>
            <HistoryImage url={url} onClick={() => store.imageUrl.set(url)} />
          </Grid>
        ))}
        {store.files.get().map(({ name, data }) => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={data}>
            <HistoryImage
              key={data}
              caption={name}
              url={data}
              onClick={() => store.imageUrl.set(data)}
            />
          </Grid>
        ))}
      </Grid>
      <DropzoneArea
        maxFileSize={20 * 1e6}
        acceptedFiles={["image/*"]}
        onDrop={file => store.addLocalImage(file)}
      />
      <form
        noValidate
        onSubmit={evt => {
          store.addUrl(url);
          evt.preventDefault();
        }}
      >
        <input
          type="text"
          value={url}
          onChange={evt => setUrl(evt.target.value)}
        />
        <input type="submit" value="Add URL" />
      </form>
    </Container>
  ));
};

export default App;
