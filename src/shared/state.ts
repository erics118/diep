import { MapSchema, Schema, type } from "@colyseus/schema";
import type { MoveMessage } from "./message";

export class Player extends Schema {
  @type("number") x: number;
  @type("number") y: number;
  @type("number") rotation: number;

  moveQueue: MoveMessage[] = [];
}

export class RoomState extends Schema {
  @type("number") mapWidth: number;
  @type("number") mapHeight: number;

  @type({ map: Player }) players = new MapSchema<Player>();
}
