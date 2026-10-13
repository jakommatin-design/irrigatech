import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const defaultUser = {
  id: 'user-01',
  name: 'Farmer John',
  email: 'john@irrigatech.io',
  role: 'Chief Agronomist & Admin',
  phone: '+254 712 345 678',
  avatar: '👨‍🌾',
  activeFarm: 'Greenhouse 1 (Alpha)',
  crops: [
    { id: 'tomato', name: 'Tomato (Solanum lycopersicum)', stage: 'Vegetative Phase', moistureMin: 35, moistureMax: 50, ecTarget: 2.2, phTarget: 6.2 },
    { id: 'pepper', name: 'Sweet Bell Pepper', stage: 'Early Flowering', moistureMin: 40, moistureMax: 55, ecTarget: 2.0, phTarget: 6.0 },
    { id: 'lettuce', name: 'Butterhead Lettuce', stage: 'Rapid Leafing', moistureMin: 45, moistureMax: 65, ecTarget: 1.6, phTarget: 5.8 },
    { id: 'strawberry', name: 'Strawberries (Fragaria)', stage: 'Fruiting', moistureMin: 50, moistureMax: 70, ecTarget: 1.8, phTarget: 6.0 },
    { id: 'cucumber', name: 'Greenhouse Cucumber', stage: 'Vining', moistureMin: 40, moistureMax: 60, ecTarget: 2.1, phTarget: 6.2 }
  ],
  selectedCrop: 'tomato'
};

const defaultFarms = [
  { id: 'farm-tomato', name: 'Greenhouse 1 (Alpha)', crop: 'Tomato (Vegetative)', location: 'Nanyuki Agrotech Cluster', moisture_min: 35.0, moisture_max: 50.0, target_vpd: 0.85 }
];

const defaultTeam = [
  { id: 'user-01', name: 'Farmer John', email: 'john@irrigatech.io', role: 'Chief Agronomist & Admin', phone: '+254 712 345 678', avatar: '👨‍🌾' },
  { id: 'user-02', name: 'Sarah Muthoni', email: 'sarah@irrigatech.io', role: 'Irrigation Engineer', phone: '+254 722 987 654', avatar: '👩‍🔬' },
  { id: 'user-03', name: 'David Kibet', email: 'david@irrigatech.io', role: 'Greenhouse Technician', phone: '+254 733 112 233', avatar: '👷' }
];

const createDefaultSettings = () => ({
  general: { farmName: 'Irriga-Tech Smart Facility', location: 'Nanyuki Agrotech Cluster', timezone: 'Africa/Nairobi (UTC+3)', units: 'Metric (°C, L, bar)', language: 'English' },
  automation: { autoIrrigation: true, maxPumpRunMinutes: 5, minCooldownMinutes: 1, lowWaterCutoffPct: 15 },
  climate: { fanOnTemp: 30, fanOffTemp: 24, shadeCloseLux: 950, shadeOpenLux: 400, targetHumidityPct: 65 },
  notifications: { emailAlerts: true, smsAlerts: true, criticalOnly: false, phoneRecipient: '+254 712 345 678' }
});

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);
const getStoredToken = () => localStorage.getItem('irrigatech_token') || sessionStorage.getItem('irrigatech_token');

