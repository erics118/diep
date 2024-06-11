import { Client, type Room } from "colyseus.js";
import Phaser from "phaser";
import {
  DEV_KEY,
  GRID_SIZE,
  HEALTH_BAR_WIDTH,
  MAP_PADDING,
  MAP_SIZE,
  MINIMAP_SIZE,
  PLAYER_HEALTH,
} from "../../shared/config";
import {
  type BulletMessage,
  type CheatMessage,
  MessageType,
  type MoveMessage,
  type RotateMessage,
} from "../../shared/message";
import type { Bullet, Player, RoomState } from "../../shared/state";
import { colors } from "../../shared/style";
import type { GameSceneData, JoinGameOptions, Keys } from "../../shared/types";

export enum Depth {
  Background = -2,
  Bullets = -1,
  Players = 0,
  Overlay = 1,
}

export class Game extends Phaser.Scene {
  devMode = false;

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

  healthText: Phaser.GameObjects.Text;

  healthBarInner: Phaser.GameObjects.Graphics;
  healthBarOuter: Phaser.GameObjects.Graphics;

  username: Phaser.GameObjects.Text;

  localRef: Phaser.GameObjects.Rectangle;
  remoteRef: Phaser.GameObjects.Rectangle;

  keys: Keys;

  minimap: Phaser.Cameras.Scene2D.Camera;

  minimapContainer: Phaser.GameObjects.Container;
  minimapPlayerEntities: {
    [sessionId: string]: Phaser.Types.Physics.Arcade.ImageWithDynamicBody;
  } = {};

  usernameEntities: {
    [sessionId: string]: Phaser.GameObjects.Text;
  } = {};

  elapsedTime = 0;

  fixedTimeStep = 1000 / 60;

  currentTick = 0;

  pointerLocation: { x: number; y: number };

  reloadTicks = 10;
  lastBulletTick = 0;

  usernameStr: string;

  constructor() {
    super({ key: "diep" });
  }

