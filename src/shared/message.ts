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

export type BulletMessage = {
  rotation: number;
  x: number;
  y: number;
};
