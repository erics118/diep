import Phaser from "phaser";

import { Scene } from "./scenes/Scene";
import { SceneSelector } from "./scenes/SceneSelector";

import { BACKEND_HTTP_URL } from "./backend";

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
  pixelArt: true,
  scene: [SceneSelector, Scene],
};

const game = new Phaser.Game(config);

/**
 * Create FPS selector
 */

// current fps label
const fpsInput = document.querySelector<HTMLInputElement>("input#fps");
const fpsValueLabel = document.querySelector<HTMLSpanElement>("#fps-value");
fpsValueLabel.innerText = fpsInput.value;

fpsInput.oninput = (event: InputEvent) => {
  const value = (event.target as HTMLInputElement).value;
  fpsValueLabel.innerText = value;

  // destroy previous loop
  game.loop.destroy();

  // create new loop
  game.loop = new Phaser.Core.TimeStep(game, {
    target: Number.parseInt(value),
    forceSetTimeOut: true,
    smoothStep: false,
  });

  // start new loop
  game.loop.start(game.step.bind(game));
};
