'use client';

import { useAuthGuard } from '@/hooks/useAuthGuard';
import { useUser } from '@/context/UserContext.tsx';
import React, { useState, useEffect } from 'react';
import styles from './forms.module.css';
import { MdClose, MdContentCopy, MdAdd, MdDelete, MdFilterList, MdSort, MdPerson, MdInsertLink, MdCheckCircle, MdRemoveCircle } from 'react-icons/md';
import { FaUserEdit, FaEye, FaTrash, FaPlus, FaFilter } from 'react-icons/fa';

import NoAccess from '../components/NoAccess.tsx';
import { FormLinks } from '@prisma/client';

export default function FormsPage() {
  useAuthGuard();
  const { user } = useUser();
  const perms = user?.permissions || {};
  console.log("user permissions:", perms);

  const [formLinks, setFormLinks] = useState<FormLinks[]>([]); // Added type
  const [selected, setSelected] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [modalStep, setModalStep] = useState<'select' | 'bgv' | 'avf' | 'done'>('select');
  const [formTypeSelected, setFormTypeSelected] = useState<'BGV' | 'AVF' | ''>('');
  const [avfFields, setAvfFields] = useState({
    candidateName: '',
    houseNo: '',
    nearby: '',
    area: '',
    zipCode: '',
    city: '',
    state: '',
    country: 'India'
  });
  const [generatedLink, setGeneratedLink] = useState('');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [filterUser, setFilterUser] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  // 1. PERMISSION CHECK
  if (!perms.viewForms) return <NoAccess message="You do not have access to this page." />;

  // 2. FETCH DATA FROM API
  async function fetchFormLinks() {
    const token = localStorage.getItem('token');
    const res = await fetch('/api/form-links', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    const data = await res.json();
    setFormLinks(data.links || []);
  }
  useEffect(() => { fetchFormLinks(); }, []);

  // 3. HANDLE SEARCH, FILTER, SORT
  const filteredLinks = formLinks // Type assertion removed, type applied to state
    .filter(link =>
      (link.token?.toLowerCase().includes(search.toLowerCase()) ||
        link.createdBy?.toLowerCase().includes(search.toLowerCase()) ||
        link.candidateName?.toLowerCase().includes(search.toLowerCase()))
    )
    .filter(link => !filterUser || link.createdBy === filterUser)
    .filter(link => !filterType || link.formType === filterType)
    .filter(link => !filterDate || (link.createdAt && new Date(link.createdAt).toISOString().startsWith(filterDate))) // Ensure createdAt is treated as Date
    .sort((a, b) => {
      const aDate = new Date(a.createdAt).getTime();
      const bDate = new Date(b.createdAt).getTime();
      return sortOrder === 'newest' ? bDate - aDate : aDate - bDate;
    });


  // 4. HANDLE CREATE LINK (API)
  async function handleCreateBGV() {
    if (!perms.createForms || !perms.createFormBGV) return;
    const token = localStorage.getItem('token');
    const res = await fetch('/api/form-links', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        formType: 'BGV',
        createdBy: user.username
        // Add other BGV specific fields if any, from a different state variable like bgvFields
      })
    });
    const data = await res.json();
    if (data.ok && data.link) {
      setGeneratedLink(data.link.token);
      setModalStep('done');
      fetchFormLinks();
    }
  }

  async function handleCreateAVF() {
    if (!perms.createForms || !perms.createFormAVF) return;
    const token = localStorage.getItem('token');
    const res = await fetch('/api/form-links', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        formType: 'AVF',
        createdBy: user.username,
        ...avfFields
      })
    });
    const data = await res.json();
    if (data.ok && data.link) {
      setGeneratedLink(data.link.token);
      setModalStep('done');
      fetchFormLinks();
    }
  }

  // 5. HANDLE DELETE (BULK)
  async function handleDelete() {
    if (!perms.deleteFormLinks || selected.length === 0) return;
    const token = localStorage.getItem('token');
    await fetch('/api/form-links', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ ids: selected }),
    });
    setSelected([]);
    fetchFormLinks();
  }

  // 6. COPY LOGIC
  function handleCopy(text: string, idx: number | null) { // Added type for text
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 1400);
  }

  // 7. Unique Filter Options
  const userList = Array.from(new Set(formLinks.map(l => l.createdBy))).filter(Boolean);
  const typeList = ['BGV', 'AVF'];

  // 8. Table Selection Logic
  const allChecked = selected.length === filteredLinks.length && filteredLinks.length > 0;

  return (
    <div className={styles.formsPage}>
      {/* TOP BAR */}
      <div className={styles.topActions}>
        <input
          type="text"
          placeholder="Search by link/user/candidate…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className={styles.searchInput}
        />
        <button
          className={styles.actionBtn}
          disabled={!perms.createForms}
          onClick={() => {
            setShowCreateModal(true);
            setModalStep('select'); // Reset modal to select step
            setFormTypeSelected('');
            setGeneratedLink('');
          }}
        >
          <FaPlus /> Create
        </button>
        <button
          className={styles.actionBtn}
          disabled={!perms.deleteFormLinks || selected.length === 0}
          onClick={handleDelete}
        >
          <FaTrash /> Delete
        </button>
        <button
          className={styles.actionBtn}
          onClick={() => setSortOrder(s => (s === 'newest' ? 'oldest' : 'newest'))}
        >
          <MdSort /> {sortOrder === 'newest' ? "Newest" : "Oldest"}
        </button>
        <button
          className={styles.actionBtn}
          onClick={() => setShowFilterModal(true)}
        >
          <FaFilter /> Filter
        </button>
      </div>

      {/* FILTER MODAL */}
      {showFilterModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div style={{ display: 'flex', justifyContent: "space-between", alignItems: "center" }}>
              <h3>Filter Forms</h3>
              <button className={styles.closeBtn} onClick={() => setShowFilterModal(false)}>
                <MdClose size={22} />
              </button>
            </div>
            <label>User:</label>
            <select value={filterUser} onChange={e => setFilterUser(e.target.value)}>
              <option value="">All</option>
              {userList.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
            <label>Form Type:</label>
            <select value={filterType} onChange={e => setFilterType(e.target.value)}>
              <option value="">All</option>
              {typeList.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
            <label>Date:</label>
            <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} />
            <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button className={styles.filterModalBtn} onClick={() => setShowFilterModal(false)}>
                Cancel
              </button>
              <button className={styles.filterModalBtn} onClick={() => setShowFilterModal(false)}>
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE MODAL */}
      {showCreateModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div style={{ display: 'flex', justifyContent: "space-between", alignItems: "center" }}>
              <h3>
                {modalStep === 'select' && "Select Form Type"}
                {modalStep === 'bgv' && "Background Verification Form"}
                {modalStep === 'avf' && "Digital Address Verification Form"} {/* Corrected typo */}
                {modalStep === 'done' && (formTypeSelected === 'BGV'
                  ? "Background Verification Form"
                  : "Digital Address Verification Form")}
              </h3>
              <button className={styles.closeBtn} onClick={() => {
                setShowCreateModal(false);
                setModalStep('select');
                setFormTypeSelected('');
                setGeneratedLink('');
                setAvfFields({ candidateName: '', houseNo: '', nearby: '', area: '', zipCode: '', city: '', state: '', country: 'India' });
              }}>
                <MdClose size={22} />
              </button>
            </div>
            {/* Modal Steps */}
            {modalStep === 'select' && (
              <div style={{ display: "flex", gap: 20, justifyContent: "center", margin: "24px 0" }}>
                <button
                  className={styles.modalBtn}
                  disabled={!perms.createFormBGV}
                  onClick={() => { setFormTypeSelected('BGV'); setModalStep('bgv'); }}>
                  <MdInsertLink size={19} /> BGV
                </button>
                <button
                  className={styles.modalBtn}
                  disabled={!perms.createFormAVF}
                  onClick={() => { setFormTypeSelected('AVF'); setModalStep('avf'); }}>
                  <MdPerson size={18} /> AVF
                </button>
              </div>
            )}
            {/* BGV Link Generation */}
            {modalStep === 'bgv' && (
              <div style={{ textAlign: "center", margin: "32px 0" }}>
                {/* You might want to add fields for BGV candidate name here if needed */}
                {/* For now, it only sends formType and createdBy */}
                <button className={styles.createBtn} onClick={handleCreateBGV}>
                  <MdCheckCircle /> Create BGV Link
                </button>
              </div>
            )}
            {/* AVF Fields */}
            {modalStep === 'avf' && (
              <form
                onSubmit={e => { e.preventDefault(); handleCreateAVF(); }}
                style={{ display: "flex", flexDirection: "column", gap: 12, margin: "18px 0" }}>
                <input
                  className={styles.modalInput}
                  placeholder="Candidate Name"
                  value={avfFields.candidateName}
                  onChange={e => setAvfFields(f => ({ ...f, candidateName: e.target.value }))}
                  required
                />
                <input
                  className={styles.modalInput}
                  placeholder="House/Flat/Society No"
                  value={avfFields.houseNo}
                  onChange={e => setAvfFields(f => ({ ...f, houseNo: e.target.value }))}
                  required
                />
                <input
                  className={styles.modalInput}
                  placeholder="Nearby Location"
                  value={avfFields.nearby}
                  onChange={e => setAvfFields(f => ({ ...f, nearby: e.target.value }))}
                  required
                />
                <input
                  className={styles.modalInput}
                  placeholder="Area"
                  value={avfFields.area}
                  onChange={e => setAvfFields(f => ({ ...f, area: e.target.value }))}
                  required
                />
                <input
                  className={styles.modalInput}
                  placeholder="Zip Code"
                  value={avfFields.zipCode}
                  onChange={e => setAvfFields(f => ({ ...f, zipCode: e.target.value }))}
                  required
                />
                <input
                  className={styles.modalInput}
                  placeholder="City"
                  value={avfFields.city}
                  onChange={e => setAvfFields(f => ({ ...f, city: e.target.value }))}
                  required
                />
                <input
                  className={styles.modalInput}
                  placeholder="State"
                  value={avfFields.state}
                  onChange={e => setAvfFields(f => ({ ...f, state: e.target.value }))}
                  required
                />
                <input
                  className={styles.modalInput}
                  placeholder="Country"
                  value={avfFields.country}
                  onChange={e => setAvfFields(f => ({ ...f, country: e.target.value }))}
                  required
                />
                <button type="submit" className={styles.createBtn}>
                  <MdCheckCircle /> Create AVF Link
                </button>
              </form>
            )}
            {/* Link Generated (After Create) */}
            {modalStep === 'done' && (
              <div className={styles.linkBox}>
                {(() => {
                  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
                  let formPath = '';
                  // Determine formPath based on formTypeSelected which was set before calling handleCreateBGV/AVF
                  if (formTypeSelected === 'AVF') {
                    formPath = '/avf';
                  } else if (formTypeSelected === 'BGV') {
                    formPath = '/bgv';
                  }
                  const fullLink = generatedLink && formPath ? `${baseUrl}${formPath}?id=${generatedLink}` : 'Error generating link';
                  return (
                    <>
                      <input type="text" readOnly value={fullLink} className={styles.linkInput} />
                      <button onClick={() => handleCopy(fullLink, 999)} className={styles.copyIcon}>
                        <MdContentCopy size={20} />
                      </button>
                      {copiedIdx === 999 && <span className={styles.copySuccess}>Copied!</span>}
                    </>
                  );
                })()}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TABLE */}
      <div className={styles.tableWrapper}>
        <table className={styles.formsTable}>
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  onChange={() =>
                    setSelected(allChecked ? [] : filteredLinks.map((l) => l.id))
                  }
                  checked={allChecked}
                />
              </th>
              <th>Form</th>
              <th>Link</th>
              <th>User</th>
              <th>Date</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredLinks.length ? filteredLinks.map((form, idx) => (
              <tr key={form.id}>
                <td>
                  <input
                    type="checkbox"
                    checked={selected.includes(String(form.id))}
                    onChange={() =>
                      setSelected((s) =>
                        s.includes(String(form.id))
                          ? s.filter((i) => i !== String(form.id))
                          : [...s, String(form.id)]
                      )
                    }
                  />
                </td>
                <td>{form.formType}</td>
                <td>
                  {(() => {
                    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
                    let formDisplayPath = '';
                    // Determine path based on the form's actual type
                    if (form.formType === 'AVF') {
                      formDisplayPath = '/avf';
                    } else if (form.formType === 'BGV') {
                      formDisplayPath = '/bgv';
                    }
                    // Fallback if form.token is somehow null/undefined
                    const tokenPart = form.token ? `?id=${form.token}` : '';
                    const fullLink = formDisplayPath && tokenPart ? `${baseUrl}${formDisplayPath}${tokenPart}` : `${baseUrl}/?error=invalid_link`;

                    return (
                      <>
                        <a
                          href={fullLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ fontSize: 14, fontWeight: 500, textDecoration: "underline" }}
                        >
                          {form.token ? `${form.token.slice(0, 10)}...` : 'Invalid Token'}
                        </a>
                        <button
                          className={styles.copyIcon}
                          onClick={() => handleCopy(fullLink, idx)}
                        >
                          <MdContentCopy size={16} />
                        </button>
                        {copiedIdx === idx && <span className={styles.copySuccess}>Copied!</span>}
                      </>
                    );
                  })()}
                </td>
                <td>{form.createdBy}</td>
                <td>{form.createdAt ? new Date(form.createdAt).toLocaleDateString() : ''}</td>
                <td>
                  <span
                    className={styles.statusDot + ' ' +
                      (form.status === 'Not clicked' ? styles.notClicked :
                        form.status === 'clicked' ? styles.clicked :
                          form.status === 'submitted' ? styles.submitted : styles.expired)}
                  />{" "}
                  {form.status}
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={6} className={styles.noData}>
                  No Forms Found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}