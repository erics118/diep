import { MapSchema, Schema, type } from "@colyseus/schema";
import type { MoveMessage } from "./message";

export class Bullet extends Schema {
  @type("number") x: number;
  @type("number") y: number;
  @type("number") rotation: number;
  @type("number") health = 500;
  @type("number") velocity = 5;
}

export class Player extends Schema {
  @type("number") x: number;
  @type("number") y: number;
  @type("number") rotation = 0;
  @type("number") velocity = 2;

  @type("number") health = 5000;
  @type("boolean") isDead = false;

  @type("boolean") cheatSpeed = false;
  @type("boolean") cheatBulletSpeed = false;
  @type("boolean") cheatBulletDamage = false;
  @type("boolean") cheatInfiniteHealth = false;
  @type("boolean") cheatInvisibility = false;
  @type("boolean") cheatReload = false;

  @type({ map: Bullet }) bullets = new MapSchema<Bullet>();

  moveQueue: MoveMessage[] = [];
}

export class RoomState extends Schema {
  @type("number") mapWidth: number;
  @type("number") mapHeight: number;

  @type({ map: Player }) players = new MapSchema<Player>();
}
