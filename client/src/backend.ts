//  biome-ignore lint: dumb
export const BACKEND_URL = process.env.BACKEND_URL ?? "ws://192.168.68.111:2567"
// window.location.href.indexOf("localhost") === -1
//   ? // biome-ignore lint: dumb
//     process.env.BACKEND_URL!
//   : "ws://localhost:2567";

export const BACKEND_HTTP_URL = BACKEND_URL.replace("ws", "http");
