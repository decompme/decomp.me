// Turbopack evaluates webpack loaders with a process.env descriptor that trips
// debug, which SVGR loads via cosmiconfig, on Node 24. Keep this wrapper until
// Next/Turbopack or SVGR no longer needs the env descriptor normalized here.
Object.defineProperty(process, "env", {
    value: { ...process.env },
    writable: true,
    configurable: true,
    enumerable: true,
});

module.exports = require("@svgr/webpack");
