import { useState, useEffect, useMemo } from 'react';
import { useModels, useFeatureImportance, useRunPredictions, useRetrainModel, useRetrainAllModels, useTrainAndPredict, useAtRiskEmployees } from '@/hooks/useApi';
import { ApiError, ML_TRAINING_TIMEOUT_MS } from '@/lib/apiClient';
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
      const recommended = [...models].sort(
        (a, b) => (b.productionScore ?? b.f1Score * 0.6 + b.auc * 0.4) - (a.productionScore ?? a.f1Score * 0.6 + a.auc * 0.4),
      )[0];
      setSelectedModel(recommended ?? models.find(m => m.status === 'active') ?? models[0]);
    }
  }, [models, selectedModel]);

  const recommendedModel = useMemo(
    () =>
      models.length
        ? [...models].sort(
            (a, b) => (b.productionScore ?? b.f1Score * 0.6 + b.auc * 0.4) - (a.productionScore ?? a.f1Score * 0.6 + a.auc * 0.4),
          )[0]
        : null,
    [models],
  );

  const { data: featureImportance = [] } = useFeatureImportance(selectedModel?.id);
  const { data: atRiskEmployees = [] } = useAtRiskEmployees(threshold[0]);
  const runPredictions = useRunPredictions();
  const retrainModel = useRetrainModel();
  const retrainAllModels = useRetrainAllModels();
  const trainAndPredict = useTrainAndPredict();

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
      const metrics = updated.trainingMetrics;
      toast.success('Model retrained successfully', {
        id: 'retrain',
        description: metrics
          ? `Test accuracy ${(metrics.testAccuracy * 100).toFixed(1)}% · F1 ${(metrics.testF1 * 100).toFixed(1)}% · CV F1 ${(metrics.cvF1 * 100).toFixed(1)}%`
          : `Accuracy: ${(updated.accuracy * 100).toFixed(1)}%`,
      });
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Retraining failed', { id: 'retrain' });
    }
  };

  const retrainAll = async () => {
    toast.loading('Retraining all production models — this can take 2–4 minutes...', { id: 'retrain-all', duration: ML_TRAINING_TIMEOUT_MS });
    try {
      const results = await retrainAllModels.mutateAsync();
      if (results.length) {
        setSelectedModel(results[0]);
      }
      toast.success('All models retrained', {
        id: 'retrain-all',
        description: results
          .map((model) => `${model.name}: F1 ${(model.f1Score * 100).toFixed(0)}% · AUC ${(model.auc * 100).toFixed(0)}%`)
          .join(' · '),
      });
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Retraining failed', { id: 'retrain-all' });
    }
  };

  const trainRunPredict = async () => {
    toast.loading('Training all models on 1,500+ employees — this can take 2–4 minutes...', { id: 'train-run', duration: ML_TRAINING_TIMEOUT_MS });
    try {
      const result = await trainAndPredict.mutateAsync(threshold[0]);
      setSelectedModel(result.recommendedModel);
      toast.success('Training and predictions complete', {
        id: 'train-run',
        description: `${result.recommendedModel.name} selected · F1 ${(result.recommendedModel.f1Score * 100).toFixed(0)}% · ${result.predictions.atRiskCount} employees at risk`,
      });
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Training failed', { id: 'train-run' });
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
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={trainRunPredict}
            disabled={trainAndPredict.isPending || retrainAllModels.isPending || retrainModel.isPending || !models.length}
          >
            <Sparkles className={`h-4 w-4 mr-2 ${trainAndPredict.isPending ? 'animate-pulse' : ''}`} />
            {trainAndPredict.isPending ? 'Training...' : 'Train & Run Predictions'}
          </Button>
          <Button
            variant="outline"
            onClick={retrainAll}
            disabled={retrainAllModels.isPending || retrainModel.isPending || trainAndPredict.isPending || !models.length}
          >
            <Sparkles className={`h-4 w-4 mr-2 ${retrainAllModels.isPending ? 'animate-pulse' : ''}`} />
            {retrainAllModels.isPending ? 'Training All...' : 'Train All Models'}
          </Button>
          <Button variant="outline" onClick={retrain} disabled={retrainModel.isPending || retrainAllModels.isPending || trainAndPredict.isPending || !selectedModel}>
            <RefreshCw className={`h-4 w-4 mr-2 ${retrainModel.isPending ? 'animate-spin' : ''}`} />
            {retrainModel.isPending ? 'Retraining...' : 'Retrain Model'}
          </Button>
          <Button onClick={runPrediction} disabled={runPredictions.isPending || !selectedModel}>
            <Play className="h-4 w-4 mr-2" />
            {runPredictions.isPending ? 'Running...' : 'Run Predictions'}
          </Button>
        </div>
      </div>

      <Card className="border-warning/30 bg-warning/5">
        <CardContent className="p-4 flex gap-3 items-start">
          <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium">Read F1 and AUC, not accuracy alone</p>
            <p className="text-muted-foreground mt-1">
              High accuracy with low F1 usually means the model rarely flags employees who may leave.
              {recommendedModel && (
                <> Current best: <strong>{recommendedModel.name}</strong> (F1 {(recommendedModel.f1Score * 100).toFixed(0)}%, AUC {(recommendedModel.auc * 100).toFixed(0)}%).</>
              )}
              {' '}Use <strong>Train & Run Predictions</strong> for the full workflow.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-3 gap-4">
        {models.map((model) => (
          <Card key={model.id} className={`cursor-pointer transition-all ${selectedModel?.id === model.id ? 'ring-2 ring-primary' : 'hover:shadow-md'}`} onClick={() => setSelectedModel(model)}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-4">
                <div className="p-2 rounded-lg bg-primary/10"><Brain className="h-5 w-5 text-primary" /></div>
                <div className="flex flex-col items-end gap-1">
                  <Badge variant={model.status === 'active' ? 'default' : 'secondary'}>{model.status}</Badge>
                  {recommendedModel?.id === model.id && (
                    <Badge variant="success" className="text-[10px]">Recommended</Badge>
                  )}
                </div>
              </div>
              <h3 className="font-semibold mb-1">{model.name}</h3>
              <p className="text-sm text-muted-foreground mb-3">{model.type}</p>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Production score</span>
                  <span className="font-medium">{((model.productionScore ?? model.f1Score * 0.6 + model.auc * 0.4) * 100).toFixed(0)}%</span>
                </div>
                <Progress value={(model.productionScore ?? model.f1Score * 0.6 + model.auc * 0.4) * 100} className="h-2" />
                <div className="grid grid-cols-3 gap-2 pt-1 text-xs text-muted-foreground">
                  <span>F1 {(model.f1Score * 100).toFixed(0)}%</span>
                  <span>Recall {(model.recall * 100).toFixed(0)}%</span>
                  <span>AUC {(model.auc * 100).toFixed(0)}%</span>
                </div>
                <p className="text-[11px] text-muted-foreground">Accuracy {(model.accuracy * 100).toFixed(1)}%</p>
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
