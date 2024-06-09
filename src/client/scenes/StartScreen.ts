import Phaser from "phaser";
import type { SceneData } from "#shared/types";

export class StartScreen extends Phaser.Scene {
  constructor() {
    super({ key: "selector", active: true });
  }

  preload() {
    this.cameras.main.setBackgroundColor(0x000000);
  }

  create() {
    const textStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      color: "#ff0000",
      fontSize: "32px",
      fontFamily: "Arial",
    };

    this.add
      .text(30, 100, "Start Game", textStyle)
      .setInteractive()
      .setPadding(6)
      .on("pointerdown", () => {
        this.scene.stop("selector");
        this.scene.start("diep", { username: textEntry.text } as SceneData);
      });

    this.add.text(30, 300, "Enter your name:", textStyle);

    const textEntry = this.add.text(30, 500, "", textStyle);

    this.input.keyboard.on("keydown", (event: KeyboardEvent) => {
      if (event.key === "Backspace") {
        textEntry.text = textEntry.text.substring(0, textEntry.text.length - 1);
      } else if (
        "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ`1234567890-=[]\\;',./~!@#$%^&*()_+{}|:\"<>? ".includes(
          event.key,
        )
      ) {
        textEntry.text += event.key;
      }
    });
  }
}
