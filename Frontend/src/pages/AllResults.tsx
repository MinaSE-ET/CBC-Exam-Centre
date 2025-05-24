import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { getExamResults, getExamById, getUserById } from "@/lib/apiClient";
import { ExamResult, Exam, User } from "@/types";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHead, TableRow, TableHeader, TableBody, TableCell } from "@/components/ui/table";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { format } from "date-fns";

const AllResults = () => {
  const { isAdmin, user } = useAuth();
  const navigate = useNavigate();
  const [results, setResults] = useState<ExamResult[]>([]);
  const [exams, setExams] = useState<Record<string, Exam>>({});
  const [users, setUsers] = useState<Record<string, User>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !isAdmin()) {
      navigate("/dashboard");
      return;
    }
    const fetchResults = async () => {
      setLoading(true);
      try {
        const data = await getExamResults();
        setResults(data);

        // Fetch exam and user details for each result
        const examPromises = data.map(result => getExamById(result.examId));
        const userPromises = data.map(result => getUserById(result.userId));

        const examResults = await Promise.all(examPromises);
        const userResults = await Promise.all(userPromises);

        const examMap: Record<string, Exam> = {};
        const userMap: Record<string, User> = {};

        examResults.forEach(exam => {
          if (exam) examMap[exam.id] = exam;
        });

        userResults.forEach(user => {
          if (user) userMap[user.id] = user;
        });

        setExams(examMap);
        setUsers(userMap);
      } catch (error) {
        console.error("Error fetching results:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchResults();
  }, [user, isAdmin, navigate]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <Loader2 className="mr-2 h-6 w-6 animate-spin" />
        <span>Loading results...</span>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>All Exam Results</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student Name</TableHead>
                <TableHead>Exam Title</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Percentage</TableHead>
                <TableHead>Passing Score</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {results.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center">No results found.</TableCell>
                </TableRow>
              ) : (
                results.map((result) => {
                  const exam = exams[result.examId];
                  const student = users[result.userId];
                  const scorePercentage = Math.round((result.score / (exam?.totalScore || 1)) * 100);
                  const passed = scorePercentage >= (exam?.passingScore || 0);

                  return (
                    <TableRow key={result.id}>
                      <TableCell>
                        {student ? `${student.first_name} ${student.last_name}` : result.userId}
                      </TableCell>
                      <TableCell>{exam?.title || result.examId}</TableCell>
                      <TableCell>{result.score}/{exam?.totalScore || 0}</TableCell>
                      <TableCell>{scorePercentage}%</TableCell>
                      <TableCell>{exam?.passingScore || 0}%</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {passed ? (
                            <CheckCircle size={16} className="text-green-500" />
                          ) : (
                            <XCircle size={16} className="text-red-500" />
                          )}
                          <span>{passed ? "Passed" : "Failed"}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {result.completedAt ? format(new Date(result.completedAt), "MMM d, yyyy h:mm a") : "-"}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AllResults; 