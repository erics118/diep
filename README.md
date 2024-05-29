# diep-clone

todo:
- [ ] create a completely separate scene for minimap that only includes players
- [ ] !send bullet data to server
- [ ] !player health, and player health bar
- [ ] player leveling
- [ ] upgrades
- [ ] random generation of shapes
- [ ] different message types: rotation, bullet, player movement
- collisions
  - [ ] player-player collision
  - [ ] shape-shape collision
  - [ ] bullet-bullet collision
  - [ ] player-shape collision
  - [ ] !player-bullet collision
  - [ ] shape-bullet collision

- bugs
  - [ ] fix server/local position differing when touching world border

    "build-server": "npm run clean && tsc",
    "build-client": "parcel build public/client.html",
