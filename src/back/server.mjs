import mime from "mime";
import fs from "node:fs";
import url from "node:url";
import http from "node:http";

const s_port = 8080;
const s_endpointImplsIndex = fs.readdirSync("./src/back/endpoints")
	.filter(p_fileName => p_fileName.endsWith(".mjs"));
const s_endpointsDirWatch = fs.watch("./src/back/endpoints", (p_event, p_fileName) => {
	if (!p_fileName.endsWith(".mjs") || p_event != "rename")
		return;

	const id = s_endpointImplsIndex.findIndex(p_toFind => p_toFind == p_fileName);

	if (id == -1) {
		s_endpointImplsIndex.push(p_fileName);
		console.log(`[WATCHER] File \`${p_fileName}\` was added.`);
	} else {
		s_endpointImplsIndex.splice(id, 1);
		console.log(`[WATCHER] File \`${p_fileName}\` was removed.`);
	}
});

let s_requestCount = 0;

process.on("exit", () => {
	fs.unwatchFile(s_endpointsDirWatch);
	console.log(`[SERVER] Server has stopped.`);
});

const s_server = http.createServer(async (p_request, p_response) => {
	const httpArgs = url.parse(p_request.url, true);
	const requestNumber = ++s_requestCount;
	const httpPath = httpArgs.pathname;

	const requestLogTag = `[REQUEST #${requestNumber}] `;

	function failRequest(p_statusCode, p_message) {
		const message = `\`${p_statusCode}\`! ${p_message}`;
		p_response.writeHead(404, "Content-Type", "text/html");
		console.error(requestLogTag + message);
		p_response.end(
			`
<body>
<pre style="display: flex; align-items: center; text-align: center;">
${message}
<a href="/">Click here to go to the home page.</a>
</pre>
</body>
`
		);
	}

	try {
		const module = await import(`./src/back/endpoints/${httpPath}.mjs`);

		// Get the function implementing given HTTP method from said module!:
		try {
			const methodImpl = module[httpArgs.method];

			// Call the function!:
			try {
				methodImpl(requestNumber, httpArgs, p_request, p_response);
			} // HTTP method implementation *threw up?:*
			catch (p_error) {
				failRequest(500, "Internal Server Error.");
			}

		} // HTTP method doesn't exist in module?:
		catch (p_error) {
			failRequest(405, `Method \`${httpMethod}\` Not Allowed.`);
			// Let's not crash, okay!?
			// throw new Error(`Method not found in module \`${module}\`.`);
		}
	} // Module doesn't exist?!:
	catch (p_error) {
		// console.error(`Module \`${module}\` not found.`, e);
		// failRequest(501, "Endpoint Not Implemented.");

		fs.readFile(`./src/front/${httpPath}`, (p_error, p_data) => {
			if (p_error) {
				failRequest(404, "File not found.");
				return;
			}

			console.log(requestLogTag + "`200`. Everything went well!...");
			p_response.writeHead(200, "Content-Type", mime.getType(filePath));
			p_response.end(p_data);
		});
	}
});

s_server.listen(s_port, () => {
	console.log(`[SERVER] Loaded modules: \`{}\`.`);
	console.log(`[SERVER] Server has started on URL \`https://localhost:${s_port}\`.`);
});