  init(data: GameSceneData) {
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

  sendCheatMessage(msg: CheatMessage) {
    this.room.send(MessageType.CHEAT, msg);
  }

  // create graphics
  preloadGraphics() {
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

    this.make
      .graphics({ x: 0, y: 0 })
      .fillStyle(colors.minimap.player)
      .fillTriangle(0, 0, 6, 0, 3, 8)
      .generateTexture("minimapPlayer", 6, 8);
  }

  preload() {
    this.cameras.main.setBackgroundColor(colors.background);

    this.preloadGraphics();
  }

  // create background grid
  createBackground() {
    this.grid = this.add
      .grid(MAP_SIZE / 2, MAP_SIZE / 2, MAP_SIZE, MAP_SIZE, GRID_SIZE, GRID_SIZE, colors.gridLines)
      .setDepth(Depth.Background);
  }

  // create debug menu
  createDebugMenu() {
    // draw debug menu
    this.debugMenu = this.add
      .text(4, 4, "", { color: colors.debug.text })
      // don't more relative to player
      .setScrollFactor(0)
      .setDepth(Depth.Overlay);
  }

  // create player username and health bar
  createUserOverlay() {
    // draw username
    this.username = this.add
      .text(this.game.scale.width / 2, this.game.scale.height - 70, this.usernameStr, {
        color: colors.username,
        fontSize: "20px",
        fontFamily: "Arial",
      })
      // don't move relative to player
      .setScrollFactor(0)
      .setOrigin(0.5, 0.5)
      .setDepth(Depth.Overlay);

    this.healthBarOuter = this.add
      .graphics()
      .fillStyle(colors.healthBar.background)
      .fillRect(0, 0, HEALTH_BAR_WIDTH + 4, 15)
      .setX(this.game.scale.width / 2 - HEALTH_BAR_WIDTH / 2 - 2)
      .setScrollFactor(0)
      .setY(this.game.scale.height - 52)
      .setDepth(Depth.Overlay);

    this.healthBarInner = this.add
      .graphics()
      .fillStyle(colors.healthBar.fill)
      .fillRect(0, 0, HEALTH_BAR_WIDTH, 11)
      .setX(this.game.scale.width / 2 - HEALTH_BAR_WIDTH / 2)
      .setScrollFactor(0)
      .setY(this.game.scale.height - 50)
      .setDepth(Depth.Overlay);

    // draw health bar
    this.healthText = this.add
      .text(this.game.scale.width / 2, this.game.scale.height - 20, `Health: ${PLAYER_HEALTH}`, {
        color: colors.username,
        fontSize: "20px",
        fontFamily: "Arial",
      })
      // don't move relative to player
      .setScrollFactor(0)
      .setOrigin(0.5, 0.5)
      .setDepth(Depth.Overlay);
  }

  createMinimap() {
    this.minimap = this.cameras
      .add(
        this.game.scale.width - MINIMAP_SIZE * 2 - 20,
        this.game.scale.height - MINIMAP_SIZE * 2 - 20,
        MINIMAP_SIZE * 2,
        MINIMAP_SIZE * 2,
        false,
        "minimap",
      )
      .setZoom(((MINIMAP_SIZE * 2) / MAP_SIZE) * 0.85);

    // keep only players on minimap
    this.minimap.ignore([
      this.debugMenu,
      this.grid,
      this.username,
      this.healthText,
      this.healthBarInner,
      this.healthBarOuter,
    ]);

    this.minimap.setBackgroundColor(colors.minimap.devBackground);
    this.minimap.scrollX = MAP_SIZE / 2;
    this.minimap.scrollY = MAP_SIZE / 2;
  }

  createMinimapContainer() {
    // Create a container for the main part of the scene
    this.minimapContainer = this.add
      .container(
        this.game.scale.width - MINIMAP_SIZE - 20,
        this.game.scale.height - MINIMAP_SIZE - 20,
      )
      .setScrollFactor(0);

    // Add some game objects to the main container
    this.minimapContainer.add(
      this.add
        .rectangle(
          MINIMAP_SIZE / 2,
          MINIMAP_SIZE / 2,
          MINIMAP_SIZE,
          MINIMAP_SIZE,
          colors.minimap.background,
          0.2,
        )
        .setStrokeStyle(3, colors.minimap.border),
    );
  }

  // update minimap, username, and health bar position on window resize
  onResize() {
    this.minimap.setPosition(
      this.game.scale.width - MINIMAP_SIZE - 20,
      this.game.scale.height - MINIMAP_SIZE - 20,
    );

    this.minimapContainer.setPosition(
      this.game.scale.width - MINIMAP_SIZE - 20,
      this.game.scale.height - MINIMAP_SIZE - 20,
    );

    this.username.setPosition(this.game.scale.width / 2, this.game.scale.height - 70);
    this.healthBarOuter.setPosition(this.game.scale.width / 2, this.game.scale.height - 52);
    this.healthBarInner.setPosition(this.game.scale.width / 2, this.game.scale.height - 50);
    this.healthText.setPosition(this.game.scale.width / 2, this.game.scale.height - 20);
  }

  // listen for new players and create player entities
  // includes listeners for player and bullet updates
  onPlayerAdd(player: Player, sessionId: string) {
    this.bulletEntities[sessionId] = {};

    // current player
    if (sessionId === this.room.sessionId) {
      const entity = this.physics.add
        .image(player.x, player.y, "playerCircle")
        .setDepth(Depth.Players);

      this.playerEntities[sessionId] = entity;

      const minimapEntity = this.physics.add
        .image(
          (player.x / MAP_SIZE) * MINIMAP_SIZE,
          (player.y / MAP_SIZE) * MINIMAP_SIZE,
          "minimapPlayer",
        )
        .setDepth(Depth.Players);

      this.minimapPlayerEntities[sessionId] = minimapEntity;
      this.minimapContainer.add(minimapEntity);

      // make camera follow player
      this.cameras.main.startFollow(entity, true, 0.08, 0.08);

      if (this.devMode) {
        // create local and remote debug rectangles
        this.localRef = this.add
          .rectangle(0, 0, entity.width, entity.height)
          .setDepth(Depth.Players)
          .setStrokeStyle(1, colors.debug.local);

        this.remoteRef = this.add
          .rectangle(0, 0, entity.width, entity.height)
          .setDepth(Depth.Players)
          .setStrokeStyle(1, colors.debug.remote);

        this.minimap.ignore([this.localRef, this.remoteRef]);

        player.onChange(() => {
          this.remoteRef.x = player.x;
          this.remoteRef.y = player.y;
        });
      }

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

      this.usernameEntities[sessionId] = this.add
        .text(player.x, player.y - 45, player.username, {
          color: colors.username,
          fontSize: "16px",
          fontFamily: "Arial",
        })
        .setOrigin(0.5, 0)
        .setDepth(Depth.Overlay);

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
  }

  // remove local reference when entity is removed from the server
  onPlayerRemove(_player: Player, sessionId: string) {
    // remove player
    const playerEntity = this.playerEntities[sessionId];
    if (playerEntity) {
      playerEntity.destroy();
      delete this.playerEntities[sessionId];
    }

    // remove username
    const usernameEntity = this.usernameEntities[sessionId];
    if (usernameEntity) {
      usernameEntity.destroy();
      delete this.usernameEntities[sessionId];
    }

    // remove bullets
    for (const [bulletId, entity] of Object.entries(this.bulletEntities[sessionId])) {
      entity.destroy();
      delete this.bulletEntities[sessionId][bulletId];
    }
  }

  // rotate player entity and send message to server
  onPointerMove(pointer: Phaser.Input.Pointer) {
    this.pointerLocation = { x: pointer.worldX, y: pointer.worldY };

    const pointerAngle = Phaser.Math.Angle.Between(
      this.playerEntities[this.room.sessionId].x,
      this.playerEntities[this.room.sessionId].y,
      pointer.worldX,
      pointer.worldY,
    );
    this.playerEntities[this.room.sessionId].setRotation(pointerAngle);
    this.minimapPlayerEntities[this.room.sessionId].setRotation(pointerAngle);

    this.sendRotateMessage({
      rotation: pointerAngle,
    });
  }

  async create() {
    const urlParams = new URLSearchParams(window.location.search);
    const dev = urlParams.get("dev") === DEV_KEY;
    if (dev) {
      this.devMode = true;
    }

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
      space: Phaser.Input.Keyboard.KeyCodes.SPACE,
    }) as Keys;

    this.createBackground();

    this.createUserOverlay();

    this.createMinimapContainer();

    if (this.devMode) {
      this.createDebugMenu();

      this.minimapContainer.setVisible(false);

      this.createMinimap();

      this.input.keyboard.on("keydown-K", () => this.sendCheatMessage({ speed: true }), this);
      this.input.keyboard.on("keydown-O", () => this.sendCheatMessage({ bulletSpeed: true }), this);
      this.input.keyboard.on(
        "keydown-P",
        () => this.sendCheatMessage({ bulletDamage: true }),
        this,
      );
      this.input.keyboard.on(
        "keydown-L",
        () => this.sendCheatMessage({ infiniteHealth: true }),
        this,
      );
      this.input.keyboard.on(
        "keydown-I",
        () => this.sendCheatMessage({ invisibility: true }),
        this,
      );
      this.input.keyboard.on("keydown-J", () => this.sendCheatMessage({ reload: true }), this);
      this.input.keyboard.on(
        "keydown-ZERO",
        () => this.sendCheatMessage({ disableJoins: true }),
        this,
      );
    }

    // update minimap position on window resize
    window.addEventListener("resize", this.onResize.bind(this), false);

    await this.connect();

    this.room.state.players.onAdd(this.onPlayerAdd.bind(this));

    this.room.state.players.onRemove(this.onPlayerRemove.bind(this));

    // register pointer move event
    this.input.on("pointermove", this.onPointerMove.bind(this));
  }

