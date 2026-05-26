import type { ExpoConfig } from "expo/config";

const config: ExpoConfig = {
  name: "SmartPay",
  slug: "smartpay",
  scheme: "smartpay",
  version: "0.1.0",
  orientation: "portrait",
  platforms: ["ios", "android", "web"],
  extra: {
    apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:8787"
  }
};

export default config;
