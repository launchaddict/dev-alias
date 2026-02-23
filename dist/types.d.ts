export interface PortScanRange {
    start: number;
    end: number;
}
export interface AliasCommandConfig {
    /**
     * Optional domain override for this script. Defaults to the root config domain.
     */
    domain?: string;
    /**
     * Preferred port if the dev server always uses the same value.
     */
    targetPort?: number;
    /**
     * Whether this script should force HTTPS proxying.
     */
    https?: boolean;
    /**
     * Custom log patterns that can reveal the listening port.
     */
    logPatterns?: string[];
    /**
     * Custom scan range that overrides the root setting.
     */
    portScan?: PortScanRange;
    /**
     * Command string to execute if the runner was not invoked with `-- <command>`.
     */
    command?: string;
    /**
     * Additional environment variables passed to the spawned process.
     */
    env?: Record<string, string>;
}
export interface AliasConfig {
    domain: string;
    https?: boolean;
    proxyPort?: number;
    httpsPort?: number;
    persistHosts?: boolean;
    portScan?: PortScanRange;
    logPatterns?: string[];
    commands?: Record<string, AliasCommandConfig>;
}
export interface LoadedConfig {
    packagePath: string;
    config: AliasConfig;
}
export interface ProxyRoute {
    domain: string;
    target: string;
    https?: boolean;
}
export interface RunnerContext {
    cwd: string;
    domain: string;
    command: string;
    args: string[];
    https: boolean;
    targetHint?: number;
    logPatterns: string[];
    portScan: PortScanRange;
    proxyPort: number;
    httpsPort?: number;
    persistHosts: boolean;
}
