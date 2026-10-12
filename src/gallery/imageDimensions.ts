// SVG images without intrinsic dimensions can report zero on Three's ImageLoader.
export function fitImage(image: {
  width?: number;
  height?: number;
  naturalWidth?: number;
  naturalHeight?: number;
}) {
  const sourceWidth = image.width || image.naturalWidth || 800;
  const sourceHeight = image.height || image.naturalHeight || 1000;
  const ratio = sourceWidth / sourceHeight;
  const width = Math.min(1.88, 2.37 * ratio);
  return { width, height: width / ratio };
}
