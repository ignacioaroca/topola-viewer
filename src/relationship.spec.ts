import { findRelationship } from './relationship';

describe('findRelationship', () => {
  const gedcomData = {
    gedcom: {
      indis: {
        I1: { id: 'I1', fams: ['F1'] },
        I2: { id: 'I2', famc: 'F1' },
        I3: { id: 'I3', famc: 'F1' },
        I4: { id: 'I4', famc: 'F1' },
      },
      fams: {
        F1: { id: 'F1', husb: 'I1', wife: 'I2', children: ['I3', 'I4'] },
      },
      other: {},
    },
  };

  const gedcomExtended = {
    gedcom: {
      indis: {
        G0: { id: 'G0', fams: ['F1'] },
        W0: { id: 'W0', fams: ['F1'] },
        A1: { id: 'A1', famc: 'F1', fams: ['F2'] },
        B1: { id: 'B1', famc: 'F1', fams: ['F5'] },
        A2: { id: 'A2', famc: 'F2', fams: ['F3'] },
        A3: { id: 'A3', famc: 'F3', fams: ['F4'] },
        A4: { id: 'A4', famc: 'F4' },
        B2: { id: 'B2', famc: 'F5', fams: ['F6'] },
        B3: { id: 'B3', famc: 'F6', fams: ['F7'] },
        B4: { id: 'B4', famc: 'F7', fams: ['F8'] },
        C5: { id: 'C5', famc: 'F8' },
      },
      fams: {
        F1: { id: 'F1', husb: 'G0', wife: 'W0', children: ['A1', 'B1'] },
        F2: { id: 'F2', husb: 'A1', children: ['A2'] },
        F3: { id: 'F3', husb: 'A2', children: ['A3'] },
        F4: { id: 'F4', husb: 'A3', children: ['A4'] },
        F5: { id: 'F5', husb: 'B1', children: ['B2'] },
        F6: { id: 'F6', husb: 'B2', children: ['B3'] },
        F7: { id: 'F7', husb: 'B3', children: ['B4'] },
        F8: { id: 'F8', husb: 'B4', children: ['C5'] },
      },
      other: {},
    },
  };

  it('returns the same person message when both IDs match', () => {
    expect(findRelationship(gedcomData, 'I1', 'I1')).toBe('Es la misma persona');
  });

  it('returns a prompt when one ID is missing', () => {
    expect(findRelationship(gedcomData, '', 'I2')).toBe('Selecciona dos personas');
    expect(findRelationship(gedcomData, 'I1', '')).toBe('Selecciona dos personas');
  });

  it('detects a parent-child relationship', () => {
    expect(findRelationship(gedcomData, 'I1', 'I3')).toBe('Padre/Madre');
    expect(findRelationship(gedcomData, 'I3', 'I1')).toBe('Hijo/a');
  });

  it('detects siblings', () => {
    expect(findRelationship(gedcomData, 'I3', 'I4')).toBe('Hermano/a');
  });

  it('detects primo tercero and hijo de primo tercero', () => {
    expect(findRelationship(gedcomExtended, 'A4', 'B4')).toBe('primo tercero');
    expect(findRelationship(gedcomExtended, 'A4', 'C5')).toBe('Hijo/a de primo tercero');
  });

  it('detects direct ancestor names like tatarabuelo and bisnieto', () => {
    expect(findRelationship(gedcomExtended, 'G0', 'A4')).toBe('Tatarabuelo/a');
    expect(findRelationship(gedcomExtended, 'A4', 'G0')).toBe('Tataranieto/a');
    expect(findRelationship(gedcomExtended, 'G0', 'A3')).toBe('Bisabuelo/a');
    expect(findRelationship(gedcomExtended, 'A3', 'G0')).toBe('Bisnieto/a');
  });
});
