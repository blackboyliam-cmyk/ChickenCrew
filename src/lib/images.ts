export function optimizeImage(url: string, width: number): string {
  if (!url) return url;
  if (url.includes("res.cloudinary.com") && url.includes("/upload/") && !url.includes("/upload/f_auto")) {
    return url.replace("/upload/", `/upload/f_auto,q_auto,w_${Math.round(width)},c_fill/`);
  }
  return url;
}
