import { avatarGradient } from "@/lib/store/session";
import { cn } from "@/lib/utils";

/** Role avatar — initials on the role's gradient. */
export function RoleAvatar({
  initials,
  gradient,
  className,
  size = 40,
}: {
  initials: string;
  gradient: [string, string];
  className?: string;
  size?: number;
}) {
  return (
    <div
      className={cn(
        "flex flex-none items-center justify-center rounded-[11px] font-extrabold text-white",
        className,
      )}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.325,
        background: avatarGradient(gradient),
      }}
      aria-hidden
    >
      {initials}
    </div>
  );
}
