export function verifyImage(bytes: Uint8Array, type: string) {
  if (bytes.length > 5 * 1024 * 1024 || bytes.length < 16)
    throw new Error(
      "Images must be smaller than 5 MB and contain valid image data.",
    );
  const ascii = (start: number, end: number) =>
    String.fromCharCode(...bytes.slice(start, end));
  const valid =
    type === "image/jpeg"
      ? bytes[0] === 255 &&
        bytes[1] === 216 &&
        bytes[2] === 255 &&
        bytes.at(-2) === 255 &&
        bytes.at(-1) === 217
      : type === "image/png"
        ? bytes.slice(0, 8).join(",") === "137,80,78,71,13,10,26,10" &&
          ascii(12, 16) === "IHDR"
        : type === "image/webp"
          ? ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP"
          : false;
  if (!valid) throw new Error("Upload a valid JPG, PNG or WebP image.");
}
