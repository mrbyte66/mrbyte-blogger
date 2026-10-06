import type { Metadata } from "next";
import { SavedLibraryPage } from "../../components/saved/SavedLibraryPage";
export const metadata: Metadata = { title: "Kitaplığım", robots: { index: false, follow: false } };
export default function Page() { return <SavedLibraryPage />; }
