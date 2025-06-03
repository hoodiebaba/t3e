'use client';

import React, { useState, useEffect } from 'react';
import styles from './users.module.css';
import { FaUserEdit, FaEye, FaTrash, FaPlus, FaFilter } from 'react-icons/fa';
import { useUser } from '@/context/UserContext';
import { useRouter } from 'next/navigation';
import { useAuthGuard } from "@/hooks/useAuthGuard"; // <-- Uncomment karo jahan hook bana ho
import NoAccess from '../components/NoAccess';
type User = {
  id: number;
  username: string;
  email: string;
  phone: string;
  createdBy: string;
  createdAt: string;
  role: 'SUDO' | 'ADMIN';
  permissions: Record<string, boolean>;
};

function hasPageAccess(user: User | null) {
  return user?.permissions?.viewUsers || user?.role === 'SUDO';
}

export default function UsersPage() {
  useAuthGuard(); // Enable if you have useAuthGuard

  const { user } = useUser();
function hasPageAccess(user: User | null | undefined) {
  if (!user) return false;
  return user.permissions?.viewUsers || user.role === 'SUDO';
}
  const loginUserPerms = user?.permissions || {};
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<number[]>([]);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filterByCreated, setFilterByCreated] = useState('');
  const [filterByDate, setFilterByDate] = useState('');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [step, setStep] = useState(1);
  const [createForm, setCreateForm] = useState({
    username: '', email: '', phone: '', password: '', role: 'ADMIN' as 'ADMIN' | 'SUDO'
  });
  const [permToggles, setPermToggles] = useState<Record<string, boolean>>({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Edit Permission Modal State
  const [editUser, setEditUser] = useState<User | null>(null);
  const [editPermToggles, setEditPermToggles] = useState<Record<string, boolean>>({});
  const [editPermPage, setEditPermPage] = useState(0);
  useEffect(() => { if (editUser) setEditPermPage(0); }, [editUser]);

  // ========== 1. USERS FILTERED BY PERMISSION ================
  // SUDO = all users, ADMIN = only own created users
  const visibleUsers = user?.role === 'SUDO'
    ? users
    : users.filter(u => u.createdBy === user?.username);

  // ========== 2. SEARCH + FILTER ===========
  const filteredUsers = visibleUsers
    .filter(u => u.username.toLowerCase().includes(search.toLowerCase()))
    .filter(u => !filterByCreated || u.createdBy === filterByCreated)
    .filter(u => !filterByDate || u.createdAt.startsWith(filterByDate));
  const sortedUsers = [...filteredUsers].sort((a, b) =>
    sortOrder === 'newest'
      ? new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      : new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  // ========== 3. FETCH USERS ================
  async function fetchUsers() {
    const token = localStorage.getItem('token');
    const res = await fetch('/api/users', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    const data = await res.json();
    setUsers(data.users || []);
  }
  useEffect(() => { fetchUsers(); }, []);

  // ========== 4. BUTTON + ACTIONS ===========
  // Select All
  const handleSelectAll = () => {
    if (selected.length === sortedUsers.length) setSelected([]);
    else setSelected(sortedUsers.map(u => u.id));
  };
  const handleSelect = (id: number) => {
    setSelected(sel => sel.includes(id) ? sel.filter(i => i !== id) : [...sel, id]);
  };

  // Delete
  const handleDelete = async () => {
    if (!loginUserPerms.deleteUser) return alert("You do not have access to delete users.");
    if (!selected.length) return;
    if (!window.confirm(`Delete ${selected.length} users?`)) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/users', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ ids: selected }),
      });
      const data = await res.json();
      if (data.ok) {
        setSuccess('Users deleted!');
        setSelected([]);
        fetchUsers();
      } else {
        setError(data.error || 'Failed to delete');
      }
    } catch {
      setError('Network/server error');
    }
  };

 // Login As User
const handleLoginAs = async (targetUserId: string) => {
  if (!loginUserPerms.loginAsUser) return alert("You do not have access to login as another user.");
  if (!window.confirm('Are you sure you want to login as this user?')) return;
  const token = localStorage.getItem('token');
  const res = await fetch('/api/users/login-as', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ targetUserId }), // string
  });
  const data = await res.json();
  if (data.ok && data.token) {
    localStorage.removeItem('token');
    localStorage.setItem('token', data.token);
    window.location.href = "/dashboard";
  } else {
    alert(data.error || 'Login as failed');
  }
};

  // Edit Permission Modal
  const handleEditPermissions = (targetUser: User) => {
    if (!loginUserPerms.editUser) return alert("You do not have access to edit user permissions.");
    // Only those perms jo login user ke paas hain
    const myPerms = user?.permissions || {};
    const editablePerms = Object.keys(myPerms).filter(perm => myPerms[perm]);
    const toggles: Record<string, boolean> = {};
    editablePerms.forEach(perm => {
      toggles[perm] = !!targetUser.permissions[perm];
    });
    setEditUser(targetUser);
    setEditPermToggles(toggles);
  };

  const handleSavePermissions = async () => {
    if (!editUser) return;
    if (!loginUserPerms.editUser) return alert("You do not have access to edit permissions.");
    const token = localStorage.getItem('token');
    const res = await fetch(`/api/users/permissions`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        userId: editUser.id,
        permissions: editPermToggles,
      }),
    });
    const data = await res.json();
    if (data.ok) {
      setEditUser(null);
      fetchUsers();
    } else {
      alert(data.error || 'Failed to update permissions');
    }
  };

  // Create User Modal
  const openCreateModal = () => {
    setError('');
    setSuccess('');
    if (!loginUserPerms.createUser) {
      alert("You do not have access to create users.");
      return;
    }
    setStep(1);
    setCreateForm({ username: '', email: '', phone: '', password: '', role: 'ADMIN' });
    setPermToggles(user?.permissions || {}); // Only own perms
    setShowCreateModal(true);
  };
  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    setStep(2);
  };
  const togglePerm = (perm: string) =>
    setPermToggles(t => ({ ...t, [perm]: !t[perm] }));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!loginUserPerms.createUser) return alert("You do not have access to create users.");
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          ...createForm,
          permissions: permToggles,
          createdBy: user?.username,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setSuccess('User created!');
        setShowCreateModal(false);
        fetchUsers();
      } else {
        setError(data.error || 'Failed to create user');
      }
    } catch {
      setError('Network/server error');
    }
  };

 
  // --- Dropdown filter options
  const uniqueCreators = Array.from(new Set(visibleUsers.map(u => u.createdBy)));
  const uniqueDates = Array.from(new Set(visibleUsers.map(u => u.createdAt.split(' ')[0])));

  // ========== UI ================
  return (
    <div className={styles.pageWrapper}>
      <div className={styles.topActions}>
        <input
          type="text"
          placeholder="Search users..."
          className={styles.searchInput}
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <button
          className={styles.actionBtn}
          onClick={openCreateModal}
          disabled={!loginUserPerms.createUser}
          title={!loginUserPerms.createUser ? "No access" : ""}
        >
          <FaPlus /> Create
        </button>
        <button
          className={styles.actionBtn}
          onClick={handleDelete}
          disabled={!loginUserPerms.deleteUser || selected.length === 0}
          title={!loginUserPerms.deleteUser ? "No access" : ""}
        >
          <FaTrash /> Delete
        </button>
        <select
          value={sortOrder}
          onChange={e => setSortOrder(e.target.value as 'newest' | 'oldest')}
          className={styles.actionBtn}
          style={{ minWidth: 110 }}
        >
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
        </select>
        <button
          className={styles.actionBtn}
          onClick={() => setShowFilterModal(true)}
        >
          <FaFilter /> Filter
        </button>
      </div>

      {/* Filter Modal */}
      {showFilterModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h3>Filter Users</h3>
            <label>Created By:</label>
            <select value={filterByCreated} onChange={e => setFilterByCreated(e.target.value)}>
              <option value="">All</option>
              {uniqueCreators.map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
            <label>Date:</label>
            <select value={filterByDate} onChange={e => setFilterByDate(e.target.value)}>
              <option value="">All</option>
              {uniqueDates.map(date => (
                <option key={date} value={date}>{date}</option>
              ))}
            </select>
            <div style={{ display: 'flex', gap: 12, marginTop: 18 }}>
              <button
                className={styles.actionBtn}
                onClick={() => setShowFilterModal(false)}
              >
                Apply
              </button>
              <button
                className={styles.actionBtn}
                onClick={() => {
                  setFilterByCreated('');
                  setFilterByDate('');
                  setShowFilterModal(false);
                }}
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE USER MODAL */}
      {showCreateModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            {step === 1 ? (
              <form onSubmit={handleNext}>
                <h3>Create User</h3>
                <input
                  type="text"
                  placeholder="Username"
                  value={createForm.username}
                  required
                  onChange={e => setCreateForm(f => ({ ...f, username: e.target.value }))}
                />
                <input
                  type="email"
                  placeholder="Email"
                  value={createForm.email}
                  required
                  onChange={e => setCreateForm(f => ({ ...f, email: e.target.value }))}
                />
                <input
                  type="text"
                  placeholder="Phone"
                  value={createForm.phone}
                  required
                  onChange={e => setCreateForm(f => ({ ...f, phone: e.target.value }))}
                />
                <input
                  type="password"
                  placeholder="Password"
                  value={createForm.password}
                  required
                  onChange={e => setCreateForm(f => ({ ...f, password: e.target.value }))}
                />
                <select
                  value={createForm.role}
                  onChange={e => setCreateForm(f => ({ ...f, role: e.target.value as 'ADMIN' | 'SUDO' }))}
                >
                  <option value="ADMIN">Admin</option>
                  <option value="SUDO">Super Admin</option>
                </select>
                <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
                  <button className={styles.actionBtn} type="submit">Next</button>
                  <button className={styles.actionBtn} type="button" onClick={() => setShowCreateModal(false)}>Close</button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleSave}>
                <h4>Set Permissions</h4>
                <div className={styles.permsList}>
                  {user && Object.keys(user.permissions || {})
                    .filter(perm => user.permissions[perm])
                    .map(perm => (
                      <div key={perm} className={styles.permToggle}>
                        <label>
                          <input
                            type="checkbox"
                            checked={!!permToggles[perm]}
                            onChange={() => togglePerm(perm)}
                          />
                          {perm}
                        </label>
                      </div>
                    ))}
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
                  <button className={styles.actionBtn} type="submit">Save</button>
                  <button className={styles.actionBtn} type="button" onClick={() => setShowCreateModal(false)}>Close</button>
                </div>
                {error && <div className={styles.errorMsg}>{error}</div>}
                {success && <div className={styles.successMsg}>{success}</div>}
              </form>
            )}
            {error && <div className={styles.errorMsg}>{error}</div>}
            {success && <div className={styles.successMsg}>{success}</div>}
          </div>
        </div>
      )}

      {/* EDIT PERMISSIONS MODAL */}
      {editUser && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent} style={{ maxWidth: 520 }}>
            <h3 style={{ textAlign: "center", fontWeight: 600, fontSize: "1.21rem", letterSpacing: "1px" }}>
              Edit Permissions: {editUser.username}
            </h3>
            {/* Permission Step Pagination */}
            {(() => {
              const perms = Object.keys(editPermToggles);
              const permsPerPage = 5;
              const totalPages = Math.ceil(perms.length / permsPerPage);
              const start = editPermPage * permsPerPage;
              const end = start + permsPerPage;
              const permsToShow = perms.slice(start, end);

              return (
                <>
                  <div
                    className={styles.permEditCard}
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 16,
                      justifyContent: "center",
                      minHeight: 210,
                      marginBottom: 10,
                    }}
                  >
                    {permsToShow.map((perm) => (
                      <label
                        key={perm}
                        className={styles.permCheckLabel}
                        style={{
                          opacity: loginUserPerms[perm] ? 1 : 0.55,
                          minWidth: 200,
                          padding: "13px 14px",
                          borderRadius: "20px",
                          background: "#faf8fc",
                          fontWeight: 600,
                          fontSize: "1.08rem",
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          marginBottom: 0,
                          cursor: loginUserPerms[perm] ? "pointer" : "not-allowed",
                        }}
                        title={perm}
                      >
                        <input
                          type="checkbox"
                          checked={editPermToggles[perm]}
                          onChange={() =>
                            loginUserPerms[perm] &&
                            setEditPermToggles((tp) => ({
                              ...tp,
                              [perm]: !tp[perm],
                            }))
                          }
                          disabled={!loginUserPerms[perm]}
                          style={{ marginRight: 6, accentColor: "#5128f5" }}
                        />
                        {perm}
                      </label>
                    ))}
                  </div>
                  {/* Pagination Controls */}
                  <div style={{ display: "flex", justifyContent: "center", gap: 16, margin: "12px 0" }}>
                    <button
                      className={styles.actionBtn}
                      style={{ minWidth: 80, opacity: editPermPage === 0 ? 0.45 : 1 }}
                      disabled={editPermPage === 0}
                      onClick={() => setEditPermPage((p) => Math.max(0, p - 1))}
                      type="button"
                    >
                      Back
                    </button>
                    <div style={{ fontWeight: 500, fontSize: 15, margin: "0 6px" }}>
                      Page {editPermPage + 1} of {totalPages}
                    </div>
                    <button
                      className={styles.actionBtn}
                      style={{ minWidth: 80, opacity: editPermPage === totalPages - 1 ? 0.45 : 1 }}
                      disabled={editPermPage === totalPages - 1}
                      onClick={() => setEditPermPage((p) => Math.min(totalPages - 1, p + 1))}
                      type="button"
                    >
                      Next
                    </button>
                  </div>
                  {/* Actions */}
                  <div style={{ display: "flex", gap: 18, justifyContent: "center", marginTop: 18 }}>
                    <button className={styles.cancelBtn} type="button" onClick={() => setEditUser(null)}>
                      Cancel
                    </button>
                    <button
                      className={styles.saveBtn}
                      type="button"
                      onClick={async () => { await handleSavePermissions(); }}
                    >
                      Save
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* TABLE */}
      <div className={styles.tableWrapper}>
        <table className={styles.userTable}>
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  checked={selected.length > 0 && selected.length === sortedUsers.length}
                  onChange={handleSelectAll}
                />
              </th>
              <th>Username</th>
              <th>Created By</th>
              <th>Date/Time</th>
              <th>Edit</th>
              <th>Login as</th>
            </tr>
          </thead>
          <tbody>
            {sortedUsers.length ? (
              sortedUsers.map(u => (
                <tr key={u.id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selected.includes(u.id)}
                      onChange={() => handleSelect(u.id)}
                    />
                  </td>
                  <td>{u.username}</td>
                  <td>{u.createdBy}</td>
                  <td>{u.createdAt.split('T')[0]}</td>
                  <td>
                    <button
                      className={styles.iconBtn}
                      title={!loginUserPerms.editUser ? "No access" : "Edit Permissions"}
                      style={{ opacity: loginUserPerms.editUser ? 1 : 0.55, cursor: loginUserPerms.editUser ? 'pointer' : 'not-allowed' }}
                      disabled={!loginUserPerms.editUser}
                      onClick={() => loginUserPerms.editUser ? handleEditPermissions(u) : alert("You do not have access to edit user permissions.")}
                    >
                      <FaUserEdit />
                    </button>
                  </td>
                  <td>
                    <button
                      className={styles.iconBtn}
                      title={!loginUserPerms.loginAsUser ? "No access" : "Login as"}
                      style={{ opacity: loginUserPerms.loginAsUser ? 1 : 0.55, cursor: loginUserPerms.loginAsUser ? 'pointer' : 'not-allowed' }}
                      disabled={!loginUserPerms.loginAsUser}
                      onClick={() =>
  loginUserPerms.loginAsUser
    ? handleLoginAs(String(u.id))
    : alert("You do not have access to login as another user.")
}

                    >
                      <FaEye />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className={styles.noData}>
                  No users found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
