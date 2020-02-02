import { Dialog, makeStyles } from "@material-ui/core";
import React from "react";

const useStyles = makeStyles({
  dropContainer: {
    height: "100vh",
    width: "100vw"
  }
});

interface FileDropZoneProps {
  onDrop: (file: File) => void;
  imagesOnly?: boolean;
}

const FileDropZone: React.FC<FileDropZoneProps> = ({
  onDrop,
  imagesOnly,
  children
}) => {
  const classes = useStyles();
  return (
    <div
      className={classes.dropContainer}
      onDrop={e => {
        e.preventDefault();
        e.stopPropagation();
        for (let i = 0; i < e.dataTransfer.files.length; i++) {
          const file = e.dataTransfer.files.item(i)!;
          if (imagesOnly && !file.type.match(/^image\//)) {
            console.log(`File ${file.name} rejected because it's not an image`);
          } else {
            onDrop(file);
          }
        }
      }}
      onDragEnter={e => {
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = "copy";
      }}
      onDragOver={e => {
        e.preventDefault();
      }}
      onDragLeave={e => {}}
    >
      {children}
    </div>
  );
};

export default FileDropZone;
