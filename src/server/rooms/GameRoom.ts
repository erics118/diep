import { type Client, Room } from "colyseus";
import { MAP_SIZE } from "#shared/config";
import {
  BulletMessage,
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
    // this.onMessage(MessageType.BULLET, (client, input: BulletMessage) => {
    //   const player = this.state.players.get(client.sessionId);

    //   const b = new Bullet();
    //   b.x = input.x;
    //   b.y = input.y;
    //   b.rotation = input.rotation;

    //   player.bullets.push(b);
    // });

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
    const velocity = 2;

    for (const [_, player] of this.state.players) {
      let input: MoveMessage;

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
