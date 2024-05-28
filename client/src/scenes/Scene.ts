import { Client, type Room } from "colyseus.js";
import Phaser from "phaser";
import { Keys } from "../types";
import { BACKEND_URL } from "../config";

const MAP_SIZE = 5000;
const MINIMAP_SIZE = 200;

export class Scene extends Phaser.Scene {
  room: Room;

  currentPlayer: Phaser.Types.Physics.Arcade.ImageWithDynamicBody;
  playerEntities: {
    [sessionId: string]: Phaser.Types.Physics.Arcade.ImageWithDynamicBody;
  } = {};

  grid: Phaser.GameObjects.Grid;

  debugMenu: Phaser.GameObjects.Text;

  localRef: Phaser.GameObjects.Rectangle;
  remoteRef: Phaser.GameObjects.Rectangle;

  keys: Keys;

  minimap: Phaser.Cameras.Scene2D.Camera;

  inputPayload = {
    left: false,
    right: false,
    up: false,
    down: false,
    tick: 0,
    shoot: false,
  };

  line: Phaser.GameObjects.Line;
  elapsedTime = 0;
  fixedTimeStep = 1000 / 60;

  currentTick = 0;

  constructor() {
    super({ key: "diep" });
  }

  preload() {
    this.cameras.main.setBackgroundColor(0xb8b8b8);

    const playerCircle = this.make.graphics({ x: 0, y: 0 });
    playerCircle.fillStyle(0x0000ff, 1.0);
    playerCircle.fillCircle(25, 25, 25);
    playerCircle.generateTexture("playerCircle", 50, 50);

    const bullet = this.make.graphics({ x: 0, y: 0 });
    bullet.fillStyle(0x000099, 1.0);
    bullet.fillCircle(10, 10, 10);
    bullet.generateTexture("bullet", 10, 10);
    this.load.image(
      "cursor",
      "https://labs.phaser.io/assets/sprites/drawcursor.png",
    );
  }

