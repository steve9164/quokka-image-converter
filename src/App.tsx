import {
  Button,
  Container,
  createMuiTheme,
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
import { observer } from "mobx-react-lite";
import React, { useState } from "react";
import FileDropZone from "./FileDropZone";
import ImagePreview from "./ImagePreview";

const theme = responsiveFontSizes(createMuiTheme(), { factor: 3 });

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
    reader.onload = (e) => {
      const data = reader.result! as string;
      this.localImages.set([...this.localImages.get(), { name, data }]);
    };
    reader.readAsDataURL(file);
    console.log(isObservableArray(this.localImages));
  },
  deleteLocalImage(index: number) {
    this.localImages.get().splice(index, 1);
  },
});

const App: React.FC = observer(() => {
  const [store] = useState(createStore());
  const [url, setUrl] = useState("");

  const classes = useAppStyles();

  const smOrLarger = useMediaQuery(theme.breakpoints.up("sm"));

  return (
    <ThemeProvider theme={theme}>
      <FileDropZone onDrop={(file) => store.addLocalImage(file)} imagesOnly>
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
                {store.urls.get().map((url, i) => (
                  <GridListTile key={url}>
                    <img
                      src={url}
                      alt={url}
                      onClick={() => store.imageUrl.set(url)}
                    />
                    <GridListTileBar
                      title={url}
                      classes={{
                        root: classes.titleBar,
                        title: classes.title,
                      }}
                      actionIcon={
                        <IconButton
                          aria-label={`delete ${url}`}
                          onClick={() => store.deleteUrl(i)}
                        >
                          <DeleteIcon className={classes.title} />
                        </IconButton>
                      }
                    />
                  </GridListTile>
                ))}
                {store.localImages.get().map(({ name, data }) => (
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
                onSubmit={(evt) => {
                  store.addUrl(url);
                  evt.preventDefault();
                }}
              >
                <Grid container direction="row" spacing={1}>
                  <Grid item>
                    <TextField
                      label="Image URL"
                      value={url}
                      onChange={(evt) => setUrl(evt.target.value)}
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
            <Divider />
            <Grid item>
              <ImagePreview url={store.imageUrl.get()} />
            </Grid>
          </Grid>
        </Container>
      </FileDropZone>
    </ThemeProvider>
  );
});

export default App;
