module.exports = {
    content: ["./src/**/*.{html,js,tsx}", "./dist/popup.html"],
    theme: {
        extend: {},
    },
    plugins: [require("@tailwindcss/typography"), require("daisyui")],
};
