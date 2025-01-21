import { AuthOptions, getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

declare module "next-auth" {
  interface Session {
    user: {
      fid: number;
      jwt: string;
      email: string;
      walletAddress: string;
    };
  }

  interface User {
    id: string;
    jwt: string;
    email: string;
    walletAddress: string;
  }
}

export const authOptions: AuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    CredentialsProvider({
      name: "Sign in with Farcaster",
      credentials: {
        message: { label: "Message", type: "text", placeholder: "0x0" },
        signature: { label: "Signature", type: "text", placeholder: "0x0" },
        name: { label: "Name", type: "text", placeholder: "0x0" },
        pfp: { label: "Pfp", type: "text", placeholder: "0x0" },
      },
      async authorize(credentials) {
        if (!credentials) {
          return null;
        }

        // For development: Always authenticate with mock data
        return {
          id: "123", // Mock fid
          jwt: credentials.signature || "mock_signature",
          email: credentials.name || "mock@example.com",
          walletAddress: credentials.message || "0x123",
        };
      },
    }),
  ],
  callbacks: {
    async session({ session, token }) {
      if (token) {
        session.user = {
          fid: parseInt(token.sub ?? "123", 10),
          jwt: token.jwt as string,
          email: token.email as string,
          walletAddress: token.walletAddress as string,
        };
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.jwt = user.jwt;
        token.email = user.email;
        token.walletAddress = user.walletAddress;
      }
      return token;
    },
  },
  pages: {
    signIn: "/",
    error: "/",
  },
  debug: true,
};

export const getSession = () => getServerSession(authOptions);
