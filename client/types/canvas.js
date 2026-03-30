import { Rectangle } from "@mui/icons-material";
import { Pencil } from "lucide-react";

export const CanvasMode = {
  None: "none",
  Pressing: "pressing",
  SelectionNet: "selection-net",
  Translating: "translating",
  Inserting: "inserting",
  Resizing: "resizing",
  Pencil: "pencil",
};

export const DefaultStyle = {
  fill: "transparent",
  stroke: "#000000",
  strokeWidth: 1,
  textColor: "#000000",
  fontSize: 20,
  opacity: 1,
};

export const Camera = {
  x: 0,
  y: 0,
};

export const LayerType = {
  Rectangle: "rectangle",
  Ellipse: "ellipse",
  Path: "path",
  Text: "text",
  Note: "note",
  AutoText :"AUTO_TEXT",
};



export const AutoTextLayer = {
  type: "AUTO_TEXT",
  x: 0,
  y: 0,
  width: 100,
  height: 40,
  value: "",
  style: {
    textColor: "#000000",
    fontSize: 18,
    opacity: 1,
  },
};


export const RectangleLayer = Object.freeze({
  type: LayerType.Rectangle,
  x: 0,
  y: 0,
  height: 80,
  width: 120,
  value: "",
  style: {
    fill: "transparent",
    stroke: "#000000",
    strokeWidth: 3,
  },
});
export const EllipseLayer = Object.freeze({
  type: LayerType.Ellipse,
  x: 0,
  y: 0,
  height: 120,
  width: 120,
  value: "",
  style: {
    fill: "transparent",
    stroke: "#000000",
    strokeWidth: 3,
  },
});

export const PathLayer = Object.freeze({
  type: LayerType.Path,
  x: 0,
  y: 0,
  height: 80,
  width: 120,
  points: [],
  style: {
    stroke: "#000000",
    strokeWidth: 1,
  },
  value: "",
});

export const TextLayer = Object.freeze({
  type: LayerType.Text,
  x: 0,
  y: 0,
  height: 80,
  width: 120,
  value: "Type something",
  style: {
    textColor: "#000000",
    fontSize: 28,
  },
  isNew: true,
});

export const NoteLayer = {
  type: LayerType.Note,
  x: 0,
  y: 0,
  height: 160,
  width: 220,
  style: {
    fill: "#FFF59D",
    textColor: "#000000",
    fontSize: 20,
  },
  value: "",
};


export const Point = {
  x: 0,
  y: 0,
};

export const XYWH = {
  x: 0,
  y: 0,
  width: 0,
  height: 0,
};

export const Side = {
  Top: 1,
  Bottom: 2,
  Left: 4,
  Right: 8,
};



export const Layer =
  RectangleLayer | EllipseLayer | PathLayer | TextLayer | NoteLayer;
