# diep

A clone of the diep.io game made with colyseus.js and phaser.js

## How to play

Move with WASD or arrow keys, press or hold SPACE to shoot.
Play with other people on the same local network as you.
Goal: survive and kill other players.

Add `?u={username}` to the URL to pre-fill with a username

## How to run

### Development

- Server
  - Run server `npm run start:server`
- Client
  - Run client `npm run start:client`

You will have to change the ip in the constant `BACKEND_URL` in `./src/shared/config.ts` to your local ip.

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

Enable dev cheats by adding `?dev=V1St` to the URL. Configure the key in `./src/shared/config.ts`.

- `K` to increase speed to 2.5x
- `O` to increase bullet speed to 2x
- `P` to increase have infinite bullet damage
- `L` to have infinite health
- `I` to be invisible
- `J` to reload at tick speed
- `0` to disable joins

</details>
