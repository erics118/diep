import { Client, type Room } from "colyseus.js";
import Phaser from "phaser";
import { BACKEND_URL, GRID_SIZE, MAP_SIZE, MINIMAP_SIZE } from "#shared/config";
import {
  MessageType,
  type MoveMessage,
  type RotateMessage,
  type BulletMessage,
} from "#shared/message";
import { colors } from "#shared/style";
import type { Keys, SceneData } from "#shared/types";
import { Bullet, Player, RoomState } from "#shared/state";

export enum Depth {
  Background = -2,
  Bullets = -1,
  Players = 0,
  Overlay = 1,
}

export class Scene extends Phaser.Scene {
  room: Room<RoomState>;

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

  bulletEntities: Phaser.Types.Physics.Arcade.ImageWithDynamicBody[] = [];
  reloadTicks = 20;
  lastBulletTick = 0;

  username: string;

  constructor() {
    super({ key: "diep" });
  }

  init(data: SceneData) {
    this.username = data.username || "Player";
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
  }

  async create() {
    // set world boundaries
    this.cameras.main.setBounds(0, 0, MAP_SIZE, MAP_SIZE);
    this.physics.world.setBounds(0, 0, MAP_SIZE, MAP_SIZE);

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

    // #region draw graphics: background grid, debug menu, username

    // draw background grid
    this.grid = this.add.grid(
      MAP_SIZE / 2,
      MAP_SIZE / 2,
      MAP_SIZE,
      MAP_SIZE,
      GRID_SIZE,
      GRID_SIZE,
      colors.gridLines,
    )
      .setDepth(Depth.Background);

    // draw debug menu
    this.debugMenu = this.add
      .text(4, 4, "", { color: colors.debug.text })
      // don't more relative to player
      .setScrollFactor(0)
      .setDepth(Depth.Overlay);

    // draw username
    this.add
      .text(
        this.game.scale.width / 2,
        this.game.scale.height - 50,
        this.username,
        {
          color: colors.username,
          fontSize: "20px",
          fontFamily: "Arial",
        },
      )
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
        "minimap"
      )
      .setZoom(MINIMAP_SIZE / MAP_SIZE)


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
    // #endregion

    // #region connect to server and draw players

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
        )
          .setDepth(Depth.Players)
        this.playerEntities[sessionId] = entity;

        this.currentPlayer = entity;

        entity.setCollideWorldBounds(true);

        // make camera follow it
        this.cameras.main.startFollow(entity, true, 0.08, 0.08);

        // create local and remote debug rectangles
        this.localRef = this.add.rectangle(0, 0, entity.width, entity.height).setDepth(Depth.Players)
        this.localRef.setStrokeStyle(1, colors.debug.local);

        this.remoteRef = this.add.rectangle(0, 0, entity.width, entity.height).setDepth(Depth.Players)
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
        )
          .setDepth(Depth.Players);
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
        _player: Player,
        sessionId: string,
      ) => {
        const entity = this.playerEntities[sessionId];
        if (entity) {
          entity.destroy();
          delete this.playerEntities[sessionId];
        }
      },
    );
    // #endregion
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
    this.sendMoveMessage(msg);

    // #region move current player

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
    // #endregion

    // #region handle player bullets

    // #region draw new bullet if space is pressed
    if (
      this.keys.space.isDown &&
      this.lastBulletTick + this.reloadTicks < this.currentTick
    ) {
      const entity = this.physics.add.image(
        this.currentPlayer.x,
        this.currentPlayer.y,
        "playerBullet",
      )
        .setDepth(-1);

      // this.sendBulletMessage({
      //   rotation: this.currentPlayer.rotation,
      //   x: entity.x,
      //   y: entity.y,
      // });

      this.bulletEntities.push(entity);
      // {
      //   body: entity,
      //   rotation: this.currentPlayer.rotation,
      //   speed: 5,
      //   health: 500,
      // });
      this.lastBulletTick = this.currentTick;
    }
    // #endregion

    // #region move bullets
    for (let i = this.room.state.players[this.room.sessionId].bullets.length - 1; i >= 0; i--) {
      const bullet = this.room.state.players[this.room.sessionId].bullets[i] as Bullet;
      this.bulletEntities[i].body.x += bullet.speed * Math.cos(bullet.rotation);
      this.bulletEntities[i].body.y += bullet.speed * Math.sin(bullet.rotation);
      // bullet.health -= 1;
      // remove the bullet from the list
      // if (bullet.health <= 0) {
      //   this.bulletEntities[i].body.destroy();
      //   this.bulletEntities.splice(i, 1);
      //   this.room.state.players[this.room.sessionId].bullets.splice(i, 1);
      // }
    }
    // #endregion

    // #region draw enemy bullets
    // for (const sessionId in this.room.state.players) {
    //   if (sessionId !== this.room.sessionId) {
    //     const player = this.room.state.players[sessionId];
    //     const bullets = player.bullets;
    //     for (const bullet of bullets) {
    //       const entity = this.physics.add.image(bullet.x, bullet.y, "enemyBullet").setDepth(-1);
    //       this.bulletEntities.push(entity);
    //     }
    //   }
    // }
    // #endregion

    // #region update remote player locations

    // draw local debug ref
    this.localRef.x = this.currentPlayer.x;
    this.localRef.y = this.currentPlayer.y;

    for (const sessionId in this.playerEntities) {
      // interpolate all player entities except fof the current player
      if (sessionId === this.room.sessionId) {
        continue;
      }

      const entity = this.playerEntities[sessionId]
      const { serverX, serverY, serverRotation } = entity.data.values;

      entity.x = Phaser.Math.Linear(entity.x, serverX, 0.2);
      entity.y = Phaser.Math.Linear(entity.y, serverY, 0.2);
      entity.setRotation(serverRotation);
    }
    // #endregion
  }
}
