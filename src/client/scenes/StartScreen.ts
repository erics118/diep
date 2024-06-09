import Phaser from "phaser";
import type { SceneData } from "#shared/types";

export class StartScreen extends Phaser.Scene {
  textEntry: Phaser.GameObjects.Text;

  constructor() {
    super({ key: "selector", active: true });
  }

  preload() {
    this.cameras.main.setBackgroundColor(0x000000);
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
    this.scene.start("diep", { username: username } as SceneData);
  }

  create() {
    // immediately start game if username is present in url
    const urlParams = new URLSearchParams(window.location.search);
    const username = urlParams.get("u");

    if (username) {
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
      this.startGame(username);
    }

    const textStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      color: "#ff0000",
      fontSize: "32px",
      fontFamily: "Arial",
    };

    this.add
      .text(30, 100, "Start Game", textStyle)
      .setInteractive()
      .setPadding(6)
      .on("pointerdown", this.startGame.bind(this));

    this.add.text(30, 300, "Enter your name:", textStyle);

    this.textEntry = this.add.text(30, 500, "", textStyle);

    this.input.keyboard.on("keydown", this.onKeydown.bind(this));
  }
}
