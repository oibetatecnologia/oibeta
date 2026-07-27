import { DatabaseAdapter } from "../../database/DatabaseAdapter";
import { KnowledgeGraphEngine } from "../KnowledgeGraphEngine";

export class ProcurementContractLinker {
  constructor(
    private dbAdapter: DatabaseAdapter,
    private kgEngine: KnowledgeGraphEngine,
  ) {}

  public async linkContracts(organizationId: string, projectId?: string, workspaceId?: string): Promise<any> {
    const actualWorkspaceId = workspaceId || "default-workspace";
    const nodes = await this.dbAdapter.getKnowledgeNodes(organizationId, projectId, actualWorkspaceId);

    const contracts = nodes.filter(n => n.nodeType === "CONTRACT");
    const bids = nodes.filter(n => n.nodeType === "BID" || n.nodeType === "NOTICE");
    const suppliers = nodes.filter(n => n.nodeType === "SUPPLIER");
    const priceRegistries = nodes.filter(n => n.nodeType === "PRICE_REGISTRY");

    let linksCreated = 0;

    for (const contract of contracts) {
      const cMeta = contract.metadata || {};
      const cSupplierRaw = (cMeta.supplierName || "").toUpperCase();
      const cBidNum = cMeta.bidNumber || cMeta.biddingNumber || "";

      // 1. CONTRACT ↔ SUPPLIER
      if (cSupplierRaw) {
        const matchedSupplier = suppliers.find(s => {
          const sName = s.title.toUpperCase();
          return sName.includes(cSupplierRaw) || cSupplierRaw.includes(sName);
        });

        if (matchedSupplier) {
          await this.kgEngine.createRelationship(organizationId, contract.id, matchedSupplier.id, "CONTRACTS");
          await this.kgEngine.createRelationship(organizationId, matchedSupplier.id, contract.id, "SUPPLIES");
          linksCreated += 2;
        }
      }

      // 2. CONTRACT ↔ BID
      if (cBidNum) {
        const matchedBid = bids.find(b => {
          const bNum = (b.metadata?.number || b.metadata?.bidNum || b.title || "").toLowerCase();
          return bNum.includes(cBidNum.toLowerCase()) || cBidNum.toLowerCase().includes(bNum);
        });

        if (matchedBid) {
          await this.kgEngine.createRelationship(organizationId, contract.id, matchedBid.id, "GENERATED_FROM");
          linksCreated++;
        }
      }

      // 3. CONTRACT ↔ PRICE_REGISTRY
      for (const arp of priceRegistries) {
        const arpMeta = arp.metadata || {};
        const arpBidNum = arpMeta.bidNumber || arpMeta.biddingNumber || "";
        if (arpBidNum && cBidNum && (arpBidNum === cBidNum || arpBidNum.includes(cBidNum) || cBidNum.includes(arpBidNum))) {
          await this.kgEngine.createRelationship(organizationId, contract.id, arp.id, "GENERATED_FROM");
          linksCreated++;
        }
      }
    }

    // 4. PRICE_REGISTRY ↔ SUPPLIER & BID
    for (const arp of priceRegistries) {
      const arpMeta = arp.metadata || {};
      const arpSupplierRaw = (arpMeta.supplierName || "").toUpperCase();
      const arpBidNum = arpMeta.bidNumber || arpMeta.biddingNumber || "";

      if (arpSupplierRaw) {
        const matchedSupplier = suppliers.find(s => {
          const sName = s.title.toUpperCase();
          return sName.includes(arpSupplierRaw) || arpSupplierRaw.includes(sName);
        });

        if (matchedSupplier) {
          await this.kgEngine.createRelationship(organizationId, arp.id, matchedSupplier.id, "AWARDED_TO");
          linksCreated++;
        }
      }

      if (arpBidNum) {
        const matchedBid = bids.find(b => {
          const bNum = (b.metadata?.number || b.metadata?.bidNum || b.title || "").toLowerCase();
          return bNum.includes(arpBidNum.toLowerCase()) || arpBidNum.toLowerCase().includes(bNum);
        });

        if (matchedBid) {
          await this.kgEngine.createRelationship(organizationId, arp.id, matchedBid.id, "GENERATED_FROM");
          linksCreated++;
        }
      }
    }

    // 5. INTEGRATE WITH BETA GOV (GOVERNMENT SECTOR NODES)
    try {
      const govEntities = nodes.filter(n => n.nodeType === "GOVERNMENT_ENTITY");
      const programs = nodes.filter(n => n.nodeType === "PROGRAM");
      const indicators = nodes.filter(n => n.nodeType === "INDICATOR");
      const policies = nodes.filter(n => n.nodeType === "PUBLIC_POLICY");

      // 5.1 Link BIDS to GOVERNMENT_ENTITY (PUBLISHED_BY) and CONTRACTS to GOVERNMENT_ENTITY (BELONGS_TO)
      for (const bid of bids) {
        const agencyName = (bid.metadata?.responsibleAgency || bid.responsibleAgency || "").toUpperCase();
        if (agencyName) {
          const matchedGov = govEntities.find(g => {
            const gName = g.title.toUpperCase();
            return gName.includes(agencyName) || agencyName.includes(gName);
          });
          if (matchedGov) {
            await this.kgEngine.createRelationship(organizationId, bid.id, matchedGov.id, "PUBLISHED_BY");
            linksCreated++;
          }
        }
      }

      for (const contract of contracts) {
        const agencyName = (contract.metadata?.responsibleAgency || contract.responsibleAgency || "").toUpperCase();
        if (agencyName) {
          const matchedGov = govEntities.find(g => {
            const gName = g.title.toUpperCase();
            return gName.includes(agencyName) || agencyName.includes(gName);
          });
          if (matchedGov) {
            await this.kgEngine.createRelationship(organizationId, contract.id, matchedGov.id, "BELONGS_TO");
            linksCreated++;
          }
        }
      }

      // 5.2 Link Bids / Contracts to Programs based on text keyword matching (FUNDS)
      for (const program of programs) {
        const progTitle = program.title.toLowerCase();
        
        // Match bid object keyword contents
        for (const bid of bids) {
          const bidObj = (bid.metadata?.object || bid.description || bid.title || "").toLowerCase();
          if (
            (prodTitleContains(progTitle, "saude") && textContains(bidObj, "saúde", "medicamentos", "hospital", "insumos")) ||
            (prodTitleContains(progTitle, "educacao") && textContains(bidObj, "educação", "escola", "merenda", "transporte escolar")) ||
            (prodTitleContains(progTitle, "infra") && textContains(bidObj, "obra", "vias", "asfalto", "pavimentação", "reforma")) ||
            (prodTitleContains(progTitle, "seguranca") && textContains(bidObj, "vigilância", "guarda", "camera", "policiamento"))
          ) {
            await this.kgEngine.createRelationship(organizationId, program.id, bid.id, "FUNDS");
            linksCreated++;
          }
        }

        // Match contract title keyword contents
        for (const contract of contracts) {
          const contractTitle = contract.title.toLowerCase();
          if (
            (prodTitleContains(progTitle, "saude") && textContains(contractTitle, "saúde", "medicamentos", "médico", "clínica")) ||
            (prodTitleContains(progTitle, "educacao") && textContains(contractTitle, "educação", "escola", "creche", "professor")) ||
            (prodTitleContains(progTitle, "infra") && textContains(contractTitle, "construção", "pavimento", "engenharia", "reforma"))
          ) {
            await this.kgEngine.createRelationship(organizationId, program.id, contract.id, "FUNDS");
            linksCreated++;
          }
        }
      }

      // 5.3 Link Contracts to Indicators or Public Policies based on indicators target mapping (CONTRIBUTES_TO)
      for (const indicator of indicators) {
        const indTitle = indicator.title.toLowerCase();
        for (const contract of contracts) {
          const contractTitle = contract.title.toLowerCase();
          if (
            (prodTitleContains(indTitle, "ideb") && textContains(contractTitle, "educação", "ensino", "escola")) ||
            (prodTitleContains(indTitle, "infantil") && textContains(contractTitle, "creche", "vacina", "maternidade")) ||
            (prodTitleContains(indTitle, "saneamento") && textContains(contractTitle, "esgoto", "água", "drenagem", "coleta"))
          ) {
            await this.kgEngine.createRelationship(organizationId, contract.id, indicator.id, "ASSOCIATED_WITH");
            linksCreated++;
          }
        }
      }

    } catch (error) {
      console.warn("Could not auto-link Beta Gov relationships to procurement dataset:", error);
    }

    return { success: true, linksCreated };
  }
}

function prodTitleContains(title: string, keyword: string): boolean {
  return normalizeText(title).includes(normalizeText(keyword));
}

function textContains(text: string, ...keywords: string[]): boolean {
  const normText = normalizeText(text);
  return keywords.some(k => normText.includes(normalizeText(k)));
}

function normalizeText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}
