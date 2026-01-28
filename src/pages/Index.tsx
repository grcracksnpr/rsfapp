import { useState, useMemo, useCallback, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileUploader, MetricCard, SurvivalChart, DataTable, PatientDataEditor } from '@/components/survival';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Activity, Users, TrendingUp, TrendingDown, Download, Play, ChevronDown, Settings, Info, Dna, BarChart3, FileText } from 'lucide-react';
import { readUploadedFile, detectIdColumn, generateMockSurvivalData, getSurvivalAtTime, classifyRisk, exportToCSV } from '@/lib/survival-utils';
import { toast } from 'sonner';

// Lazy load 3D scene for performance
const Scene3D = lazy(() => import('@/components/3d/Scene3D'));

// Mock model bundle structure (in production would come from .joblib file)
interface ModelBundle {
  features: string[];
  riskRef?: {
    q33: number;
    q66: number;
  };
  featureCount: number;
}
interface PatientResult {
  patientId: string;
  riskScore: number;
  riskGroup: 'Low' | 'Intermediate' | 'High' | null;
  survivalProbabilities: {
    year: number;
    probability: number;
  }[];
  survivalData: {
    time: number;
    probability: number;
  }[];
}
const TIMEPOINT_OPTIONS = [1, 2, 3, 5, 10];
export default function Index() {
  // File states
  const [modelFile, setModelFile] = useState<File | null>(null);
  const [dataFile, setDataFile] = useState<File | null>(null);

  // Data states
  const [patientData, setPatientData] = useState<Record<string, any>[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [idColumn, setIdColumn] = useState<string | null>(null);

  // Model states
  const [modelBundle, setModelBundle] = useState<ModelBundle | null>(null);

  // Prediction states
  const [results, setResults] = useState<PatientResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Settings
  const [rawPtpmInput, setRawPtpmInput] = useState(true);
  const [selectedTimepoints, setSelectedTimepoints] = useState<number[]>([1, 2, 3, 5]);
  const [selectedPatient, setSelectedPatient] = useState<string | null>(null);
  const [chartMode, setChartMode] = useState<'single' | 'all'>('single');

  // UI states
  const [infoExpanded, setInfoExpanded] = useState(true);

  // Handle model file upload
  const handleModelUpload = useCallback(async (file: File | null) => {
    setModelFile(file);
    if (file) {
      // In production, this would parse the .joblib file
      // For demo, we create a mock bundle
      setModelBundle({
        features: ['age', 'stage_ordinal', 'tumor_size', 'lymph_nodes', 'EGFR_pTPM', 'TP53_pTPM', 'KRAS_pTPM', 'ALK_pTPM', 'BRCA1_pTPM', 'BRCA2_pTPM', 'MYC_pTPM', 'HER2_pTPM'],
        riskRef: {
          q33: 0.35,
          q66: 0.65
        },
        featureCount: 12
      });
      toast.success('Model bundle loaded successfully');
    } else {
      setModelBundle(null);
      setResults([]);
    }
  }, []);

  // Handle data file upload
  const handleDataUpload = useCallback(async (file: File | null) => {
    setDataFile(file);
    if (file) {
      try {
        const data = await readUploadedFile(file);
        const cols = data.length > 0 ? Object.keys(data[0]) : [];
        setPatientData(data);
        setColumns(cols);
        setIdColumn(detectIdColumn(cols));
        setResults([]);
        toast.success(`Loaded ${data.length} patients with ${cols.length} features`);
      } catch (error) {
        toast.error(`Failed to read file: ${error}`);
        setPatientData([]);
        setColumns([]);
      }
    } else {
      setPatientData([]);
      setColumns([]);
      setIdColumn(null);
      setResults([]);
    }
  }, []);

  // Run predictions
  const handlePredict = useCallback(async () => {
    if (!modelBundle || patientData.length === 0) {
      toast.error('Please upload both model and patient data');
      return;
    }
    setIsProcessing(true);
    try {
      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 800));
      const predictions: PatientResult[] = patientData.map((row, idx) => {
        const patientId = idColumn ? String(row[idColumn]) : `Patient_${idx + 1}`;

        // Generate mock risk score (in production, this comes from the model)
        const riskScore = 0.2 + Math.random() * 0.6;

        // Generate survival curve
        const survivalData = generateMockSurvivalData(patientId, riskScore);

        // Calculate survival at selected timepoints
        const survivalProbabilities = selectedTimepoints.map(year => ({
          year,
          probability: getSurvivalAtTime(survivalData, year * 365)
        }));

        // Classify risk
        const {
          group: riskGroup
        } = classifyRisk(riskScore, modelBundle.riskRef || null);
        return {
          patientId,
          riskScore,
          riskGroup,
          survivalProbabilities,
          survivalData
        };
      });
      setResults(predictions);

      // Select first patient by default
      if (predictions.length > 0 && !selectedPatient) {
        setSelectedPatient(predictions[0].patientId);
      }
      toast.success(`Generated predictions for ${predictions.length} patients`);
    } catch (error) {
      toast.error(`Prediction failed: ${error}`);
    } finally {
      setIsProcessing(false);
    }
  }, [modelBundle, patientData, idColumn, selectedTimepoints, selectedPatient]);

  // Export predictions
  const handleExport = useCallback(() => {
    if (results.length === 0) return;
    const exportData = results.map(r => {
      const row: Record<string, any> = {
        Patient: r.patientId,
        Risk_Score: r.riskScore.toFixed(4),
        Risk_Group: r.riskGroup || '—'
      };
      r.survivalProbabilities.forEach(sp => {
        row[`S(t=${sp.year}y)`] = sp.probability.toFixed(3);
      });
      return row;
    });
    exportToCSV(exportData, 'survival_predictions.csv');
    toast.success('Predictions exported successfully');
  }, [results]);

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    if (results.length === 0) return null;
    const scores = results.map(r => r.riskScore);
    return {
      total: results.length,
      avgRisk: scores.reduce((a, b) => a + b, 0) / scores.length,
      minRisk: Math.min(...scores),
      maxRisk: Math.max(...scores),
      lowCount: results.filter(r => r.riskGroup === 'Low').length,
      mediumCount: results.filter(r => r.riskGroup === 'Intermediate').length,
      highCount: results.filter(r => r.riskGroup === 'High').length
    };
  }, [results]);

  // Prepare chart data
  const chartData = useMemo(() => {
    if (results.length === 0) return [];
    const colors = ['#3b3b3b', '#5a5a5a', '#787878', '#969696', '#b4b4b4', '#2a2a2a', '#4a4a4a', '#686868', '#868686', '#a4a4a4'];
    return results.map((r, idx) => ({
      patientId: r.patientId,
      data: r.survivalData,
      color: colors[idx % colors.length]
    }));
  }, [results]);

  // Get selected patient's detailed data
  const selectedPatientData = useMemo(() => {
    if (!selectedPatient) return null;
    return results.find(r => r.patientId === selectedPatient) || null;
  }, [selectedPatient, results]);
  return <div className="min-h-screen bg-background relative overflow-hidden">
      {/* 3D Background */}
      <Suspense fallback={<div className="absolute inset-0 bg-gradient-to-br from-background via-muted/30 to-background" />}>
        <Scene3D />
      </Suspense>
      
      {/* Main Content */}
      <div className="relative z-10 min-h-screen">
        {/* Header */}
        <header className="border-b border-border/50 backdrop-blur-sm bg-background/80">
          <div className="container mx-auto px-6 py-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Dna className="w-6 h-6 text-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground tracking-tight">Protein Biomarker
