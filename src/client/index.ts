import Phaser from "phaser";

import { Game } from "./scenes/Game";
import { StartScreen } from "./scenes/StartScreen";

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO, // selects renderer to use
  fps: {
    target: 60,
    forceSetTimeOut: true,
    smoothStep: false,
  },
  physics: {
    default: "arcade",
  },
  scale: {
    mode: Phaser.Scale.RESIZE,
  },
  scene: [StartScreen, Game],
};

const game = new Phaser.Game(config);
