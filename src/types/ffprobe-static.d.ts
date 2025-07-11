declare module "ffprobe-static" {
  interface FfprobeStatic {
    path: string;
  }

  const ffprobe: FfprobeStatic;
  export = ffprobe;
}
