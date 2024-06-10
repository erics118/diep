# diep

A clone of the diep.io game made with colyseus.js and phaser.js

## How to play

Move with WASD or arrow keys, press or hold SPACE to shoot.
Play with other people on the same local network as you.
Goal: survive and kill other players.

Add `?u={username}` to the URL to pre-fill with a username

## How to run

### Installation

Install [Node.js and npm](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm).

Then, run `npm install` to install the dependencies.

### Configuration

You will have to change the ip in the constant `BACKEND_URL` in `./src/shared/config.ts` to your local ip domain.

Then, run the server and the client separately. You can run them in development mode or production mode.

### Development

- Server
  - Run server `npm run start:server`
- Client
  - Run client `npm run start:client`

### Production

- Server
  - Build server `npm run build:server`
  - Run server `npm run start:server:prod`
- Client
  - Build client `npm run build:client`
  - Run client `npm run start:client:prod`

<details>
<summary>

## Dev Cheats

</summary>

Enable developer utilities by adding `?dev=V1St` to the URL. Configure the key in `./src/shared/config.ts`.

It enables a larger minimap that shows the whole map, including all players and bullets. It also includes various cheats/commands:
- `K` to increase speed to 2.5x (`2 -> 5 pixels/tick`)
- `O` to increase bullet speed to 2x (`5 -> 10 pixels/tick`)
- `P` to increase have infinite bullet damage
- `L` to have infinite health
- `I` to be invisible, along with your bullets
- `J` to reload at tick speed
- `0` to disable joins

</details>
