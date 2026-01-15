import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/contexts/AuthContext';
import { cardApi } from '@/api/cards';
import { useToast } from '@/hooks/use-toast';

interface CreateCardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  columnId: string | null;
  boardId: string;
  onSuccess: () => void;
}

// Predefined label options
const LABEL_OPTIONS = [
  { id: 'bug', label: 'Bug', color: 'bg-red-500' },
  { id: 'feature', label: 'Feature', color: 'bg-blue-500' },
  { id: 'enhancement', label: 'Enhancement', color: 'bg-green-500' },
  { id: 'urgent', label: 'Urgent', color: 'bg-orange-500' },
  { id: 'documentation', label: 'Documentation', color: 'bg-purple-500' },
  { id: 'testing', label: 'Testing', color: 'bg-cyan-500' },
];

export const CreateCardDialog: React.FC<CreateCardDialogProps> = ({
  open,
  onOpenChange,
  columnId,
  boardId,
  onSuccess,
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    due_date: '',
  });
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);

  // Get today's date in YYYY-MM-DD format for min date validation
  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  const toggleLabel = (labelId: string) => {
    setSelectedLabels(prev => 
      prev.includes(labelId) 
        ? prev.filter(id => id !== labelId)
        : [...prev, labelId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!columnId) return;

    setLoading(true);
    try {
      await cardApi.createCard({
        boardId,
        columnId,
        title: formData.title,
        description: formData.description,
        labels: selectedLabels,
        dueDate: formData.due_date,
        userId: user?.id,
      });

      toast({
        title: 'Success',
        description: 'Card created successfully!',
      });

      setFormData({ title: '', description: '', due_date: '' });
      setSelectedLabels([]);
      onSuccess();
    } catch (error) {
      console.error('Error creating card:', error);
      toast({
        title: 'Error',
        description: 'Failed to create card',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Card</DialogTitle>
          <DialogDescription>
            Add a new card to this column
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              placeholder="Enter card title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Enter card description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
          </div>
          
          <div className="space-y-2">
            <Label>Labels</Label>
            <div className="grid grid-cols-2 gap-2">
              {LABEL_OPTIONS.map((label) => (
                <div key={label.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`label-${label.id}`}
                    checked={selectedLabels.includes(label.id)}
                    onCheckedChange={() => toggleLabel(label.id)}
                  />
                  <label
                    htmlFor={`label-${label.id}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex items-center gap-1"
                  >
                    <span className={`w-3 h-3 rounded-full ${label.color}`}></span>
                    {label.label}
                  </label>
                </div>
              ))}
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="due_date">Due Date</Label>
            <Input
              id="due_date"
              type="date"
              min={getTodayDate()}
              value={formData.due_date}
              onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
            />
          </div>
          
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Card'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};