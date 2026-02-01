/**
 * Interface for the secure credential storage system.
 * This abstracts away the implementation details (Keytar, Keychain, Encrypted File).
 */
export interface CredentialManager {
  /**
   * Securely store a credential.
   * @param service The service name (e.g., 'indeed.com', 'github')
   * @param account The account identifier (e.g., 'user@example.com')
   * @param secret The password or API key
   */
  storeCredential(service: string, account: string, secret: string): Promise<void>;

  /**
   * Retrieve a stored credential.
   * @param service The service name
   * @param account The account identifier
   */
  getCredential(service: string, account: string): Promise<string | null>;

  /**
   * Delete a stored credential.
   * @param service The service name
   * @param account The account identifier
   */
  deleteCredential(service: string, account: string): Promise<boolean>;

  /**
   * List all stored credentials for a service.
   * @param service The service name
   */
  listCredentials(service: string): Promise<string[]>;
}

/**
 * A mock implementation for environments where native keychain is unavailable
 * (e.g., pure browser without bridge, or during dev/test).
 * WARNING: This is NOT secure and stores in memory only.
 */
export class InMemoryCredentialManager implements CredentialManager {
  private storage: Map<string, string> = new Map();

  async storeCredential(service: string, account: string, secret: string): Promise<void> {
    const key = `${service}:${account}`;
    this.storage.set(key, secret);
  }

  async getCredential(service: string, account: string): Promise<string | null> {
    const key = `${service}:${account}`;
    return this.storage.get(key) || null;
  }

  async deleteCredential(service: string, account: string): Promise<boolean> {
    const key = `${service}:${account}`;
    return this.storage.delete(key);
  }

  async listCredentials(service: string): Promise<string[]> {
    const accounts: string[] = [];
    for (const key of this.storage.keys()) {
      if (key.startsWith(`${service}:`)) {
        accounts.push(key.split(':')[1]);
      }
    }
    return accounts;
  }
}
