import {useState} from 'react';
import {useIntl} from 'react-intl';
import {Button, Dropdown, Icon, Sidebar, Tab} from 'semantic-ui-react';
import {
  dereference,
  getName,
  pointerToId,
  TopolaData,
} from '../util/gedcom_util';
import {Config, ConfigPanel} from './config/config';
import {CollapsedDetails} from './details/collapsed-details';
import {Details} from './details/details';
import {FamilyDetails} from './details/family-details';

interface SidePanelProps {
  data: TopolaData;
  selectedIndiId: string;
  config: Config;
  onConfigChange: (config: Config) => void;
  expanded: boolean;
  onToggle: () => void;
}

export function SidePanel({
  data,
  selectedIndiId,
  config,
  onConfigChange,
  expanded,
  onToggle,
}: SidePanelProps) {
  const intl = useIntl();
  const [selectedFamilyId, setSelectedFamilyId] = useState<string | undefined>(undefined);

  const getFamilyLabel = (familyId: string) => {
    const familyEntry = data.gedcom.fams[familyId];
    if (!familyEntry) {
      return familyId;
    }

    const spouseReferences = familyEntry.tree.filter((entry) =>
      ['WIFE', 'HUSB'].includes(entry.tag),
    );
    const spouseNames = spouseReferences
      .map((reference) => {
        const spouse = dereference(reference, data.gedcom, (gedcom) => gedcom.indis);
        const spouseId = spouse.pointer
          ? pointerToId(spouse.pointer)
          : reference.data
          ? pointerToId(reference.data)
          : undefined;
        return getName(spouse) || spouseId;
      })
      .filter(Boolean) as string[];

    const children = familyEntry.tree
      .filter((entry) => entry.tag === 'CHILD')
      .map((entry) => pointerToId(entry.data));

    const label = `${familyId}`;
    const parts = [label];
    
    if (spouseNames.length) {
      parts.push(spouseNames.join(' y '));
    }
    
    if (children.length > 0) {
      parts.push(`(${children.length} hijo${children.length === 1 ? '' : 's'})`);
    }

    return parts.join(' — ');
  };

  const familyOptions = Object.keys(data.gedcom.fams)
    .sort((a, b) => Number(a.substring(1)) - Number(b.substring(1)))
    .map((familyId) => ({
      key: familyId,
      text: getFamilyLabel(familyId),
      value: familyId,
    }));

  const renderFamilyInfo = () => {
    if (!selectedFamilyId) {
      return <Details gedcom={data.gedcom} indi={selectedIndiId} config={config} />;
    }
    return <FamilyDetails gedcom={data.gedcom} fam={selectedFamilyId} />;
  };

  const tabs = [
    {
      menuItem: intl.formatMessage({
        id: 'tab.info',
        defaultMessage: 'Info',
      }),
      render: () => (
        <div>
          <Dropdown
            placeholder={intl.formatMessage({
              id: 'family.select_placeholder',
              defaultMessage: 'Seleccionar familia...',
            })}
            fluid
            search
            selection
            clearable
            options={familyOptions}
            value={selectedFamilyId}
            onChange={(_, data) => setSelectedFamilyId(data.value as string | undefined)}
            style={{ marginBottom: '1rem' }}
          />
          {renderFamilyInfo()}
        </div>
      ),
    },
    {
      menuItem: intl.formatMessage({
        id: 'tab.settings',
        defaultMessage: 'Settings',
      }),
      render: () => (
        <ConfigPanel
          gedcom={data.gedcom}
          config={config}
          onChange={onConfigChange}
        />
      ),
    },
  ];

  return (
    <Sidebar
      id="sidebar"
      animation="overlay"
      icon="labeled"
      width={expanded ? 'wide' : 'very thin'}
      direction="right"
      visible={true}
    >
      {expanded ? (
        <Tab id="sideTabs" panes={tabs} />
      ) : (
        <CollapsedDetails gedcom={data.gedcom} indi={selectedIndiId} />
      )}
      <Button id="sideToggle" icon size="mini" onClick={() => onToggle()}>
        <Icon size="large" name={expanded ? 'arrow right' : 'arrow left'} />
      </Button>
    </Sidebar>
  );
}
