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
  { id: 'farm-tomato', name: 'Greenhouse 1 (Alpha)', crop: 'Tomato (Vegetative)', location: 'Nanyuki Agrotech Cluster', moisture_min: 35.0, moisture_max: 50.0, target_vpd: 0.85 },
  { id: 'farm-peppers', name: 'Greenhouse 2 (Beta)', crop: 'Sweet Bell Peppers', location: 'Zone 2 Automated Bed', moisture_min: 40.0, moisture_max: 55.0, target_vpd: 0.95 },
  { id: 'farm-lettuce', name: 'Greenhouse 3 (Hydro)', crop: 'Butterhead Lettuce', location: 'Vertical Hydro Bed 3', moisture_min: 45.0, moisture_max: 65.0, target_vpd: 0.75 },
  { id: 'farm-herbs', name: 'Greenhouse 4 (Spices)', crop: 'Basil & Mint', location: 'High-humidity Herb Zone', moisture_min: 30.0, moisture_max: 45.0, target_vpd: 0.90 }
];

const defaultTeam = [
  { id: 'user-01', name: 'Farmer John', email: 'john@irrigatech.io', role: 'Chief Agronomist & Admin', phone: '+254 712 345 678', avatar: '👨‍🌾' },
  { id: 'user-02', name: 'Sarah Muthoni', email: 'sarah@irrigatech.io', role: 'Irrigation Engineer', phone: '+254 722 987 654', avatar: '👩‍🔬' },
  { id: 'user-03', name: 'David Kibet', email: 'david@irrigatech.io', role: 'Greenhouse Technician', phone: '+254 733 112 233', avatar: '👷' }
];

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('irrigatech_user');
    return saved ? JSON.parse(saved) : defaultUser;
  });

  const [farms, setFarms] = useState(defaultFarms);
  const [users, setUsers] = useState(defaultTeam);
  const [settings, setSettings] = useState({
    general: { farmName: 'Irriga-Tech Smart Facility', location: 'Nanyuki Agrotech Cluster', timezone: 'Africa/Nairobi (UTC+3)', units: 'Metric (°C, L, bar)', language: 'English' },
    automation: { autoIrrigation: true, maxPumpRunMinutes: 5, minCooldownMinutes: 1, lowWaterCutoffPct: 15 },
    climate: { fanOnTemp: 30, fanOffTemp: 24, shadeCloseLux: 950, shadeOpenLux: 400, targetHumidityPct: 65 },
    notifications: { emailAlerts: true, smsAlerts: true, criticalOnly: false, phoneRecipient: '+254 712 345 678' }
  });

  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('irrigatech_auth') === 'true';
  });

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showSplash, setShowSplash] = useState(() => {
    // Show the splash unless already visited in this session
    return !sessionStorage.getItem('irrigatech_visited');
  });

  const getApiUrl = useCallback(() => {
    if (import.meta.env.VITE_SERVER_URL) return import.meta.env.VITE_SERVER_URL;
    if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      return window.location.origin;
    }
    return 'http://localhost:3000';
  }, []);

  // Fetch initial farms, users, and settings from backend
  const refreshData = useCallback(async () => {
    const base = getApiUrl();
    try {
      const resFarms = await fetch(`${base}/api/farms`);
      if (resFarms.ok) {
        const data = await resFarms.json();
        if (data.farms && data.farms.length > 0) setFarms(data.farms);
      }
    } catch {}

    try {
      const resUsers = await fetch(`${base}/api/users`);
      if (resUsers.ok) {
        const data = await resUsers.json();
        if (data.users && data.users.length > 0) setUsers(data.users);
      }
    } catch {}

    try {
      const resSettings = await fetch(`${base}/api/settings`);
      if (resSettings.ok) {
        const data = await resSettings.json();
        if (data.settings && Object.keys(data.settings).length > 0) setSettings(data.settings);
      }
    } catch {}
  }, [getApiUrl]);

  useEffect(() => {
    refreshData();
    // Verify stored JWT session if available
    const token = localStorage.getItem('irrigatech_token');
    if (token) {
      const base = getApiUrl();
      fetch(`${base}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => {
          if (data && data.user) {
            setUser(prev => ({ ...prev, ...data.user }));
            setIsAuthenticated(true);
            localStorage.setItem('irrigatech_auth', 'true');
          }
        })
        .catch(() => {});
    }
  }, [refreshData, getApiUrl]);

  // ─── Farm CRUD Operations ────────────────────────────────────────────────
  const addFarm = async (farmData) => {
    const base = getApiUrl();
    const newFarm = {
      id: `farm-${Date.now()}`,
      name: farmData.name || 'New Greenhouse',
      crop: farmData.crop || 'Tomato',
      location: farmData.location || 'Local Cluster',
      moisture_min: parseFloat(farmData.moisture_min || 35),
      moisture_max: parseFloat(farmData.moisture_max || 50),
      target_vpd: parseFloat(farmData.target_vpd || 0.85)
    };

    setFarms(prev => [...prev, newFarm]);

    try {
      const res = await fetch(`${base}/api/farms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newFarm)
      });
      if (res.ok) {
        const data = await res.json();
        if (data.farm) {
          setFarms(prev => prev.map(f => f.id === newFarm.id ? data.farm : f));
          return data.farm;
        }
      }
    } catch (err) {
      console.warn('API addFarm failed, saved locally:', err);
    }
    return newFarm;
  };

  const updateFarm = async (id, farmData) => {
    const base = getApiUrl();
    setFarms(prev => prev.map(f => f.id === id ? { ...f, ...farmData } : f));
    try {
      const res = await fetch(`${base}/api/farms/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(farmData)
      });
      if (res.ok) {
        const data = await res.json();
        return data.farm;
      }
    } catch (err) {
      console.warn('API updateFarm failed, updated locally:', err);
    }
  };

  const deleteFarm = async (id) => {
    const base = getApiUrl();
    setFarms(prev => prev.filter(f => f.id !== id));
    try {
      await fetch(`${base}/api/farms/${id}`, { method: 'DELETE' });
    } catch (err) {
      console.warn('API deleteFarm failed, deleted locally:', err);
    }
  };

  // ─── User / Account CRUD Operations ──────────────────────────────────────
  const addUser = async (userData) => {
    const base = getApiUrl();
    const newUser = {
      id: `user-${Date.now()}`,
      name: userData.name || 'Team Member',
      email: userData.email || 'team@irrigatech.io',
      role: userData.role || 'Farm Operator',
      phone: userData.phone || '+254 700 000 000',
      avatar: userData.avatar || '👨‍🌾'
    };

    setUsers(prev => [...prev, newUser]);

    try {
      const res = await fetch(`${base}/api/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser)
      });
      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          setUsers(prev => prev.map(u => u.id === newUser.id ? data.user : u));
          return data.user;
        }
      }
    } catch (err) {
      console.warn('API addUser failed, saved locally:', err);
    }
    return newUser;
  };

  const updateUser = async (id, userData) => {
    const base = getApiUrl();
    setUsers(prev => prev.map(u => u.id === id ? { ...u, ...userData } : u));
    if (user.id === id) {
      const updatedProfile = { ...user, ...userData };
      setUser(updatedProfile);
      localStorage.setItem('irrigatech_user', JSON.stringify(updatedProfile));
    }
    try {
      const res = await fetch(`${base}/api/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });
      if (res.ok) {
        const data = await res.json();
        return data.user;
      }
    } catch (err) {
      console.warn('API updateUser failed, updated locally:', err);
    }
  };

  const deleteUser = async (id) => {
    const base = getApiUrl();
    setUsers(prev => prev.filter(u => u.id !== id));
    try {
      await fetch(`${base}/api/users/${id}`, { method: 'DELETE' });
    } catch (err) {
      console.warn('API deleteUser failed, deleted locally:', err);
    }
  };

  // ─── Settings Operations ─────────────────────────────────────────────────
  const updateSettings = async (newSettings) => {
    const base = getApiUrl();
    const merged = { ...settings, ...newSettings };
    setSettings(merged);
    try {
      const res = await fetch(`${base}/api/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings)
      });
      if (res.ok) {
        const data = await res.json();
        if (data.settings) setSettings(data.settings);
      }
    } catch (err) {
      console.warn('API updateSettings failed, saved locally:', err);
    }
  };

  const login = async (email, password) => {
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

      if (data.token) {
        localStorage.setItem('irrigatech_token', data.token);
      }
      if (data.user) {
        const mergedUser = { ...defaultUser, ...data.user };
        setUser(mergedUser);
        localStorage.setItem('irrigatech_user', JSON.stringify(mergedUser));
      }
      setIsAuthenticated(true);
      localStorage.setItem('irrigatech_auth', 'true');
      sessionStorage.setItem('irrigatech_visited', '1');
      setShowAuthModal(false);
      setShowSplash(false);
      refreshData();
      return { success: true, user: data.user };
    } catch (err) {
      console.warn('Network login error, falling back locally:', err);
      // Fallback if backend server unreachable in development
      setIsAuthenticated(true);
      localStorage.setItem('irrigatech_auth', 'true');
      sessionStorage.setItem('irrigatech_visited', '1');
      setShowAuthModal(false);
      setShowSplash(false);
      return { success: true };
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
      }
      if (data.farm) {
        setFarms(prev => [data.farm, ...prev]);
      }
      setIsAuthenticated(true);
      localStorage.setItem('irrigatech_auth', 'true');
      sessionStorage.setItem('irrigatech_visited', '1');
      setShowAuthModal(false);
      setShowSplash(false);
      refreshData();
      return { success: true, user: data.user };
    } catch (err) {
      console.error('Registration network error:', err);
      return { success: false, error: 'Cannot connect to backend server. Please verify backend is running.' };
    }
  };

  const logout = () => {
    localStorage.removeItem('irrigatech_token');
    localStorage.setItem('irrigatech_auth', 'false');
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
      farms,
      users,
      settings,
      refreshData,
      getApiUrl,
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
