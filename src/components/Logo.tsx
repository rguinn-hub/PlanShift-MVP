interface Props {
  size?: "compact" | "large";
}

export function Logo({ size = "compact" }: Props) {
  const height = size === "large" ? 100 : 68;
  const topPad = 0.024;
  const bottomPad = 0.445;

  return (
    <img
      src="/PlanShift-MVP.png"
      alt="PlanShift"
      style={{
        display: "block",
        height,
        width: "auto",
        objectFit: "contain",
        marginTop: -(height * topPad),
        marginBottom: -(height * bottomPad),
      }}
    />
  );
}
