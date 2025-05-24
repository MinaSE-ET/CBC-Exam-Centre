
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { GraduationCap } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();
  
  useEffect(() => {
    // Redirect to dashboard if there's a user logged in
    const savedUser = localStorage.getItem("examUser");
    if (savedUser) {
      navigate("/dashboard");
    }
  }, [navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4">
      <div className="max-w-md w-full text-center">
        <div className="flex justify-center mb-4">
          <div className="bg-primary rounded-full p-4 text-white">
            <GraduationCap size={48} />
          </div>
        </div>
        
        <h1 className="text-4xl font-bold mb-3">Online Exam System</h1>
        
        <p className="text-lg text-muted-foreground mb-8">
          A comprehensive platform for creating, managing, and taking exams online.
        </p>
        
        <div className="space-y-4">
          <Button 
            size="lg" 
            className="w-full"
            onClick={() => navigate("/login")}
          >
            Get Started
          </Button>
          
          <div className="text-sm text-muted-foreground">
            <p>Demo accounts:</p>
            <p><strong>Admin:</strong> admin / any password</p>
            <p><strong>Student:</strong> student1 / any password</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
