import Phaser from "phaser";

export class SceneSelector extends Phaser.Scene {
  constructor() {
    super({ key: "selector", active: true });
  }

  preload() {
    // update menu background color
    this.cameras.main.setBackgroundColor(0x000000);

    // preload demo assets
    this.load.image("ship", "../ship.png");
  }

  create() {
    // automatically navigate to hash scene if provided
    if (window.location.hash) {
      this.runScene(window.location.hash.substring(1));
      return;
    }

    const textStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      color: "#ff0000",
      fontSize: "32px",
      // fontSize: "24px",
      fontFamily: "Arial",
    };

    this.add
      .text(130, 220, `Start Game`, textStyle)
      .setInteractive()
      .setPadding(6)
      .on("pointerdown", () => {
        this.runScene(`diep`);
      });
  }

  runScene(key: string) {
    this.game.scene.switch("selector", key);
  }
}
