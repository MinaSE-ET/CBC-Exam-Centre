import { useState, useEffect } from "react";
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
  Plus,
  Minus,
  Check,
  Loader2,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import {
  getQuestionById,
  createQuestion,
  updateQuestion,
} from "@/lib/database";
import { Question } from "@/types";
import { v4 as uuidv4 } from "uuid";
import { Checkbox } from "@/components/ui/checkbox";

interface Choice {
  id: string;
  text: string;
  isCorrect: boolean;
}

const QuestionForm = () => {
  const { id } = useParams();
  const isEditing = Boolean(id);
  const navigate = useNavigate();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(false);
  const [tab, setTab] = useState("details");

  // Question details
  const [text, setText] = useState("");
  const [type, setType] = useState<"single_choice" | "multiple_choice">("single_choice");
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [score, setScore] = useState(1);
  const [category, setCategory] = useState("");

  // Choices
  const [options, setOptions] = useState<{ id: string; text: string; is_correct: boolean; }[]>([
    { id: uuidv4(), text: "", is_correct: false },
    { id: uuidv4(), text: "", is_correct: false },
  ]);

  useEffect(() => {
    const fetchData = async () => {
      if (isEditing && id) {
        try {
          const question = await getQuestionById(id);
          if (question) {
            setText(question.text);
            setType(question.type);
            setDifficulty(question.difficulty);
            setScore(question.score);
            setCategory(question.category || "");
            setOptions(Array.isArray(question.options) ? question.options : [
              { id: uuidv4(), text: "", is_correct: false },
              { id: uuidv4(), text: "", is_correct: false },
            ]);
          } else {
            toast({
              title: "Question not found",
              description: "The question you're trying to edit doesn't exist.",
              variant: "destructive",
            });
            navigate("/questions");
          }
        } catch (error) {
          console.error("Error fetching question:", error);
          toast({
            title: "Error",
            description: "Failed to load question data",
            variant: "destructive",
          });
          navigate("/questions");
        }
      }
    };

    fetchData();
  }, [id, isEditing, navigate, toast]);

  const addOption = () => {
    setOptions([...options, { id: uuidv4(), text: "", is_correct: false }]);
  };

  const removeOption = (optionId: string) => {
    if (options.length <= 2) {
      toast({
        title: "Error",
        description: "You must have at least two options.",
        variant: "destructive",
      });
      return;
    }
    setOptions(options.filter((option) => option.id !== optionId));
  };

  const updateOptionText = (optionId: string, text: string) => {
    setOptions(
      options.map((option) =>
        option.id === optionId ? { ...option, text } : option
      )
    );
  };

  const toggleOptionCorrect = (optionId: string) => {
    if (type === "single_choice") {
      setOptions(
        options.map((option) => ({
          ...option,
          is_correct: option.id === optionId,
        }))
      );
    } else {
      setOptions(
        options.map((option) =>
          option.id === optionId
            ? { ...option, is_correct: !option.is_correct }
            : option
        )
      );
    }
  };

  const validateForm = () => {
    if (!text.trim()) {
      toast({
        title: "Error",
        description: "Please enter the question text.",
        variant: "destructive",
      });
      setTab("details");
      return false;
    }

    if (options.length < 2) {
      toast({
        title: "Error",
        description: "You must have at least two options.",
        variant: "destructive",
      });
      setTab("options");
      return false;
    }

    if (options.every((option) => !option.text.trim())) {
      toast({
        title: "Error",
        description: "All options cannot be empty.",
        variant: "destructive",
      });
      setTab("options");
      return false;
    }

    if (type === "single_choice" && !options.some((option) => option.is_correct)) {
      toast({
        title: "Error",
        description: "You must select one correct answer for single choice questions.",
        variant: "destructive",
      });
      setTab("options");
      return false;
    }

    return true;
  };

  const formattedOptions = options.map(option => ({
    id: option.id,
    text: option.text,
    is_correct: option.is_correct,
  }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsLoading(true);
    
    try {
      const currentDate = new Date().toISOString();
      const questionData = {
        text,
        type,
        difficulty,
        score,
        choices: formattedOptions,
        category: category || undefined,
        createdAt: currentDate,
        updatedAt: currentDate
      };
      
      if (isEditing && id) {
        await updateQuestion({
          id,
          ...questionData
        });
        toast({
          title: "Question updated",
          description: "The question has been updated successfully.",
        });
      } else {
        await createQuestion(questionData);
        toast({
          title: "Question created",
          description: "The question has been created successfully.",
        });
      }
      
      navigate("/questions");
    } catch (error) {
      console.error("Error saving question:", error);
      toast({
        title: "Error",
        description: "An error occurred while saving the question.",
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
          onClick={() => navigate("/questions")}
          className="mr-2"
        >
          <ArrowLeft size={18} />
        </Button>
        <h1 className="text-2xl font-bold">
          {isEditing ? "Edit Question" : "Create New Question"}
        </h1>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>{isEditing ? "Edit Question" : "Create New Question"}</CardTitle>
            <CardDescription>
              {isEditing
                ? "Update your question details and choices"
                : "Configure your question, set choices, and assign properties"}
            </CardDescription>

            <Tabs value={tab} onValueChange={setTab} className="mt-6">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="details" className="flex items-center gap-2">
                  <span>Details</span>
                </TabsTrigger>
                <TabsTrigger value="options" className="flex items-center gap-2">
                  <Check size={14} />
                  <span>Options</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="space-y-6 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="text">Question Text</Label>
                  <Textarea
                    id="text"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Enter question text"
                    required
                    rows={3}
                    className="resize-none"
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="type">Question Type</Label>
                    <Select
                      value={type}
                      onValueChange={(value: "single_choice" | "multiple_choice") => setType(value)}
                    >
                      <SelectTrigger id="type">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="single_choice">Single Choice</SelectItem>
                        <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="difficulty">Difficulty</Label>
                    <Select
                      value={difficulty}
                      onValueChange={(value: "easy" | "medium" | "hard") => setDifficulty(value)}
                    >
                      <SelectTrigger id="difficulty">
                        <SelectValue placeholder="Select difficulty" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="easy">Easy</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="hard">Hard</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="score">Score</Label>
                    <Input
                      id="score"
                      type="number"
                      min="1"
                      value={score}
                      onChange={(e) => setScore(Number(e.target.value))}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="category">Category (Optional)</Label>
                    <Input
                      id="category"
                      type="text"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      placeholder="Enter category"
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="options" className="space-y-6 mt-4">
                <h3 className="text-lg font-medium">Options</h3>
                <p className="text-sm text-muted-foreground">
                  Add and manage question options
                </p>
                
                <div className="space-y-4">
                  {options.map((option, index) => (
                    <div key={option.id} className="flex items-start gap-4">
                      <div className="flex-1 space-y-2">
                        <Label htmlFor={`option-${option.id}`}>
                          Option {index + 1}
                        </Label>
                        <Input
                          id={`option-${option.id}`}
                          value={option.text}
                          onChange={(e) => updateOptionText(option.id, e.target.value)}
                          placeholder={`Enter option ${index + 1}`}
                        />
                      </div>
                      <div className="flex items-center gap-2 pt-8">
                        <Checkbox
                          id={`correct-${option.id}`}
                          checked={option.is_correct}
                          onCheckedChange={() => toggleOptionCorrect(option.id)}
                        />
                        <Label htmlFor={`correct-${option.id}`} className="text-sm">
                          Correct
                        </Label>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeOption(option.id)}
                          disabled={options.length <= 2}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={addOption}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Option
                </Button>
              </TabsContent>
            </Tabs>
          </CardHeader>

          <CardFooter className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/questions")}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <div className="flex gap-2">
              {tab !== "options" ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setTab("options")}
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
                  isEditing ? "Update Question" : "Create Question"
                )}
              </Button>
            </div>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
};

export default QuestionForm;
