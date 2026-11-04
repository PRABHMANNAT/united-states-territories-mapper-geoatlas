import Link from "next/link";
import { PageHeading } from "@/components/page-heading";

export default function NotFound() {
  return <div className="shell inner-page"><PageHeading label="404 / OFF THE MAP" title="Page not found">This atlas page may have moved. Start with the interactive map.</PageHeading><Link href="/map" className="primary-button">Open the atlas</Link></div>;
}
