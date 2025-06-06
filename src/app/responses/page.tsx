'use client';

import React, { useState, useEffect } from 'react';
import { useAuthGuard } from '@/hooks/useAuthGuard';
import { useUser } from '@/context/UserContext';
import NoAccess from '../components/NoAccess';
import styles from './responses.module.css';
import {
  MdSearch,
  MdDelete,
  MdDownload,
  MdFilterList,
  MdFolder,
  MdFolderOpen,
  MdPictureAsPdf,
  MdChevronRight,
  MdExpandMore,
  MdGridView,
  MdViewList,
  MdContentCopy
} from 'react-icons/md';

interface ResponseItem {
  id: number | string;
  fileName: string;
  fileUrl: string;
  formType: 'avf' | 'bgv';
  createdBy: string;
  createdAt: string;
}

export default function ResponsesPage() {
  useAuthGuard();
  const { user } = useUser();
  const perms = user?.permissions || {};
  const username = user?.username || '';

  // State
  const [responses, setResponses] = useState<ResponseItem[]>([]);
  const [search, setSearch] = useState('');
  const [layout, setLayout] = useState<'grid' | 'list'>('grid');
  const [showFilter, setShowFilter] = useState(false);
  const [filterUser, setFilterUser] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [selected, setSelected] = useState<(string | number)[]>([]);
  const [expanded, setExpanded] = useState<{ [username: string]: boolean }>({});
  const [copiedId, setCopiedId] = useState<string | number | null>(null);

  if (!perms.viewResponses) {
    return <NoAccess message="You do not have access to this page." />;
  }

// Fetch responses from API
async function fetchResponses() {
  const token = localStorage.getItem('token');
  const headers = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    'x-username': user?.username || '',
  };
  const res = await fetch('/api/responses', { headers });
  const data = await res.json();
  setResponses(data.responses || []);
}

  useEffect(() => {
    fetchResponses();
  }, []);

  // Build folder structure: username -> { avf: [], bgv: [] }
  function getFolderStructure() {
    const userFolders = new Set([username, ...(user?.createdUsers || [])]);
    const folders: { [user: string]: { avf: ResponseItem[]; bgv: ResponseItem[] } } = {};
    responses.forEach((resp) => {
      if (!userFolders.has(resp.createdBy)) return;
      if (!folders[resp.createdBy]) {
        folders[resp.createdBy] = { avf: [], bgv: [] };
      }
      if (resp.formType === "avf") folders[resp.createdBy].avf.push(resp);
      if (resp.formType === "bgv") folders[resp.createdBy].bgv.push(resp);
    });
    return folders;
  }
  const folderTree = getFolderStructure();

  // Filter logic (search, filterUser, filterDate)
  let filteredFolders = folderTree;
  if (search.trim() || filterUser || filterDate) {
    filteredFolders = {};
    Object.entries(folderTree).forEach(([user, types]) => {
      if (filterUser && user !== filterUser) return;
      const avf = types.avf.filter(
        (r) =>
          (!search ||
            r.fileName.toLowerCase().includes(search.toLowerCase()) ||
            r.createdBy.toLowerCase().includes(search.toLowerCase())) &&
          (!filterDate || r.createdAt.startsWith(filterDate))
      );
      const bgv = types.bgv.filter(
        (r) =>
          (!search ||
            r.fileName.toLowerCase().includes(search.toLowerCase()) ||
            r.createdBy.toLowerCase().includes(search.toLowerCase())) &&
          (!filterDate || r.createdAt.startsWith(filterDate))
      );
      if (avf.length || bgv.length) {
        filteredFolders[user] = { avf, bgv };
      }
    });
  }

  // Flat list of IDs for bulk select
  const allResponseIds = Object.values(filteredFolders).flatMap(
    (folders) => [...folders.avf, ...folders.bgv].map((r) => r.id)
  );
  const allChecked = selected.length === allResponseIds.length && allResponseIds.length > 0;
  function toggleSelectAll() {
    setSelected(allChecked ? [] : allResponseIds);
  }

  // Handle Delete/Download
  async function handleDelete() {
    if (!perms.deleteResponses || selected.length === 0) return;
    const token = localStorage.getItem('token');
    await fetch('/api/responses', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ ids: selected }),
    });
    setSelected([]);
    fetchResponses();
  }

  async function handleDownload() {
    if (!perms.downloadResponses || selected.length === 0) return;
    // implement download logic if needed
  }

  // For filter dropdowns
  const userList = Object.keys(folderTree);

  // Folder expand/collapse
  function toggleExpand(user: string) {
    setExpanded((prev) => ({ ...prev, [user]: !prev[user] }));
  }

  // Copy PDF link
  function handleCopyLink(link: string, id: string | number) {
    navigator.clipboard.writeText(link);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1200);
  }

  return (
    <div className={styles.responsesPage}>
      {/* TOP BAR */}
      <div className={styles.topActions}>
        <div className={styles.searchWrapper}>
          <MdSearch size={20} />
          <input
            type="text"
            placeholder="Search by file/user…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={styles.searchInput}
          />
        </div>
        <button
          className={styles.actionBtn}
          onClick={handleDelete}
          disabled={!perms.deleteResponses || selected.length === 0}
        >
          <MdDelete /> Delete
        </button>
        <button
          className={styles.actionBtn}
          onClick={() => setLayout((l) => (l === 'grid' ? 'list' : 'grid'))}
        >
          {layout === 'grid' ? <><MdViewList /> List</> : <><MdGridView /> Grid</>}
        </button>
        <button
          className={styles.actionBtn}
          onClick={handleDownload}
          disabled={!perms.downloadResponses || selected.length === 0}
        >
          <MdDownload /> Download
        </button>
        <button
          className={styles.actionBtn}
          onClick={() => setShowFilter((s) => !s)}
        >
          <MdFilterList /> Filter
        </button>
      </div>

      {/* FILTER PANEL */}
      {showFilter && (
        <div className={styles.filterPanel}>
          <label>User:</label>
          <select value={filterUser} onChange={e => setFilterUser(e.target.value)}>
            <option value="">All</option>
            {userList.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
          <label>Date:</label>
          <input
            type="date"
            value={filterDate}
            onChange={e => setFilterDate(e.target.value)}
          />
        </div>
      )}

      {/* FOLDER TREE */}
      <div className={styles.foldersWrapper}>
        <div className={styles.folderHeaderRow}>
          <input type="checkbox" checked={allChecked} onChange={toggleSelectAll} />
          <span style={{marginLeft: 12}}>Select All</span>
        </div>
        {Object.keys(filteredFolders).length === 0 ? (
          <div className={styles.noData}>No Responses Found</div>
        ) : (
          Object.entries(filteredFolders).map(([user, types]) => (
            <div key={user} className={styles.userFolder}>
              <div className={styles.folderHeader} onClick={() => toggleExpand(user)}>
                {expanded[user] ? <MdExpandMore /> : <MdChevronRight />}
                <MdFolder size={28} className={styles.folderIcon} />
                <span className={styles.folderName}>{user}</span>
              </div>
              {expanded[user] && (
                <div className={styles.typeFolders}>
                  {['avf', 'bgv'].map((type) => (
                    <div key={type} className={styles.typeFolder}>
                      <div className={styles.typeHeader}>
                        <MdFolderOpen size={22} className={styles.typeFolderIcon} />
                        <span className={styles.typeFolderName}>{type.toUpperCase()}</span>
                      </div>
                      <div className={layout === 'grid' ? styles.fileGrid : styles.fileList}>
                        {(types as any)[type].length ? (
                          (types as any)[type].map((resp: ResponseItem) => (
                            <div key={resp.id} className={layout === 'grid' ? styles.fileCard : styles.fileRow}>
                              <input
                                type="checkbox"
                                className={styles.cardCheckbox}
                                checked={selected.includes(resp.id)}
                                onChange={() =>
                                  setSelected((prev) =>
                                    prev.includes(resp.id)
                                      ? prev.filter((i) => i !== resp.id)
                                      : [...prev, resp.id]
                                  )
                                }
                              />
                              <MdPictureAsPdf size={layout === 'grid' ? 38 : 22} className={styles.fileIcon} />
                              <div className={styles.fileMeta}>
                                <a
                                  href={resp.fileUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={styles.fileName}
                                >
                                  {resp.fileName}
                                </a>
                                <span className={styles.metaText}>
                                  {new Date(resp.createdAt).toLocaleDateString()} {layout === 'list' && new Date(resp.createdAt).toLocaleTimeString()}
                                </span>
                                <span className={styles.metaText}>By: {resp.createdBy}</span>
                              </div>
                              <button
                                className={styles.copyBtn}
                                onClick={() => handleCopyLink(resp.fileUrl, resp.id)}
                              >
                                <MdContentCopy size={16} />
                                {copiedId === resp.id && <span className={styles.copySuccess}>Copied!</span>}
                              </button>
                            </div>
                          ))
                        ) : (
                          <div className={styles.noData}>No {type.toUpperCase()} Responses</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
