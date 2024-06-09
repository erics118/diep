import { ArraySchema, MapSchema, Schema, type } from "@colyseus/schema";
import type { MoveMessage } from "./message";

export class Bullet extends Schema {
  @type("number") x: number;
  @type("number") y: number;
  @type("number") rotation: number;
  @type("boolean") drawn = false;
  @type("number") health = 500;
}

export class Player extends Schema {
  @type("number") x: number;
  @type("number") y: number;
  @type("number") rotation = 0;

  @type([Bullet]) bullets = new ArraySchema<Bullet>();
  @type("number") health = 5000;

  // bullets: Bullet[] = [];

  moveQueue: MoveMessage[] = [];
}

export class RoomState extends Schema {
  @type("number") mapWidth: number;
  @type("number") mapHeight: number;

  @type({ map: Player }) players = new MapSchema<Player>();
}
