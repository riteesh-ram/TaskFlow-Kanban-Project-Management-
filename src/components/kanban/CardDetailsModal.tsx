import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, User, Clock, MessageSquare, Paperclip, Activity, AlertCircle, CheckCircle2, Circle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/api/supabase';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface CardDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cardId: string;
  boardId: string;
  onUpdate: () => void;
}

interface Comment {
  id: string;
  user_id: string;
  user_email: string;
  user_name: string | null;
  comment: string;
  created_at: string;
}

interface ActivityLog {
  id: string;
  user_email: string;
  action: string;
  old_values: any;
  new_values: any;
  created_at: string;
}

const PRIORITY_OPTIONS = ['Low', 'Medium', 'High', 'Critical'];
const CARD_TYPES = ['Story', 'Task', 'Bug', 'Epic', 'Subtask'];

const LABEL_COLORS: Record<string, string> = {
  bug: 'bg-red-500',
  feature: 'bg-blue-500',
  enhancement: 'bg-green-500',
  urgent: 'bg-orange-500',
  documentation: 'bg-purple-500',
  testing: 'bg-cyan-500',
};

export const CardDetailsModal: React.FC<CardDetailsModalProps> = ({
  open,
  onOpenChange,
  cardId,
  boardId,
  onUpdate,
}) => {
  const { user, userProfile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [card, setCard] = useState<any>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [newComment, setNewComment] = useState('');
  const [storyPoints, setStoryPoints] = useState<number | null>(null);
  const [priority, setPriority] = useState('Medium');
  const [cardType, setCardType] = useState('Task');

  useEffect(() => {
    if (open && cardId) {
      fetchCardDetails();
      fetchComments();
      fetchActivities();
    }
  }, [open, cardId]);

  const fetchCardDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('cards')
        .select('*')
        .eq('id', cardId)
        .single();

      if (error) throw error;
      setCard(data);
      
      // Parse metadata if exists
      const metadata = data.metadata || {};
      setStoryPoints(metadata.story_points || null);
      setPriority(metadata.priority || 'Medium');
      setCardType(metadata.card_type || 'Task');
    } catch (error) {
      console.error('Error fetching card:', error);
    }
  };

  const fetchComments = async () => {
    try {
      // We'll need to create a comments table
      const { data, error } = await supabase
        .from('card_comments')
        .select(`
          id,
          user_id,
          comment,
          created_at,
          profiles:user_id (email, full_name)
        `)
        .eq('card_id', cardId)
        .order('created_at', { ascending: false });

      if (error && error.code !== 'PGRST116') throw error; // Ignore if table doesn't exist
      
      if (data) {
        const formattedComments = data.map((c: any) => ({
          id: c.id,
          user_id: c.user_id,
          user_email: c.profiles?.email || 'Unknown',
          user_name: c.profiles?.full_name,
          comment: c.comment,
          created_at: c.created_at,
        }));
        setComments(formattedComments);
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
    }
  };

  const fetchActivities = async () => {
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select(`
          id,
          action,
          old_values,
          new_values,
          created_at,
          profiles:user_id (email)
        `)
        .eq('resource_id', cardId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      
      if (data) {
        const formattedActivities = data.map((a: any) => ({
          id: a.id,
          user_email: a.profiles?.email || 'System',
          action: a.action,
          old_values: a.old_values,
          new_values: a.new_values,
          created_at: a.created_at,
        }));
        setActivities(formattedActivities);
      }
    } catch (error) {
      console.error('Error fetching activities:', error);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !user) return;

    try {
      const { error } = await supabase
        .from('card_comments')
        .insert([{
          card_id: cardId,
          user_id: user.id,
          comment: newComment.trim(),
        }]);

      if (error) throw error;

      toast({
        title: 'Comment added',
        description: 'Your comment has been posted.',
      });

      setNewComment('');
      fetchComments();
    } catch (error: any) {
      // Table might not exist, show graceful message
      if (error.code === '42P01') {
        toast({
          title: 'Info',
          description: 'Comments feature will be available soon.',
        });
      } else {
        toast({
          title: 'Error',
          description: 'Failed to add comment',
          variant: 'destructive',
        });
      }
    }
  };

  const handleUpdateMetadata = async () => {
    if (!card) return;

    setLoading(true);
    try {
      const metadata = {
        story_points: storyPoints,
        priority,
        card_type: cardType,
      };

      const { error } = await supabase
        .from('cards')
        .update({ metadata })
        .eq('id', cardId);

      if (error) throw error;

      toast({
        title: 'Card updated',
        description: 'Card details have been saved.',
      });

      onUpdate();
    } catch (error) {
      console.error('Error updating card:', error);
      toast({
        title: 'Error',
        description: 'Failed to update card',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'Critical':
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      case 'High':
        return <AlertCircle className="w-4 h-4 text-orange-600" />;
      case 'Medium':
        return <Circle className="w-4 h-4 text-yellow-600" />;
      default:
        return <Circle className="w-4 h-4 text-blue-600" />;
    }
  };

  const getCardTypeIcon = (type: string) => {
    switch (type) {
      case 'Bug':
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      case 'Story':
        return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case 'Epic':
        return <Activity className="w-4 h-4 text-purple-600" />;
      default:
        return <CheckCircle2 className="w-4 h-4 text-blue-600" />;
    }
  };

  if (!card) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            {getCardTypeIcon(cardType)}
            <DialogTitle className="text-xl">{card.title}</DialogTitle>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="col-span-2 space-y-6">
            {/* Description */}
            <div className="space-y-2">
              <Label className="text-base font-semibold">Description</Label>
              <p className="text-sm text-muted-foreground">
                {card.description || 'No description provided'}
              </p>
            </div>

            {/* Labels */}
            {card.labels && card.labels.length > 0 && (
              <div className="space-y-2">
                <Label className="text-base font-semibold">Labels</Label>
                <div className="flex flex-wrap gap-2">
                  {card.labels.map((label: string, index: number) => {
                    const bgColor = LABEL_COLORS[label] || 'bg-gray-500';
                    return (
                      <Badge key={index} className={`${bgColor} text-white border-0 capitalize`}>
                        {label}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Tabs for Comments and Activity */}
            <Tabs defaultValue="comments" className="w-full">
              <TabsList>
                <TabsTrigger value="comments">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Comments ({comments.length})
                </TabsTrigger>
                <TabsTrigger value="activity">
                  <Activity className="w-4 h-4 mr-2" />
                  Activity ({activities.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="comments" className="space-y-4 mt-4">
                {/* Add Comment */}
                <div className="space-y-2">
                  <Textarea
                    placeholder="Add a comment..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    rows={3}
                  />
                  <Button onClick={handleAddComment} size="sm">
                    Post Comment
                  </Button>
                </div>

                {/* Comments List */}
                <div className="space-y-3">
                  {comments.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No comments yet
                    </p>
                  ) : (
                    comments.map((comment) => (
                      <div key={comment.id} className="border rounded-lg p-3 space-y-2">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-xs">
                              {comment.user_email.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-medium">
                            {comment.user_name || comment.user_email}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(comment.created_at).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm pl-8">{comment.comment}</p>
                      </div>
                    ))
                  )}
                </div>
              </TabsContent>

              <TabsContent value="activity" className="space-y-3 mt-4">
                {activities.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No activity yet
                  </p>
                ) : (
                  activities.map((activity) => (
                    <div key={activity.id} className="flex gap-3 text-sm">
                      <Activity className="w-4 h-4 mt-0.5 text-muted-foreground" />
                      <div className="flex-1">
                        <span className="font-medium">{activity.user_email}</span>
                        {' '}
                        <span className="text-muted-foreground">{activity.action.toLowerCase()}</span>
                        {' '}
                        <span className="text-xs text-muted-foreground">
                          {new Date(activity.created_at).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="space-y-4 border-l pl-4">
            <div className="space-y-3">
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Type</Label>
                <Select value={cardType} onValueChange={setCardType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CARD_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        <div className="flex items-center gap-2">
                          {getCardTypeIcon(type)}
                          {type}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold">Priority</Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITY_OPTIONS.map((p) => (
                      <SelectItem key={p} value={p}>
                        <div className="flex items-center gap-2">
                          {getPriorityIcon(p)}
                          {p}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold">Story Points</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  placeholder="e.g., 5"
                  value={storyPoints || ''}
                  onChange={(e) => setStoryPoints(e.target.value ? parseInt(e.target.value) : null)}
                />
              </div>

              {card.assignee_id && (
                <div className="space-y-2">
                  <Label className="text-sm font-semibold flex items-center gap-1">
                    <User className="w-3 h-3" />
                    Assignee
                  </Label>
                  <div className="text-sm text-muted-foreground">
                    {/* This would show assignee name from members list */}
                    Assigned
                  </div>
                </div>
              )}

              {card.due_date && (
                <div className="space-y-2">
                  <Label className="text-sm font-semibold flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Due Date
                  </Label>
                  <div className="text-sm text-muted-foreground">
                    {new Date(card.due_date).toLocaleDateString()}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-sm font-semibold flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Created
                </Label>
                <div className="text-sm text-muted-foreground">
                  {new Date(card.created_at).toLocaleString()}
                </div>
              </div>

              <Button onClick={handleUpdateMetadata} className="w-full" disabled={loading}>
                {loading ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
