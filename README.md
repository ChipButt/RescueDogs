# RescueDogs

Playable prototype for the dog rescue trash-yard maze mini-game.

## Current build

This is a self-contained mobile web prototype. It uses plain HTML, CSS and JavaScript modules.

## Gameplay

- Move around a top-down trash-yard maze.
- Rescue dogs by walking onto them and spending the required food.
- Rescued dogs follow behind the player.
- Feral dogs chase when the player gets too close.
- Drop food on the tile the player is currently standing on.
- Dropped food costs 1 food.
- Dropped food can stop a chasing feral dog if the dog sees and reaches it.
- If the food is placed badly, it is wasted.
- Return to the entrance with rescued dogs to complete the mission.
- If a chasing feral dog catches the player, the mission fails.

## Controls

Mobile:

- Use the on-screen directional buttons.
- Use **Drop Food** to place food on the current tile.
- Use **Restart** to reset the mission.

## File structure

```text
index.html
styles.css
main.js
game/
  config.js
  entities.js
  input.js
  maps.js
  mission.js
  renderer.js
```

## Notes

This is the first functional prototype. The next sensible upgrades are improved mobile styling, proper raster pixel assets, multiple hand-built maps, better mission results for plugging into the wider dog rescue game, and difficulty scaling.
