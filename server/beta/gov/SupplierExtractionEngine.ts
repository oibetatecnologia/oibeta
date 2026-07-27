import { DatabaseAdapter } from "../../database/DatabaseAdapter";
import { KnowledgeGraphEngine } from "../KnowledgeGraphEngine";

export class SupplierExtractionEngine {
  constructor(
    private dbAdapter: DatabaseAdapter,
    private kgEngine: KnowledgeGraphEngine,
  ) {}

  // Helper to validate CNPJ math (Brazilian format)
  private isValidCNPJ(cnpj: string): boolean {
    const cleaned = cnpj.replace(/[^\d]/g, "");
    if (cleaned.length !== 14) return false;
    if (/^(\d)\1+$/.test(cleaned)) return false; // eliminates 00000000000000 etc.

    let size = cleaned.length - 2;
    let numbers = cleaned.substring(0, size);
    const digits = cleaned.substring(size);
    let sum = 0;
    let pos = size - 7;
    for (let i = size; i >= 1; i--) {
      sum += parseInt(numbers.charAt(size - i)) * pos--;
      if (pos < 2) pos = 9;
    }
    let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    if (result !== parseInt(digits.charAt(0))) return false;

    size = size + 1;
    numbers = cleaned.substring(0, size);
    sum = 0;
    pos = size - 7;
    for (let i = size; i >= 1; i--) {
      sum += parseInt(numbers.charAt(size - i)) * pos--;
      if (pos < 2) pos = 9;
    }
    result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    if (result !== parseInt(digits.charAt(1))) return false;

    return true;
  }

  public async extractFromDocument(
    document: any,
    content: string,
    projectId: string,
    organizationId: string
  ): Promise<any[]> {
    const txt = content || "";
    const suppliers: any[] = [];

    // Extract potential supplier blocks using Ltda/SA/Eireli or CNPJ proximity
    const cnpjRegex = /\b\d{2}\s*\.\s*\d{3}\s*\.\s*\d{3}\s*\/\s*\d{4}\s*-\s*\d{2}\b/g;
    const cnpjsMatched = Array.from(txt.matchAll(cnpjRegex)).map(m => m[0].trim());

    // Extract names based on Brazilian corporate forms and keywords
    const corporateRegex = /([A-Z0-9À-Ÿ\s.&\-/]{5,80}(?:LTDA|L.T.D.A|S\.?A\.?|EIRELI|ME|EPP|S\/A|LTDA\s+EPP|LTDA\s+ME))\b/gi;
    const corporateMatches = Array.from(txt.matchAll(corporateRegex)).map(m => m[1].replace(/\r?\n/g, " ").trim());

    const fallbackRegex = /(?:contratada|proponente|licitante|fornecedor|razão\s+social|empresa|vencedor)\s*:\s*([A-Za-z0-9À-Ÿ\s.&\-\/]{5,60})/gi;
    const fallbackMatches = Array.from(txt.matchAll(fallbackRegex)).map(m => m[1].replace(/\r?\n/g, " ").trim());

    const allCandidateNames = [...corporateMatches, ...fallbackMatches];
    const uniqueCandidates = Array.from(new Set(allCandidateNames.map(n => n.toUpperCase())))
      .filter(n => n.length >= 5 && !n.includes("PREFEITURA") && !n.includes("INSTITUTO") && !n.includes("SECRETARIA") && !n.includes("MUNICIPIO"));

    const limit = Math.min(uniqueCandidates.length, 6);

    for (let i = 0; i < limit; i++) {
      const rawName = uniqueCandidates[i];
      // Format to title case for cleaner storage
      const name = rawName.split(" ").map(w => w.length > 2 ? w.charAt(0) + w.substring(1).toLowerCase() : w.toLowerCase()).join(" ");
      const cnpj = cnpjsMatched[i] || null;

      // Validate CNPJ if found
      const validCnpj = cnpj && this.isValidCNPJ(cnpj) ? cnpj.replace(/[^\d./-]/g, "") : null;

      // Extra fields: nome fantasia, endereço, município, UF, representante legal, contatos
      let fantasyName: string | null = null;
      let address: string | null = null;
      let city: string | null = null;
      let uf: string | null = null;
      let representative: string | null = null;
      let contacts: string | null = null;

      // Attempt to find Fantasy Name: "nome fantasia ... "
      const fantMatch = new RegExp(`(?:nome fantasia|denominada|fantasia)\\s*[:\\-]?\\s*([A-Za-z0-9À-Ÿ\\s.]{3,40})`, "i").exec(txt);
      if (fantMatch) fantasyName = fantMatch[1].trim();

      // Find Address, City, UF
      const addrMatch = /(?:endereço|sede|sediada\s+em|situada\s+na|rua|avenida|av\.)\s*[:\-]?\s*([A-Za-z0-9À-Ÿ\s,.-]{8,80})/i.exec(txt);
      if (addrMatch) address = addrMatch[1].trim();

      const cityMatch = /(?:cidade|município|municipio)\s*de\s*([A-Za-zÀ-Ÿ\s.-]{3,30})\s*(?:\/|-|,)\s*([A-Z]{2})\b/i.exec(txt);
      if (cityMatch) {
        city = cityMatch[1].trim();
        uf = cityMatch[2].toUpperCase();
      } else {
        // Fallback UF search
        const ufMatch = /\b([A-Z]{2})\b/.exec(txt.substring(Math.max(0, txt.indexOf(rawName)), Math.min(txt.length, txt.indexOf(rawName) + 300)));
        if (ufMatch) {
          const possibleUF = ufMatch[1].toUpperCase();
          const validUFs = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"];
          if (validUFs.includes(possibleUF)) {
            uf = possibleUF;
          }
        }
      }

      // Find Representative
      const repMatch = /(?:representada\s+por|representado\s+por|representante|sócio|proprietário|diretor)\s*[:\-]?\s*([A-Za-zÀ-Ÿ\s.-]{4,40})/i.exec(txt);
      if (repMatch) representative = repMatch[1].trim();

      // Find Contacts: Email & Phone
      const emailMatch = /\b[\w.\-]+@[\w.\-]+\.[\w]{2,4}\b/i.exec(txt);
      const phoneMatch = /(?:\(?\d{2}\)?\s*\d{4,5}[\-\s]?\d{4})/i.exec(txt);
      const email = emailMatch ? emailMatch[0] : null;
      const phone = phoneMatch ? phoneMatch[0] : null;
      if (email || phone) {
        contacts = [email, phone].filter(Boolean).join(" / ");
      }

      // Create structured ID based on name or CNPJ to keep it idempotent
      const id = validCnpj 
        ? `supp_${validCnpj.replace(/[^\d]/g, "")}` 
        : `supp_${name.toLowerCase().replace(/[^a-z0-9]/g, "_").slice(0, 20)}`;

      const supplierNode = {
        id,
        name,
        fantasyName,
        cnpj: validCnpj,
        address,
        city,
        uf,
        representative,
        contacts
      };

      suppliers.push(supplierNode);

      // Ensure Node inside Knowledge Graph
      await this.kgEngine.ensureNode(
        organizationId,
        projectId,
        "SUPPLIER",
        name,
        `Fornecedor extraído do documento ${document.filename}.`,
        id,
        {
          name,
          fantasyName,
          cnpj: validCnpj,
          address,
          city,
          uf,
          representative,
          contacts,
          sourceDoc: document.id
        }
      );

      // Create standard relations
      await this.kgEngine.createRelationship(organizationId, id, document.id, "GENERATED_FROM");
    }

    return suppliers;
  }
}

