import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

function crc32(buffer) {
  let crc = 0xffffffff;

  for (let index = 0; index < buffer.length; index += 1) {
    crc ^= buffer[index];

    for (let bit = 0; bit < 8; bit += 1) {
      const mask = -(crc & 1);
      crc = (crc >>> 1) ^ (0xedb88320 & mask);
    }
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function createChunk(type, data) {
  const typeBuffer = Buffer.from(type, "ascii");
  const lengthBuffer = Buffer.alloc(4);
  lengthBuffer.writeUInt32BE(data.length, 0);

  const crcBuffer = Buffer.alloc(4);
  crcBuffer.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);

  return Buffer.concat([lengthBuffer, typeBuffer, data, crcBuffer]);
}

function encodePng(width, height, pixelBuffer) {
  const signature = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  ]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;

  const stride = width * 4;
  const rawRows = Buffer.alloc((stride + 1) * height);

  for (let row = 0; row < height; row += 1) {
    const targetOffset = row * (stride + 1);
    rawRows[targetOffset] = 0;
    pixelBuffer.copy(
      rawRows,
      targetOffset + 1,
      row * stride,
      row * stride + stride,
    );
  }

  const compressedData = zlib.deflateSync(rawRows, {
    level: 9,
  });

  return Buffer.concat([
    signature,
    createChunk("IHDR", ihdr),
    createChunk("IDAT", compressedData),
    createChunk("IEND", Buffer.alloc(0)),
  ]);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function hexToRgb(hexColor) {
  const normalizedColor = hexColor.replace("#", "");

  return {
    blue: Number.parseInt(normalizedColor.slice(4, 6), 16),
    green: Number.parseInt(normalizedColor.slice(2, 4), 16),
    red: Number.parseInt(normalizedColor.slice(0, 2), 16),
  };
}

function mixColor(startColor, endColor, ratio) {
  return {
    blue: Math.round(startColor.blue + (endColor.blue - startColor.blue) * ratio),
    green: Math.round(
      startColor.green + (endColor.green - startColor.green) * ratio,
    ),
    red: Math.round(startColor.red + (endColor.red - startColor.red) * ratio),
  };
}

function alphaBlend(destination, source) {
  const sourceAlpha = source.alpha / 255;
  const destinationAlpha = destination.alpha / 255;
  const outputAlpha = sourceAlpha + destinationAlpha * (1 - sourceAlpha);

  if (outputAlpha === 0) {
    return {
      alpha: 0,
      blue: 0,
      green: 0,
      red: 0,
    };
  }

  return {
    alpha: Math.round(outputAlpha * 255),
    blue: Math.round(
      (source.blue * sourceAlpha +
        destination.blue * destinationAlpha * (1 - sourceAlpha)) /
        outputAlpha,
    ),
    green: Math.round(
      (source.green * sourceAlpha +
        destination.green * destinationAlpha * (1 - sourceAlpha)) /
        outputAlpha,
    ),
    red: Math.round(
      (source.red * sourceAlpha +
        destination.red * destinationAlpha * (1 - sourceAlpha)) /
        outputAlpha,
    ),
  };
}

function createCanvas(size) {
  const pixels = Buffer.alloc(size * size * 4);

  function setPixel(x, y, color) {
    if (x < 0 || y < 0 || x >= size || y >= size) {
      return;
    }

    const pixelIndex = (y * size + x) * 4;
    const currentColor = {
      alpha: pixels[pixelIndex + 3] ?? 0,
      blue: pixels[pixelIndex + 2] ?? 0,
      green: pixels[pixelIndex + 1] ?? 0,
      red: pixels[pixelIndex] ?? 0,
    };
    const blendedColor = alphaBlend(currentColor, color);

    pixels[pixelIndex] = blendedColor.red;
    pixels[pixelIndex + 1] = blendedColor.green;
    pixels[pixelIndex + 2] = blendedColor.blue;
    pixels[pixelIndex + 3] = blendedColor.alpha;
  }

  return {
    pixels,
    setPixel,
    size,
  };
}

function drawRoundedBackground(canvas) {
  const backgroundColor = hexToRgb("#f6f1e7");
  const borderColor = hexToRgb("#e2d7c6");
  const center = canvas.size / 2;
  const radius = canvas.size * 0.19;

  for (let y = 0; y < canvas.size; y += 1) {
    for (let x = 0; x < canvas.size; x += 1) {
      const dx = Math.max(Math.abs(x - center) - (canvas.size / 2 - radius), 0);
      const dy = Math.max(Math.abs(y - center) - (canvas.size / 2 - radius), 0);
      const distance = Math.hypot(dx, dy);

      if (distance > radius) {
        continue;
      }

      const edgeDistance = radius - distance;
      const alpha = clamp(Math.round(edgeDistance * 255), 0, 255);
      const verticalRatio = y / canvas.size;
      const baseColor = mixColor(
        backgroundColor,
        hexToRgb("#efe4d3"),
        clamp(verticalRatio * 0.7, 0, 1),
      );
      const finalColor =
        edgeDistance < 2
          ? mixColor(borderColor, baseColor, clamp(edgeDistance / 2, 0, 1))
          : baseColor;

      canvas.setPixel(x, y, {
        alpha,
        ...finalColor,
      });
    }
  }
}

function drawCoin(canvas, options) {
  const startColor = hexToRgb(options.startColor);
  const endColor = hexToRgb(options.endColor);
  const highlightColor = hexToRgb("#fff8ef");
  const shadowColor = hexToRgb("#7c4d1f");

  for (let y = 0; y < canvas.size; y += 1) {
    for (let x = 0; x < canvas.size; x += 1) {
      const normalizedX = x + 0.5 - options.centerX;
      const normalizedY = y + 0.5 - options.centerY;
      const distance = Math.hypot(normalizedX, normalizedY);

      if (distance > options.radius) {
        continue;
      }

      const ratio = clamp(distance / options.radius, 0, 1);
      const gradientRatio = clamp(
        (normalizedX / options.radius + normalizedY / options.radius + 2) / 4,
        0,
        1,
      );
      const baseColor = mixColor(startColor, endColor, gradientRatio);
      const ringColor =
        ratio > 0.82
          ? mixColor(baseColor, shadowColor, clamp((ratio - 0.82) / 0.18, 0, 1))
          : baseColor;

      canvas.setPixel(x, y, {
        alpha: 255,
        ...ringColor,
      });

      const highlightDistance = Math.hypot(
        x + 0.5 - (options.centerX - options.radius * 0.35),
        y + 0.5 - (options.centerY - options.radius * 0.35),
      );

      if (highlightDistance < options.radius * 0.38) {
        canvas.setPixel(x, y, {
          alpha: Math.round(
            clamp(1 - highlightDistance / (options.radius * 0.38), 0, 1) * 110,
          ),
          ...highlightColor,
        });
      }
    }
  }
}

function drawAccentStroke(canvas, sizeMultiplier) {
  const strokeColor = hexToRgb("#fff8ef");
  const centerX = canvas.size * 0.46;
  const centerY = canvas.size * 0.46;
  const radius = canvas.size * 0.14 * sizeMultiplier;
  const strokeWidth = canvas.size * 0.018 * sizeMultiplier;

  for (let y = 0; y < canvas.size; y += 1) {
    for (let x = 0; x < canvas.size; x += 1) {
      const dx = x + 0.5 - centerX;
      const dy = y + 0.5 - centerY;
      const distance = Math.hypot(dx * 0.84, dy);

      if (distance < radius - strokeWidth || distance > radius + strokeWidth) {
        continue;
      }

      if (dx > radius * 0.35) {
        continue;
      }

      canvas.setPixel(x, y, {
        alpha: 225,
        ...strokeColor,
      });
    }
  }

  const verticalBarWidth = Math.max(2, Math.round(canvas.size * 0.026 * sizeMultiplier));
  const verticalBarHeight = canvas.size * 0.23 * sizeMultiplier;

  for (
    let y = Math.round(centerY - verticalBarHeight / 2);
    y <= Math.round(centerY + verticalBarHeight / 2);
    y += 1
  ) {
    for (
      let x = Math.round(centerX - verticalBarWidth / 2);
      x <= Math.round(centerX + verticalBarWidth / 2);
      x += 1
    ) {
      canvas.setPixel(x, y, {
        alpha: 225,
        ...strokeColor,
      });
    }
  }
}

function createIconPng(size, options = {}) {
  const canvas = createCanvas(size);
  const insetMultiplier = options.maskable ? 0.82 : 1;

  drawRoundedBackground(canvas);
  drawCoin(canvas, {
    centerX: size * 0.37,
    centerY: size * 0.42,
    endColor: "#a76222",
    radius: size * 0.235 * insetMultiplier,
    startColor: "#f6c77b",
  });
  drawCoin(canvas, {
    centerX: size * 0.63,
    centerY: size * 0.58,
    endColor: "#b57a46",
    radius: size * 0.235 * insetMultiplier,
    startColor: "#f0d4b2",
  });
  drawAccentStroke(canvas, insetMultiplier);

  return encodePng(size, size, canvas.pixels);
}

const outputDirectory = path.join(process.cwd(), "public", "pwa");

fs.mkdirSync(outputDirectory, {
  recursive: true,
});

const icons = [
  {
    fileName: "apple-touch-icon.png",
    size: 180,
  },
  {
    fileName: "icon-192.png",
    size: 192,
  },
  {
    fileName: "icon-512.png",
    size: 512,
  },
  {
    fileName: "icon-maskable-512.png",
    maskable: true,
    size: 512,
  },
];

for (const icon of icons) {
  fs.writeFileSync(
    path.join(outputDirectory, icon.fileName),
    createIconPng(icon.size, {
      maskable: icon.maskable ?? false,
    }),
  );
}

console.log(`Generated ${icons.length} PWA icons in ${outputDirectory}.`);
