const path = require("path");

module.exports = {
    entry: {
        homePage: path.join(__dirname, "src/homePage.ts"),
        loginPage: path.join(__dirname, "src/loginPage.ts"),
        userShop: path.join(__dirname, "src/userShop.ts"),
        employmentAgency: path.join(__dirname, "src/employmentAgency.ts"),
        gormball: path.join(__dirname, "src/gormball.ts"),
        myShopStock: path.join(__dirname, "src/myShopStock.ts"),
        npcShop: path.join(__dirname, "src/npcShop.ts"),
        shopWizard: path.join(__dirname, "src/shopWizard.ts"),
        backgroundPage: path.join(__dirname, "src/backgroundPage.ts"),
        popup: path.join(__dirname, "src/popup/index.tsx"),
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
                use: [
                    "style-loader",
                    "css-loader",
                    "postcss-loader",
                ],
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
