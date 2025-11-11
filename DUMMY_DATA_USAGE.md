# MongoDB 더미데이터 삽입 가이드

이 파일은 MongoDB에 직접 더미데이터를 삽입하기 위한 가이드입니다.

## 파일 위치
- `dummy-data-for-mongodb.json`

## 사용 방법

### 방법 1: MongoDB Shell에서 직접 복사-붙여넣기

```bash
# 1. MongoDB Shell 접속
mongosh

# 2. 데이터베이스 선택
use novisit

# 3. 도메인 데이터 삽입
db.domains.insertMany([
  { "_id": ObjectId("652f001b2ee0ad2547eaaa12"), "name": "비교과", "url_list": ["https://www.pknu.ac.kr/main/163"], "keywords": ["비교과", "프로그램"], "setting_ids": [] },
  { "_id": ObjectId("652f002d2ee0ad2547eaaa13"), "name": "장학", "url_list": ["https://www.pknu.ac.kr/main/163"], "keywords": ["장학", "장학생"], "setting_ids": [] },
  { "_id": ObjectId("652f00392ee0ad2547eaaa14"), "name": "채용", "url_list": ["https://www.pknu.ac.kr/main/163"], "keywords": ["채용", "모집"], "setting_ids": [] },
  { "_id": ObjectId("652f00462ee0ad2547eaaa15"), "name": "교환학생", "url_list": ["https://www.pknu.ac.kr/main/163"], "keywords": ["교환학생", "국제"], "setting_ids": [] },
  { "_id": ObjectId("652f00522ee0ad2547eaaa16"), "name": "취업", "url_list": ["https://www.pknu.ac.kr/main/163"], "keywords": ["취업", "진로"], "setting_ids": [] }
])

# 4. 유저 데이터 삽입
db.users.insertMany([
  { "_id": ObjectId("user1id12345678900001"), "email": "hong1@pknu.ac.kr", "name": "홍길동", "providers": [{ "provider": "kakao", "providerId": "kakao_userid_1", "email": "hong1@pknu.ac.kr", "name": "홍길동", "talk_message_enabled": true }], "createdAt": ISODate("2024-10-01T00:00:01.000Z"), "updatedAt": ISODate("2024-10-01T00:00:01.000Z") },
  { "_id": ObjectId("user2id98765432100002"), "email": "kim2@pknu.ac.kr", "name": "김철수", "providers": [{ "provider": "kakao", "providerId": "kakao_userid_2", "email": "kim2@pknu.ac.kr", "name": "김철수", "talk_message_enabled": true }], "createdAt": ISODate("2024-10-12T11:11:11.000Z"), "updatedAt": ISODate("2024-10-12T11:11:11.000Z") }
])

# 5. 세팅 데이터 삽입
db.settings.insertMany([
  { "_id": ObjectId("set1user1janghak"), "user_id": "user1id12345678900001", "domain_id": "652f002d2ee0ad2547eaaa13", "name": "장학금 알림", "url_list": ["https://www.pknu.ac.kr/main/163"], "filter_keywords": ["장학", "신입생"], "channel": ["kakao"], "messages": [], "created_at": ISODate("2024-10-15T10:00:00.000Z") },
  { "_id": ObjectId("set2user1chaeyong"), "user_id": "user1id12345678900001", "domain_id": "652f00392ee0ad2547eaaa14", "name": "채용정보 알림", "url_list": ["https://www.pknu.ac.kr/main/163"], "filter_keywords": ["채용", "모집"], "channel": ["kakao"], "messages": [], "created_at": ISODate("2024-10-15T10:05:00.000Z") },
  { "_id": ObjectId("set3user2chweup"), "user_id": "user2id98765432100002", "domain_id": "652f00522ee0ad2547eaaa16", "name": "취업 안내", "url_list": ["https://www.pknu.ac.kr/main/163"], "filter_keywords": ["취업", "진로"], "channel": ["kakao"], "messages": [], "created_at": ISODate("2024-10-15T11:00:00.000Z") }
])
```

### 방법 2: Docker 환경에서 실행

```bash
# MongoDB 컨테이너에 접속
docker exec -it novisit-mongodb-dev mongosh novisit

# 위 명령어들을 복사-붙여넣기
```

### 방법 3: mongoimport 사용 (JSON 파일이 일반 JSON 형식인 경우)

```bash
# JSON 파일을 일반 JSON 형식으로 변환 후
mongoimport --db novisit --collection domains --file domains.json --jsonArray
mongoimport --db novisit --collection users --file users.json --jsonArray
mongoimport --db novisit --collection settings --file settings.json --jsonArray
```

## 데이터 검증

삽입 후 아래 명령어로 확인:

```bash
# MongoDB Shell에서
db.domains.find().pretty()
db.users.find().pretty()
db.settings.find().pretty()

# 개수 확인
db.domains.countDocuments()
db.users.countDocuments()
db.settings.countDocuments()
```

## 데이터 정리 (필요시)

```bash
# 모든 컬렉션 데이터 삭제
db.domains.deleteMany({})
db.users.deleteMany({})
db.settings.deleteMany({})
```

## 포함된 더미데이터

- **Domain**: 5개 (비교과, 장학, 채용, 교환학생, 취업)
- **User**: 2개 (홍길동, 김철수)
- **Setting**: 3개 (홍길동: 장학금 알림, 채용정보 알림 / 김철수: 취업 안내)

