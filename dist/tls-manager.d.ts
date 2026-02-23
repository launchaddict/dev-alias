export interface CertificateBundle {
    key: Buffer;
    cert: Buffer;
    keyPath: string;
    certPath: string;
}
export declare function ensureCertificate(domain: string): Promise<CertificateBundle>;
