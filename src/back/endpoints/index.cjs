exports.get = async (p_response, p_requestNumber) => {
    p_response.writeHead(200, "Content-Type", "text/html");
    p_response.end(`
<body>
Yes, it works! This is \`index.mjs\`, \`get()\`!
</body>
        `);
    console.log(`[REQUEST #${p_requestNumber}] (\`index.mjs\`, \`get()\`) \`200\`. Everything went well!...`);
}
