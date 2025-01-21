"use client";
import Link from "next/link";
import { useEffect } from "react";
import { useAccount } from "wagmi";
import { useRouter } from "next/navigation";

export function Header() {
  const { address, isDisconnected } = useAccount();
  const router = useRouter();
  useEffect(() => {
    // check if user is disconnected then remove the user from local storage
    if (!address && isDisconnected) {
      console.log("User disconnected");
      localStorage.removeItem("user");
      // redirect to home page
      router.push("/");
    }
  }, [address, router, isDisconnected]);

  return (
    <header className="border-b border-gray-200 bg-gray-900/50 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link
            href="/"
            className="text-xl font-bold text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            Coinvise
          </Link>

          <div className="flex items-center space-x-4"></div>
        </div>
      </div>
    </header>
  );
}
