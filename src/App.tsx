import styles from './App.module.css';
import Sidebar from './components/layout/Sidebar';
import MainArea from './components/layout/MainArea';
import FileDropzone from './components/file/FileDropzone';
import SessionTree from './components/file/SessionTree';
import ComparisonModeToggle from './components/selection/ComparisonModeToggle';
import GroupBuilder from './components/selection/GroupBuilder';
import ChartView from './components/chart/ChartView';
import MapView from './components/map/MapView';
import TableView from './components/table/TableView';
import { useUiStore } from './store/ui';

export default function App() {
  const { activeTab, isLoading, parseWarnings } = useUiStore();
  const clearWarnings = useUiStore(s => s.setParseWarnings);

  return (
    <div className={styles.app}>
      <Sidebar>
        <div className={styles.sidebarHeader}>
          <span className={styles.appTitle}>LapAnalyser</span>
          {isLoading && <span className={styles.loading}>Parsing…</span>}
        </div>
        <FileDropzone />
        {parseWarnings.length > 0 && (
          <div className={styles.warnings}>
            {parseWarnings.map((w, i) => <div key={i}>{w}</div>)}
            <button style={{ marginTop: 4, fontSize: 11 }} onClick={() => clearWarnings([])}>Dismiss</button>
          </div>
        )}
        <ComparisonModeToggle />
        <SessionTree />
        <GroupBuilder />
      </Sidebar>
      <MainArea>
        {activeTab === 'chart' && <ChartView />}
        {activeTab === 'map' && <MapView />}
        {activeTab === 'table' && <TableView />}
      </MainArea>
    </div>
  );
}
