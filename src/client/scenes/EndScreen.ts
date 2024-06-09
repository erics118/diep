import Phaser from "phaser";
import { GRID_SIZE, MAP_SIZE } from "../../shared/config";
import { colors } from "../../shared/style";

export class EndScreen extends Phaser.Scene {
  textEntry: Phaser.GameObjects.Text;

  grid: Phaser.GameObjects.Grid;

  constructor() {
    super({ key: "end" });
  }

  preload() {
    this.cameras.main.setBackgroundColor(colors.background);
  }

  createBackground() {
    this.grid = this.add.grid(MAP_SIZE / 2, MAP_SIZE / 2, MAP_SIZE, MAP_SIZE, GRID_SIZE, GRID_SIZE, colors.gridLines);
  }

  create() {
    this.createBackground();

    const textStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      color: colors.username,
      fontSize: "100px",
      fontFamily: "Arial",
    };

    this.add.text(100, this.game.scale.height / 2, "YOU DIED", textStyle);
  }
}
