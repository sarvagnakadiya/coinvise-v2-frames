export interface TokenData {
  user_addr: string;
  name: string;
  symbol: string;
  description: string;
  imageUrl: string;
  tokenSupply: string;
  decimals: number;
  lpLockerAddress: string;
}

export interface TabProps {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}
