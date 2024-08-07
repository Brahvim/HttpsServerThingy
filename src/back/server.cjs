//#region Imports.
// EJS modules:
const mime = import("mime");

// CommonJS modules:
const fs = require("node:fs");
const url = require("node:url");
const http = require("node:http");
//#endregion 

const s_port = 8080;
const s_server = http.createServer(async (p_request, p_response) => {
	const requestNumber = ++s_requestCount;
	const httpArgs = url.parse(p_request.url, true);
	const requestLogTag = `[REQUEST #${requestNumber}] `;
	const httpPath = httpArgs.pathname == "/" ? "index" : httpArgs.pathname;

	function failRequest(p_statusCode, p_message) {
		const message = `\`${p_statusCode}\`! ${p_message}`;
		p_response.writeHead(404, "Content-Type", "text/html");
		console.error(requestLogTag + message);
		p_response.end(
			`
<body>
	<pre 
	style="font-size: xx-large; font-family: 'Trebuchet MS', 'Lucida Sans Unicode', 'Lucida Grande', 'Lucida Sans', Arial, sans-serif;
	top: 50%; left: 50%; position: absolute; transform: translate(-50%, -50%); text-align: center;">
	${message}
	<a href="/">Click here to go to the home page.</a>
	</pre>
</body>
					`);
	}

	try {
		const module = loadEndpointModule(httpPath);

		// Get the function implementing given HTTP method from said module!:
		try {
			const methodName = p_request.method.toLowerCase();
			const methodImpl = module[methodName];

			// Call the function! (...and then move on to the next request):
			if (methodImpl.constructor.name === "AsyncFunction") {
				(async () => {
					try {
						markModuleAsUsed(module); // SHORTEN the critical section as much as possible!
						await methodImpl(p_response, requestNumber, httpArgs, p_request);
					} // HTTP method implementation *threw up?:*
					catch (p_error) {
						failRequest(500, "Internal Server Error.");
					} finally {
						markModuleAsUnused(module);
					}
				})();
			} else {
				try {
					markModuleAsUsed(module); // SHORTEN the critical section as much as possible!
					methodImpl(p_response, requestNumber, httpArgs, p_request);
				} // HTTP method implementation *threw up?:*
				catch (p_error) {
					failRequest(500, "Internal Server Error.");
				}
				finally {
					markModuleAsUnused(module);
				}
			}

			return; // This'll move us to the next request.
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
const s_moduleLocks = new Map();
const s_endpointsDir = "./src/back/endpoints/";
const s_endpointsPaths = fs.readdirSync(s_endpointsDir).filter(p_fileName => p_fileName.includes("js"));
const s_endpointsWatcher = fs.watch(s_endpointsDir, (p_event, p_fileName) => {
	// Simultaneously extract the filename without the extension and check if it is a `.cjs` file:
	const dotId = p_fileName.lastIndexOf(".");
	const fileExt = p_fileName.substring(dotId + 1);

	if (!(fileExt == "cjs" || fileExt === "js"))
		return;

	const fileNameNoExt = p_fileName.substring(0, dotId);
	while (isModuleUsed[fileNameNoExt]);
	markModuleAsUsed(fileNameNoExt);

	if (p_event == "change") {
		console.log(`[WATCHER] File \`${p_fileName}\` was changed.`);

		// Time to re-import!:
		delete require.cache[require.resolve("./endpoints/" + p_fileName)];
		(async () => import("./endpoints/" + p_fileName))();

		markModuleAsUnused(fileNameNoExt);
		return;
	}

	const fileExists = fs.existsSync(s_endpointsDir + p_fileName);
	const id = s_endpointsPaths.findIndex(p_toFind => p_toFind == p_fileName);

	// If we don't already have the file and it exists, add it:
	if (id == -1 && fileExists) {
		(async () => import("./endpoints/" + p_fileName))();
		s_endpointsPaths.push(p_fileName);
		console.log(`[WATCHER] File \`${p_fileName}\` was added.`);
	} else {
		delete require.cache[require.resolve("./endpoints/" + p_fileName)];
		s_endpointsPaths.splice(id, 1);
		console.log(`[WATCHER] File \`${p_fileName}\` was removed.`);
	}

	markModuleAsUnused(fileNameNoExt);
});

let s_requestCount = 0;

// #region Module lock modification functions.
function markModuleAsUnused(p_moduleName) {
	s_moduleLocks.set(p_moduleName, false);
}

function markModuleAsUsed(p_moduleName) {
	s_moduleLocks.set(p_moduleName, true);
}

function isModuleUsed(p_moduleName) {
	return s_moduleLocks.get(p_moduleName) || false;
}
// #endregion

function loadEndpointModule(p_endpointName) {
	const error = () => console.log(
		`[SERVER] Module "\`${p_endpointName}\`" doesn't exist in any supported formats (\`.cjs\`, \`.js\`).`
	);

	// Try loading the file with the `.js` extension:
	try {
		return require(`./endpoints/${p_endpointName}.js`);
	} // Try loading the file with the `.cjs` extension:
	catch (p_error1) {
		if (p_error1.code !== "MODULE_NOT_FOUND")
			return undefined;

		try {
			return require(`./endpoints/${p_endpointName}.cjs`);
		} catch {
			error();
			return undefined;
		}
	}
}

function shutdown() {
	console.log();
	console.log(`[SERVER] Server has fully informed of its stop.`);
	process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

s_server.listen(s_port, async () => {
	console.log(`[SERVER] Found modules \`${s_endpointsPaths.toString()}\`.`);

	const loadedModules = [];
	for (const modulePath of s_endpointsPaths) {
		import("./endpoints/" + modulePath);
		loadedModules.push(modulePath);
	}

	console.log(`[SERVER] Loaded modules: \`${loadedModules.toString()}\`.`);
	console.log(`[SERVER] Server has started on URL \`https://localhost:${s_port}\`.`);
});
