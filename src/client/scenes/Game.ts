import { Client, type Room } from "colyseus.js";
import Phaser from "phaser";
import { BACKEND_URL, GRID_SIZE, MAP_SIZE, MINIMAP_SIZE } from "#shared/config";
import {
  type BulletMessage,
  type HealthMessage,
  MessageType,
  type MoveMessage,
  type RotateMessage,
} from "#shared/message";
import type { Bullet, Player, RoomState } from "#shared/state";
import { colors } from "#shared/style";
import type { Keys, SceneData } from "#shared/types";

export enum Depth {
  Background = -2,
  Bullets = -1,
  Players = 0,
  Overlay = 1,
}

export class Game extends Phaser.Scene {
  room: Room<RoomState>;

  playerEntities: {
    [sessionId: string]: Phaser.Types.Physics.Arcade.ImageWithDynamicBody;
  } = {};

  bulletEntities: {
    [sessionId: string]: {
      [bulletId: string]: Phaser.Types.Physics.Arcade.ImageWithDynamicBody;
    };
  } = {};

  grid: Phaser.GameObjects.Grid;

  debugMenu: Phaser.GameObjects.Text;
  healthBar: Phaser.GameObjects.Text;
  username: Phaser.GameObjects.Text;

  localRef: Phaser.GameObjects.Rectangle;
  remoteRef: Phaser.GameObjects.Rectangle;

  keys: Keys;

  minimap: Phaser.Cameras.Scene2D.Camera;

  elapsedTime = 0;
  fixedTimeStep = 1000 / 60;

  currentTick = 0;

  pointerLocation: { x: number; y: number };

  reloadTicks = 0;
  lastBulletTick = 0;

  usernameStr: string;

  constructor() {
    super({ key: "diep" });
  }

  init(data: SceneData) {
    this.usernameStr = data.username || "Player";
  }

  sendRotateMessage(msg: RotateMessage) {
    this.room.send(MessageType.ROTATION, msg);
  }

  sendMoveMessage(msg: MoveMessage) {
    this.room.send(MessageType.MOVE, msg);
  }

  sendBulletMessage(msg: BulletMessage) {
    this.room.send(MessageType.BULLET, msg);
  }

  sendHealthMessage(msg: HealthMessage) {
    this.room.send(MessageType.HEALTH, msg);
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

    this.make
      .graphics({ x: 0, y: 0 })
      // bullet fill
      .fillStyle(colors.player.fill)
      .fillCircle(15, 15, 9)
      // bullet border
      .lineStyle(3, colors.player.border)
      .strokeCircle(15, 15, 9)
      // generate texture
      .generateTexture("playerBullet", 30, 30);

    this.make
      .graphics({ x: 0, y: 0 })
      // bullet fill
      .fillStyle(colors.enemy.fill)
      .fillCircle(15, 15, 9)
      // bullet border
      .lineStyle(3, colors.enemy.border)
      .strokeCircle(15, 15, 9)
      // generate texture
      .generateTexture("enemyBullet", 30, 30);
  }

