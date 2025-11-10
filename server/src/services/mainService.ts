import { findAllDomains } from "../repository/mongodb/domainRepository";
import { IDomain } from "../models/Domain";

export async function getDomains() {
  const domains = await findAllDomains();

  return domains.map((domain: IDomain) => ({
    id: domain.id,
    name: domain.name,
    url_list: domain.url_list,
    keywords: domain.keywords,
  }));
}