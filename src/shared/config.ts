// config stuff

export const BACKEND_URL = `ws://192.168.68.111:2567`;
// window.location.href.indexOf("localhost") === -1
//   ? // biome-ignore lint: dumb
//     process.env.BACKEND_URL!
//   : "ws://localhost:2567";

export const BACKEND_HTTP_URL = BACKEND_URL.replace("ws", "http");

export const MAP_SIZE = 5000;
export const MINIMAP_SIZE = 140;
export const GRID_SIZE = 20;
