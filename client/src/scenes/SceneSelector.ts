import Phaser from "phaser";
import ship from "../../public/ship.png"
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

    graphics.generateTexture('redCircle', 50, 50);
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
