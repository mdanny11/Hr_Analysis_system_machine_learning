import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { api } from '@/services/api';
import { ApiError } from '@/lib/apiClient';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { CheckCircle2, Loader2 } from 'lucide-react';

type SurveyQuestion = {
  id: string;
  text: string;
  type: string;
};

type PublicSurvey = {
  title: string;
  anonymous: boolean;
  employeeName?: string | null;
  alreadyResponded: boolean;
  questions: SurveyQuestion[];
};

export default function SurveyRespond() {
  const { token = '' } = useParams();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [survey, setSurvey] = useState<PublicSurvey | null>(null);
  const [answers, setAnswers] = useState<Record<string, string | number>>({});

  useEffect(() => {
    let active = true;
    async function loadSurvey() {
      if (!token) {
        setError('Invalid survey link');
        setLoading(false);
        return;
      }
      try {
        const data = await api.engagement.getPublicSurvey(token);
        if (!active) return;
        setSurvey(data);
        if (data.alreadyResponded) {
          setSubmitted(true);
        }
      } catch (err) {
        if (!active) return;
        setError(err instanceof ApiError ? err.message : 'Unable to load survey');
      } finally {
        if (active) setLoading(false);
      }
    }
    loadSurvey();
    return () => {
      active = false;
    };
  }, [token]);

  const greeting = useMemo(() => {
    if (!survey || survey.anonymous || !survey.employeeName) return null;
    return `Hi ${survey.employeeName},`;
  }, [survey]);

  const updateAnswer = (questionId: string, value: string | number) => {
    setAnswers((current) => ({ ...current, [questionId]: value }));
  };

  const handleSubmit = async () => {
    if (!survey || !token) return;
    for (const question of survey.questions) {
      const value = answers[question.id];
      if (value === undefined || value === '') {
        toast.error('Please answer all questions');
        return;
      }
    }

    setSubmitting(true);
    try {
      await api.engagement.submitPublicSurvey(token, answers);
      setSubmitted(true);
      toast.success('Thank you!', { description: 'Your survey response has been recorded' });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to submit survey');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <Card className="max-w-lg w-full">
          <CardHeader>
            <CardTitle>Survey unavailable</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (!survey) {
    return null;
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <Card className="max-w-lg w-full">
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            <CheckCircle2 className="h-12 w-12 text-success mx-auto" />
            <h1 className="text-2xl font-semibold">Thank you for your response</h1>
            <p className="text-muted-foreground">
              Your answers for "{survey.title}" have been submitted successfully.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-10 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{survey.title}</CardTitle>
            <CardDescription>
              {greeting ? `${greeting} ` : ''}
              Please complete all questions below.{' '}
              {survey.anonymous ? 'Your responses are anonymous.' : 'Your responses may be linked to your profile.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {survey.questions.map((question, index) => (
              <div key={question.id} className="space-y-3 rounded-lg border p-4">
                <Label className="text-base">
                  {index + 1}. {question.text}
                </Label>

                {question.type === 'rating' && (
                  <div className="space-y-2">
                    <Input
                      type="number"
                      min={1}
                      max={10}
                      value={answers[question.id] ?? ''}
                      onChange={(e) => updateAnswer(question.id, Number(e.target.value))}
                      placeholder="Enter a score from 1 to 10"
                    />
                  </div>
                )}

                {question.type === 'yesno' && (
                  <RadioGroup
                    value={String(answers[question.id] ?? '')}
                    onValueChange={(value) => updateAnswer(question.id, value)}
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="yes" id={`${question.id}-yes`} />
                      <Label htmlFor={`${question.id}-yes`} className="font-normal">Yes</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="no" id={`${question.id}-no`} />
                      <Label htmlFor={`${question.id}-no`} className="font-normal">No</Label>
                    </div>
                  </RadioGroup>
                )}

                {(question.type === 'text' || question.type === 'multiple_choice') && (
                  <Textarea
                    value={String(answers[question.id] ?? '')}
                    onChange={(e) => updateAnswer(question.id, e.target.value)}
                    placeholder="Type your answer..."
                    rows={3}
                  />
                )}
              </div>
            ))}

            <Button className="w-full" disabled={submitting} onClick={handleSubmit}>
              {submitting ? 'Submitting...' : 'Submit Survey'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