  async create() {
    // set world boundaries
    this.cameras.main.setBounds(0, 0, MAP_SIZE, MAP_SIZE);
    this.physics.world.setBounds(0, 0, MAP_SIZE, MAP_SIZE);

    // create background grid
    const gridSize = 32;
    const gridColor = 0xcccccc;

    this.grid = this.add.grid(
      MAP_SIZE / 2,
      MAP_SIZE / 2,
      MAP_SIZE,
      MAP_SIZE,
      gridSize,
      gridSize,
      gridColor,
    );

    const cursor = this.add.image(10, 10, "cursor").setVisible(true);

    const graphics = this.add.graphics({
      lineStyle: { width: 4, color: 0xaa00aa },
    });
    // let line;

    // register hooks for input
    this.keys = this.input!.keyboard!.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.UP,
      down: Phaser.Input.Keyboard.KeyCodes.DOWN,
      left: Phaser.Input.Keyboard.KeyCodes.LEFT,
      right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
      w: Phaser.Input.Keyboard.KeyCodes.W,
      a: Phaser.Input.Keyboard.KeyCodes.A,
      s: Phaser.Input.Keyboard.KeyCodes.S,
      d: Phaser.Input.Keyboard.KeyCodes.D,
      space: Phaser.Input.Keyboard.KeyCodes.SPACE,
    })! as Keys;

    // debug menu
    this.debugMenu = this.add
      .text(4, 4, "", { color: "#ff0000" })
      .setScrollFactor(0);

    // create minimap
    this.minimap = this.cameras
      .add(
        this.game.scale.width - MINIMAP_SIZE - 20,
        this.game.scale.height - MINIMAP_SIZE - 20,
        MINIMAP_SIZE,
        MINIMAP_SIZE,
      )
      .setZoom(MINIMAP_SIZE / MAP_SIZE)
      .setName("mini");

    this.minimap.ignore([this.debugMenu, this.grid]);

    window.addEventListener(
      "resize",
      () => {
        console.log("resize event");
        this.minimap.setPosition(
          this.game.scale.width - MINIMAP_SIZE - 20,
          this.game.scale.height - MINIMAP_SIZE - 20,
        );
      },
      false,
    );

    this.minimap.setBackgroundColor("rgba(70, 70, 70, 0.2)");
    this.minimap.scrollX = MAP_SIZE / 2;
    this.minimap.scrollY = MAP_SIZE / 2;

    // connect with the room
    await this.connect();

    this.room.state.players.onAdd((player, sessionId: string) => {
      const entity = this.physics.add.image(player.x, player.y, "playerCircle");
      this.playerEntities[sessionId] = entity;

      // is current player
      if (sessionId === this.room.sessionId) {
        this.currentPlayer = entity;
        console.log("got current player");

        entity.setCollideWorldBounds(true);
        // make camera follow it
        this.cameras.main.startFollow(entity, true, 0.5, 0.5);

        this.localRef = this.add.rectangle(0, 0, entity.width, entity.height);
        this.localRef.setStrokeStyle(1, 0x00ff00);

        this.remoteRef = this.add.rectangle(0, 0, entity.width, entity.height);
        this.remoteRef.setStrokeStyle(1, 0xff0000);

        player.onChange(() => {
          this.remoteRef.x = player.x;
          this.remoteRef.y = player.y;
        });
      } else {
        // listening for server updates
        player.onChange(() => {
          //
          // we're going to LERP the positions during the render loop.
          //
          entity.setData("serverX", player.x);
          entity.setData("serverY", player.y);
        });
      }
    });

    // remove local reference when entity is removed from the server
    this.room.state.players.onRemove(
      (
        _player: Phaser.Types.Physics.Arcade.ImageWithDynamicBody,
        sessionId: string,
      ) => {
        const entity = this.playerEntities[sessionId];
        if (entity) {
          entity.destroy();
          delete this.playerEntities[sessionId];
        }
      },
    );

    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      cursor.setVisible(true).setX(pointer.worldX).setY(pointer.worldY);

      graphics.clear();

      graphics.beginPath();
      graphics.moveTo(this.currentPlayer.x, this.currentPlayer.y);
      graphics.lineTo(pointer.worldX, pointer.worldY);
      graphics.strokePath();
    });
  }

  async connect() {
    // add connection status text
    const connectionStatusText = this.add
      .text(0, 0, "Trying to connect with the server...")
      .setStyle({ color: "#ff0000" })
      .setPadding(4);

    const client = new Client(BACKEND_URL);

    try {
      this.room = await client.joinOrCreate("diep_room", {});

      // connection successful!
      connectionStatusText.destroy();
    } catch (e) {
      // couldn't connect
      connectionStatusText.text = "Could not connect with the server.";
    }
  }

  update(time: number, delta: number): void {
    // skip loop if not connected yet.
    if (!this.currentPlayer) {
      return;
    }

    this.elapsedTime += delta;
    while (this.elapsedTime >= this.fixedTimeStep) {
      this.elapsedTime -= this.fixedTimeStep;
      this.fixedTick(time, this.fixedTimeStep);
    }

    this.debugMenu.text =
      `Frame rate: ${this.game.loop.actualFps}` +
      `\nTick: ${this.currentTick}` +
      `\n(${this.currentPlayer.x.toFixed(0)}, ${this.currentPlayer.y.toFixed(
        0,
      )})` +
      `\nSession Id: ${this.room.sessionId}` +
      `\nNum players: ${this.room.state.players.size}`;
  }

  fixedTick(_time: number, _delta: number) {
    this.currentTick++;

    // const currentPlayerRemote = this.room.state.players.get(this.room.sessionId);
    // const ticksBehind = this.currentTick - currentPlayerRemote.tick;
    // console.log({ ticksBehind });

    const velocity = 2;
    this.inputPayload.up = this.keys.up.isDown || this.keys.w.isDown;
    this.inputPayload.down = this.keys.down.isDown || this.keys.s.isDown;
    this.inputPayload.left = this.keys.left.isDown || this.keys.a.isDown;
    this.inputPayload.right = this.keys.right.isDown || this.keys.d.isDown;

    this.inputPayload.tick = this.currentTick;

    this.room.send(0, this.inputPayload);

    if (this.inputPayload.left) {
      this.currentPlayer.x -= velocity;
    } else if (this.inputPayload.right) {
      this.currentPlayer.x += velocity;
    }

    if (this.inputPayload.up) {
      this.currentPlayer.y -= velocity;
    } else if (this.inputPayload.down) {
      this.currentPlayer.y += velocity;
    }

    this.localRef.x = this.currentPlayer.x;
    this.localRef.y = this.currentPlayer.y;

    for (const sessionId in this.playerEntities) {
      // interpolate all player entities
      // (except the current player)
      if (sessionId === this.room.sessionId) {
        continue;
      }

      const entity = this.playerEntities[sessionId];
      const { serverX, serverY } = entity.data.values;

      entity.x = Phaser.Math.Linear(entity.x, serverX, 0.2);
      entity.y = Phaser.Math.Linear(entity.y, serverY, 0.2);
    }
  }
}
