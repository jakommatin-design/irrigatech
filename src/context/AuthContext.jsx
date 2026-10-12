import React, { createContext, useContext, useState, useEffect } from 'react';

const defaultUser = {
  name: 'Francis J.',
  email: 'francis@irrigat-tech.farm',
  role: 'Agronomist & Farm Owner',
  activeFarm: 'Greenhouse Alpha (3m x 4m Prototype)',
  farms: [
    { id: 'gh1', name: 'Greenhouse 1 (Alpha)', location: 'Nakuru Sector 4', crop: 'Tomato (Vegetative)', zones: 4 },
    { id: 'gh2', name: 'Greenhouse 2 (Beta)', location: 'Naivasha Field B', crop: 'Sweet Bell Peppers', zones: 4 },
    { id: 'gh3', name: 'Hydroponic Tunnel C', location: 'Eldoret Nursery', crop: 'Butterhead Lettuce', zones: 2 }
  ],
  crops: [
    { id: 'tomato', name: 'Tomato (Solanum lycopersicum)', stage: 'Vegetative Phase', moistureMin: 35, moistureMax: 50, ecTarget: 2.2, phTarget: 6.2 },
    { id: 'pepper', name: 'Sweet Bell Pepper', stage: 'Early Flowering', moistureMin: 40, moistureMax: 55, ecTarget: 2.0, phTarget: 6.0 },
    { id: 'lettuce', name: 'Butterhead Lettuce', stage: 'Rapid Leafing', moistureMin: 45, moistureMax: 65, ecTarget: 1.6, phTarget: 5.8 },
    { id: 'strawberry', name: 'Strawberries (Fragaria)', stage: 'Fruiting', moistureMin: 50, moistureMax: 70, ecTarget: 1.8, phTarget: 6.0 },
    { id: 'cucumber', name: 'Greenhouse Cucumber', stage: 'Vining', moistureMin: 40, moistureMax: 60, ecTarget: 2.1, phTarget: 6.2 }
  ],
  selectedCrop: 'tomato'
};

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('irrigatech_user');
    return saved ? JSON.parse(saved) : defaultUser;
  });

  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('irrigatech_auth') === 'true';
  });

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showSplash, setShowSplash] = useState(false);

  const login = (email, password) => {
    setIsAuthenticated(true);
    localStorage.setItem('irrigatech_auth', 'true');
    setShowAuthModal(false);
  };

  const logout = () => {
    setIsAuthenticated(false);
    localStorage.setItem('irrigatech_auth', 'false');
    setShowSplash(true);
  };

  const switchFarm = (farmId) => {
    const found = user.farms.find(f => f.id === farmId);
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
      isAuthenticated,
      login,
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
