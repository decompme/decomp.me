import client from "./out/index.js"

const resp = await client.get("/compilers", {})
console.log(resp)
