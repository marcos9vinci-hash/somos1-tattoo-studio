import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, onSnapshot, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { UserProfile, OperationType, UserRole } from '../types';
import { handleFirestoreError } from '../lib/error-handler';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  isAuthenticated: boolean;
  loginAsAdmin: (pin: string) => boolean;
  logoutAdmin: () => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  isAdmin: false,
  isAuthenticated: false,
  loginAsAdmin: () => false,
  logoutAdmin: () => {},
  refreshProfile: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdminSession, setIsAdminSession] = useState(() => {
    return localStorage.getItem('somos1_admin_auth') === 'true';
  });

  const loginAsAdmin = (pin: string) => {
    const cleanPin = pin.trim().toLowerCase();
    if (['somos1', '2026', '1234', 'marcos'].includes(cleanPin)) {
      localStorage.setItem('somos1_admin_auth', 'true');
      setIsAdminSession(true);
      return true;
    }
    return false;
  };

  const logoutAdmin = () => {
    localStorage.removeItem('somos1_admin_auth');
    setIsAdminSession(false);
  };

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      
      if (!firebaseUser) {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (user) {
      const userRef = doc(db, 'users', user.uid);
      
      // CRM: Atualizar último acesso silenciosamente
      updateDoc(userRef, { 
        lastSeenAt: serverTimestamp() 
      }).catch(() => {}); // Falha silenciosa se não existir perfil ainda

      const unsubscribeProfile = onSnapshot(userRef, 
        (snapshot) => {
          if (snapshot.exists()) {
            setProfile(snapshot.data() as UserProfile);
          } else {
            setProfile(null);
          }
          setLoading(false);
        },
        (error) => {
          handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
          setLoading(false);
        }
      );
      return () => unsubscribeProfile();
    }
  }, [user]);

  // Apenas o telefone oficial do dono tem papel admin automático
  const adminPhones = ['5511957837132', '11957837132'];
  const userPhoneClean = (profile?.phone || user?.phoneNumber || '').replace(/\D/g, '');
  const isAdmin = 
    isAdminSession ||
    (profile?.role as any) === 'admin' || 
    (profile?.role as any) === UserRole.ADMIN || 
    (userPhoneClean.length > 8 && adminPhones.some(p => p.replace(/\D/g, '') === userPhoneClean));

  const value = {
    user,
    profile,
    loading,
    isAdmin,
    isAuthenticated: !!user,
    loginAsAdmin,
    logoutAdmin,
    refreshProfile: async () => {
      // With onSnapshot, this is mostly redundant but kept for API compatibility
    }
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
