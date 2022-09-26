import { assume } from "@src/util/typeAssertions";
import { $ } from "@src/util/domHelpers";

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
            document.body.append(canvas);

            const context = assume(canvas.getContext("2d"));
            context.drawImage(image, 0, 0);

            let darkestX = 0;
            let darkestY = 0;
            let maxRelativeLightness = 1000;

            for (let x = 0; x < image.width; x += 1) {
                for (let y = 0; y < image.width; y += 1) {
                    const [r, g, b] = context.getImageData(x, y, 1, 1).data;
                    const highestRgb = Math.max(r, g, b);
                    const lowestRgb = Math.min(r, g, b);
                    const relativeLightness = (highestRgb + lowestRgb) / 2;
                    const isBlack = r === 0 && g === 0 && b === 0;
                    if (!isBlack && relativeLightness < maxRelativeLightness) {
                        maxRelativeLightness = relativeLightness;
                        darkestX = x;
                        darkestY = y;
                    }
                }
            }

            resolve({
                x: darkestX,
                y: darkestY,
            });
        };
    });
}
