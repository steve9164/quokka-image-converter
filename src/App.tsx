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
import { action } from "mobx";
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
      if (this.activeImageIndex === undefined) this.setActiveImageIndex(0);
    },
    addImageFromFile(file: File) {
      this.addImage(file.name, URL.createObjectURL(file));
    },
    removeImage(index: number) {
      // revokeObjectURL is a no-op if the URL is not an object URL, and frees the object URL if it is
      URL.revokeObjectURL(this.images.splice(index, 1)[0].url);
      if (index <= this.activeImageIndex!) {
        this.setActiveImageIndex(
          this.images.length === 0 ? undefined : this.activeImageIndex! - 1
        );
      }
    },
    activeImageIndex: undefined as number | undefined,
    setActiveImageIndex(index: number | undefined) {
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
                {store.images.length > 0
                  ? "Choose an image from below or load"
                  : "Load"}{" "}
                a new image by dragging and dropping the image onto this window
                or entering the URL of the image
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
                  <ImageListItem
                    key={url}
                    onClick={action(() => store.setActiveImageIndex(i))}
                  >
                    <img src={url} alt={name} />
                    <ImageListItemBar
                      title={name}
                      sx={{
                        "& .MuiImageListItemBar-title": {
                          fontWeight: "bold",
                          color: "black",
                          textAlign: "center",
                          lineHeight: "28px",
                        },
                      }}
                      actionIcon={
                        <IconButton
                          aria-label={`delete ${name}`}
                          onClick={action(
                            (evt: React.MouseEvent<HTMLButtonElement>) => {
                              evt.stopPropagation();
                              store.removeImage(i);
                            }
                          )}
                        >
                          <DeleteIcon sx={{ color: "black" }} />
                        </IconButton>
                      }
                      position="below"
                    />
                  </ImageListItem>
                ))}
              </ImageList>
            </Grid>
            <Grid item>
              <form
                noValidate
                onSubmit={action((evt) => {
                  store.addImage(textboxUrl, textboxUrl);
                  evt.preventDefault();
                })}
              >
                <Grid container direction="row" spacing={1}>
                  <Grid item>
                    <TextField
                      label="Image URL"
                      value={textboxUrl}
                      onChange={action((evt) =>
                        setTextboxUrl(evt.target.value)
                      )}
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
                        onClick={action(() =>
                          store.addImage(DEFAULT_URL, DEFAULT_URL)
                        )}
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
                    url={store.images[store.activeImageIndex!].url}
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
