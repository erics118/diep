import { MapSchema, Schema, type } from "@colyseus/schema";
import type Phaser from "phaser";

export interface InputData {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  rotation: number;
  tick: number;
}

export class Player extends Schema {
  @type("number") x: number;
  @type("number") y: number;
  @type("number") rotation: number;
  @type("number") tick: number;

  inputQueue: InputData[] = [];
}

export class MyRoomState extends Schema {
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
