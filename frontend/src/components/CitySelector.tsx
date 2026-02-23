/**
 * City dropdown selector.
 */

import type { CityInfo } from "../types";

interface CitySelectorProps {
  cities: CityInfo[];
  selected: string;
  onChange: (city: string) => void;
}

export default function CitySelector({
  cities,
  selected,
  onChange,
}: CitySelectorProps) {
  return (
    <select
      value={selected}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
    >
      {cities.map((city) => (
        <option key={city.id} value={city.id}>
          {city.display_name}
        </option>
      ))}
    </select>
  );
}
