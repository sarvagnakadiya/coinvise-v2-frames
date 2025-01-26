"use client";
import { useState, useCallback, useEffect } from "react";
import { signIn, signOut, useSession, getCsrfToken } from "next-auth/react";
import { Button } from "./ui/Button";
import sdk, { SignIn as SignInCore, type Context } from "@farcaster/frame-sdk";
import { createStore } from "mipd";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function Login() {
  const [signingIn, setSigningIn] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [signInResult, setSignInResult] = useState<SignInCore.SignInResult>();
  const [signInFailure, setSignInFailure] = useState<string>();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [isSDKLoaded, setIsSDKLoaded] = useState(false);
  const [context, setContext] = useState<Context.FrameContext>();

  useEffect(() => {
    const load = async () => {
      const context = await sdk.context;
      setContext(context);
      console.log("Calling ready");
      sdk.actions.ready({});
      const store = createStore();
      store.subscribe((providerDetails) => {
        console.log("PROVIDER DETAILS", providerDetails);
      });
    };
    if (sdk && !isSDKLoaded) {
      console.log("Calling load");
      setIsSDKLoaded(true);
      load();
      return () => {
        sdk.removeAllListeners();
      };
    }
  }, [isSDKLoaded]);

  useEffect(() => {
    if (status === "authenticated") {
      setTimeout(() => {
        router.push("/campaign");
        // router.push("/token/0x04da37c7ae43171f90414b1f051aa956aed6274a");
      }, 2000);
    }
  }, [status, router]);

  const getNonce = useCallback(async () => {
    const nonce = await getCsrfToken();
    if (!nonce) throw new Error("Unable to generate nonce");
    return nonce;
  }, []);

  const handleSignIn = useCallback(async () => {
    try {
      setSigningIn(true);
      setSignInFailure(undefined);
      const nonce = await getNonce();
      const result = await sdk.actions.signIn({ nonce });
      setSignInResult(result);

      await signIn("credentials", {
        message: result.message,
        signature: result.signature,
        redirect: false,
      });
    } catch (e) {
      if (e instanceof SignInCore.RejectedByUser) {
        setSignInFailure("Rejected by user");
        return;
      }
      setSignInFailure("Unknown error");
    } finally {
      setSigningIn(false);
    }
  }, [getNonce]);

  const handleSignOut = useCallback(async () => {
    try {
      setSigningOut(true);
      await signOut({ redirect: false });
      setSignInResult(undefined);
      router.push("/");
    } finally {
      setSigningOut(false);
    }
  }, [router]);

  return (
    <>
      <div className="mb-4 text-sm font-medium">
        Status: {status === "loading" ? "Loading..." : status}
      </div>

      {status !== "authenticated" && (
        <Button onClick={handleSignIn} disabled={signingIn}>
          Sign In with Farcaster
        </Button>
      )}
      {status === "authenticated" && (
        <div className="flex flex-col gap-4">
          <Button onClick={handleSignOut} disabled={signingOut}>
            Sign out
          </Button>
        </div>
      )}
      {session && (
        <div className="my-2 p-2 text-xs overflow-x-scroll bg-gray-100 rounded-lg font-mono">
          <div className="font-semibold text-gray-500 mb-1">Session</div>
          <div className="whitespace-pre">
            {JSON.stringify(session, null, 2)}
          </div>
        </div>
      )}
      {signInFailure && !signingIn && (
        <div className="my-2 p-2 text-xs overflow-x-scroll bg-gray-100 rounded-lg font-mono">
          <div className="font-semibold text-gray-500 mb-1">SIWF Result</div>
          <div className="whitespace-pre">{signInFailure}</div>
        </div>
      )}
      {signInResult && !signingIn && (
        <div className="my-2 p-2 text-xs overflow-x-scroll bg-gray-100 rounded-lg font-mono">
          <div className="font-semibold text-gray-500 mb-1">SIWF Result</div>
          <div className="whitespace-pre">
            {JSON.stringify(signInResult, null, 2)}
          </div>
        </div>
      )}
      {context && (
        <div className="user-info space-y-4">
          <h2>Welcome, {context?.user.displayName}!</h2>
          <Image
            src={context?.user.pfpUrl ?? ""}
            alt="Profile"
            className="profile-pic"
            width={100}
            height={100}
          />
        </div>
      )}
    </>
  );
}
