import { describe, expect, it } from 'vitest';
import { averageLinkage, type Tree } from './cluster.ts';

function leaves(t: Tree): string[] {
  return 'leaf' in t ? [t.leaf] : t.children.flatMap(leaves);
}

describe('averageLinkage', () => {
  it('merges the closest pair first and keeps all leaves', () => {
    // a–b eng (0.1), c weit weg, d noch weiter
    const labels = ['a', 'b', 'c', 'd'];
    const D = [
      [0, 0.1, 0.8, 1.0],
      [0.1, 0, 0.8, 1.0],
      [0.8, 0.8, 0, 0.9],
      [1.0, 1.0, 0.9, 0],
    ];
    const tree = averageLinkage(labels, D);
    expect(leaves(tree).sort()).toEqual(labels);

    // erste Fusion: {a,b} bei Höhe 0.1 — muss als Teilbaum vorkommen
    const sub = JSON.stringify(tree);
    expect(sub).toContain(
      JSON.stringify({ children: [{ leaf: 'a' }, { leaf: 'b' }], height: 0.1 })
    );
  });

  it('uses size-weighted (average) distances for merged clusters', () => {
    // Nach Fusion {a,b}: d({a,b},c) = (0.2 + 0.6)/2 = 0.4
    const labels = ['a', 'b', 'c'];
    const D = [
      [0, 0.1, 0.2],
      [0.1, 0, 0.6],
      [0.2, 0.6, 0],
    ];
    const tree = averageLinkage(labels, D) as Extract<Tree, { height: number }>;
    expect(tree.height).toBeCloseTo(0.4);
  });
});
