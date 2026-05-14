import {GedcomEntry} from 'parse-gedcom';
import queryString from 'query-string';
import {Link, useLocation} from 'react-router';
import {Header, Item, List} from 'semantic-ui-react';
import {GedcomData, dereference, getName, pointerToId} from '../../util/gedcom_util';
import {ExternalFilesSection} from './details';

interface Props {
  gedcom: GedcomData;
  fam: string;
}

export function FamilyDetails(props: Props) {
  const location = useLocation();
  const search = queryString.parse(location.search);
  const familyEntry = props.gedcom.fams[props.fam];
  
  if (!familyEntry) {
    return <div className="details">Familia no encontrada: {props.fam}</div>;
  }

  // Cónyuges
  const spouseRefs = familyEntry.tree.filter((entry) => ['WIFE', 'HUSB'].includes(entry.tag));
  const spouses = spouseRefs
    .map((reference) => dereference(reference, props.gedcom, (gedcom) => gedcom.indis))
    .filter((entry): entry is GedcomEntry => !!entry);

  // Hijos: Extraer IDs y limpiar arrobas
  const childrenIds = familyEntry.tree
    .filter((entry) => entry.tag === 'CHIL')
    .map((entry) => (entry.data || '').replace(/@/g, '').trim())
    .filter(id => id !== '');

  return (
    <div className="details">
      <Item.Group divided>
        <Item>
          <Item.Content>
            <Header as="h4">Familia {props.fam}</Header>
            <List relaxed>
              
              <List.Item>
                <List.Header>Cónyuges</List.Header>
                <List.List>
                  {spouses.length > 0 ? (
                    spouses.map((spouse) => {
                      const id = pointerToId(spouse.pointer);
                      return (
                        <List.Item key={id}>
                          <Link to={{pathname: '/view', search: queryString.stringify({...search, indi: id})}}>
                            <strong>{id}</strong> - {getName(spouse) || 'Sin nombre'}
                          </Link>
                        </List.Item>
                      );
                    })
                  ) : (
                    <List.Item>No hay cónyuges definidos.</List.Item>
                  )}
                </List.List>
              </List.Item>

              <List.Item style={{ marginTop: '1em' }}>
                <List.Header>Hijos ({childrenIds.length})</List.Header>
                <List.List>
                  {childrenIds.length > 0 ? (
                    childrenIds.map((childId) => {
                      const child = props.gedcom.indis[childId];
                      const childName = child ? getName(child) : null;
                      return (
                        <List.Item key={childId}>
                          <Link to={{pathname: '/view', search: queryString.stringify({...search, indi: childId})}}>
                            {childName ? (
                              <>{childId} - <strong>{childName}</strong></>
                            ) : (
                              `ID: ${childId}`
                            )}
                          </Link>
                        </List.Item>
                      );
                    })
                  ) : (
                    <List.Item>No hay hijos registrados.</List.Item>
                  )}
                </List.List>
              </List.Item>

            </List>
          </Item.Content>
        </Item>
        <ExternalFilesSection id={props.fam} />
      </Item.Group>
    </div>
  );
}