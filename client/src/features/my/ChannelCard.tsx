import Toggle from "./Toggle";

type Props = {
  brand: "kakao" | "discord";
  name: string;
  status: string;
  toggleable?: boolean;
  defaultOn?: boolean;
  actionText?: string;
};

export default function ChannelCard({
  brand,
  name,
  status,
  toggleable,
  defaultOn,
  actionText,
}: Props) {
  return (
    <div className="channel-row">
      <div className={`channel-icon ${brand}`} aria-hidden />
      <div className="channel-info">
        <div className="channel-name">{name}</div>
        <div className="channel-status">{status}</div>
      </div>

      <div className="channel-right">
        {toggleable ? (
          <Toggle defaultChecked={!!defaultOn} />
        ) : actionText ? (
          <button className="channel-action" type="button">{actionText}</button>
        ) : null}
      </div>
    </div>
  );
}
