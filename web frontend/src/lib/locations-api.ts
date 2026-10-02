import { fetchAPI } from './api';

export interface LocationsTree {
  countries: Array<{
    id: string;
    code: string;
    nameAr: string;
    nameEn?: string;
    isActive: boolean;
    governorates: Array<{
      id: string;
      code: string;
      nameAr: string;
      nameEn?: string;
      cities: Array<{
        id: string;
        code: string;
        nameAr: string;
        nameEn?: string;
      }>;
    }>;
  }>;
}

export async function getLocationsTree(): Promise<LocationsTree> {
  try {
    const countries = await fetchAPI('/locations/countries');
    return { countries: countries || [] };
  } catch (error) {
    console.error('Error loading locations:', error);
    return { countries: [] };
  }
}

export async function getCountries() {
  try {
    const countries = await fetchAPI('/locations/countries');
    return countries || [];
  } catch (error) {
    console.error('Error loading countries:', error);
    return [];
  }
}

export async function getGovernoratesByCountry(countryId: string) {
  try {
    const governorates = await fetchAPI(`/locations/countries/${countryId}/governorates`);
    return governorates || [];
  } catch (error) {
    console.error('Error loading governorates:', error);
    return [];
  }
}

export async function getCitiesByGovernorate(governorateId: string) {
  try {
    const cities = await fetchAPI(`/locations/governorates/${governorateId}/cities`);
    return cities || [];
  } catch (error) {
    console.error('Error loading cities:', error);
    return [];
  }
}