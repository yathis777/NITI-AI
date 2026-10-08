const fs = require("fs");
const path = require("path");

const projectRoot = path.resolve(__dirname, "..");
const source = path.join(projectRoot, "data", "creators.csv");
const destination = path.join(projectRoot, "public", "data", "creators.csv");

fs.mkdirSync(path.dirname(destination), { recursive: true });
fs.copyFileSync(source, destination);
console.log("Synchronized data/creators.csv to public/data/creators.csv for static hosting.");
