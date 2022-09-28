import { assume } from "@src/util/typeAssertions";
import { $ } from "@src/util/domHelpers";
import { randomPlusMinus } from "@src/util/randomDelay";

export type Coordinate = { x: number; y: number };

export function getDarkestPixel(
    captchaImage: HTMLImageElement,
): Promise<Coordinate> {
    return new Promise<Coordinate>(async (resolve) => {
        const image = new Image();
        image.src = captchaImage.src;
        image.onload = function () {
            const width = image.width;
            const height = image.height;

            const canvas = document.createElement("canvas");
            canvas.width = width;
            canvas.height = height;
            const imageBoundingBox = assume(
                $('input[type="image"]'),
            ).getBoundingClientRect();
            canvas.style.top = `${imageBoundingBox.top + 3}px`;
            canvas.style.left = `${imageBoundingBox.left + 3}px`;
            canvas.style.pointerEvents = "none";
            canvas.style.zIndex = "9999";
            canvas.style.position = "absolute";
            document.body.append(canvas);

            const context = assume(canvas.getContext("2d"));
            context.drawImage(image, 0, 0);

            const lightnessHistogram: Coordinate[][] = Array(256)
                .fill(null)
                .map(() => []);

            for (let x = 0; x < width; x += 1) {
                for (let y = 0; y < height; y += 1) {
                    const [r, g, b] = context.getImageData(x, y, 1, 1).data;
                    const highestRgb = Math.max(r, g, b);
                    const lowestRgb = Math.min(r, g, b);
                    const lightness = Math.round((highestRgb + lowestRgb) / 2);

                    context.putImageData(
                        new ImageData(
                            new Uint8ClampedArray([
                                Math.round(lightness / 2),
                                Math.round(lightness / 2),
                                Math.round(lightness / 2),
                                255,
                            ]),
                            1,
                            1,
                        ),
                        x,
                        y,
                    );

                    const isBlack = r === 0 && g === 0 && b === 0;
                    if (!isBlack) {
                        lightnessHistogram[lightness].push({ x, y });
                    }
                }
            }

            // console.log(
            //     lightnessHistogram
            //         .map((pixels, value) =>
            //             ".".repeat(Math.ceil(pixels.length / 10)),
            //         )
            //         .join("\n"),
            // );

            const darkestPixels: Coordinate[] = [];
            for (let lightness = 0; lightness < 256; lightness += 1) {
                const pixels = lightnessHistogram[lightness];
                pixels.forEach((pixel) => {
                    darkestPixels.push(pixel);
                    context.putImageData(
                        new ImageData(
                            new Uint8ClampedArray([0, 255, 255, 255]),
                            1,
                            1,
                        ),
                        pixel.x,
                        pixel.y,
                    );
                });
                if (darkestPixels.length > 250) {
                    break;
                }
            }

            const averageX = avg(darkestPixels.map((pixel) => pixel.x));
            const deviationX = deviation(
                darkestPixels.map((pixel) => pixel.x),
                averageX,
            );
            const averageY = avg(darkestPixels.map((pixel) => pixel.y));
            const deviationY = deviation(
                darkestPixels.map((pixel) => pixel.y),
                averageY,
            );

            const darkestPixelsDiscardOutliers = darkestPixels.filter(
                (pixel) => {
                    const isOutlier =
                        Math.abs(pixel.x - averageX) > deviationX ||
                        Math.abs(pixel.y - averageY) > deviationY;

                    if (isOutlier) {
                        console.log(`discarding ${pixel.x}, ${pixel.y}`);
                        context.putImageData(
                            new ImageData(
                                new Uint8ClampedArray([255, 0, 0, 255]),
                                1,
                                1,
                            ),
                            pixel.x,
                            pixel.y,
                        );
                    }

                    return !isOutlier;
                },
            );

            resolve({
                x: randomPlusMinus(
                    avg(darkestPixelsDiscardOutliers.map((pixel) => pixel.x)),
                    4,
                ),
                y: randomPlusMinus(
                    avg(darkestPixelsDiscardOutliers.map((pixel) => pixel.y)),
                    7,
                ),
            });
        };
    });
}

function avg(xs: number[]): number {
    return sum(xs) / xs.length;
}

function sum(xs: number[]): number {
    return xs.reduce((sum, x) => sum + x, 0);
}

function deviation(xs: number[], average: number): number {
    return Math.sqrt(sum(xs.map((x) => Math.pow(x - average, 2))) / xs.length);
}
