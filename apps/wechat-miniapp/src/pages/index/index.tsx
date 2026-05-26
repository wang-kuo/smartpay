import { Text, View } from "@tarojs/components";
import type { DemoDecisionFlowVariant } from "@smartpay/contracts";
import "./index.css";

const defaultVariant: DemoDecisionFlowVariant = "allow";

export default function Index() {
  return (
    <View className="page">
      <Text className="eyebrow">SmartPay miniapp shell</Text>
      <Text className="title">Japan Trip Decision Flow</Text>
      <Text className="badge">Default variant: {defaultVariant}</Text>
      <Text className="body">
        WeChat support is configured for the shared API contract. The first business demo remains
        on web.
      </Text>
    </View>
  );
}
