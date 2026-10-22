#!/usr/bin/env bash
# Turns one photo into web-ready WebP files:
#   <out>.webp      longest edge 1600px (used on the night pages)
#   <out>-800.webp  longest edge 800px  (used in the archive, picked automatically)
#
# Usage:  scripts/optimize-image.sh <source.jpg|png|webp> <output path without extension>
# Example: scripts/optimize-image.sh ~/Desktop/IMG_4711.jpg assets/gigs/strom/05
#
# Needs macOS (sips) and cwebp (`brew install webp`). Colours are converted to sRGB
# first, so photos exported in Adobe RGB don't end up washed out, and all metadata
# (camera data, GPS) is stripped. Photos straight from a phone (JPG or HEIC) are
# turned the right way up first: phones save them sideways with a note saying
# how to turn them, and that note is part of the metadata that gets stripped.
set -euo pipefail

if [ $# -ne 2 ]; then
  echo "usage: $0 <source image> <output path without extension>" >&2
  exit 1
fi
command -v sips >/dev/null || { echo "sips not found (this script needs macOS)" >&2; exit 1; }
command -v cwebp >/dev/null || { echo "cwebp not found - install it with: brew install webp" >&2; exit 1; }

src=$1
out=$2
srgb="/System/Library/ColorSync/Profiles/sRGB Profile.icc"
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT

mkdir -p "$(dirname "$out")"

# The EXIF orientation (1 = upright, 3 = upside down, 6 / 8 = turn 90° right /
# left), read through macOS's own image library; sips can't see it.
orientation=$(osascript -l JavaScript -e 'function run(argv) {
  ObjC.import("ImageIO");
  const source = $.CGImageSourceCreateWithURL($.NSURL.fileURLWithPath(argv[0]), null);
  if (!source) return "1";
  const props = ObjC.castRefToObject($.CGImageSourceCopyPropertiesAtIndex(source, 0, null));
  const value = props.objectForKey("Orientation");
  return value.isNil() ? "1" : String(value.intValue);
}' "$(cd "$(dirname "$src")" && pwd)/$(basename "$src")" 2>/dev/null || echo 1)
case "$orientation" in
  3 | 4) turn=180 ;;
  5 | 6) turn=90 ;;
  7 | 8) turn=270 ;;
  *) turn=0 ;;
esac

# sips -Z also scales *up*, so never ask for more than the photo has.
w=$(sips -g pixelWidth "$src" | awk '/pixelWidth/{print $2}')
h=$(sips -g pixelHeight "$src" | awk '/pixelHeight/{print $2}')
longest=$(( w > h ? w : h ))

for size in 1600 800; do
  suffix=""
  [ "$size" = 800 ] && suffix="-800"
  target=$(( size < longest ? size : longest ))
  sips --matchTo "$srgb" -Z "$target" -s format jpeg -s formatOptions 95 "$src" --out "$tmp/resized.jpg" >/dev/null
  [ "$turn" != 0 ] && sips -r "$turn" "$tmp/resized.jpg" >/dev/null
  cwebp -quiet -q 80 -metadata none "$tmp/resized.jpg" -o "$out$suffix.webp"
done

echo "wrote $out.webp and $out-800.webp"
