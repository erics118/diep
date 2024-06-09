import { type Client, Room, generateId } from "colyseus";
import { MAP_SIZE } from "#shared/config";
import {
  type BulletMessage,
  type HealthMessage,
  MessageType,
  type MoveMessage,
  type RotateMessage,
} from "#shared/message";
import { Bullet, Player, RoomState } from "#shared/state";

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
      if (input.cheat) b.health = 1e20;

      player.bullets.set(generateId(), b);
    });

    // health
    this.onMessage(MessageType.HEALTH, (client, input: HealthMessage) => {
      const player = this.state.players.get(client.sessionId);

      player.health = input.health;
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

      // dequeue player inputs
      while ((input = player.moveQueue.shift())) {
        if (input.left) {
          player.x -= player.velocity;
        } else if (input.right) {
          player.x += player.velocity;
        }

        if (input.up) {
          player.y -= player.velocity;
        } else if (input.down) {
          player.y += player.velocity;
        }
      }

      // move bullets
      for (const [bulletId, bullet] of player.bullets) {
        bullet.x += Math.cos(bullet.rotation) * 5;
        bullet.y += Math.sin(bullet.rotation) * 5;
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
    console.log(client.sessionId, "joined!");

    const player = new Player();
    player.x = Math.random() * 500 + 200;
    player.y = Math.random() * 500 + 200;

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