export function isDemoAccount(user) {
  if (!user) return false;
  const demoEmails = [
    'john@irrigatech.io',
    'sarah@irrigatech.io',
    'david@irrigatech.io',
    'demo.farmer@irrigatech.io',
    'francis@irriga-tech.farm'
  ];
  return demoEmails.includes(user.email?.toLowerCase()) || Boolean(user.is_demo);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('irrigatech_user');
      return saved ? { ...defaultUser, ...JSON.parse(saved) } : defaultUser;
    } catch {
      localStorage.removeItem('irrigatech_user');
      return defaultUser;
    }
  });

  const [farms, setFarms] = useState(defaultFarms);
  const [users, setUsers] = useState(defaultTeam);
  const [settings, setSettings] = useState(createDefaultSettings);

  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return Boolean(getStoredToken()) && localStorage.getItem('irrigatech_auth') === 'true';
  });

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showSplash, setShowSplash] = useState(() => {
    // Show the splash unless already visited in this session
    return !getStoredToken() && !sessionStorage.getItem('irrigatech_visited');
  });

  const getApiUrl = useCallback(() => {
    if (import.meta.env.VITE_SERVER_URL) return import.meta.env.VITE_SERVER_URL;
    if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      return window.location.origin;
    }
    return 'http://localhost:3000';
  }, []);

  const authHeaders = useCallback((headers = {}) => {
    const token = getStoredToken();
    return { ...headers, ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  }, []);

  // Fetch initial farms, users, and settings from backend
  const refreshData = useCallback(async (role = 'Farm Owner & Operator') => {
    const base = getApiUrl();
    if (!getStoredToken()) return;
    try {
      const resFarms = await fetch(`${base}/api/farms`, { headers: authHeaders() });
      if (resFarms.ok) {
        const data = await resFarms.json();
        setFarms(Array.isArray(data.farms) ? data.farms : []);
      }
    } catch {}

    const canManage = ['farm owner & operator', 'chief agronomist & admin', 'chief agronomist', 'admin'].includes(String(role).toLowerCase());
    if (canManage) {
      try {
        const resUsers = await fetch(`${base}/api/users`, { headers: authHeaders() });
        if (resUsers.ok) {
          const data = await resUsers.json();
          setUsers(Array.isArray(data.users) ? data.users : []);
        } else setUsers([]);
      } catch { setUsers([]); }
    } else setUsers([]);

    try {
      const resSettings = await fetch(`${base}/api/settings`, { headers: authHeaders() });
      if (resSettings.ok) {
        const data = await resSettings.json();
        setSettings(data.settings && Object.keys(data.settings).length > 0 ? data.settings : createDefaultSettings());
      }
    } catch { setSettings(createDefaultSettings()); }
  }, [getApiUrl, authHeaders]);

  useEffect(() => {
    refreshData(user?.role);
    // Verify stored JWT session if available
    const token = getStoredToken();
    if (token) {
      const base = getApiUrl();
      fetch(`${base}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(async res => {
          if (!res.ok) throw new Error('Session expired');
          return res.json();
        })
        .then(data => {
          if (data && data.user) {
            setUser(prev => ({ ...prev, ...data.user }));
            setIsAuthenticated(true);
            localStorage.setItem('irrigatech_auth', 'true');
          }
        })
        .catch(() => {
          localStorage.removeItem('irrigatech_token');
          sessionStorage.removeItem('irrigatech_token');
          localStorage.setItem('irrigatech_auth', 'false');
          setIsAuthenticated(false);
          setUser(defaultUser);
          setFarms(defaultFarms);
          setUsers(defaultTeam);
          setSettings(createDefaultSettings());
        });
    }
  }, [refreshData, getApiUrl, user?.role]);

  // ─── Farm CRUD Operations ────────────────────────────────────────────────
  const addFarm = async (farmData) => {
    const base = getApiUrl();
    const newFarm = {
      name: farmData.name || 'New Greenhouse',
      crop: farmData.crop || 'Tomato',
      location: farmData.location || 'Local Cluster',
      moisture_min: parseFloat(farmData.moisture_min ?? 35),
      moisture_max: parseFloat(farmData.moisture_max ?? 50),
      target_vpd: parseFloat(farmData.target_vpd ?? 0.85)
    };

    const res = await fetch(`${base}/api/farms`, {
      method: 'POST', headers: authHeaders({ 'Content-Type': 'application/json' }), body: JSON.stringify(newFarm)
    });
    const data = await res.json();
    if (!res.ok || !data.farm) throw new Error(data.error || 'Could not save greenhouse.');
    setFarms(prev => [...prev, data.farm]);
    return data.farm;
  };

  const updateFarm = async (id, farmData) => {
    const base = getApiUrl();
    const res = await fetch(`${base}/api/farms/${id}`, { method: 'PUT', headers: authHeaders({ 'Content-Type': 'application/json' }), body: JSON.stringify(farmData) });
    const data = await res.json();
    if (!res.ok || !data.farm) throw new Error(data.error || 'Could not update greenhouse.');
    setFarms(prev => prev.map(f => f.id === id ? data.farm : f));
    return data.farm;
  };

  const deleteFarm = async (id) => {
    const base = getApiUrl();
    const res = await fetch(`${base}/api/farms/${id}`, { method: 'DELETE', headers: authHeaders() });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Could not delete greenhouse.');
    setFarms(prev => prev.filter(f => f.id !== id));
  };

  // ─── User / Account CRUD Operations ──────────────────────────────────────
  const addUser = async (userData) => {
    const base = getApiUrl();
    const newUser = {
      name: userData.name || 'Team Member',
      email: userData.email || 'team@irrigatech.io',
      role: userData.role || 'Farm Operator',
      phone: userData.phone || '+254 700 000 000',
      avatar: userData.avatar || '👨‍🌾',
      password: userData.password
    };
    const res = await fetch(`${base}/api/users`, { method: 'POST', headers: authHeaders({ 'Content-Type': 'application/json' }), body: JSON.stringify(newUser) });
    const data = await res.json();
    if (!res.ok || !data.user) throw new Error(data.error || 'Could not create team member.');
    setUsers(prev => [...prev, data.user]);
    return data.user;
  };

  const updateUser = async (id, userData) => {
    const base = getApiUrl();
    const res = await fetch(`${base}/api/users/${id}`, { method: 'PUT', headers: authHeaders({ 'Content-Type': 'application/json' }), body: JSON.stringify(userData) });
    const data = await res.json();
    if (!res.ok || !data.user) throw new Error(data.error || 'Could not update account.');
    setUsers(prev => prev.map(u => u.id === id ? data.user : u));
    if (user.id === id) {
      setUser(prev => ({ ...prev, ...data.user }));
      localStorage.setItem('irrigatech_user', JSON.stringify({ ...user, ...data.user }));
    }
    return data.user;
  };

  const deleteUser = async (id) => {
    const base = getApiUrl();
    const res = await fetch(`${base}/api/users/${id}`, { method: 'DELETE', headers: authHeaders() });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Could not remove team member.');
    setUsers(prev => prev.filter(u => u.id !== id));
  };

  // ─── Settings Operations ─────────────────────────────────────────────────
  const updateSettings = async (newSettings) => {
    const base = getApiUrl();
    const merged = { ...settings, ...newSettings };
    const res = await fetch(`${base}/api/settings`, { method: 'PUT', headers: authHeaders({ 'Content-Type': 'application/json' }), body: JSON.stringify(newSettings) });
    const data = await res.json();
    if (!res.ok || !data.settings) throw new Error(data.error || 'Could not save settings.');
    setSettings(data.settings || merged);
  };

  const login = async (email, password, rememberMe = true) => {
    const base = getApiUrl();
    try {
      const res = await fetch(`${base}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Authentication failed' };
      }
      if (!data.token || !data.user) return { success: false, error: 'Sign-in service returned an incomplete response.' };

      if (data.token) {
        const targetStorage = rememberMe ? localStorage : sessionStorage;
        targetStorage.setItem('irrigatech_token', data.token);
        (rememberMe ? sessionStorage : localStorage).removeItem('irrigatech_token');
      }
      if (data.user) {
        const mergedUser = { ...defaultUser, ...data.user };
        setFarms([]);
        setUsers([]);
        setSettings(createDefaultSettings());
        setUser(mergedUser);
        localStorage.setItem('irrigatech_user', JSON.stringify(mergedUser));
      }
      setIsAuthenticated(true);
      localStorage.setItem('irrigatech_auth', 'true');
      sessionStorage.setItem('irrigatech_visited', '1');
      setShowAuthModal(false);
      setShowSplash(false);
      refreshData(data.user?.role);
      return { success: true, user: data.user };
    } catch (err) {
      console.warn('Network login error:', err);
      return { success: false, error: 'Cannot connect to the sign-in service. Please try again when the server is available.' };
    }
  };

  const register = async ({ name, email, password, farmName, phone }) => {
    const base = getApiUrl();
    try {
      const res = await fetch(`${base}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, farmName, phone })
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Account registration failed' };
      }
      if (!data.token || !data.user) return { success: false, error: 'Registration service returned an incomplete response.' };

      if (data.token) {
        localStorage.setItem('irrigatech_token', data.token);
      }
      if (data.user) {
        const mergedUser = {
          ...defaultUser,
          ...data.user,
          activeFarm: data.farm ? data.farm.name : defaultUser.activeFarm
        };
        setUser(mergedUser);
        localStorage.setItem('irrigatech_user', JSON.stringify(mergedUser));
        setUsers([]);
        setSettings(createDefaultSettings());
      }
      if (data.farm) {
        setFarms([data.farm]);
      } else setFarms([]);
      setIsAuthenticated(true);
      localStorage.setItem('irrigatech_auth', 'true');
      sessionStorage.setItem('irrigatech_visited', '1');
      setShowAuthModal(false);
      setShowSplash(false);
      refreshData(data.user?.role);
      return { success: true, user: data.user };
    } catch (err) {
      console.error('Registration network error:', err);
      return { success: false, error: 'Cannot connect to backend server. Please verify backend is running.' };
    }
  };

  const deleteMyAccount = async () => {
    const base = getApiUrl();
    const token = getStoredToken();
    if (!token) return { success: false, error: 'Sign in before deleting an account.' };
    try {
      const res = await fetch(`${base}/api/auth/account`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Failed to delete account' };
      }
    } catch (err) {
      console.warn('API delete account error:', err);
      return { success: false, error: 'Could not reach the account service. Your account was not deleted.' };
    }

    localStorage.removeItem('irrigatech_token');
    sessionStorage.removeItem('irrigatech_token');
    localStorage.removeItem('irrigatech_user');
    localStorage.setItem('irrigatech_auth', 'false');
    sessionStorage.removeItem('irrigatech_visited');
    setUser(defaultUser);
    setFarms(defaultFarms);
    setUsers(defaultTeam);
    setSettings(createDefaultSettings());
    setIsAuthenticated(false);
    setShowSplash(true);
    return { success: true };
  };

  const logout = () => {
    localStorage.removeItem('irrigatech_token');
    sessionStorage.removeItem('irrigatech_token');
    localStorage.setItem('irrigatech_auth', 'false');
    localStorage.removeItem('irrigatech_user');
    setUser(defaultUser);
    setFarms(defaultFarms);
    setUsers(defaultTeam);
    setSettings(createDefaultSettings());
    setIsAuthenticated(false);
    setShowSplash(true);
  };

  const switchFarm = (farmId) => {
    const found = farms.find(f => f.id === farmId);
    if (found) {
      const updated = { ...user, activeFarm: found.name };
      setUser(updated);
      localStorage.setItem('irrigatech_user', JSON.stringify(updated));
    }
  };

  const switchCrop = (cropId) => {
    const updated = { ...user, selectedCrop: cropId };
    setUser(updated);
    localStorage.setItem('irrigatech_user', JSON.stringify(updated));
  };

  return (
    <AuthContext.Provider value={{
      user,
      setUser,
      isDemo: isDemoAccount(user),
      farms,
      users,
      settings,
      refreshData,
      getApiUrl,
      authHeaders,
      addFarm,
      updateFarm,
      deleteFarm,
      addUser,
      updateUser,
      deleteUser,
      updateSettings,
      isAuthenticated,
      login,
      register,
      logout,
      deleteMyAccount,
      switchFarm,
      switchCrop,
      showAuthModal,
      setShowAuthModal,
      showSplash,
      setShowSplash
    }}>
      {children}
    </AuthContext.Provider>
  );
}
