import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    // Return default values instead of throwing error during initial render
    return {
      user: null,
      loading: true,
      isGuest: false,
      isAuthenticated: false,
      signup: async () => ({ success: false, error: 'Auth not initialized' }),
      login: async () => ({ success: false, error: 'Auth not initialized' }),
      signInWithGoogle: async () => ({ success: false, error: 'Auth not initialized' }),
      continueAsGuest: () => ({ success: false, error: 'Auth not initialized' }),
      logout: () => {},
      updateProfile: async () => ({ success: false, error: 'Auth not initialized' })
    };
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);

  // Check for existing session on mount
  useEffect(() => {
    const savedUser = localStorage.getItem('krishimitra_user');
    const guestMode = localStorage.getItem('krishimitra_guest');
    
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    } else if (guestMode === 'true') {
      setIsGuest(true);
      setUser({ name: 'Guest', email: 'guest@krishimitra.com', isGuest: true });
    }
    setLoading(false);
  }, []);

  // Email/Password Sign Up
  const signup = async (name, email, password) => {
    try {
      // Simulate API call - Replace with actual backend
      const users = JSON.parse(localStorage.getItem('krishimitra_users') || '[]');
      
      // Check if user exists
      if (users.find(u => u.email === email)) {
        throw new Error('User already exists with this email');
      }

      const newUser = {
        id: Date.now().toString(),
        name,
        email,
        password: btoa(password), // Basic encoding (use proper hashing in production)
        createdAt: new Date().toISOString(),
        provider: 'email'
      };

      users.push(newUser);
      localStorage.setItem('krishimitra_users', JSON.stringify(users));

      const userData = { id: newUser.id, name, email, provider: 'email' };
      setUser(userData);
      setIsGuest(false);
      localStorage.setItem('krishimitra_user', JSON.stringify(userData));
      localStorage.removeItem('krishimitra_guest');

      return { success: true, user: userData };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  // Email/Password Login
  const login = async (email, password) => {
    try {
      const users = JSON.parse(localStorage.getItem('krishimitra_users') || '[]');
      const user = users.find(u => u.email === email && u.password === btoa(password));

      if (!user) {
        throw new Error('Invalid email or password');
      }

      const userData = { id: user.id, name: user.name, email: user.email, provider: 'email' };
      setUser(userData);
      setIsGuest(false);
      localStorage.setItem('krishimitra_user', JSON.stringify(userData));
      localStorage.removeItem('krishimitra_guest');

      return { success: true, user: userData };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  // Google Sign In using Google Identity Services
  const signInWithGoogle = () => {
    return new Promise((resolve, reject) => {
      try {
        // Check if Google Identity Services is loaded
        if (!window.google || !window.google.accounts) {
          reject({ success: false, error: 'Google Sign-In not loaded. Please refresh the page.' });
          return;
        }

        // Google Client ID from environment
        const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
        
        if (!clientId) {
          reject({ success: false, error: 'Google Client ID not configured' });
          return;
        }

        // Use OAuth2 Token Client for popup-based flow
        const tokenClient = window.google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: 'email profile openid',
          callback: async (tokenResponse) => {
            if (tokenResponse.error) {
              reject({ success: false, error: tokenResponse.error_description || 'Google Sign-In failed' });
              return;
            }
            
            if (tokenResponse.access_token) {
              try {
                // Fetch user info from Google
                const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                  headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
                });
                
                if (!userInfoResponse.ok) {
                  throw new Error('Failed to fetch user info');
                }
                
                const userInfo = await userInfoResponse.json();
                
                const googleUser = {
                  id: 'google_' + userInfo.sub,
                  name: userInfo.name || userInfo.email.split('@')[0],
                  email: userInfo.email,
                  photoURL: userInfo.picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(userInfo.name || 'User')}&background=4285F4&color=fff`,
                  provider: 'google',
                  createdAt: new Date().toISOString()
                };
                
                // Save to users list
                const users = JSON.parse(localStorage.getItem('krishimitra_users') || '[]');
                const existingUserIndex = users.findIndex(u => u.email === googleUser.email);
                if (existingUserIndex === -1) {
                  users.push(googleUser);
                } else {
                  users[existingUserIndex] = { ...users[existingUserIndex], ...googleUser };
                }
                localStorage.setItem('krishimitra_users', JSON.stringify(users));
                
                setUser(googleUser);
                setIsGuest(false);
                localStorage.setItem('krishimitra_user', JSON.stringify(googleUser));
                localStorage.removeItem('krishimitra_guest');
                
                resolve({ success: true, user: googleUser });
              } catch (error) {
                console.error('Google userinfo error:', error);
                reject({ success: false, error: 'Failed to get user info from Google' });
              }
            } else {
              reject({ success: false, error: 'No access token received' });
            }
          },
          error_callback: (error) => {
            console.error('Google OAuth error:', error);
            reject({ success: false, error: 'Google Sign-In was cancelled or failed' });
          }
        });

        // Request access token (opens Google popup)
        tokenClient.requestAccessToken({ prompt: 'select_account' });
        
      } catch (error) {
        console.error('Google Sign-In error:', error);
        reject({ success: false, error: error.message || 'Google Sign-In failed' });
      }
    });
  };

  // Guest Login
  const continueAsGuest = () => {
    const guestUser = {
      id: 'guest_' + Date.now(),
      name: 'Guest User',
      email: 'guest@krishimitra.com',
      isGuest: true,
      provider: 'guest'
    };
    
    setUser(guestUser);
    setIsGuest(true);
    localStorage.setItem('krishimitra_guest', 'true');
    localStorage.removeItem('krishimitra_user');
    
    return { success: true, user: guestUser };
  };

  // Logout
  const logout = () => {
    setUser(null);
    setIsGuest(false);
    localStorage.removeItem('krishimitra_user');
    localStorage.removeItem('krishimitra_guest');
  };

  // Update Profile
  const updateProfile = async (updates) => {
    try {
      const updatedUser = { ...user, ...updates };
      setUser(updatedUser);
      
      if (!isGuest) {
        localStorage.setItem('krishimitra_user', JSON.stringify(updatedUser));
        
        // Update in users list
        const users = JSON.parse(localStorage.getItem('krishimitra_users') || '[]');
        const userIndex = users.findIndex(u => u.id === user.id);
        if (userIndex !== -1) {
          users[userIndex] = { ...users[userIndex], ...updates };
          localStorage.setItem('krishimitra_users', JSON.stringify(users));
        }
      }
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const value = {
    user,
    loading,
    isGuest,
    isAuthenticated: !!user,
    signup,
    login,
    signInWithGoogle,
    continueAsGuest,
    logout,
    updateProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
