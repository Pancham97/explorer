const path = require("path");

module.exports = {
    // Match the path aliases in tsconfig.json
    "~/*": [path.resolve(__dirname, "./app/*")],
};
