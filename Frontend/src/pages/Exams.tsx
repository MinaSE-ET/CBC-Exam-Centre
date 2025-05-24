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
  BookOpen, 
  Clock, 
  Users,
  FileText,
} from "lucide-react";
import { getExams, deleteExam } from "@/lib/mockData";
import { Exam } from "@/types";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";

interface SortConfig {
  key: keyof Exam | '';
  direction: 'asc' | 'desc';
}

const ExamStatusBadge = ({ status }: { status: Exam['status'] }) => {
  const variants = {
    draft: "bg-yellow-100 text-yellow-800 border-yellow-200",
    published: "bg-green-100 text-green-800 border-green-200",
    archived: "bg-slate-100 text-slate-800 border-slate-200",
  };
  
  const labels = {
    draft: "Draft",
    published: "Published",
    archived: "Archived",
  };
  
  return (
    <span className={`px-2 py-1 text-xs rounded-md border ${variants[status]}`}>
      {labels[status]}
    </span>
  );
};

const Exams = () => {
  const [exams, setExams] = useState<Exam[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'createdAt', direction: 'desc' });
  const [examToDelete, setExamToDelete] = useState<Exam | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const navigate = useNavigate();
  const { toast } = useToast();
  
  useEffect(() => {
    const fetchExams = async () => {
      try {
        setIsLoading(true);
        const fetchedExams = await getExams();
        setExams(fetchedExams);
      } catch (error) {
        console.error("Error fetching exams:", error);
        toast({
          title: "Error",
          description: "Failed to fetch exams",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchExams();
  }, [toast]);
  
  const handleDeleteExam = async () => {
    if (examToDelete) {
      try {
        await deleteExam(examToDelete.id);
        setExams(exams.filter(e => e.id !== examToDelete.id));
        toast({
          title: "Exam deleted",
          description: "The exam has been deleted successfully.",
        });
      } catch (error) {
        console.error("Error deleting exam:", error);
        toast({
          title: "Error",
          description: "Failed to delete exam",
          variant: "destructive",
        });
      } finally {
        setIsDeleteDialogOpen(false);
        setExamToDelete(null);
      }
    }
  };
  
  const handleSort = (key: keyof Exam) => {
    let direction: 'asc' | 'desc' = 'asc';
    
    if (sortConfig.key === key) {
      direction = sortConfig.direction === 'asc' ? 'desc' : 'asc';
    }
    
    setSortConfig({ key, direction });
  };
  
  const filteredExams = exams
    .filter(exam => {
      const matchesSearch = exam.title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "all" || exam.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      if (sortConfig.key === '') return 0;
      
      const key = sortConfig.key;
      
      if (key === 'totalScore' || key === 'passingScore' || key === 'duration') {
        return sortConfig.direction === 'asc' 
          ? a[key] - b[key]
          : b[key] - a[key];
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
    return <div>Loading exams...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Exams</h1>
          <p className="text-muted-foreground">
            Create and manage your exams
          </p>
        </div>
        <Button onClick={() => navigate("/exams/new")} className="gap-2">
          <Plus size={16} />
          <span>Create Exam</span>
        </Button>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>All Exams</CardTitle>
          <CardDescription>
            Browse, search and manage exams
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
                    placeholder="Search exams..."
                    className="pl-8"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="flex flex-col gap-2 sm:flex-row">
                <Select
                  value={statusFilter}
                  onValueChange={setStatusFilter}
                >
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead 
                      className="cursor-pointer"
                      onClick={() => handleSort('title')}
                    >
                      Title
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer"
                      onClick={() => handleSort('status')}
                    >
                      Status
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer"
                      onClick={() => handleSort('duration')}
                    >
                      Duration
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer"
                      onClick={() => handleSort('totalScore')}
                    >
                      Total Score
                    </TableHead>
                    <TableHead>Questions</TableHead>
                    <TableHead>Assigned To</TableHead>
                    <TableHead className="text-right w-20">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredExams.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center h-40">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <BookOpen size={36} className="text-muted-foreground" />
                          <p>No exams found</p>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => navigate("/exams/new")}
                          >
                            Create an exam
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredExams.map((exam) => (
                      <TableRow key={exam.id}>
                        <TableCell className="font-medium">
                          {exam.title}
                        </TableCell>
                        <TableCell>
                          <ExamStatusBadge status={exam.status} />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Clock size={14} className="text-muted-foreground" />
                            <span>{exam.duration} minutes</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {exam.totalScore} pts (Pass: {exam.passingScore})
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <FileText size={14} className="text-muted-foreground" />
                            <span>{exam.questions?.length || 0}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Users size={14} className="text-muted-foreground" />
                            <span>{exam.assignedUsers?.length || 0}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical size={16} />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => navigate(`/exams/${exam.id}`)}>
                                <Edit size={14} className="mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                className="text-destructive focus:text-destructive"
                                onClick={() => {
                                  setExamToDelete(exam);
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
            <DialogTitle>Delete Exam</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this exam? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="p-4 border rounded-md bg-slate-50">
            <p className="font-medium">{examToDelete?.title}</p>
            <div className="mt-2 space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock size={14} />
                <span>{examToDelete?.duration} minutes</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FileText size={14} />
                <span>{examToDelete?.questions.length} questions</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users size={14} />
                <span>{examToDelete?.assignedUsers.length} assigned users</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteExam}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Exams;
