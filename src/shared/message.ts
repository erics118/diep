export enum MessageType {
  MOVE = 0,
  ROTATION = 1,
  BULLET = 2,
  HEALTH = 3,
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

export type BulletMessage = {
  cheat: boolean;
  rotation: number;
  x: number;
  y: number;
};

export type HealthMessage = {
  health: number;
};
