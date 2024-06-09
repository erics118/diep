import Phaser from "phaser";
import { GRID_SIZE, MAP_SIZE } from "../../shared/config";
import { colors } from "../../shared/style";
import type { GameSceneData } from "../../shared/types";

export class StartScreen extends Phaser.Scene {
  textEntry: Phaser.GameObjects.Text;

  grid: Phaser.GameObjects.Grid;

  constructor() {
    super({ key: "selector", active: true });
  }

  preload() {
    this.cameras.main.setBackgroundColor(colors.background);
  }

  onKeydown(event: KeyboardEvent) {
    if (event.key === "Enter") {
      this.startGame(this.textEntry.text);
    } else if (event.key === "Backspace") {
      this.textEntry.text = this.textEntry.text.substring(0, this.textEntry.text.length - 1);
    } else if (
      "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ`1234567890-=[]\\;',./~!@#$%^&*()_+{}|:\"<>? ".includes(
        event.key,
      )
    ) {
      this.textEntry.text += event.key;
    }
  }

  startGame(username: string) {
    this.scene.stop("selector");
    this.scene.start("diep", { username: username } as GameSceneData);
  }

  createBackground() {
    this.grid = this.add.grid(MAP_SIZE / 2, MAP_SIZE / 2, MAP_SIZE, MAP_SIZE, GRID_SIZE, GRID_SIZE, colors.gridLines);
  }

  create() {
    const urlParams = new URLSearchParams(window.location.search);
    const username = urlParams.get("u");

    this.input.keyboard.addCapture("SPACE");

    this.createBackground();

    const textStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      color: colors.username,
      fontSize: "32px",
      fontFamily: "Arial",
    };

    this.add.text(this.game.scale.width / 2 - 200, (this.game.scale.height * 2) / 5, "Enter your name:", textStyle);

    this.textEntry = this.add.text(this.game.scale.width / 2 + 50, (this.game.scale.height * 2) / 5, "", textStyle);

    if (username) {
      this.textEntry.text = username;
    }

    this.add
      .text(this.game.scale.width / 2, (this.game.scale.height * 3) / 5, "Start Game", textStyle)
      .setInteractive()
      .setPadding(6)
      .on("pointerdown", this.startGame.bind(this));

    this.input.keyboard.on("keydown", this.onKeydown.bind(this));
  }
}
