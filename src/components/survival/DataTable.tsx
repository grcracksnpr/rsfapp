import { useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Search, ChevronUp, ChevronDown } from 'lucide-react';
import { motion } from 'framer-motion';

interface PatientResult {
  patientId: string;
  riskScore: number;
  riskGroup: 'Low' | 'Intermediate' | 'High' | null;
  survivalProbabilities: { year: number; probability: number }[];
}

interface DataTableProps {
  data: PatientResult[];
  timepoints: number[];
  onSelectPatient?: (patientId: string) => void;
  selectedPatient?: string;
}

type SortField = 'patientId' | 'riskScore' | 'riskGroup';
type SortDirection = 'asc' | 'desc';

export function DataTable({
  data,
  timepoints,
  onSelectPatient,
  selectedPatient
}: DataTableProps) {
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('patientId');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const filteredAndSortedData = useMemo(() => {
    let filtered = data.filter(patient =>
      patient.patientId.toLowerCase().includes(search.toLowerCase())
    );

    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case 'patientId':
          comparison = a.patientId.localeCompare(b.patientId);
          break;
        case 'riskScore':
          comparison = a.riskScore - b.riskScore;
          break;
        case 'riskGroup':
          const order = { Low: 0, Intermediate: 1, High: 2 };
          comparison = (order[a.riskGroup || 'Low'] || 0) - (order[b.riskGroup || 'Low'] || 0);
          break;
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [data, search, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' 
      ? <ChevronUp className="w-3 h-3 ml-1" />
      : <ChevronDown className="w-3 h-3 ml-1" />;
  };

  const getRiskBadgeVariant = (riskGroup: string | null) => {
    switch (riskGroup) {
      case 'Low': return 'outline';
      case 'Intermediate': return 'secondary';
      case 'High': return 'destructive';
      default: return 'outline';
    }
  };

  const getRiskBadgeClass = (riskGroup: string | null) => {
    switch (riskGroup) {
      case 'Low': return 'border-risk-low text-risk-low bg-risk-low/10';
      case 'Intermediate': return 'border-risk-medium text-risk-medium bg-risk-medium/10';
      case 'High': return 'border-risk-high text-risk-high bg-risk-high/10';
      default: return '';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="data-table-container"
    >
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-4">
          <h3 className="section-header flex-1">Prediction Results</h3>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search patients..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 bg-muted/50"
            />
          </div>
        </div>
      </div>

      <ScrollArea className="h-[400px]">
        <Table>
          <TableHeader className="sticky top-0 bg-card z-10">
            <TableRow className="hover:bg-transparent border-b border-border">
              <TableHead
                className="cursor-pointer hover:text-foreground transition-colors"
                onClick={() => handleSort('patientId')}
              >
                <div className="flex items-center">
                  Patient
                  <SortIcon field="patientId" />
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer hover:text-foreground transition-colors text-right"
                onClick={() => handleSort('riskScore')}
              >
                <div className="flex items-center justify-end">
                  Risk Score
                  <SortIcon field="riskScore" />
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer hover:text-foreground transition-colors"
                onClick={() => handleSort('riskGroup')}
              >
                <div className="flex items-center">
                  Risk Group
                  <SortIcon field="riskGroup" />
                </div>
              </TableHead>
              {timepoints.map(year => (
                <TableHead key={year} className="text-right">
                  S(t={year}y)
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          
          <TableBody>
            {filteredAndSortedData.map((patient) => (
              <TableRow
                key={patient.patientId}
                onClick={() => onSelectPatient?.(patient.patientId)}
                className={cn(
                  "cursor-pointer transition-colors",
                  selectedPatient === patient.patientId && "bg-primary/5"
                )}
              >
                <TableCell className="font-medium">
                  {patient.patientId}
                </TableCell>
                <TableCell className="text-right font-mono text-sm">
                  {patient.riskScore.toFixed(4)}
                </TableCell>
                <TableCell>
                  {patient.riskGroup ? (
                    <Badge
                      variant="outline"
                      className={cn("font-medium", getRiskBadgeClass(patient.riskGroup))}
                    >
                      {patient.riskGroup}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                {patient.survivalProbabilities.map(sp => (
                  <TableCell key={sp.year} className="text-right font-mono text-sm">
                    {(sp.probability * 100).toFixed(1)}%
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      <div className="p-3 border-t border-border bg-muted/30">
        <p className="text-xs text-muted-foreground">
          Showing {filteredAndSortedData.length} of {data.length} patients
        </p>
      </div>
    </motion.div>
  );
}
