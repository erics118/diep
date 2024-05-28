// config stuff

export const BACKEND_URL = "ws://localhost:2567";
// window.location.href.indexOf("localhost") === -1
//   ? // biome-ignore lint: dumb
//     process.env.BACKEND_URL!
//   : "ws://localhost:2567";

export const BACKEND_HTTP_URL = BACKEND_URL.replace("ws", "http");

export const MAP_SIZE = 5000;
export const MINIMAP_SIZE = 200;

export const DEBUG = true;

export class Color {
  value: number;
  constructor(value: number) {
    this.value = value;
  }
  asText() {
    return `#${this.value.toString(16)}`;
  }
  valueOf(): number {
    return this.value;
  }
}

export const colors = {
  player: 0x0000ff,
  playerBullet: 0x000099,
  background: 0xb8b8b8,
  gridLines: 0xcccccc,
  debug: {
    text: 0xff0000,
    cursor: 0xaa00aa,
    remote: 0xff0000,
    local: 0x00ff00,
  },
};
