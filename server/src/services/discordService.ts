import * as userRepository from "../repository/mongodb/userRepository";
import { Client, GatewayIntentBits, Partials, User, EmbedBuilder } from "discord.js";

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.DirectMessages],
  partials: [Partials.Channel],
});

// 봇 로그인
let isBotInitialized = false;

export async function initDiscordBot() {
  if (isBotInitialized) return;

  try {
    await client.login(process.env.DISCORD_TOKEN);
    console.log(`🤖 Discord Bot logged in as ${client.user?.tag}`);

    isBotInitialized = true;
  } catch (error) {
    console.error("❌ Discord Bot 로그인 실패:", error);
  }
}

// 사용자에게 디스코드 DM 발송 (크롤링/큐 워커에서 호출 가능)
export async function sendDiscordMessage(userId: string, title: string,  description: string,  linkUrl: string,  imageUrl?: string): Promise<void> {

  if (!client.isReady()) {
    await new Promise<void>(resolve => {
      client.once("ready", () => resolve());
    });
  }

  // 0. 사용자 정보 조회 및 알림 설정 확인
  const user = await userRepository.findUserById(userId);
  if (!user) {
    throw new Error(`사용자를 찾을 수 없습니다. ${userId}`);
  }

  const discordProvider = user.providers.find((p: any) => p.provider === "discord");
  if (!discordProvider) {
    throw new Error(`사용자에게 디스코드 연동 정보가 없습니다. ${userId}`);
  }

  if (discordProvider.talk_message_enabled === false) {
    console.log(`사용자(${userId})가 디스코드 알림 수신을 거부하여 메시지를 전송하지 않습니다.`);
    return; // 메시지 전송 중단
  }

  // 1. 사용자 디스코드 ID 확인
  const discordUserId = discordProvider.providerId;
  if (!discordUserId) {
    throw new Error(`디스코드 사용자 ID가 없습니다. ${userId}`);
  }

  // 2. 메시지 전송 시도
  try {
    const userObj: User = await client.users.fetch(discordUserId);
    
    const embed = new EmbedBuilder()
      .setColor("#5865F2")
      .setTitle(title)
      .setDescription(description)
      .setURL(linkUrl)
      .setTimestamp()
      .setFooter({ text: "Novisit 디스코드 알림 서비스" });

    if (imageUrl) {
      embed.setImage(imageUrl);
    }

    await userObj.send({ embeds: [embed] });

    console.log(`✅ 디스코드 DM 전송 성공: ${userId} (${discordUserId})`);
  } catch (error: any) {
    // 3. 디스코드에서 발생할 수 있는 에러 처리
    if (error.code === 50007) {
      // “Cannot send messages to this user” — 사용자가 봇 DM 차단
      console.warn(`⚠️ 사용자(${userId})가 봇의 DM을 차단했습니다.`);
      return;
    }

    console.error(`❌ 디스코드 메시지 전송 실패 (user: ${userId})`, error.message);
    throw error;
  }
}
