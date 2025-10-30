import mongoose from "mongoose";
import Domain from "../models/Domain";
import Setting from "../models/Setting";
import { User } from "../models/User";

async function migrateDummyData() {
  await mongoose.connect("mongodb://localhost:27017/novisit");
  // 1. Domain 더미 데이터
  const domains = await Domain.insertMany([
    {
      _id: "652f001b2ee0ad2547eaaa12",
      name: "비교과",
      url_list: ["https://www.pknu.ac.kr/main/163"],
      keywords: ["비교과", "프로그램"],
      setting_ids: [],
    },
    {
      _id: "652f002d2ee0ad2547eaaa13",
      name: "장학",
      url_list: ["https://www.pknu.ac.kr/main/163"],
      keywords: ["장학", "장학생"],
      setting_ids: [],
    },
    {
      _id: "652f00392ee0ad2547eaaa14",
      name: "채용",
      url_list: ["https://www.pknu.ac.kr/main/163"],
      keywords: ["채용", "모집"],
      setting_ids: [],
    },
    {
      _id: "652f00462ee0ad2547eaaa15",
      name: "교환학생",
      url_list: ["https://www.pknu.ac.kr/main/163"],
      keywords: ["교환학생", "국제"],
      setting_ids: [],
    },
    {
      _id: "652f00522ee0ad2547eaaa16",
      name: "취업",
      url_list: ["https://www.pknu.ac.kr/main/163"],
      keywords: ["취업", "진로"],
      setting_ids: [],
    },
  ]);

  // 2. User 더미 데이터
  const users = await User.insertMany([
    {
      _id: "user1id12345678900001",
      email: "hong1@pknu.ac.kr",
      name: "홍길동",
      providers: [
        {
          provider: "kakao",
          providerId: "kakao_userid_1",
          email: "hong1@pknu.ac.kr",
          name: "홍길동",
          talk_message_enabled: true,
        },
      ],
    },
    {
      _id: "user2id98765432100002",
      email: "kim2@pknu.ac.kr",
      name: "김철수",
      providers: [
        {
          provider: "kakao",
          providerId: "kakao_userid_2",
          email: "kim2@pknu.ac.kr",
          name: "김철수",
          talk_message_enabled: true,
        },
      ],
    },
  ]);

  // 3. Setting 더미 데이터
  await Setting.insertMany([
    {
      user_id: users[0]._id,
      domain_id: domains[1]._id,
      name: "장학금 알림",
      url_list: ["https://www.pknu.ac.kr/main/163"],
      filter_keywords: ["장학", "신입생"],
      messages: [],
    },
    {
      user_id: users[0]._id,
      domain_id: domains[2]._id,
      name: "채용정보 알림",
      url_list: ["https://www.pknu.ac.kr/main/163"],
      filter_keywords: ["채용", "모집"],
      messages: [],
    },
    {
      user_id: users[1]._id,
      domain_id: domains[4]._id,
      name: "취업 안내",
      url_list: ["https://www.pknu.ac.kr/main/163"],
      filter_keywords: ["취업", "진로"],
      messages: [],
    },
  ]);

  console.log("✅ 더미 데이터 이식/마이그레이션 완료!");
  await mongoose.disconnect();
}
migrateDummyData().catch(console.error);
