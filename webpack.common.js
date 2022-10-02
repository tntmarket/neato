const path = require("path");
const fs = require("fs");

const contentScripts = fs.readdirSync("./src/contentScripts").reduce(
    (entries, contentScript) => ({
        ...entries,
        [path.parse(contentScript).name]: path.join(
            __dirname,
            `src/contentScripts/${contentScript}`,
        ),
    }),
    {},
);

module.exports = {
    entry: {
        ...contentScripts,
        backgroundPage: path.join(__dirname, "src/backgroundPage.ts"),
        controlPanel: path.join(__dirname, "src/controlPanel/index.tsx"),
    },
    output: {
        path: path.join(__dirname, "dist/js"),
        filename: "[name].js",
    },
    module: {
        rules: [
            {
                exclude: /node_modules/,
                test: /\.tsx?$/,
                use: "ts-loader",
            },
            // Treat src/css/app.css as a global stylesheet
            {
                test: /\app.css$/,
                use: ["style-loader", "css-loader", "postcss-loader"],
            },
            // Load .module.css files as CSS modules
            {
                test: /\.module.css$/,
                use: [
                    "style-loader",
                    {
                        loader: "css-loader",
                        options: {
                            modules: true,
                        },
                    },
                    "postcss-loader",
                ],
            },
        ],
    },
    // Setup @src path resolution for TypeScript files
    resolve: {
        extensions: [".ts", ".tsx", ".js"],
        alias: {
            "@src": path.resolve(__dirname, "src/"),
        },
    },
};
