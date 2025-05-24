import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  FileText, 
  Users, 
  BookOpen, 
  BarChart, 
  GraduationCap, 
  Plus, 
  Clock, 
  CheckCircle, 
  XCircle 
} from "lucide-react";
import { DashboardStats, ExamResult, Exam } from "@/types";
import { getDashboardStats, getExamById, getExamResultsByUserId } from "@/lib/apiClient";
import { useToast } from "@/components/ui/use-toast";

const DashboardCard = ({
  title,
  value,
  description,
  icon,
}: {
  title: string;
  value: number | string;
  description: string;
  icon: React.ReactNode;
}) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <div className="text-primary">{icon}</div>
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
      <p className="text-xs text-muted-foreground">{description}</p>
    </CardContent>
  </Card>
);

const ResultItem = ({ result }: { result: ExamResult }) => {
  const [exam, setExam] = useState<Exam | null>(null);
  const scorePercentage = Math.round((result.score / (exam?.totalScore || 1)) * 100);
  
  useEffect(() => {
    const fetchExam = async () => {
      try {
        const examData = await getExamById(result.examId);
        setExam(examData);
      } catch (error) {
        console.error("Error fetching exam:", error);
      }
    };
    
    fetchExam();
  }, [result.examId]);
  
  if (!exam) return <div>Loading...</div>;
  
  // Use percentage-based pass/fail logic
  const passed = scorePercentage >= exam.passingScore;
  
  return (
    <div className="flex items-center justify-between p-4 border-b border-border">
      <div className="flex-1">
        <h3 className="font-medium">{exam.title || "Unknown Exam"}</h3>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock size={14} />
          <span>
            {new Date(result.completedAt).toLocaleDateString()}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-right">
          <div className="text-sm font-medium">
            {result.score}/{exam.totalScore}
          </div>
          <div className="text-xs text-muted-foreground">{scorePercentage}%</div>
        </div>
        <div>
          {passed ? (
            <CheckCircle size={20} className="text-green-500" />
          ) : (
            <XCircle size={20} className="text-red-500" />
          )}
        </div>
      </div>
    </div>
  );
};

const AdminDashboard = ({ stats }: { stats: DashboardStats }) => {
  const navigate = useNavigate();
  
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <DashboardCard
          title="Total Exams"
          value={stats.totalExams}
          description="Across all courses"
          icon={<BookOpen size={18} />}
        />
        <DashboardCard
          title="Total Questions"
          value={stats.totalQuestions}
          description="In the question bank"
          icon={<FileText size={18} />}
        />
        <DashboardCard
          title="Total Users"
          value={stats.totalUsers}
          description="Registered in the system"
          icon={<Users size={18} />}
        />
        <DashboardCard
          title="Completion Rate"
          value="85%"
          description="Average exam completion"
          icon={<BarChart size={18} />}
        />
      </div>
      
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Exams</CardTitle>
              <CardDescription>Recently created exams</CardDescription>
            </div>
            <Button size="sm" onClick={() => navigate("/exams")}>
              View all
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-0">
              {stats.recentExams.map((exam) => (
                <div
                  key={exam.id}
                  className="flex items-center justify-between p-4 border-b border-border"
                >
                  <div>
                    <h3 className="font-medium">{exam.title}</h3>
                    <div className="text-sm text-muted-foreground">
                      {exam.questions.length} questions · {exam.duration} minutes
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(`/exams/${exam.id}`)}
                  >
                    View
                  </Button>
                </div>
              ))}
              
              {stats.recentExams.length === 0 && (
                <div className="py-8 text-center text-muted-foreground">
                  No exams created yet
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Results</CardTitle>
              <CardDescription>Latest exam submissions</CardDescription>
            </div>
            <Button size="sm" onClick={() => navigate("/exams")}>
              View all
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-0">
              {stats.recentResults.map((result) => (
                <ResultItem key={result.id} result={result} />
              ))}
              
              {stats.recentResults.length === 0 && (
                <div className="py-8 text-center text-muted-foreground">
                  No results available yet
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div className="flex space-x-4">
        <Button onClick={() => navigate("/questions/new")} className="gap-2">
          <Plus size={16} />
          <span>Add Question</span>
        </Button>
        <Button onClick={() => navigate("/exams/new")} className="gap-2">
          <Plus size={16} />
          <span>Create Exam</span>
        </Button>
      </div>
    </div>
  );
};

const StudentDashboard = () => {
  const { user } = useAuth();
  const [results, setResults] = useState<ExamResult[]>([]);
  const navigate = useNavigate();
  const { toast } = useToast();
  
  useEffect(() => {
    const fetchResults = async () => {
      if (!user?.id) {
        console.log("No user ID available");
        return;
      }
      
      try {
        console.log("Fetching results for user:", user.id);
        const userResults = await getExamResultsByUserId(user.id);
        setResults(userResults);
      } catch (error) {
        console.error("Error fetching results:", error);
        toast({
          title: "Error",
          description: "Failed to fetch exam results",
          variant: "destructive",
        });
      }
    };
    
    fetchResults();
  }, [user, toast]);
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>My Exam Results</CardTitle>
          <CardDescription>
            View your performance on completed exams
          </CardDescription>
        </CardHeader>
        <CardContent>
          {results.length > 0 ? (
            <div className="space-y-0">
              {results.map((result) => (
                <ResultItem key={result.id} result={result} />
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              You haven't completed any exams yet
            </div>
          )}
        </CardContent>
      </Card>
      
      <Button onClick={() => navigate("/my-exams")} className="gap-2">
        <GraduationCap size={16} />
        <span>View Available Exams</span>
      </Button>
    </div>
  );
};

const Dashboard = () => {
  const { isAdmin } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  
  useEffect(() => {
    // Get dashboard stats
    const fetchStats = async () => {
      try {
        const dashboardStats = await getDashboardStats();
        setStats(dashboardStats);
      } catch (error) {
        console.error("Error fetching dashboard stats:", error);
      }
    };
    
    fetchStats();
  }, []);
  
  if (!stats) {
    return <div>Loading...</div>;
  }
  
  return (
    <div>
      {isAdmin() ? <AdminDashboard stats={stats} /> : <StudentDashboard />}
    </div>
  );
};

export default Dashboard;
