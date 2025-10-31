import mongoose from "mongoose";
import { WebCrawler } from "../crawl/webCrawler";
import { findAllDomains } from "../repository/mongodb/domainRepository";
import { getSettingsByDomainId } from "../repository/mongodb/settingsRepository";
import { getLatestNoticeNumber } from "../repository/mongodb/noticeRepository";

function matchesKeywords(text: string, keywords: string[]): boolean {
  if (!keywords || keywords.length === 0) return true;
  return keywords.some(keyword => text.includes(keyword));
}

async function main() {
  await mongoose.connect("mongodb://localhost:27017/novisit");
  const crawler = new WebCrawler();
  try {
    const domains = await findAllDomains();
    console.log(`총 ${domains.length}개 도메인
`);
    for (const domain of domains) {
      if (!domain.url_list || domain.url_list.length === 0) continue;
      console.log(`[도메인] ${domain.name}  (키워드: ${domain.keywords?.join(", ")})`);
      for (const url of domain.url_list) {
        if (!url.includes("pknu")) continue; // PKNU 도메인만 테스트
        const lastKnown = await getLatestNoticeNumber('PKNU');
        const crawlResult = await crawler.crawlPKNUNotices(lastKnown);

        if (!crawlResult.notices || crawlResult.notices.length === 0) {
          console.log(`- URL[${url}] 새 공지 없음`);
          continue;
        }

        // 도메인 키워드로 1차 필터
        const matchedDomain = crawlResult.notices.filter(n => matchesKeywords(n.title, domain.keywords));
        console.log(`- URL[${url}] ${crawlResult.notices.length}건 → 도메인키워드 매칭: ${matchedDomain.length}건`);

        if (matchedDomain.length === 0) continue;
        // 세팅별로 2차 필터 및 결과 출력
        const settings = await getSettingsByDomainId(domain._id.toString());
        if (settings.length === 0) {
          console.log(`  (이 도메인에 연결된 알림 세팅 없음)`);
          continue;
        }
        for (const setting of settings) {
          const matchedSetting = matchedDomain.filter(n => matchesKeywords(n.title, setting.filter_keywords));
          if (matchedSetting.length > 0) {
            console.log(`  [세팅] ${setting.name} (키워드: ${setting.filter_keywords?.join(", ")})`);
            matchedSetting.forEach(n => {
              console.log(
                `    - 제목: ${n.title} (번호:${n.number}, 링크:${n.link})`
              );
            });
          } else {
            console.log(`  [세팅] ${setting.name}: 매칭 결과 없음`);
          }
        }
      }
    }
  } finally {
    await crawler.close();
    await mongoose.disconnect();
  }
}
main().catch(err => {
  console.error(err);
  process.exit(1);
});
