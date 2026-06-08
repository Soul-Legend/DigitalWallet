declare module 'snarkjs' {
  export const groth16: {
    fullProve: (
      inputs: any,
      wasmFile: Uint8Array | string,
      zkeyFile: Uint8Array | string
    ) => Promise<{ proof: any; publicSignals: string[] }>;
    verify: (
      vKey: any,
      publicSignals: string[],
      proof: any
    ) => Promise<boolean>;
  };
  export const zKey: {
    exportVerificationKey: (zkeyData: Uint8Array) => Promise<any>;
  };
}
