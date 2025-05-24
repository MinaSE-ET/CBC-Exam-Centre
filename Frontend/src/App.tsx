import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Layout from "@/components/Layout";
import { useState, useEffect } from "react";

// Pages
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Questions from "./pages/Questions";
import QuestionForm from "./pages/QuestionForm";
import Exams from "./pages/Exams";
import ExamForm from "./pages/ExamForm";
import Users from "./pages/Users";
import MyExams from "./pages/MyExams";
import TakeExam from "./pages/TakeExam";
import ExamResults from "./pages/ExamResults";
import NotFound from "./pages/NotFound";
import AllResults from "./pages/AllResults";

const queryClient = new QueryClient();

// Protected route component
const ProtectedRoute = ({ 
  children, 
  requireAdmin = false,
}: { 
  children: React.ReactNode;
  requireAdmin?: boolean;
}) => {
  const { user, loading, isAdmin } = useAuth();
  
  if (loading) {
    return <div>Loading...</div>;
  }
  
  if (!user) {
    return <Navigate to="/login" />;
  }
  
  if (requireAdmin && !isAdmin()) {
    return <Navigate to="/dashboard" />;
  }
  
  return <>{children}</>;
};

// Login page component
const LoginPage = () => {
  const { login, user } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      if (user.role === 'admin') {
        navigate('/questions');
      } else {
        navigate('/dashboard');
      }
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const success = await login(email, password);
      if (success) {
        if (user?.role === 'admin') {
          navigate('/questions');
        } else {
          navigate('/dashboard');
        }
      }
    } catch (err) {
      // Error is handled by the auth context
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow">
        <h2 className="text-3xl font-bold text-center">Login</h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              required
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Sign in
          </button>
        </form>
      </div>
    </div>
  );
};

// Main app component
const AppRoutes = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      
      <Route path="/" element={<Navigate to="/dashboard" />} />
      
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <Layout>
            <Dashboard />
          </Layout>
        </ProtectedRoute>
      } />
      
      {/* Admin Routes */}
      <Route path="/questions" element={
        <ProtectedRoute requireAdmin>
          <Layout>
            <Questions />
          </Layout>
        </ProtectedRoute>
      } />
      
      <Route path="/all-results" element={
        <ProtectedRoute requireAdmin>
          <Layout>
            <AllResults />
          </Layout>
        </ProtectedRoute>
      } />
      
      <Route path="/questions/new" element={
        <ProtectedRoute requireAdmin>
          <Layout>
            <QuestionForm />
          </Layout>
        </ProtectedRoute>
      } />
      
      <Route path="/questions/:id" element={
        <ProtectedRoute requireAdmin>
          <Layout>
            <QuestionForm />
          </Layout>
        </ProtectedRoute>
      } />
      
      <Route path="/exams" element={
        <ProtectedRoute requireAdmin>
          <Layout>
            <Exams />
          </Layout>
        </ProtectedRoute>
      } />
      
      <Route path="/exams/new" element={
        <ProtectedRoute requireAdmin>
          <Layout>
            <ExamForm />
          </Layout>
        </ProtectedRoute>
      } />
      
      <Route path="/exams/:id" element={
        <ProtectedRoute requireAdmin>
          <Layout>
            <ExamForm />
          </Layout>
        </ProtectedRoute>
      } />
      
      <Route path="/users" element={
        <ProtectedRoute requireAdmin>
          <Layout>
            <Users />
          </Layout>
        </ProtectedRoute>
      } />
      
      {/* Student Routes */}
      <Route path="/my-exams" element={
        <ProtectedRoute>
          <Layout>
            <MyExams />
          </Layout>
        </ProtectedRoute>
      } />
      
      <Route path="/exam/take/:id" element={
        <ProtectedRoute>
          <Layout>
            <TakeExam />
          </Layout>
        </ProtectedRoute>
      } />
      
      <Route path="/exam/results/:id" element={
        <ProtectedRoute>
          <Layout>
            <ExamResults />
          </Layout>
        </ProtectedRoute>
      } />
      
      {/* 404 Route */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

// Root app component
const App = () => (
  <BrowserRouter>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <AppRoutes />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  </BrowserRouter>
);

export default App;
