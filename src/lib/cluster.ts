// Agglomeratives hierarchisches Clustering (average linkage) für den
// Scheinstammbaum. Eingabe: Labels + symmetrische Distanzmatrix.

export type Tree =
  | { leaf: string }
  | { children: [Tree, Tree]; height: number };

export function averageLinkage(labels: string[], dist: number[][]): Tree {
  // ponytail: naives O(n³); reicht locker für <100 Sprachen
  type C = { tree: Tree; size: number };
  const clusters: C[] = labels.map((l) => ({ tree: { leaf: l }, size: 1 }));
  const D = dist.map((row) => [...row]);

  while (clusters.length > 1) {
    let bi = 0;
    let bj = 1;
    let best = Infinity;
    for (let i = 0; i < clusters.length; i++) {
      for (let j = i + 1; j < clusters.length; j++) {
        if (D[i]![j]! < best) {
          best = D[i]![j]!;
          bi = i;
          bj = j;
        }
      }
    }

    const a = clusters[bi]!;
    const b = clusters[bj]!;
    // Lance-Williams-Update für average linkage
    const newRow: number[] = [];
    for (let k = 0; k < clusters.length; k++) {
      if (k === bi || k === bj) continue;
      newRow.push((a.size * D[bi]![k]! + b.size * D[bj]![k]!) / (a.size + b.size));
    }

    clusters.splice(bj, 1);
    clusters.splice(bi, 1);
    D.splice(bj, 1);
    D.splice(bi, 1);
    for (const row of D) {
      row.splice(bj, 1);
      row.splice(bi, 1);
    }

    clusters.push({
      tree: { children: [a.tree, b.tree], height: best },
      size: a.size + b.size,
    });
    for (let k = 0; k < D.length; k++) D[k]!.push(newRow[k]!);
    newRow.push(0);
    D.push(newRow);
  }

  return clusters[0]!.tree;
}
