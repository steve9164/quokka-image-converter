import {
  Button,
  Card,
  CardActionArea,
  CardActions,
  CardContent,
  CardMedia,
  Container,
  createMuiTheme,
  Divider,
  Grid,
  GridList,
  GridListTile,
  IconButton,
  makeStyles,
  responsiveFontSizes,
  TextField,
  ThemeProvider,
  Typography
} from "@material-ui/core";
import DeleteIcon from "@material-ui/icons/Delete";
import { saveAs } from "file-saver";
import { observable } from "mobx";
import { useObserver } from "mobx-react-lite";
import pako from "pako";
import React, { useRef, useState } from "react";
import FileDropZone from "./FileDropZone";

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
    maxHeight: 288,
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
  const classes = useImagePreviewStyles();
  return (
    <Grid container spacing={2} direction="row">
      <Grid item sm={6} md={4} lg={3}>
        <Typography>Image preview:</Typography>
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
      </Grid>
      <Grid item container direction="column" spacing={1} sm={6} md={4} lg={3}>
        <Grid item>
          <Typography>Quokka monochrome preview:</Typography>
          <div className={classes.previewBorder}>
            <canvas ref={monochromeCanvasEl} />
          </div>
        </Grid>
        <Grid item>
          <Button
            onClick={() => {
              // Create a blob and download as a file
              const blob = new Blob([qimz], {
                type: "application/octet-stream"
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
};

const useStylesHistoryImage = makeStyles({
  // card: { maxWidth: 200 },
  media: { height: 160 },
  delete: { marginLeft: "auto" }
});

interface HistoryImageProps {
  url: string;
  caption?: string;
  onClick?: () => void;
  onDelete?: () => void;
}

const HistoryImage: React.FC<HistoryImageProps> = ({
  url,
  caption,
  onClick,
  onDelete
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
      <CardActions>
        <IconButton className={classes.delete} onClick={onDelete}>
          <DeleteIcon />
        </IconButton>
      </CardActions>
    </Card>
  );
};

const theme = responsiveFontSizes(createMuiTheme(), { factor: 3 });

const useAppStyles = makeStyles({
  gridList: {
    flexWrap: "nowrap",
    transform: "translateZ(0)"
  }
});

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
  deleteUrl(index: number) {
    const cloned = this.urls.get().slice();
    cloned.splice(index, 1);
    this.urls.set(cloned);
  },
  imageUrl: observable.box(DEFAULT_URL),
  localImages: observable.box([] as IDraggedImage[]),
  addLocalImage(file: File) {
    const reader = new FileReader();
    const name = file.name;
    reader.onerror = () => console.log("file reading has failed");
    reader.onload = e => {
      const data = reader.result! as string;
      this.localImages.set([...this.localImages.get(), { name, data }]);
    };
    reader.readAsDataURL(file);
  },
  deleteLocalImage(index: number) {
    const cloned = this.localImages.get().slice();
    cloned.splice(index, 1);
    this.localImages.set(cloned);
  }
});

const App: React.FC = () => {
  const [store] = useState(createStore());
  const [url, setUrl] = useState("");

  const classes = useAppStyles();

  return useObserver(() => (
    <ThemeProvider theme={theme}>
      <FileDropZone onDrop={file => store.addLocalImage(file)} imagesOnly>
        <Container>
          <Grid container direction="column" spacing={2}>
            <Grid item>
              <Typography variant="h2">Quokka Image Converter</Typography>
              <ImagePreview url={store.imageUrl.get()} />
            </Grid>
            <Divider />
            <Grid item>
              <Typography>
                Choose from a loaded image below or load another by dragging and
                dropping it onto this window or entering the URL of the image
              </Typography>
              {/* <Grid container direction="row" spacing={2}>
            {store.urls.get().map((url, i) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={url}>
                <HistoryImage
                  url={url}
                  onClick={() => store.imageUrl.set(url)}
                  onDelete={() => store.deleteUrl(i)}
                />
              </Grid>
            ))}
            {store.localImages.get().map(({ name, data }, i) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={data}>
                <HistoryImage
                  key={data}
                  caption={name}
                  url={data}
                  onClick={() => store.imageUrl.set(data)}
                  onDelete={() => store.deleteLocalImage(i)}
                />
              </Grid>
            ))}
          </Grid> */}
              <GridList className={classes.gridList} cols={4}>
                {store.urls.get().map((url, i) => (
                  <GridListTile key={url}>
                    <img
                      src={url}
                      alt={url}
                      onClick={() => store.imageUrl.set(url)}
                    />
                  </GridListTile>
                ))}
                {store.localImages.get().map(({ name, data }, i) => (
                  <GridListTile key={data}>
                    <img
                      key={data}
                      alt={name}
                      src={data}
                      onClick={() => store.imageUrl.set(data)}
                    />
                  </GridListTile>
                ))}
              </GridList>
            </Grid>
            <Grid item>
              <form
                noValidate
                onSubmit={evt => {
                  store.addUrl(url);
                  evt.preventDefault();
                }}
              >
                <TextField
                  label="Image URL"
                  value={url}
                  onChange={evt => setUrl(evt.target.value)}
                  variant="filled"
                  size="small"
                />
                <Button type="submit" variant="contained" size="large">
                  Add image
                </Button>
              </form>
            </Grid>
          </Grid>
        </Container>
      </FileDropZone>
    </ThemeProvider>
  ));
};

export default App;
