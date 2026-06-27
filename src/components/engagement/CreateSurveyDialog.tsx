import { useState } from 'react';
import { toast } from 'sonner';
import { X, Plus, Trash2, GripVertical, ToggleLeft, ToggleRight } from 'lucide-react';
import { useCreateSurvey } from '@/hooks/useApi';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface SurveyQuestion {
  id: string;
  text: string;
  type: 'rating' | 'multiple_choice' | 'text';
}

interface CreateSurveyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateSurveyDialog({ open, onOpenChange }: CreateSurveyDialogProps) {
  const createSurvey = useCreateSurvey();
  const [title, setTitle] = useState('');
  const [surveyType, setSurveyType] = useState('');
  const [targetAudience, setTargetAudience] = useState<string[]>([]);
  const [anonymous, setAnonymous] = useState(true);
  const [questions, setQuestions] = useState<SurveyQuestion[]>([
    { id: '1', text: '', type: 'rating' }
  ]);

  const handleAddQuestion = () => {
    const newQuestion: SurveyQuestion = {
      id: String(Date.now()),
      text: '',
      type: 'rating'
    };
    setQuestions([...questions, newQuestion]);
  };

  const handleRemoveQuestion = (id: string) => {
    if (questions.length > 1) {
      setQuestions(questions.filter(q => q.id !== id));
    }
  };

  const handleQuestionChange = (id: string, field: keyof SurveyQuestion, value: string) => {
    setQuestions(questions.map(q => 
      q.id === id ? { ...q, [field]: value } : q
    ));
  };

  const handleAudienceToggle = (audience: string) => {
    if (targetAudience.includes(audience)) {
      setTargetAudience(targetAudience.filter(a => a !== audience));
    } else {
      setTargetAudience([...targetAudience, audience]);
    }
  };

  const handleSaveDraft = () => {
    toast.info('Survey saved as draft', { 
      description: 'You can continue editing later' 
    });
    onOpenChange(false);
  };

  const handleLaunch = async () => {
    if (!title) {
      toast.error('Please enter a survey title');
      return;
    }
    if (!surveyType) {
      toast.error('Please select a survey type');
      return;
    }
    if (questions.some(q => !q.text)) {
      toast.error('Please fill in all questions');
      return;
    }

    try {
      const audience = targetAudience.length > 0 ? targetAudience.join(', ') : 'All Employees';
      await createSurvey.mutateAsync({
        title,
        type: surveyType,
        audience,
        anonymous,
        questions: questions.map((question) => ({
          text: question.text,
          type: question.type,
        })),
      });
      toast.success('Survey launched successfully', {
        description: `"${title}" is live. Email invitations are being sent to employees.`,
      });
      onOpenChange(false);
      setTitle('');
      setSurveyType('');
      setTargetAudience([]);
      setQuestions([{ id: '1', text: '', type: 'rating' }]);
    } catch {
      toast.error('Failed to launch survey', { description: 'Please try again' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto glass-card border-white/10 p-0 data-[state=open]:animate-scale-in data-[state=closed]:animate-scale-out">
        {/* Header */}
        <DialogHeader className="p-6 pb-4 border-b border-white/10">
          <DialogTitle className="text-xl font-semibold text-white">
            Create Employee Survey
          </DialogTitle>
          <DialogDescription className="text-white/60">
            Design and launch a new engagement survey
          </DialogDescription>
        </DialogHeader>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* Survey Title */}
          <div className="space-y-2">
            <Label className="text-white/80">Survey Title</Label>
            <Input
              placeholder="e.g., Q1 Employee Engagement Survey"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="glass-input border-white/10 text-white placeholder:text-white/40"
            />
          </div>

          {/* Survey Type */}
          <div className="space-y-2">
            <Label className="text-white/80">Survey Type</Label>
            <Select value={surveyType} onValueChange={setSurveyType}>
              <SelectTrigger className="glass-input border-white/10 text-white">
                <SelectValue placeholder="Select survey type" />
              </SelectTrigger>
              <SelectContent className="glass-card border-white/10">
                <SelectItem value="engagement">Engagement</SelectItem>
                <SelectItem value="satisfaction">Satisfaction</SelectItem>
                <SelectItem value="exit">Exit Survey</SelectItem>
                <SelectItem value="pulse">Pulse Survey</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Target Audience */}
          <div className="space-y-3">
            <Label className="text-white/80">Target Audience</Label>
            <div className="grid grid-cols-2 gap-3">
              {['All Employees', 'Department', 'Role', 'Location'].map((audience) => (
                <div 
                  key={audience}
                  className="flex items-center space-x-2 p-3 rounded-lg glass-button cursor-pointer"
                  onClick={() => handleAudienceToggle(audience)}
                >
                  <Checkbox 
                    checked={targetAudience.includes(audience)}
                    onCheckedChange={() => handleAudienceToggle(audience)}
                    className="border-white/30 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                  />
                  <span className="text-sm text-white/80">{audience}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Questions */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-white/80">Questions</Label>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleAddQuestion}
                className="glass-button border-white/10 text-white/80 hover:text-white"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Question
              </Button>
            </div>
            
            <div className="space-y-3">
              {questions.map((question, index) => (
                <div 
                  key={question.id}
                  className="p-4 rounded-lg glass-card border-white/5 space-y-3"
                >
                  <div className="flex items-center gap-2">
                    <GripVertical className="h-4 w-4 text-white/30 cursor-grab" />
                    <span className="text-sm font-medium text-white/60">Q{index + 1}</span>
                    <div className="flex-1" />
                    {questions.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveQuestion(question.id)}
                        className="h-8 w-8 text-white/40 hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  
                  <Input
                    placeholder="Enter your question..."
                    value={question.text}
                    onChange={(e) => handleQuestionChange(question.id, 'text', e.target.value)}
                    className="glass-input border-white/10 text-white placeholder:text-white/40"
                  />
                  
                  <Select 
                    value={question.type} 
                    onValueChange={(value) => handleQuestionChange(question.id, 'type', value)}
                  >
                    <SelectTrigger className="w-48 glass-input border-white/10 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="glass-card border-white/10">
                      <SelectItem value="rating">Rating (1-10)</SelectItem>
                      <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                      <SelectItem value="text">Open Text</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </div>

          {/* Anonymous Toggle */}
          <div className="flex items-center justify-between p-4 rounded-lg glass-button">
            <div className="flex items-center gap-3">
              {anonymous ? (
                <ToggleRight className="h-5 w-5 text-primary" />
              ) : (
                <ToggleLeft className="h-5 w-5 text-white/40" />
              )}
              <div>
                <p className="text-sm font-medium text-white/80">Anonymous Responses</p>
                <p className="text-xs text-white/50">Employee identities will be hidden</p>
              </div>
            </div>
            <Switch 
              checked={anonymous} 
              onCheckedChange={setAnonymous}
              className="data-[state=checked]:bg-primary"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 pt-4 border-t border-white/10 flex gap-3 justify-end">
          <Button 
            variant="ghost" 
            onClick={() => onOpenChange(false)}
            className="text-white/60 hover:text-white hover:bg-white/10"
          >
            Cancel
          </Button>
          <Button 
            variant="outline" 
            onClick={handleSaveDraft}
            className="glass-button border-white/20 text-white/80"
          >
            Save Draft
          </Button>
          <Button 
            onClick={handleLaunch}
            disabled={createSurvey.isPending}
            className="bg-primary hover:bg-primary/90 text-white"
          >
            {createSurvey.isPending ? 'Launching...' : 'Launch Survey'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
