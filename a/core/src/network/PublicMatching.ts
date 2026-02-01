export interface PublicMatchRequest {
  ontology: string;
  properties: Record<string, any>;
  timestamp: number;
}

export class PublicMatching {
  /**
   * Generates a standard public match request.
   * This exposes the ontology and properties for direct matching.
   */
  static generateMatchRequest(ontology: string, properties: Record<string, any>): PublicMatchRequest {
    return {
      ontology,
      properties,
      timestamp: Date.now()
    };
  }

  /**
   * Checks for a match using standard property comparison.
   */
  static checkMatch(reqA: PublicMatchRequest, reqB: PublicMatchRequest): boolean {
    if (reqA.ontology !== reqB.ontology) return false;

    // Basic property intersection check
    const keysA = Object.keys(reqA.properties);
    for (const key of keysA) {
        if (reqB.properties[key] && reqB.properties[key] === reqA.properties[key]) {
            return true;
        }
    }
    return false;
  }
}
