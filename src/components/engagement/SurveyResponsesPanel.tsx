import { useSurveyResponses } from '@/hooks/useApi';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, X, ClipboardList } from 'lucide-react';

interface SurveyResponsesPanelProps {
  surveyId: string;
  surveyTitle: string;
  onClose: () => void;
}

function formatAnswer(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
}

export function SurveyResponsesPanel({ surveyId, surveyTitle, onClose }: SurveyResponsesPanelProps) {
  const { data, isLoading, isError } = useSurveyResponses(surveyId);

  return (
    <Card className="border-primary/20">
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            Survey Responses
          </CardTitle>
          <CardDescription>
            {surveyTitle} · {data?.responseCount ?? 0} submission{(data?.responseCount ?? 0) === 1 ? '' : 's'}
            {data?.anonymous ? ' · Anonymous survey' : ''}
          </CardDescription>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close responses panel">
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <div className="flex items-center justify-center py-10 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            Loading responses...
          </div>
        )}

        {isError && (
          <p className="text-sm text-destructive">Unable to load survey responses. Please try again.</p>
        )}

        {!isLoading && !isError && data && data.submissions.length === 0 && (
          <p className="text-sm text-muted-foreground py-6 text-center">
            No responses yet. Share the survey link with employees to collect answers.
          </p>
        )}

        {!isLoading && !isError && data && data.submissions.length > 0 && (
          <div className="space-y-4 max-h-[520px] overflow-y-auto pr-1">
            {data.submissions.map((submission) => (
              <div key={submission.id} className="rounded-lg border p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{submission.respondent}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {submission.submittedAt
                        ? new Date(submission.submittedAt).toLocaleString()
                        : '—'}
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  {submission.answers.map((answer) => (
                    <div key={`${submission.id}-${answer.questionId}`} className="rounded-md bg-muted/40 p-3">
                      <p className="text-sm font-medium">{answer.question}</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {formatAnswer(answer.answer)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
