import React from 'react';

interface MobileSidebarBackdropProps {
  open: boolean;
  onClose: () => void;
}

/**
 * MobileSidebarBackdrop
 * Overlay exibido quando o menu lateral está aberto no celular.
 */
export default function MobileSidebarBackdrop({
  open,
  onClose,
}: MobileSidebarBackdropProps) {
  if (!open) return null;

  return (
    <div
      className="absolute inset-0 bg-black/50 z-25 lg:hidden"
      onClick={onClose}
    />
  );
}
