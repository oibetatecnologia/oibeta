import React from 'react';

export interface MenuItem {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  badge?: string;
  module?: string;
  count?: number | null;
  disabled?: boolean;
  subItems?: MenuItem[];
}

export interface MenuGroup {
  id: string;
  label: string;
  items: MenuItem[];
}
