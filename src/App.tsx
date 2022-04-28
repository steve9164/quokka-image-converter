import DeleteIcon from "@mui/icons-material/Delete";
import {
  Button,
  Container,
  createTheme,
  Divider,
  Grid,
  IconButton,
  ImageList,
  ImageListItem,
  ImageListItemBar,
  responsiveFontSizes,
  TextField,
  ThemeProvider,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { observer, useLocalObservable } from "mobx-react-lite";
import React, { useState } from "react";
import FileDropZone from "./FileDropZone";
import ImagePreview from "./ImagePreview";

const theme = responsiveFontSizes(createTheme(), { factor: 3 });

interface INamedImage {
  readonly name: string;
  readonly url: string;
}

const DEFAULT_URL = "/example-star.png";

const App: React.FC = observer(() => {
  const store = useLocalObservable(() => ({
    images: [] as INamedImage[],
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
  const [textboxUrl, setTextboxUrl] = useState("");
  // const classes = useAppStyles();
  const smOrLarger = useMediaQuery(theme.breakpoints.up("sm"));

  return (
    <ThemeProvider theme={theme}>
      <FileDropZone onDrop={(file) => store.addImageFromFile(file)} imagesOnly>
        <Container>
          <Grid container direction="column" spacing={2}>
            <Grid item>
              <Typography variant="h2">Quokka Image Converter</Typography>
            </Grid>

            <Grid
              item
              sx={{
                // Hacky, but needed, otherwise the GridList breaks horizontally out of the page
                maxWidth: "calc(100vw - 32px)",
              }}
            >
              <Typography>
                Choose from a loaded image below or load another by dragging and
                dropping it onto this window or entering the URL of the image
              </Typography>
              <ImageList
                sx={{
                  flexWrap: "nowrap",
                  transform: "translateZ(0)",
                }}
                cols={smOrLarger ? 4 : 2}
                gap={2}
              >
                {store.images.map(({ name, url }, i) => (
                  <ImageListItem key={url}>
                    <img
                      src={url}
                      alt={name}
                      onClick={() => store.setActiveImageIndex(i)}
                    />
                    <ImageListItemBar
                      title={name}
                      sx={{
                        background:
                          "linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.3) 70%, rgba(0,0,0,0) 100%)",

                        "& .MuiImageListItemBar-title": {
                          color: "primary.light",
                        },
                      }}
                      actionIcon={
                        <IconButton
                          aria-label={`delete ${name}`}
                          onClick={() => store.removeImage(i)}
                        >
                          <DeleteIcon sx={{ color: "primary.light" }} />
                        </IconButton>
                      }
                    />
                  </ImageListItem>
                ))}
              </ImageList>
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
                    <Button
                      type="submit"
                      variant="contained"
                      size="medium"
                      disabled={
                        !textboxUrl ||
                        store.images.some(({ url }) => url === textboxUrl)
                      }
                    >
                      Add image
                    </Button>
                  </Grid>
                  {store.images.length === 0 && (
                    <Grid item>
                      <Button
                        variant="contained"
                        size="medium"
                        onClick={() => store.addImage(DEFAULT_URL, DEFAULT_URL)}
                      >
                        Add an example image
                      </Button>
                    </Grid>
                  )}
                </Grid>
              </form>
            </Grid>
            {store.images.length > 0 && (
              <>
                <Divider sx={{ marginTop: 2 }} />
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
