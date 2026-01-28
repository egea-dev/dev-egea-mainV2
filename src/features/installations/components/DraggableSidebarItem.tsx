import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import { Profile } from '@/types';

type DraggableItem =
  | (Profile & { type?: 'vehicle' | 'user'; tasksCount?: number })
  | { id: string; name: string; type: 'vehicle' | 'user'; status?: string };

type DraggableSidebarItemProps = {
  item: DraggableItem;
  children: React.ReactNode;
  className?: string;
};

export const DraggableSidebarItem = ({ item, children, className }: DraggableSidebarItemProps) => {
  const isUser = 'full_name' in item;
  const itemType = isUser ? 'user' : item.type;
  
  const isDisabled = isUser && item.status !== 'activo';

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `sidebar-item-${itemType}-${item.id}`,
    data: {
      type: itemType,
      item: { id: item.id, name: isUser ? item.full_name : item.name },
    },
    disabled: isDisabled,
  });

  const statusClasses = cn({
    'text-amber-500': isUser && item.status === 'vacaciones',
    'text-muted-foreground line-through opacity-50': isUser && item.status === 'baja',
    'cursor-grab': !isDisabled,
    'cursor-not-allowed opacity-60': isDisabled,
  });


  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cn(
        'p-1 rounded-md transition-colors',
        !isDisabled && 'hover:bg-accent',
        isDragging && 'bg-accent opacity-50',
        statusClasses,
        className
      )}
    >
      {children}
    </div>
  );
};
