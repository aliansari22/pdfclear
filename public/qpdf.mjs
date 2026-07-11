
import path from "./path-browserify.js";

import "./browser.js";
import "./qpdf.js";

// --- BEGIN PATCH ---
const createModuleFromExports = globalThis.exports.Module;
delete globalThis.exports;

export default function () {
  const args = arguments;
  return Promise.resolve().then(function () {
    // Instead of checking Node's process + importing "path"/"module",
    // always just fall back to the browser path
    if (globalThis.process && typeof window === "undefined") {
      // Node.js branch (won't run in browser)
      return Promise.all([import("path"), import("module")]);
    } else {
      // Browser branch
      return null;
    }
  })
  .then(function (mods) {
    if (mods) {
      // Node.js environment
      globalThis.__dirname = mods[0].dirname(import.meta.url);
      globalThis.require = mods[1].createRequire(import.meta.url);
      return require("./qpdf.js").apply(undefined, args);
    } else {
      // Browser environment
      return (createModuleFromExports || createModule).apply(undefined, args);
    }
  });
};
