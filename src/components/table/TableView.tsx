import { useState } from 'react';
import styles from './TableView.module.css';
import { useCombinedLaps } from '../../hooks/useCombinedLaps';
import LapSummaryTable from './LapSummaryTable';
import EventTable from './EventTable';
import SectorSplitTable from './SectorSplitTable';

type SubTab = 'summary' | 'events' | 'sectors';

export default function TableView() {
  const selectedLaps = useCombinedLaps();
  const [subTab, setSubTab] = useState<SubTab>('summary');

  return (
    <div className={styles.wrap}>
      <div className={styles.subTabs}>
        {(['summary', 'events', 'sectors'] as SubTab[]).map(t => (
          <button
            key={t}
            className={subTab === t ? 'active' : ''}
            onClick={() => setSubTab(t)}
          >
            {t === 'summary' ? 'Lap Summary' : t === 'events' ? 'Events' : 'Sectors'}
          </button>
        ))}
      </div>
      <div className={styles.content}>
        {subTab === 'summary' && <LapSummaryTable selectedLaps={selectedLaps} />}
        {subTab === 'events' && <EventTable selectedLaps={selectedLaps} />}
        {subTab === 'sectors' && <SectorSplitTable selectedLaps={selectedLaps} />}
      </div>
    </div>
  );
}