Survival Analysis</h1>
                <p className="text-sm text-muted-foreground">
                  Advanced Machine Learning for Personalized Survival Analysis
                </p>
              </div>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-6 py-8">
          {/* Info Section */}
          <Collapsible open={infoExpanded} onOpenChange={setInfoExpanded} className="mb-8">
            <CollapsibleTrigger asChild>
              <button className="glass-card w-full px-5 py-4 flex items-center justify-between hover:bg-card/90 transition-colors rounded-xl">
                <div className="flex items-center gap-3">
                  <Info className="w-5 h-5 text-muted-foreground" />
                  <span className="font-medium text-foreground">What you need to upload</span>
                </div>
                <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${infoExpanded ? 'rotate-180' : ''}`} />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="grid md:grid-cols-2 gap-6 mt-4">
                <div className="glass-card rounded-xl p-5">
                  <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Model Bundle (.joblib)
                  </h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded">model</code> — Fitted RSF model
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded">features</code> — Feature names list
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded">feature_medians</code> — For imputation
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50" />
                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded">risk_ref</code> — Risk quantiles (optional)
                    </li>
                  </ul>
                </div>
                
                <div className="glass-card rounded-xl p-5">
                  <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4" />
                    Patient Data (.xlsx/.csv)
                  </h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                      One row per patient
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                      Matches training schema
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                      Missing values as NA/blank
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                      Protein columns ending with <code className="text-xs bg-muted px-1.5 py-0.5 rounded">_pTPM</code>
                    </li>
                  </ul>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Upload Section */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <FileUploader accept=".joblib" label="Model Bundle" description="Upload .joblib file with trained RSF model" icon="model" file={modelFile} onFileSelect={handleModelUpload} />
            
            <FileUploader accept=".xlsx,.xls,.csv" label="Patient Data" description="Upload .xlsx or .csv with patient features" icon="data" file={dataFile} onFileSelect={handleDataUpload} />
          </div>

          {/* Settings & Controls */}
          {modelBundle && <motion.div initial={{
          opacity: 0,
          y: 10
        }} animate={{
          opacity: 1,
          y: 0
        }} className="glass-card rounded-xl p-5 mb-8">
              <div className="flex flex-wrap items-center justify-between gap-6">
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-3">
                    <Switch id="raw-ptpm" checked={rawPtpmInput} onCheckedChange={setRawPtpmInput} />
                    <Label htmlFor="raw-ptpm" className="text-sm">
                      Raw pTPM inputs (apply log1p + scaling)
                    </Label>
                  </div>
                  
                  <Separator orientation="vertical" className="h-6" />
                  
                  <div className="flex items-center gap-3">
                    <Label className="text-sm text-muted-foreground">Timepoints:</Label>
                    <div className="flex gap-1.5">
                      {TIMEPOINT_OPTIONS.map(year => <button key={year} onClick={() => {
                    setSelectedTimepoints(prev => prev.includes(year) ? prev.filter(y => y !== year) : [...prev, year].sort((a, b) => a - b));
                  }} className={`px-2.5 py-1 text-xs rounded-md transition-colors ${selectedTimepoints.includes(year) ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
                          {year}y
                        </button>)}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="font-mono">
                    {modelBundle.featureCount} features
                  </Badge>
                  
                  <Button onClick={handlePredict} disabled={patientData.length === 0 || isProcessing} className="gap-2">
                    <Play className="w-4 h-4" />
                    {isProcessing ? 'Processing...' : 'Predict Survival'}
                  </Button>
                </div>
              </div>
            </motion.div>}

          {/* Data Editor */}
          {patientData.length > 0 && columns.length > 0 && <motion.div initial={{
          opacity: 0,
          y: 10
        }} animate={{
          opacity: 1,
          y: 0
        }} className="mb-8">
              <PatientDataEditor data={patientData} columns={columns} onDataChange={setPatientData} idColumn={idColumn || undefined} />
            </motion.div>}

          {/* Results Section */}
          <AnimatePresence>
            {results.length > 0 && summaryStats && <motion.div initial={{
            opacity: 0
          }} animate={{
            opacity: 1
          }} exit={{
            opacity: 0
          }}>
                {/* Summary Metrics */}
                <div className="mb-8">
                  <h2 className="section-header mb-4 flex items-center gap-2">
                    <Activity className="w-5 h-5" />
                    Prediction Results
                  </h2>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <MetricCard label="Total Patients" value={summaryStats.total} icon={Users} />
                    <MetricCard label="Avg Risk Score" value={summaryStats.avgRisk.toFixed(4)} icon={Activity} />
                    <MetricCard label="Min Risk" value={summaryStats.minRisk.toFixed(4)} icon={TrendingDown} variant="low" />
                    <MetricCard label="Max Risk" value={summaryStats.maxRisk.toFixed(4)} icon={TrendingUp} variant="high" />
                  </div>
                </div>

                {/* Results Table */}
                <div className="mb-8">
                  <DataTable data={results} timepoints={selectedTimepoints} onSelectPatient={setSelectedPatient} selectedPatient={selectedPatient || undefined} />
                </div>

                {/* Survival Charts */}
                <div className="mb-8">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="section-header">Survival Curve Analysis</h2>
                    
                    <Tabs value={chartMode} onValueChange={v => setChartMode(v as 'single' | 'all')}>
                      <TabsList className="bg-muted/50">
                        <TabsTrigger value="single" className="text-xs">Single Patient</TabsTrigger>
                        <TabsTrigger value="all" className="text-xs">All Patients</TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </div>
                  
                  {chartMode === 'single' && results.length > 0 && <div className="mb-4">
                      <Select value={selectedPatient || results[0].patientId} onValueChange={setSelectedPatient}>
                        <SelectTrigger className="w-[250px]">
                          <SelectValue placeholder="Select patient" />
                        </SelectTrigger>
                        <SelectContent>
                          {results.map(r => <SelectItem key={r.patientId} value={r.patientId}>
                              {r.patientId}
                            </SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>}
                  
                  <SurvivalChart mode={chartMode} data={chartData} timepoints={selectedTimepoints.map(y => y * 365)} selectedPatient={selectedPatient || undefined} />
                  
                  {/* Selected Patient Details */}
                  {chartMode === 'single' && selectedPatientData && <motion.div initial={{
                opacity: 0,
                y: 10
              }} animate={{
                opacity: 1,
                y: 0
              }} className="mt-6">
                      <h3 className="section-header mb-4">Selected Patient Details</h3>
                      
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                        <MetricCard label="Patient" value={selectedPatientData.patientId} />
                        <MetricCard label="Risk Score" value={selectedPatientData.riskScore.toFixed(4)} />
                        <MetricCard label="Risk Group" value={selectedPatientData.riskGroup || '—'} variant={selectedPatientData.riskGroup === 'Low' ? 'low' : selectedPatientData.riskGroup === 'Intermediate' ? 'medium' : selectedPatientData.riskGroup === 'High' ? 'high' : 'default'} />
                      </div>
                      
                      <div className="glass-card rounded-xl p-5">
                        <h4 className="text-sm font-medium text-muted-foreground mb-4">
                          Survival Probabilities at Key Timepoints
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                          {selectedPatientData.survivalProbabilities.map(sp => {
                      const variant = sp.probability >= 0.7 ? 'low' : sp.probability >= 0.4 ? 'medium' : 'high';
                      return <MetricCard key={sp.year} label={`Year ${sp.year}`} value={`${(sp.probability * 100).toFixed(1)}%`} variant={variant} />;
                    })}
                        </div>
                      </div>
                    </motion.div>}
                </div>

                {/* Download Section */}
                <div className="flex gap-4 justify-center">
                  <Button variant="outline" onClick={handleExport} className="gap-2">
                    <Download className="w-4 h-4" />
                    Download Predictions (CSV)
                  </Button>
                </div>
              </motion.div>}
          </AnimatePresence>

          {/* Empty State */}
          {!modelBundle && <motion.div initial={{
          opacity: 0
        }} animate={{
          opacity: 1
        }} className="text-center py-16">
              <div className="w-16 h-16 rounded-2xl bg-muted mx-auto mb-4 flex items-center justify-center">
                <Dna className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium text-foreground mb-2">
                Get Started
              </h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                Upload a model bundle to begin generating survival predictions for your patients.
              </p>
            </motion.div>}
        </main>

        {/* Footer */}
        <footer className="border-t border-border/50 mt-16">
          <div className="container mx-auto px-6 py-6 text-center">
            <p className="text-sm text-secondary">Powered by Rami BABAS • Advanced Machine Learning for Personalized Survival Analysis</p>
          </div>
        </footer>
      </div>
    </div>;
}