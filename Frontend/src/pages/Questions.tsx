import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Plus, 
  Search, 
  Edit, 
  Trash, 
  MoreVertical, 
  FileText, 
  ArrowUp, 
  ArrowDown,
  CheckCircle, 
  XCircle
} from "lucide-react";
import { getQuestions, deleteQuestion } from "@/lib/mockData";
import { Question } from "@/types";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";

interface SortConfig {
  key: keyof Question | '';
  direction: 'asc' | 'desc';
}

const QuestionDifficultyBadge = ({ difficulty }: { difficulty: Question['difficulty'] }) => {
  const colors = {
    easy: "bg-green-100 text-green-800 border-green-200",
    medium: "bg-yellow-100 text-yellow-800 border-yellow-200",
    hard: "bg-red-100 text-red-800 border-red-200",
  };
  
  return (
    <span className={`px-2 py-1 text-xs rounded-md border ${colors[difficulty]}`}>
      {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
    </span>
  );
};

const Questions = () => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'createdAt', direction: 'desc' });
  const [questionToDelete, setQuestionToDelete] = useState<Question | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const navigate = useNavigate();
  const { toast } = useToast();
  
  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        setIsLoading(true);
        const fetchedQuestions = await getQuestions();
        setQuestions(fetchedQuestions);
      } catch (error) {
        console.error("Error fetching questions:", error);
        toast({
          title: "Error",
          description: "Failed to fetch questions",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchQuestions();
  }, [toast]);
  
  const handleDeleteQuestion = async () => {
    if (questionToDelete) {
      try {
        await deleteQuestion(questionToDelete.id);
        setQuestions(questions.filter(q => q.id !== questionToDelete.id));
        toast({
          title: "Question deleted",
          description: "The question has been deleted successfully.",
        });
      } catch (error) {
        console.error("Error deleting question:", error);
        toast({
          title: "Error",
          description: "Failed to delete question",
          variant: "destructive",
        });
      } finally {
        setIsDeleteDialogOpen(false);
        setQuestionToDelete(null);
      }
    }
  };
  
  const handleSort = (key: keyof Question) => {
    let direction: 'asc' | 'desc' = 'asc';
    
    if (sortConfig.key === key) {
      direction = sortConfig.direction === 'asc' ? 'desc' : 'asc';
    }
    
    setSortConfig({ key, direction });
  };
  
  const filteredQuestions = questions
    .filter(question => {
      const matchesSearch = question.text.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesDifficulty = difficultyFilter === "all" || question.difficulty === difficultyFilter;
      const matchesType = typeFilter === "all" || question.type === typeFilter;
      
      return matchesSearch && matchesDifficulty && matchesType;
    })
    .sort((a, b) => {
      if (sortConfig.key === '') return 0;
      
      const key = sortConfig.key;
      
      if (key === 'score') {
        return sortConfig.direction === 'asc' 
          ? a.score - b.score
          : b.score - a.score;
      }
      
      if (key === 'createdAt' || key === 'updatedAt') {
        return sortConfig.direction === 'asc' 
          ? new Date(a[key]).getTime() - new Date(b[key]).getTime()
          : new Date(b[key]).getTime() - new Date(a[key]).getTime();
      }
      
      // For text-based fields
      const valueA = String(a[key]).toLowerCase();
      const valueB = String(b[key]).toLowerCase();
      
      if (valueA < valueB) return sortConfig.direction === 'asc' ? -1 : 1;
      if (valueA > valueB) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

  if (isLoading) {
    return <div>Loading questions...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Question Bank</h1>
          <p className="text-muted-foreground">
            Manage your exam questions
          </p>
        </div>
        <Button onClick={() => navigate("/questions/new")} className="gap-2">
          <Plus size={16} />
          <span>Add Question</span>
        </Button>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Questions</CardTitle>
          <CardDescription>
            Browse, search and manage exam questions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex-1 md:max-w-sm">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search questions..."
                    className="pl-8"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="flex flex-col gap-2 sm:flex-row">
                <Select
                  value={difficultyFilter}
                  onValueChange={setDifficultyFilter}
                >
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Difficulty" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Difficulties</SelectItem>
                    <SelectItem value="easy">Easy</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="hard">Hard</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select
                  value={typeFilter}
                  onValueChange={setTypeFilter}
                >
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="single_choice">Single Choice</SelectItem>
                    <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead 
                      className="w-[40%] cursor-pointer"
                      onClick={() => handleSort('text')}
                    >
                      <div className="flex items-center">
                        Question
                        {sortConfig.key === 'text' && (
                          sortConfig.direction === 'asc' 
                            ? <ArrowUp className="ml-1" size={14} /> 
                            : <ArrowDown className="ml-1" size={14} />
                        )}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="w-[20%] cursor-pointer"
                      onClick={() => handleSort('type')}
                    >
                      <div className="flex items-center">
                        Type
                        {sortConfig.key === 'type' && (
                          sortConfig.direction === 'asc' 
                            ? <ArrowUp className="ml-1" size={14} /> 
                            : <ArrowDown className="ml-1" size={14} />
                        )}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="w-[15%] cursor-pointer"
                      onClick={() => handleSort('difficulty')}
                    >
                      <div className="flex items-center">
                        Difficulty
                        {sortConfig.key === 'difficulty' && (
                          sortConfig.direction === 'asc' 
                            ? <ArrowUp className="ml-1" size={14} /> 
                            : <ArrowDown className="ml-1" size={14} />
                        )}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="w-[10%] cursor-pointer"
                      onClick={() => handleSort('score')}
                    >
                      <div className="flex items-center">
                        Points
                        {sortConfig.key === 'score' && (
                          sortConfig.direction === 'asc' 
                            ? <ArrowUp className="ml-1" size={14} /> 
                            : <ArrowDown className="ml-1" size={14} />
                        )}
                      </div>
                    </TableHead>
                    <TableHead className="w-[15%] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredQuestions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center h-40">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <FileText size={36} className="text-muted-foreground" />
                          <p>No questions found</p>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => navigate("/questions/new")}
                          >
                            Add a question
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredQuestions.map((question) => (
                      <TableRow key={question.id}>
                        <TableCell className="font-medium">
                          <div className="line-clamp-2">{question.text}</div>
                        </TableCell>
                        <TableCell>
                          {question.type === "single_choice" ? (
                            <div className="flex items-center gap-1.5">
                              <CheckCircle size={16} className="text-primary" />
                              <span className="whitespace-nowrap">Single Choice</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <CheckCircle size={16} className="text-primary" />
                              <XCircle size={16} className="text-primary" />
                              <span className="whitespace-nowrap">Multiple Choice</span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <QuestionDifficultyBadge difficulty={question.difficulty} />
                        </TableCell>
                        <TableCell className="font-medium">{question.score}</TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical size={16} />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => navigate(`/questions/${question.id}`)}>
                                <Edit size={14} className="mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                className="text-destructive focus:text-destructive"
                                onClick={() => {
                                  setQuestionToDelete(question);
                                  setIsDeleteDialogOpen(true);
                                }}
                              >
                                <Trash size={14} className="mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Question</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this question? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="p-4 border rounded-md bg-slate-50">
            <p className="font-medium">{questionToDelete?.text}</p>
            <div className="mt-2 flex items-center gap-2">
              <QuestionDifficultyBadge difficulty={questionToDelete?.difficulty || "easy"} />
              <span className="text-sm text-muted-foreground">
                {questionToDelete?.score} points
              </span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteQuestion}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Questions;
