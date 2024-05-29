import { Client, type Room } from "colyseus.js";
import Phaser from "phaser";
import { BACKEND_URL, GRID_SIZE, colors } from "#shared/config";
import {
  type Bullet,
  type Keys,
  MessageType,
  type MoveMessage,
  type RotateMessage,
} from "#shared/types";

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

  elapsedTime = 0;
  fixedTimeStep = 1000 / 60;

  currentTick = 0;

  pointerLocation: { x: number; y: number };

  bullets: Bullet[] = [];
  reloadTicks = 20;
  lastBulletTick = 0;

  constructor() {
    super({ key: "diep" });
  }

  sendRotateMessage(msg: RotateMessage) {
    this.room.send(MessageType.ROTATION, msg);
  }

  sendMoveMessage(msg: MoveMessage) {
    this.room.send(MessageType.MOVE, msg);
  }

  preload() {
    this.cameras.main.setBackgroundColor(colors.background);

    // player circle
    this.make
      .graphics({ x: 0, y: 0 })
      // turret fill
      .fillStyle(colors.turret.fill)
      .fillRect(61, 35, 25, 20)
      // turret border
      .lineStyle(3, colors.turret.border)
      .strokeRect(61, 35, 25, 20)
      // player fill
      .fillStyle(colors.player.fill)
      .fillCircle(45, 45, 22)
      // player border
      .lineStyle(3, colors.player.border)
      .strokeCircle(45, 45, 22)
      // generate texture
      .generateTexture("playerCircle", 90, 90);

    const playerBullet = this.make.graphics({ x: 0, y: 0 });
    playerBullet.fillStyle(colors.playerBullet, 1.0);
    playerBullet.fillCircle(6, 6, 6);
    playerBullet.generateTexture("playerBullet", 12, 12);

    // enemy circle
    this.make
      .graphics({ x: 0, y: 0 })
      // turret fill
      .fillStyle(colors.turret.fill)
      .fillRect(61, 35, 25, 20)
      // turret border
      .lineStyle(3, colors.turret.border)
      .strokeRect(61, 35, 25, 20)
      // player fill
      .fillStyle(colors.enemy.fill)
      .fillCircle(45, 45, 22)
      // player border
      .lineStyle(3, colors.enemy.border)
      .strokeCircle(45, 45, 22)
      // generate texture
      .generateTexture("enemyCircle", 90, 90);
  }

  async create() {
    // set world boundaries
    this.cameras.main.setBounds(0, 0, MAP_SIZE, MAP_SIZE);
    this.physics.world.setBounds(0, 0, MAP_SIZE, MAP_SIZE);

    // create background grid
    this.grid = this.add.grid(
      MAP_SIZE / 2,
      MAP_SIZE / 2,
      MAP_SIZE,
      MAP_SIZE,
      GRID_SIZE,
      GRID_SIZE,
      colors.gridLines,
    );

    // create cursor and line

    // register pointer move event
    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      this.pointerLocation = { x: pointer.worldX, y: pointer.worldY };

      const pointerAngle = Phaser.Math.Angle.Between(
        this.currentPlayer.x,
        this.currentPlayer.y,
        pointer.worldX,
        pointer.worldY,
      );
      this.currentPlayer.setRotation(pointerAngle);

      this.sendRotateMessage({
        rotation: pointerAngle,
      });
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
    this.minimap.ignore([this.debugMenu, this.grid]);

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
        this.cameras.main.startFollow(entity, true, 0.08, 0.08);

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
          entity.setData("serverRotation", player.rotation);
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

    // debug menu
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

    const velocity = 2;

    const msg: MoveMessage = {
      up: this.keys.up.isDown || this.keys.w.isDown,
      down: this.keys.down.isDown || this.keys.s.isDown,
      left: this.keys.left.isDown || this.keys.a.isDown,
      right: this.keys.right.isDown || this.keys.d.isDown,
    };

    if (
      this.keys.space.isDown &&
      this.lastBulletTick + this.reloadTicks < this.currentTick
    ) {
      const entity = this.physics.add.image(
        this.currentPlayer.x,
        this.currentPlayer.y,
        "playerBullet",
      );

      this.bullets.push({
        body: entity,
        angle: this.currentPlayer.rotation,
        speed: 5,
        health: 100,
      });
      this.lastBulletTick = this.currentTick;
    }

    this.sendMoveMessage(msg);

    // move player
    if (msg.left) {
      this.currentPlayer.x -= velocity;
    } else if (msg.right) {
      this.currentPlayer.x += velocity;
    }

    if (msg.up) {
      this.currentPlayer.y -= velocity;
    } else if (msg.down) {
      this.currentPlayer.y += velocity;
    }

    // move bullets
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const bullet = this.bullets[i];
      bullet.body.x += bullet.speed * Math.cos(bullet.angle);
      bullet.body.y += bullet.speed * Math.sin(bullet.angle);
      bullet.health -= 1;
      // remove the bullet from the list
      if (bullet.health <= 0) {
        bullet.body.destroy();
        this.bullets.splice(i, 1);
      }
    }

    // local debug ref
    this.localRef.x = this.currentPlayer.x;
    this.localRef.y = this.currentPlayer.y;

    for (const sessionId in this.playerEntities) {
      // interpolate all player entities except fof the current player
      if (sessionId === this.room.sessionId) {
        continue;
      }

      const entity = this.playerEntities[sessionId];
      const { serverX, serverY, serverRotation } = entity.data.values;

      entity.x = Phaser.Math.Linear(entity.x, serverX, 0.2);
      entity.y = Phaser.Math.Linear(entity.y, serverY, 0.2);
      entity.setRotation(serverRotation);
    }
  }
}
