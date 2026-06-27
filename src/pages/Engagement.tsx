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
  useSendPulseSurvey,
  useSendQuickSurvey,
  useSubmitFeedback,
} from '@/hooks/useApi';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { CreateSurveyDialog } from '@/components/engagement/CreateSurveyDialog';
import { SurveyResponsesPanel } from '@/components/engagement/SurveyResponsesPanel';
import {
  MessageSquare,
  Smile,
  Meh,
  Frown,
  Plus,
  Send,
  Users,
  Heart,
  ThumbsUp,
  ThumbsDown,
  MessageCircle,
  Eye,
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
  ScatterChart,
  Scatter,
  Cell,
} from 'recharts';

type FeedbackSentiment = 'positive' | 'neutral' | 'negative';

export default function Engagement() {
  const [newQuestion, setNewQuestion] = useState('');
  const [responseType, setResponseType] = useState('scale');
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackSentiment, setFeedbackSentiment] = useState<FeedbackSentiment>('neutral');
  const [surveyDialogOpen, setSurveyDialogOpen] = useState(false);
  const [selectedSurveyId, setSelectedSurveyId] = useState<string | null>(null);
  const [selectedSurveyTitle, setSelectedSurveyTitle] = useState('');

  const { data: summary } = useEngagementSummary();
  const { data: engagementTrends = [] } = useEngagementTrends();
  const { data: sentimentData = [] } = useEngagementSentiment();
  const { data: engagementDimensions = [] } = useEngagementDimensions();
  const { data: engagementVsAttritionData } = useEngagementVsAttrition();
  const { data: surveysRaw = [] } = useSurveys();
  const { data: feedbackRaw = [] } = useFeedback();
  const { data: kpis } = useKpis();
  const sendPulseSurvey = useSendPulseSurvey();
  const sendQuickSurvey = useSendQuickSurvey();
  const submitFeedback = useSubmitFeedback();

  const engagementVsAttrition = engagementVsAttritionData?.points ?? [];
  const attritionCorrelation = engagementVsAttritionData?.correlation;

  const surveys = useMemo(
    () =>
      surveysRaw.map((s) => ({
        id: String(s.id),
        name: String(s.title ?? s.name ?? 'Survey'),
        status: String(s.status ?? 'active'),
        responses: Number(s.responseCount ?? 0),
        total: Number(s.totalEmployees ?? kpis?.totalEmployees ?? 0),
        endDate: String(s.endDate ?? '—'),
      })),
    [surveysRaw, kpis],
  );

  const recentFeedback = useMemo(
    () =>
      feedbackRaw.map((f) => ({
        id: String(f.id),
        sentiment: (String(f.sentiment ?? 'neutral') as FeedbackSentiment),
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

  const handleSendPulseSurvey = async () => {
    try {
      await sendPulseSurvey.mutateAsync();
      toast.success('Pulse survey sent', {
        description: 'Email invitations are being sent to employees.',
      });
    } catch {
      toast.error('Failed to send pulse survey');
    }
  };

  const handleSendQuickSurvey = async () => {
    if (!newQuestion.trim()) {
      toast.error('Please enter a question', { description: 'Survey question is required' });
      return;
    }
    try {
      await sendQuickSurvey.mutateAsync({
        question: newQuestion.trim(),
        response_type: responseType,
      });
      toast.success('Survey sent', {
        description: 'Email invitations are being sent to employees.',
      });
      setNewQuestion('');
    } catch {
      toast.error('Failed to send survey');
    }
  };

  const handleSubmitFeedback = async () => {
    if (!feedbackText.trim()) {
      toast.error('Please enter feedback', { description: 'Feedback text is required' });
      return;
    }
    try {
      await submitFeedback.mutateAsync({
        category: 'General',
        message: feedbackText.trim(),
        anonymous: true,
        sentiment: feedbackSentiment,
      });
      toast.success('Feedback submitted', { description: 'Your anonymous feedback has been recorded' });
      setFeedbackText('');
      setFeedbackSentiment('neutral');
    } catch {
      toast.error('Failed to submit feedback');
    }
  };

  const correlationLabel =
    attritionCorrelation == null
      ? 'Not enough data to compute correlation'
      : attritionCorrelation <= -0.5
        ? 'strong negative correlation'
        : attritionCorrelation < 0
          ? 'moderate negative correlation'
          : attritionCorrelation === 0
            ? 'no linear correlation'
            : 'positive correlation';

  return (
    <div className="space-y-6">
      <CreateSurveyDialog open={surveyDialogOpen} onOpenChange={setSurveyDialogOpen} />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Employee Engagement</h1>
          <p className="text-muted-foreground">Monitor sentiment, collect feedback, and track engagement</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            disabled={sendPulseSurvey.isPending}
            onClick={handleSendPulseSurvey}
          >
            <MessageCircle className="h-4 w-4 mr-2" />
            {sendPulseSurvey.isPending ? 'Sending...' : 'Send Pulse Survey'}
          </Button>
          <Button onClick={() => setSurveyDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Survey
          </Button>
        </div>
      </div>

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
                <p className="text-sm text-muted-foreground">Recent Feedback</p>
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
                <p className="text-2xl font-bold">{summary?.participationRate ?? 0}%</p>
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
                    <div key={String(item.category)} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">{item.category}</span>
                        <span className="text-muted-foreground">
                          {item.positive}% positive
                        </span>
                      </div>
                      <div className="flex h-3 rounded-full overflow-hidden">
                        <div className="bg-success" style={{ width: `${item.positive}%` }} />
                        <div className="bg-muted" style={{ width: `${item.neutral}%` }} />
                        <div className="bg-destructive" style={{ width: `${item.negative}%` }} />
                      </div>
                    </div>
                  ))}
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
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="surveys">
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Active Surveys</CardTitle>
                  <CardDescription>Manage and monitor ongoing surveys</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {surveys.length === 0 && (
                      <p className="text-sm text-muted-foreground">No surveys yet. Create one to get started.</p>
                    )}
                    {surveys.map((survey) => (
                      <div
                        key={survey.id}
                        className={`p-4 rounded-lg border transition-colors ${
                          selectedSurveyId === survey.id ? 'border-primary bg-primary/5' : 'hover:bg-muted/30'
                        }`}
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
                        <div className="space-y-3">
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span>Responses</span>
                              <span>{survey.responses} / {survey.total}</span>
                            </div>
                            <Progress
                              value={survey.total > 0 ? (survey.responses / survey.total) * 100 : 0}
                              className="h-2"
                            />
                          </div>
                          <Button
                            variant={selectedSurveyId === survey.id ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => {
                              if (selectedSurveyId === survey.id) {
                                setSelectedSurveyId(null);
                                setSelectedSurveyTitle('');
                              } else {
                                setSelectedSurveyId(survey.id);
                                setSelectedSurveyTitle(survey.name);
                              }
                            }}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            {selectedSurveyId === survey.id ? 'Hide Responses' : 'View Responses'}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {selectedSurveyId && (
                <SurveyResponsesPanel
                  surveyId={selectedSurveyId}
                  surveyTitle={selectedSurveyTitle}
                  onClose={() => {
                    setSelectedSurveyId(null);
                    setSelectedSurveyTitle('');
                  }}
                />
              )}
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
                  <RadioGroup value={responseType} onValueChange={setResponseType} className="mt-2">
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
                  disabled={sendQuickSurvey.isPending}
                  onClick={handleSendQuickSurvey}
                >
                  <Send className="h-4 w-4 mr-2" />
                  {sendQuickSurvey.isPending ? 'Sending...' : 'Send to All Employees'}
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

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
                    {recentFeedback.length === 0 && (
                      <p className="text-sm text-muted-foreground">No feedback submitted yet.</p>
                    )}
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
                    <Button
                      type="button"
                      variant={feedbackSentiment === 'positive' ? 'default' : 'outline'}
                      className="flex-1"
                      onClick={() => setFeedbackSentiment('positive')}
                    >
                      <Smile className="h-5 w-5 text-success" />
                    </Button>
                    <Button
                      type="button"
                      variant={feedbackSentiment === 'neutral' ? 'default' : 'outline'}
                      className="flex-1"
                      onClick={() => setFeedbackSentiment('neutral')}
                    >
                      <Meh className="h-5 w-5 text-warning" />
                    </Button>
                    <Button
                      type="button"
                      variant={feedbackSentiment === 'negative' ? 'default' : 'outline'}
                      className="flex-1"
                      onClick={() => setFeedbackSentiment('negative')}
                    >
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
                  disabled={submitFeedback.isPending}
                  onClick={handleSubmitFeedback}
                >
                  <Send className="h-4 w-4 mr-2" />
                  {submitFeedback.isPending ? 'Submitting...' : 'Submit Anonymously'}
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

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
                  {attritionCorrelation == null ? (
                    <>Not enough employee data to compute a Pearson correlation yet.</>
                  ) : (
                    <>
                      <strong>Correlation coefficient: r = {attritionCorrelation}</strong> — There is a {correlationLabel}
                      {' '}between satisfaction scores and attrition risk.
                      {attritionCorrelation < 0 && ' Employees with higher engagement tend to have lower attrition risk.'}
                    </>
                  )}
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
