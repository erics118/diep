import { Client, type Room } from "colyseus.js";
import Phaser from "phaser";
import { BACKEND_URL, colors } from "../../shared/config";
import type { Keys } from "../types";

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

  cursor: Phaser.GameObjects.Image;
  cursorGraphics: Phaser.GameObjects.Graphics;

  elapsedTime = 0;
  fixedTimeStep = 1000 / 60;

  currentTick = 0;

  constructor() {
    super({ key: "diep" });
  }

  preload() {
    this.cameras.main.setBackgroundColor(colors.background);

    const playerCircle = this.make.graphics({ x: 0, y: 0 });
    playerCircle.fillStyle(colors.player, 1.0);
    playerCircle.fillCircle(25, 25, 25);
    playerCircle.generateTexture("playerCircle", 50, 50);

    const enemyCircle = this.make.graphics({ x: 0, y: 0 });
    enemyCircle.fillStyle(colors.enemy, 1.0);
    enemyCircle.fillCircle(25, 25, 25);
    enemyCircle.generateTexture("enemyCircle", 50, 50);

    const bullet = this.make.graphics({ x: 0, y: 0 });
    bullet.fillStyle(colors.playerBullet, 1.0);
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

    this.grid = this.add.grid(
      MAP_SIZE / 2,
      MAP_SIZE / 2,
      MAP_SIZE,
      MAP_SIZE,
      gridSize,
      gridSize,
      colors.gridLines,
    );

    // create cursor and line
    this.cursor = this.add.image(10, 10, "cursor").setVisible(true);

    // this.cursorGraphics = this.add.graphics({
    //   lineStyle: { width: 4, color: colors.debug.cursor },
    // });

    // register pointer move event
    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      this.cursor.setVisible(true).setX(pointer.worldX).setY(pointer.worldY);

      // this.cursorGraphics.clear();

      // this.cursorGraphics.beginPath();
      // this.cursorGraphics.moveTo(this.currentPlayer.x, this.currentPlayer.y);
      // this.cursorGraphics.lineTo(pointer.worldX, pointer.worldY);
      // this.cursorGraphics.strokePath();
    });

    // register key input events
    this.keys = this.input?.keyboard?.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.UP,
      down: Phaser.Input.Keyboard.KeyCodes.DOWN,
      left: Phaser.Input.Keyboard.KeyCodes.LEFT,
      right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
      w: Phaser.Input.Keyboard.KeyCodes.W,
      a: Phaser.Input.Keyboard.KeyCodes.A,
      s: Phaser.Input.Keyboard.KeyCodes.S,
      d: Phaser.Input.Keyboard.KeyCodes.D,
      space: Phaser.Input.Keyboard.KeyCodes.SPACE,
    }) as Keys;

    // create debug menu
    this.debugMenu = this.add
      .text(4, 4, "", { color: colors.debug.text })
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
      .setName("minimap");

    // keep only players on minimap
    this.minimap.ignore([
      this.debugMenu,
      this.grid,
      this.cursor,
      this.cursorGraphics,
    ]);

    // update minimap position on window resize
    window.addEventListener(
      "resize",
      () => {
        this.minimap.setPosition(
          this.game.scale.width - MINIMAP_SIZE - 20,
          this.game.scale.height - MINIMAP_SIZE - 20,
        );
      },
      false,
    );

    this.minimap.setBackgroundColor(colors.minimap);
    this.minimap.scrollX = MAP_SIZE / 2;
    this.minimap.scrollY = MAP_SIZE / 2;

    // connect with the room
    await this.connect();

    // listen for new players
    this.room.state.players.onAdd((player: any, sessionId: string) => {
      // current player
      if (sessionId === this.room.sessionId) {
        const entity = this.physics.add.image(
          player.x,
          player.y,
          "playerCircle",
        );
        this.playerEntities[sessionId] = entity;

        this.currentPlayer = entity;

        entity.setCollideWorldBounds(true);

        // make camera follow it
        this.cameras.main.startFollow(entity, true, 0.5, 0.5);

        // create local and remote debug rectangles
        this.localRef = this.add.rectangle(0, 0, entity.width, entity.height);
        this.localRef.setStrokeStyle(1, colors.debug.local);

        this.remoteRef = this.add.rectangle(0, 0, entity.width, entity.height);
        this.remoteRef.setStrokeStyle(1, colors.debug.remote);

        player.onChange(() => {
          this.remoteRef.x = player.x;
          this.remoteRef.y = player.y;
        });
      } else {
        const entity = this.physics.add.image(
          player.x,
          player.y,
          "enemyCircle",
        );
        this.playerEntities[sessionId] = entity;

        // listen for server updates
        player.onChange(() => {
          // LERP the positions during the render loop.
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
