import type { Metadata } from "next";
export const metadata: Metadata = { robots: { index: false, follow: false } };
import { AuthPage } from "../../components/auth/AuthPage";
export default function Page() { return <AuthPage initial="login" />; }
