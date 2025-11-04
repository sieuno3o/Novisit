import { useEffect, useState } from "react";
import Toggle from "./Toggle";
import { getDiscordAuthUrl } from "../../api/my";


type Props = {
  brand: "kakao" | "discord";
  name: string;
  defaultOn?: boolean;
  toggleable?: boolean;
  onText?: string;
  offText?: string;
  onToggle?: (next: boolean) => void | Promise<void>; // 디스코드 OFF때 사용
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
  actionText,
}: Props) {
  const [on, setOn] = useState(!!defaultOn);
  const [busy, setBusy] = useState(false);
  const [asSwitch, setAsSwitch] = useState<boolean>(
    brand === "discord" || !!toggleable || !!defaultOn );

  useEffect(() => {
    setOn(!!defaultOn);
    setAsSwitch(brand === "discord" || !!toggleable || !!defaultOn); 
  }, [brand, defaultOn, toggleable]);

  async function startDiscordLink() {
    try {
      setBusy(true);
      const url = await getDiscordAuthUrl();          // 200 → URL 제공
      window.location.assign(url);                    // 현재 탭 이동
    } catch (e: any) {
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

  async function handleSwitchClick() {
    if (busy) return;

    if (brand === "discord") {
      if (!on) {
        // OFF → ON : 연동 시작(리다이렉트)
        setAsSwitch(true);
        await startDiscordLink();
        return;
      }
      // ON → OFF : 해제 API 
      try {
        setBusy(true);
        await onToggle?.(false);
        setOn(false);
      } catch (e: any) {
        const msg =
          e?.response?.data?.message ||
          e?.response?.data?.error ||
          "디스코드 해제에 실패했어요.";
        alert(msg);
        console.error(e);
      } finally {
        setBusy(false);
      }
      return;
    }

    // kakao: 일반 토글
    try {
      setBusy(true);
      const next = !on;
      setOn(next);
      await onToggle?.(next);
    } catch (e) {
      setOn((prev) => !prev); // 롤백
      console.error(e);
      alert("설정을 변경할 수 없어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  }

  async function handleConnectClick() {
    if (busy) return;
    setAsSwitch(true);
    if (brand === "discord") {
      await startDiscordLink();
      return;
    }
  }

  return (
    <div className="channel-row">
      <div className={`channel-icon ${brand}`} aria-hidden />
      <div className="channel-info">
        <div className="channel-name">{name}</div>
        <div className="channel-status">{on ? onText : offText}</div>
      </div>

      <div className="channel-right">
        {asSwitch ? (
          <div
            role="switch"
            aria-checked={on}
            aria-disabled={busy}
            aria-label={`${name} ${on ? "해제" : "연동"}`}
            className={`toggle-wrap ${on ? "on" : "off"} ${busy ? "busy" : ""}`}
            onClick={handleSwitchClick}
          >
            <Toggle key={on ? "1" : "0"} defaultChecked={on} />
          </div>
        ) : actionText ? (
          <button
            className="channel-action"
            type="button"
            disabled={busy}
            onClick={handleConnectClick}
          >
            {actionText}
          </button>
        ) : null}
      </div>
    </div>
  );
}
