import React, { createContext, useContext, useState, useEffect } from "react";
import { User } from "@/types";
import { loginUser } from "@/lib/apiClient";
import { useToast } from "@/components/ui/use-toast";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isAdmin: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const login = async (email: string, password: string): Promise<boolean> => {
    setLoading(true);
    try {
      console.log('AuthContext: Attempting login');
      const response = await loginUser(email, password);
      console.log('AuthContext: Login response:', response);

      if (response) {
        console.log('AuthContext: Login successful, storing auth data');
        localStorage.setItem('examUser', JSON.stringify({
          user: response.user,
          token: response.token
        }));
        
        setUser(response.user);
        console.log('AuthContext: User state updated');
        toast({
          title: "Login successful",
          description: `Welcome back, ${response.user.first_name}!`,
        });
        return true;
      }
      
      console.error('AuthContext: Login failed - Invalid credentials');
      toast({
        title: "Login failed",
        description: "Invalid email or password",
        variant: "destructive",
      });
      return false;
    } catch (error) {
      console.error('AuthContext: Login error:', error);
      if (error instanceof Error) {
        console.error('AuthContext: Error details:', {
          message: error.message,
          stack: error.stack,
          name: error.name
        });
      }
      toast({
        title: "Login error",
        description: "An error occurred during login",
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    console.log('AuthContext: Logging out');
    localStorage.removeItem('examUser');
    setUser(null);
    toast({
      title: "Logged out",
      description: "You have been successfully logged out",
    });
  };

  const isAdmin = () => {
    return user?.role === "admin";
  };

  useEffect(() => {
    const loadUser = () => {
      try {
        console.log('AuthContext: Loading user from localStorage');
        const authData = localStorage.getItem('examUser');
        if (authData) {
          const { user } = JSON.parse(authData);
          console.log('AuthContext: User loaded:', user);
          setUser(user);
        } else {
          console.log('AuthContext: No user data found in localStorage');
        }
      } catch (error) {
        console.error('AuthContext: Error loading user:', error);
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
