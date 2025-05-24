import { useState, useEffect } from "react";
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
import { 
  GraduationCap, 
  Clock, 
  FileText,
  CheckCircle,
  Calendar
} from "lucide-react";
import { 
  getExamById, 
  getExamResultsByUserId, 
  getExamsByUserId 
} from "@/lib/mockData";
import { Exam, ExamResult } from "@/types";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const MyExams = () => {
  const { user } = useAuth();
  const [exams, setExams] = useState<Exam[]>([]);
  const [completedExams, setCompletedExams] = useState<string[]>([]);
  const [examToStart, setExamToStart] = useState<Exam | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  
  useEffect(() => {
    if (user) {
      const fetchExams = async () => {
        try {
          setIsLoading(true);
          // Get all exams assigned to the user
          const userExams = await getExamsByUserId(user.id);
          console.log("User ID:", user.id);
          console.log("Fetched exams:", userExams);
          setExams(userExams);
          
          // Get all completed exams
          const results = await getExamResultsByUserId(user.id);
          console.log("User exam results:", results);
          setCompletedExams(results.map(result => result.examId));
        } catch (error) {
          console.error("Error fetching exams:", error);
        } finally {
          setIsLoading(false);
        }
      };
      
      fetchExams();
    }
  }, [user]);
  
  const handleStartExam = () => {
    if (examToStart) {
      navigate(`/exam/take/${examToStart.id}`);
    }
  };

  if (isLoading) {
    return <div>Loading your exams...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Exams</h1>
        <p className="text-muted-foreground">
          View and take your assigned exams
        </p>
      </div>
      
      {exams.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <GraduationCap size={48} className="text-muted-foreground mb-4" />
            <h2 className="text-xl font-medium mb-2">No Exams Available</h2>
            <p className="text-center text-muted-foreground">
              You don't have any exams assigned to you at the moment.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {exams.map((exam) => {
            const isCompleted = completedExams.includes(exam.id);
            
            return (
              <Card key={exam.id} className="overflow-hidden">
                <div className="bg-primary h-2"></div>
                <CardHeader>
                  <CardTitle>{exam.title}</CardTitle>
                  <CardDescription>{exam.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <Clock size={14} className="text-muted-foreground" />
                        <span>{exam.duration} minutes</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <FileText size={14} className="text-muted-foreground" />
                        <span>{exam.questions.length} questions</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle size={14} className="text-muted-foreground" />
                        <span>Passing score: {exam.passingScore}%</span>
                      </div>
                    </div>
                    
                    {isCompleted ? (
                      <div className="flex justify-between items-center">
                        <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1">
                          <CheckCircle size={14} />
                          <span>Completed</span>
                        </div>
                        <Button 
                          variant="outline"
                          onClick={() => navigate(`/exam/results/${exam.id}`)}
                        >
                          View Results
                        </Button>
                      </div>
                    ) : (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button className="w-full" onClick={() => setExamToStart(exam)}>
                            Start Exam
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Start Exam?</AlertDialogTitle>
                            <AlertDialogDescription>
                              <span>
                                You are about to start "{exam.title}". This exam has a time limit of {exam.duration} minutes.
                                Once started, the timer cannot be paused and the exam will be automatically submitted when time runs out.
                              </span>
                              <div className="mt-4 p-4 border rounded-md bg-slate-50">
                                <div className="font-medium">{exam.title}</div>
                                <div className="mt-2 space-y-1">
                                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Clock size={14} />
                                    <span>{exam.duration} minutes</span>
                                  </div>
                                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <FileText size={14} />
                                    <span>{exam.questions.length} questions</span>
                                  </div>
                                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <CheckCircle size={14} />
                                    <span>Total score: {exam.totalScore} points</span>
                                  </div>
                                </div>
                              </div>
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleStartExam}>
                              Start Now
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MyExams;
