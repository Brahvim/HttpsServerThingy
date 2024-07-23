const FS = require("fs");
const URL = require("url");
const HTTPS = require("https");

// MJS-style imports:
// import * as fs from "node:fs";
// import * as http from "node:http";
// import * as path from "node:path";

let REQUEST_COUNT = 0;
let SERVER_ENDPOINTS = null;
let SERVER_RESOURCES = null;

function loadServerConfigJsonFile() {

}

try {
    const [file1, file2] = await Promise.all([
        fs.readFile("./config.json"),
        fs.readFile("./resources.json")
    ]);
} catch (error) {
}

console.log("[SERVER] Loaded all configuration files.");

HTTPS.createServer((p_request, p_response) => {
    const httpArgs = URL.parse(p_request.url, true);
    const requestNumber = ++REQUEST_COUNT;
    const filePath = httpArgs.pathname;

    function logRequest() {

    }

    FS.readFile(filePath, (p_error, p_data) => {
        if (p_error) {
            logRequest();
            return;
        }

        p_response.writeHead(200, { "Content-Type": "text/html" });
        p_response.writeHead(200, { "Content-Type": "text/html" });
    });

    label:
    return p_response.end();
});
