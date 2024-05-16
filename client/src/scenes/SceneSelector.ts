import Phaser from "phaser";

export class SceneSelector extends Phaser.Scene {
  constructor() {
    super({ key: "selector", active: true });
  }

  preload() {
    // update menu background color
    this.cameras.main.setBackgroundColor(0x000000);

    const graphics = this.make.graphics({ x: 0, y: 0 });

    graphics.fillStyle(0x0000ff, 1.0);
    graphics.fillCircle(25, 25, 25);

    graphics.generateTexture("playerCircle", 50, 50);
  }

  create() {
    const textStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      color: "#ff0000",
      fontSize: "32px",
      fontFamily: "Arial",
    };

    this.add
      .text(130, 220, "Start Game", textStyle)
      .setInteractive()
      .setPadding(6)
      .on("pointerdown", () => {
        this.runScene("diep");
      });
  }

  runScene(key: string) {
    this.game.scene.switch("selector", key);
  }
}
