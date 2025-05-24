import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { 
  Clock, 
  ChevronLeft, 
  ChevronRight, 
  Flag, 
  AlertTriangle,
  Loader2,
  CheckCircle
} from "lucide-react";
import { 
  getExamById, 
  getQuestionById, 
  createExamResult 
} from "@/lib/apiClient";
import { Exam, Question, ExamResult } from "@/types";
import { useToast } from "@/components/ui/use-toast";
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

interface ExamAnswer {
  questionId: string;
  selectedChoices: string[];
}

const formatTime = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
};

const QuestionView = ({
  question,
  answer,
  setAnswer,
}: {
  question: Question;
  answer: ExamAnswer;
  setAnswer: (answer: ExamAnswer) => void;
}) => {
  const handleSingleChoiceChange = (choiceId: string) => {
    setAnswer({
      ...answer,
      selectedChoices: [choiceId],
    });
  };
  
  const handleMultipleChoiceChange = (choiceId: string, checked: boolean) => {
    if (checked) {
      setAnswer({
        ...answer,
        selectedChoices: [...answer.selectedChoices, choiceId],
      });
    } else {
      setAnswer({
        ...answer,
        selectedChoices: answer.selectedChoices.filter(id => id !== choiceId),
      });
    }
  };
  
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">{question.text}</h3>
        <div className="flex items-center gap-2 mt-1">
          <span className={`px-2 py-0.5 text-xs rounded-md border ${
            question.difficulty === 'easy' 
              ? 'bg-green-100 text-green-800 border-green-200' 
              : question.difficulty === 'medium'
                ? 'bg-yellow-100 text-yellow-800 border-yellow-200'
                : 'bg-red-100 text-red-800 border-red-200'
          }`}>
            {question.difficulty.charAt(0).toUpperCase() + question.difficulty.slice(1)}
          </span>
          <span className="text-sm text-muted-foreground">
            {question.score} points
          </span>
        </div>
      </div>
      
      <div className="space-y-3">
        {question.type === "single_choice" ? (
          <RadioGroup
            value={answer.selectedChoices[0] || ""}
            onValueChange={handleSingleChoiceChange}
            className="space-y-3"
          >
            {question.options?.map((option) => (
              <div
                key={option.id}
                className="flex items-start space-x-3 p-3 border rounded-md"
              >
                <RadioGroupItem value={option.id} id={option.id} />
                <Label
                  htmlFor={option.id}
                  className="cursor-pointer font-normal flex-1"
                >
                  {option.text}
                </Label>
              </div>
            ))}
          </RadioGroup>
        ) : (
          <div className="space-y-3">
            {question.options?.map((option) => (
              <div
                key={option.id}
                className="flex items-start space-x-3 p-3 border rounded-md"
              >
                <Checkbox
                  id={option.id}
                  checked={answer.selectedChoices.includes(option.id)}
                  onCheckedChange={(checked) => 
                    handleMultipleChoiceChange(option.id, checked as boolean)
                  }
                />
                <Label
                  htmlFor={option.id}
                  className="cursor-pointer font-normal flex-1"
                >
                  {option.text}
                </Label>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const TakeExam = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [exam, setExam] = useState<Exam | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<ExamAnswer[]>([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false); // Fixed boolean type
  const [isSubmitDialogOpen, setIsSubmitDialogOpen] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const loadExamData = async () => {
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
        
        // Verify user has access to this exam
        const hasAccess = examData.assignedUsers.includes(user.id);
        if (!hasAccess) {
          toast({
            title: "Error",
            description: "You don't have access to this exam",
            variant: "destructive",
          });
          navigate("/my-exams");
          return;
        }
        
        setExam(examData);
        setTimeLeft(examData.duration * 60);
        
        // Load questions
        const questionPromises = examData.questions
          .map(questionId => getQuestionById(questionId));
        
        const resolvedQuestions = await Promise.all(questionPromises);
        const validQuestions = resolvedQuestions.filter(q => q !== undefined) as Question[];
        
        setQuestions(validQuestions);
        
        // Initialize answers
        const initialAnswers = validQuestions.map(question => ({
          questionId: question.id,
          selectedChoices: [],
        }));
        
        setAnswers(initialAnswers);
      } catch (error) {
        console.error("Error loading exam:", error);
        toast({
          title: "Error",
          description: "Failed to load exam",
          variant: "destructive",
        });
        navigate("/my-exams");
      } finally {
        setIsLoading(false);
      }
    };
    
    loadExamData();
  }, [id, user, navigate, toast]);
  
  useEffect(() => {
    if (!hasStarted || !exam) return;
    
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmitExam();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [hasStarted, exam]);
  
  const startExam = () => {
    setHasStarted(true);
    setStartTime(new Date());
    
    // Request full screen if possible
    const element = document.documentElement;
    if (element.requestFullscreen) {
      element.requestFullscreen().catch(err => {
        console.warn("Could not enter fullscreen mode:", err);
      });
    }
    
    // Warn on tab switch or browser close
    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  };
  
  const handleBeforeUnload = (e: BeforeUnloadEvent) => {
    // Show a warning if the user tries to leave the page
    const message = "You are in the middle of an exam. Leaving this page will cancel your progress.";
    e.returnValue = message;
    return message;
  };
  
  const handleVisibilityChange = () => {
    if (document.visibilityState === "hidden") {
      toast({
        title: "Warning",
        description: "Leaving the exam page may result in your exam being submitted automatically.",
        variant: "destructive",
      });
    }
  };
  
  const handleAnswerChange = (answer: ExamAnswer) => {
    setAnswers(answers.map(a => 
      a.questionId === answer.questionId ? answer : a
    ));
  };
  
  const goToNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };
  
  const goToPreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };
  
  const handleSubmitExam = async () => {
    if (!exam || !user || !startTime) return;
    
    setIsSubmitting(true);
    
    try {
      // Exit fullscreen if active
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      }
      
      // Calculate results
      const questionMap = new Map<string, Question>();
      questions.forEach(q => questionMap.set(q.id, q));
      
      const scoredAnswers = answers.map(answer => {
        const question = questionMap.get(answer.questionId);
        if (!question) return null;
        
        // Check if answer is correct
        const correctChoiceIds = question.options
          .filter(c => c.is_correct)
          .map(c => c.id);
        
        const selectedChoiceIds = answer.selectedChoices;
        
        let isCorrect = false;
        
        if (question.type === "single_choice") {
          // For single choice, there should be exactly one correct answer
          isCorrect = 
            selectedChoiceIds.length === 1 && 
            correctChoiceIds.includes(selectedChoiceIds[0]);
        } else {
          // For multiple choice, selected choices must exactly match correct choices
          isCorrect = 
            selectedChoiceIds.length === correctChoiceIds.length &&
            correctChoiceIds.every(id => selectedChoiceIds.includes(id));
        }
        
        return {
          questionId: question.id,
          selectedChoices: selectedChoiceIds,
          isCorrect,
          score: isCorrect ? question.score : 0,
        };
      }).filter(Boolean) as {
        questionId: string;
        selectedChoices: string[];
        isCorrect: boolean;
        score: number;
      }[];
      
      // Calculate total score
      const totalScore = scoredAnswers.reduce((sum, answer) => sum + answer.score, 0);
      const passingScore = exam.passingScore;
      const scorePercentage = Math.round((totalScore / exam.totalScore) * 100);
      const passed = scorePercentage >= passingScore;
      
      console.log('Calculated exam results:', {
        totalScore,
        passingScore,
        scorePercentage,
        passed,
        scoredAnswers
      });
      
      // Create exam result
      const result: ExamResult = {
        examId: exam.id,
        userId: user.id,
        score: totalScore,
        status: passed ? "passed" : "failed" as "passed" | "failed",
        passed,
        answers: scoredAnswers,
        startedAt: startTime.toISOString(),
        completedAt: new Date().toISOString()
      };
      
      console.log('Submitting exam result:', JSON.stringify(result, null, 2));
      console.log('User:', user);
      console.log('Exam:', exam);
      
      const response = await createExamResult(result);
      console.log('Exam result submission response:', response);
      
      // Navigate to results page
      navigate(`/exam/results/${exam.id}`);
    } catch (error) {
      console.error("Error submitting exam:", error);
      if (error instanceof Error) {
        console.error("Error details:", {
          message: error.message,
          stack: error.stack,
          name: error.name
        });
      }
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An error occurred while submitting your exam",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (isLoading || (!exam && !hasStarted)) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <Loader2 className="mr-2 h-6 w-6 animate-spin" />
        <span>Loading exam...</span>
      </div>
    );
  }
  
  if (!hasStarted && exam) {
    return (
      <div className="max-w-3xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">{exam.title}</CardTitle>
            <CardDescription>{exam.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="p-4 border rounded-md bg-slate-50">
              <h3 className="font-medium mb-3">Exam Details</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Clock size={16} className="text-muted-foreground" />
                  <span>Duration: {exam.duration} minutes</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle size={16} className="text-muted-foreground" />
                  <span>Total Questions: {questions.length}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Flag size={16} className="text-muted-foreground" />
                  <span>Total Score: {exam.totalScore} points</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle size={16} className="text-muted-foreground" />
                  <span>Passing Score: {exam.passingScore}%</span>
                </div>
              </div>
            </div>
            
            <div className="p-4 border rounded-md border-yellow-200 bg-yellow-50">
              <div className="flex gap-2">
                <AlertTriangle size={18} className="text-yellow-600 mt-0.5" />
                <div>
                  <h3 className="font-medium text-yellow-800 mb-1">Important Instructions</h3>
                  <ul className="list-disc list-inside space-y-1 text-sm text-yellow-700">
                    <li>Once you start, the timer cannot be paused</li>
                    <li>The exam will automatically submit when time runs out</li>
                    <li>Leaving the exam page may result in submission</li>
                    <li>Ensure you have a stable internet connection</li>
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button className="w-full" onClick={startExam}>
              Begin Exam
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }
  
  const currentQuestion = questions[currentQuestionIndex];
  const currentAnswer = answers.find(a => a.questionId === currentQuestion.id) || {
    questionId: currentQuestion.id,
    selectedChoices: [],
  };
  
  const progressPercentage = (currentQuestionIndex / questions.length) * 100;
  const isFirstQuestion = currentQuestionIndex === 0;
  const isLastQuestion = currentQuestionIndex === questions.length - 1;
  
  return (
    <div className="max-w-3xl mx-auto">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>{exam.title}</CardTitle>
              <CardDescription>
                Question {currentQuestionIndex + 1} of {questions.length}
              </CardDescription>
            </div>
            <div className="text-xl font-bold flex items-center gap-2">
              <Clock size={18} className={`${timeLeft < 60 ? 'text-red-500 animate-pulse' : 'text-muted-foreground'}`} />
              <span className={timeLeft < 60 ? 'text-red-500' : ''}>
                {formatTime(timeLeft)}
              </span>
            </div>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </CardHeader>
        
        <CardContent>
          <QuestionView
            question={currentQuestion}
            answer={currentAnswer}
            setAnswer={handleAnswerChange}
          />
        </CardContent>
        
        <CardFooter className="flex justify-between">
          <Button
            variant="outline"
            onClick={goToPreviousQuestion}
            disabled={isFirstQuestion}
            className="gap-2"
          >
            <ChevronLeft size={16} />
            Previous
          </Button>
          
          <div>
            {isLastQuestion ? (
              <AlertDialog open={isSubmitDialogOpen} onOpenChange={setIsSubmitDialogOpen}>
                <AlertDialogTrigger asChild>
                  <Button>Submit Exam</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Submit Exam?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to submit your exam? This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  
                  <div className="mt-4 space-y-2">
                    <div className="p-3 border rounded-md bg-slate-50">
                      <div className="flex justify-between items-center">
                        <span>Total Questions:</span>
                        <span className="font-medium">{questions.length}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Answered Questions:</span>
                        <span className="font-medium">
                          {answers.filter(a => a.selectedChoices.length > 0).length}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Unanswered Questions:</span>
                        <span className="font-medium text-yellow-600">
                          {answers.filter(a => a.selectedChoices.length === 0).length}
                        </span>
                      </div>
                    </div>
                    
                    {answers.some(a => a.selectedChoices.length === 0) && (
                      <div className="text-yellow-600 text-sm flex gap-2 items-start">
                        <AlertTriangle size={16} className="mt-0.5" />
                        <span>
                          You have unanswered questions. Are you sure you want to submit?
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <AlertDialogFooter>
                    <AlertDialogCancel>Back to Exam</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={handleSubmitExam}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        "Submit Exam"
                      )}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ) : (
              <Button onClick={goToNextQuestion} className="gap-2">
                Next
                <ChevronRight size={16} />
              </Button>
            )}
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};

export default TakeExam;
