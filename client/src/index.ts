import Phaser from "phaser";

import { Scene } from "./scenes/Scene";
import { SceneSelector } from "./scenes/SceneSelector";

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  fps: {
    target: 60,
    forceSetTimeOut: true,
    smoothStep: false,
  },
  width: 800,
  height: 600,
  // height: 200,
  backgroundColor: "#b6d53c",
  parent: "phaser-example",
  physics: {
    default: "arcade",
  },
  pixelArt: false,
  scene: [SceneSelector, Scene],
};

const game = new Phaser.Game(config);
