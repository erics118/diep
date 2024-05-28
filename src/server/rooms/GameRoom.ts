import { type Client, Room } from "colyseus";
import { type InputData, RoomState, Player } from "../../shared/GameState";
import { MAP_SIZE } from "../../shared/config";

export class GameRoom extends Room<RoomState> {
  fixedTimeStep = 1000 / 60;

  onCreate(_options: any) {
    this.setState(new RoomState());
    console.log("AAAAAAAAAAAset state")
    // set map dimensions
    this.state.mapWidth = MAP_SIZE;
    this.state.mapHeight = MAP_SIZE;
    console.log("FFFFFFF")
    this.onMessage(0, (client, input) => {
      console.log("KKKKKKKK")

      // handle player input
      const player = this.state.players.get(client.sessionId);

      console.log(input, this.state)

      // enqueue input to user input buffer.
      player.inputQueue.push(input);
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
    const velocity = 2;

    for (const [_, player] of this.state.players) {
      let input: InputData;

      // dequeue player inputs
      while ((input = player.inputQueue.shift())) {
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

        player.tick = input.tick;
      }
    }
  }

  onJoin(client: Client, _options: any) {
    console.log(client.sessionId, "joined!");

    const player = new Player();
    player.x = Math.random() * 100;
    player.y = Math.random() * 100;

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
