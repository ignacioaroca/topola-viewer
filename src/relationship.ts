import {pointerToId} from './util/gedcom_util';

function normalizeIndiReferences(indi: any) {
  const getPointer = (value: string | undefined) => {
    if (!value) {
      return undefined;
    }
    return value.startsWith('@') && value.endsWith('@')
      ? value.slice(1, -1)
      : value;
  };

  const famc = getPointer(indi.famc) ||
    (indi.tree && indi.tree.find((entry: any) => entry.tag === 'FAMC')?.data &&
      getPointer(indi.tree.find((entry: any) => entry.tag === 'FAMC')?.data));

  const fams = Array.isArray(indi.fams)
    ? indi.fams.map(getPointer).filter(Boolean)
    : indi.tree
        ? indi.tree
            .filter((entry: any) => entry.tag === 'FAMS')
            .map((entry: any) => getPointer(entry.data))
            .filter(Boolean)
        : [];

  return {
    famc: famc as string | undefined,
    fams: fams as string[],
  };
}

function normalizeFamilyEntries(fam: any) {
  const children: string[] = [];
  let husb: string | undefined;
  let wife: string | undefined;

  if (fam) {
    if (fam.husb) {
      husb = typeof fam.husb === 'string' ? fam.husb : undefined;
    }
    if (fam.wife) {
      wife = typeof fam.wife === 'string' ? fam.wife : undefined;
    }
    if (Array.isArray(fam.children)) {
      children.push(...fam.children.map((child: any) => typeof child === 'string' ? child : '').filter(Boolean));
    }
    if (fam.tree) {
      fam.tree.forEach((entry: any) => {
        if (entry.tag === 'HUSB' || entry.tag === 'WIFE') {
          const pointer = pointerToId(entry.data);
          if (entry.tag === 'HUSB') {
            husb = pointer;
          } else if (entry.tag === 'WIFE') {
            wife = pointer;
          }
        }
        if (entry.tag === 'CHIL') {
          const pointer = pointerToId(entry.data);
          if (pointer) {
            children.push(pointer);
          }
        }
      });
    }
  }

  return {
    husb,
    wife,
    children,
  };
}

function getDataRoot(gedcomData: any) {
  return gedcomData && gedcomData.gedcom ? gedcomData.gedcom : gedcomData;
}

function getIndiById(gedcomData: any, id: string) {
  const root = getDataRoot(gedcomData);
  if (!root || !root.indis) {
    return undefined;
  }

  if (root.indis instanceof Map) {
    return root.indis.get(id);
  }
  if (Array.isArray(root.indis)) {
    return root.indis.find((indi: any) => indi.id === id || indi.id === `@${id}@`);
  }
  return root.indis[id] || root.indis[`@${id}@`];
}

function getFamById(gedcomData: any, id: string) {
  const root = getDataRoot(gedcomData);
  if (!root || !root.fams) {
    return undefined;
  }

  if (root.fams instanceof Map) {
    return root.fams.get(id);
  }
  if (Array.isArray(root.fams)) {
    return root.fams.find((fam: any) => fam.id === id || fam.id === `@${id}@`);
  }
  return root.fams[id] || root.fams[`@${id}@`];
}

function getParents(gedcomData: any, indiId: string) {
  const indi = getIndiById(gedcomData, indiId);
  if (!indi) {
    return [];
  }
  const {famc} = normalizeIndiReferences(indi);
  if (!famc) {
    return [];
  }
  const family = getFamById(gedcomData, famc);
  if (!family) {
    return [];
  }
  const normalized = normalizeFamilyEntries(family);
  return [normalized.husb, normalized.wife].filter(Boolean) as string[];
}

function getAncestorDistances(gedcomData: any, indiId: string, maxDepth = 10) {
  const distances = new Map<string, number>();
  const queue: {id: string; depth: number}[] = [{id: indiId, depth: 0}];

  while (queue.length > 0) {
    const {id, depth} = queue.shift()!;
    if (distances.has(id)) {
      continue;
    }

    distances.set(id, depth);
    if (depth >= maxDepth) {
      continue;
    }

    getParents(gedcomData, id).forEach((parent) => {
      if (!distances.has(parent)) {
        queue.push({id: parent, depth: depth + 1});
      }
    });
  }

  return distances;
}

function cousinLabel(degree: number) {
  switch (degree) {
    case 1:
      return 'primo hermano';
    case 2:
      return 'primo segundo';
    case 3:
      return 'primo tercero';
    case 4:
      return 'primo cuarto';
    case 5:
      return 'primo quinto';
    default:
      return `primo ${degree}`;
  }
}

function removedCousinLabel(removed: number, baseLabel: string) {
  switch (removed) {
    case 1:
      return `Hijo/a de ${baseLabel}`;
    case 2:
      return `Nieto/a de ${baseLabel}`;
    case 3:
      return `Bisnieto/a de ${baseLabel}`;
    case 4:
      return `Tataranieto/a de ${baseLabel}`;
    default:
      return `Pariente removido de ${baseLabel}`;
  }
}

