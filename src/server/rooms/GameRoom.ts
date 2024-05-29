import { type Client, Room } from "colyseus";
import { type InputData, MyRoomState, Player } from "../../shared/GameState";

export class GameRoom extends Room<MyRoomState> {
  fixedTimeStep = 1000 / 60;

  onCreate(_options: any) {
    this.setState(new MyRoomState());

    // set map dimensions
    this.state.mapWidth = 5000;
    this.state.mapHeight = 5000;

    this.onMessage(0, (client, input: InputData) => {
      // handle player input
      const player = this.state.players.get(client.sessionId);

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

        player.rotation = input.rotation;
      }
    }
  }

  onJoin(client: Client, _options: any) {
    console.log(client.sessionId, "joined!");

    const player = new Player();
    player.x = Math.random() * 1000 + 200;
    player.y = Math.random() * 1000 + 200;

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
