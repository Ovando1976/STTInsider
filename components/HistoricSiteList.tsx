import { useState } from "react";

const defaultSites = [
  { id: 1, name: "Fort Christian", location: "Charlotte Amalie, St. Thomas" },
  { id: 2, name: "Estate Whim Plantation", location: "St. Croix" },
  { id: 3, name: "Cruz Bay Historic District", location: "St. John" },
];

export default function HistoricSiteList({ sites = defaultSites }) {
  const [query, setQuery] = useState("");
  const filteredSites = sites.filter(
    (site) =>
      site.name.toLowerCase().includes(query.toLowerCase()) ||
      site.location.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="App">
      <section className="page-card">
        <h2 className="section-title">Historic Sites</h2>
        <label htmlFor="site-search">Find a site</label>
        <input
          id="site-search"
          className="search-input"
          type="text"
          placeholder="Search by name or island"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <ul className="site-list">
          {filteredSites.map((site) => (
            <li className="site-item" key={site.id}>
              <strong>{site.name}</strong>
              <div>{site.location}</div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
