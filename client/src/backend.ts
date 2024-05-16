export const BACKEND_URL =
  window.location.href.indexOf("localhost") === -1
    ? // biome-ignore lint: dumb
      process.env.BACKEND_URL!
    : "ws://localhost:2567";

export const BACKEND_HTTP_URL = BACKEND_URL.replace("ws", "http");
