export type CropAspectPreset = {
  id: string;
  label: string;
  aspect: number | null;
  outputWidth?: number;
  outputHeight?: number;
};

export type PixelCrop = {
  x: number;
  y: number;
  width: number;
  height: number;
};
