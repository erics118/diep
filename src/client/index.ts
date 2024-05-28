import Phaser from "phaser";

import { Scene } from "./scenes/Scene";
import { SceneSelector } from "./scenes/SceneSelector";

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO, // selects renderer to use
  fps: {
    target: 60,
    forceSetTimeOut: true,
    smoothStep: false,
  },
  // backgroundColor: "#",
  physics: {
    default: "arcade",
  },
  scale: {
    mode: Phaser.Scale.RESIZE,
  },
  scene: [/* SceneSelector, */ Scene],
};

const game = new Phaser.Game(config);
