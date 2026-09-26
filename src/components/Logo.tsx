interface Props {
  size?: "compact" | "large";
}

export function Logo({ size = "compact" }: Props) {
  return (
    <img
      src="/PlanShift_Logo.png"
      alt="PlanShift"
      className={size === "large" ? "h-16 w-auto object-contain" : "h-12 w-auto object-contain"}
      style={{
        display: "block",
        height: size === "large" ? 80 : 64,
        width: "auto",
        objectFit: "contain",
      }}
    />
  );
}
