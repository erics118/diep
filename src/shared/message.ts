export enum MessageType {
  MOVE = 0,
  ROTATION = 1,
  BULLET = 2,
  CHEAT = 3,
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

export type CheatMessage = {
  speed?: boolean;
  bulletSpeed?: boolean;
  bulletDamage?: boolean;
  infiniteHealth?: boolean;
  invisibility?: boolean;
  reload?: boolean;
  disableJoins?: boolean;
};
