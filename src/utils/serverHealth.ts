/**
 * Utility to check if a server is up by calling its /health endpoint.
 */
export async function isServerUp(serverUrl: string): Promise<boolean> {
    try {
        const response = await fetch(`${serverUrl}/health`);
        return response.ok;
    } catch {
        return false;
    }
}
