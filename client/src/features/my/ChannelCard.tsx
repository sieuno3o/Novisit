// import { useEffect, useState } from "react";
// import Toggle from "./Toggle";
// import { getDiscordAuthUrl } from "../../api/my";

// type Props = {
//   brand: "kakao" | "discord";
//   name: string;
//   defaultOn?: boolean;
//   toggleable?: boolean;
//   onText?: string;
//   offText?: string;
//   onToggle?: (next: boolean) => void | Promise<void>; // 디스코드 OFF때 사용
//   actionText?: string; // "연동하기"
// };

// export default function ChannelCard({
//   brand,
//   name,
//   defaultOn,
//   toggleable,
//   onText = "연동됨",
//   offText = "연동되지 않음",
//   onToggle,
//   actionText,
// }: Props) {
//   const [on, setOn] = useState(!!defaultOn);
//   const [busy, setBusy] = useState(false);
//   const [asSwitch, setAsSwitch] = useState<boolean>(
//     brand === "discord" || !!toggleable || !!defaultOn );

//   useEffect(() => {
//     setOn(!!defaultOn);
//     setAsSwitch(brand === "discord" || !!toggleable || !!defaultOn);
//   }, [brand, defaultOn, toggleable]);

//   async function startDiscordLink() {
//     try {
//       setBusy(true);
//       const url = await getDiscordAuthUrl();          // 200 → URL 제공
//       window.location.assign(url);                    // 현재 탭 이동
//     } catch (e: any) {
//       if (e?.response?.status === 401) {
//         window.location.assign("/login?next=/my");
//         return;
//       }
//       alert("디스코드 연동을 시작할 수 없어요. 잠시 후 다시 시도해 주세요.");
//       console.error(e);
//     } finally {
//       setBusy(false);
//     }
//   }

//   async function handleSwitchClick() {
//     if (busy) return;

//     if (brand === "discord") {
//       if (!on) {
//         // OFF → ON : 연동 시작(리다이렉트)
//         setAsSwitch(true);
//         await startDiscordLink();
//         return;
//       }
//       // ON → OFF : 해제 API
//       try {
//         setBusy(true);
//         await onToggle?.(false);
//         setOn(false);
//       } catch (e: any) {
//         const msg =
//           e?.response?.data?.message ||
//           e?.response?.data?.error ||
//           "디스코드 해제에 실패했어요.";
//         alert(msg);
//         console.error(e);
//       } finally {
//         setBusy(false);
//       }
//       return;
//     }

//     // kakao: 일반 토글
//     try {
//       setBusy(true);
//       const next = !on;
//       setOn(next);
//       await onToggle?.(next);
//     } catch (e) {
//       setOn((prev) => !prev); // 롤백
//       console.error(e);
//       alert("설정을 변경할 수 없어요. 잠시 후 다시 시도해 주세요.");
//     } finally {
//       setBusy(false);
//     }
//   }

//   async function handleConnectClick() {
//     if (busy) return;
//     setAsSwitch(true);
//     if (brand === "discord") {
//       await startDiscordLink();
//       return;
//     }
//   }

//   return (
//     <div className="channel-row">
//       <div className={`channel-icon ${brand}`} aria-hidden />
//       <div className="channel-info">
//         <div className="channel-name">{name}</div>
//         <div className="channel-status">{on ? onText : offText}</div>
//       </div>

//       <div className="channel-right">
//         {asSwitch ? (
//           <div
//             role="switch"
//             aria-checked={on}
//             aria-disabled={busy}
//             aria-label={`${name} ${on ? "해제" : "연동"}`}
//             className={`toggle-wrap ${on ? "on" : "off"} ${busy ? "busy" : ""}`}
//             onClick={handleSwitchClick}
//           >
//             <Toggle key={on ? "1" : "0"} defaultChecked={on} />
//           </div>
//         ) : actionText ? (
//           <button
//             className="channel-action"
//             type="button"
//             disabled={busy}
//             onClick={handleConnectClick}
//           >
//             {actionText}
//           </button>
//         ) : null}
//       </div>
//     </div>
//   );
// }

