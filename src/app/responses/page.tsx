'use client';

import React, { useState, useEffect } from 'react';
import { useAuthGuard } from '@/hooks/useAuthGuard';
import { useUser } from '@/context/UserContext';
import NoAccess from '../components/NoAccess';
import styles from './responses.module.css';
import {
  MdSearch,
  MdDelete,
  MdViewModule,
  MdViewList,
  MdDownload,
  MdFilterList,
  MdFolder,
  MdPictureAsPdf,
} from 'react-icons/md';

interface ResponseItem {
  id: number;
  fileName: string;
  createdBy: string;
  createdAt: string; // ISO string
  // any other fields your API returns, e.g. status, etc.
}

export default function ResponsesPage() {
  useAuthGuard();
  const { user } = useUser();
  const perms = user?.permissions || {};
  const role = user?.role || '';

  const [responses, setResponses] = useState<ResponseItem[]>([]);
  const [filtered, setFiltered] = useState<ResponseItem[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [search, setSearch] = useState('');
  const [layout, setLayout] = useState<'grid' | 'list'>('grid');
  const [showFilter, setShowFilter] = useState(false);
  const [filterUser, setFilterUser] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  // 1. PERMISSION CHECK
  if (!perms.viewResponses) {
    return <NoAccess message="You do not have access to this page." />;
  }

  // 2. FETCH ALL RESPONSES
  async function fetchResponses() {
    const token = localStorage.getItem('token');
    const res = await fetch('/api/responses', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    const data = await res.json();
    let items: ResponseItem[] = data.responses || [];
    // If user is admin, filter to only those they created
    if (role === 'admin') {
      items = items.filter((r) => r.createdBy === user.username);
    }
    setResponses(items);
  }

  useEffect(() => {
    fetchResponses();
  }, []);

  // 3. SEARCH / FILTER / SORT LOGIC
  useEffect(() => {
    let temp = [...responses];
    // Search (by fileName or createdBy)
    if (search.trim()) {
      temp = temp.filter(
        (r) =>
          r.fileName.toLowerCase().includes(search.toLowerCase()) ||
          r.createdBy.toLowerCase().includes(search.toLowerCase())
      );
    }
    // Filter by user
    if (filterUser) {
      temp = temp.filter((r) => r.createdBy === filterUser);
    }
    // Filter by date (YYYY-MM-DD)
    if (filterDate) {
      temp = temp.filter((r) => r.createdAt.startsWith(filterDate));
    }
    setFiltered(temp);
    // Reset selected if needed
    setSelected((prev) =>
      prev.filter((id) => temp.some((r) => r.id === id))
    );
  }, [responses, search, filterUser, filterDate]);

  // 4. HANDLE DELETE (BULK)
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

  // 5. HANDLE DOWNLOAD (BULK)
  async function handleDownload() {
    if (!perms.downloadResponses || selected.length === 0) return;
    const token = localStorage.getItem('token');
    // Example: POST to /api/responses/download which returns a ZIP or triggers DL
    const res = await fetch('/api/responses/download', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ ids: selected }),
    });
    if (res.ok) {
      // If the endpoint streams a file, you might need to handle blob:
      // const blob = await res.blob();
      // const url = window.URL.createObjectURL(blob);
      // const a = document.createElement('a');
      // a.href = url;
      // a.download = 'responses.zip';
      // a.click();
      // window.URL.revokeObjectURL(url);
    }
  }

  // 6. UNIQUE USER LIST (for filter dropdown)
  const userList = Array.from(new Set(responses.map((r) => r.createdBy))).filter(
    Boolean
  );

  // 7. SELECT ALL LOGIC
  const allChecked =
    selected.length === filtered.length && filtered.length > 0;
  function toggleSelectAll() {
    if (allChecked) {
      setSelected([]);
    } else {
      setSelected(filtered.map((r) => r.id));
    }
  }

  // 8. COPY LINK (for individual download link, if needed)
  function handleCopyLink(link: string, idx: number) {
    navigator.clipboard.writeText(link);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 1400);
  }

  return (
    <div className={styles.responsesPage}>
      {/* TOP ACTION BAR */}
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
          onClick={() =>
            setLayout((l) => (l === 'grid' ? 'list' : 'grid'))
          }
        >
          {layout === 'grid' ? (
            <>
              <MdViewList /> List
            </>
          ) : (
            <>
              <MdViewModule /> Grid
            </>
          )}
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
          <select
            value={filterUser}
            onChange={(e) => setFilterUser(e.target.value)}
          >
            <option value="">All</option>
            {userList.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>

          <label>Date:</label>
          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
          />
        </div>
      )}

      {/* RESPONSES LIST/GRID */}
      {layout === 'grid' ? (
        <div className={styles.gridWrapper}>
          <div className={styles.gridHeader}>
            <input
              type="checkbox"
              checked={allChecked}
              onChange={toggleSelectAll}
            />
            <span>Select All</span>
          </div>
          <div className={styles.gridContainer}>
            {filtered.length ? (
              filtered.map((resp, idx) => (
                <div key={resp.id} className={styles.card}>
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
                  <MdFolder size={48} className={styles.folderIcon} />
                  <div className={styles.cardInfo}>
                    <span className={styles.fileName}>
                      {resp.fileName}
                    </span>
                    <span className={styles.metaText}>
                      {new Date(resp.createdAt).toLocaleDateString()}{' '}
                      {new Date(resp.createdAt).toLocaleTimeString()}
                    </span>
                    <span className={styles.metaText}>By: {resp.createdBy}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className={styles.noData}>No Responses Found</div>
            )}
          </div>
        </div>
      ) : (
        <div className={styles.listWrapper}>
          <table className={styles.listTable}>
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    checked={allChecked}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th>File</th>
                <th>Name</th>
                <th>Date</th>
                <th>User</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length ? (
                filtered.map((resp, idx) => (
                  <tr key={resp.id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selected.includes(resp.id)}
                        onChange={() =>
                          setSelected((prev) =>
                            prev.includes(resp.id)
                              ? prev.filter((i) => i !== resp.id)
                              : [...prev, resp.id]
                          )
                        }
                      />
                    </td>
                    <td>
                      <MdPictureAsPdf size={24} />
                    </td>
                    <td>{resp.fileName}</td>
                    <td>
                      {new Date(resp.createdAt).toLocaleDateString()}{' '}
                      {new Date(resp.createdAt).toLocaleTimeString()}
                    </td>
                    <td>{resp.createdBy}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className={styles.noData}>
                    No Responses Found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