  async create() {
    // set world boundaries
    this.cameras.main.setBounds(0, 0, MAP_SIZE, MAP_SIZE);
    this.physics.world.setBounds(0, 0, MAP_SIZE, MAP_SIZE);

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
    }) as Keys;

    // #region draw graphics: background grid, debug menu, username

    // draw background grid
    this.grid = this.add
      .grid(MAP_SIZE / 2, MAP_SIZE / 2, MAP_SIZE, MAP_SIZE, GRID_SIZE, GRID_SIZE, colors.gridLines)
      .setDepth(Depth.Background);

    // draw debug menu
    this.debugMenu = this.add
      .text(4, 4, "", { color: colors.debug.text })
      // don't more relative to player
      .setScrollFactor(0)
      .setDepth(Depth.Overlay);

    // draw username
    this.username = this.add
      .text(this.game.scale.width / 2, this.game.scale.height - 70, this.usernameStr, {
        color: colors.username,
        fontSize: "20px",
        fontFamily: "Arial",
      })
      // don't move relative to player
      .setScrollFactor(0)
      .setDepth(Depth.Overlay);

    // draw health bar
    this.healthBar = this.add
      .text(this.game.scale.width / 2, this.game.scale.height - 40, `Health: ${5000}`, {
        color: colors.username,
        fontSize: "20px",
        fontFamily: "Arial",
      })
      // don't move relative to player
      .setScrollFactor(0)
      .setDepth(Depth.Overlay);

    // #endregion

    // #region minimap
    this.minimap = this.cameras
      .add(
        this.game.scale.width - MINIMAP_SIZE - 20,
        this.game.scale.height - MINIMAP_SIZE - 20,
        MINIMAP_SIZE,
        MINIMAP_SIZE,
        false,
        "minimap",
      )
      .setZoom(MINIMAP_SIZE / MAP_SIZE);

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
        this.username.setPosition(this.game.scale.width / 2, this.game.scale.height - 70);
        this.healthBar.setPosition(this.game.scale.width / 2, this.game.scale.height - 40);
      },
      false,
    );

    this.minimap.setBackgroundColor(colors.minimap);
    this.minimap.scrollX = MAP_SIZE / 2;
    this.minimap.scrollY = MAP_SIZE / 2;
    // #endregion

    // #region connect to server and draw players

    // connect with the room
    await this.connect();

    // listen for new players
    this.room.state.players.onAdd((player: Player, sessionId: string) => {
      this.bulletEntities[sessionId] = {};

      // current player
      if (sessionId === this.room.sessionId) {
        const entity = this.physics.add
          .image(player.x, player.y, "playerCircle")
          .setDepth(Depth.Players);
        this.playerEntities[sessionId] = entity;

        // this.playerEntities[this.room.sessionId] = entity;

        entity.setCollideWorldBounds(true);

        // make camera follow it
        this.cameras.main.startFollow(entity, true, 0.08, 0.08);

        // create local and remote debug rectangles
        this.localRef = this.add
          .rectangle(0, 0, entity.width, entity.height)
          .setDepth(Depth.Players);
        this.localRef.setStrokeStyle(1, colors.debug.local);

        this.remoteRef = this.add
          .rectangle(0, 0, entity.width, entity.height)
          .setDepth(Depth.Players);
        this.remoteRef.setStrokeStyle(1, colors.debug.remote);

        player.onChange(() => {
          this.remoteRef.x = player.x;
          this.remoteRef.y = player.y;
        });
        player.bullets.onAdd((bullet: Bullet, bulletId) => {
          const entity = this.physics.add
            .image(bullet.x, bullet.y, "playerBullet")
            .setDepth(Depth.Bullets);

          this.bulletEntities[sessionId][bulletId] = entity;
        });
      } else {
        const entity = this.physics.add
          .image(player.x, player.y, "enemyCircle")
          .setDepth(Depth.Players);
        this.playerEntities[sessionId] = entity;

        // listen for server updates
        player.onChange(() => {
          // LERP the positions during the render loop.
          entity.setData("serverX", player.x);
          entity.setData("serverY", player.y);
          entity.setData("serverRotation", player.rotation);
        });

        player.bullets.onAdd((bullet: Bullet, bulletId: string) => {
          const entity = this.physics.add
            .image(bullet.x, bullet.y, "enemyBullet")
            .setDepth(Depth.Bullets);

          this.bulletEntities[sessionId][bulletId] = entity;

          bullet.onChange(() => {
            entity.setData("serverX", bullet.x);
            entity.setData("serverY", bullet.y);
          });
        });
      }
    });

    // remove local reference when entity is removed from the server
    this.room.state.players.onRemove((_player: Player, sessionId: string) => {
      const entity = this.playerEntities[sessionId];
      if (entity) {
        entity.destroy();
        delete this.playerEntities[sessionId];
      }
    });
    // #endregion

    // #region draw new player bullet if space is pressed
    this.input.keyboard.on(
      "keydown-SPACE",
      () => {
        if (this.lastBulletTick + this.reloadTicks < this.currentTick) {
          const msg: BulletMessage = {
            rotation: this.playerEntities[this.room.sessionId].rotation,
            x: this.playerEntities[this.room.sessionId].x,
            y: this.playerEntities[this.room.sessionId].y,
          };

          this.sendBulletMessage(msg);

          this.lastBulletTick = this.currentTick;
        }
      },
      this,
    );
    // #endregion

    // register pointer move event
    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      this.pointerLocation = { x: pointer.worldX, y: pointer.worldY };

      const pointerAngle = Phaser.Math.Angle.Between(
        this.playerEntities[this.room.sessionId].x,
        this.playerEntities[this.room.sessionId].y,
        pointer.worldX,
        pointer.worldY,
      );
      this.playerEntities[this.room.sessionId].setRotation(pointerAngle);

      this.sendRotateMessage({
        rotation: pointerAngle,
      });
    });
  }

  async connect() {
    // add connection status text
    const connectionStatusText = this.add
      .text(0, 0, "Trying to connect with the server...")
      .setStyle({ color: "#ff0000" })
      .setPadding(4)
      .setDepth(Depth.Overlay);

    const client = new Client(BACKEND_URL);

    try {
      this.room = await client.joinOrCreate("diep_room", {});

      // connection successful
      connectionStatusText.destroy();
    } catch (e) {
      // couldn't connect
      connectionStatusText.text = "Could not connect with the server.";
    }
  }

  update(time: number, delta: number): void {
    // skip loop if not connected yet.
    if (!this.room) {
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
      `\n(${this.playerEntities[this.room.sessionId].x.toFixed(0)}, ${this.playerEntities[this.room.sessionId].y.toFixed(0)})` +
      `\nRoom Id: ${this.room.roomId}` +
      `\nSession Id: ${this.room.sessionId}` +
      `\nNum players: ${this.room.state.players.size}`;

    this.healthBar.text = `Health: ${this.room.state.players.get(this.room.sessionId).health}`;
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
    this.sendMoveMessage(msg);

    // #region move current player
    if (msg.left) {
      this.playerEntities[this.room.sessionId].x -= velocity;
    } else if (msg.right) {
      this.playerEntities[this.room.sessionId].x += velocity;
    }

    if (msg.up) {
      this.playerEntities[this.room.sessionId].y -= velocity;
    } else if (msg.down) {
      this.playerEntities[this.room.sessionId].y += velocity;
    }

    // #endregion

    for (const [bulletId, entity] of Object.entries(this.bulletEntities[this.room.sessionId])) {
      const bullet = this.room.state.players.get(this.room.sessionId).bullets.get(bulletId);

      // remove bullet if deleted from server
      if (!bullet) {
        entity.destroy();
        delete this.bulletEntities[this.room.sessionId][bulletId];
        continue;
      }

      entity.x += Math.cos(bullet.rotation) * 5;
      entity.y += Math.sin(bullet.rotation) * 5;
    }
    // #region update remote player locations

    // draw local debug ref
    // console.log(this.room.sessionId)
    this.localRef.x = this.playerEntities[this.room.sessionId].x;
    this.localRef.y = this.playerEntities[this.room.sessionId].y;

    for (const [sessionId, _] of this.room.state.players) {
      // interpolate all player entities except fof the current player
      if (sessionId === this.room.sessionId) {
        continue;
      }

      const entity = this.playerEntities[sessionId];
      const { serverX, serverY, serverRotation } = entity.data.values;

      entity.x = Phaser.Math.Linear(entity.x, serverX, 0.2);
      entity.y = Phaser.Math.Linear(entity.y, serverY, 0.2);
      entity.rotation = serverRotation;

      // move bullets
      for (const [bulletId, entity] of Object.entries(this.bulletEntities[sessionId])) {
        const bullet = this.room.state.players.get(sessionId).bullets.get(bulletId);

        // remove bullet if deleted from server
        if (!bullet) {
          entity.destroy();
          delete this.bulletEntities[sessionId][bulletId];
          continue;
        }
        const { serverX, serverY } = entity.data.values;

        entity.x = Phaser.Math.Linear(entity.x, serverX, 0.2);
        entity.y = Phaser.Math.Linear(entity.y, serverY, 0.2);
      }
    }
    // #endregion
  }
}