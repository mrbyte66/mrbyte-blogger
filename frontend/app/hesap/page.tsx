import type { Metadata } from "next";
export const metadata: Metadata = { robots: { index: false, follow: false } };
import { AccountPage } from "../../components/auth/AccountPage";
export default function Page() { return <AccountPage />; }
