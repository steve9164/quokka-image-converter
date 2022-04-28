import {
  Button,
  Container,
  createTheme,
  Divider,
  Grid,
  GridList,
  GridListTile,
  GridListTileBar,
  IconButton,
  makeStyles,
  responsiveFontSizes,
  TextField,
  ThemeProvider,
  Typography,
  useMediaQuery,
} from "@material-ui/core";
import DeleteIcon from "@material-ui/icons/Delete";
import { isObservableArray, observable } from "mobx";
import { observer, useLocalObservable } from "mobx-react-lite";
import React, { useState } from "react";
import FileDropZone from "./FileDropZone";
import ImagePreview from "./ImagePreview";

const theme = responsiveFontSizes(createTheme(), { factor: 3 });

const useAppStyles = makeStyles((theme) => ({
  gridList: {
    flexWrap: "nowrap",
    transform: "translateZ(0)",
  },
  restrictGridWidth: {
    // Hacky, but needed, otherwise the GridList breaks horizontally out of the page
    maxWidth: "calc(100vw - 32px)",
  },
  title: {
    color: theme.palette.primary.light,
  },
  titleBar: {
    background:
      "linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.3) 70%, rgba(0,0,0,0) 100%)",
  },
}));

interface IDraggedImage {
  readonly data: string;
  readonly name: string;
}

interface INamedImage {
  readonly name: string;
  readonly url: string;
}

const DEFAULT_URL = "/example-star.png";

// const createStore = () => ({
//   urls: observable.box([DEFAULT_URL]),
//   addUrl(url: string) {
//     this.urls.set([...this.urls.get(), url]);
//   },
//   deleteUrl(index: number) {
//     const cloned = this.urls.get().slice();
//     cloned.splice(index, 1);
//     this.urls.set(cloned);
//   },
//   imageUrl: observable.box(DEFAULT_URL),
//   localImages: observable.box([] as IDraggedImage[]),
//   addLocalImage(file: File) {
//     const reader = new FileReader();
//     const name = file.name;
//     reader.onerror = () => console.log("file reading has failed");
//     reader.onload = (e) => {
//       const data = reader.result! as string;
//       this.localImages.set([...this.localImages.get(), { name, data }]);
//     };
//     reader.readAsDataURL(file);
//     console.log(isObservableArray(this.localImages));
//   },
//   deleteLocalImage(index: number) {
//     this.localImages.get().splice(index, 1);
//   },
// });

const App: React.FC = observer(() => {
  const store = useLocalObservable(() => ({
    images: [{ name: DEFAULT_URL, url: DEFAULT_URL }] as INamedImage[],
    addImage(name: string, url: string) {
      this.images.push({ name, url });
    },
    addImageFromFile(file: File) {
      this.addImage(file.name, URL.createObjectURL(file));
    },
    removeImage(index: number) {
      // revokeObjectURL is a no-op if the URL is not an object URL, and frees the object URL if it is
      URL.revokeObjectURL(this.images.splice(index, 1)[0].url);
      if (index < this.activeImageIndex) {
        this.setActiveImageIndex(this.activeImageIndex - 1);
      }
    },
    activeImageIndex: 0,
    setActiveImageIndex(index: number) {
      this.activeImageIndex = index;
    },
  }));
  // const [store] = useState(createStore());
  const [textboxUrl, setTextboxUrl] = useState("");

  const classes = useAppStyles();

  const smOrLarger = useMediaQuery(theme.breakpoints.up("sm"));

  return (
    <ThemeProvider theme={theme}>
      <FileDropZone onDrop={(file) => store.addImageFromFile(file)} imagesOnly>
        <Container>
          <Grid container direction="column" spacing={2}>
            <Grid item>
              <Typography variant="h2">Quokka Image Converter</Typography>
            </Grid>

            <Grid item className={classes.restrictGridWidth}>
              <Typography>
                Choose from a loaded image below or load another by dragging and
                dropping it onto this window or entering the URL of the image
              </Typography>
              <GridList
                className={classes.gridList}
                cols={smOrLarger ? 4 : 2}
                spacing={2}
              >
                {store.images.map(({ name, url }, i) => (
                  <GridListTile key={url}>
                    <img
                      src={url}
                      alt={name}
                      onClick={() => store.setActiveImageIndex(i)}
                    />
                    <GridListTileBar
                      title={name}
                      classes={{
                        root: classes.titleBar,
                        title: classes.title,
                      }}
                      actionIcon={
                        <IconButton
                          aria-label={`delete ${name}`}
                          onClick={() => store.removeImage(i)}
                        >
                          <DeleteIcon className={classes.title} />
                        </IconButton>
                      }
                    />
                  </GridListTile>
                ))}
                {/* {store.localImages.get().map(({ name, data }) => (
                  <GridListTile key={data}>
                    <img
                      alt={name}
                      src={data}
                      onClick={() => store.imageUrl.set(data)}
                    />
                  </GridListTile>
                ))} */}
              </GridList>
            </Grid>
            <Grid item>
              <form
                noValidate
                onSubmit={(evt) => {
                  store.addImage(textboxUrl, textboxUrl);
                  evt.preventDefault();
                }}
              >
                <Grid container direction="row" spacing={1}>
                  <Grid item>
                    <TextField
                      label="Image URL"
                      value={textboxUrl}
                      onChange={(evt) => setTextboxUrl(evt.target.value)}
                      variant="outlined"
                      size="small"
                    />
                  </Grid>
                  <Grid item>
                    <Button type="submit" variant="contained" size="medium">
                      Add image
                    </Button>
                  </Grid>
                </Grid>
              </form>
            </Grid>
            {store.images.length > 0 && (
              <>
                <Divider />
                <Grid item>
                  <ImagePreview
                    url={store.images[store.activeImageIndex].url}
                  />
                </Grid>
              </>
            )}
          </Grid>
        </Container>
      </FileDropZone>
    </ThemeProvider>
  );
});

export default App;
