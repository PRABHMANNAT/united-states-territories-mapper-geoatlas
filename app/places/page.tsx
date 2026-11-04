import Link from "next/link";
import { PageHeading } from "@/components/page-heading";
import { atlasCountries, atlasPlaces } from "@/lib/north-america";

export const metadata = { title: "North American place directory" };

export default function PlacesPage() {
  const countries = atlasCountries.filter((place) => place.kind === "country");
  const territories = atlasCountries.filter((place) => place.kind === "territory");

  return <div className="shell inner-page">
    <PageHeading label="PLACE DIRECTORY" title="North America">Browse {countries.length} countries, {territories.length} territories and other map units, and {atlasPlaces.length - atlasCountries.length} mapped subdivisions.</PageHeading>
    {[{ title: "Countries", items: countries }, { title: "Territories and other map units", items: territories }].map((group) =>
      <section key={group.title} className="panel tool-panel continent-directory">
        <h2>{group.title}</h2>
        <ul>{group.items.map((place) => <li key={place.id}><Link href={`/places/${place.id}`}>
          <strong>{place.name}</strong><span>{place.region ?? place.type}</span>
        </Link></li>)}</ul>
      </section>
    )}
  </div>;
}
