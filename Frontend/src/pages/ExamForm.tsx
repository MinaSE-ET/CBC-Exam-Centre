import { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowLeft, 
  Clock, 
  FileText, 
  Check, 
  Users, 
  Plus, 
  Minus, 
  Search,
  Loader2
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  getExamById,
  getQuestions,
  getUsers,
  createExam,
  updateExam,
} from "@/lib/database";
import { Question, User } from "@/types";
import { useToast } from "@/components/ui/use-toast";

interface QuestionItemProps {
  question: Question;
  isSelected: boolean;
  onToggle: () => void;
}

const QuestionItem = ({ question, isSelected, onToggle }: QuestionItemProps) => {
  const difficultyColors = {
    easy: "bg-green-100 text-green-800 border-green-200",
    medium: "bg-yellow-100 text-yellow-800 border-yellow-200",
    hard: "bg-red-100 text-red-800 border-red-200",
  };
  
  return (
    <div className={`p-3 border rounded-md ${isSelected ? 'border-primary bg-primary/5' : ''}`}>
      <div className="flex items-start gap-3">
        <Checkbox
          checked={isSelected}
          onCheckedChange={onToggle}
          id={`question-${question.id}`}
        />
        <div className="flex-1">
          <label 
            htmlFor={`question-${question.id}`}
            className="block font-medium cursor-pointer"
          >
            {question.text}
          </label>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
            <span className={`px-2 py-0.5 rounded-md border ${difficultyColors[question.difficulty]}`}>
              {question.difficulty.charAt(0).toUpperCase() + question.difficulty.slice(1)}
            </span>
            <span className="text-muted-foreground">
              {question.type === "single_choice" ? "Single Choice" : "Multiple Choice"}
            </span>
            <span className="text-muted-foreground">
              {question.score} points
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

interface UserItemProps {
  user: User;
  isSelected: boolean;
  onToggle: () => void;
}

const UserItem = ({ user, isSelected, onToggle }: UserItemProps) => {
  return (
    <div className={`p-3 border rounded-md ${isSelected ? 'border-primary bg-primary/5' : ''}`}>
      <div className="flex items-start gap-3">
        <Checkbox
          checked={isSelected}
          onCheckedChange={onToggle}
          id={`user-${user.id}`}
        />
        <div className="flex-1">
          <label 
            htmlFor={`user-${user.id}`}
            className="block font-medium cursor-pointer"
          >
            {user.name}
          </label>
          <div className="text-sm text-muted-foreground">
            {user.email}
          </div>
          <div className="text-xs text-muted-foreground">
            {user.role}
          </div>
        </div>
      </div>
    </div>
  );
};

const ExamForm = () => {
  const { id } = useParams();
  const isEditing = Boolean(id);
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [isLoading, setIsLoading] = useState(false);
  const [tab, setTab] = useState("details");
  
  // Basic exam details
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState(30);
  const [passingScore, setPassingScore] = useState(60);
  const [status, setStatus] = useState<"draft" | "published" | "archived">("draft");
  
  // Questions and users
  const [allQuestions, setAllQuestions] = useState<Question[]>([]);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);
  const [questionSearchQuery, setQuestionSearchQuery] = useState("");
  
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [userSearchQuery, setUserSearchQuery] = useState("");
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Load all questions and users
        const questions = await getQuestions();
        setAllQuestions(questions);
        
        const users = await getUsers();
        setAllUsers(users.filter(user => user.role === "student"));
        
        // If editing, load exam data
        if (isEditing && id) {
          const exam = await getExamById(id);
          if (exam) {
            setTitle(exam.title);
            setDescription(exam.description);
            setDuration(exam.duration);
            setPassingScore(exam.passingScore);
            setStatus(exam.status);
            setSelectedQuestionIds(exam.questions);
            setSelectedUserIds(exam.assignedUsers);
          } else {
            toast({
              title: "Exam not found",
              description: "The exam you're trying to edit doesn't exist.",
              variant: "destructive",
            });
            navigate("/exams");
          }
        }
      } catch (error) {
        console.error("Error fetching exam data:", error);
        toast({
          title: "Error",
          description: "Failed to load exam data",
          variant: "destructive",
        });
      }
    };
    
    fetchData();
  }, [id, isEditing, navigate, toast]);
  
  const filteredQuestions = useMemo(() => {
    return allQuestions.filter(question => 
      question.text.toLowerCase().includes(questionSearchQuery.toLowerCase())
    );
  }, [allQuestions, questionSearchQuery]);
  
  const filteredUsers = useMemo(() => {
    return allUsers.filter(user => {
      const fullName = `${user.first_name} ${user.last_name}`.toLowerCase();
      return fullName.includes(userSearchQuery.toLowerCase()) ||
             user.email.toLowerCase().includes(userSearchQuery.toLowerCase());
    });
  }, [allUsers, userSearchQuery]);
  
  const totalScore = useMemo(() => {
    return allQuestions
      .filter(q => selectedQuestionIds.includes(q.id))
      .reduce((sum, q) => sum + q.score, 0);
  }, [allQuestions, selectedQuestionIds]);
  
  const toggleQuestion = (questionId: string) => {
    setSelectedQuestionIds(prev => 
      prev.includes(questionId)
        ? prev.filter(id => id !== questionId)
        : [...prev, questionId]
    );
  };
  
  const toggleUser = (userId: string) => {
    setSelectedUserIds(prev => 
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };
  
  const handleSelectAllQuestions = () => {
    setSelectedQuestionIds(filteredQuestions.map(q => q.id));
  };
  
  const handleDeselectAllQuestions = () => {
    setSelectedQuestionIds([]);
  };
  
  const handleSelectAllUsers = () => {
    setSelectedUserIds(filteredUsers.map(u => u.id));
  };
  
  const handleDeselectAllUsers = () => {
    setSelectedUserIds([]);
  };
  
  const validateForm = () => {
    if (!title.trim()) {
      toast({
        title: "Error",
        description: "Please enter a title for the exam.",
        variant: "destructive",
      });
      setTab("details");
      return false;
    }
    
    if (duration <= 0) {
      toast({
        title: "Error",
        description: "Duration must be greater than 0.",
        variant: "destructive",
      });
      setTab("details");
      return false;
    }
    
    if (selectedQuestionIds.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one question for the exam.",
        variant: "destructive",
      });
      setTab("questions");
      return false;
    }
    
    if (status === "published" && selectedUserIds.length === 0) {
      toast({
        title: "Error",
        description: "Published exams must be assigned to at least one user.",
        variant: "destructive",
      });
      setTab("users");
      return false;
    }
    
    return true;
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsLoading(true);
    
    try {
      const examData = {
        title,
        description,
        duration,
        totalScore,
        passingScore,
        questions: selectedQuestionIds,
        assignedUsers: selectedUserIds || [],
        status,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      if (isEditing && id) {
        const updatedExam = await updateExam({
          id,
          ...examData
        });
        
        if (!updatedExam) {
          throw new Error('Failed to update exam');
        }
        
        toast({
          title: "Exam updated",
          description: "The exam has been updated successfully.",
        });
      } else {
        const createdExam = await createExam(examData);
        
        if (!createdExam) {
          throw new Error('Failed to create exam');
        }
        
        toast({
          title: "Exam created",
          description: "The exam has been created successfully.",
        });
      }
      
      navigate("/exams");
    } catch (error) {
      console.error("Error saving exam:", error);
      toast({
        title: "Error",
        description: "An error occurred while saving the exam.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => navigate("/exams")}
          className="mr-2"
        >
          <ArrowLeft size={18} />
        </Button>
        <h1 className="text-2xl font-bold">
          {isEditing ? "Edit Exam" : "Create New Exam"}
        </h1>
      </div>
      
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>{isEditing ? "Edit Exam" : "Create New Exam"}</CardTitle>
            <CardDescription>
              {isEditing
                ? "Update your exam details, questions, and assign users"
                : "Configure your exam, select questions, and assign to users"}
            </CardDescription>
            
            <Tabs value={tab} onValueChange={setTab} className="mt-6">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="details" className="flex items-center gap-2">
                  <FileText size={14} />
                  <span>Details</span>
                </TabsTrigger>
                <TabsTrigger value="questions" className="flex items-center gap-2">
                  <Check size={14} />
                  <span>Questions</span>
                </TabsTrigger>
                <TabsTrigger value="users" className="flex items-center gap-2">
                  <Users size={14} />
                  <span>Users</span>
                </TabsTrigger>
              </TabsList>
            
              <TabsContent value="details" className="space-y-6 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Exam Title</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter exam title"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Enter exam description"
                    rows={3}
                    className="resize-none"
                  />
                </div>
                
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="duration">Duration (minutes)</Label>
                    <div className="flex items-center">
                      <Input
                        id="duration"
                        type="number"
                        min="1"
                        max="180"
                        value={duration}
                        onChange={(e) => setDuration(Number(e.target.value))}
                        className="flex-1"
                        required
                      />
                      <Clock size={16} className="ml-2 text-muted-foreground" />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="passingScore">Passing Score (%)</Label>
                    <Input
                      id="passingScore"
                      type="number"
                      min="1"
                      max="100"
                      value={passingScore}
                      onChange={(e) => setPassingScore(Number(e.target.value))}
                      required
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={status}
                    onValueChange={(value: "draft" | "published" | "archived") => setStatus(value)}
                  >
                    <SelectTrigger id="status">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="published">Published</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    {status === "draft" && "Draft exams are only visible to admins"}
                    {status === "published" && "Published exams are visible to assigned users"}
                    {status === "archived" && "Archived exams are no longer accessible to users"}
                  </p>
                </div>
              </TabsContent>
            
              <TabsContent value="questions" className="space-y-6 mt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium">Select Questions</h3>
                    <p className="text-sm text-muted-foreground">
                      Choose questions from the question bank
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-medium">Total Score: {totalScore}</div>
                    <div className="text-sm text-muted-foreground">
                      {selectedQuestionIds.length} questions selected
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="search"
                      placeholder="Search questions..."
                      className="pl-8"
                      value={questionSearchQuery}
                      onChange={(e) => setQuestionSearchQuery(e.target.value)}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleSelectAllQuestions}
                  >
                    <Plus size={14} className="mr-2" />
                    Select All
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleDeselectAllQuestions}
                  >
                    <Minus size={14} className="mr-2" />
                    Deselect All
                  </Button>
                </div>
                
                <ScrollArea className="h-[300px] rounded-md border p-4">
                  <div className="space-y-3">
                    {filteredQuestions.length === 0 ? (
                      <div className="py-8 text-center text-muted-foreground">
                        No questions found
                      </div>
                    ) : (
                      filteredQuestions.map((question) => (
                        <QuestionItem
                          key={question.id}
                          question={question}
                          isSelected={selectedQuestionIds.includes(question.id)}
                          onToggle={() => toggleQuestion(question.id)}
                        />
                      ))
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>
            
              <TabsContent value="users" className="space-y-6 mt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium">Assign Users</h3>
                    <p className="text-sm text-muted-foreground">
                      Select users who can take this exam
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-medium">
                      {selectedUserIds.length} users selected
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="search"
                      placeholder="Search users..."
                      className="pl-8"
                      value={userSearchQuery}
                      onChange={(e) => setUserSearchQuery(e.target.value)}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleSelectAllUsers}
                  >
                    <Plus size={14} className="mr-2" />
                    Select All
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleDeselectAllUsers}
                  >
                    <Minus size={14} className="mr-2" />
                    Deselect All
                  </Button>
                </div>
                
                <ScrollArea className="h-[300px] rounded-md border p-4">
                  <div className="space-y-3">
                    {filteredUsers.length === 0 ? (
                      <div className="py-8 text-center text-muted-foreground">
                        No users found
                      </div>
                    ) : (
                      filteredUsers.map((user) => (
                        <UserItem
                          key={user.id}
                          user={user}
                          isSelected={selectedUserIds.includes(user.id)}
                          onToggle={() => toggleUser(user.id)}
                        />
                      ))
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </CardHeader>
          
          <CardFooter className="flex justify-between">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => navigate("/exams")}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <div className="flex gap-2">
              {tab !== "users" ? (
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => {
                    if (tab === "details") setTab("questions");
                    else if (tab === "questions") setTab("users");
                  }}
                >
                  Next
                </Button>
              ) : null}
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  isEditing ? "Update Exam" : "Create Exam"
                )}
              </Button>
            </div>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
};

export default ExamForm;
