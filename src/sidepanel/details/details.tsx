import flatMap from 'array.prototype.flatmap';
import {GedcomEntry} from 'parse-gedcom';
import { useState, useEffect } from 'react';
import { findRelationship } from '../../relationship';
import {FormattedMessage} from 'react-intl';
import {Header, Item} from 'semantic-ui-react';
import {
  dereference,
  GedcomData,
  getData,
  getFileName,
  getImageFileEntry,
  getNonImageFileEntry,
  mapToSource,
} from '../../util/gedcom_util';
import {Config, Ids} from '../config/config';
import {AdditionalFiles, FileEntry} from './additional-files';
import {ALL_SUPPORTED_EVENT_TYPES, Events} from './events';
import {MultilineText} from './multiline-text';
import {Sources} from './sources';
import {TranslatedTag} from './translated-tag';
import {WrappedImage} from './wrapped-image';

const EXCLUDED_TAGS = [
  ...ALL_SUPPORTED_EVENT_TYPES,
  'NAME',
  'SEX',
  'FAMC',
  'FAMS',
  'NOTE',
  'SOUR',
  'FACT',
];

function dataDetails(entry: GedcomEntry) {
  const lines = [];
  if (entry.data) {
    lines.push(...getData(entry));
  }
  entry.tree
    .filter((subentry) => subentry.tag === 'NOTE')
    .forEach((note) =>
      getData(note).forEach((line) => lines.push(<i>{line}</i>)),
    );
  if (!lines.length) {
    return null;
  }
  return (
    <>
      <Header sub>
        <TranslatedTag tag={entry.tag} />
      </Header>
      <span>
        <MultilineText lines={lines} />
      </span>
    </>
  );
}

function attributeDetails(entry: GedcomEntry) {
  if (!entry.data) {
    return null;
  }

  const attributeName = entry.tree
    .filter((subentry) => subentry.tag === 'TYPE')
    .flatMap((type) => getData(type))
    .join()
    .trim();

  const attributeValue = getData(entry).join(' ').trim();
  if (attributeName) {
    return (
      <>
        <Header sub>
          <TranslatedTag tag={entry.tag} />
        </Header>
        <div>
          <b>{attributeName}</b>: {attributeValue}
        </div>
      </>
    );
  } else {
    return (
      <>
        <Header sub>
          <TranslatedTag tag={entry.tag} />
        </Header>
        <div>{attributeValue}</div>
      </>
    );
  }
}

function imageDetails(objectEntryReference: GedcomEntry, gedcom: GedcomData) {
  const imageEntry = dereference(
    objectEntryReference,
    gedcom,
    (gedcom) => gedcom.other,
  );

  const imageFileEntry = getImageFileEntry(imageEntry);

  if (!imageFileEntry || !hasData(imageEntry)) {
    return null;
  }

  return (
    <div className="person-image">
      <WrappedImage
        url={imageFileEntry.data}
        filename={getFileName(imageFileEntry) || ''}
      />
    </div>
  );
}

function sourceDetails(
  sourceReferenceEntries: GedcomEntry[],
  gedcom: GedcomData,
) {
  const sources = sourceReferenceEntries.map((sourceEntryReference) =>
    mapToSource(sourceEntryReference, gedcom),
  );

  if (!sources.length) {
    return null;
  }

  return (
    <>
      <div className="item-header">
        <Header as="span" size="small">
          <TranslatedTag tag="SOUR" />
        </Header>
      </div>
      <Sources sources={sources} />
    </>
  );
}

