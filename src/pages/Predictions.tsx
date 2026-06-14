import { useState, useEffect } from 'react';
import { useModels, useFeatureImportance, useRunPredictions, useRetrainModel, useAtRiskEmployees } from '@/hooks/useApi';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';
import { Brain, Target, Play, RefreshCw, CheckCircle2, AlertTriangle, Info, Sparkles } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import type { PredictionModel } from '@/lib/types';

export default function Predictions() {
  const { data: models = [], isLoading } = useModels();
  const [selectedModel, setSelectedModel] = useState<PredictionModel | null>(null);
  const [threshold, setThreshold] = useState([50]);

  useEffect(() => {
    if (models.length && !selectedModel) {
      setSelectedModel(models.find(m => m.status === 'active') || models[0]);
    }
  }, [models, selectedModel]);

  const { data: featureImportance = [] } = useFeatureImportance(selectedModel?.id);
  const { data: atRiskEmployees = [] } = useAtRiskEmployees(threshold[0]);
  const runPredictions = useRunPredictions();
  const retrainModel = useRetrainModel();

  const runPrediction = async () => {
    if (!selectedModel) return;
    toast.loading('Running predictions on all employees...', { id: 'predictions' });
    try {
      const result = await runPredictions.mutateAsync({ modelId: selectedModel.id, threshold: threshold[0] / 100 });
      toast.success('Predictions complete', {
        id: 'predictions',
        description: `Analyzed ${result.analyzedCount} employees, ${result.atRiskCount} at risk`,
      });
    } catch {
      toast.error('Prediction failed', { id: 'predictions' });
    }
  };

  const retrain = async () => {
    if (!selectedModel) return;
    toast.loading(`Retraining ${selectedModel.name}...`, { id: 'retrain' });
    try {
      const updated = await retrainModel.mutateAsync(selectedModel.id);
      setSelectedModel(updated);
      toast.success('Model retrained successfully', {
        id: 'retrain',
        description: `Accuracy: ${(updated.accuracy * 100).toFixed(1)}%`,
      });
    } catch {
      toast.error('Retraining failed', { id: 'retrain' });
    }
  };

  const featureData = featureImportance.map(f => ({ ...f, importance: Math.round(f.importance * 100) }));
  const topRiskEmployees = atRiskEmployees.slice(0, 8);

  if (isLoading) return <p className="text-muted-foreground p-6">Loading models...</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Attrition Predictions</h1>
          <p className="text-muted-foreground">ML-powered employee attrition risk analysis</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={retrain} disabled={retrainModel.isPending || !selectedModel}>
            <RefreshCw className={`h-4 w-4 mr-2 ${retrainModel.isPending ? 'animate-spin' : ''}`} />
            {retrainModel.isPending ? 'Retraining...' : 'Retrain Model'}
          </Button>
          <Button onClick={runPrediction} disabled={runPredictions.isPending || !selectedModel}>
            <Play className="h-4 w-4 mr-2" />
            {runPredictions.isPending ? 'Running...' : 'Run Predictions'}
          </Button>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {models.map((model) => (
          <Card key={model.id} className={`cursor-pointer transition-all ${selectedModel?.id === model.id ? 'ring-2 ring-primary' : 'hover:shadow-md'}`} onClick={() => setSelectedModel(model)}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-4">
                <div className="p-2 rounded-lg bg-primary/10"><Brain className="h-5 w-5 text-primary" /></div>
                <Badge variant={model.status === 'active' ? 'default' : 'secondary'}>{model.status}</Badge>
              </div>
              <h3 className="font-semibold mb-1">{model.name}</h3>
              <p className="text-sm text-muted-foreground mb-3">{model.type}</p>
              <div className="space-y-2">
                <div className="flex justify-between text-sm"><span>Accuracy</span><span className="font-medium">{(model.accuracy * 100).toFixed(1)}%</span></div>
                <Progress value={model.accuracy * 100} className="h-2" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 glass-card p-6">
          <h3 className="font-semibold mb-4">Feature Importance</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={featureData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="feature" type="category" width={140} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="importance" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="glass-card p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2"><Target className="h-4 w-4" />Risk Threshold</h3>
          <Slider value={threshold} onValueChange={setThreshold} max={100} min={10} step={5} className="mb-4" />
          <p className="text-3xl font-bold text-center mb-2">{threshold[0]}%</p>
          <p className="text-sm text-muted-foreground text-center mb-4">{atRiskEmployees.length} employees above threshold</p>
          <div className="space-y-2">
            {topRiskEmployees.map((emp) => (
              <div key={emp.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
                <Avatar className="h-7 w-7"><AvatarFallback className="text-xs">{emp.firstName[0]}{emp.lastName[0]}</AvatarFallback></Avatar>
                <div className="flex-1 min-w-0"><p className="text-sm truncate">{emp.firstName} {emp.lastName}</p></div>
                <Badge variant="destructive" className="text-xs">{emp.attritionProbability}%</Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
