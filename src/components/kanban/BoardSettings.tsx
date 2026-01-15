import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, Filter, LayoutGrid } from 'lucide-react';
import { boardApi } from '@/api/boards';
import { useToast } from '@/hooks/use-toast';

interface BoardSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  boardId: string;
  boardSettings: any;
  onUpdate: () => void;
}

export const BoardSettings: React.FC<BoardSettingsProps> = ({
  open,
  onOpenChange,
  boardId,
  boardSettings,
  onUpdate,
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState({
    show_card_numbers: boardSettings?.show_card_numbers ?? true,
    show_story_points: boardSettings?.show_story_points ?? true,
    show_assignee_avatar: boardSettings?.show_assignee_avatar ?? true,
    enable_wip_limits: boardSettings?.enable_wip_limits ?? false,
    swimlanes_enabled: boardSettings?.swimlanes_enabled ?? false,
    card_aging_enabled: boardSettings?.card_aging_enabled ?? false,
    quick_filters: boardSettings?.quick_filters ?? true,
  });

  const handleSave = async () => {
    setLoading(true);
    try {
      await boardApi.updateSettings(boardId, settings);

      toast({
        title: 'Settings saved',
        description: 'Board settings have been updated.',
      });

      onUpdate();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to save settings',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Board Settings
          </DialogTitle>
          <DialogDescription>
            Configure how your board looks and behaves
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="display" className="w-full">
          <TabsList>
            <TabsTrigger value="display">
              <LayoutGrid className="w-4 h-4 mr-2" />
              Display
            </TabsTrigger>
            <TabsTrigger value="features">
              <Filter className="w-4 h-4 mr-2" />
              Features
            </TabsTrigger>
          </TabsList>

          <TabsContent value="display" className="space-y-4 mt-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Show Card Numbers</Label>
                  <p className="text-sm text-muted-foreground">
                    Display unique identifiers on cards
                  </p>
                </div>
                <Switch
                  checked={settings.show_card_numbers}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, show_card_numbers: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Show Story Points</Label>
                  <p className="text-sm text-muted-foreground">
                    Display story points on cards
                  </p>
                </div>
                <Switch
                  checked={settings.show_story_points}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, show_story_points: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Show Assignee Avatar</Label>
                  <p className="text-sm text-muted-foreground">
                    Display assignee avatar on cards
                  </p>
                </div>
                <Switch
                  checked={settings.show_assignee_avatar}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, show_assignee_avatar: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Card Aging</Label>
                  <p className="text-sm text-muted-foreground">
                    Highlight cards that haven't moved in a while
                  </p>
                </div>
                <Switch
                  checked={settings.card_aging_enabled}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, card_aging_enabled: checked })
                  }
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="features" className="space-y-4 mt-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>WIP Limits</Label>
                  <p className="text-sm text-muted-foreground">
                    Set work-in-progress limits for columns
                  </p>
                </div>
                <Switch
                  checked={settings.enable_wip_limits}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, enable_wip_limits: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Swimlanes</Label>
                  <p className="text-sm text-muted-foreground">
                    Group cards by assignee or epic
                  </p>
                </div>
                <Switch
                  checked={settings.swimlanes_enabled}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, swimlanes_enabled: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Quick Filters</Label>
                  <p className="text-sm text-muted-foreground">
                    Enable quick filter buttons
                  </p>
                </div>
                <Switch
                  checked={settings.quick_filters}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, quick_filters: checked })
                  }
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
