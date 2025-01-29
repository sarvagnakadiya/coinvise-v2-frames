export interface Condition {
  type: string;
  metadata: {
    farcasterUsername: string;
    tokenName: string;
    validFrom: string;
    validTo: string;
  };
}

export interface Token {
  imageUrl: any;
  address: string;
  name: string | null;
  symbol: string | null;
}

export interface AirdropDetails {
  metadata: any;
  id: string;
  title: string;
  description: string;
  token: Token;
  active: boolean;
  conditions: Condition[];
  txHash: string;
  imageUrl: string;
}
