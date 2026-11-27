import { getEventCategories, getInterests } from "./api";
import useApiData from "./useApiData";

const loadInterests = (_, signal) => getInterests(signal);
const loadCategories = (_, signal) => getEventCategories(signal);

export function useInterestCatalog() {
  return useApiData("interests", loadInterests);
}

export function useEventCategoryCatalog() {
  return useApiData("categories", loadCategories);
}
