import { PRODUCT_REGISTRY } from '../../products/productRegistry';
import {
  createProductLicenseFromProduct,
  getProductLicenseStatusLabel,
  type ProductLicenseDefinition,
  type ProductLicenseStatus,
} from './ProductLicensingRegistry';

export interface ProductLicensingSummary {
  totalProducts: number;
  licensedProducts: number;
  embeddedProducts: number;
  pendingMigrationProducts: number;
  totalTabs: number;
}

export interface ProductLicensingSnapshot {
  licenses: ProductLicenseDefinition[];
  summary: ProductLicensingSummary;
}

/**
 * ProductLicensingService
 *
 * Camada inicial da Capacidade Licenciamento de Produtos.
 * Usa o Product Registry como fonte de verdade e prepara a futura integração
 * com ModuleAccessEngine / módulos contratados por tenant.
 */
export class ProductLicensingService {
  static buildSnapshot(): ProductLicensingSnapshot {
    const licenses = PRODUCT_REGISTRY.map(createProductLicenseFromProduct);

    return {
      licenses,
      summary: {
        totalProducts: licenses.length,
        licensedProducts: licenses.filter((license) => license.status === 'licensed').length,
        embeddedProducts: licenses.filter((license) => license.status === 'embedded').length,
        pendingMigrationProducts: licenses.filter((license) => license.status === 'pending_migration').length,
        totalTabs: licenses.reduce((sum, license) => sum + license.tabsCount, 0),
      },
    };
  }

  static getStatusLabel(status: ProductLicenseStatus): string {
    return getProductLicenseStatusLabel(status);
  }

  static isLicensed(status: ProductLicenseStatus): boolean {
    return status === 'licensed' || status === 'embedded';
  }
}
