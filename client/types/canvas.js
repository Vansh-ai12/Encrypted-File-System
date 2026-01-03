import { Rectangle } from "@mui/icons-material";
import { Pencil } from "lucide-react";






export const CanvasMode = {
  None: "none",
  Pressing: "pressing",
  SelectionNet: "selection-net",
  Translating : "translating",
  Inserting: "inserting",
  Resizing: "resizing",
  Pencil: "pencil",
};


export const Color = {
  r: 0,
  g: 0,
  b: 0,
};

export const Camera = {
    x:0,
    y:0
};

export const LayerType = {
    Rectangle: "rectangle",
    Ellipse: "ellipse",
    Path: "path",
    Text: "text",
    Note: "note",
};

export const RectangleLayer =Object.freeze({
    type: LayerType.Rectangle,
    x:0,
    y:0,
    height:80,
    width:120,
    fill:Color,
    value:"",
});
export const EllipseLayer =Object.freeze({
    type: LayerType.Ellipse,
    x:0,
    y:0,
    height:120,
    width:120,
    fill:Color,
    value:"",
});


export const PathLayer = Object.freeze({
    type: LayerType.Path,
    x:0,
    y:0,
    height:80,
    width:120,
    fill:Color,
    points:[],
    value:"",
});

export const TextLayer =Object.freeze( {
    type: LayerType.Text,
    x:0,
    y:0,
    height:80,
    width:120,
    fill:Color,
    value:"",
});


export const NoteLayer = {
    type: LayerType.Note,
    x:0,
    y:0,
    height:0,
    width:0,
    fill:Color,
    value:"",
};


export const Point = {
    x:0,
    y:0,
}

export const XYWH = {
    x:0,
    y:0,
    width:0,
    height:0

};


export const Side = {
  Top: 1,
  Bottom: 2,
  Left: 4,
  Right: 8,
};



export const Layer = RectangleLayer | EllipseLayer | PathLayer | TextLayer | NoteLayer;



