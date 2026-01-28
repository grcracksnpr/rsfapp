import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Plus, Trash2, Edit3 } from 'lucide-react';
import { motion } from 'framer-motion';

interface PatientDataEditorProps {
  data: Record<string, any>[];
  columns: string[];
  onDataChange: (data: Record<string, any>[]) => void;
  idColumn?: string;
}

export function PatientDataEditor({
  data,
  columns,
  onDataChange,
  idColumn
}: PatientDataEditorProps) {
  const [editingCell, setEditingCell] = useState<{ row: number; col: string } | null>(null);
  const [editValue, setEditValue] = useState('');

  const handleStartEdit = useCallback((rowIndex: number, colName: string, currentValue: any) => {
    setEditingCell({ row: rowIndex, col: colName });
    setEditValue(currentValue?.toString() ?? '');
  }, []);

  const handleSaveEdit = useCallback(() => {
    if (!editingCell) return;
    
    const newData = [...data];
    newData[editingCell.row] = {
      ...newData[editingCell.row],
      [editingCell.col]: editValue === '' ? null : 
        isNaN(Number(editValue)) ? editValue : Number(editValue)
    };
    
    onDataChange(newData);
    setEditingCell(null);
    setEditValue('');
  }, [editingCell, editValue, data, onDataChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      setEditingCell(null);
      setEditValue('');
    }
  }, [handleSaveEdit]);

  const handleAddRow = useCallback(() => {
    const newRow: Record<string, any> = {};
    columns.forEach(col => {
      newRow[col] = null;
    });
    if (idColumn) {
      newRow[idColumn] = `Patient_${data.length + 1}`;
    }
    onDataChange([...data, newRow]);
  }, [columns, data, idColumn, onDataChange]);

  const handleDeleteRow = useCallback((index: number) => {
    onDataChange(data.filter((_, i) => i !== index));
  }, [data, onDataChange]);

  const displayColumns = columns.slice(0, 15); // Limit visible columns for performance
  const hasMoreColumns = columns.length > 15;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="data-table-container"
    >
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div>
          <h3 className="section-header">Input Data</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Click any cell to edit. Use NA or leave blank for missing values.
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={handleAddRow}
          className="gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Row
        </Button>
      </div>

      <ScrollArea className="h-[300px]">
        <Table>
          <TableHeader className="sticky top-0 bg-card z-10">
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[50px]">#</TableHead>
              {displayColumns.map(col => (
                <TableHead key={col} className="min-w-[100px] max-w-[150px]">
                  <span className="truncate block" title={col}>
                    {col}
                  </span>
                </TableHead>
              ))}
              {hasMoreColumns && (
                <TableHead className="text-muted-foreground">
                  +{columns.length - 15} more
                </TableHead>
              )}
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          
          <TableBody>
            {data.map((row, rowIndex) => (
              <TableRow key={rowIndex} className="group">
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {rowIndex + 1}
                </TableCell>
                
                {displayColumns.map(col => {
                  const isEditing = editingCell?.row === rowIndex && editingCell?.col === col;
                  const cellValue = row[col];
                  
                  return (
                    <TableCell
                      key={col}
                      className="relative p-1"
                      onClick={() => !isEditing && handleStartEdit(rowIndex, col, cellValue)}
                    >
                      {isEditing ? (
                        <Input
                          autoFocus
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={handleSaveEdit}
                          onKeyDown={handleKeyDown}
                          className="h-7 text-xs"
                        />
                      ) : (
                        <div className="px-2 py-1 rounded cursor-pointer hover:bg-muted/50 transition-colors group/cell flex items-center gap-1">
                          <span className="text-xs truncate flex-1">
                            {cellValue === null || cellValue === undefined ? (
                              <span className="text-muted-foreground italic">NA</span>
                            ) : (
                              String(cellValue)
                            )}
                          </span>
                          <Edit3 className="w-3 h-3 text-muted-foreground opacity-0 group-hover/cell:opacity-100 transition-opacity" />
                        </div>
                      )}
                    </TableCell>
                  );
                })}
                
                {hasMoreColumns && (
                  <TableCell className="text-muted-foreground text-xs">
                    ...
                  </TableCell>
                )}
                
                <TableCell>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => handleDeleteRow(rowIndex)}
                  >
                    <Trash2 className="w-3 h-3 text-muted-foreground hover:text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      <div className="p-3 border-t border-border bg-muted/30 flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {data.length} row(s) × {columns.length} column(s)
        </p>
        {idColumn && (
          <p className="text-xs text-muted-foreground">
            ID column: <span className="font-medium">{idColumn}</span>
          </p>
        )}
      </div>
    </motion.div>
  );
}
