import { Box } from "@mui/material";
import React, { PropsWithChildren } from "react";

interface FileDropZoneProps {
  onDrop: (file: File) => void;
  imagesOnly?: boolean;
}

const FileDropZone: React.FC<PropsWithChildren<FileDropZoneProps>> = ({
  onDrop,
  imagesOnly,
  children,
}) => {
  return (
    <Box
      sx={{ height: "100vh", width: "100vw" }}
      onDrop={(e) => {
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
      onDragEnter={(e) => {
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = "copy";
      }}
      onDragOver={(e) => {
        e.preventDefault();
      }}
      onDragLeave={(e) => {}}
    >
      {children}
    </Box>
  );
};

export default FileDropZone;