function fileDetails(objectEntries: GedcomEntry[], gedcom: GedcomData) {
  const files: FileEntry[] = [];
  objectEntries
    .map((objectEntry) =>
      dereference(objectEntry, gedcom, (gedcom) => gedcom.other),
    )
    .forEach((objectEntry) => {
      const fileEntry = getNonImageFileEntry(objectEntry);
      if (fileEntry) {
        files.push({
          url: fileEntry.data,
          filename: getFileName(fileEntry),
          titl: objectEntry.tree.find((entry) => entry.tag === 'TITL')?.data,
        });
      }
    });

  if (!files.length) {
    return null;
  }

  return (
    <>
      <div className="item-header">
        <Header as="span" size="small">
          <TranslatedTag tag="OBJE" />
        </Header>
      </div>
      <AdditionalFiles files={files} />
    </>
  );
}

interface ExternalFilesSectionProps {
  id: string;
}

function ExternalFilesSection({id}: ExternalFilesSectionProps) {
  const [validFiles, setValidFiles] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const checkFiles = async () => {
      const files: FileEntry[] = [];
      
      // Get base path for GitHub Pages
      const basePath = window.location.pathname.startsWith('/topola-viewer/') ? '/topola-viewer' : '';
      
      // Try different photo extensions
      const photoExtensions = ['jpg', 'JPG', 'jpeg', 'JPEG', 'png', 'PNG'];
      for (const ext of photoExtensions) {
        const photoUrl = `${basePath}/photos/${id}.${ext}`;
        try {
          const response = await fetch(photoUrl, { method: 'HEAD' });
          if (response.ok) {
            files.push({
              url: photoUrl,
              filename: `${id}.${ext}`,
              titl: 'Foto',
            });
            break; // Only add the first valid photo
          }
        } catch (error) {
          // Continue to next extension
        }
      }
      
      // Try different document extensions
      const docExtensions = ['pdf', 'PDF'];
      for (const ext of docExtensions) {
        const docUrl = `${basePath}/documents/${id}.${ext}`;
        try {
          const response = await fetch(docUrl, { method: 'HEAD' });
          if (response.ok) {
            files.push({
              url: docUrl,
              filename: `${id}.${ext}`,
              titl: 'Documento',
            });
            break; // Only add the first valid document
          }
        } catch (error) {
          // Continue to next extension
        }
      }

      setValidFiles(files);
      setChecked(true);
      setLoading(false);
    };

    checkFiles();
  }, [id]);

  if (loading) {
    return null;
  }

  if (!checked || !validFiles.length) {
    return (
      <Item>
        <Item.Content>
          <div className="item-header">
            <Header as="span" size="small">
              Archivos Externos
            </Header>
          </div>
          <p style={{ color: '#999', fontSize: '0.9em', marginTop: '8px' }}>
            No hay archivos disponibles para este registro
          </p>
        </Item.Content>
      </Item>
    );
  }

  return (
    <Item>
      <Item.Content>
        <div className="item-header">
          <Header as="span" size="small">
            Archivos Externos
          </Header>
        </div>
        <AdditionalFiles files={validFiles} />
      </Item.Content>
    </Item>
  );
}

function externalFilesDetails(id: string) {
  const files: FileEntry[] = [];
  
  // Try different photo extensions
  const photoExtensions = ['jpg', 'JPG', 'jpeg', 'JPEG', 'png', 'PNG'];
  for (const ext of photoExtensions) {
    const photoUrl = `./photos/${id}.${ext}`;
    files.push({
      url: photoUrl,
      filename: `${id}.${ext}`,
      titl: 'Foto',
    });
  }
  
  // Try different document extensions
  const docExtensions = ['pdf', 'PDF'];
  for (const ext of docExtensions) {
    const docUrl = `./documents/${id}.${ext}`;
    files.push({
      url: docUrl,
      filename: `${id}.${ext}`,
      titl: 'Documento',
    });
  }

  if (!files.length) {
    return null;
  }

  return (
    <Item>
      <Item.Content>
        <div className="item-header">
          <Header as="span" size="small">
            Archivos Externos
          </Header>
        </div>
        <AdditionalFiles files={files} />
      </Item.Content>
    </Item>
  );
}

