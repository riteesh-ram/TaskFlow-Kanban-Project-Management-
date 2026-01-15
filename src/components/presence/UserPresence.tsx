import React, { useEffect, useState } from 'react';
import { supabase } from '@/api/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { presenceService } from '@/lib/redis';

interface UserPresenceProps {
  boardId: string;
}

interface PresenceUser {
  user_id: string;
  email: string;
  full_name?: string;
  online_at: string;
  lastSeen: number;
}

const UserPresence: React.FC<UserPresenceProps> = ({ boardId }) => {
  const { user } = useAuth();
  const [onlineUsers, setOnlineUsers] = useState<PresenceUser[]>([]);

  useEffect(() => {
    if (!user || !boardId) return;

    const channel = supabase.channel(`board-${boardId}`);
    let presenceInterval: NodeJS.Timeout;

    // Update presence in Redis and Supabase
    const updatePresence = async () => {
      const userData = {
        user_id: user.id,
        email: user.email,
        full_name: user.user_metadata?.full_name || user.email,
        online_at: new Date().toISOString(),
      };

      try {
        // Update presence in Redis for fast access
        await presenceService.setUserPresence(boardId, user.id, userData);
        
        // Track in Supabase for real-time sync
        await channel.track(userData);
      } catch (error) {
        console.error('Error updating presence:', error);
      }
    };

    // Get presence from Redis (faster) and sync with Supabase
    const syncPresence = async () => {
      try {
        const redisPresence = await presenceService.getBoardPresence(boardId);
        const supabaseState = channel.presenceState();
        
        // Combine Redis and Supabase presence data
        const combinedUsers = new Map<string, PresenceUser>();
        
        // Add Redis presence data
        Object.entries(redisPresence).forEach(([userId, data]) => {
          combinedUsers.set(userId, data as PresenceUser);
        });
        
        // Add/update with Supabase presence data
        Object.values(supabaseState).forEach((presences: any) => {
          presences.forEach((presence: PresenceUser) => {
            combinedUsers.set(presence.user_id, {
              ...presence,
              lastSeen: Date.now() // Fresh from Supabase
            });
          });
        });
        
        setOnlineUsers(Array.from(combinedUsers.values()));
      } catch (error) {
        console.error('Error syncing presence:', error);
      }
    };

    // Subscribe to Supabase presence changes
    channel
      .on('presence', { event: 'sync' }, syncPresence)
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        console.log('User joined:', newPresences);
        syncPresence();
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        console.log('User left:', leftPresences);
        syncPresence();
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await updatePresence();
          await syncPresence();
          
          // Update presence every 15 seconds
          presenceInterval = setInterval(updatePresence, 15000);
        }
      });

    // Clean up stale presence data every 30 seconds
    const cleanupInterval = setInterval(async () => {
      try {
        await presenceService.cleanupStalePresence(boardId);
        await syncPresence();
      } catch (error) {
        console.error('Error cleaning up presence:', error);
      }
    }, 30000);

    return () => {
      if (presenceInterval) clearInterval(presenceInterval);
      if (cleanupInterval) clearInterval(cleanupInterval);
      
      // Remove user presence when leaving
      presenceService.removeUserPresence(boardId, user.id).catch(console.error);
      supabase.removeChannel(channel);
    };
  }, [user, boardId]);

  if (onlineUsers.length === 0) return null;

  return (
    <div className="flex items-center gap-2">
      <Badge variant="secondary" className="text-xs">
        {onlineUsers.length} online
      </Badge>
      <div className="flex -space-x-2">
        {onlineUsers.slice(0, 5).map((onlineUser) => (
          <Avatar key={onlineUser.user_id} className="h-8 w-8 border-2 border-background">
            <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${onlineUser.email}`} />
            <AvatarFallback className="text-xs">
              {onlineUser.email?.slice(0, 2).toUpperCase() || '??'}
            </AvatarFallback>
          </Avatar>
        ))}
        {onlineUsers.length > 5 && (
          <div className="h-8 w-8 rounded-full bg-muted border-2 border-background flex items-center justify-center text-xs font-medium">
            +{onlineUsers.length - 5}
          </div>
        )}
      </div>
    </div>
  );
};

export default UserPresence;