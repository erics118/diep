// config stuff

export const BACKEND_URL = "ws://localhost:2567";
// window.location.href.indexOf("localhost") === -1
//   ? // biome-ignore lint: dumb
//     process.env.BACKEND_URL!
//   : "ws://localhost:2567";

export const BACKEND_HTTP_URL = BACKEND_URL.replace("ws", "http");

export const MAP_SIZE = 5000;
export const MINIMAP_SIZE = 200;
export const GRID_SIZE = 20;

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
  username: "rgba(0, 0, 0, 0.5)",
  minimap: "rgba(70, 70, 70, 0.2)",
  player: {
    fill: 0x00b2e1,
    border: 0x0085a8,
  },
  turret: {
    fill: 0x999999,
    border: 0x727272,
  },
  enemy: {
    fill: 0xf14e55,
    border: 0xb43a3f,
  },
  playerBullet: 0x000099,
  background: 0xb8b8b8,
  gridLines: 0xcccccc,
  debug: {
    text: "#ff0000",
    cursor: 0xaa00aa,
    remote: 0xff0000,
    local: 0x00ff00,
  },
};