function noteDetails(noteEntryReference: GedcomEntry, gedcom: GedcomData) {
  const noteEntry = dereference(
    noteEntryReference,
    gedcom,
    (gedcom) => gedcom.other,
  );

  if (!noteEntry || !hasData(noteEntry)) {
    return null;
  }

  return (
    <MultilineText
      lines={getData(noteEntry).map((line, index) => (
        <i key={index}>{line}</i>
      ))}
    />
  );
}

function nameDetails(entry: GedcomEntry) {
  const prefix = entry.tree.find((entry) => entry.tag === 'NPFX')?.data;
  let given = entry.tree.find((entry) => entry.tag === 'GIVN')?.data;
  let rufname = entry.tree.find((entry) => entry.tag === '_RUFNAME')?.data;
  const nickname = entry.tree.find((entry) => entry.tag === 'NICK')?.data;
  const surnamePrefix = entry.tree.find((entry) => entry.tag === 'SPFX')?.data;
  const surname = entry.tree.find((entry) => entry.tag === 'SURN')?.data;
  const suffix = entry.tree.find((entry) => entry.tag === 'NSFX')?.data;

  // If _RUFNAME is included in GIVN, then replace this part in GIVN with this part in quotation marks,
  // so that this name is not shown twice.
  if (given && rufname && given.includes(rufname)) {
    given = given.replace(rufname, `"${rufname}"`);
    rufname = undefined;
  }

  const fullNameParts = [
    prefix,
    given,
    rufname && `"${rufname}"`,
    nickname && `(${nickname})`,
    surnamePrefix,
    surname,
    suffix,
  ].filter(Boolean);

  const fullName =
    fullNameParts.join(' ').trim() || entry.data.replaceAll('/', '') || '';

  const nameType = entry.tree.find(
    (entry) => entry.tag === 'TYPE' && entry.data !== 'Unknown',
  )?.data;

  return (
    <>
      <Header as="span" size="large">
        {fullName ? (
          fullName
        ) : (
          <FormattedMessage id="name.unknown_name" defaultMessage="N.N." />
        )}
      </Header>
      {fullName && nameType && (
        <Item.Meta>
          <TranslatedTag tag={nameType} />
        </Item.Meta>
      )}
    </>
  );
}

function getSectionForEachMatchingEntry(
  entries: GedcomEntry[],
  gedcom: GedcomData,
  tags: string[],
  detailsFunction: (
    entry: GedcomEntry,
    gedcom: GedcomData,
  ) => React.ReactNode | null,
): React.ReactNode[] {
  return flatMap(tags, (tag) =>
    entries
      .filter((entry) => entry.tag === tag)
      .map((entry) => detailsFunction(entry, gedcom)),
  )
    .filter((element) => element !== null)
    .map((element, index) => (
      <Item key={index}>
        <Item.Content>{element}</Item.Content>
      </Item>
    ));
}

function combineAllMatchingEntriesIntoSingleSection(
  entries: GedcomEntry[],
  gedcom: GedcomData,
  tags: string[],
  detailsFunction: (
    entries: GedcomEntry[],
    gedcom: GedcomData,
  ) => React.ReactNode | null,
): React.ReactNode {
  const entriesWithMatchingTag = flatMap(tags, (tag) =>
    entries.filter((entry) => entry.tag === tag),
  ).filter((element) => element !== null);

  const sectionWithDetails = entriesWithMatchingTag.length
    ? detailsFunction(entriesWithMatchingTag, gedcom)
    : null;

  if (!sectionWithDetails) {
    return null;
  }

  return (
    <Item>
      <Item.Content>{sectionWithDetails}</Item.Content>
    </Item>
  );
}

/**
 * Returns true if there is displayable information in this entry.
 * Returns false if there is no data in this entry or this is only a reference
 * to another entry.
 */
function hasData(entry: GedcomEntry) {
  return entry.tree.length > 0 || (entry.data && !entry.data.startsWith('@'));
}

