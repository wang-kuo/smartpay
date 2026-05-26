import { StatusBar } from "expo-status-bar";
import { StyleSheet, Text, View } from "react-native";

export default function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.eyebrow}>SmartPay mobile shell</Text>
      <Text style={styles.title}>Japan Trip Decision Flow</Text>
      <Text style={styles.body}>
        Mobile support is configured for the shared API contract. The first business demo remains
        on web.
      </Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#f7f8fa"
  },
  eyebrow: {
    color: "#0f766e",
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase"
  },
  title: {
    marginTop: 12,
    color: "#15181d",
    fontSize: 34,
    fontWeight: "700"
  },
  body: {
    marginTop: 12,
    color: "#5b6573",
    fontSize: 16,
    lineHeight: 24
  }
});