//버전2 : 디스코드 연동하기 버튼 이후 '연동됨 / 알림 ON' 고정
import { useEffect, useState } from "react";
import Toggle from "./Toggle";
import { getDiscordAuthUrl } from "../../api/my";

type Props = {
  brand: "kakao" | "discord" |"push";
  name: string;
  defaultOn?: boolean; // 서버가 true면 이미 연동됨
  toggleable?: boolean; // kakao용
  onText?: string; // "연동됨"
  offText?: string; // "연동되지 않음"
  onToggle?: (next: boolean) => void | Promise<void>; // kakao만 사용
  actionText?: string; // "연동하기"
};

export default function ChannelCard({
  brand,
  name,
  defaultOn,
  toggleable,
  onText = "연동됨",
  offText = "연동되지 않음",
  onToggle,
  actionText = "연동하기",
}: Props) {
  const [on, setOn] = useState(!!defaultOn);
  const [busy, setBusy] = useState(false);
  const [justLinked, setJustLinked] = useState(false); // 디스코드 버튼 1회만

  useEffect(() => {
    setOn(!!defaultOn);
  }, [defaultOn]);

  //Discord: 1회 연동 버튼 → 이후 영구 '연동됨 / 알림 ON'
  async function startDiscordLink() {
    try {
      setBusy(true);
      setJustLinked(true);
      setOn(true); // UI 즉시 고정
      const url = await getDiscordAuthUrl();
      window.open(url, "_blank"); // OAuth 새 탭으로 이동
    } catch (e: any) {
      setJustLinked(false);
      setOn(!!defaultOn);
      if (e?.response?.status === 401) {
        window.location.assign("/login?next=/my");
        return;
      }
      alert("디스코드 연동을 시작할 수 없어요. 잠시 후 다시 시도해 주세요.");
      console.error(e);
    } finally {
      setBusy(false);
    }
  }

  //Kakao: 일반 토글
  async function handleKakaoToggle() {
    if (busy) return;
    try {
      setBusy(true);
      const next = !on;
      setOn(next);
      await onToggle?.(next);
    } catch (e) {
      setOn((prev) => !prev);
      console.error(e);
      alert("설정을 변경할 수 없어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  }

  const isDiscord = brand === "discord";
  const showDiscordButton = isDiscord && !on && !justLinked; // 미연동일 때만
 const isKakaoOrPush = brand === "kakao" || brand === "push";

  return (
    <div className="channel-row">
      <div className={`channel-icon ${brand}`} aria-hidden />
      <div className="channel-info">
        <div className="channel-name">{name}</div>
        <div className="channel-status">{on ? onText : offText}</div>
      </div>

      <div className="channel-right">
        {isDiscord ? (
          showDiscordButton ? (
            <button
              className="channel-action"
              type="button"
              disabled={busy}
              onClick={startDiscordLink}
            >
              {actionText}
            </button>
          ) : (
            // 연동 이후엔 토글 대신 연한색 박스
            <span className="notify-pill" aria-label="디스코드 알림 상태">
              <span className="label">알림</span>
              <span className="state">ON</span>
            </span>
          )
        ) : (
          //Kakao: '알림' 텍스트 + 토글
          <div className="notify-toggle-wrap">
            <span className="notify-label" aria-hidden>
              알림
            </span>
            <div
              role="switch"
              aria-checked={on}
              aria-disabled={busy}
              aria-label={`${name} ${on ? "알림 끄기" : "알림 켜기"}`}
              className={`toggle-wrap ${on ? "on" : "off"} ${
                busy ? "busy" : ""
              }`}
              onClick={handleKakaoToggle}
            >
              <Toggle key={on ? "1" : "0"} defaultChecked={on} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
