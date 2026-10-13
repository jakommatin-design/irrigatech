import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSensors } from '../context/SensorContext';
import { isProfilePhoto } from '../utils/avatar';
import { 
  User, Building2, Sprout, ShieldCheck, Key, 
  LogOut, CheckCircle2, ChevronRight, Plus, Droplets,
  Edit2, Trash2, X, Save, RefreshCw, Users, Mail, Phone, MapPin
} from 'lucide-react';

export default function AccountPortal() {
  const { 
    user, farms, users, switchFarm, switchCrop, logout,
    isAuthenticated,
    deleteMyAccount,
    addFarm, updateFarm, deleteFarm,
    addUser, updateUser, deleteUser, getApiUrl, authHeaders, refreshData
  } = useAuth();
  const { setThreshold } = useSensors();
  const farmList = Array.isArray(farms) ? farms : [];
  const teamMembers = Array.isArray(users) ? users : [];
  const cropList = Array.isArray(user?.crops) ? user.crops : [];
  const canManageAccounts = isAuthenticated && ['farm owner & operator', 'chief agronomist & admin', 'chief agronomist', 'admin'].includes(String(user?.role || '').toLowerCase());
  const [isDeleting, setIsDeleting] = useState(false);
  const [actionError, setActionError] = useState('');
  const [profilePhotoFile, setProfilePhotoFile] = useState(null);
  const [profilePhotoPreview, setProfilePhotoPreview] = useState('');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [connectionCode, setConnectionCode] = useState('');
  const [connectionRequests, setConnectionRequests] = useState([]);
  const [pendingConnectionRequests, setPendingConnectionRequests] = useState([]);
  const [isSubmittingConnection, setIsSubmittingConnection] = useState(false);

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm(
      `PERMANENT ACCOUNT DELETION\n\nDelete the sign-in account for ${user?.email || 'this account'}? Greenhouse and telemetry records are shared by the farm and will not be removed. This action cannot be undone.`
    );
    if (!confirmed) return;

    setIsDeleting(true);
    try {
      const res = await deleteMyAccount();
      if (res && res.success) {
        alert('Your sign-in account was deleted. Farm and telemetry records were retained.');
      } else {
        alert(res?.error || 'Failed to delete account. Please try again.');
      }
    } catch (err) {
      alert('Error connecting to deletion service.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Farm Modal State
  const [showFarmModal, setShowFarmModal] = useState(false);
  const [editingFarm, setEditingFarm] = useState(null);
  const [farmForm, setFarmForm] = useState({
    name: '', crop: '', location: '', moisture_min: 35, moisture_max: 50, target_vpd: 0.85
  });

  // User Modal State
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [userForm, setUserForm] = useState({
    name: '', email: '', role: 'Farm Operator', phone: '+254 700 000 000', avatar: '👨‍🌾', password: ''
  });

  // Profile Edit State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: user?.name || 'Farmer John',
    email: user?.email || 'john@irrigatech.io',
    phone: user?.phone || '+254 712 345 678',
    role: user?.role || 'Chief Agronomist & Admin'
  });

  useEffect(() => {
    setProfileForm({
      name: user?.name || '',
      email: user?.email || '',
      phone: user?.phone || '',
      role: user?.role || ''
    });
  }, [user]);

  useEffect(() => {
    if (!isAuthenticated) {
      setConnectionRequests([]);
      setPendingConnectionRequests([]);
      return;
    }
    fetch(`${getApiUrl()}/api/farm-connections`, { headers: authHeaders() })
      .then(res => res.ok ? res.json() : { mine: [], pending: [] })
      .then(data => {
        setConnectionRequests(Array.isArray(data.mine) ? data.mine : []);
        setPendingConnectionRequests(Array.isArray(data.pending) ? data.pending : []);
      })
      .catch(() => { setConnectionRequests([]); setPendingConnectionRequests([]); });
  }, [isAuthenticated, getApiUrl, authHeaders]);

  const requestFarmConnection = async (event) => {
    event.preventDefault();
    setActionError('');
    setIsSubmittingConnection(true);
    try {
      const res = await fetch(`${getApiUrl()}/api/farm-connections`, {
        method: 'POST', headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ code: connectionCode.trim() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not request greenhouse access.');
      setConnectionCode('');
      setConnectionRequests(prev => [data.request, ...prev.filter(item => item.id !== data.request.id)]);
    } catch (err) { setActionError(err.message); }
    finally { setIsSubmittingConnection(false); }
  };

  const decideFarmConnection = async (requestId, decision) => {
    setActionError('');
    try {
      const res = await fetch(`${getApiUrl()}/api/farm-connections/${encodeURIComponent(requestId)}/decision`, {
        method: 'POST', headers: authHeaders({ 'Content-Type': 'application/json' }), body: JSON.stringify({ decision })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not update greenhouse access request.');
      setPendingConnectionRequests(prev => prev.filter(item => item.id !== requestId));
    } catch (err) { setActionError(err.message); }
  };

  const selectedCropObj = user?.crops?.find(c => c.id === user.selectedCrop) || (user?.crops ? user.crops[0] : null);

  const handleApplyCrop = (crop) => {
    switchCrop(crop.id);
    setThreshold('moistureStart', crop.moistureMin);
    setThreshold('moistureStop', crop.moistureMax);
  };

  // ─── Farm Handlers ─────────────────────────────────────────────────────────
  const openNewFarmModal = () => {
    setEditingFarm(null);
    setFarmForm({
      name: '', crop: 'Tomato', location: 'Nanyuki Cluster', moisture_min: 35, moisture_max: 50, target_vpd: 0.85
    });
    setShowFarmModal(true);
  };

  const openEditFarmModal = (farm, e) => {
    e.stopPropagation();
    setEditingFarm(farm);
    setFarmForm({
      name: farm.name,
      crop: farm.crop,
      location: farm.location || '',
      moisture_min: farm.moisture_min || 35,
      moisture_max: farm.moisture_max || 50,
      target_vpd: farm.target_vpd || 0.85
    });
    setShowFarmModal(true);
  };

  const handleSaveFarm = async (e) => {
    e.preventDefault();
    if (!farmForm.name.trim()) return;
    setActionError('');
    try {
      if (editingFarm) await updateFarm(editingFarm.id, farmForm);
      else await addFarm(farmForm);
      setShowFarmModal(false);
    } catch (err) {
      setActionError(err.message);
    }
  };

  const handleDeleteFarm = async (id, name, e) => {
    e.stopPropagation();
    if (window.confirm(`Are you sure you want to delete ${name}?`)) {
      try { setActionError(''); await deleteFarm(id); }
      catch (err) { setActionError(err.message); }
    }
  };

  // ─── User Handlers ─────────────────────────────────────────────────────────
  const openNewUserModal = () => {
    setEditingUser(null);
    setUserForm({
      name: '', email: '', role: 'Farm Operator', phone: '+254 700 000 000', avatar: '👨‍🌾', password: ''
    });
    setShowUserModal(true);
  };

  const openEditUserModal = (member) => {
    setEditingUser(member);
    setUserForm({
      name: member.name,
      email: member.email,
      role: member.role || 'Farm Operator',
      phone: member.phone || '+254 700 000 000',
      avatar: member.avatar || '👨‍🌾',
      password: ''
    });
    setShowUserModal(true);
  };

  const handleSaveUser = async (e) => {
    e.preventDefault();
    if (!userForm.name.trim() || !userForm.email.trim()) return;
    if ((!editingUser && userForm.password.length < 8) || (editingUser && userForm.password && userForm.password.length < 8)) {
      setActionError('Passwords must contain at least 8 characters.');
      return;
    }
    setActionError('');
    try {
      if (editingUser) await updateUser(editingUser.id, userForm);
      else await addUser(userForm);
      setShowUserModal(false);
    } catch (err) {
      setActionError(err.message);
    }
  };

  const handleDeleteUser = async (id, name) => {
    if (window.confirm(`Remove team member ${name}?`)) {
      try { setActionError(''); await deleteUser(id); }
      catch (err) { setActionError(err.message); }
    }
  };

  const handleProfilePhotoSelect = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setActionError('Choose an image file for your profile photo.');
      event.target.value = '';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setActionError('Profile photos must be 5 MB or smaller.');
      event.target.value = '';
      return;
    }
    setActionError('');
    setProfilePhotoFile(file);
    setProfilePhotoPreview(URL.createObjectURL(file));
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setActionError('');
    let profileUpdate = { ...profileForm };
    try {
      if (profilePhotoFile) {
        setIsUploadingPhoto(true);
        const signatureRes = await fetch(`${getApiUrl()}/api/cloudinary/profile-signature`, {
          method: 'POST', headers: authHeaders({ 'Content-Type': 'application/json' }), body: '{}'
        });
        const signatureData = await signatureRes.json();
        if (!signatureRes.ok) throw new Error(signatureData.error || 'Could not prepare secure photo upload.');

        const uploadForm = new FormData();
        uploadForm.append('file', profilePhotoFile);
        uploadForm.append('api_key', signatureData.apiKey);
        uploadForm.append('timestamp', String(signatureData.timestamp));
        uploadForm.append('folder', signatureData.folder);
        uploadForm.append('public_id', signatureData.publicId);
        uploadForm.append('overwrite', String(signatureData.overwrite));
        uploadForm.append('signature', signatureData.signature);
        const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(signatureData.cloudName)}/image/upload`, {
          method: 'POST', body: uploadForm
        });
        const uploadData = await uploadRes.json();
        if (!uploadRes.ok || !uploadData.secure_url) throw new Error(uploadData.error?.message || 'Cloudinary photo upload failed.');
        profileUpdate.avatar = uploadData.secure_url;
      }

      await updateUser(user.id, profileUpdate);
      setProfilePhotoFile(null);
      setProfilePhotoPreview('');
      setIsEditingProfile(false);
    } catch (err) {
      setActionError(err.message || 'Could not save profile.');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '1.5rem 1rem 5rem' }}>
      
      {/* Title */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', margin: 0 }}>
          Farm & Account Management
        </h1>
        <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.25rem' }}>
          Production CRUD portal for multi-greenhouse facilities, agronomist accounts, and biological formulas.
        </p>
      </div>

      {actionError && <div role="alert" style={{ marginBottom: '1rem', padding: '.75rem 1rem', borderRadius: 10, background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca' }}>{actionError}</div>}
      {!isAuthenticated && <div role="status" style={{ marginBottom: '1rem', padding: '.75rem 1rem', borderRadius: 10, background: '#fffbeb', color: '#92400e', border: '1px solid #fde68a' }}>Demo mode is read-only. Sign in to save profile, farm, and team-account changes.</div>}

      {/* User Profile Card */}
      <div style={{
        background: '#ffffff',
        borderRadius: '24px',
        padding: '1.5rem',
        border: '1px solid #e2e8f0',
        boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
        marginBottom: '1.5rem'
      }}>
        {!isEditingProfile ? (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.6rem',
                fontWeight: 800,
                boxShadow: '0 8px 16px rgba(16, 185, 129, 0.25)'
              }}>
                {isProfilePhoto(user?.avatar) ? <img src={user.avatar} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} /> : user.avatar || '👨‍🌾'}
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                    {user.name}
                  </h2>
                  <span style={{
                    background: '#dcfce7',
                    color: '#15803d',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    padding: '0.2rem 0.6rem',
                    borderRadius: '9999px',
                    border: '1px solid #bbf7d0'
                  }}>
                    {user.role}
                  </span>
                </div>
                <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0.2rem 0 0' }}>
                  {user.email} • {user.phone || '+254 712 345 678'}
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={() => isAuthenticated && setIsEditingProfile(true)}
                disabled={!isAuthenticated}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.55rem 0.9rem',
                  borderRadius: '10px',
                  background: '#f8fafc',
                  color: '#334155',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                <Edit2 size={14} /> Edit Profile
              </button>
              <button
                onClick={logout}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.55rem 0.9rem',
                  borderRadius: '10px',
                  background: '#f1f5f9',
                  color: '#475569',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                <LogOut size={14} /> Sign Out
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={isDeleting || !isAuthenticated}
                title="Permanently Delete Account"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.55rem 0.9rem',
                  borderRadius: '10px',
                  background: '#fff1f2',
                  color: '#be123c',
                  border: '1px solid #fecdd3',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: isDeleting || !isAuthenticated ? 'not-allowed' : 'pointer',
                  opacity: isAuthenticated ? 1 : .55
                }}
              >
                <Trash2 size={14} /> {isDeleting ? 'Deleting...' : 'Delete Account'}
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>Edit Admin Profile</h3>
              <button type="button" onClick={() => setIsEditingProfile(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={18} color="#64748b" />
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>Full Name</label>
                <input
                  type="text"
                  value={profileForm.name}
                  onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                  style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>Email</label>
                <input
                  type="email"
                  value={profileForm.email}
                  onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                  style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>Phone</label>
                <input
                  type="text"
                  value={profileForm.phone}
                  onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                  style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                />
              </div>
              <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>Role (managed by farm administrator)</label>
                <input type="text" value={profileForm.role} readOnly aria-readonly="true" style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', background: '#f8fafc' }} />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label htmlFor="profile-photo" style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '.4rem' }}>Profile photo (up to 5 MB)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem', flexWrap: 'wrap' }}>
                  {(profilePhotoPreview || (isProfilePhoto(user?.avatar) ? user.avatar : '')) && <img src={profilePhotoPreview || user.avatar} alt="Profile photo preview" style={{ width: 52, height: 52, borderRadius: '50%', objectFit: 'cover' }} />}
                  <input id="profile-photo" type="file" accept="image/*" onChange={handleProfilePhotoSelect} style={{ maxWidth: '100%' }} />
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setIsEditingProfile(false)}
                style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#ffffff', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isUploadingPhoto}
                style={{ padding: '0.5rem 1.25rem', borderRadius: '8px', border: 'none', background: '#15803d', color: '#ffffff', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}
              >
                {isUploadingPhoto ? 'Uploading...' : 'Save Changes'}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* ─── 1. Greenhouse Facilities (Farms CRUD) ─────────────────────────── */}
      <div style={{
        background: '#ffffff',
        borderRadius: '24px',
        padding: '1.5rem',
        border: '1px solid #e2e8f0',
        boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
        marginBottom: '1.5rem'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Building2 size={20} color="#0284c7" />
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Greenhouse Facilities ({farmList.length})
              </h2>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                Active: <strong style={{ color: '#0284c7' }}>{user.activeFarm}</strong>
              </div>
            </div>
          </div>

          <button
            onClick={openNewFarmModal}
            disabled={!canManageAccounts}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.45rem 0.9rem',
              borderRadius: '10px',
              background: '#0284c7',
              color: '#ffffff',
              border: 'none',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            <Plus size={14} /> Add Greenhouse
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {farmList.map((farm) => {
            const isActive = user.activeFarm === farm.name;
            return (
              <div
                key={farm.id}
                onClick={() => switchFarm(farm.id)}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '1rem',
                  borderRadius: '16px',
                  border: isActive ? '2px solid #0284c7' : '1px solid #e2e8f0',
                  background: isActive ? '#f0f9ff' : '#ffffff',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontWeight: 800, fontSize: '0.92rem', color: '#0f172a' }}>{farm.name}</span>
                    {isActive ? (
                      <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: '9999px', background: '#0284c7', color: '#ffffff' }}>
                        Active Facility
                      </span>
                    ) : (
                      <span style={{ fontSize: '0.68rem', fontWeight: 600, color: '#64748b' }}>
                        Click to Connect
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.76rem', color: '#64748b', marginTop: '0.25rem' }}>
                    📍 {farm.location || 'Greenhouse Site'} • 🌱 {farm.crop} • 💧 Target: {farm.moisture_min}–{farm.moisture_max}%
                  </div>
                  {farm.connection_code && <div style={{ fontSize: '0.7rem', color: '#15803d', marginTop: '.25rem', fontWeight: 700 }}>Connection code: {farm.connection_code} <span style={{ color: '#64748b', fontWeight: 400 }}>· Share it to receive an access request</span></div>}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <button
                    onClick={(e) => canManageAccounts && openEditFarmModal(farm, e)}
                    disabled={!canManageAccounts}
                    style={{
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      padding: '0.35rem 0.6rem',
                      cursor: 'pointer',
                      color: '#475569',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      fontSize: '0.72rem',
                      fontWeight: 600
                    }}
                  >
                    <Edit2 size={13} /> Edit
                  </button>
                  <button
                    onClick={(e) => canManageAccounts && handleDeleteFarm(farm.id, farm.name, e)}
                    disabled={!canManageAccounts}
                    style={{
                      background: '#fef2f2',
                      border: '1px solid #fecaca',
                      borderRadius: '8px',
                      padding: '0.35rem 0.6rem',
                      cursor: 'pointer',
                      color: '#dc2626',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      fontSize: '0.72rem',
                      fontWeight: 600
                    }}
                  >
                    <Trash2 size={13} /> Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ marginTop: '1rem', padding: '1rem', borderRadius: 14, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
          <h3 style={{ margin: '0 0 .35rem', fontSize: '.95rem', color: '#0f172a' }}>Connect another greenhouse</h3>
          <p style={{ margin: '0 0 .75rem', fontSize: '.78rem', color: '#64748b' }}>Enter its connection code. The greenhouse owner must approve before its details appear in your account.</p>
          <form onSubmit={requestFarmConnection} style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
            <input aria-label="Greenhouse connection code" value={connectionCode} onChange={event => setConnectionCode(event.target.value.toUpperCase())} placeholder="GH-XXXXXXXXXX" maxLength={32} disabled={!isAuthenticated || isSubmittingConnection} style={{ flex: '1 1 220px', padding: '.6rem .7rem', border: '1px solid #cbd5e1', borderRadius: 8 }} />
            <button type="submit" disabled={!isAuthenticated || isSubmittingConnection || !connectionCode.trim()} style={{ padding: '.6rem .9rem', background: '#15803d', color: '#fff', border: 0, borderRadius: 8, fontWeight: 700, cursor: 'pointer', opacity: !isAuthenticated ? .55 : 1 }}>{isSubmittingConnection ? 'Sending…' : 'Request access'}</button>
          </form>
          {!isAuthenticated && <div style={{ marginTop: '.45rem', color: '#92400e', fontSize: '.75rem' }}>Sign in to request a greenhouse connection.</div>}
          {connectionRequests.length > 0 && <div style={{ marginTop: '.75rem' }}><strong style={{ fontSize: '.8rem' }}>Your connection requests</strong>{connectionRequests.map(request => <div key={request.id} style={{ fontSize: '.78rem', color: '#475569', paddingTop: '.35rem' }}>{request.farm_name} · {request.status.toLowerCase()}</div>)}</div>}
          {canManageAccounts && pendingConnectionRequests.length > 0 && <div style={{ marginTop: '.85rem' }}><strong style={{ fontSize: '.8rem' }}>Requests for your greenhouses</strong>{pendingConnectionRequests.map(request => <div key={request.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '.75rem', flexWrap: 'wrap', paddingTop: '.55rem' }}><span style={{ fontSize: '.78rem', color: '#475569' }}>{request.requester_name || request.requester_email} requests {request.farm_name}</span><span style={{ display: 'flex', gap: '.4rem' }}><button type="button" onClick={() => decideFarmConnection(request.id, 'APPROVED')} style={{ padding: '.35rem .6rem', border: 0, borderRadius: 7, background: '#dcfce7', color: '#166534', fontWeight: 700, cursor: 'pointer' }}>Approve</button><button type="button" onClick={() => decideFarmConnection(request.id, 'DECLINED')} style={{ padding: '.35rem .6rem', border: 0, borderRadius: 7, background: '#fee2e2', color: '#991b1b', fontWeight: 700, cursor: 'pointer' }}>Decline</button></span></div>)}</div>}
        </div>
      </div>

      {/* ─── 2. Team Accounts & Permissions (Accounts CRUD) ────────────────── */}
      <div style={{
        background: '#ffffff',
        borderRadius: '24px',
        padding: '1.5rem',
        border: '1px solid #e2e8f0',
        boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
        marginBottom: '1.5rem'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Users size={20} color="#16a34a" />
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Team Members & Accounts ({teamMembers.length})
              </h2>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                Role-based access control for agricultural operations
              </div>
            </div>
          </div>

          <button
            onClick={openNewUserModal}
            disabled={!canManageAccounts}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.45rem 0.9rem',
              borderRadius: '10px',
              background: '#16a34a',
              color: '#ffffff',
              border: 'none',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            <Plus size={14} /> Add Team Member
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0.85rem' }}>
          {teamMembers.map((member) => (
            <div
              key={member.id}
              style={{
                borderRadius: '16px',
                padding: '1.1rem',
                border: '1px solid #e2e8f0',
                background: '#f8fafc',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '1.4rem' }}>{isProfilePhoto(member.avatar) ? <img src={member.avatar} alt="" style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover' }} /> : member.avatar || '👨‍🌾'}</span>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#0f172a' }}>{member.name}</div>
                      <div style={{ fontSize: '0.72rem', color: '#16a34a', fontWeight: 700 }}>{member.role}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.35rem' }}>
                    <button
                      onClick={() => isAuthenticated && openEditUserModal(member)}
                      disabled={!canManageAccounts}
                      style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '0.25rem 0.45rem', cursor: 'pointer' }}
                    >
                      <Edit2 size={12} color="#475569" />
                    </button>
                    {member.id !== user.id && (
                      <button
                        onClick={() => isAuthenticated && handleDeleteUser(member.id, member.name)}
                        disabled={!canManageAccounts}
                        style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', padding: '0.25rem 0.45rem', cursor: 'pointer' }}
                      >
                        <Trash2 size={12} color="#dc2626" />
                      </button>
                    )}
                  </div>
                </div>

                <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', flexDirection: 'column', gap: '0.2rem', marginTop: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Mail size={12} /> {member.email}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Phone size={12} /> {member.phone || 'No phone'}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ─── 3. Multi-Plant Biological Profiles Section ────────────────────── */}
      {user.crops && (
        <div style={{
          background: '#ffffff',
          borderRadius: '24px',
          padding: '1.5rem',
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
          marginBottom: '1.5rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Sprout size={20} color="#15803d" />
                <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  Active Plant Species & Irrigation Formula
                </h2>
              </div>
              <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0.25rem 0 0' }}>
                Switching crops dynamically calibrates soil moisture thresholds on connected controllers.
              </p>
            </div>

            {selectedCropObj && (
              <span style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                padding: '0.25rem 0.75rem',
                borderRadius: '9999px',
                background: '#ecfdf5',
                color: '#059669',
                border: '1px solid #bbf7d0'
              }}>
                Active: {selectedCropObj.name}
              </span>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
            {cropList.map((crop) => {
              const isCurrent = user.selectedCrop === crop.id;
              return (
                <div
                  key={crop.id}
                  onClick={() => handleApplyCrop(crop)}
                  style={{
                    borderRadius: '16px',
                    padding: '1.15rem',
                    border: isCurrent ? '2px solid #16a34a' : '1px solid #e2e8f0',
                    background: isCurrent ? '#f0fdf4' : '#f8fafc',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    position: 'relative'
                  }}
                >
                  {isCurrent && (
                    <div style={{
                      position: 'absolute',
                      top: '1rem',
                      right: '1rem',
                      color: '#16a34a',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      fontSize: '0.72rem',
                      fontWeight: 700
                    }}>
                      <CheckCircle2 size={16} /> Active
                    </div>
                  )}

                  <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#0f172a', marginBottom: '0.2rem' }}>
                    {crop.name}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.75rem' }}>
                    {crop.stage}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.75rem' }}>
                    <div style={{ background: '#ffffff', padding: '0.45rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      <div style={{ color: '#94a3b8', fontSize: '0.68rem' }}>Soil Target</div>
                      <div style={{ fontWeight: 800, color: '#0284c7' }}>{crop.moistureMin}–{crop.moistureMax}%</div>
                    </div>
                    <div style={{ background: '#ffffff', padding: '0.45rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      <div style={{ color: '#94a3b8', fontSize: '0.68rem' }}>EC / pH</div>
                      <div style={{ fontWeight: 800, color: '#16a34a' }}>{crop.ecTarget} / {crop.phTarget}</div>
                    </div>
                  </div>

                  <div style={{ marginTop: '0.75rem', textAlign: 'right' }}>
                    <span style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      color: isCurrent ? '#16a34a' : '#64748b'
                    }}>
                      {isCurrent ? 'Formula Applied ✓' : 'Select Crop →'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── 4. IoT Device Security & API Key ──────────────────────────────── */}
      <div style={{
        background: '#ffffff',
        borderRadius: '24px',
        padding: '1.5rem',
        border: '1px solid #e2e8f0',
        boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <Key size={18} color="#d97706" />
          <h2 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
            Device Security & REST API Credentials
          </h2>
        </div>

        <div style={{
          background: '#f8fafc',
          borderRadius: '14px',
          padding: '1rem',
          border: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.75rem'
        }}>
          <div>
            <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>DEVICE AUTHENTICATION TOKEN</div>
            <div style={{ fontFamily: 'monospace', fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', marginTop: '0.2rem' }}>
              Issued securely during device provisioning
            </div>
          </div>

          <button
            onClick={() => setActionError('Device credentials are not provisioned by this dashboard yet. Configure a unique device token on the controller and backend.')}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              background: '#ffffff',
              color: '#334155',
              border: '1px solid #cbd5e1',
              fontSize: '0.75rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            Configure device token
          </button>
        </div>
      </div>

      {/* ─── MODAL: Add / Edit Farm ────────────────────────────────────────── */}
      {showFarmModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '1rem'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '24px',
            width: '100%',
            maxWidth: '480px',
            padding: '1.5rem',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                {editingFarm ? 'Edit Greenhouse' : 'Add New Greenhouse Facility'}
              </h3>
              <button onClick={() => setShowFarmModal(false)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '30px', height: '30px', cursor: 'pointer' }}>
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveFarm} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569' }}>Facility Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Greenhouse 5 (Hydroponics)"
                  value={farmForm.name}
                  onChange={(e) => setFarmForm({ ...farmForm, name: e.target.value })}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569' }}>Primary Crop</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sweet Bell Peppers"
                  value={farmForm.crop}
                  onChange={(e) => setFarmForm({ ...farmForm, crop: e.target.value })}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569' }}>Location / Cluster</label>
                <input
                  type="text"
                  placeholder="e.g. Nanyuki Sector 4"
                  value={farmForm.location}
                  onChange={(e) => setFarmForm({ ...farmForm, location: e.target.value })}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569' }}>Moisture Min (%)</label>
                  <input
                    type="number"
                    value={farmForm.moisture_min}
                    onChange={(e) => setFarmForm({ ...farmForm, moisture_min: e.target.value })}
                    style={{ width: '100%', padding: '0.6rem', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569' }}>Moisture Max (%)</label>
                  <input
                    type="number"
                    value={farmForm.moisture_max}
                    onChange={(e) => setFarmForm({ ...farmForm, moisture_max: e.target.value })}
                    style={{ width: '100%', padding: '0.6rem', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setShowFarmModal(false)}
                  style={{ padding: '0.6rem 1rem', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#ffffff', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: '0.6rem 1.25rem', borderRadius: '10px', border: 'none', background: '#0284c7', color: '#ffffff', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer' }}
                >
                  {editingFarm ? 'Save Changes' : 'Create Greenhouse'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: Add / Edit User ────────────────────────────────────────── */}
      {showUserModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '1rem'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '24px',
            width: '100%',
            maxWidth: '480px',
            padding: '1.5rem',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                {editingUser ? 'Edit Team Member' : 'Invite Team Member'}
              </h3>
              <button onClick={() => setShowUserModal(false)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '30px', height: '30px', cursor: 'pointer' }}>
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveUser} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569' }}>Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dennis Ochieng"
                  value={userForm.name}
                  onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569' }}>Email</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. dennis@irrigatech.io"
                  value={userForm.email}
                  onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569' }}>{editingUser ? 'Reset Password (leave blank to keep current)' : 'Initial Password (at least 8 characters)'}</label>
                <input
                  type="password"
                  required={!editingUser}
                  minLength={editingUser ? undefined : 8}
                  autoComplete="new-password"
                  value={userForm.password}
                  onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569' }}>Role</label>
                <select
                  value={userForm.role}
                  onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                >
                  <option value="Chief Agronomist">Chief Agronomist</option>
                  <option value="Irrigation Engineer">Irrigation Engineer</option>
                  <option value="Farm Operator">Farm Operator</option>
                  <option value="Greenhouse Technician">Greenhouse Technician</option>
                  <option value="Field Monitor">Field Monitor</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569' }}>Phone Number</label>
                <input
                  type="text"
                  placeholder="+254 700 000 000"
                  value={userForm.phone}
                  onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setShowUserModal(false)}
                  style={{ padding: '0.6rem 1rem', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#ffffff', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: '0.6rem 1.25rem', borderRadius: '10px', border: 'none', background: '#16a34a', color: '#ffffff', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer' }}
                >
                  {editingUser ? 'Save Changes' : 'Add Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Danger Zone: Permanent Account Deletion */}
      <div style={{
        marginTop: '2.5rem',
        background: '#fff1f2',
        border: '1px solid #fecdd3',
        borderRadius: '20px',
        padding: '1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.1rem' }}>⚠️</span>
            <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#9f1239' }}>
              Danger Zone: Delete Account
            </h4>
          </div>
          <p style={{ margin: '0.35rem 0 0', fontSize: '0.8rem', color: '#be123c', maxWidth: '520px' }}>
            Permanently delete your agronomist account credentials, personal greenhouse data, and telemetry records from TiDB Cloud and SQLite.
          </p>
        </div>
        <button
          onClick={handleDeleteAccount}
          disabled={isDeleting || !isAuthenticated}
          style={{
            background: '#e11d48',
            color: '#ffffff',
            border: 'none',
            padding: '0.65rem 1.25rem',
            borderRadius: '12px',
            fontSize: '0.82rem',
            fontWeight: 800,
            cursor: isDeleting || !isAuthenticated ? 'not-allowed' : 'pointer',
            opacity: isAuthenticated ? 1 : .55,
            boxShadow: '0 4px 12px rgba(225, 29, 72, 0.25)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem'
          }}
        >
          <Trash2 size={15} />
          {isDeleting ? 'Deleting Account...' : 'Permanently Delete Account'}
        </button>
      </div>

    </div>
  );
}
