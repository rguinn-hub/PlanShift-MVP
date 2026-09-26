interface Props {
  size?: "compact" | "large";
}

export function Logo({ size = "compact" }: Props) {
  const height = size === "large" ? 110 : 76;
  const topPad = 0.078;
  const bottomPad = 0.456;

  return (
    <img
      src="/PlanShift_Logo.png"
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
