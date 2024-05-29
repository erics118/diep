import { MapSchema, Schema, type } from "@colyseus/schema";
import type Phaser from "phaser";

export enum MessageType {
  MOVE = 0,
  ROTATION = 1,
  BULLET = 2,
}

export type MoveMessage = {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
};

export type RotateMessage = {
  rotation: number;
};

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

export type Keys = {
  up: Phaser.Input.Keyboard.Key;
  down: Phaser.Input.Keyboard.Key;
  left: Phaser.Input.Keyboard.Key;
  right: Phaser.Input.Keyboard.Key;
  w: Phaser.Input.Keyboard.Key;
  a: Phaser.Input.Keyboard.Key;
  s: Phaser.Input.Keyboard.Key;
  d: Phaser.Input.Keyboard.Key;
  space: Phaser.Input.Keyboard.Key;
};

export type Bullet = {
  body: Phaser.Types.Physics.Arcade.ImageWithDynamicBody;
  health: number;
  angle: number;
  speed: number;
};
