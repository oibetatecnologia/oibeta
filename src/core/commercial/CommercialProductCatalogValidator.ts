import { PRODUCT_REGISTRY, type ProductDefinition } from '../../products/productRegistry';
import { BETA_MARKET_SERVICES, type BetaMarketServiceDefinition } from './CommercialRadarRegistry';

export interface CommercialCatalogValidation {
  validServices: BetaMarketServiceDefinition[];
  invalidServices: BetaMarketServiceDefinition[];
  productsWithoutCommercialProfile: ProductDefinition[];
}

export function validateCommercialCatalog(): CommercialCatalogValidation {
  const productIds = new Set(PRODUCT_REGISTRY.map((product) => product.id));
  const validServices = BETA_MARKET_SERVICES.filter((service) => productIds.has(service.productId));
  const invalidServices = BETA_MARKET_SERVICES.filter((service) => !productIds.has(service.productId));
  const profiledIds = new Set(validServices.map((service) => service.productId));
  const productsWithoutCommercialProfile = PRODUCT_REGISTRY.filter((product) => product.commerciallyAvailable && !profiledIds.has(product.id));
  return { validServices, invalidServices, productsWithoutCommercialProfile };
}
