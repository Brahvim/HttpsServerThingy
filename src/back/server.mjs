import mime from "mime";
import fs from "node:fs";
import url from "node:url";
import http from "node:http";

const s_port = 8080;
const s_endpoints = loadServerConfigJsonFile();
let s_requestCount = 0;

function failRequest(p_response, p_logTag, p_statusCode, p_message) {
	const message = `\`${p_statusCode}\`! ${p_message}`;
	p_response.writeHead(404, "Content-Type", "text/plain");
	console.error(p_logTag + message);
	p_response.end(message);
}

function loadServerConfigJsonFile(p_fileNameNoExt) {
	try {
		const path = `./config/${p_fileNameNoExt}.json`;
		const file = fs.readFileSync(path);
		return JSON.parse(file);
	} catch (e) {
		console.error(`[SERVER] Failed to load JSON configuration file at \`${p_path}\`.`, e);
		process.exit(1);
	}
}

const s_server = http.createServer(async (p_request, p_response) => {
	const httpArgs = url.parse(p_request.url, true);
	const requestNumber = ++s_requestCount;
	const httpPath = httpArgs.pathname;

	const requestLogTag = `[REQUEST #${requestNumber}] `;

	fs.readFile(`./src/front/${httpPath}`, (p_error, p_data) => {
		if (p_error) {
			failRequest(p_response, requestLogTag, 404, "File not found.");
			return;
		}

		console.log(requestLogTag + "`200`. Everything went well!...");
		p_response.writeHead(200, "Content-Type", mime.getType(filePath));
		p_response.end(p_data);
	});

	try {
		const module = await import(`./src/back/endpoints/${httpPath}.mjs`);
		const httpMethod = httpArgs.method;

		// Get the function implementing given HTTP method from said module!:
		try {
			const methodImpl = module[httpMethod];

			// Call the function!:
			try {
				methodImpl(requestNumber, httpArgs, p_request, p_response);
			} // HTTP method implementation *threw up?:*
			catch (p_error) {
				failRequest(p_response, requestLogTag, 500, "Internal Server Error.");
				console.error(requestLogTag + p_error);
			}

		} // HTTP method doesn't exist in module?:
		catch (p_error) {
			failRequest(p_response, requestLogTag, 405, `Method \`${httpMethod}\` Not Allowed.`);
			throw new Error(`Method not found in module \`${module}\`.`);
		}
	} // Module doesn't exist?!:
	catch (p_error) {
		console.error(`Module \`${module}\` not found.`, e);
		failRequest(p_response, requestLogTag, 501, "Endpoint Not Implemented.");
	}
});

s_server.listen(s_port, () => {
	console.log(`[SERVER] Server has started on URL \`https://localhost:${s_port}\`.`)
});