  async connect() {
    // add connection status text
    const connectionStatusText = this.add
      .text(0, 0, "Trying to connect with the server...")
      .setStyle({ color: colors.debug.text })
      .setPadding(4)
      .setDepth(Depth.Overlay);

    const url = `ws://${window.location.hostname}:2567`;
    const client = new Client(url);

    try {
      this.room = await client.joinOrCreate("diep_room", {
        username: this.usernameStr,
        devMode: this.devMode,
      } as JoinGameOptions);

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

    if (this.devMode) {
      let cheatString = "";
      const player = this.room.state.players.get(this.room.sessionId);
      if (player.cheatSpeed) cheatString += "S ";
      if (player.cheatBulletSpeed) cheatString += "BS ";
      if (player.cheatBulletDamage) cheatString += "BD ";
      if (player.cheatInfiniteHealth) cheatString += "IH ";
      if (player.cheatInvisibility) cheatString += "I ";
      if (player.cheatReload) cheatString += "R ";

      this.debugMenu.text =
        `Frame rate: ${this.game.loop.actualFps}` +
        `\nTick: ${this.currentTick}` +
        `\n(${this.playerEntities[this.room.sessionId].x.toFixed(0)}, ${this.playerEntities[this.room.sessionId].y.toFixed(0)})` +
        `\nRoom Id: ${this.room.roomId}` +
        `\nSession Id: ${this.room.sessionId}` +
        `\nNum players: ${this.room.state.players.size}` +
        `\n${this.room.state.allowJoins ? "Joins enabled" : "Joins disabled"}` +
        `\n${cheatString}`;
    }

    this.healthText.text = `Health: ${this.room.state.players.get(this.room.sessionId).health}`;
  }

  // move local player and bullets
  moveLocal(msg: MoveMessage) {
    const player = this.room.state.players.get(this.room.sessionId);
    const velocity = player.cheatSpeed ? 5 : player.velocity;

    // set health bar
    this.healthBarInner.scaleX = player.health / PLAYER_HEALTH;

    // move player
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

    // check borders
    if (this.playerEntities[this.room.sessionId].x < MAP_PADDING) {
      this.playerEntities[this.room.sessionId].x = MAP_PADDING;
    }
    if (this.playerEntities[this.room.sessionId].x > MAP_SIZE - MAP_PADDING) {
      this.playerEntities[this.room.sessionId].x = MAP_SIZE - MAP_PADDING;
    }
    if (this.playerEntities[this.room.sessionId].y < MAP_PADDING) {
      this.playerEntities[this.room.sessionId].y = MAP_PADDING;
    }
    if (this.playerEntities[this.room.sessionId].y > MAP_SIZE - MAP_PADDING) {
      this.playerEntities[this.room.sessionId].y = MAP_SIZE - MAP_PADDING;
    }

    // draw on minimap
    this.minimapPlayerEntities[this.room.sessionId].x =
      (this.playerEntities[this.room.sessionId].x / MAP_SIZE) * MINIMAP_SIZE;
    this.minimapPlayerEntities[this.room.sessionId].y =
      (this.playerEntities[this.room.sessionId].y / MAP_SIZE) * MINIMAP_SIZE;

    // move bullets
    for (const [bulletId, entity] of Object.entries(this.bulletEntities[this.room.sessionId])) {
      const bullet = this.room.state.players.get(this.room.sessionId).bullets.get(bulletId);

      // remove bullet if deleted from server
      if (!bullet) {
        entity.destroy();
        delete this.bulletEntities[this.room.sessionId][bulletId];
        continue;
      }
      const velocity = player.cheatBulletSpeed ? 10 : bullet.velocity;

      entity.x += Math.cos(bullet.rotation) * velocity;
      entity.y += Math.sin(bullet.rotation) * velocity;
    }
  }

  moveRemote() {
    for (const [sessionId, player] of this.room.state.players) {
      // interpolate all player entities except fof the current player
      if (sessionId === this.room.sessionId) {
        continue;
      }

      const playerEntity = this.playerEntities[sessionId];
      const usernameEntity = this.usernameEntities[sessionId];

      if (player.isDead) {
        this.onPlayerRemove(player, sessionId);
        continue;
      }

      if (this.devMode) {
        playerEntity.setAlpha(player.cheatInvisibility ? 0.3 : 1);
      } else {
        playerEntity.setVisible(!player.cheatInvisibility);
        this.usernameEntities[sessionId].setVisible(!player.cheatInvisibility);
      }

      const { serverX, serverY, serverRotation } = playerEntity.data.values;

      playerEntity.x = Phaser.Math.Linear(playerEntity.x, serverX, 0.2);
      playerEntity.y = Phaser.Math.Linear(playerEntity.y, serverY, 0.2);
      playerEntity.rotation = serverRotation;

      usernameEntity.x = Phaser.Math.Linear(playerEntity.x, serverX, 0.2);
      usernameEntity.y = Phaser.Math.Linear(playerEntity.y - 45, serverY - 45, 0.2);

      // move bullets
      for (const [bulletId, entity] of Object.entries(this.bulletEntities[sessionId])) {
        const bullet = this.room.state.players.get(sessionId).bullets.get(bulletId);

        // remove bullet if deleted from server
        if (!bullet) {
          entity.destroy();
          delete this.bulletEntities[sessionId][bulletId];
          continue;
        }
        entity.setVisible(!player.cheatInvisibility);

        const { serverX, serverY } = entity.data.values;

        entity.x = Phaser.Math.Linear(entity.x, serverX, 0.2);
        entity.y = Phaser.Math.Linear(entity.y, serverY, 0.2);
      }
    }
  }

  handleDead() {
    this.playerEntities[this.room.sessionId].destroy();
    delete this.playerEntities[this.room.sessionId];

    for (const [_, bullets] of Object.entries(this.bulletEntities)) {
      for (const [bulletId, entity] of Object.entries(bullets)) {
        entity.destroy();
        delete bullets[bulletId];
      }
    }
    this.scene.stop("diep");
    this.scene.start("end");
  }

  handleBullet() {
    if (
      this.room.state.players.get(this.room.sessionId).cheatReload ||
      this.lastBulletTick + this.reloadTicks < this.currentTick
    ) {
      const msg: BulletMessage = {
        rotation: this.playerEntities[this.room.sessionId].rotation,
        x: this.playerEntities[this.room.sessionId].x,
        y: this.playerEntities[this.room.sessionId].y,
      };

      this.sendBulletMessage(msg);

      this.lastBulletTick = this.currentTick;
    }
  }

  fixedTick(_time: number, _delta: number) {
    this.currentTick++;

    if (this.room.state.players.get(this.room.sessionId).isDead) {
      this.handleDead();
    }

    if (this.keys.space.isDown) {
      this.handleBullet();
    }

    const msg: MoveMessage = {
      up: this.keys.up.isDown || this.keys.w.isDown,
      down: this.keys.down.isDown || this.keys.s.isDown,
      left: this.keys.left.isDown || this.keys.a.isDown,
      right: this.keys.right.isDown || this.keys.d.isDown,
    };

    this.sendMoveMessage(msg);

    this.moveLocal(msg);

    if (this.devMode) {
      // draw local debug ref
      this.localRef.x = this.playerEntities[this.room.sessionId].x;
      this.localRef.y = this.playerEntities[this.room.sessionId].y;
    }

    this.moveRemote();
  }
}
