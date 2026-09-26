import {
  Instagram,
  Facebook,
  Music2,
  Mail,
  Globe,
  type LucideIcon,
} from "lucide-react";

export const channelIcons: Record<string, LucideIcon> = {
  Instagram: Instagram,
  Facebook: Facebook,
  TikTok: Music2,
  Email: Mail,
  Website: Globe,
};

export const channelColors: Record<string, string> = {
  Instagram: "#3a8585",
  Facebook: "#5c554d",
  TikTok: "#3d3833",
  Email: "#2c6e6e",
  Website: "#245858",
};

export const intentTagColors: Record<string, string> = {
  AWARENESS: "#2c6e6e",
  ENGAGEMENT: "#3a8585",
  CONVERSION: "#245858",
  TRUST: "#1d4848",
  RETENTION: "#143838",
};

export const intentTagBg: Record<string, string> = {
  AWARENESS: "#d9ecec",
  ENGAGEMENT: "#f0f7f7",
  CONVERSION: "#b5d8d8",
  TRUST: "#d9ecec",
  RETENTION: "#f0f7f7",
};
