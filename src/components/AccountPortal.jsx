import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSensors } from '../context/SensorContext';
import { 
  User, Building2, Sprout, ShieldCheck, Key, 
  LogOut, CheckCircle2, ChevronRight, Plus, Droplets,
  Edit2, Trash2, X, Save, RefreshCw, Users, Mail, Phone, MapPin
} from 'lucide-react';

export default function AccountPortal() {
  const { 
    user, farms, users, switchFarm, switchCrop, logout,
    deleteMyAccount,
    addFarm, updateFarm, deleteFarm,
    addUser, updateUser, deleteUser
  } = useAuth();
  const { setThreshold } = useSensors();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm(
      `⚠️ PERMANENT ACCOUNT DELETION\n\nAre you sure you want to permanently delete your account (${user?.email || 'this account'})?\n\nAll personal facilities, settings, and telemetry history will be removed from TiDB Cloud and SQLite.\n\nThis action CANNOT be undone.`
    );
    if (!confirmed) return;

    setIsDeleting(true);
    try {
      const res = await deleteMyAccount();
      if (res && res.success) {
        alert('Your account has been permanently deleted.');
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
    name: '', email: '', role: 'Farm Operator', phone: '+254 700 000 000', avatar: '👨‍🌾'
  });

  // Profile Edit State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: user?.name || 'Farmer John',
    email: user?.email || 'john@irrigatech.io',
    phone: user?.phone || '+254 712 345 678',
    role: user?.role || 'Chief Agronomist & Admin'
  });

  const [copiedKey, setCopiedKey] = useState(false);
  const selectedCropObj = user?.crops?.find(c => c.id === user.selectedCrop) || (user?.crops ? user.crops[0] : null);

  const handleApplyCrop = (crop) => {
    switchCrop(crop.id);
    setThreshold('moistureStart', crop.moistureMin);
    setThreshold('moistureStop', crop.moistureMax);
  };

  const handleCopyKey = () => {
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
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
    if (editingFarm) {
      await updateFarm(editingFarm.id, farmForm);
    } else {
      await addFarm(farmForm);
    }
    setShowFarmModal(false);
  };

  const handleDeleteFarm = async (id, name, e) => {
    e.stopPropagation();
    if (window.confirm(`Are you sure you want to delete ${name}?`)) {
      await deleteFarm(id);
    }
  };

  // ─── User Handlers ─────────────────────────────────────────────────────────
  const openNewUserModal = () => {
    setEditingUser(null);
    setUserForm({
      name: '', email: '', role: 'Farm Operator', phone: '+254 700 000 000', avatar: '👨‍🌾'
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
      avatar: member.avatar || '👨‍🌾'
    });
    setShowUserModal(true);
  };

  const handleSaveUser = async (e) => {
    e.preventDefault();
    if (!userForm.name.trim() || !userForm.email.trim()) return;
    if (editingUser) {
      await updateUser(editingUser.id, userForm);
    } else {
      await addUser(userForm);
    }
    setShowUserModal(false);
  };

  const handleDeleteUser = async (id, name) => {
    if (window.confirm(`Remove team member ${name}?`)) {
      await deleteUser(id);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    await updateUser(user.id || 'user-01', profileForm);
    setIsEditingProfile(false);
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
                {user.avatar || '👨‍🌾'}
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
                onClick={() => setIsEditingProfile(true)}
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
                disabled={isDeleting}
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
                  cursor: isDeleting ? 'not-allowed' : 'pointer'
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
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>Role</label>
                <input
                  type="text"
                  value={profileForm.role}
                  onChange={(e) => setProfileForm({ ...profileForm, role: e.target.value })}
                  style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                />
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
                style={{ padding: '0.5rem 1.25rem', borderRadius: '8px', border: 'none', background: '#15803d', color: '#ffffff', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}
              >
                Save Changes
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
                Greenhouse Facilities ({farms?.length || 0})
              </h2>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                Active: <strong style={{ color: '#0284c7' }}>{user.activeFarm}</strong>
              </div>
            </div>
          </div>

          <button
            onClick={openNewFarmModal}
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
          {farms.map((farm) => {
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
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <button
                    onClick={(e) => openEditFarmModal(farm, e)}
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
                    onClick={(e) => handleDeleteFarm(farm.id, farm.name, e)}
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
                Team Members & Accounts ({users?.length || 0})
              </h2>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                Role-based access control for agricultural operations
              </div>
            </div>
          </div>

          <button
            onClick={openNewUserModal}
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
          {users.map((member) => (
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
                    <span style={{ fontSize: '1.4rem' }}>{member.avatar || '👨‍🌾'}</span>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#0f172a' }}>{member.name}</div>
                      <div style={{ fontSize: '0.72rem', color: '#16a34a', fontWeight: 700 }}>{member.role}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.35rem' }}>
                    <button
                      onClick={() => openEditUserModal(member)}
                      style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '0.25rem 0.45rem', cursor: 'pointer' }}
                    >
                      <Edit2 size={12} color="#475569" />
                    </button>
                    {member.id !== user.id && (
                      <button
                        onClick={() => handleDeleteUser(member.id, member.name)}
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
            {user.crops.map((crop) => {
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
              gh_live_9f82a17cb3490018d45ef209
            </div>
          </div>

          <button
            onClick={handleCopyKey}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              background: copiedKey ? '#dcfce7' : '#ffffff',
              color: copiedKey ? '#15803d' : '#334155',
              border: '1px solid #cbd5e1',
              fontSize: '0.75rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            {copiedKey ? 'Copied ✓' : 'Copy API Key'}
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
          disabled={isDeleting}
          style={{
            background: '#e11d48',
            color: '#ffffff',
            border: 'none',
            padding: '0.65rem 1.25rem',
            borderRadius: '12px',
            fontSize: '0.82rem',
            fontWeight: 800,
            cursor: isDeleting ? 'not-allowed' : 'pointer',
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
