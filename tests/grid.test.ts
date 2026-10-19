import { describe, expect, it } from 'vitest';
import { maps, getSpawn, findPath, groundPosition, interactionPoint, eventIsAdjacent, isWalkable, toTile, tileCenter, COLS, ROWS, TILE_SIZE, type Point } from '../src/grid';
import type { SceneId } from '../src/types';

function checkRoute(scene: SceneId, from: Point, to: Point) {
  const route = findPath(scene, from, to);
  if (from.x !== to.x || from.y !== to.y) expect(route.at(-1)).toEqual(to);
  let previous = from;
  for (const point of route) {
    const tile = toTile(point);
    expect(isWalkable(scene, tile.col, tile.row)).toBe(true);
    expect(Math.abs(point.x - previous.x) + Math.abs(point.y - previous.y)).toBe(TILE_SIZE);
    previous = point;
  }
}

describe.each(Object.keys(maps) as SceneId[])('%s map', scene => {
  it('has a valid grid, spawn, boundaries and collision for every solid prop', () => {
    const map = maps[scene];
    expect(map.tiles).toHaveLength(ROWS);
    expect(map.tiles.every(row => row.length === COLS)).toBe(true);
    expect(isWalkable(scene, map.spawn.col, map.spawn.row)).toBe(true);
    for (const [col, row] of [[-1, 0], [COLS, 0], [0, -1], [0, ROWS]]) expect(isWalkable(scene, col, row)).toBe(false);
    for (const prop of map.props.filter(prop => prop.solid !== false)) {
      for (let row = prop.row; row < prop.row + prop.height; row++) {
        for (let col = prop.col; col < prop.col + prop.width; col++) expect(isWalkable(scene, col, row)).toBe(false);
      }
    }
  });
  it('can approach every event from the spawn without crossing walls, furniture or NPCs', () => {
    const spawn = getSpawn(scene);
    for (const [id, event] of Object.entries(maps[scene].events)) {
      const end = interactionPoint(scene, id, spawn);
      expect(eventIsAdjacent(scene, id, end), id).toBe(true);
      checkRoute(scene, spawn, end);
      if (event.kind === 'person') expect(isWalkable(scene, event.col, event.row)).toBe(false);
    }
  });
  it('connects every walkable tile and repairs legacy or invalid saved coordinates', () => {
    for (let row = 0; row < ROWS; row++) for (let col = 0; col < COLS; col++) {
      if (isWalkable(scene, col, row)) checkRoute(scene, getSpawn(scene), tileCenter(col, row));
    }
    for (const point of [{ x: -500, y: 2000 }, { x: 300, y: 245 }, { x: NaN, y: Infinity }]) {
      const repaired = groundPosition(scene, point.x, point.y), tile = toTile(repaired);
      expect(isWalkable(scene, tile.col, tile.row)).toBe(true);
      expect(repaired).toEqual(tileCenter(tile.col, tile.row));
    }
    expect(findPath(scene, getSpawn(scene), { x: -100, y: -100 })).toEqual([]);
  });
});
