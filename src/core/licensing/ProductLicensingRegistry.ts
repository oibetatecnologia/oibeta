import type { ProductDefinition } from '../../products/productRegistry';

export type ProductLicenseStatus = 'licensed' | 'available' | 'embedded' | 'pending_migration';

export interface ProductLicenseDefinition {
  productId: string;
  productName: string;
  workspaceKey: string;
  status: ProductLicenseStatus;
  tabsCount: number;
  category: string;
  description: string;
}

export function createProductLicenseFromProduct(product: ProductDefinition): ProductLicenseDefinition {
  return {
    productId: product.id,
    productName: product.commercialName,
    workspaceKey: product.workspaceKey,
    status:
      product.status === 'active'
        ? 'licensed'
        : product.status === 'embedded'
        ? 'embedded'
        : product.status === 'static_pending_migration'
        ? 'pending_migration'
        : 'available',
    tabsCount: product.tabs.length,
    category: product.category,
    description: product.description,
  };
}

export function getProductLicenseStatusLabel(status: ProductLicenseStatus): string {
  const labels: Record<ProductLicenseStatus, string> = {
    licensed: 'Licenciado',
    available: 'Disponível',
    embedded: 'Embutido',
    pending_migration: 'Pendente de migração',
  };

  return labels[status];
}
