import { type Client, Room, generateId } from "colyseus";
import { MAP_PADDING, MAP_SIZE } from "../../shared/config";
import {
  type BulletMessage,
  type CheatMessage,
  MessageType,
  type MoveMessage,
  type RotateMessage,
} from "../../shared/message";
import { Bullet, Player, RoomState } from "../../shared/state";

export class GameRoom extends Room<RoomState> {
  fixedTimeStep = 1000 / 60;

  onCreate(_options: any) {
    this.setState(new RoomState());

    // set map dimensions
    this.state.mapWidth = MAP_SIZE;
    this.state.mapHeight = MAP_SIZE;

    // movement
    this.onMessage(MessageType.MOVE, (client, input: MoveMessage) => {
      const player = this.state.players.get(client.sessionId);

      // enqueue input to user input buffer.
      player.moveQueue.push(input);
    });

    // rotation
    this.onMessage(MessageType.ROTATION, (client, input: RotateMessage) => {
      const player = this.state.players.get(client.sessionId);

      player.rotation = input.rotation;
    });

    // bullet
    this.onMessage(MessageType.BULLET, (client, input: BulletMessage) => {
      const player = this.state.players.get(client.sessionId);

      const b = new Bullet();
      b.x = input.x;
      b.y = input.y;
      b.rotation = input.rotation;

      player.bullets.set(generateId(), b);
    });

    // cheat
    this.onMessage(MessageType.CHEAT, (client, input: CheatMessage) => {
      const player = this.state.players.get(client.sessionId);

      if (input.speed) player.cheatSpeed = !player.cheatSpeed;
      if (input.bulletSpeed) player.cheatBulletSpeed = !player.cheatBulletSpeed;
      if (input.bulletDamage) player.cheatBulletDamage = !player.cheatBulletDamage;
      if (input.infiniteHealth) player.cheatInfiniteHealth = !player.cheatInfiniteHealth;
      if (input.invisibility) player.cheatInvisibility = !player.cheatInvisibility;
      if (input.reload) player.cheatReload = !player.cheatReload;
      if (input.disableJoins) this.state.allowJoins = !this.state.allowJoins;
    });

    let elapsedTime = 0;
    this.setSimulationInterval((deltaTime) => {
      elapsedTime += deltaTime;

      while (elapsedTime >= this.fixedTimeStep) {
        elapsedTime -= this.fixedTimeStep;
        this.fixedTick(this.fixedTimeStep);
      }
    });
  }

  fixedTick(_timeStep: number) {
    for (const [_, player] of this.state.players) {
      let input: MoveMessage;
      const velocity = player.cheatSpeed ? 5 : player.velocity;

      // dequeue player inputs
      while ((input = player.moveQueue.shift())) {
        if (input.left) {
          player.x -= velocity;
        } else if (input.right) {
          player.x += velocity;
        }

        if (input.up) {
          player.y -= velocity;
        } else if (input.down) {
          player.y += velocity;
        }
      }

      // check borders
      if (player.x < MAP_PADDING) {
        player.x = MAP_PADDING;
      }
      if (player.x > MAP_SIZE - MAP_PADDING) {
        player.x = MAP_SIZE - MAP_PADDING;
      }
      if (player.y < MAP_PADDING) {
        player.y = MAP_PADDING;
      }
      if (player.y > MAP_SIZE - MAP_PADDING) {
        player.y = MAP_SIZE - MAP_PADDING;
      }

      // move bullets
      for (const [bulletId, bullet] of player.bullets) {
        const velocity = player.cheatBulletSpeed ? 10 : bullet.velocity;

        bullet.x += Math.cos(bullet.rotation) * velocity;
        bullet.y += Math.sin(bullet.rotation) * velocity;
        bullet.health -= 3;

        if (bullet.health <= 0) {
          player.bullets.delete(bulletId);
        }
      }
    }

    // check bullet - player collision
    for (const [playerSessionId, player] of this.state.players) {
      for (const [bulletId, bullet] of player.bullets) {
        for (const [targetSessionId, target] of this.state.players) {
          if (playerSessionId === targetSessionId) {
            continue;
          }

          const distance = Math.sqrt((bullet.x - target.x) ** 2 + (bullet.y - target.y) ** 2);

          if (distance <= 25) {
            // kill target
            if (player.cheatBulletDamage && !target.cheatInfiniteHealth) {
              target.isDead = true;
              continue;
            }

            // destroy bullet
            if (target.cheatInfiniteHealth) {
              player.bullets.delete(bulletId);
              continue;
            }

            if (target.health <= bullet.health) {
              bullet.health -= target.health;
              target.isDead = true;
            }

            if (bullet.health <= target.health) {
              target.health -= bullet.health;
              player.bullets.delete(bulletId);
            }
          }
        }
      }
    }
  }

  onJoin(client: Client, _options: any) {
    if (!this.state.allowJoins) {
      client.leave();
      return;
    }

    console.log(client.sessionId, "joined!");

    const player = new Player();

    player.x = Math.random() * (MAP_SIZE - 4 * MAP_PADDING) + 2 * MAP_PADDING;
    player.y = Math.random() * (MAP_SIZE - 4 * MAP_PADDING) + 2 * MAP_PADDING;

    this.state.players.set(client.sessionId, player);
  }

  onLeave(client: Client, _consented: boolean) {
    console.log(client.sessionId, "left!");
    this.state.players.delete(client.sessionId);
  }

  onDispose() {
    console.log("room", this.roomId, "disposing...");
  }
}
