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
    return <div>Familia no encontrada: {props.fam}</div>;
  }

  const spouseRefs = familyEntry.tree.filter((entry) => ['WIFE', 'HUSB'].includes(entry.tag));
  const spouses = spouseRefs
    .map((reference) => dereference(reference, props.gedcom, (gedcom) => gedcom.indis))
    .filter((entry): entry is GedcomEntry => !!entry);

  const children = familyEntry.tree
    .filter((entry) => entry.tag === 'CHILD')
    .map((entry) => pointerToId(entry.data));

  return (
    <div className="details">
      <Item.Group divided>
        <Item>
          <Item.Content>
            <Header as="h4">Familia {props.fam}</Header>
            <List>
              <List.Item>
                <List.Header>Cónyuges</List.Header>
                <List.List>
                  {spouses.length ? (
                    spouses.map((spouse) => {
                      const id = pointerToId(spouse.pointer);
                      const spouseSearch = {...search, indi: id};
                      return (
                        <List.Item key={id}>
                          <Link to={{pathname: '/view', search: queryString.stringify(spouseSearch)}}>
                            {getName(spouse) || id}
                          </Link>
                        </List.Item>
                      );
                    })
                  ) : (
                    <List.Item>No hay cónyuges definidos.</List.Item>
                  )}
                </List.List>
              </List.Item>
              <List.Item>
                <List.Header>Hijos ({children.length})</List.Header>
                <List.List>
                  {children.length ? (
                    children.map((childId) => {
                      const child = props.gedcom.indis[childId];
                      const childSearch = {...search, indi: childId};
                      const childName = child ? getName(child) : null;
                      return (
                        <List.Item key={childId}>
                          <Link to={{pathname: '/view', search: queryString.stringify(childSearch)}}>
                            {childName ? `${childId} - ${childName}` : childId}
                          </Link>
                        </List.Item>
                      );
                    })
                  ) : (
                    <List.Item>No hay hijos definidos.</List.Item>
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
