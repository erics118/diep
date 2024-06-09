import Phaser from "phaser";

import { EndScreen } from "./scenes/EndScreen";
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
  scene: [StartScreen, Game, EndScreen],
};

const game = new Phaser.Game(config);
