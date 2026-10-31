import Link from "next/link";
import { Brand } from "@/components/brand";
import { LoginForm } from "@/components/login-form";

export const metadata = { title: "Log in" };
export default function LoginPage() { return <main className="min-h-screen bg-paper"><header className="shell flex min-h-20 items-center border-b border-[#dedbd3]"><Brand /></header><div className="shell grid min-h-[calc(100vh-5rem)] place-items-center py-12"><div className="w-full max-w-md"><p className="font-mono text-xs font-bold uppercase tracking-[0.14em] text-brand">Store owner access</p><h1 className="mt-3 text-4xl font-black tracking-[-0.06em]">One link. No password to remember.</h1><p className="mt-4 text-sm leading-6 text-neutral-600">We’ll send a secure sign-in link to your email address.</p><div className="mt-8"><LoginForm /></div><p className="mt-6 text-center text-sm text-neutral-600">Exploring the build? <Link href="/admin" className="font-bold text-brand underline">Open the local demo workspace</Link>.</p></div></div></main>; }
