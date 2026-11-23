"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var screen_exports = {};
__export(screen_exports, {
  SCREEN_KINDS: () => SCREEN_KINDS,
  errorText: () => errorText,
  matchScreen: () => matchScreen,
  showApp: () => showApp
});
module.exports = __toCommonJS(screen_exports);
const SCREEN_KINDS = ["text"];
const CATALOG_KINDS = ["image", "url", "camera", "chart", "text", "view", "place", "qr"];
const CATALOG_FIELDS = ["kind", "screen", "room", "seconds", "severity", "title"];
const SEVERITY_COLORS = { warning: "#FFFF00", alert: "#FF0000" };
function showApp(message, screen) {
  const kind = typeof message.kind === "string" ? message.kind.trim() : "";
  if (!kind) {
    return { error: { error: "kind missing: text", reason: "BAD_REQUEST" } };
  }
  if (kind !== "text") {
    return {
      error: {
        error: CATALOG_KINDS.includes(kind) ? `the clock cannot show the kind "${kind}", only text` : `unknown kind "${kind}": text`,
        reason: "NOT_SUPPORTED"
      }
    };
  }
  const failure = matchScreen(message, screen);
  if (failure) {
    return { error: failure };
  }
  const text = typeof message.text === "string" ? message.text.trim() : "";
  if (!text) {
    return { error: { error: "text missing", reason: "BAD_REQUEST" } };
  }
  const app = Object.fromEntries(
    Object.entries(message).filter(([key, v]) => v !== null && !CATALOG_FIELDS.includes(key))
  );
  const title = typeof message.title === "string" ? message.title.trim() : "";
  app.text = title ? `${title}: ${text}` : text;
  if (message.severity !== void 0) {
    const severity = String(message.severity);
    if (!["info", "warning", "alert"].includes(severity)) {
      return {
        error: { error: `unknown severity "${severity}": info, warning or alert`, reason: "BAD_REQUEST" }
      };
    }
    if (SEVERITY_COLORS[severity] && app.color === void 0) {
      app.color = SEVERITY_COLORS[severity];
    }
    if (severity === "alert" && app.wakeup === void 0) {
      app.wakeup = true;
    }
  }
  if (message.seconds !== void 0 && message.seconds !== null && message.seconds !== "") {
    const seconds = Number(message.seconds);
    if (!Number.isFinite(seconds) || seconds < 0) {
      return { error: { error: "seconds must be 0 or more", reason: "BAD_REQUEST" } };
    }
    if (seconds === 0) {
      app.hold = true;
    } else {
      app.duration = seconds;
    }
  }
  if (app.repeat !== void 0 && app.repeat <= 0) {
    delete app.repeat;
  }
  if (app.duration !== void 0 && app.duration <= 0) {
    delete app.duration;
  }
  return { app };
}
function matchScreen(message, screen) {
  const wanted = typeof message.screen === "string" ? message.screen.trim().toLowerCase() : "";
  if (wanted) {
    return wanted === screen.id.toLowerCase() || wanted === screen.name.toLowerCase() ? null : { error: `no clock "${message.screen}" in ${screen.id}`, reason: "NOT_FOUND", candidates: [screen.name] };
  }
  if (typeof message.room === "string" && message.room.trim()) {
    return {
      error: "the clock has no room: give screen (see getScreens)",
      reason: "NOT_SUPPORTED",
      candidates: [screen.name]
    };
  }
  return null;
}
function errorText(error) {
  return error instanceof Error ? error.message : String(error);
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  SCREEN_KINDS,
  errorText,
  matchScreen,
  showApp
});
//# sourceMappingURL=screen.js.map
