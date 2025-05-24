import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Clock, Flag, CheckCircle, XCircle } from "lucide-react";
import { Exam, Question, ExamResult } from "@/types";
import { getExamById, getQuestionById, getExamResultByExamAndUserId, getExamResultsByUserId } from "@/lib/mockData";
import { useToast } from "@/components/ui/use-toast";
import { format } from "date-fns";

// Helper function to format dates
const formatDate = (dateString: string): string => {
  try {
    return format(new Date(dateString), "MMM d, yyyy h:mm a");
  } catch (error) {
    return "Invalid date";
  }
};

const ExamResults = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [exam, setExam] = useState<Exam | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [result, setResult] = useState<ExamResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const fetchData = async () => {
      if (!id || !user) {
        navigate("/my-exams");
        return;
      }
      
      try {
        setIsLoading(true);
        
        // Load exam data
        const examData = await getExamById(id);
        if (!examData) {
          toast({
            title: "Error",
            description: "Exam not found",
            variant: "destructive",
          });
          navigate("/my-exams");
          return;
        }
        
        setExam(examData);
        
        // Load questions
        const questionPromises = examData.questions
          .map(questionId => getQuestionById(questionId));
        
        const resolvedQuestions = await Promise.all(questionPromises);
        const validQuestions = resolvedQuestions.filter(q => q !== undefined) as Question[];
        
        setQuestions(validQuestions);
        
        // Load result
        const userResults = await getExamResultsByUserId(user.id);
        
        if (userResults.length === 0) {
          toast({
            title: "Error",
            description: "No results found for this exam",
            variant: "destructive",
          });
          navigate("/my-exams");
          return;
        }
        
        const examResult = userResults.find(r => String(r.examId) === String(id));
        if (!examResult) {
          toast({
            title: "Error",
            description: "No results found for this exam",
            variant: "destructive",
          });
          navigate("/my-exams");
          return;
        }
        
        setResult(examResult);
      } catch (error) {
        console.error("Error fetching exam results:", error);
        toast({
          title: "Error",
          description: "Failed to load exam results",
          variant: "destructive",
        });
        navigate("/my-exams");
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [id, user, navigate, toast]);
  
  if (isLoading || !exam || !result) {
    return <div>Loading...</div>;
  }
  
  const scorePercentage = Math.round((result.score / exam.totalScore) * 100);
  const passed = scorePercentage >= exam.passingScore;
  
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{exam.title} Results</CardTitle>
          <CardDescription>
            Your performance on this exam
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="text-lg font-medium">Score</div>
              <div className="text-4xl font-bold">{result.score} / {exam.totalScore}</div>
              <div className="text-sm text-muted-foreground">
                {scorePercentage}% - {passed ? "Passed" : "Failed"}
              </div>
              <Progress value={scorePercentage} />
            </div>
            
            <div className="space-y-2">
              <div className="text-lg font-medium">Details</div>
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-muted-foreground" />
                <span>Duration: {exam.duration} minutes</span>
              </div>
              <div className="flex items-center gap-2">
                <Flag size={16} className="text-muted-foreground" />
                <span>Passing Score: {exam.passingScore}%</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-sm text-muted-foreground">
                  {formatDate(result.completedAt)}
                </div>
              </div>
            </div>
          </div>
          
          <Separator />
          
          <div className="space-y-2">
            <h3 className="text-xl font-medium">Question Breakdown</h3>
            <p className="text-muted-foreground">
              Review your answers and see the correct solutions
            </p>
          </div>
          
          <div className="space-y-4">
            {questions.map((question, index) => {
              const answer = result.answers.find(a => a.questionId === question.id);
              
              return (
                <div key={question.id} className="p-4 border rounded-md">
                  <h4 className="font-medium">{index + 1}. {question.text}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm text-muted-foreground">
                      {question.score} points
                    </span>
                    {answer && answer.isCorrect === true ? (
                      <CheckCircle size={16} className="text-green-500" />
                    ) : answer && answer.isCorrect === false ? (
                      <XCircle size={16} className="text-red-500" />
                    ) : null}
                  </div>
                  
                  <div className="mt-2 space-y-2">
                    {question.options.map(choice => {
                      const isSelected = answer?.selectedChoices.includes(choice.id);
                      
                      return (
                        <div 
                          key={choice.id} 
                          className={`flex items-center gap-2 p-2 rounded-md ${
                            isSelected ? 'bg-primary/10' : ''
                          }`}
                        >
                          {isSelected ? (
                            choice.is_correct ? (
                              <CheckCircle size={16} className="text-green-500" />
                            ) : (
                              <XCircle size={16} className="text-red-500" />
                            )
                          ) : (
                            choice.is_correct ? (
                              <CheckCircle size={16} className="text-green-500" />
                            ) : null
                          )}
                          <span>{choice.text}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
      
      <Button onClick={() => navigate("/my-exams")}>
        Back to My Exams
      </Button>
    </div>
  );
};

export default ExamResults;
