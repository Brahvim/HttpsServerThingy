import mime from "mime";
import fs from "node:fs";
import url from "node:url";
import http from "node:http";
import { error } from "node:console";

const s_port = 8080;

// Separating properties is significantly faster:
// const s_serverEndpoints = await loadServerConfigJsonFile("endpoints");
// const s_serverResources = await loadServerConfigJsonFile("resources");
// console.log("[SERVER] Loaded all configuration JSON files.");

let s_requestCount = 0;

// async function loadServerConfigJsonFile(p_path) {
// 	try {
// 		const file = await fs.promises.readFile(`./config/${p_path}.json`);
// 		return JSON.parse(file);
// 	} catch (e) {
// 		console.error(`[SERVER] Failed to load JSON configuration file at \`${p_path}\`.`, e);
// 		process.exit(1);
// 	}
// }

function failRequest(p_response, p_logTag, p_statusCode, p_message) {
	const message = `\`${p_statusCode}\`! ${p_message}.`;
	p_response.writeHead(404, "Content-Type", "text/plain");
	console.error(p_logTag + message);
	p_response.end(message);
}

const s_server = http.createServer(async (p_request, p_response) => {
	const httpArgs = url.parse(p_request.url, true);
	const requestNumber = ++s_requestCount;
	const httpPath = httpArgs.pathname;

	const requestLogTag = `[REQUEST #${requestNumber}]`;
	// const mapping = s_serverResources[httpPath];

	// So, if this file exists:
	// if (mapping != undefined) {
	// const filePath = `./src/front/${mapping}`;

	fs.readFile(`./src/front/${httpPath}`, (p_error, p_data) => {
		if (p_error) {
			failRequest(p_response, requestLogTag, 404, "File not found.");
			return;
		}

		console.log(requestLogTag + "`200`. Everything went well.");
		p_response.writeHead(200, "Content-Type", mime.getType(filePath));
		p_response.end(p_data);
	});

	// return;
	// }

	// It doesn't? See if the URL lands at an API endpoint instead:
	// const endpoint = s_serverEndpoints[httpPath];

	// Not an API endpoint either? Welp!:
	if (httpPath == undefined) {
		failRequest(p_response, requestLogTag, 404, "Endpoint does not exist.");
		return;
	}

	// Otherwise, yeah, it's an API endpoint, do it's thing:
	try {
		const module = await import(`./src/back/endpoints/${httpPath}.mjs`);
		const httpMethod = httpArgs.method;

		// Get the function implementing given HTTP method from said module!:
		try {
			const method = module[httpMethod];

			// Call the function!:
			try {
				method(httpArgs, p_request, p_response);
			} // HTTP method implementation *threw up?:*
			catch (p_error) {
				failRequest(p_response, requestLogTag, 500, "Internal server error.");
				console.error(requestLogTag + p_error);
			}

		} // HTTP method doesn't exist in module?:
		catch (p_error) {
			failRequest(p_response, requestLogTag, 405, `Method \`${httpMethod}\` was not implemented.`);
			throw new Error(`Method not found in module \`${module}\`.`);
		}
	} // Module doesn't exist?!:
	catch (p_error) {
		console.error(`Module \`${module}\` not found.`, e);
		failRequest(p_response, requestLogTag, 501, "Endpoint not implemented.");
	}
});

s_server.listen(s_port, () => {
	console.log(`[SERVER] Server has started on port \`${s_port}\`.`);
});
