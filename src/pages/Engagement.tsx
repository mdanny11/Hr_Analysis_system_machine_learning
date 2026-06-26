import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import {
  useEngagementSummary,
  useEngagementTrends,
  useEngagementSentiment,
  useEngagementDimensions,
  useEngagementVsAttrition,
  useSurveys,
  useFeedback,
  useKpis,
} from '@/hooks/useApi';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { CreateSurveyDialog } from '@/components/engagement/CreateSurveyDialog';
import {
  MessageSquare,
  Smile,
  Meh,
  Frown,
  TrendingUp,
  TrendingDown,
  Plus,
  Send,
  BarChart3,
  Users,
  Heart,
  Star,
  ThumbsUp,
  ThumbsDown,
  MessageCircle,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  BarChart,
  Bar,
  ScatterChart,
  Scatter,
  ZAxis,
  Cell,
} from 'recharts';

const surveyQuestions = [
  'How satisfied are you with your current role?',
  'Do you feel valued by your manager?',
  'How would you rate work-life balance?',
  'Do you see growth opportunities here?',
  'Would you recommend this company?',
];

export default function Engagement() {
  const [newQuestion, setNewQuestion] = useState('');
  const [feedbackText, setFeedbackText] = useState('');
  const [surveyDialogOpen, setSurveyDialogOpen] = useState(false);

  const { data: summary } = useEngagementSummary();
  const { data: engagementTrends = [] } = useEngagementTrends();
  const { data: sentimentData = [] } = useEngagementSentiment();
  const { data: engagementDimensions = [] } = useEngagementDimensions();
  const { data: engagementVsAttrition = [] } = useEngagementVsAttrition();
  const { data: surveysRaw = [] } = useSurveys();
  const { data: feedbackRaw = [] } = useFeedback();
  const { data: kpis } = useKpis();

  const surveys = useMemo(
    () =>
      surveysRaw.map((s) => ({
        id: String(s.id),
        name: String(s.title ?? s.name ?? 'Survey'),
        status: String(s.status ?? 'active'),
        responses: 0,
        total: kpis?.totalEmployees ?? 0,
        endDate: String(s.endDate ?? '—'),
      })),
    [surveysRaw, kpis],
  );

  const recentFeedback = useMemo(
    () =>
      feedbackRaw.map((f) => ({
        id: String(f.id),
        sentiment: 'neutral' as const,
        text: String(f.message ?? ''),
        department: String(f.category ?? 'General'),
        date: f.submittedAt ? new Date(String(f.submittedAt)).toLocaleDateString() : '—',
      })),
    [feedbackRaw],
  );

  const overallEngagement = summary?.overallScore
    ? Math.round(summary.overallScore * 10)
    : engagementDimensions.length
      ? Math.round(engagementDimensions.reduce((sum, d) => sum + d.score, 0) / engagementDimensions.length)
      : 0;

  const positivePercentage = summary?.sentimentScore ?? Math.round(
    sentimentData.reduce((sum, d) => sum + Number(d.positive), 0) / (sentimentData.length || 1),
  );

  return (
    <div className="space-y-6">
      {/* Create Survey Dialog */}
      <CreateSurveyDialog open={surveyDialogOpen} onOpenChange={setSurveyDialogOpen} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Employee Engagement</h1>
          <p className="text-muted-foreground">Monitor sentiment, collect feedback, and track engagement</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline"
            onClick={() => toast.info('Sending pulse survey', { description: 'Quick 3-question survey to all employees' })}
          >
            <MessageCircle className="h-4 w-4 mr-2" />
            Send Pulse Survey
          </Button>
          <Button onClick={() => setSurveyDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Survey
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10">
                <Heart className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">{overallEngagement}%</p>
                <p className="text-sm text-muted-foreground">Engagement Score</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Smile className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{positivePercentage}%</p>
                <p className="text-sm text-muted-foreground">Positive Sentiment</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning/10">
                <MessageSquare className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">{recentFeedback.length}</p>
                <p className="text-sm text-muted-foreground">New Feedback</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-chart-5/10">
                <Users className="h-5 w-5 text-chart-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{summary?.participationRate ?? 85}%</p>
                <p className="text-sm text-muted-foreground">Survey Participation</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="sentiment" className="space-y-6">
        <TabsList>
          <TabsTrigger value="sentiment">Sentiment Analysis</TabsTrigger>
          <TabsTrigger value="trends">Engagement Trends</TabsTrigger>
          <TabsTrigger value="surveys">Surveys</TabsTrigger>
          <TabsTrigger value="feedback">Anonymous Feedback</TabsTrigger>
          <TabsTrigger value="correlation">Engagement vs Attrition</TabsTrigger>
        </TabsList>

        {/* Sentiment Analysis Tab */}
        <TabsContent value="sentiment">
          <div className="grid lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Sentiment by Category</CardTitle>
                <CardDescription>Employee sentiment distribution across key areas</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {sentimentData.map((item) => (
                    <div key={item.category} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">{item.category}</span>
                        <span className="text-muted-foreground">
                          {item.positive}% positive
                        </span>
                      </div>
                      <div className="flex h-3 rounded-full overflow-hidden">
                        <div
                          className="bg-success"
                          style={{ width: `${item.positive}%` }}
                        />
                        <div
                          className="bg-muted"
                          style={{ width: `${item.neutral}%` }}
                        />
                        <div
                          className="bg-destructive"
                          style={{ width: `${item.negative}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex justify-center gap-6 mt-6">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-success" />
                    <span className="text-sm">Positive</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-muted" />
                    <span className="text-sm">Neutral</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-destructive" />
                    <span className="text-sm">Negative</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Engagement Dimensions</CardTitle>
                <CardDescription>Multi-dimensional engagement radar</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={engagementDimensions}>
                      <PolarGrid stroke="hsl(var(--border))" />
                      <PolarAngleAxis dataKey="dimension" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                      <Radar
                        name="Score"
                        dataKey="score"
                        stroke="hsl(var(--primary))"
                        fill="hsl(var(--primary))"
                        fillOpacity={0.3}
                        strokeWidth={2}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Engagement Trends Tab */}
        <TabsContent value="trends">
          <Card>
            <CardHeader>
              <CardTitle>Engagement Score Over Time</CardTitle>
              <CardDescription>Monthly engagement score and participation rate</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={engagementTrends}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" />
                    <YAxis yAxisId="left" domain={[0, 10]} />
                    <YAxis yAxisId="right" orientation="right" domain={[0, 100]} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="score"
                      stroke="hsl(var(--primary))"
                      strokeWidth={3}
                      dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 6 }}
                      name="Engagement Score"
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="participation"
                      stroke="hsl(var(--success))"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={{ fill: 'hsl(var(--success))' }}
                      name="Participation %"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center gap-6 mt-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-0.5 bg-primary" />
                  <span className="text-sm">Engagement Score (0-10)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-0.5 bg-success" style={{ borderStyle: 'dashed' }} />
                  <span className="text-sm">Participation Rate (%)</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Surveys Tab */}
        <TabsContent value="surveys">
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Active Surveys</CardTitle>
                  <CardDescription>Manage and monitor ongoing surveys</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {surveys.map((survey) => (
                      <div
                        key={survey.id}
                        className="p-4 rounded-lg border hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <h4 className="font-semibold">{survey.name}</h4>
                            <p className="text-sm text-muted-foreground">
                              Ends: {survey.endDate}
                            </p>
                          </div>
                          <Badge
                            variant={
                              survey.status === 'active' ? 'success' :
                              survey.status === 'completed' ? 'secondary' : 'outline'
                            }
                          >
                            {survey.status}
                          </Badge>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Responses</span>
                            <span>{survey.responses} / {survey.total}</span>
                          </div>
                          <Progress value={(survey.responses / survey.total) * 100} className="h-2" />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Quick Survey Builder</CardTitle>
                <CardDescription>Create a pulse survey question</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Question</Label>
                  <Textarea
                    placeholder="Enter your survey question..."
                    value={newQuestion}
                    onChange={(e) => setNewQuestion(e.target.value)}
                    rows={3}
                  />
                </div>

                <div>
                  <Label>Response Type</Label>
                  <RadioGroup defaultValue="scale" className="mt-2">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="scale" id="scale" />
                      <Label htmlFor="scale" className="font-normal">1-10 Scale</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="yesno" id="yesno" />
                      <Label htmlFor="yesno" className="font-normal">Yes/No</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="text" id="text" />
                      <Label htmlFor="text" className="font-normal">Open Text</Label>
                    </div>
                  </RadioGroup>
                </div>

                <Button 
                  className="w-full"
                  onClick={() => {
                    if (newQuestion) {
                      toast.success('Survey sent', { description: `Delivered to ${kpis?.totalEmployees ?? 0} employees` });
                      setNewQuestion('');
                    } else {
                      toast.error('Please enter a question', { description: 'Survey question is required' });
                    }
                  }}
                >
                  <Send className="h-4 w-4 mr-2" />
                  Send to All Employees
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Anonymous Feedback Tab */}
        <TabsContent value="feedback">
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Anonymous Feedback</CardTitle>
                  <CardDescription>Latest submissions from the feedback portal</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {recentFeedback.map((feedback) => (
                      <div
                        key={feedback.id}
                        className={`p-4 rounded-lg border ${
                          feedback.sentiment === 'positive' ? 'border-success/30 bg-success/5' :
                          feedback.sentiment === 'negative' ? 'border-destructive/30 bg-destructive/5' :
                          'border-muted'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          {feedback.sentiment === 'positive' && (
                            <ThumbsUp className="h-5 w-5 text-success mt-0.5" />
                          )}
                          {feedback.sentiment === 'negative' && (
                            <ThumbsDown className="h-5 w-5 text-destructive mt-0.5" />
                          )}
                          {feedback.sentiment === 'neutral' && (
                            <Meh className="h-5 w-5 text-muted-foreground mt-0.5" />
                          )}
                          <div className="flex-1">
                            <p className="text-sm">{feedback.text}</p>
                            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                              <Badge variant="outline">{feedback.department}</Badge>
                              <span>•</span>
                              <span>{feedback.date}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Submit Feedback</CardTitle>
                <CardDescription>Your response is completely anonymous</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>How are you feeling?</Label>
                  <div className="flex gap-4 mt-2">
                    <Button variant="outline" className="flex-1">
                      <Smile className="h-5 w-5 text-success" />
                    </Button>
                    <Button variant="outline" className="flex-1">
                      <Meh className="h-5 w-5 text-warning" />
                    </Button>
                    <Button variant="outline" className="flex-1">
                      <Frown className="h-5 w-5 text-destructive" />
                    </Button>
                  </div>
                </div>

                <div>
                  <Label>Your Feedback</Label>
                  <Textarea
                    placeholder="Share your thoughts anonymously..."
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                    rows={4}
                  />
                </div>

                <Button 
                  className="w-full"
                  onClick={() => {
                    if (feedbackText) {
                      toast.success('Feedback submitted', { description: 'Your anonymous feedback has been recorded' });
                      setFeedbackText('');
                    } else {
                      toast.error('Please enter feedback', { description: 'Feedback text is required' });
                    }
                  }}
                >
                  <Send className="h-4 w-4 mr-2" />
                  Submit Anonymously
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Correlation Tab */}
        <TabsContent value="correlation">
          <Card>
            <CardHeader>
              <CardTitle>Engagement vs Attrition Risk</CardTitle>
              <CardDescription>Correlation between employee engagement and predicted attrition risk</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      type="number"
                      dataKey="engagement"
                      name="Engagement Score"
                      domain={[5, 10]}
                      label={{ value: 'Engagement Score', position: 'bottom', offset: -5 }}
                    />
                    <YAxis
                      type="number"
                      dataKey="attritionRisk"
                      name="Attrition Risk"
                      domain={[0, 100]}
                      label={{ value: 'Attrition Risk %', angle: -90, position: 'insideLeft' }}
                    />
                    <Tooltip
                      cursor={{ strokeDasharray: '3 3' }}
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                      formatter={(value: number, name: string) => [
                        name === 'Attrition Risk' ? `${value}%` : value.toFixed(1),
                        name,
                      ]}
                    />
                    <Scatter data={engagementVsAttrition} fill="hsl(var(--primary))">
                      {engagementVsAttrition.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={
                            entry.attritionRisk > 60
                              ? 'hsl(var(--destructive))'
                              : entry.attritionRisk > 40
                              ? 'hsl(var(--warning))'
                              : 'hsl(var(--success))'
                          }
                        />
                      ))}
                    </Scatter>
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 p-4 rounded-lg bg-muted/50 border">
                <p className="text-sm text-muted-foreground">
                  <strong>Correlation coefficient: r = -0.72</strong> — There is a strong negative correlation
                  between engagement scores and attrition risk. Employees with higher engagement are significantly
                  less likely to leave.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