function ancestorLabel(distance: number, descendant: boolean) {
  const labels = descendant
    ? ['Hijo/a', 'Nieto/a', 'Bisnieto/a', 'Tataranieto/a', 'Tras tataranieto/a']
    : ['Padre/Madre', 'Abuelo/a', 'Bisabuelo/a', 'Tatarabuelo/a', 'Trastatarabuelo/a'];

  return labels[distance - 1] || `Pariente ${distance} generaciones ${descendant ? 'abajo' : 'arriba'}`;
}

function describeByCommonAncestor(distA: number, distB: number) {
  if (distA === 1 && distB === 1) {
    return 'Hermano/a';
  }

  const min = Math.min(distA, distB);
  const removed = Math.abs(distA - distB);

  if (min === 1) {
    if (removed === 1) {
      return distA < distB ? 'Tío/a' : 'Sobrino/a';
    }
    if (removed === 2) {
      return distA < distB ? 'Tío abuelo/a' : 'Sobrino nieto/a';
    }
    return distA < distB ? `Tío ${'bis'.repeat(removed - 2)}abuelo/a` : `Sobrino ${'bis'.repeat(removed - 2)}nieto/a`;
  }

  const degree = min - 1;
  const baseLabel = cousinLabel(degree);

  if (removed === 0) {
    return baseLabel;
  }

  return removedCousinLabel(removed, baseLabel);
}

function findNearestCommonAncestor(
  distancesA: Map<string, number>,
  distancesB: Map<string, number>,
) {
  let bestAncestor: string | null = null;
  let bestDistance = Infinity;
  let bestDistA = 0;
  let bestDistB = 0;

  distancesA.forEach((distA, ancestor) => {
    if (!distancesB.has(ancestor)) {
      return;
    }

    const distB = distancesB.get(ancestor)!;
    const total = distA + distB;
    if (total < bestDistance) {
      bestDistance = total;
      bestAncestor = ancestor;
      bestDistA = distA;
      bestDistB = distB;
    }
  });

  if (!bestAncestor) {
    return null;
  }

  return {ancestorId: bestAncestor, distA: bestDistA, distB: bestDistB};
}

function isParent(gedcomData: any, parentId: string, childId: string) {
  const child = getIndiById(gedcomData, childId);
  if (!child) {
    return false;
  }
  const {famc} = normalizeIndiReferences(child);
  if (!famc) {
    return false;
  }
  const family = getFamById(gedcomData, famc);
  const normalized = normalizeFamilyEntries(family);
  return normalized.husb === parentId || normalized.wife === parentId;
}

function isSibling(gedcomData: any, indiA: string, indiB: string) {
  const personA = getIndiById(gedcomData, indiA);
  const personB = getIndiById(gedcomData, indiB);
  if (!personA || !personB) {
    return false;
  }

  const parentsA = normalizeIndiReferences(personA).famc;
  const parentsB = normalizeIndiReferences(personB).famc;
  return parentsA && parentsB && parentsA === parentsB;
}

function isSpouse(gedcomData: any, indiA: string, indiB: string) {
  const personA = getIndiById(gedcomData, indiA);
  if (!personA) {
    return false;
  }
  const {fams} = normalizeIndiReferences(personA);
  return fams.some((famId) => {
    const family = getFamById(gedcomData, famId);
    if (!family) {
      return false;
    }
    const normalized = normalizeFamilyEntries(family);
    return (
      (normalized.husb === indiA && normalized.wife === indiB) ||
      (normalized.wife === indiA && normalized.husb === indiB)
    );
  });
}

function getCommonAncestorRelationship(gedcomData: any, personAId: string, personBId: string) {
  const distancesA = getAncestorDistances(gedcomData, personAId);
  const distancesB = getAncestorDistances(gedcomData, personBId);

  if (distancesA.has(personBId)) {
    return ancestorLabel(distancesA.get(personBId)!, true);
  }
  if (distancesB.has(personAId)) {
    return ancestorLabel(distancesB.get(personAId)!, false);
  }

  const common = findNearestCommonAncestor(distancesA, distancesB);
  if (!common) {
    return 'Pariente lejano';
  }

  return describeByCommonAncestor(common.distA, common.distB);
}

// Función principal para calcular el camino entre dos IDs de personas
export function findRelationship(
  gedcomData: any,
  personAId: string,
  personBId: string,
): string {
  if (!gedcomData || !personAId || !personBId) {
    return 'Selecciona dos personas';
  }

  if (personAId === personBId) {
    return 'Es la misma persona';
  }

  if (isSpouse(gedcomData, personAId, personBId)) {
    return 'Cónyuge';
  }

  return getCommonAncestorRelationship(gedcomData, personAId, personBId);
}
