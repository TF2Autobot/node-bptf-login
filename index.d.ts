export default class BptfLogin {
    setCookies(cookies: string[]): void;

    login(callback: (err?: Error) => void): void;

    getAccessToken(callback: (err?: Error, accessToken?: string) => void): void;

    getAPIKey(callback: (err?: Error, apiKey?: string) => void): void;

    generateAPIKey(domain: string, description: string, callback: (err?: Error, apiKey?: string) => void): void;

    revokeAPIKey(apiKey: string, callback: (err?: Error) => void): void;

    getSettings(callback: (err?: Error, settings?: { [setting: string]: string }) => void): void;

    updateSettings(settings: { [setting: string]: string }, callback: (err?: Error, settings?: { [setting: string]: string }) => void): void;

    generateAccessToken(callback: (err?: Error, accessToken?: string) => void): void;

    _getUserID(): string | null;
}