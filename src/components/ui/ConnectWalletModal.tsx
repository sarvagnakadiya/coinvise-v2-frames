import { Button } from "@/components/ui/Button";
import { useConnect } from "wagmi";
import { ethers } from "ethers";
import { useState } from "react";

interface ConnectWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ConnectWalletModal = ({
  isOpen,
  onClose,
}: ConnectWalletModalProps) => {
  const { connect, connectors } = useConnect();
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleConnect = async () => {
    try {
      // First try wagmi connect
      const connector = connectors[0];
      if (connector) {
        await connect({ connector });
      }

      // Also handle direct ethereum connection
      if (typeof (window as any).ethereum !== "undefined") {
        await (window as any).ethereum.request({
          method: "eth_requestAccounts",
        });
        const provider = new ethers.BrowserProvider(window.ethereum);
        await provider.getSigner(); // Ensure we can get the signer
      }

      onClose();
    } catch (error) {
      console.error("Failed to connect wallet:", error);
      setError("Failed to connect wallet. Please try again.");
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 transition-opacity duration-300 ease-in-out">
      <div className="bg-white p-8 rounded-lg shadow-lg transform transition-transform duration-300 ease-in-out scale-95 hover:scale-100">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Connect Your Wallet
        </h2>
        <p className="text-gray-700 mb-6">
          Please connect your wallet to proceed with the claim.
        </p>
        {error && <p className="text-red-500 mb-4 text-sm">{error}</p>}
        <Button
          onClick={handleConnect}
          className="bg-purple-600 hover:bg-purple-700 text-white py-3 px-6 rounded-lg font-medium transition-colors duration-200"
        >
          Connect Wallet
        </Button>
      </div>
    </div>
  );
};