function getOtherSections(entries: GedcomEntry[], gedcom: GedcomData) {
  return entries
    .filter((entry) => !EXCLUDED_TAGS.includes(entry.tag))
    .map((entry) => dereference(entry, gedcom, (gedcom) => gedcom.other))
    .filter(hasData)
    .map((entry) => dataDetails(entry))
    .filter((element) => element !== null)
    .map((element, index) => (
      <Item key={index}>
        <Item.Content>{element}</Item.Content>
      </Item>
    ));
}

function getSectionForId(indi: string): React.ReactNode {
  return (
    <Item>
      <Item.Content>
        <Header sub>
          <FormattedMessage id="config.ids" defaultMessage="Identification" />
        </Header>
        <div>
          <i>{indi}</i>
        </div>
      </Item.Content>
    </Item>
  );
}

function relationshipCalculator(
  gedcom: GedcomData,
  currentIndi: string,
  compareId: string | null,
  setCompareId: (id: string | null) => void,
): React.ReactNode {
  return (
    <Item>
      <Item.Content>
        <div
          style={{
            background: '#f5f5f5',
            padding: '15px',
            marginTop: '15px',
            borderRadius: '6px',
            border: '1px solid #ddd',
          }}
        >
          <Header as="h4" style={{ margin: '0 0 10px 0' }}>
            🔢 Calculadora de Parentesco
          </Header>
          {!compareId ? (
            <button
              type="button"
              onClick={() => setCompareId(currentIndi)}
              style={{ padding: '6px 12px', cursor: 'pointer' }}
            >
              Fijar como Persona Base
            </button>
          ) : (
            <div>
              <p style={{ margin: '4px 0' }}>
                <strong>Base:</strong> {compareId}
              </p>
              <p style={{ margin: '4px 0' }}>
                <strong>Actual:</strong> {currentIndi}
              </p>
              <p
                style={{
                  margin: '10px 0 4px 0',
                  color: '#0056b3',
                  fontWeight: 'bold',
                }}
              >
                Relación: {findRelationship(gedcom, compareId, currentIndi)}
              </p>
              <button
                type="button"
                onClick={() => setCompareId(null)}
                style={{ marginTop: '5px', padding: '4px 8px' }}
              >
                🔄 Reiniciar
              </button>
            </div>
          )}
        </div>
      </Item.Content>
    </Item>
  );
}

interface Props {
  gedcom: GedcomData;
  indi: string;
  config: Config;
}

export function Details(props: Props) {
  const entries = props.gedcom.indis[props.indi].tree;
  const [compareId, setCompareId] = useState<string | null>(null);

  return (

    <div className="details">
      <Item.Group divided>
        {getSectionForEachMatchingEntry(
          entries,
          props.gedcom,
          ['NAME'],
          nameDetails,
        )}
        {getSectionForEachMatchingEntry(
          entries,
          props.gedcom,
          ['OBJE'],
          imageDetails,
        )}
        {relationshipCalculator(
          props.gedcom,
          props.indi,
          compareId,
          setCompareId,
        )}
        <Events gedcom={props.gedcom} entries={entries} indi={props.indi} />
        {props.config.id === Ids.SHOW ? getSectionForId(props.indi) : null}
        {getSectionForEachMatchingEntry(
          entries,
          props.gedcom,
          ['FACT'],
          attributeDetails,
        )}
        {getOtherSections(entries, props.gedcom)}
        {getSectionForEachMatchingEntry(
          entries,
          props.gedcom,
          ['NOTE'],
          noteDetails,
        )}
        {combineAllMatchingEntriesIntoSingleSection(
          entries,
          props.gedcom,
          ['OBJE'],
          fileDetails,
        )}
        {combineAllMatchingEntriesIntoSingleSection(
          entries,
          props.gedcom,
          ['SOUR'],
          sourceDetails,
        )}
        <ExternalFilesSection id={props.indi} />
      </Item.Group>
    </div>
  );
}
