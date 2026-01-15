import { useState, useCallback } from 'react';

export function useModal() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedColumnId, setSelectedColumnId] = useState<string>('');
  const [cardDetailsOpen, setCardDetailsOpen] = useState(false);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [columnDialogOpen, setColumnDialogOpen] = useState(false);

  const openCreateForColumn = useCallback((columnId: string) => {
    setSelectedColumnId(columnId);
    setCreateDialogOpen(true);
  }, []);

  const openCardDetails = useCallback((cardId: string) => {
    setSelectedCardId(cardId);
    setCardDetailsOpen(true);
  }, []);

  return {
    createDialogOpen,
    setCreateDialogOpen,
    selectedColumnId,
    setSelectedColumnId,
    cardDetailsOpen,
    setCardDetailsOpen,
    selectedCardId,
    setSelectedCardId,
    inviteOpen,
    setInviteOpen,
    columnDialogOpen,
    setColumnDialogOpen,
    openCreateForColumn,
    openCardDetails,
  };
}
