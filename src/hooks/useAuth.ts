'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { logger } from '@/lib/logger';
import { getAuthErrorMessage, getUserFacingErrorMessage } from '@/lib/errorHandling';
import { UserRole, DEFAULT_USER_ROLE, isValidRole, getRolePermissions, SubscriptionPlanId } from '@/types';

type TimestampLike = {
  toDate: () => Date;
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null;
};

const hasToDate = (value: unknown): value is TimestampLike => {
  return isRecord(value) && typeof value.toDate === 'function';
};

const parsePlan = (value: unknown): SubscriptionPlanId | undefined => {
  return value === 'free' || value === 'pro' || value === 'team' ? value : undefined;
};

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  role: UserRole;
  plan?: SubscriptionPlanId;
  subscriptionStatus?: string;
  subscriptionId?: string;
  stripeCustomerId?: string;
  subscriptionCurrentPeriodEnd?: Date;
  createdAt?: Date;
  lastLogin?: Date;
}

interface UseAuthReturn {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<boolean>;
  signUp: (email: string, password: string, displayName: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  isAuthenticated: boolean;
  // Helpers de permissões
  hasPermission: (permission: keyof ReturnType<typeof getRolePermissions>) => boolean;
  isAdmin: boolean;
  isManager: boolean;
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Busca o perfil do usuário no Firestore
  const fetchUserProfile = useCallback(async (firebaseUser: User) => {
    try {
      const userDocRef = doc(db, 'users', firebaseUser.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const rawData = userDoc.data();
        const data = isRecord(rawData) ? rawData : {};
        const rawRole = data.role;
        const role: UserRole =
          typeof rawRole === 'string' && isValidRole(rawRole) ? rawRole : DEFAULT_USER_ROLE;
        
        setUserProfile({
          uid: firebaseUser.uid,
          email: firebaseUser.email || '',
          displayName: typeof data.displayName === 'string' ? data.displayName : undefined,
          role,
          plan: parsePlan(data.plan),
          subscriptionStatus: typeof data.subscriptionStatus === 'string' ? data.subscriptionStatus : undefined,
          subscriptionId: typeof data.subscriptionId === 'string' ? data.subscriptionId : undefined,
          stripeCustomerId: typeof data.stripeCustomerId === 'string' ? data.stripeCustomerId : undefined,
          subscriptionCurrentPeriodEnd: hasToDate(data.subscriptionCurrentPeriodEnd)
            ? data.subscriptionCurrentPeriodEnd.toDate()
            : undefined,
          createdAt: hasToDate(data.createdAt) ? data.createdAt.toDate() : undefined,
          lastLogin: hasToDate(data.lastLogin) ? data.lastLogin.toDate() : undefined,
        });

        // Atualiza o último login
        await setDoc(userDocRef, { lastLogin: serverTimestamp() }, { merge: true });
      } else {
        // Cria perfil se não existir
        const newProfile = {
          email: firebaseUser.email,
          displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0],
          role: DEFAULT_USER_ROLE,
          createdAt: serverTimestamp(),
          lastLogin: serverTimestamp(),
        };
        await setDoc(userDocRef, newProfile);
        setUserProfile({
          uid: firebaseUser.uid,
          email: firebaseUser.email || '',
          displayName: newProfile.displayName,
          role: DEFAULT_USER_ROLE,
        });
      }
    } catch (error) {
      logger.error('Erro ao carregar perfil do usuário', {
        action: 'load_user_profile',
        metadata: { uid: firebaseUser.uid, error: String(error) },
        page: 'useAuth',
      });
      setError(getUserFacingErrorMessage(error, 'Erro ao carregar perfil do usuário. Algumas permissões podem ficar indisponíveis.'));
    }
  }, []);

  // Monitora mudanças no estado de autenticação
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      
      if (firebaseUser) {
        await fetchUserProfile(firebaseUser);
      } else {
        setUserProfile(null);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, [fetchUserProfile]);

  // Login com email e senha
  const signIn = useCallback(async (email: string, password: string): Promise<boolean> => {
    setError(null);
    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      return true;
    } catch (err) {
      const errorMessage = getAuthErrorMessage(err);
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // Registro de novo usuário
  const signUp = useCallback(async (email: string, password: string, displayName: string): Promise<boolean> => {
    setError(null);
    setLoading(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Atualiza o nome de exibição no Firebase Auth
      await updateProfile(userCredential.user, { displayName });

      // Cria o perfil do usuário no Firestore
      const userDocRef = doc(db, 'users', userCredential.user.uid);
      await setDoc(userDocRef, {
        email,
        displayName,
        role: DEFAULT_USER_ROLE,
        createdAt: serverTimestamp(),
        lastLogin: serverTimestamp(),
      });

      return true;
    } catch (err) {
      const errorMessage = getAuthErrorMessage(err);
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // Logout
  const signOut = useCallback(async () => {
    try {
      await firebaseSignOut(auth);
      setUser(null);
      setUserProfile(null);
      setError(null);
    } catch (error) {
      logger.error('Erro ao realizar logout', {
        action: 'sign_out',
        metadata: { error: String(error) },
        page: 'useAuth',
      });
      setError(getUserFacingErrorMessage(error, 'Erro ao sair da conta. Tente novamente.'));
    }
  }, []);

  // Helpers de permissões memoizados
  const permissions = useMemo(() => {
    if (!userProfile) return getRolePermissions('user');
    return getRolePermissions(userProfile.role);
  }, [userProfile]);

  const hasPermission = useCallback(
    (permission: keyof ReturnType<typeof getRolePermissions>) => {
      return permissions[permission] === true;
    },
    [permissions]
  );

  const isAdmin = useMemo(() => userProfile?.role === 'admin', [userProfile]);
  const isManager = useMemo(() => userProfile?.role === 'manager' || userProfile?.role === 'admin', [userProfile]);

  return {
    user,
    userProfile,
    loading,
    error,
    signIn,
    signUp,
    signOut,
    isAuthenticated: !!user,
    hasPermission,
    isAdmin,
    isManager,
  };
}
