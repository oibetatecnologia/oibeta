export function resolveCandidateIdentity(records: any[], targetName: string): any[] {
  if (!targetName) return [];
  const normalizedTarget = targetName.toUpperCase().trim();
  
  // Try exact match first
  const exactMatches = records.filter(r => (r.candidato || "").toUpperCase().trim() === normalizedTarget);
  if (exactMatches.length > 0) {
    return exactMatches;
  }

  // If no exact match, try matching by name exactly but ignore surrounding whitespaces or specific cases? 
  // We avoid partial includes as it can mix "JOAO" with "JOAO BAPTISTA"
  // For partial match fallback, only if we can safely identify it's unique
  const partialMatches = records.filter(r => {
    const cName = (r.candidato || "").toUpperCase().trim();
    // Use word boundary to avoid substrings, but simpler - just strict match
    return cName === normalizedTarget;
  });

  return partialMatches;
}
