import dotenv from "dotenv";
dotenv.config();
import OpenAI from 'openai';


// OpenAI 클라이언트 초기화
// API 키는 환경 변수에서 가져옵니다.
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});



/**
 * 주어진 텍스트를 OpenAI를 사용하여 한 줄로 요약하는 함수
 * @param text 요약할 텍스트
 * @returns 한 줄 요약된 텍스트
 */
export async function getSummaryFromText(text: string): Promise<string> {
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are an expert information extractor. Your task is to extract specific details from the given text and format them clearly in Korean.'
        },
        {
          role: 'user',
          content: `다음 텍스트에서 아래 항목들을 추출해서 요약해줘. 각 항목에 대한 정보가 없으면 '정보 없음'이라고 표시해줘. 다른 어떤 말도 덧붙이지 말고, 각 항목과 값만 반환해줘.

- 모집 대상:
- 신청 기간:
- 주요 내용:

텍스트: "${text}"`
        }
      ],
      temperature: 0.5,
      max_tokens: 300,
    });

    const summary = completion.choices[0]?.message?.content;
    if (!summary) {
      throw new Error('OpenAI로부터 유효한 요약 응답을 받지 못했습니다.');
    }
    return summary.trim();
  } catch (error) {
    console.error('[OpenAIService] OpenAI API 호출 중 오류 발생:', error);
    throw new Error('OpenAI API를 통해 요약하는 데 실패했습니다.');
  }
}


