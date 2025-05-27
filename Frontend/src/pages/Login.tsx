import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { GraduationCap, Loader2 } from "lucide-react";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState("");
  const { login, loading } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      console.log('Attempting login with:', { email });
      
      const success = await login(email, password);
      console.log('Login response:', success);

      if (success) {
        console.log('Login successful, redirecting to dashboard');
        navigate('/dashboard');
      } else {
        console.error('Login failed: Invalid credentials');
        setError('Invalid email or password');
      }
    } catch (error) {
      console.error('Login error:', error);
      if (error instanceof Error) {
        console.error('Error details:', {
          message: error.message,
          stack: error.stack,
          name: error.name
        });
      }
      setError('An error occurred during login');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow">
        <div className="flex flex-col items-center mb-6">
          <img
            src="/logo.png"
            alt="CBC Exam Centre logo"
            className="h-16 w-auto mb-2"
            title="CBC Exam Centre"
          />
          <h1 className="text-2xl font-bold text-center">CBC Exam Centre</h1>
        </div>
        <h2 className="text-3xl font-bold text-center">Login</h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Login</CardTitle>
              <CardDescription>
                Enter your credentials to access the system
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                />
              </div>
              {formError && (
                <div className="text-destructive text-sm">{formError}</div>
              )}
              <div className="text-sm text-muted-foreground pt-2">
                <p>Demo Credentials:</p>
                <p>Admin: admin@example.com / admin123</p>
                <p>Student: student1@example.com / student123</p>
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Logging in...
                  </>
                ) : (
                  "Log in"
                )}
              </Button>
            </CardFooter>
          </Card>
        </form>
      </div>
    </div>
  );
};

export default Login;
